import { useState, useEffect } from 'react';
import { BookOpenCheck, CheckCircle, AlertTriangle, HelpCircle, Save } from 'lucide-react';
import { Student, Mark, ClassName, Teacher, GradeResult } from '../types';

interface MarkEntryProps {
  students: Student[];
  marks: Mark[];
  onSaveMarks: (marks: Omit<Mark, 'id'>[]) => Promise<void>;
  teacher: Teacher;
  isAdmin: boolean;
}

const SUBJECT_LIST = [
  'Mathematics', 
  'English', 
  'Science', 
  'Social Studies', 
  'Religious Education'
];

export default function MarkEntry({ students, marks, onSaveMarks, teacher, isAdmin }: MarkEntryProps) {
  // Available classes for active teacher
  const classesList: ClassName[] = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];
  const filteredClasses = isAdmin ? classesList : teacher.classes;
  const filteredSubjects = isAdmin ? SUBJECT_LIST : teacher.subjects;
  const allowedTerms: (1 | 2 | 3)[] = isAdmin ? [1, 2, 3] : (teacher.activeTerms || [1, 2, 3]);

  // Selected parameters
  const [selectedClass, setSelectedClass] = useState<ClassName>(filteredClasses[0] || 'P.1');
  const [selectedSubject, setSelectedSubject] = useState<string>(filteredSubjects[0] || 'Mathematics');
  const [selectedTerm, setSelectedTerm] = useState<1 | 2 | 3>(allowedTerms[0] || 1);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Synchronize selection with allowed permissions if they change
  useEffect(() => {
    if (filteredClasses.length > 0 && !filteredClasses.includes(selectedClass)) {
      setSelectedClass(filteredClasses[0]);
    }
    if (filteredSubjects.length > 0 && !filteredSubjects.includes(selectedSubject)) {
      setSelectedSubject(filteredSubjects[0]);
    }
    if (allowedTerms.length > 0 && !allowedTerms.includes(selectedTerm)) {
      setSelectedTerm(allowedTerms[0]);
    }
  }, [teacher, filteredClasses, filteredSubjects, allowedTerms]);

  // Buffer score state for editing
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  // Filter students in the active class
  const classStudents = students.filter(s => s.className === selectedClass);

  // Load saved marks whenever the parameters change
  useEffect(() => {
    const inputs: Record<string, string> = {};
    classStudents.forEach(student => {
      const savedMark = marks.find(
        m => m.studentId === student.id &&
             m.subject === selectedSubject &&
             m.term === selectedTerm &&
             m.year === selectedYear
      );
      inputs[student.id] = savedMark ? String(savedMark.score) : '';
    });
    setScoreInputs(inputs);
    setStatusMessage({ type: '', text: '' });
  }, [selectedClass, selectedSubject, selectedTerm, selectedYear, students, marks]);

  // Handle score change
  const handleScoreChange = (studentId: string, val: string) => {
    // Basic sanitization: only allow digits or empty string
    if (val === '' || /^\d+$/.test(val)) {
      const num = Number(val);
      if (val === '' || (num >= 0 && num <= 100)) {
        setScoreInputs(prev => ({ ...prev, [studentId]: val }));
      }
    }
  };

  // Grade converter logic (Ugandan system)
  const getGradeInfo = (scoreStr: string): GradeResult => {
    if (!scoreStr) return { grade: 'F9', remark: 'Not Assessed' };
    const score = Number(scoreStr);
    if (isNaN(score)) return { grade: 'F9', remark: 'Invalid' };

    if (score >= 90) return { grade: 'D1', remark: 'Excellent' };
    if (score >= 80) return { grade: 'D2', remark: 'Very Good' };
    if (score >= 70) return { grade: 'C3', remark: 'Good' };
    if (score >= 60) return { grade: 'C4', remark: 'Very Satisfactory' };
    if (score >= 55) return { grade: 'C5', remark: 'Satisfactory' };
    if (score >= 50) return { grade: 'C6', remark: 'Fair' };
    if (score >= 45) return { grade: 'P7', remark: 'Pass' };
    if (score >= 40) return { grade: 'P8', remark: 'Weak Pass' };
    return { grade: 'F9', remark: 'Fail' };
  };

  const handleBulkSave = async () => {
    setSaving(true);
    setStatusMessage({ type: '', text: '' });

    // Client-side Subject-Locked validation checks
    if (!isAdmin) {
      if (!filteredClasses.includes(selectedClass)) {
        setStatusMessage({ type: 'error', text: `Access Denied: Grade ${selectedClass} is not assigned to your account.` });
        setSaving(false);
        return;
      }
      if (!filteredSubjects.includes(selectedSubject)) {
        setStatusMessage({ type: 'error', text: `Access Denied: Subject ${selectedSubject} is not assigned to your account.` });
        setSaving(false);
        return;
      }
      if (!allowedTerms.includes(selectedTerm)) {
        setStatusMessage({ type: 'error', text: `Access Denied: Term ${selectedTerm} is not currently active/unlocked for your account.` });
        setSaving(false);
        return;
      }
    }

    // Prepare list of marks to save
    const marksToSave: Omit<Mark, 'id'>[] = [];

    for (const student of classStudents) {
      const scoreStr = scoreInputs[student.id];
      if (scoreStr !== '' && scoreStr !== undefined) {
        marksToSave.push({
          studentId: student.id,
          subject: selectedSubject,
          score: Number(scoreStr),
          term: selectedTerm,
          year: selectedYear,
          teacherName: teacher.name
        });
      }
    }

    if (marksToSave.length === 0) {
      setStatusMessage({ type: 'warning', text: 'No marks entered to save.' });
      setSaving(false);
      return;
    }

    try {
      await onSaveMarks(marksToSave);
      setStatusMessage({ type: 'success', text: `Successfully updated ${marksToSave.length} marks for Class ${selectedClass}!` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to save marks. Please check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="mark_entry_view" className="p-8 space-y-6 font-sans max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-100 pb-5">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-800">Teacher Mark Sheet</h1>
          <p className="text-xs text-slate-400 mt-1">Record and grade terminal academic marks directly into the school ledger</p>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-indigo-50 border border-indigo-200/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div>
            <span className="font-extrabold text-[#032b5e] block flex items-center gap-1.5">
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
              🔒 Active Focused Access: {teacher.name}
            </span>
            <span className="text-slate-500 font-medium block mt-0.5">Your workspace is dynamically focused to let you concentrate exclusively on your assigned exams.</span>
          </div>
          <div className="flex flex-wrap gap-1.5 self-start sm:self-center">
            {teacher.classes.map(c => (
              <span key={c} className="px-2.5 py-0.5 bg-indigo-100/60 text-indigo-800 font-bold text-[10px] rounded-lg border border-indigo-200/30">Class {c}</span>
            ))}
            {teacher.subjects.map(s => (
              <span key={s} className="px-2.5 py-0.5 bg-blue-100/60 text-blue-800 font-bold text-[10px] rounded-lg border border-blue-200/30">{s}</span>
            ))}
            {allowedTerms.map(t => (
              <span key={t} className="px-2.5 py-0.5 bg-purple-100/60 text-purple-800 font-bold text-[10px] rounded-lg border border-purple-200/30">Term {t} Active</span>
            ))}
          </div>
        </div>
      )}

      {/* Grid parameter selector */}
      <div className="bg-slate-100/80 border border-slate-200/60 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-sm">
        {/* Class selection */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Class Level</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value as ClassName)}
            className="w-full px-3.5 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-semibold"
          >
            {filteredClasses.length === 0 ? (
              <option value="">No authorized classes</option>
            ) : (
              filteredClasses.map(c => (
                <option key={c} value={c}>Class {c}</option>
              ))
            )}
          </select>
        </div>

        {/* Subject selection */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Academic Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3.5 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-semibold"
          >
            {filteredSubjects.length === 0 ? (
              <option value="">No authorized subjects</option>
            ) : (
              filteredSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))
            )}
          </select>
        </div>

        {/* Term Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">School Term</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(Number(e.target.value) as any)}
            className="w-full px-3.5 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-semibold"
          >
            {allowedTerms.length === 0 ? (
              <option value="">No authorized terms</option>
            ) : (
              allowedTerms.map(term => (
                <option key={term} value={term}>Term {term}</option>
              ))
            )}
          </select>
        </div>

        {/* Year Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Academic Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-semibold"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
        </div>
      </div>

      {/* Save success or error banner */}
      {statusMessage.text && (
        <div className={`p-4 rounded-2xl border-2 flex items-start gap-3.5 text-xs font-bold animate-fade-in ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-500/20' :
          statusMessage.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-500/20' :
          'bg-red-50 text-red-800 border-red-500/20'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Mark Sheet Ledger */}
      {classStudents.length === 0 ? (
        <div className="bg-slate-50 text-center py-16 rounded-2xl border border-dashed border-slate-200">
          <HelpCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-600 font-bold text-sm">No Pupils in Class {selectedClass}</h3>
          <p className="text-slate-400 text-xs mt-1">Please add students to this class in the Student Database tab first.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-transparent hover:border-indigo-400 shadow-sm overflow-hidden space-y-4 transition-all">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50/75 text-xs font-semibold text-slate-500 border-b border-slate-100 uppercase tracking-wider font-sans">
                  <th className="px-6 py-4">Pupil Profile</th>
                  <th className="px-6 py-4">Residency Zone</th>
                  <th className="px-6 py-4">Sponsorship</th>
                  <th className="px-6 py-4 w-36">Score (%)</th>
                  <th className="px-6 py-4 w-28 text-center">Grade</th>
                  <th className="px-6 py-4">Term Assessment Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-sans">
                {classStudents.map((student) => {
                  const val = scoreInputs[student.id] || '';
                  const gradeResult = getGradeInfo(val);
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/40 transition-colors">
                      {/* Pupil Profile */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-slate-100 rounded-lg shrink-0 overflow-hidden border border-slate-100">
                            {student.photo ? (
                              <img src={student.photo} alt="Student" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-indigo-50 text-indigo-600 text-[11px] font-bold">
                                {student.surname[0]}{student.otherNames[0]}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block">
                              {student.surname} {student.otherNames}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              ID: {student.id} | {student.gender}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Residency Zone */}
                      <td className="px-6 py-4 text-slate-500 font-medium">{student.zoneInNansana}</td>

                      {/* Sponsorship status */}
                      <td className="px-6 py-4">
                        {student.hasScholarship ? (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 rounded-full font-bold text-[9px] uppercase border border-amber-500/20">
                            Scholarship
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium text-[9px] uppercase">
                            Self-Pay
                          </span>
                        )}
                      </td>

                      {/* Score Input Box */}
                      <td className="px-6 py-4">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="--"
                            maxLength={3}
                            value={val}
                            onChange={(e) => handleScoreChange(student.id, e.target.value)}
                            className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-center text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-300"
                          />
                          <span className="absolute right-3.5 top-2 text-slate-400 font-mono text-[10px] select-none">%</span>
                        </div>
                      </td>

                      {/* Calculated Grade */}
                      <td className="px-6 py-4 text-center">
                        {val ? (
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-extrabold border ${
                            gradeResult.grade.startsWith('D') ? 'bg-emerald-50 text-emerald-700 border-emerald-500/20' :
                            gradeResult.grade.startsWith('C') ? 'bg-indigo-50 text-indigo-700 border-indigo-500/20' :
                            gradeResult.grade.startsWith('P') ? 'bg-amber-50 text-amber-700 border-amber-500/20' :
                            'bg-red-50 text-red-700 border-red-500/20'
                          }`}>
                            {gradeResult.grade}
                          </span>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>

                      {/* Realtime Assessment Remark */}
                      <td className="px-6 py-4 font-medium">
                        {val ? (
                          <span className={`${
                            gradeResult.grade.startsWith('D') ? 'text-emerald-600' :
                            gradeResult.grade.startsWith('C') ? 'text-indigo-600' :
                            gradeResult.grade.startsWith('P') ? 'text-amber-600' :
                            'text-red-500 font-bold'
                          }`}>
                            {gradeResult.remark}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic font-light">No mark entered</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer action */}
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-4">
            <p className="text-[11px] text-slate-400">
              *Make sure to click "Save Class Marks Ledger" to commit these entries to the server database.
            </p>
            <button
              id="save_marks_btn"
              onClick={handleBulkSave}
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold tracking-wide shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Class Marks Ledger'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
