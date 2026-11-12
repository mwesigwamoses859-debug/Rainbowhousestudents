// Development-only browser QA: separate in-memory D1, synthetic records and a
// random signing key. No production credentials, databases or outbound mail.
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { build } from 'esbuild';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { createHmac, randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const previewPort=Number(process.env.PORT || (process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port')+1] : 3000));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const secret=randomBytes(32).toString('hex');
const payload=Buffer.from(JSON.stringify({sub:'admin',role:'Headteacher',exp:Date.now()+2*3600000})).toString('base64url');
const token=`${payload}.${createHmac('sha256',secret).update(payload).digest('hex')}`;
const teacher={username:'admin',name:'Preview Administrator',role:'Headteacher',subjects:['All'],classes:['P.1','P.2','P.3','P.4','P.5','P.6','P.7'],authToken:token};
const script=`localStorage.setItem('school_sms_teacher', ${JSON.stringify(JSON.stringify(teacher))});document.addEventListener('DOMContentLoaded',()=>{const b=document.createElement('button');b.textContent='Test data · simulate save failure';b.style.cssText='position:fixed;bottom:8px;left:8px;z-index:999;background:#fff7ed;border:1px solid #fb923c;padding:6px;font-size:11px;border-radius:4px';let failed=false;b.onclick=async()=>{failed=!failed;await fetch('/__qa/fail-saves',{method:'POST',body:JSON.stringify({failed})});b.textContent=failed?'Test data · save failure ON':'Test data · simulate save failure';};document.body.append(b);});`;
const entry=`import worker from './cloudflare/worker.ts';let failed=false;export default {async fetch(request,env){const u=new URL(request.url);if(u.pathname==='/__qa/fail-saves'){failed=Boolean((await request.json()).failed);return Response.json({failed});}if(failed&&request.method==='POST'&&['/api/marks/bulk','/api/attendance/bulk','/api/general/care/attendance'].includes(u.pathname))return Response.json({message:'Simulated connection interruption for isolated QA.'},{status:503});if(u.pathname==='/'){const r=await env.ASSETS.fetch(request);return new Response((await r.text()).replace('</head>', '<script>'+${JSON.stringify(script)}+'</script></head>'),{headers:r.headers});}return worker.fetch(request,env);}};`;
const output=await build({stdin:{contents:entry,resolveDir:root,sourcefile:'isolated-preview.ts'},bundle:true,format:'esm',platform:'browser',write:false,target:'es2022'});
const mf=new Miniflare(convertV4MiniflareOptions({name:'rainbow-house-preview',host:'127.0.0.1',port:previewPort,modules:true,script:output.outputFiles[0].text,compatibilityDate:'2026-07-27',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{SESSION_SECRET:secret},assets:{directory:path.join(root,'dist'),binding:'ASSETS',run_worker_first:true,routerConfig:{has_user_worker:true},assetConfig:{not_found_handling:'single-page-application'}}}));
const db=await mf.getD1Database('DB');
for(const file of (await readdir(path.join(root,'migrations'))).filter(f=>f.endsWith('.sql')&&!f.startsWith('0004')).sort()) {
  const sql=(await readFile(path.join(root,'migrations',file),'utf8')).replace(/^\s*--.*$/gm,'');
  for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
}
await db.prepare("ALTER TABLE staff ADD COLUMN responsibility TEXT NOT NULL DEFAULT ''").run();
await db.prepare("UPDATE staff SET name='Preview Administrator' WHERE username='admin'").run();
const pupil={id:'preview-learner',surname:'Preview',otherNames:'Learner',gender:'Female',dateOfBirth:'2017-04-12',className:'P.1',yearOfEntry:2026,photo:'',guardianName:'Preview Guardian',guardianContact:'0700000000',communityWorker:'',workerContact:'',zoneInNansana:'Example Zone',hasScholarship:false};
await db.prepare('INSERT INTO students VALUES (?,?,?,?)').bind(pupil.id,JSON.stringify(pupil),Date.now(),Date.now()).run();
const mark={id:'preview-mark',studentId:pupil.id,subject:'Mathematics',score:68,term:1,year:2026,teacherName:'Preview Administrator'};
await db.prepare('INSERT INTO marks VALUES (?,?,?,?,?,?,?)').bind(mark.id,pupil.id,mark.subject,1,2026,JSON.stringify(mark),Date.now()).run();
const careLearner={id:'preview-care-learner',surname:'Care',otherNames:'Example Learner',gender:'Female',dateOfBirth:'2016-05-10',grade:'P.4',educationLevel:'Primary',academicYear:2026,intakeType:'New intake',intakeDate:'2026-11-10',guardianName:'Example Guardian',guardianRelationship:'Aunt',guardianContact:'0700000000',zone:'Example Zone A',active:true,careEnrolled:true,autoPromote:true,universityDuration:0,transitionReview:false,documentStatus:{}};
const uniLearner={...careLearner,id:'preview-university-learner',surname:'University',otherNames:'Example Learner',dateOfBirth:'2005-02-11',grade:'Year 2',educationLevel:'University',intakeType:'Continuing learner',intakeReason:'Synthetic continuing learner for isolated QA',zone:'Example Zone B',careEnrolled:false};
for(const l of [careLearner,uniLearner])await db.prepare('INSERT INTO general_students VALUES (?,?,?,?,?,?,?)').bind(l.id,l.id,null,JSON.stringify(l),1,Date.now(),Date.now()).run();
const lastSaturday=new Date();lastSaturday.setUTCDate(lastSaturday.getUTCDate()-(lastSaturday.getUTCDay()+1)%7);
await db.prepare('INSERT INTO general_care_attendance VALUES (?,?,?,?,?,?)').bind(careLearner.id,lastSaturday.toISOString().slice(0,10),'Present','','preview-staff',new Date().toISOString()).run();
const samplePdf=await PDFDocument.create();const samplePage=samplePdf.addPage();const sampleFont=await samplePdf.embedFont(StandardFonts.Helvetica);samplePage.drawText('SYNTHETIC SCHOOL DOCUMENT - ISOLATED QA',{x:40,y:750,size:14,font:sampleFont});const sampleBytes=await samplePdf.save();
await db.prepare('INSERT INTO pupil_documents VALUES (?,?,?,?,?,?,?,?)').bind('preview-school-document',pupil.id,'Synthetic school document.pdf','application/pdf',sampleBytes.length,Buffer.from(sampleBytes).toString('base64'),'preview-staff',new Date().toISOString()).run();
console.log(`Isolated Rainbow House preview ready on port ${previewPort}. Synthetic data only.`);
process.on('SIGTERM',async()=>{await mf.dispose();process.exit(0);});
process.on('SIGINT',async()=>{await mf.dispose();process.exit(0);});
