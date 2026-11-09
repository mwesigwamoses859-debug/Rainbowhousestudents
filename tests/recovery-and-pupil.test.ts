import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { build } from 'esbuild';
import { encryptSnapshot } from '../cloudflare/recovery.ts';

const secret='isolated-test-recovery-secret-not-a-production-value';
const token=(sub:string,role:string)=>{const payload=Buffer.from(JSON.stringify({sub,role,exp:Date.now()+3600000})).toString('base64url');return `${payload}.${createHmac('sha256',secret).update(payload).digest('hex')}`;};
test('authenticated backup, integrity validation, atomic restore and private pupil records in a separate D1 database',async()=>{
  const built=await build({entryPoints:['cloudflare/worker.ts'],bundle:true,format:'esm',platform:'browser',write:false,target:'es2022'});
  const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-07-27',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{SESSION_SECRET:secret}}));
  try {
    const db=await mf.getD1Database('DB');
    for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql') && !f.startsWith('0004')).sort()) {
      const sql=(await readFile(`migrations/${file}`,'utf8')).replace(/^\s*--.*$/gm,'');
      for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
    }
    await db.prepare("ALTER TABLE staff ADD COLUMN responsibility TEXT NOT NULL DEFAULT ''").run();
    await db.prepare("INSERT INTO staff (username,name,email,role,subjects,classes) VALUES ('qa_teacher','QA Instructor','qa@example.invalid','Subject Teacher','[\"Mathematics\"]','[\"P.1\"]')").run();
    const fixture={id:'qa-pupil',surname:'Example',otherNames:'Learner',gender:'Female',dateOfBirth:'2017-04-12',className:'P.1',yearOfEntry:2026,photo:'',guardianName:'Example Guardian',guardianContact:'0700000000',communityWorker:'',workerContact:'',zoneInNansana:'Example Zone',hasScholarship:false};
    await db.prepare('INSERT INTO students VALUES (?,?,?,?)').bind(fixture.id,JSON.stringify(fixture),1,1).run();
    const mark={id:'qa-mark',studentId:fixture.id,subject:'Mathematics',score:0,term:1,year:2026,teacherName:'QA Instructor'};
    await db.prepare('INSERT INTO marks VALUES (?,?,?,?,?,?,?)').bind(mark.id,fixture.id,'Mathematics',1,2026,JSON.stringify(mark),1).run();
    const call=async(path:string,method='GET',body?:any,identity='admin')=>{
      const response=await mf.dispatchFetch(`https://example.test${path}`,{method,headers:{...(identity?{Authorization:`Bearer ${token(identity,identity==='admin'?'Headteacher':'Subject Teacher')}`} : {}),'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
      return {status:response.status,data:await response.json() as any};
    };
    assert.equal((await call('/api/backups','GET',undefined,'')).status,401);
    assert.equal((await call('/api/backups','GET',undefined,'qa_teacher')).status,403);
    assert.deepEqual((await call('/api/backups')).data,[]);
    assert.equal((await call('/api/backups/status')).data.lastSuccessfulBackup,null);
    const created=await call('/api/backups','POST',{note:'Isolated recovery test'});
    assert.equal(created.status,201,JSON.stringify(created.data));
    const id=created.data.id;
    const original=(await db.prepare('SELECT checksum FROM school_backups WHERE id=?').bind(id).first()) as any;
    const ciphertext=await db.prepare('SELECT content FROM school_backup_chunks WHERE backup_id=?').bind(id).first<any>();
    assert.equal(ciphertext.content.includes('Example Guardian'),false);
    assert.equal((await call(`/api/backups/${id}/verify`,'POST',{})).status,200);
    const verified=(await call('/api/backups')).data[0];
    assert.ok(verified.verifiedAt);
    await db.prepare('UPDATE students SET payload=? WHERE id=?').bind(JSON.stringify({...fixture,otherNames:'Changed'}),fixture.id).run();
    assert.equal((await call(`/api/backups/${id}/restore`,'POST',{})).status,400);
    await db.prepare('UPDATE school_backups SET checksum=? WHERE id=?').bind('tampered',id).run();
    assert.equal((await call(`/api/backups/${id}/restore`,'POST',{confirm:'RESTORE'})).status,422);
    assert.equal(JSON.parse((await db.prepare('SELECT payload FROM students WHERE id=?').bind(fixture.id).first<any>()).payload).otherNames,'Changed');
    await db.prepare('UPDATE school_backups SET checksum=? WHERE id=?').bind(original.checksum,id).run();
    const restored=await call(`/api/backups/${id}/restore`,'POST',{confirm:'RESTORE'});
    assert.equal(restored.status,200,JSON.stringify(restored.data));
    assert.ok(restored.data.safeguardBackupId);
    assert.deepEqual(JSON.parse((await db.prepare('SELECT payload FROM students WHERE id=?').bind(fixture.id).first<any>()).payload),fixture);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM marks').first<any>()).n,1);
    assert.ok((await db.prepare('SELECT COUNT(*) AS n FROM audit_logs').first<any>()).n>=3);
    assert.equal((await call('/api/pupils/qa-pupil/overview','GET',undefined,'qa_teacher')).data.canViewSupport,false);
    assert.equal((await call('/api/pupils/qa-pupil/notes','POST',{note:'Private test note'},'qa_teacher')).status,403);
    assert.equal((await call('/api/pupils/qa-pupil/notes','POST',{note:'Private test note'})).status,201);
    assert.equal((await call('/api/pupils/qa-pupil/overview')).data.notes.length,1);
    assert.equal((await call('/api/pupils/qa-pupil/overview','GET',undefined,'qa_teacher')).data.notes.length,0);
    const invalid=await call('/api/pupils/qa-pupil/documents','POST',{name:'fake.pdf',mime:'application/pdf',data:btoa('not a pdf')});
    assert.equal(invalid.status,400);
    const uploaded=await call('/api/pupils/qa-pupil/documents','POST',{name:'fixture.pdf',mime:'application/pdf',data:btoa('%PDF-1.4\n% Synthetic test only\n%%EOF')});
    assert.equal(uploaded.status,201);
    assert.equal((await call(`/api/pupils/qa-pupil/documents/${uploaded.data.id}`,'GET',undefined,'qa_teacher')).status,403);
    const overview=(await call('/api/pupils/qa-pupil/overview')).data;
    assert.equal(overview.documents.length,1);
    assert.equal('data' in overview.documents[0],false);
    // A validly encrypted but structurally incomplete row must roll back all
    // live-table deletes when a database constraint rejects its restoration.
    const broken=await encryptSnapshot({version:1,createdAt:new Date().toISOString(),tables:{students:[{id:'broken'}],marks:[],attendance:[],assessment_settings:[],academic_years:[],mark_submissions:[],promotion_history:[],historical_report_cards:[],academic_year_archives:[],pupil_support_notes:[],pupil_documents:[],support_records:[]}},secret);
    const brokenId='backup-00000000-0000-0000-0000-000000000000';
    await db.prepare('INSERT INTO school_backups (id,created_at,note,size,record_count,iv,checksum,key_source,created_by) VALUES (?,?,?,?,?,?,?,?,?)').bind(brokenId,new Date().toISOString(),'Constraint rollback fixture',broken.size,1,broken.iv,broken.checksum,'session','admin').run();
    await db.prepare('INSERT INTO school_backup_chunks VALUES (?,?,?)').bind(brokenId,0,broken.content).run();
    const rejected=await call(`/api/backups/${brokenId}/restore`,'POST',{confirm:'RESTORE'});
    assert.equal(rejected.status,500);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM students').first<any>()).n,1);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM marks').first<any>()).n,1);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM pupil_support_notes').first<any>()).n,1);
  }finally{await mf.dispose();}
});
