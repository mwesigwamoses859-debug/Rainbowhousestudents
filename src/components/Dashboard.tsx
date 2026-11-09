import { useEffect, useMemo, useState } from 'react';
import { Users, CalendarCheck, ClipboardCheck, HeartHandshake, ArrowRight, Plus, BookOpen, CreditCard, RefreshCw, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { Student, Mark, Teacher } from '../types';
import { authHeaders, schoolToday, useSchoolScope } from '../lib/schoolScope';
import { dashboardData, recordedClass } from '../lib/dashboardData';

interface Props {
  students:Student[]; marks:Mark[]; teacher?:Teacher; isAdmin?:boolean;
  setActiveTab:(tab:string)=>void; onAddStudentQuickAction?:()=>void;
  onRegisterMarkQuickAction?:()=>void; onGenerateIdCardQuickAction?:()=>void;
  onOpenProfile?:(student:Student)=>void;
}
const empty = <div className="flex h-48 items-center justify-center text-sm text-slate-500">No data available for this selection.</div>;
export default function Dashboard({students,marks,teacher,isAdmin=true,setActiveTab,onAddStudentQuickAction,onRegisterMarkQuickAction,onGenerateIdCardQuickAction,onOpenProfile}:Props) {
  const scope=useSchoolScope();
  const [attendance,setAttendance]=useState<any[]>([]);
  const [submissions,setSubmissions]=useState<any[]>([]);
  const [backup,setBackup]=useState<any>(null);
  const [errors,setErrors]=useState<string[]>([]);
  const [loadedAt,setLoadedAt]=useState('');
  const [dailyLoading,setDailyLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{
    let cancelled=false;setDailyLoading(true);
    const paths=['/api/attendance','/api/mark-submissions',...(isAdmin?['/api/backups/status']:[])];
    Promise.all(paths.map(async path=>{try {const r=await fetch(path,{headers:authHeaders(teacher)});if(!r.ok)throw new Error();return {ok:true,data:await r.json(),path};}catch{return {ok:false,data:null,path};}})).then(results=>{
      if(cancelled)return;
      setErrors(results.filter(r=>!r.ok).map(r=>r.path));
      if(results[0].ok)setAttendance(results[0].data);
      if(results[1].ok)setSubmissions(results[1].data);
      if(results[2]?.ok)setBackup(results[2].data);
      setDailyLoading(false);
      setLoadedAt(new Date().toLocaleTimeString('en-UG',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Kampala'}));
    });return()=>{cancelled=true;};
  },[teacher?.authToken,refresh,isAdmin]);
  const date=schoolToday();
  const data=useMemo(()=>dashboardData(students,marks,attendance,scope,date),[students,marks,attendance,scope.year,scope.term,scope.className,scope.activeYear,date]);
  const pending=submissions.filter(s=>s.status==='submitted'&&Number(s.year)===scope.year&&Number(s.term)===scope.term&&(scope.className==='all'||s.class_name===scope.className));
  const attendanceFailed=dailyLoading||errors.includes('/api/attendance');
  const approvalFailed=dailyLoading||errors.includes('/api/mark-submissions');
  const backupFailed=errors.includes('/api/backups/status')||backup?.state?.last_error;
  const currentYear=scope.year===Number(date.slice(0,4));
  const cards=[
    {label:'Registered pupils',value:data.pupils.length,note:`${data.pupils.filter(p=>p.gender==='Male').length} boys · ${data.pupils.filter(p=>p.gender==='Female').length} girls`,icon:Users},
    {label:'Present today',value:attendanceFailed?'—':!currentYear?'—':data.today.filter(a=>['present','late'].includes(a.status)).length,note:dailyLoading?'Checking saved attendance…':attendanceFailed?'Attendance could not be loaded':!currentYear?'Select the current year for today’s register':`${data.today.filter(a=>a.status==='absent'||a.status==='sick').length} absent / sick · ${data.unmarked} unmarked`,icon:CalendarCheck},
    {label:'Awaiting approval',value:approvalFailed?'—':pending.length,note:dailyLoading?'Checking submitted mark sheets…':approvalFailed?'Approvals could not be loaded':`Mark sheets · Term ${scope.term}`,icon:ClipboardCheck},
    {label:'Need follow-up',value:attendanceFailed?'—':data.followUp.length,note:'Recorded attendance <85% or average <50%',icon:HeartHandshake},
  ];
  const tasks=[
    ...(currentYear&&!attendanceFailed&&data.unmarked>0?[{title:`Mark attendance for ${data.unmarked} pupil${data.unmarked===1?'':'s'}`,detail:'Today’s register has unmarked pupils.',tab:'attendance'}]:[]),
    ...(!approvalFailed&&pending.length?[{title:`Review ${pending.length} mark sheets`,detail:'Submitted by teachers and awaiting approval.',tab:'approvals'}]:[]),
    ...(data.incomplete.length?[{title:`Complete ${data.incomplete.length} pupil profile${data.incomplete.length===1?'':'s'}`,detail:'Missing a birth date, photo or guardian contact.',tab:'classes'}]:[]),
    ...(isAdmin&&!dailyLoading&&(backupFailed||(!errors.includes('/api/backups/status')&&!backup?.lastSuccessfulBackup))?[{title:backupFailed?'Investigate backup status':'Create the first recovery checkpoint',detail:backupFailed?'The backup service reported a failure.':'No successful backup has been recorded.',tab:'backup'}]:[]),
  ];
  const subjects=[...new Set(data.scores.map(m=>m.subject))].map(subject=>{const rows=data.scores.filter(m=>m.subject===subject);return {subject,average:Math.round(rows.reduce((n,m)=>n+m.score,0)/rows.length*10)/10};});
  const list=data.pupils.filter(s=>`${s.surname} ${s.otherNames} ${s.guardianName||''}`.toLowerCase().includes(search.toLowerCase()));
  return <div id="dashboard_view" className="workspace-page space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm text-slate-500">Rainbow House · {new Date().toLocaleDateString('en-UG',{day:'numeric',month:'long',year:'numeric',timeZone:'Africa/Kampala'})}</p><h1 className="mt-1 text-2xl font-bold text-[#0b2d59]">Your school at a glance</h1><p className="mt-1 text-sm text-slate-600">{scope.className==='all'?'All assigned classes':`Class ${scope.className}`} · Term {scope.term}, {scope.year}</p></div>
      <button onClick={()=>setRefresh(r=>r+1)} className="secondary-button"><RefreshCw size={16}/>Refresh daily status</button>
    </div>
    {errors.length>0&&<div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Some daily status records could not be loaded. Unavailable totals are shown as —. Refresh to retry.</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card=><div className="panel p-4" key={card.label}><div className="flex items-center justify-between text-sm text-slate-600"><span>{card.label}</span><card.icon size={18} className="text-sky-700"/></div><p className="my-2 text-3xl font-bold text-[#0b2d59]">{card.value}</p><p className="text-xs leading-relaxed text-slate-500">{card.note}</p></div>)}</div>
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <section className="panel"><div className="panel-heading"><h2>Today’s tasks</h2><span className="text-xs font-normal text-slate-500">Daily status checked {loadedAt||'…'}</span></div><div className="divide-y divide-slate-100">{tasks.length?tasks.map(task=><button key={task.tab} onClick={()=>setActiveTab(task.tab)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><AlertCircle size={17}/></span><span className="flex-1"><strong className="block text-sm text-slate-800">{task.title}</strong><span className="text-xs text-slate-500">{task.detail}</span></span><ArrowRight size={17} className="text-slate-400"/></button>):<p className="p-5 text-sm text-slate-500">{data.pupils.length?'No pending tasks in the records checked.':'Register or import pupils to start attendance and assessment tasks.'}</p>}</div></section>
      <section className="panel p-5"><h2 className="text-base font-semibold text-slate-900">Quick actions</h2><div className="mt-4 grid gap-2">{isAdmin&&<button onClick={onAddStudentQuickAction} className="primary-button"><Plus size={17}/>Register a pupil</button>}<button onClick={onRegisterMarkQuickAction} className="secondary-button"><BookOpen size={17}/>Enter assessment marks</button><button onClick={onGenerateIdCardQuickAction} className="secondary-button"><CreditCard size={17}/>Pupil IDs & certificates</button><button onClick={()=>setActiveTab('careprogram')} className="secondary-button"><HeartHandshake size={17}/>Care Program</button></div><p className="mt-4 text-xs text-slate-500">Scholarships recorded: <strong className="text-slate-800">{data.scholarships}</strong> of {data.pupils.length} pupils.</p></section>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="panel"><div className="panel-heading"><h2>Recorded subject averages</h2><span className="text-xs font-normal text-slate-500">Term {scope.term} · {data.scores.length} records</span></div>{subjects.length?<div className="h-64 p-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={subjects} margin={{top:12,right:12,left:-18,bottom:12}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="subject" tick={{fontSize:10}} interval={0}/><YAxis domain={[0,100]}/><Tooltip/><Bar dataKey="average" name="Average score" fill="#0b2d59" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>:empty}</section>
      <section className="panel"><div className="panel-heading"><h2>Term performance</h2><span className="text-xs font-normal text-slate-500">{scope.year} · recorded marks only</span></div>{data.trends.length?<div className="h-64 p-3"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.trends} margin={{top:12,right:18,left:-18,bottom:12}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="term"/><YAxis domain={[0,100]}/><Tooltip/><Line dataKey="average" name="Average score" stroke="#0284c7" strokeWidth={3} connectNulls={false}/></LineChart></ResponsiveContainer></div>:empty}<p className="px-5 pb-3 text-xs text-slate-500">Averages use recorded scores; they are not exam predictions.</p></section>
    </div>
    <section className="panel"><div className="panel-heading flex-wrap gap-3"><h2>Pupils in this selection</h2><input aria-label="Search dashboard pupils" placeholder="Search pupil or guardian…" value={search} onChange={e=>setSearch(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"/></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-100 bg-slate-50 text-slate-600"><tr><th className="px-5 py-3">Pupil</th><th>Class</th><th>Guardian</th><th>Scholarship</th><th className="pr-5">Overview</th></tr></thead><tbody className="divide-y divide-slate-100">{list.slice(0,20).map(s=><tr key={s.id}><td className="px-5 py-3 font-medium text-slate-900">{s.surname} {s.otherNames}</td><td>{recordedClass(s,scope.year,scope.activeYear)}</td><td>{s.guardianName||'Not recorded'}</td><td>{s.hasScholarship?s.scholarshipDetails||'Recorded support':'Not recorded'}</td><td className="pr-5"><button className="text-sm font-semibold text-sky-800 hover:underline" onClick={()=>onOpenProfile?.(s)}>Open profile</button></td></tr>)}</tbody></table>{!list.length&&<p className="p-8 text-center text-sm text-slate-500">No pupils match this selection.</p>}{list.length>20&&<button onClick={()=>setActiveTab('classes')} className="m-4 text-sm font-semibold text-sky-800">View all {list.length} pupils →</button>}</div></section>
  </div>;
}
