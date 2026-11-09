import { Mark, Student, ClassName } from '../types';

export function recordedClass(student:Student,year:number,activeYear:number):ClassName|undefined {
  if(Number(student.yearOfEntry)>year)return undefined;
  return student.classHistory?.[year] || (year===activeYear?student.className:undefined);
}
export function dashboardData(students:Student[],marks:Mark[],attendance:any[],scope:{year:number;term:number;className:string;activeYear:number},date:string) {
  const pupils=students.filter(s=>{const c=recordedClass(s,scope.year,scope.activeYear);return c&&(scope.className==='all'||c===scope.className);});
  const ids=new Set(pupils.map(s=>s.id));
  const scores=marks.filter(m=>ids.has(m.studentId)&&m.year===scope.year&&m.term===scope.term&&Number.isFinite(m.score));
  const today=attendance.filter(a=>ids.has(a.studentId)&&a.date===date);
  const completed=new Set(today.map(a=>a.studentId));
  const incomplete=pupils.filter(s=>!s.photo||!s.guardianName?.trim()||!s.guardianContact?.trim()||!s.dateOfBirth);
  const followUp=pupils.filter(s=>{
    const att=attendance.filter(a=>a.studentId===s.id&&a.date.startsWith(`${scope.year}-`));
    const ms=scores.filter(m=>m.studentId===s.id);
    return (att.length>0&&att.filter(a=>['present','late'].includes(a.status)).length/att.length<.85)||(ms.length>0&&ms.reduce((a,m)=>a+m.score,0)/ms.length<50);
  });
  const trends=[1,2,3].filter(t=>t<=scope.term).map(term=>{
    const rows=marks.filter(m=>ids.has(m.studentId)&&m.year===scope.year&&m.term===term&&Number.isFinite(m.score));
    return {term:`Term ${term}`,average:rows.length?Math.round(rows.reduce((a,m)=>a+m.score,0)/rows.length*10)/10:null,count:rows.length};
  }).filter(t=>t.count>0);
  return {pupils,scores,today,unmarked:pupils.length-completed.size,incomplete,followUp,trends,scholarships:pupils.filter(s=>s.hasScholarship).length};
}
