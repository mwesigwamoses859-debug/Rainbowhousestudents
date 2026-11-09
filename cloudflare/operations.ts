import { RECOVERY_TABLES, Snapshot, encryptSnapshot, decryptSnapshot, quoteIdentifier, recoveryInsertPlans } from './recovery';

type Session = { sub: string; role: string };
type RecoveryEnv = Env & { BACKUP_ENCRYPTION_KEY?: string };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const admin = (session: Session) => session.role === 'Headteacher' || session.role === 'DOS';

export const OPERATIONS_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS school_backups (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, note TEXT NOT NULL, size INTEGER NOT NULL, record_count INTEGER NOT NULL, iv TEXT NOT NULL, checksum TEXT NOT NULL, key_source TEXT NOT NULL, created_by TEXT NOT NULL, verified_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS school_backup_chunks (backup_id TEXT NOT NULL, part INTEGER NOT NULL, content TEXT NOT NULL, PRIMARY KEY (backup_id, part))`,
  `CREATE TABLE IF NOT EXISTS school_backup_state (id INTEGER PRIMARY KEY CHECK (id=1), last_attempt TEXT, last_error TEXT)`,
  `CREATE TABLE IF NOT EXISTS pupil_support_notes (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, note TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS pupil_documents (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, data TEXT NOT NULL, uploaded_by TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS support_records (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, payload TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL)`,
];
const initialized = new WeakSet<object>();
export async function ensureOperationsSchema(db: D1Database) {
  if (initialized.has(db)) return;
  await db.batch(OPERATIONS_SCHEMA.map(sql => db.prepare(sql)));
  initialized.add(db);
}

async function audit(env: Env, session: Session, action: string, id: string) {
  await env.DB.prepare(`INSERT INTO audit_logs (id,actor_username,actor_role,action,entity_type,entity_id,created_at) VALUES (?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), session.sub, session.role, action, 'recovery_or_pupil_record', id, Date.now()).run();
}
const keyFor = (env: RecoveryEnv, source: string) => source === 'dedicated' ? env.BACKUP_ENCRYPTION_KEY || '' : env.SESSION_SECRET;
const metadata = (row: any) => ({ id: row.id, filename: `${row.id}.aes`, timestamp: row.created_at, size: row.size, recordCount: row.record_count, note: row.note, status: 'complete', encrypted: true, cipher: 'AES-256-GCM', verifiedAt: row.verified_at });

async function createBackup(env: RecoveryEnv, session: Session, note: string) {
  const available = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all<{ name: string }>();
  const tables = RECOVERY_TABLES.filter(table => available.results.some(r => r.name === table));
  const rows = await env.DB.batch(tables.map(table => env.DB.prepare(`SELECT * FROM ${quoteIdentifier(table)} ORDER BY rowid`)));
  const snapshot: Snapshot = { version: 1, createdAt: new Date().toISOString(), tables: Object.fromEntries(tables.map((table, index) => [table, rows[index].results as Record<string,unknown>[]])) };
  const keySource = env.BACKUP_ENCRYPTION_KEY ? 'dedicated' : 'session';
  const sealed = await encryptSnapshot(snapshot, keyFor(env, keySource));
  const id = `backup-${crypto.randomUUID()}`;
  const count = rows.reduce((total, result) => total + result.results.length, 0);
  const inserts = [env.DB.prepare('INSERT INTO school_backups (id,created_at,note,size,record_count,iv,checksum,key_source,created_by) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, snapshot.createdAt, note.slice(0,180), sealed.size, count, sealed.iv, sealed.checksum, keySource, session.sub)];
  for (let offset=0, part=0; offset < sealed.content.length; offset += 500000, part++) inserts.push(env.DB.prepare('INSERT INTO school_backup_chunks (backup_id,part,content) VALUES (?,?,?)').bind(id, part, sealed.content.slice(offset, offset+500000)));
  inserts.push(env.DB.prepare('INSERT INTO school_backup_state (id,last_attempt,last_error) VALUES (1,?,NULL) ON CONFLICT(id) DO UPDATE SET last_attempt=excluded.last_attempt,last_error=NULL').bind(snapshot.createdAt));
  inserts.push(env.DB.prepare(`INSERT INTO audit_logs (id,actor_username,actor_role,action,entity_type,entity_id,created_at) VALUES (?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),session.sub,session.role,'BACKUP_CREATED','recovery_or_pupil_record',id,Date.now()));
  await env.DB.batch(inserts);
  return { id, timestamp: snapshot.createdAt, recordCount: count, queryCost: tables.length + inserts.length + 2 };
}

async function readBackup(env: RecoveryEnv, id: string) {
  const row = await env.DB.prepare('SELECT * FROM school_backups WHERE id=?').bind(id).first<any>();
  if (!row) return null;
  const chunks = await env.DB.prepare('SELECT content FROM school_backup_chunks WHERE backup_id=? ORDER BY part').bind(id).all<{content:string}>();
  const snapshot = await decryptSnapshot(chunks.results.map(c=>c.content).join(''), row.iv, row.checksum, keyFor(env, row.key_source));
  // A malformed/incomplete snapshot must never be allowed to clear live tables.
  const available = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all<{name:string}>();
  for (const table of RECOVERY_TABLES.filter(t=>available.results.some(r=>r.name===t))) {
    if (!Array.isArray(snapshot.tables[table])) throw new Error(`Backup is missing ${table}; recovery was stopped.`);
  }
  return { row, snapshot };
}

export async function handleOperations(request: Request, env: RecoveryEnv, session: Session, allowedClasses: Set<string>): Promise<Response | null> {
  const url = new URL(request.url);
  if (!/^\/api\/(backups(?:\/|$)|pupils\/|support$)/.test(url.pathname)) return null;
  const staff = await env.DB.prepare('SELECT role FROM staff WHERE username=? AND active=1').bind(session.sub).first<{role:string}>();
  if (!staff) return json({message:'Your staff account is unavailable. Please sign in again.'},401);
  session = {...session,role:staff.role};
  if (url.pathname.startsWith('/api/backups') && !admin(session)) return json({message:'Administrator access required.'},403);
  await ensureOperationsSchema(env.DB);

  if (url.pathname === '/api/backups' && request.method === 'GET') {
    const result = await env.DB.prepare('SELECT id,created_at,note,size,record_count,verified_at FROM school_backups ORDER BY created_at DESC LIMIT 100').all();
    return json(result.results.map(metadata));
  }
  if (url.pathname === '/api/backups/status' && request.method === 'GET') {
    const latest = await env.DB.prepare('SELECT id,created_at,verified_at FROM school_backups ORDER BY created_at DESC LIMIT 1').first();
    const state = await env.DB.prepare('SELECT last_attempt,last_error FROM school_backup_state WHERE id=1').first();
    return json({ lastSuccessfulBackup: latest, state, keySource: env.BACKUP_ENCRYPTION_KEY ? 'dedicated' : 'session', scope:'Pupil, academic, attendance, support and document records. Staff credentials and audit history are retained during restoration.' });
  }
  if (url.pathname === '/api/backups' && request.method === 'POST') {
    try {
      const body = await request.json() as any;
      return json({success:true,...await createBackup(env,session,String(body.note||'Manual recovery checkpoint'))},201);
    } catch {
      await env.DB.prepare('INSERT INTO school_backup_state (id,last_attempt,last_error) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET last_attempt=excluded.last_attempt,last_error=excluded.last_error').bind(new Date().toISOString(),'The last backup failed. Retry or contact your system administrator.').run();
      return json({message:'Backup could not be completed. No restore point was saved. Check server storage and recovery-key configuration.'},500);
    }
  }
  const backupMatch = url.pathname.match(/^\/api\/backups\/(backup-[a-f0-9-]+)\/(verify|restore)$/);
  if (backupMatch && request.method === 'POST') {
    let loaded;
    try { loaded = await readBackup(env,backupMatch[1]); }
    catch { return json({message:'This backup could not be decrypted or validated. Recovery has been stopped.'},422); }
    if (!loaded) return json({message:'Backup not found.'},404);
    const {row,snapshot} = loaded;
    if (backupMatch[2] === 'verify') {
      const verifiedAt = new Date().toISOString();
      await env.DB.prepare('UPDATE school_backups SET verified_at=? WHERE id=?').bind(verifiedAt,row.id).run();
      await audit(env,session,'BACKUP_INTEGRITY_VERIFIED',row.id);
      return json({success:true,verifiedAt,tables:Object.keys(snapshot.tables).length,recordCount:row.record_count});
    }
    const body = await request.json() as any;
    if (body.confirm !== 'RESTORE') return json({message:'Type RESTORE to confirm this recovery.'},400);
    const tables = Object.keys(snapshot.tables);
    const plan: D1PreparedStatement[] = tables.slice().reverse().map(table=>env.DB.prepare(`DELETE FROM ${quoteIdentifier(table)}`));
    tables.forEach((table,index)=>{
      // Actual schema constraints are checked by the atomic D1 transaction.
      // An incompatible column or required field rolls back every deletion.
      const columns = Object.keys(snapshot.tables[table][0] || {});
      for (const p of recoveryInsertPlans(table,snapshot.tables[table],columns)) plan.push(env.DB.prepare(p.sql).bind(p.values));
    });
    plan.push(env.DB.prepare(`INSERT INTO audit_logs (id,actor_username,actor_role,action,entity_type,entity_id,created_at) VALUES (?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),session.sub,session.role,'DATABASE_RESTORED','recovery_or_pupil_record',row.id,Date.now()));
    if (plan.length > 32) return json({message:'This recovery requires a larger maintenance operation. Restore a separate copy first; no live records have been changed.'},422);
    // Keep a checkpoint of the current database before the atomic replacement.
    const safeguard = await createBackup(env,session,`Automatic checkpoint before restoring ${row.id}`);
    if (safeguard.queryCost + plan.length + 6 > 48) return json({message:'A safety checkpoint was saved, but this snapshot is too large for an online restore. Use a separate maintenance copy. Live records were not changed.'},422);
    try { await env.DB.batch(plan); } catch { return json({message:'The recovery transaction failed and was rolled back. Current records are retained; check schema compatibility in a separate copy.'},500); }
    return json({success:true,safeguardBackupId:safeguard.id});
  }

  const pupilMatch = url.pathname.match(/^\/api\/pupils\/([^/]+)\/(overview|notes|documents)(?:\/([^/]+))?$/);
  const body = url.pathname === '/api/support' && request.method === 'POST' ? await request.json() as any : null;
  const pupilId = pupilMatch ? decodeURIComponent(pupilMatch[1]) : body?.studentId;
  if (url.pathname === '/api/support' && request.method === 'GET') {
    if (!admin(session)) return json([],200);
    const records = await env.DB.prepare('SELECT payload FROM support_records ORDER BY created_at DESC').all<{payload:string}>();
    return json(records.results.map(r=>JSON.parse(r.payload)));
  }
  if (!pupilId) return json({message:'Pupil not specified.'},400);
  const pupilRow = await env.DB.prepare('SELECT payload FROM students WHERE id=?').bind(pupilId).first<{payload:string}>();
  if (!pupilRow) return json({message:'Pupil not found.'},404);
  const pupil = JSON.parse(pupilRow.payload);
  if (!admin(session) && !allowedClasses.has(pupil.className)) return json({message:'You are not assigned to this pupil’s class.'},403);
  if (pupilMatch?.[2] === 'overview' && request.method === 'GET') {
    const attendance = await env.DB.prepare('SELECT date,status,recorded_by AS recordedBy FROM attendance WHERE student_id=? ORDER BY date DESC').bind(pupilId).all();
    const reports = await env.DB.prepare('SELECT id,academic_year,term,class_name,average_score,division FROM historical_report_cards WHERE student_id=? ORDER BY academic_year DESC,term DESC').bind(pupilId).all();
    const notes = admin(session) ? await env.DB.prepare('SELECT id,note,created_by,created_at FROM pupil_support_notes WHERE student_id=? ORDER BY created_at DESC').bind(pupilId).all() : {results:[]};
    const documents = admin(session) ? await env.DB.prepare('SELECT id,name,mime,size,uploaded_by,created_at FROM pupil_documents WHERE student_id=? ORDER BY created_at DESC').bind(pupilId).all() : {results:[]};
    const support = admin(session) ? await env.DB.prepare('SELECT payload FROM support_records WHERE student_id=? ORDER BY created_at DESC').bind(pupilId).all<{payload:string}>() : {results:[]};
    return json({attendance:attendance.results,reports:reports.results,notes:notes.results,documents:documents.results,support:support.results.map((r:any)=>JSON.parse(r.payload)),canViewSupport:admin(session)});
  }
  if (!admin(session)) return json({message:'Authorised administration staff only.'},403);
  if (pupilMatch?.[2] === 'notes' && request.method === 'POST') {
    const input = await request.json() as any;
    const note = String(input.note||'').trim();
    if (!note || note.length>4000) return json({message:'Enter a note of 1 to 4,000 characters.'},400);
    const id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO pupil_support_notes VALUES (?,?,?,?,?)').bind(id,pupilId,note,session.sub,new Date().toISOString()).run();
    await audit(env,session,'PUPIL_SUPPORT_NOTE_ADDED',pupilId);
    return json({success:true,id},201);
  }
  if (pupilMatch?.[2] === 'documents' && request.method === 'POST') {
    const input=await request.json() as any;
    const mime=String(input.mime||''); const name=String(input.name||'').trim().slice(0,180); const data=String(input.data||'');
    if (!name || !['application/pdf','image/jpeg','image/png'].includes(mime) || data.length>700000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) return json({message:'Upload a PDF, JPEG or PNG of at most 500 KB.'},400);
    let bytes:Uint8Array;
    try {bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));} catch{return json({message:'Invalid file.'},400);}
    const valid = mime==='application/pdf' ? new TextDecoder().decode(bytes.slice(0,5))==='%PDF-' : mime==='image/png' ? [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n) : bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    if (!valid || bytes.length>512000) return json({message:'The file contents do not match an accepted file format or size.'},400);
    const id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO pupil_documents VALUES (?,?,?,?,?,?,?,?)').bind(id,pupilId,name,mime,bytes.length,data,session.sub,new Date().toISOString()).run();
    await audit(env,session,'PUPIL_DOCUMENT_ADDED',pupilId);
    return json({success:true,id},201);
  }
  if (pupilMatch?.[2] === 'documents' && pupilMatch[3] && request.method === 'GET') {
    const document=await env.DB.prepare('SELECT name,mime,data FROM pupil_documents WHERE id=? AND student_id=?').bind(pupilMatch[3],pupilId).first<any>();
    if (!document) return json({message:'Document not found.'},404);
    return new Response(Uint8Array.from(atob(document.data),c=>c.charCodeAt(0)),{headers:{'Content-Type':document.mime,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(document.name)}`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  if (body) {
    const record={...body,id:crypto.randomUUID(),approvedBy:session.sub};
    if (!String(record.type||'').trim() || !Number.isFinite(Number(record.amount)) || Number(record.amount)<0) return json({message:'Invalid support record.'},400);
    await env.DB.prepare('INSERT INTO support_records VALUES (?,?,?,?,?)').bind(record.id,pupilId,JSON.stringify(record),session.sub,new Date().toISOString()).run();
    await audit(env,session,'PUPIL_SUPPORT_RECORDED',pupilId);
    return json(record,201);
  }
  return json({message:'Operation not found.'},404);
}
