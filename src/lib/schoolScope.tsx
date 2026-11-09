import { createContext, useContext, useEffect, useState } from 'react';
import { AcademicYear, ClassName, Teacher } from '../types';

export const schoolToday = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Africa/Kampala',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const authHeaders = (teacher?: Teacher | null) => ({ Authorization: `Bearer ${teacher?.authToken || ''}` });
export interface SchoolScope {
  year: number; term: 1|2|3; className: ClassName|'all'; activeYear: number; years: AcademicYear[];
  setYear: (year:number)=>void; setTerm: (term:1|2|3)=>void; setClassName:(name:ClassName|'all')=>void;
}
export const SchoolScopeContext = createContext<SchoolScope>(null!);
export const useSchoolScope = () => useContext(SchoolScopeContext);
export function useSchoolScopeState(teacher: Teacher | null): SchoolScope {
  const [year,setYear]=useState(Number(schoolToday().slice(0,4)));
  const [term,setTerm]=useState<1|2|3>(1);
  const [className,setClassName]=useState<ClassName|'all'>('all');
  const [years,setYears]=useState<AcademicYear[]>([]);
  const [activeYear,setActiveYear]=useState(year);
  useEffect(()=>{
    if (!teacher) return;
    let cancelled=false;
    fetch('/api/academic-years',{headers:authHeaders(teacher)}).then(r=>{
      if(!r.ok)throw new Error('Academic year could not be loaded.'); return r.json();
    }).then((rows:AcademicYear[])=>{
      if(cancelled)return;
      const active=rows.find(row=>row.status==='active')?.year || Number(schoolToday().slice(0,4));
      setYears(rows);setActiveYear(active);setYear(active);setClassName('all');
    }).catch(()=>undefined);
    return()=>{cancelled=true;};
  },[teacher?.username,teacher?.authToken]);
  return {year,term,className,activeYear,years,setYear,setTerm,setClassName};
}

export function ScopeFilters({classes}:{classes:readonly ClassName[]}) {
  const scope=useSchoolScope();
  const years=[...new Set([scope.activeYear,scope.year,...scope.years.map(y=>y.year)])].sort((a,b)=>b-a);
  return <div className="scope-filters no-print flex flex-wrap items-end gap-3 border-b border-slate-200 bg-white px-5 py-3">
    <span className="mr-auto self-center text-sm font-semibold text-slate-600">School workspace</span>
    <label className="text-xs text-slate-600">Academic year<select aria-label="Workspace academic year" value={scope.year} onChange={e=>scope.setYear(Number(e.target.value))} className="scope-select">{years.map(year=><option key={year} value={year}>{year}{year===scope.activeYear?' · active':''}</option>)}</select></label>
    <label className="text-xs text-slate-600">Term<select aria-label="Workspace term" value={scope.term} onChange={e=>scope.setTerm(Number(e.target.value) as 1|2|3)} className="scope-select">{[1,2,3].map(t=><option key={t} value={t}>Term {t}</option>)}</select></label>
    <label className="text-xs text-slate-600">Class<select aria-label="Workspace class" value={scope.className} onChange={e=>scope.setClassName(e.target.value as ClassName|'all')} className="scope-select"><option value="all">All assigned classes</option>{classes.map(c=><option key={c}>{c}</option>)}</select></label>
  </div>;
}
