import { useState } from 'react';
import { 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Printer, 
  Calendar, 
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { Student, Mark } from '../types';

interface GraduationListProps {
  students: Student[];
  marks: Mark[];
}

export default function GraduationList({ students, marks }: GraduationListProps) {
  // P.7 Students are candidates for graduation
  const candidates = students.filter(s => s.className === 'P.7');
  
  const subjects = ['Mathematics', 'English', 'Science', 'Social Studies', 'Religious Education'];

  // Helper to compute eligibility for a student
  const checkEligibility = (student: Student) => {
    const studentMarks = marks.filter(m => m.studentId === student.id && m.term === 1 && m.year === 2026);
    
    // Check if they have marks for all 5 subjects
    const missingSubjects: string[] = [];
    subjects.forEach(sub => {
      const hasMark = studentMarks.some(m => m.subject === sub);
      if (!hasMark) {
        missingSubjects.push(sub);
      }
    });

    const isComplete = missingSubjects.length === 0;

    // Calculate Average Score and Division
    let averageScore = 0;
    let division = 'Division U';
    let isPassing = false;

    if (studentMarks.length > 0) {
      const totalScore = studentMarks.reduce((sum, m) => sum + m.score, 0);
      averageScore = Math.round(totalScore / studentMarks.length);

      // Ugandan grading aggregate check
      const getPoints = (score: number) => {
        if (score >= 90) return 1;
        if (score >= 80) return 2;
        if (score >= 70) return 3;
        if (score >= 60) return 4;
        if (score >= 55) return 5;
        if (score >= 50) return 6;
        if (score >= 45) return 7;
        if (score >= 40) return 8;
        return 9;
      };

      const sumPoints = studentMarks.reduce((sum, m) => sum + getPoints(m.score), 0);
      const avgPoints = sumPoints / studentMarks.length;

      if (avgPoints <= 8.0) {
        division = avgPoints <= 2.2 ? 'Division I' : 
                   avgPoints <= 4.8 ? 'Division II' : 
                   avgPoints <= 6.8 ? 'Division III' : 'Division IV';
        isPassing = true;
      }
    }

    let status = 'Incomplete'; // Eligible, Failed, Incomplete
    if (isComplete) {
      status = isPassing ? 'Eligible' : 'Failed';
    }

    return {
      student,
      studentMarks,
      missingSubjects,
      isComplete,
      averageScore,
      division,
      isPassing,
      status
    };
  };

  const compiledCandidates = candidates.map(checkEligibility);

  // Statistics
  const totalCount = compiledCandidates.length;
  const eligibleCount = compiledCandidates.filter(c => c.status === 'Eligible').length;
  const failedCount = compiledCandidates.filter(c => c.status === 'Failed').length;
  const incompleteCount = compiledCandidates.filter(c => c.status === 'Incomplete').length;

  const eligiblePercent = totalCount > 0 ? Math.round((eligibleCount / totalCount) * 100) : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="graduation_view" className="p-8 space-y-6 font-sans max-w-7xl mx-auto">
      
      {/* Header - Hidden in Print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-150 pb-5 no-print">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-800">P.7 Primary Leaving Graduation</h1>
          <p className="text-xs text-slate-400 mt-1">Audit academic criteria for Class P.7 pupil graduation eligibility</p>
        </div>

        <button
          onClick={handlePrint}
          disabled={candidates.length === 0}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 text-xs"
        >
          <Printer className="h-4 w-4" />
          <span>Print Graduation List</span>
        </button>
      </div>

      {/* Audit Stats Bento Row - Hidden in Print */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 no-print">
        {/* Total Candidates */}
        <div className="bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-400 shadow-sm flex items-center justify-between transition-all">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Candidates</span>
            <span className="text-2xl font-black text-slate-800 block">{totalCount}</span>
            <span className="text-[10px] text-slate-500 font-medium block">Active Class P.7</span>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl">
            <GraduationCap className="h-5 w-5" />
          </div>
        </div>

        {/* Eligible for Graduation */}
        <div className="bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-400 shadow-sm flex items-center justify-between transition-all">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Eligible Graduates</span>
            <span className="text-2xl font-black text-emerald-600 block">{eligibleCount}</span>
            <span className="text-[10px] text-emerald-600 font-semibold block">{eligiblePercent}% of candidates</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Assessment Incomplete */}
        <div className="bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-400 shadow-sm flex items-center justify-between transition-all">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Assessments Pending</span>
            <span className="text-2xl font-black text-amber-600 block">{incompleteCount}</span>
            <span className="text-[10px] text-amber-500 font-medium block">Missing terminal marks</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        {/* Remedial / Failures */}
        <div className="bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-400 shadow-sm flex items-center justify-between transition-all">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Remedial Required</span>
            <span className="text-2xl font-black text-red-600 block">{failedCount}</span>
            <span className="text-[10px] text-red-500 font-medium block">Ungraded (Division U)</span>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
            <XCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Graduation Auditing Ledger Table */}
      {candidates.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-transparent hover:border-indigo-400 py-20 text-center shadow-sm transition-all">
          <HelpCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-600 font-bold text-sm">No P.7 Students Registered</h3>
          <p className="text-slate-400 text-xs mt-1">Please add students to Class P.7 in the Student Database tab first.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-transparent hover:border-indigo-400 shadow-sm overflow-hidden transition-all print:border-none print:shadow-none">
          {/* Printable Document Title */}
          <div className="hidden print:block text-center space-y-2 border-b-2 border-slate-900 pb-5 mb-6 p-6">
            <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono">CONFIDENTIAL LEDGER</div>
            <h2 className="font-display font-extrabold text-2xl text-slate-900 uppercase">NANSANA EDUCATION ORGANISATION</h2>
            <h3 className="text-sm text-slate-700 font-bold uppercase tracking-wider font-mono">PRIMARY LEAVING EXAMINATIONS GRADUATION ELIGIBILITY LIST</h3>
            <p className="text-xs text-slate-500 font-light font-mono">ACADEMIC YEAR: 2026 | TERM: TERM 1 OFFICIAL LEVIES AUDIT</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-500 border-b-2 border-slate-900 uppercase tracking-wider font-mono print:bg-slate-100">
                  <th className="px-6 py-4">Pupil Profile</th>
                  <th className="px-6 py-4">Nansana Residence</th>
                  <th className="px-6 py-4 text-center">Subject Audit</th>
                  <th className="px-6 py-4 text-center">Average Score</th>
                  <th className="px-6 py-4 text-center">Ugandan Division</th>
                  <th className="px-6 py-4 text-center">Graduation Eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-sans">
                {compiledCandidates.map(({ student, missingSubjects, isComplete, averageScore, division, isPassing, status }) => (
                  <tr key={student.id} className="hover:bg-slate-50/40 transition-colors print:hover:bg-white">
                    {/* Pupil Profile */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-slate-100 rounded-lg shrink-0 overflow-hidden border border-slate-100 print:hidden">
                          {student.photo ? (
                            <img src={student.photo} alt="Student" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-indigo-50 text-indigo-600 text-[11px] font-bold">
                              {student.surname[0]}{student.otherNames[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <strong className="text-slate-800 block uppercase">
                            {student.surname} {student.otherNames}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            ID: {student.id} | {student.gender}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Zone */}
                    <td className="px-6 py-4 font-medium text-slate-700">{student.zoneInNansana} Zone</td>

                    {/* Subject Audit Checkbox details */}
                    <td className="px-6 py-4">
                      {isComplete ? (
                        <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-semibold">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>All 5 Subjects Assessed</span>
                        </div>
                      ) : (
                        <div className="text-center space-y-1">
                          <div className="inline-flex items-center gap-1.5 text-amber-600 font-semibold">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>Incomplete Marks</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-light leading-snug">
                            Missing: {missingSubjects.join(', ')}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Average score */}
                    <td className="px-6 py-4 text-center font-bold text-slate-800 font-mono text-sm">
                      {isComplete ? `${averageScore}%` : '--'}
                    </td>

                    {/* Division */}
                    <td className="px-6 py-4 text-center">
                      {isComplete ? (
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-extrabold border ${
                          isPassing ? 'bg-emerald-50 text-emerald-700 border-emerald-500/20' : 'bg-red-50 text-red-700 border-red-500/20'
                        }`}>
                          {division}
                        </span>
                      ) : (
                        <span className="text-slate-300">--</span>
                      )}
                    </td>

                    {/* Graduation eligibility */}
                    <td className="px-6 py-4 text-center">
                      {status === 'Eligible' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold uppercase tracking-wider text-[10px]">
                          🎓 Eligible to Graduate
                        </span>
                      )}
                      {status === 'Failed' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full font-bold uppercase tracking-wider text-[10px]">
                          ⚠️ Academic Remedial
                        </span>
                      )}
                      {status === 'Incomplete' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-50 text-slate-400 border border-slate-200 rounded-full font-bold uppercase tracking-wider text-[10px]">
                          📝 Pending Marks
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Printable Signature block */}
          <div className="hidden print:block mt-16 p-6">
            <div className="flex justify-between items-center text-xs">
              <div className="w-48 text-center">
                <div className="border-b border-slate-800 h-8"></div>
                <div className="text-[9px] font-bold text-slate-500 uppercase mt-1 font-mono">Academic Registrar</div>
              </div>
              <div className="border border-dashed border-slate-400 rounded p-4 h-16 w-32 flex items-center justify-center text-[10px] font-bold font-mono text-slate-300">
                OFFICIAL SEAL
              </div>
              <div className="w-48 text-center">
                <div className="border-b border-slate-800 h-8"></div>
                <div className="text-[9px] font-bold text-slate-500 uppercase mt-1 font-mono">Head Teacher Approval</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
