import { CalendarCheck, ChevronRight, ClipboardCheck, GraduationCap, Users } from 'lucide-react';
import { Mark, Student, Teacher } from '../types';

interface TeacherDashboardProps {
  teacher: Teacher;
  students: Student[];
  marks: Mark[];
  setActiveTab: (tab: string) => void;
}

export default function TeacherDashboard({ teacher, students, marks, setActiveTab }: TeacherDashboardProps) {
  const myStudents = students.filter(student => teacher.classes.includes(student.className));
  const myStudentIds = new Set(myStudents.map(student => student.id));
  const myMarks = marks.filter(mark => myStudentIds.has(mark.studentId) && teacher.subjects.includes(mark.subject));
  const markedStudents = new Set(myMarks.map(mark => mark.studentId)).size;
  const remaining = Math.max(0, myStudents.length - markedStudents);

  return (
    <div className="min-h-full bg-[#f5f7fb] p-6 md:p-9">
      <header className="rounded-[28px] bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-950 p-7 text-white shadow-xl">
        <p className="text-xs font-black uppercase tracking-[.2em] text-indigo-200">Teacher workspace</p>
        <h1 className="mt-2 text-3xl font-black">Welcome back, {teacher.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-indigo-100">
          Your desk is limited to assigned classes and subjects. School administration, staff accounts, backups and global settings remain in the administrator workspace.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {teacher.classes.map(item => <span key={item} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">Class {item}</span>)}
          {teacher.subjects.map(item => <span key={item} className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-100">{item}</span>)}
        </div>
      </header>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'My students', value: myStudents.length, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Assessments recorded', value: myMarks.length, icon: ClipboardCheck, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Students awaiting marks', value: remaining, icon: GraduationCap, color: 'text-amber-600 bg-amber-50' },
          { label: 'Active terms', value: (teacher.activeTerms || [1, 2, 3]).join(', '), icon: CalendarCheck, color: 'text-sky-600 bg-sky-50' }
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></div>
            <p className="mt-4 text-2xl font-black text-slate-900">{value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
          </div>
        ))}
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">My mark sheet</h2>
          <p className="mt-1 text-sm text-slate-500">Open your private grading workspace for assigned classes and subjects.</p>
          <div className="mt-5 space-y-3">
            {[
              { tab: 'marks', title: 'Open my mark sheet', description: 'Record and update marks only for subjects and classes assigned to you', icon: GraduationCap },
              { tab: 'attendance', title: 'Take class attendance', description: 'Record daily attendance for pupils in your assigned classes', icon: CalendarCheck }
            ].map(({ tab, title, description, icon: Icon }) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon className="h-5 w-5" /></span>
                <span className="flex-1"><strong className="block text-sm text-slate-900">{title}</strong><span className="text-xs text-slate-500">{description}</span></span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">My assignment</h2>
          <div className="mt-5 space-y-5">
            <div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Classes</p><p className="mt-2 text-sm font-bold text-slate-700">{teacher.classes.join(' • ') || 'No classes assigned'}</p></div>
            <div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Subjects</p><p className="mt-2 text-sm font-bold text-slate-700">{teacher.subjects.join(' • ') || 'No subjects assigned'}</p></div>
            <div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Signed in as</p><p className="mt-2 text-sm font-bold text-slate-700">{teacher.email}</p></div>
          </div>
        </div>
      </section>
    </div>
  );
}
