interface Env {
  DB: any;
  ASSETS: { fetch(request: Request): Promise<Response> };
  RESEND_API_KEY: string;
  SESSION_SECRET: string;
  EMAIL_FROM: string;
}

type StaffRow = {
  username: string;
  name: string;
  email: string;
  role: 'Headteacher' | 'DOS' | 'Subject Teacher';
  subjects: string;
  classes: string;
  active_terms: string;
};

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();
const bytesToHex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');
const textEncoder = new TextEncoder();

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return bytesToHex(await crypto.subtle.sign('HMAC', key, textEncoder.encode(value)));
}

const encodeBase64Url = (value: string) =>
  btoa(unescape(encodeURIComponent(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decodeBase64Url = (value: string) =>
  decodeURIComponent(escape(atob(value.replace(/-/g, '+').replace(/_/g, '/'))));

async function issueSession(env: Env, staff: StaffRow) {
  const payload = encodeBase64Url(JSON.stringify({
    sub: staff.username,
    email: staff.email,
    role: staff.role,
    exp: Date.now() + 12 * 60 * 60 * 1000
  }));
  return `${payload}.${await hmac(env.SESSION_SECRET, payload)}`;
}

async function getSession(request: Request, env: Env) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || (await hmac(env.SESSION_SECRET, payload)) !== signature) return null;
  try {
    const session = JSON.parse(decodeBase64Url(payload));
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

const toTeacher = (staff: StaffRow) => ({
  username: staff.username,
  name: staff.name,
  email: staff.email,
  role: staff.role,
  subjects: JSON.parse(staff.subjects || '[]'),
  classes: JSON.parse(staff.classes || '[]'),
  activeTerms: JSON.parse(staff.active_terms || '[1,2,3]')
});

async function readBody(request: Request) {
  try {
    return await request.json() as Record<string, any>;
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}

async function findSimilarStudent(env: Env, candidate: Record<string, any>, excludeId?: string) {
  const rows = await env.DB.prepare('SELECT payload FROM students').all();
  const target = normalizeName(`${candidate.surname || ''}${candidate.otherNames || ''}`);
  for (const row of rows.results as any[]) {
    const student = JSON.parse(row.payload);
    if (student.id === excludeId) continue;
    const existing = normalizeName(`${student.surname || ''}${student.otherNames || ''}`);
    if (target === existing) return { kind: 'exact', student };
    if (target.length > 5 && existing.length > 5 && editDistance(target, existing) <= 2) {
      return { kind: 'similar', student };
    }
  }
  return null;
}

async function sendCode(request: Request, env: Env) {
  const body = await readBody(request);
  const email = normalizeEmail(body.email);
  if (!email.endsWith('@ashinaga.org')) {
    return json({ success: false, message: 'Enter your official @ashinaga.org email address.' }, 400);
  }

  const staff = await env.DB.prepare(
    'SELECT username, name, email, role, subjects, classes, active_terms FROM staff WHERE email = ? COLLATE NOCASE AND active = 1'
  ).bind(email).first() as StaffRow | null;
  if (!staff) {
    return json({ success: false, message: 'This email is not registered for staff access.' }, 401);
  }

  const code = crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000;
  const codeText = String(code);
  const codeHash = await hmac(env.SESSION_SECRET, `${email}:${codeText}`);
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO login_codes (email, code_hash, expires_at, attempts, requested_at)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(email) DO UPDATE SET code_hash=excluded.code_hash, expires_at=excluded.expires_at, attempts=0, requested_at=excluded.requested_at`
  ).bind(email, codeHash, now + 10 * 60 * 1000, now).run();

  const mailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      subject: 'Your Rainbow House sign-in code',
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Rainbow House staff sign-in</h2><p>Hello ${staff.name},</p><p>Your confirmation code is:</p><p style="font-size:32px;font-weight:800;letter-spacing:8px;color:#4f46e5">${codeText}</p><p>This code expires in 10 minutes.</p></div>`
    })
  });
  if (!mailResponse.ok) {
    await env.DB.prepare('DELETE FROM login_codes WHERE email = ?').bind(email).run();
    return json({ success: false, message: 'The confirmation email could not be sent. Check the verified sender and recipient settings.' }, 503);
  }

  return json({ success: true, email: email.replace(/^(.{2}).*(@.*)$/, '$1••••$2') });
}

async function verifyCode(request: Request, env: Env) {
  const body = await readBody(request);
  const email = normalizeEmail(body.email);
  const suppliedCode = String(body.code || '').trim();
  const record = await env.DB.prepare('SELECT code_hash, expires_at, attempts FROM login_codes WHERE email = ? COLLATE NOCASE')
    .bind(email).first() as any;
  if (!record || record.expires_at < Date.now()) {
    if (record) await env.DB.prepare('DELETE FROM login_codes WHERE email = ?').bind(email).run();
    return json({ success: false, message: 'The code has expired. Request a new one.' }, 400);
  }
  if (record.attempts >= 5) {
    await env.DB.prepare('DELETE FROM login_codes WHERE email = ?').bind(email).run();
    return json({ success: false, message: 'Too many attempts. Request a new code.' }, 429);
  }
  const suppliedHash = await hmac(env.SESSION_SECRET, `${email}:${suppliedCode}`);
  if (suppliedHash !== record.code_hash) {
    await env.DB.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?').bind(email).run();
    return json({ success: false, message: 'Invalid confirmation code.' }, 400);
  }

  const staff = await env.DB.prepare(
    'SELECT username, name, email, role, subjects, classes, active_terms FROM staff WHERE email = ? COLLATE NOCASE AND active = 1'
  ).bind(email).first() as StaffRow | null;
  if (!staff) return json({ success: false, message: 'Account unavailable.' }, 401);
  await env.DB.prepare('DELETE FROM login_codes WHERE email = ?').bind(email).run();
  return json({ success: true, teacher: toTeacher(staff), token: await issueSession(env, staff) });
}

async function api(request: Request, env: Env) {
  const url = new URL(request.url);
  if (request.method === 'POST' && url.pathname === '/api/auth/send-code') return sendCode(request, env);
  if (request.method === 'POST' && url.pathname === '/api/auth/verify-code') return verifyCode(request, env);
  if (request.method === 'GET' && url.pathname === '/api/health') return json({ ok: true, storage: 'D1' });

  const session = await getSession(request, env);
  if (!session) return json({ success: false, message: 'Your session has expired. Please sign in again.' }, 401);

  if (request.method === 'GET' && url.pathname === '/api/teachers') {
    const result = await env.DB.prepare(
      'SELECT username, name, email, role, subjects, classes, active_terms FROM staff WHERE active = 1 ORDER BY name'
    ).all();
    return json(result.results.map(toTeacher));
  }
  if (request.method === 'GET' && url.pathname === '/api/students') {
    const result = await env.DB.prepare('SELECT payload FROM students ORDER BY created_at DESC').all();
    return json(result.results.map((row: any) => JSON.parse(row.payload)));
  }
  if (request.method === 'GET' && url.pathname === '/api/marks') {
    const result = await env.DB.prepare('SELECT payload FROM marks ORDER BY updated_at DESC').all();
    return json(result.results.map((row: any) => JSON.parse(row.payload)));
  }
  if (request.method === 'POST' && url.pathname === '/api/students') {
    if (session.role !== 'Headteacher' && session.role !== 'DOS') return json({ success: false, message: 'Administrator access required.' }, 403);
    const body = await readBody(request);
    const duplicate = await findSimilarStudent(env, body);
    if (duplicate) {
      return json({
        success: false,
        code: 'DUPLICATE_STUDENT',
        message: duplicate.kind === 'exact'
          ? 'A student with this name already exists. Update the existing record instead.'
          : 'A very similar student name already exists. Review the existing record before continuing.',
        matchStudent: duplicate.student
      }, 409);
    }
    const student = { ...body, id: `st-${crypto.randomUUID()}` };
    const now = Date.now();
    await env.DB.prepare('INSERT INTO students (id, payload, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .bind(student.id, JSON.stringify(student), now, now).run();
    return json(student, 201);
  }
  const studentIdMatch = url.pathname.match(/^\/api\/students\/([^/]+)$/);
  if (studentIdMatch && request.method === 'PUT') {
    if (session.role !== 'Headteacher' && session.role !== 'DOS') return json({ success: false, message: 'Administrator access required.' }, 403);
    const current = await env.DB.prepare('SELECT payload FROM students WHERE id = ?').bind(studentIdMatch[1]).first() as any;
    if (!current) return json({ success: false, message: 'Student not found.' }, 404);
    const body = await readBody(request);
    const updated = { ...JSON.parse(current.payload), ...body, id: studentIdMatch[1] };
    const duplicate = await findSimilarStudent(env, updated, studentIdMatch[1]);
    if (duplicate?.kind === 'exact') {
      return json({ success: false, code: 'DUPLICATE_STUDENT', message: 'Another student already has this name.', matchStudent: duplicate.student }, 409);
    }
    await env.DB.prepare('UPDATE students SET payload = ?, updated_at = ? WHERE id = ?')
      .bind(JSON.stringify(updated), Date.now(), studentIdMatch[1]).run();
    return json(updated);
  }
  if (request.method === 'POST' && url.pathname === '/api/students/promote-bulk') {
    if (session.role !== 'Headteacher' && session.role !== 'DOS') return json({ success: false, message: 'Administrator access required.' }, 403);
    const body = await readBody(request);
    if (!Array.isArray(body.promotions)) return json({ success: false, message: 'Expected promotions array.' }, 400);
    let promotedCount = 0;
    for (const promotion of body.promotions) {
      const row = await env.DB.prepare('SELECT payload FROM students WHERE id = ?').bind(promotion.studentId).first() as any;
      if (!row) continue;
      const student = { ...JSON.parse(row.payload), className: promotion.nextClassName };
      await env.DB.prepare('UPDATE students SET payload = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(student), Date.now(), promotion.studentId).run();
      promotedCount += 1;
    }
    return json({ success: true, promotedCount });
  }
  if (request.method === 'POST' && url.pathname === '/api/marks') {
    const body = await readBody(request);
    const staff = await env.DB.prepare('SELECT role, subjects, classes FROM staff WHERE username = ?').bind(session.sub).first() as any;
    const studentRow = await env.DB.prepare('SELECT payload FROM students WHERE id = ?').bind(body.studentId).first() as any;
    if (!studentRow) return json({ success: false, message: 'Student not found.' }, 404);
    const student = JSON.parse(studentRow.payload);
    const subjects = JSON.parse(staff.subjects || '[]');
    const classes = JSON.parse(staff.classes || '[]');
    if (staff.role === 'Subject Teacher' && (!subjects.includes(body.subject) || !classes.includes(student.className))) {
      return json({ success: false, message: 'This class or subject is not assigned to you.' }, 403);
    }
    const mark: Record<string, any> = { ...body, id: body.id || `mk-${crypto.randomUUID()}` };
    await env.DB.prepare(
      `INSERT INTO marks (id, student_id, subject, term, year, payload, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_id, subject, term, year) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at`
    ).bind(mark.id, mark.studentId, mark.subject, Number(mark.term), Number(mark.year), JSON.stringify(mark), Date.now()).run();
    return json({ success: true, mark });
  }
  if (request.method === 'POST' && url.pathname === '/api/marks/bulk') {
    const body = await readBody(request);
    if (!Array.isArray(body.marks)) return json({ success: false, message: 'Expected marks array.' }, 400);
    for (const item of body.marks) {
      const markRequest = new Request(new URL('/api/marks', request.url), {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(item)
      });
      const result = await api(markRequest, env);
      if (!result.ok) return result;
    }
    return json({ success: true, count: body.marks.length });
  }
  return json({ success: false, message: 'API route not found.' }, 404);
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(request, env);
      return env.ASSETS.fetch(request);
    } catch (error: any) {
      console.error(error);
      return json({ success: false, message: error.message || 'Internal server error.' }, 500);
    }
  }
};
