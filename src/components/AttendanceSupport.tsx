import { useEffect, useState } from 'react';
import { CalendarCheck, MessageCircle, RefreshCw, Save } from 'lucide-react';
import { Student, ClassName, Teacher, Mark } from '../types';
import { authHeaders, schoolToday, useSchoolScope } from '../lib/schoolScope';
import { recordedClass } from '../lib/dashboardData';
import { useDraft } from '../lib/drafts';
import SaveIndicator from './SaveIndicator';
import GuardianMessage from './GuardianMessage';
type Status='present'|'absent'|'sick'|'late';
interface Props {students:Student[];teacherClasses:ClassName[];isAdmin:boolean;teacher:Teacher;marks:Mark[];}
export default function AttendanceSupport({students,teacherClasses,isAdmin,teacher,marks}:Props) {
  const scope=useSchoolScope();
  const classes:ClassName[]=isAdmin?['P.1','P.2','P.3','P.4','P.5','P.6','P.7']:teacherClasses;
  const selectedClass=scope.className!=='all'&&classes.includes(scope.className)?scope.className:classes[0]||'P.1';
  const [date,setDate]=useState(schoolToday()),[records,setRecords]=useState<any[]|null>(null),[statuses,setStatuses]=useState<Record<string,Status>>({}),[error,setError]=useState(''),[messagePupil,setMessagePupil]=useState<Student|null>(null),[refresh,setRefresh]=useState(0);
  const key=`${teacher.username}:attendance:${selectedClass}:${date}`;
  const draft=useDraft<Record<string,Status>>(key);
  const pupils=students.filter(s=>recordedClass(s,Number(date.slice(0,4)),scope.activeYear)===selectedClass);
  useEffect(()=>{if(Number(date.slice(0,4))!==scope.year)setDate(`${scope.year}-01-01`);},[scope.year]);
  useEffect(()=>{
    let cancelled=false;
    fetch('/api/attendance',{headers:authHeaders(teacher)}).then(async r=>{if(!r.ok)throw new Error('The attendance register could not be loaded. Retry before saving.');return r.json();}).then(rows=>{if(!cancelled){setRecords(rows);setError('');}}).catch(e=>{if(!cancelled)setError(e.message);});
    return()=>{cancelled=true;};
  },[teacher.authToken,refresh]);
  useEffect(()=>{
    const saved=Object.fromEntries((records||[]).filter(r=>r.date===date).map(r=>[r.studentId,r.status]));
    const restored=draft.restore();setStatuses({...saved,...restored});
  },[key,records]);
  const change=(id:string,status:Status)=>{const next={...statuses,[id]:status};setStatuses(next);draft.store(next);};
  const save=async()=>{
    draft.setState('saving');setError('');
    const entries=pupils.filter(p=>statuses[p.id]).map(p=>({studentId:p.id,date,status:statuses[p.id]}));
    if(!entries.length){draft.setState('unsaved');setError('Mark at least one pupil before saving.');return;}
    try{const response=await fetch('/api/attendance/bulk',{method:'POST',headers:{...authHeaders(teacher),'Content-Type':'application/json'},body:JSON.stringify({records:entries})});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.message||'Attendance could not be saved.');setRecords(previous=>[...(previous||[]).filter(r=>!entries.some(e=>e.studentId===r.studentId&&e.date===r.date)),...entries]);draft.saved();}
    catch(e:any){draft.setState('failed');setError(`${e.message} Your edits remain in this tab. Retry Save when connected.`);}
  };
  const alerts=pupils.map(student=>{const at=(records||[]).filter(a=>a.studentId===student.id&&a.date.startsWith(`${scope.year}-`));const ms=marks.filter(m=>m.studentId===student.id&&m.year===scope.year&&m.term===scope.term);return {student,attendance:at.length?Math.round(at.filter(a=>['present','late'].includes(a.status)).length/at.length*100):null,average:ms.length?Math.round(ms.reduce((n,m)=>n+m.score,0)/ms.length):null};}).filter(a=>(a.attendance!==null&&a.attendance<85)||(a.average!==null&&a.average<50));
  const saving=draft.state==='saving';
  return <div id="attendance_support_view" className="workspace-page space-y-5"><div><h1 className="text-2xl font-bold text-[#0b2d59]">Attendance</h1><p className="mt-1 text-sm text-slate-500">Mark the register explicitly. Unmarked pupils are never saved as present automatically.</p></div><SaveIndicator state={draft.state} notice={draft.notice}/>{error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}<button onClick={()=>setRefresh(n=>n+1)} className="ml-3 underline">Reload saved register</button></p>}
    <div className="panel flex flex-wrap items-end gap-4 p-4"><label className="text-sm text-slate-600">Class<select aria-label="Attendance class" disabled={saving} value={selectedClass} onChange={e=>scope.setClassName(e.target.value as ClassName)} className="scope-select">{classes.map(c=><option key={c}>{c}</option>)}</select></label><label className="text-sm text-slate-600">Register date<input aria-label="Register date" type="date" max={schoolToday()} disabled={saving} value={date} onChange={e=>{setDate(e.target.value);scope.setYear(Number(e.target.value.slice(0,4)));}} className="scope-select"/></label><span className="mr-auto self-center text-sm text-slate-500">{pupils.filter(p=>statuses[p.id]).length} of {pupils.length} marked</span><button disabled={saving||!pupils.length||!records} onClick={()=>{const next={...statuses,...Object.fromEntries(pupils.map(p=>[p.id,'present' as Status]))};setStatuses(next);draft.store(next);}} className="secondary-button">Mark all present</button><button disabled={saving||!pupils.length||!records||!pupils.some(p=>statuses[p.id])} onClick={save} className="primary-button"><Save size={16}/>{saving?'Saving…':'Save register'}</button></div>
    <section className="panel overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-5 py-3">Pupil</th><th>Status</th><th className="py-3">Roll call</th><th className="pr-5">Follow-up</th></tr></thead><tbody className="divide-y divide-slate-100">{pupils.map(p=><tr key={p.id}><td className="px-5 py-4 font-medium text-slate-900">{p.surname} {p.otherNames}</td><td className="capitalize text-slate-600">{statuses[p.id]||'Unmarked'}</td><td className="py-3 pr-3"><div className="flex flex-wrap gap-1.5">{(['present','absent','sick','late'] as Status[]).map(value=><button key={value} disabled={saving||!records} aria-label={`${p.surname} ${p.otherNames}: ${value}`} aria-pressed={statuses[p.id]===value} onClick={()=>change(p.id,value)} className={`rounded-lg border px-3 py-2 text-xs capitalize ${statuses[p.id]===value?'border-[#0b2d59] bg-[#0b2d59] text-white':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{value}</button>)}</div></td><td className="pr-5"><button disabled={!records} aria-label={`Prepare message for ${p.guardianName||'guardian'}`} onClick={()=>setMessagePupil(p)} className="secondary-button"><MessageCircle size={16}/><span className="hidden lg:inline">Draft message</span></button></td></tr>)}</tbody></table>{!pupils.length&&<p className="p-10 text-center text-sm text-slate-500">No recorded pupils in this class and academic year.</p>}</div></section>
    <section className="panel p-5"><h2 className="font-semibold text-slate-900">Attendance and academic follow-up</h2><p className="mt-1 text-xs text-slate-500">Saved attendance below 85% in {scope.year}, or recorded average below 50% in Term {scope.term}.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{alerts.map(a=><div key={a.student.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"><strong>{a.student.surname} {a.student.otherNames}</strong><p className="mt-1">Attendance: {a.attendance===null?'No records':`${a.attendance}%`} · Average: {a.average===null?'No marks':`${a.average}%`}</p></div>)}</div>{!alerts.length&&<p className="mt-3 text-sm text-slate-500">{records?'No follow-up flags in the records available.':'Attendance records are unavailable.'}</p>}</section>
    {messagePupil&&<GuardianMessage student={messagePupil} attendance={(records||[]).filter(r=>r.studentId===messagePupil.id)} marks={marks} year={scope.year} term={scope.term} date={date} onClose={()=>setMessagePupil(null)}/>}
  </div>;
}
