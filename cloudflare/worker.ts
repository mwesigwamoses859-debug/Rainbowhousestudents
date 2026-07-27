import { isSubjectForClass } from '../src/curriculum';

type StaffRow = {
  username: string;
  name: string;
  email: string;
  role: 'Headteacher' | 'DOS' | 'Subject Teacher';
  subjects: string;
  classes: string;
  active_terms: string;
  password_hash?: string | null;
  password_salt?: string | null;
  password_iterations?: number;
  failed_attempts?: number;
  locked_until?: number;
  must_change_password?: number;
  password_changed_at?: number;
};

type StaffAssignment = {
  className: string;
  subject: string;
  activeTerms: number[];
};

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();
const bytesToHex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');
const textEncoder = new TextEncoder();
const hexToBytes = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);

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

async function hashPassword(password: string, salt: Uint8Array, iterations = 100000) {
  const material = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return bytesToHex(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    256
  ));
}

async function safeEqualHex(provided: string, expected: string) {
  const providedBytes = hexToBytes(provided);
  const expectedBytes = hexToBytes(expected);
  return providedBytes.byteLength === expectedBytes.byteLength
    ? crypto.subtle.timingSafeEqual(providedBytes, expectedBytes)
    : !crypto.subtle.timingSafeEqual(providedBytes, providedBytes);
}

async function setPassword(env: Env, username: string, password: string, mustChangePassword = false) {
  const salt = crypto.getRandomValues(new Uint8Array(24));
  const iterations = 100000;
  const passwordHash = await hashPassword(password, salt, iterations);
  await env.DB.prepare(
    `UPDATE staff SET password_hash = ?, password_salt = ?, password_iterations = ?,
      failed_attempts = 0, locked_until = 0, must_change_password = ?, password_changed_at = ?
     WHERE username = ?`
  ).bind(passwordHash, bytesToHex(salt), iterations, mustChangePassword ? 1 : 0, Date.now(), username).run();
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

const toTeacher = (staff: StaffRow, assignments: StaffAssignment[] = []) => ({
  username: staff.username,
  name: staff.name,
  email: staff.email,
  role: staff.role,
  subjects: JSON.parse(staff.subjects || '[]'),
  classes: JSON.parse(staff.classes || '[]'),
  activeTerms: JSON.parse(staff.active_terms || '[1,2,3]'),
  assignments,
  mustChangePassword: Boolean(staff.must_change_password)
});

async function getAssignments(env: Env, username: string): Promise<StaffAssignment[]> {
  const result = await env.DB.prepare(
    'SELECT class_name, subject, active_terms FROM staff_assignments WHERE username = ? AND active = 1 ORDER BY class_name, subject'
  ).bind(username).all();
  return result.results.map((row: any) => ({
    className: row.class_name,
    subject: row.subject,
    activeTerms: JSON.parse(row.active_terms || '[1,2,3]')
  }));
}

const isAdministrator = (role: string) => role === 'Headteacher' || role === 'DOS';

async function writeAudit(
  env: Env,
  request: Request,
  session: any,
  action: string,
  entityType: string,
  entityId: string,
  beforeValue?: unknown,
  afterValue?: unknown
) {
  await env.DB.prepare(
    `INSERT INTO audit_logs
      (id, actor_username, actor_role, action, entity_type, entity_id, before_value, after_value, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    `audit-${crypto.randomUUID()}`,
    session.sub,
    session.role,
    action,
    entityType,
    entityId,
    beforeValue === undefined ? null : JSON.stringify(beforeValue),
    afterValue === undefined ? null : JSON.stringify(afterValue),
    request.headers.get('CF-Connecting-IP') || '',
    Date.now()
  ).run();
}

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
    const sameBirthDate = candidate.dateOfBirth && student.dateOfBirth === candidate.dateOfBirth;
    const sameGuardianContact = String(candidate.guardianContact || '').replace(/\D/g, '')
      && String(student.guardianContact || '').replace(/\D/g, '') === String(candidate.guardianContact || '').replace(/\D/g, '');
    if (target === existing && (sameBirthDate || sameGuardianContact)) return { kind: 'exact', student };
    if (target === existing) return { kind: 'similar', student };
    if (target.length > 5 && existing.length > 5 && editDistance(target, existing) <= 2) {
      return { kind: 'similar', student };
    }
  }
  return null;
}

function validateStudent(candidate: Record<string, any>) {
  if (!String(candidate.surname || '').trim() || !String(candidate.otherNames || '').trim()) {
    return 'Surname and other names are required.';
  }
  if (!['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'].includes(candidate.className)) {
    return 'Select a valid class from P.1 to P.7.';
  }
  const birthDate = new Date(String(candidate.dateOfBirth || ''));
  if (Number.isNaN(birthDate.getTime()) || birthDate.getTime() > Date.now()) {
    return 'Enter a valid date of birth that is not in the future.';
  }
  const age = Math.floor((Date.now() - birthDate.getTime()) / 31557600000);
  if (age < 3 || age > 25) return `The calculated pupil age (${age}) is outside the expected range of 3–25 years.`;
  if (candidate.guardianContact && String(candidate.guardianContact).replace(/\D/g, '').length < 9) {
    return 'Guardian contact must contain at least 9 digits.';
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

async function passwordLogin(request: Request, env: Env) {
  const body = await readBody(request);
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!username || password.length < 8) {
    return json({ success: false, message: 'Enter your staff username and password.' }, 400);
  }

  const staff = await env.DB.prepare(
    `SELECT username, name, email, role, subjects, classes, active_terms, password_hash, password_salt,
            password_iterations, failed_attempts, locked_until, must_change_password, password_changed_at
     FROM staff WHERE username = ? COLLATE NOCASE AND active = 1`
  ).bind(username).first() as StaffRow | null;
  if (!staff) return json({ success: false, message: 'Invalid username or password.' }, 401);
  if ((staff.locked_until || 0) > Date.now()) {
    return json({ success: false, message: 'Account temporarily locked after repeated failed attempts. Try again later.' }, 423);
  }

  let valid = false;
  if (staff.password_hash && staff.password_salt) {
    const suppliedHash = await hashPassword(password, hexToBytes(staff.password_salt), staff.password_iterations || 100000);
    valid = await safeEqualHex(suppliedHash, staff.password_hash);
  } else if (staff.role === 'Headteacher' && env.ADMIN_BOOTSTRAP_PASSWORD) {
    const [providedDigest, expectedDigest] = await Promise.all([
      crypto.subtle.digest('SHA-256', textEncoder.encode(password)),
      crypto.subtle.digest('SHA-256', textEncoder.encode(env.ADMIN_BOOTSTRAP_PASSWORD))
    ]);
    valid = crypto.subtle.timingSafeEqual(providedDigest, expectedDigest);
    if (valid) await setPassword(env, staff.username, password, false);
  }

  if (!valid) {
    const failures = (staff.failed_attempts || 0) + 1;
    const lockedUntil = failures >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
    await env.DB.prepare('UPDATE staff SET failed_attempts = ?, locked_until = ? WHERE username = ?')
      .bind(failures >= 5 ? 0 : failures, lockedUntil, staff.username).run();
    await writeAudit(
      env,
      request,
      { sub: staff.username, role: staff.role },
      lockedUntil ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
      'staff',
      staff.username,
      undefined,
      { failedAttempts: failures }
    );
    return json({ success: false, message: 'Invalid username or password.' }, 401);
  }

  await env.DB.prepare('UPDATE staff SET failed_attempts = 0, locked_until = 0, last_login_at = ? WHERE username = ?')
    .bind(Date.now(), staff.username).run();
  const assignments = await getAssignments(env, staff.username);
  await writeAudit(env, request, { sub: staff.username, role: staff.role }, 'LOGIN_SUCCESS', 'staff', staff.username);
  return json({ success: true, teacher: toTeacher(staff, assignments), token: await issueSession(env, staff) });
}

async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === 'POST' && url.pathname === '/api/auth/login') return passwordLogin(request, env);
  if (request.method === 'POST' && url.pathname === '/api/auth/send-code') return sendCode(request, env);
  if (request.method === 'POST' && url.pathname === '/api/auth/verify-code') return verifyCode(request, env);
  if (request.method === 'GET' && url.pathname === '/api/health') return json({ ok: true, storage: 'D1' });

  const session = await getSession(request, env);
  if (!session) return json({ success: false, message: 'Your session has expired. Please sign in again.' }, 401);

  if (request.method === 'POST' && url.pathname === '/api/auth/change-password') {
    const body = await readBody(request);
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    if (newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return json({ success: false, message: 'New passwords require at least 10 characters, including a letter and a number.' }, 400);
    }
    const staff = await env.DB.prepare(
      'SELECT password_hash, password_salt, password_iterations FROM staff WHERE username = ? AND active = 1'
    ).bind(session.sub).first() as any;
    if (!staff?.password_hash || !staff.password_salt) return json({ success: false, message: 'Password account unavailable.' }, 400);
    const suppliedHash = await hashPassword(currentPassword, hexToBytes(staff.password_salt), staff.password_iterations || 100000);
    if (!(await safeEqualHex(suppliedHash, staff.password_hash))) {
      return json({ success: false, message: 'Current password is incorrect.' }, 401);
    }
    await setPassword(env, session.sub, newPassword, false);
    await writeAudit(env, request, session, 'PASSWORD_CHANGED', 'staff', session.sub);
    return json({ success: true });
  }

  if (request.method === 'GET' && url.pathname === '/api/assessment-settings') {
    const settings = await env.DB.prepare('SELECT * FROM assessment_settings WHERE id = 1').first();
    return json(settings);
  }
  if (request.method === 'PUT' && url.pathname === '/api/assessment-settings') {
    if (!isAdministrator(session.role)) return json({ success: false, message: 'Administrator access required.' }, 403);
    const body = await readBody(request);
    const botWeight = Number(body.botWeight);
    const motWeight = Number(body.motWeight);
    const eotWeight = Number(body.eotWeight);
    const passMark = Number(body.passMark);
    const maximumScore = Number(body.maximumScore);
    if (botWeight + motWeight + eotWeight !== 100 || passMark < 0 || passMark > maximumScore || maximumScore < 1 || maximumScore > 1000) {
      return json({ success: false, message: 'Assessment weights must total 100 and score limits must be valid.' }, 400);
    }
    if (body.gradingBoundaries) {
      const boundaries = ['D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'P8']
        .map(grade => Number(body.gradingBoundaries[grade]));
      if (boundaries.some(value => !Number.isFinite(value) || value < 0 || value > maximumScore)
        || boundaries.some((value, index) => index > 0 && value >= boundaries[index - 1])) {
        return json({ success: false, message: 'Grade boundaries must decrease from D1 through P8 and remain within the maximum score.' }, 400);
      }
    }
    const before = await env.DB.prepare('SELECT * FROM assessment_settings WHERE id = 1').first();
    const gradingBoundaries = body.gradingBoundaries
      ? JSON.stringify(body.gradingBoundaries)
      : String((before as any)?.grading_boundaries || '{}');
    await env.DB.prepare(
      `UPDATE assessment_settings SET bot_weight=?, mot_weight=?, eot_weight=?, pass_mark=?,
        maximum_score=?, require_all_subjects=?, grading_boundaries=?, updated_by=?, updated_at=? WHERE id=1`
    ).bind(
      botWeight, motWeight, eotWeight, passMark, maximumScore, body.requireAllSubjects ? 1 : 0,
      gradingBoundaries, session.sub, Date.now()
    ).run();
    const after = await env.DB.prepare('SELECT * FROM assessment_settings WHERE id = 1').first();
    await writeAudit(env, request, session, 'ASSESSMENT_SETTINGS_UPDATED', 'assessment_settings', '1', before, after);
    return json(after);
  }

  if (request.method === 'GET' && url.pathname === '/api/academic-years') {
    const result = await env.DB.prepare('SELECT * FROM academic_years ORDER BY year DESC').all();
    return json(result.results);
  }
  if (request.method === 'POST' && url.pathname === '/api/academic-years') {
    if (!isAdministrator(session.role)) return json({ success: false, message: 'Administrator access required.' }, 403);
    const body = await readBody(request);
    const year = Number(body.year);
    if (!Number.isInteger(year) || year < 2020 || year > 2100) return json({ success: false, message: 'Enter a valid academic year.' }, 400);
    if (body.status === 'active') await env.DB.prepare("UPDATE academic_years SET status='planned' WHERE status='active'").run();
    const status = body.status === 'active' ? 'active' : 'planned';
    await env.DB.prepare(
      `INSERT INTO academic_years (year, status, starts_on, ends_on, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(year) DO UPDATE SET status=excluded.status, starts_on=excluded.starts_on, ends_on=excluded.ends_on`
    ).bind(year, status, body.startsOn || null, body.endsOn || null, Date.now()).run();
    await writeAudit(env, request, session, 'ACADEMIC_YEAR_SAVED', 'academic_year', String(year), undefined, { status });
    return json({ success: true, year, status }, 201);
  }
  const closeYearMatch = url.pathname.match(/^\/api\/academic-years\/(\d{4})\/close$/);
  if (request.method === 'POST' && closeYearMatch) {
    if (!isAdministrator(session.role)) return json({ success: false, message: 'Administrator access required.' }, 403);
    const year = Number(closeYearMatch[1]);
    const pending = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM mark_submissions WHERE year = ? AND status <> 'approved'"
    ).bind(year).first() as any;
    if (Number(pending?.count || 0) > 0) {
      return json({ success: false, message: `${pending.count} mark sheets still require approval before this year can close.` }, 409);
    }
    await env.DB.prepare(
      "UPDATE academic_years SET status='closed', closed_at=?, closed_by=? WHERE year=?"
    ).bind(Date.now(), session.sub, year).run();
    await writeAudit(env, request, session, 'ACADEMIC_YEAR_CLOSED', 'academic_year', String(year));
    return json({ success: true, year, status: 'closed' });
  }

  if (request.method === 'GET' && url.pathname === '/api/audit-logs') {
    if (!isAdministrator(session.role)) return json({ success: false, message: 'Administrator access required.' }, 403);
    const result = await env.DB.prepare(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500'
    ).all();
    return json(result.results);
  }

  if (request.method === 'GET' && url.pathname === '/api/attendance') {
    const result = await env.DB.prepare('SELECT id, student_id, date, status, recorded_by, updated_at FROM attendance ORDER BY date DESC').all();
    let records = result.results.map((row: any) => ({
      id: row.id, studentId: row.student_id, date: row.date, status: row.status,
      recordedBy: row.recorded_by, updatedAt: row.updated_at
    }));
    if (session.role === 'Subject Teacher') {
      const assignments = await getAssignments(env, session.sub);
      const allowedClasses = new Set(assignments.map(item => item.className));
      const students = await env.DB.prepare('SELECT id, payload FROM students').all();
      const allowedIds = new Set(students.results
        .filter((row: any) => allowedClasses.has(JSON.parse(row.payload).className))
        .map((row: any) => row.id));
      records = records.filter(record => allowedIds.has(record.studentId));
    }
    return json(records);
  }
  if (request.method === 'POST' && url.pathname === '/api/attendance/bulk') {
    const body = await readBody(request);
    if (!Array.isArray(body.records) || body.records.length === 0) return json({ success: false, message: 'Expected attendance records.' }, 400);
    const assignments = session.role === 'Subject Teacher' ? await getAssignments(env, session.sub) : [];
    const allowedClasses = new Set(assignments.map(item => item.className));
    const statements = [];
    for (const record of body.records) {
      if (!['present', 'absent', 'sick', 'late'].includes(record.status) || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
        return json({ success: false, message: 'Attendance contains an invalid date or status.' }, 400);
      }
      const studentRow = await env.DB.prepare('SELECT payload FROM students WHERE id = ?').bind(record.studentId).first() as any;
      if (!studentRow) return json({ success: false, message: 'Attendance contains an unknown pupil.' }, 400);
      const student = JSON.parse(studentRow.payload);
      if (session.role === 'Subject Teacher' && !allowedClasses.has(student.className)) {
        return json({ success: false, message: `You are not assigned to ${student.className}.` }, 403);
      }
      statements.push(env.DB.prepare(
        `INSERT INTO attendance (id, student_id, date, status, recorded_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(student_id, date) DO UPDATE SET status=excluded.status,
           recorded_by=excluded.recorded_by, updated_at=excluded.updated_at`
      ).bind(`att-${record.studentId}-${record.date}`, record.studentId, record.date, record.status, session.sub, Date.now()));
    }
    await env.DB.batch(statements);
    await writeAudit(env, request, session, 'ATTENDANCE_SAVED', 'attendance', String(body.records[0].date), undefined, { count: body.records.length });
    return json({ success: true, count: body.records.length });
  }

  if (request.method === 'GET' && url.pathname === '/api/teachers') {
    const result = session.role === 'Subject Teacher'
      ? await env.DB.prepare(
        'SELECT username, name, email, role, subjects, classes, active_terms FROM staff WHERE username = ? AND active = 1'
      ).bind(session.sub).all()
      : await env.DB.prepare(
        'SELECT username, name, email, role, subjects, classes, active_terms FROM staff WHERE active = 1 ORDER BY name'
      ).all();
    const teachers = await Promise.all((result.results as unknown as StaffRow[]).map(async staff =>
      toTeacher(staff, await getAssignments(env, staff.username))
    ));
    return json(teachers);
  }
  if (request.method === 'POST' && url.pathname === '/api/teachers') {
    if (session.role !== 'Headteacher' && session.role !== 'DOS') return json({ success: false, message: 'Administrator access required.' }, 403);
    const body = await readBody(request);
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    const existing = await env.DB.prepare(
      'SELECT username, name, email, role, subjects, classes, active_terms FROM staff WHERE username = ? COLLATE NOCASE'
    ).bind(username).first();
    if (!/^[a-z0-9._-]{3,40}$/.test(username) || !body.name || (!existing && password.length < 8) || (password && password.length < 8)) {
      return json({ success: false, message: 'Username, staff name and a password of at least 8 characters are required for new accounts.' }, 400);
    }
    const role = body.role === 'DOS' ? 'DOS' : body.role === 'Headteacher' ? 'Headteacher' : 'Subject Teacher';
    const requestedAssignments: StaffAssignment[] = Array.isArray(body.assignments)
      ? body.assignments.map((item: any) => ({
        className: String(item.className || ''),
        subject: String(item.subject || ''),
        activeTerms: Array.isArray(item.activeTerms) ? item.activeTerms.map(Number) : (body.activeTerms || [1, 2, 3])
      }))
      : (body.classes || []).flatMap((className: string) =>
        (body.subjects || []).filter((subject: string) => isSubjectForClass(className as any, subject))
          .map((subject: string) => ({ className, subject, activeTerms: body.activeTerms || [1, 2, 3] }))
      );
    if (role === 'Subject Teacher') {
      const invalidAssignment = requestedAssignments.find(assignment =>
        !isSubjectForClass(assignment.className as any, assignment.subject)
        || assignment.activeTerms.some(term => ![1, 2, 3].includes(term))
      );
      if (invalidAssignment || requestedAssignments.length === 0) {
        return json({
          success: false,
          message: invalidAssignment
            ? `${invalidAssignment.subject} is not offered in ${invalidAssignment.className}.`
            : 'Assign at least one valid class and subject combination to a subject teacher.'
        }, 400);
      }
    }
    const assignedClasses = [...new Set(requestedAssignments.map(item => item.className))];
    const assignedSubjects = [...new Set(requestedAssignments.map(item => item.subject))];
    const assignedTerms = [...new Set(requestedAssignments.flatMap(item => item.activeTerms))].sort();
    await env.DB.prepare(
      `INSERT INTO staff (username, name, email, role, subjects, classes, active_terms, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(username) DO UPDATE SET name=excluded.name, email=excluded.email, role=excluded.role,
         subjects=excluded.subjects, classes=excluded.classes, active_terms=excluded.active_terms, active=1`
    ).bind(username, String(body.name), normalizeEmail(body.email), role, JSON.stringify(assignedSubjects),
      JSON.stringify(assignedClasses), JSON.stringify(assignedTerms.length ? assignedTerms : [1, 2, 3])).run();
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM staff_assignments WHERE username = ?').bind(username),
      ...requestedAssignments.map(assignment => env.DB.prepare(
        `INSERT INTO staff_assignments
          (username, class_name, subject, active_terms, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`
      ).bind(username, assignment.className, assignment.subject, JSON.stringify(assignment.activeTerms), now, now))
    ]);
    if (password) await setPassword(env, username, password, role === 'Subject Teacher');
    const saved = await env.DB.prepare(
      `SELECT username, name, email, role, subjects, classes, active_terms, must_change_password
       FROM staff WHERE username = ?`
    ).bind(username).first() as StaffRow;
    const savedAssignments = await getAssignments(env, username);
    const teacher = toTeacher(saved, savedAssignments);
    await writeAudit(env, request, session, existing ? 'STAFF_UPDATED' : 'STAFF_CREATED', 'staff', username, existing || undefined, teacher);
    return json(teacher, 201);
  }
  const teacherMatch = url.pathname.match(/^\/api\/teachers\/([^/]+)$/);
  if (teacherMatch && request.method === 'DELETE') {
    if (session.role !== 'Headteacher') return json({ success: false, message: 'Headteacher access required.' }, 403);
    if (teacherMatch[1] === session.sub) return json({ success: false, message: 'You cannot deactivate your own account.' }, 400);
    await env.DB.prepare('UPDATE staff SET active = 0 WHERE username = ?').bind(teacherMatch[1]).run();
    await writeAudit(env, request, session, 'STAFF_DEACTIVATED', 'staff', teacherMatch[1]);
    return json({ success: true });
  }
  if (request.method === 'GET' && url.pathname === '/api/students') {
    const result = await env.DB.prepare('SELECT payload FROM students ORDER BY created_at DESC').all();
    const students = result.results.map((row: any) => JSON.parse(row.payload));
    if (session.role !== 'Subject Teacher') return json(students);
    const assignments = await getAssignments(env, session.sub);
    const classes = [...new Set(assignments.map(item => item.className))];
    return json(students.filter((student: any) => classes.includes(student.className)));
  }
  if (request.method === 'GET' && url.pathname === '/api/marks') {
    const result = await env.DB.prepare('SELECT payload FROM marks ORDER BY updated_at DESC').all();
    const marks = result.results.map((row: any) => JSON.parse(row.payload));
    if (session.role !== 'Subject Teacher') return json(marks);
    const assignments = await getAssignments(env, session.sub);
    const studentsResult = await env.DB.prepare('SELECT id, payload FROM students').all();
    const studentClasses = new Map(studentsResult.results.map((row: any) => [row.id, JSON.parse(row.payload).className]));
    return json(marks.filter((mark: any) => assignments.some(assignment =>
      assignment.className === studentClasses.get(mark.studentId)
      && assignment.subject === mark.subject
    )));
  }
  if (request.method === 'POST' && url.pathname === '/api/students') {
    if (session.role !== 'Headteacher' && session.role !== 'DOS') return json({ success: false, message: 'Administrator access required.' }, 403);
    const body = await readBody(request);
    const validationError = validateStudent(body);
    if (validationError) return json({ success: false, message: validationError }, 400);
    const duplicate = await findSimilarStudent(env, body);
    if (duplicate && !(duplicate.kind === 'similar' && body.confirmSimilar === true)) {
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
    await writeAudit(env, request, session, 'STUDENT_CREATED', 'student', student.id, undefined, student);
    return json(student, 201);
  }
  if (request.method === 'POST' && url.pathname === '/api/students/bulk') {
    if (!isAdministrator(session.role)) return json({ success: false, message: 'Administrator access required.' }, 403);
    const body = await readBody(request);
    const candidates = Array.isArray(body) ? body : Array.isArray(body.students) ? body.students : [];
    if (candidates.length === 0 || candidates.length > 1000) {
      return json({ success: false, message: 'Bulk imports require between 1 and 1,000 pupils.' }, 400);
    }
    const students = [];
    const skipped = [];
    for (const candidate of candidates) {
      const validationError = validateStudent(candidate);
      const duplicate = validationError ? null : await findSimilarStudent(env, candidate);
      if (validationError || duplicate) {
        skipped.push({
          name: `${candidate.surname || ''} ${candidate.otherNames || ''}`.trim(),
          reason: validationError || (duplicate?.kind === 'exact' ? 'Duplicate pupil' : 'Similar pupil requires review')
        });
        continue;
      }
      const student = { ...candidate, id: `st-${crypto.randomUUID()}` };
      const now = Date.now();
      await env.DB.prepare('INSERT INTO students (id, payload, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .bind(student.id, JSON.stringify(student), now, now).run();
      students.push(student);
    }
    await writeAudit(env, request, session, 'STUDENTS_BULK_IMPORTED', 'student_import', `import-${Date.now()}`, undefined, { imported: students.length, skipped: skipped.length });
    return json({ success: true, students, skipped, skippedCount: skipped.length }, 201);
  }
  const studentIdMatch = url.pathname.match(/^\/api\/students\/([^/]+)$/);
  if (studentIdMatch && request.method === 'PUT') {
    if (session.role !== 'Headteacher' && session.role !== 'DOS') return json({ success: false, message: 'Administrator access required.' }, 403);
    const current = await env.DB.prepare('SELECT payload FROM students WHERE id = ?').bind(studentIdMatch[1]).first() as any;
    if (!current) return json({ success: false, message: 'Student not found.' }, 404);
    const body = await readBody(request);
    const updated = { ...JSON.parse(current.payload), ...body, id: studentIdMatch[1] };
    const validationError = validateStudent(updated);
    if (validationError) return json({ success: false, message: validationError }, 400);
    const duplicate = await findSimilarStudent(env, updated, studentIdMatch[1]);
    if (duplicate && !(duplicate.kind === 'similar' && body.confirmSimilar === true)) {
      return json({
        success: false,
        code: 'DUPLICATE_STUDENT',
        message: duplicate.kind === 'exact'
          ? 'Another student already has this name and matching birth date or guardian contact.'
          : 'A very similar student already exists. Confirm before saving this separate record.',
        matchStudent: duplicate.student
      }, 409);
    }
    await env.DB.prepare('UPDATE students SET payload = ?, updated_at = ? WHERE id = ?')
      .bind(JSON.stringify(updated), Date.now(), studentIdMatch[1]).run();
    await writeAudit(env, request, session, 'STUDENT_UPDATED', 'student', studentIdMatch[1], JSON.parse(current.payload), updated);
    return json(updated);
  }
  if (studentIdMatch && request.method === 'DELETE') {
    if (!isAdministrator(session.role)) return json({ success: false, message: 'Administrator access required.' }, 403);
    const current = await env.DB.prepare('SELECT payload FROM students WHERE id = ?').bind(studentIdMatch[1]).first() as any;
    if (!current) return json({ success: false, message: 'Student not found.' }, 404);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM marks WHERE student_id = ?').bind(studentIdMatch[1]),
      env.DB.prepare('DELETE FROM attendance WHERE student_id = ?').bind(studentIdMatch[1]),
      env.DB.prepare('DELETE FROM students WHERE id = ?').bind(studentIdMatch[1])
    ]);
    await writeAudit(env, request, session, 'STUDENT_DELETED', 'student', studentIdMatch[1], JSON.parse(current.payload));
    return json({ success: true });
  }
  if (request.method === 'POST' && url.pathname === '/api/students/promote-bulk') {
    if (session.role !== 'Headteacher' && session.role !== 'DOS') return json({ success: false, message: 'Administrator access required.' }, 403);
    const body = await readBody(request);
    if (!Array.isArray(body.promotions)) return json({ success: false, message: 'Expected promotions array.' }, 400);
    let promotedCount = 0;
    for (const promotion of body.promotions) {
      const row = await env.DB.prepare('SELECT payload FROM students WHERE id = ?').bind(promotion.studentId).first() as any;
      if (!row) continue;
      const previousStudent = JSON.parse(row.payload);
      const allowedNextClasses: Record<string, string> = {
        'P.1': 'P.2', 'P.2': 'P.3', 'P.3': 'P.4', 'P.4': 'P.5', 'P.5': 'P.6', 'P.6': 'P.7', 'P.7': 'Graduated'
      };
      if (allowedNextClasses[previousStudent.className] !== promotion.nextClassName) continue;
      const student = { ...previousStudent, className: promotion.nextClassName };
      await env.DB.prepare('UPDATE students SET payload = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(student), Date.now(), promotion.studentId).run();
      await env.DB.prepare(
        `INSERT INTO promotion_history
          (id, student_id, from_class, to_class, academic_year, decision, reason, approved_by, created_at)
         VALUES (?, ?, ?, ?, ?, 'promoted', ?, ?, ?)`
      ).bind(
        `promotion-${crypto.randomUUID()}`,
        promotion.studentId,
        previousStudent.className,
        promotion.nextClassName,
        Number(body.academicYear || new Date().getFullYear()),
        String(promotion.reason || ''),
        session.sub,
        Date.now()
      ).run();
      promotedCount += 1;
    }
    await writeAudit(env, request, session, 'STUDENTS_PROMOTED', 'academic_year', String(body.academicYear || new Date().getFullYear()), undefined, { promotedCount });
    return json({ success: true, promotedCount });
  }
  if (request.method === 'GET' && url.pathname === '/api/marks/completeness') {
    const className = String(url.searchParams.get('className') || '');
    const subject = String(url.searchParams.get('subject') || '');
    const term = Number(url.searchParams.get('term'));
    const year = Number(url.searchParams.get('year'));
    if (!isSubjectForClass(className as any, subject) || ![1, 2, 3].includes(term) || !Number.isInteger(year)) {
      return json({ success: false, message: 'Choose a valid class, subject, term and year.' }, 400);
    }
    if (session.role === 'Subject Teacher') {
      const assignments = await getAssignments(env, session.sub);
      const permitted = assignments.some(item =>
        item.className === className && item.subject === subject && item.activeTerms.includes(term)
      );
      if (!permitted) return json({ success: false, message: 'This mark sheet is not assigned to you.' }, 403);
    }
    const studentResult = await env.DB.prepare('SELECT id, payload FROM students').all();
    const classStudents = studentResult.results
      .map((row: any) => JSON.parse(row.payload))
      .filter((student: any) => student.className === className);
    const marksResult = await env.DB.prepare(
      'SELECT student_id, payload FROM marks WHERE subject = ? AND term = ? AND year = ?'
    ).bind(subject, term, year).all();
    const completedIds = new Set(marksResult.results
      .filter((row: any) => {
        const mark = JSON.parse(row.payload);
        return mark.score !== null && mark.score !== undefined && Number.isFinite(Number(mark.score));
      })
      .map((row: any) => row.student_id));
    const missingStudents = classStudents
      .filter((student: any) => !completedIds.has(student.id))
      .map((student: any) => ({ id: student.id, name: `${student.surname} ${student.otherNames}`.trim() }));
    const submission = await env.DB.prepare(
      `SELECT id, status, teacher_comment, reviewer_comment, submitted_at, reviewed_at, reviewed_by
       FROM mark_submissions WHERE username = ? AND class_name = ? AND subject = ? AND term = ? AND year = ?`
    ).bind(session.sub, className, subject, term, year).first();
    return json({
      totalStudents: classStudents.length,
      completedStudents: classStudents.length - missingStudents.length,
      missingStudents,
      completionPercent: classStudents.length
        ? Math.round(((classStudents.length - missingStudents.length) / classStudents.length) * 100)
        : 0,
      submission: submission || { status: 'draft' }
    });
  }

  if (request.method === 'GET' && url.pathname === '/api/mark-submissions') {
    const result = isAdministrator(session.role)
      ? await env.DB.prepare('SELECT * FROM mark_submissions ORDER BY updated_at DESC').all()
      : await env.DB.prepare('SELECT * FROM mark_submissions WHERE username = ? ORDER BY updated_at DESC').bind(session.sub).all();
    return json(result.results);
  }
  if (request.method === 'POST' && url.pathname === '/api/mark-submissions') {
    const body = await readBody(request);
    const className = String(body.className || '');
    const subject = String(body.subject || '');
    const term = Number(body.term);
    const year = Number(body.year);
    const action = body.action === 'submit' ? 'submitted' : 'draft';
    if (!isSubjectForClass(className as any, subject) || ![1, 2, 3].includes(term) || !Number.isInteger(year)) {
      return json({ success: false, message: 'Invalid mark-sheet scope.' }, 400);
    }
    if (session.role === 'Subject Teacher') {
      const assignments = await getAssignments(env, session.sub);
      if (!assignments.some(item => item.className === className && item.subject === subject && item.activeTerms.includes(term))) {
        return json({ success: false, message: 'This mark sheet is not assigned to you.' }, 403);
      }
    }
    const existingSubmission = await env.DB.prepare(
      'SELECT id, status FROM mark_submissions WHERE username=? AND class_name=? AND subject=? AND term=? AND year=?'
    ).bind(session.sub, className, subject, term, year).first() as any;
    if (existingSubmission?.status === 'approved') return json({ success: false, message: 'Approved mark sheets are locked.' }, 423);
    if (action === 'submitted') {
      const students = await env.DB.prepare('SELECT id, payload FROM students').all();
      const requiredIds = students.results
        .filter((row: any) => JSON.parse(row.payload).className === className)
        .map((row: any) => row.id);
      const completed = await env.DB.prepare(
        'SELECT student_id FROM marks WHERE subject=? AND term=? AND year=?'
      ).bind(subject, term, year).all();
      const completedIds = new Set(completed.results.map((row: any) => row.student_id));
      const missingCount = requiredIds.filter(id => !completedIds.has(id)).length;
      if (missingCount > 0) return json({ success: false, message: `${missingCount} pupils still have missing marks.` }, 409);
    }
    const id = existingSubmission?.id || `submission-${crypto.randomUUID()}`;
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO mark_submissions
        (id, username, class_name, subject, term, year, status, teacher_comment, submitted_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(username, class_name, subject, term, year) DO UPDATE SET
         status=excluded.status, teacher_comment=excluded.teacher_comment,
         submitted_at=excluded.submitted_at, reviewer_comment='', reviewed_at=NULL, reviewed_by=NULL, updated_at=excluded.updated_at`
    ).bind(
      id, session.sub, className, subject, term, year, action, String(body.comment || ''),
      action === 'submitted' ? now : null, now
    ).run();
    await writeAudit(env, request, session, action === 'submitted' ? 'MARK_SHEET_SUBMITTED' : 'MARK_SHEET_DRAFTED', 'mark_submission', id, existingSubmission, { className, subject, term, year, status: action });
    return json({ success: true, id, status: action });
  }
  const reviewSubmissionMatch = url.pathname.match(/^\/api\/mark-submissions\/([^/]+)\/review$/);
  if (request.method === 'POST' && reviewSubmissionMatch) {
    if (!isAdministrator(session.role)) return json({ success: false, message: 'Administrator access required.' }, 403);
    const body = await readBody(request);
    const status = body.action === 'approve' ? 'approved' : body.action === 'return' ? 'returned' : '';
    if (!status) return json({ success: false, message: 'Review action must be approve or return.' }, 400);
    const before = await env.DB.prepare('SELECT * FROM mark_submissions WHERE id = ?').bind(reviewSubmissionMatch[1]).first() as any;
    if (!before || before.status !== 'submitted') return json({ success: false, message: 'Only submitted mark sheets can be reviewed.' }, 409);
    await env.DB.prepare(
      'UPDATE mark_submissions SET status=?, reviewer_comment=?, reviewed_at=?, reviewed_by=?, updated_at=? WHERE id=?'
    ).bind(status, String(body.comment || ''), Date.now(), session.sub, Date.now(), reviewSubmissionMatch[1]).run();
    await writeAudit(env, request, session, status === 'approved' ? 'MARK_SHEET_APPROVED' : 'MARK_SHEET_RETURNED', 'mark_submission', reviewSubmissionMatch[1], before, { status, comment: body.comment || '' });
    return json({ success: true, status });
  }

  if (request.method === 'POST' && url.pathname === '/api/marks') {
    const body = await readBody(request);
    const studentRow = await env.DB.prepare('SELECT payload FROM students WHERE id = ?').bind(body.studentId).first() as any;
    if (!studentRow) return json({ success: false, message: 'Student not found.' }, 404);
    const student = JSON.parse(studentRow.payload);
    if (!isSubjectForClass(student.className, String(body.subject))) {
      return json({
        success: false,
        message: `${body.subject} is not part of the ${student.className} curriculum.`
      }, 400);
    }
    const term = Number(body.term);
    const year = Number(body.year);
    if (![1, 2, 3].includes(term) || !Number.isInteger(year)) {
      return json({ success: false, message: 'Enter a valid school term and academic year.' }, 400);
    }
    if (session.role === 'Subject Teacher') {
      const assignments = await getAssignments(env, session.sub);
      if (!assignments.some(item =>
        item.className === student.className && item.subject === body.subject && item.activeTerms.includes(term)
      )) {
        return json({ success: false, message: 'This exact class, subject or term is not assigned to you.' }, 403);
      }
    }
    const academicYear = await env.DB.prepare('SELECT status FROM academic_years WHERE year = ?').bind(year).first() as any;
    if (academicYear?.status === 'closed') return json({ success: false, message: `${year} is closed and read-only.` }, 423);
    const lockedSubmission = await env.DB.prepare(
      `SELECT id, status FROM mark_submissions
       WHERE class_name=? AND subject=? AND term=? AND year=? AND status IN ('submitted','approved')`
    ).bind(student.className, body.subject, term, year).first() as any;
    if (lockedSubmission && session.role === 'Subject Teacher') {
      return json({ success: false, message: `This mark sheet is ${lockedSubmission.status} and cannot be edited.` }, 423);
    }
    const settings = await env.DB.prepare('SELECT maximum_score FROM assessment_settings WHERE id=1').first() as any;
    const maximumScore = Number(settings?.maximum_score || 100);
    for (const field of ['botScore', 'motScore', 'eotScore', 'score']) {
      if (body[field] !== undefined && body[field] !== null && (
        !Number.isFinite(Number(body[field])) || Number(body[field]) < 0 || Number(body[field]) > maximumScore
      )) {
        return json({ success: false, message: `${field} must be between 0 and ${maximumScore}.` }, 400);
      }
    }
    const mark: Record<string, any> = { ...body, id: body.id || `mk-${crypto.randomUUID()}` };
    const before = await env.DB.prepare(
      'SELECT payload FROM marks WHERE student_id=? AND subject=? AND term=? AND year=?'
    ).bind(mark.studentId, mark.subject, term, year).first() as any;
    await env.DB.prepare(
      `INSERT INTO marks (id, student_id, subject, term, year, payload, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_id, subject, term, year) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at`
    ).bind(mark.id, mark.studentId, mark.subject, term, year, JSON.stringify(mark), Date.now()).run();
    await env.DB.prepare(
      `INSERT INTO mark_submissions
        (id, username, class_name, subject, term, year, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)
       ON CONFLICT(username, class_name, subject, term, year) DO UPDATE SET updated_at=excluded.updated_at`
    ).bind(`submission-${crypto.randomUUID()}`, session.sub, student.className, mark.subject, term, year, Date.now()).run();
    const previousMark = before ? JSON.parse(before.payload) : undefined;
    const unusualChange = previousMark && Math.abs(Number(previousMark.score || 0) - Number(mark.score || 0)) >= 30;
    await writeAudit(env, request, session, unusualChange ? 'MARK_LARGE_CHANGE_FLAGGED' : before ? 'MARK_UPDATED' : 'MARK_CREATED', 'mark', `${mark.studentId}:${mark.subject}:${term}:${year}`, previousMark, mark);
    return json({
      success: true,
      mark,
      warning: unusualChange ? `Large mark change detected: ${previousMark.score} to ${mark.score}. It has been flagged in the audit history.` : undefined
    });
  }
  if (request.method === 'POST' && url.pathname === '/api/marks/bulk') {
    const body = await readBody(request);
    if (!Array.isArray(body.marks)) return json({ success: false, message: 'Expected marks array.' }, 400);
    const warnings = [];
    for (const item of body.marks) {
      const markRequest = new Request(new URL('/api/marks', request.url), {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(item)
      });
      const result: Response = await api(markRequest, env);
      if (!result.ok) return result;
      const resultBody = await result.json() as any;
      if (resultBody.warning) warnings.push({ studentId: item.studentId, warning: resultBody.warning });
    }
    return json({ success: true, count: body.marks.length, warnings });
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
