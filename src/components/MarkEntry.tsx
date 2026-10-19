import { useState, useEffect, useMemo } from 'react';
import { BookOpenCheck, CheckCircle, AlertTriangle, HelpCircle, Save, Printer, Send, Lock } from 'lucide-react';
import { Student, Mark, ClassName, Teacher, GradeResult } from '../types';
import { getSubjectsForClass } from '../curriculum';
import AshinagaLogo from './AshinagaLogo';

interface MarkEntryProps {
  students: Student[];
  marks: Mark[];
  onSaveMarks: (marks: Omit<Mark, 'id'>[]) => Promise<void>;
  teacher: Teacher;
  isAdmin: boolean;
}

export default function MarkEntry({ students, marks, onSaveMarks, teacher, isAdmin }: MarkEntryProps) {
  // Available classes for active teacher
  const classesList: ClassName[] = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];
  const filteredClasses = isAdmin
    ? classesList
    : teacher.assignments?.length
      ? [...new Set(teacher.assignments.map(item => item.className))]
      : teacher.classes;

  // Selected parameters
  const [selectedClass, setSelectedClass] = useState<ClassName>(filteredClasses[0] || 'P.1');
  const filteredSubjects = useMemo(
    () => getSubjectsForClass(selectedClass).filter(subject =>
      isAdmin || (
        teacher.assignments?.length
          ? teacher.assignments.some(item => item.className === selectedClass && item.subject === subject)
          : teacher.subjects.includes(subject)
      )
    ),
    [selectedClass, isAdmin, teacher.subjects, teacher.assignments]
  );
  const [selectedSubject, setSelectedSubject] = useState<string>('Mathematics');
  const allowedTerms: (1 | 2 | 3)[] = isAdmin
    ? [1, 2, 3]
    : teacher.assignments?.find(item => item.className === selectedClass && item.subject === selectedSubject)?.activeTerms
      || teacher.activeTerms
      || [1, 2, 3];
  const [selectedTerm, setSelectedTerm] = useState<1 | 2 | 3>(allowedTerms[0] || 1);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [assessmentSettings, setAssessmentSettings] = useState({
    botWeight: 20,
    motWeight: 30,
    eotWeight: 50,
    maximumScore: 100,
    gradingBoundaries: { D1: 80, D2: 75, C3: 70, C4: 65, C5: 60, C6: 50, P7: 45, P8: 35 } as Record<string, number>
  });
  const [completeness, setCompleteness] = useState<any>(null);
  const isLocked = !isAdmin && ['submitted', 'approved'].includes(completeness?.submission?.status);

  useEffect(() => {
    fetch('/api/assessment-settings', { headers: { Authorization: `Bearer ${teacher.authToken || ''}` } })
      .then(response => response.ok ? response.json() : null)
      .then(settings => {
        if (settings) setAssessmentSettings({
          botWeight: Number(settings.bot_weight ?? 20),
          motWeight: Number(settings.mot_weight ?? 30),
          eotWeight: Number(settings.eot_weight ?? 50),
          maximumScore: Number(settings.maximum_score ?? 100),
          gradingBoundaries: JSON.parse(settings.grading_boundaries || '{}')
        });
      })
      .catch(() => undefined);
  }, [teacher.authToken]);

  const loadCompleteness = async () => {
    if (!selectedClass || !selectedSubject) return;
    const params = new URLSearchParams({
      className: selectedClass,
      subject: selectedSubject,
      term: String(selectedTerm),
      year: String(selectedYear)
    });
    const response = await fetch(`/api/marks/completeness?${params}`, {
      headers: { Authorization: `Bearer ${teacher.authToken || ''}` }
    });
    if (response.ok) setCompleteness(await response.json());
  };

  useEffect(() => {
    loadCompleteness().catch(() => undefined);
  }, [selectedClass, selectedSubject, selectedTerm, selectedYear, marks]);

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

  // Buffer score state for editing: { studentId: { bot: string, mot: string, eot: string, score: string } }
  const [scoreInputs, setScoreInputs] = useState<Record<string, { bot: string; mot: string; eot: string; score: string }>>({});
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  // Filter students in the active class
  const classStudents = students.filter(s => s.className === selectedClass);

  // Load saved marks whenever the parameters change
  useEffect(() => {
    const inputs: Record<string, { bot: string; mot: string; eot: string; score: string }> = {};
    classStudents.forEach(student => {
      const savedMark = marks.find(
        m => m.studentId === student.id &&
             m.subject === selectedSubject &&
             m.term === selectedTerm &&
             m.year === selectedYear
      );
      inputs[student.id] = {
        bot: savedMark?.botScore !== undefined ? String(savedMark.botScore) : '',
        mot: savedMark?.motScore !== undefined ? String(savedMark.motScore) : '',
        eot: savedMark?.eotScore !== undefined ? String(savedMark.eotScore) : '',
        score: savedMark ? String(savedMark.score) : ''
      };
    });
    setScoreInputs(inputs);
    setStatusMessage({ type: '', text: '' });
  }, [selectedClass, selectedSubject, selectedTerm, selectedYear, students, marks]);

  // Handle individual exam mark change and auto-compute combined score
  const handleExamChange = (studentId: string, field: 'bot' | 'mot' | 'eot' | 'score', val: string) => {
    if (val === '' || /^\d+$/.test(val)) {
      const num = Number(val);
      if (val === '' || (num >= 0 && num <= assessmentSettings.maximumScore)) {
        setScoreInputs(prev => {
          const current = prev[studentId] || { bot: '', mot: '', eot: '', score: '' };
          const updated = { ...current, [field]: val };

          // If updating BOT, MOT, or EOT, compute weighted final score if available
          if (field !== 'score') {
            const b = updated.bot !== '' ? Number(updated.bot) : null;
            const m = updated.mot !== '' ? Number(updated.mot) : null;
            const e = updated.eot !== '' ? Number(updated.eot) : null;

            if (b !== null || m !== null || e !== null) {
              let weightedSum = 0;
              let totalWeight = 0;
              if (b !== null) { weightedSum += b * (assessmentSettings.botWeight / 100); totalWeight += assessmentSettings.botWeight / 100; }
              if (m !== null) { weightedSum += m * (assessmentSettings.motWeight / 100); totalWeight += assessmentSettings.motWeight / 100; }
              if (e !== null) { weightedSum += e * (assessmentSettings.eotWeight / 100); totalWeight += assessmentSettings.eotWeight / 100; }

              if (totalWeight > 0) {
                // Normalize score to 100% scale
                const computed = Math.round(weightedSum / totalWeight);
                updated.score = String(computed);
              }
            }
          }

          return { ...prev, [studentId]: updated };
        });
      }
    }
  };

  // Grade converter logic (Ugandan system)
  const getGradeInfo = (scoreStr: string): GradeResult => {
    if (!scoreStr) return { grade: 'F9', remark: 'Not Assessed' };
    const score = Number(scoreStr);
    if (isNaN(score)) return { grade: 'F9', remark: 'Invalid' };

    const boundaries = assessmentSettings.gradingBoundaries;
    if (score >= boundaries.D1) return { grade: 'D1', remark: 'Excellent' };
    if (score >= boundaries.D2) return { grade: 'D2', remark: 'Very Good' };
    if (score >= boundaries.C3) return { grade: 'C3', remark: 'Good' };
    if (score >= boundaries.C4) return { grade: 'C4', remark: 'Very Satisfactory' };
    if (score >= boundaries.C5) return { grade: 'C5', remark: 'Satisfactory' };
    if (score >= boundaries.C6) return { grade: 'C6', remark: 'Fair' };
    if (score >= boundaries.P7) return { grade: 'P7', remark: 'Pass' };
    if (score >= boundaries.P8) return { grade: 'P8', remark: 'Weak Pass' };
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
      const studentData = scoreInputs[student.id];
      if (studentData) {
        const { bot, mot, eot, score } = studentData;
        if (score !== '' || bot !== '' || mot !== '' || eot !== '') {
          marksToSave.push({
            studentId: student.id,
            subject: selectedSubject,
            botScore: bot !== '' ? Number(bot) : undefined,
            motScore: mot !== '' ? Number(mot) : undefined,
            eotScore: eot !== '' ? Number(eot) : undefined,
            score: score !== '' ? Number(score) : 0,
            term: selectedTerm,
            year: selectedYear,
            teacherName: teacher.name
          });
        }
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

  const handleSubmitForApproval = async () => {
    setStatusMessage({ type: '', text: '' });
    try {
      const response = await fetch('/api/mark-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacher.authToken || ''}`
        },
        body: JSON.stringify({
          className: selectedClass,
          subject: selectedSubject,
          term: selectedTerm,
          year: selectedYear,
          action: 'submit'
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Submission failed.');
      await loadCompleteness();
      setStatusMessage({ type: 'success', text: 'Mark sheet submitted to the DOS/Headteacher for approval and locked for editing.' });
    } catch (error: any) {
      setStatusMessage({ type: 'error', text: error.message || 'Submission failed.' });
    }
  };

  return (
    <div id="mark_entry_view" className="p-8 space-y-6 font-sans max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-100 pb-5">
        <div className="flex items-center gap-3">
          <AshinagaLogo size={50} className="shrink-0 bg-white p-1 rounded-xl shadow-xs border border-slate-100" />
          <div>
            <h1 className="font-display text-2xl font-black text-slate-800">Teacher Mark Sheet</h1>
            <p className="text-xs text-slate-400 mt-1">Record and grade terminal academic marks directly into the school ledger</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <Printer className="h-4 w-4" />
          Print mark sheet
        </button>
      </div>

      {completeness && (
        <div className="no-print grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Completion</p>
            <p className="mt-1 text-2xl font-black text-indigo-700">{completeness.completionPercent}%</p>
            <p className="text-xs text-slate-500">{completeness.completedStudents} of {completeness.totalStudents} pupils</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Missing marks</p>
            <p className="mt-1 text-2xl font-black text-amber-600">{completeness.missingStudents.length}</p>
            <p className="truncate text-xs text-slate-500">
              {completeness.missingStudents.map((item: any) => item.name).join(', ') || 'No missing pupils'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Workflow status</p>
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-700">
              {['submitted', 'approved'].includes(completeness.submission?.status) && <Lock className="h-3.5 w-3.5" />}
              {completeness.submission?.status || 'draft'}
            </p>
          </div>
        </div>
      )}

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
                  <th className="px-5 py-4">Pupil Profile</th>
                  <th className="px-3 py-4">Residency</th>
                  <th className="px-3 py-4 w-24 text-center">BOT (20%)</th>
                  <th className="px-3 py-4 w-24 text-center">MOT (30%)</th>
                  <th className="px-3 py-4 w-24 text-center">EOT (50%)</th>
                  <th className="px-3 py-4 w-28 text-center font-bold text-indigo-700">Final (%)</th>
                  <th className="px-3 py-4 w-20 text-center">Grade</th>
                  <th className="px-4 py-4">Assessment Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-sans">
                {classStudents.map((student) => {
                  const data = scoreInputs[student.id] || { bot: '', mot: '', eot: '', score: '' };
                  const gradeResult = getGradeInfo(data.score);
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/40 transition-colors">
                      {/* Pupil Profile */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-10 w-10 bg-slate-100 rounded-lg shrink-0 overflow-hidden border border-slate-200 relative">
                            {student.photo ? (
                              <img src={student.photo} alt={student.surname} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex flex-col items-center justify-center bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-200">
                                <span>No</span>
                                <span>Photo</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 block text-xs">
                                {student.surname} {student.otherNames}
                              </span>
                              {!student.photo && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-amber-100 text-amber-800 border border-amber-200" title="Photo Missing">
                                  ⚠️ Photo Missing
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono block">
                              {student.id} | {student.gender}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Residency Zone */}
                      <td className="px-3 py-3.5 text-slate-500 font-medium text-[11px]">{student.zoneInNansana}</td>

                      {/* BOT Score Input (Beginning of Term - 20%) */}
                      <td className="px-3 py-3.5 text-center">
                        <input
                          type="text"
                          placeholder="BOT"
                          maxLength={3}
                          value={data.bot}
                          disabled={isLocked}
                          onChange={(e) => handleExamChange(student.id, 'bot', e.target.value)}
                          className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-center text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 bg-blue-50/30"
                        />
                      </td>

                      {/* MOT Score Input (Middle of Term - 30%) */}
                      <td className="px-3 py-3.5 text-center">
                        <input
                          type="text"
                          placeholder="MOT"
                          maxLength={3}
                          value={data.mot}
                          disabled={isLocked}
                          onChange={(e) => handleExamChange(student.id, 'mot', e.target.value)}
                          className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-center text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 bg-indigo-50/30"
                        />
                      </td>

                      {/* EOT Score Input (End of Term - 50%) */}
                      <td className="px-3 py-3.5 text-center">
                        <input
                          type="text"
                          placeholder="EOT"
                          maxLength={3}
                          value={data.eot}
                          disabled={isLocked}
                          onChange={(e) => handleExamChange(student.id, 'eot', e.target.value)}
                          className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-center text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 bg-amber-50/30"
                        />
                      </td>

                      {/* Combined Final Score */}
                      <td className="px-3 py-3.5 text-center">
                        <input
                          type="text"
                          placeholder="Final"
                          maxLength={3}
                          value={data.score}
                          disabled={isLocked}
                          onChange={(e) => handleExamChange(student.id, 'score', e.target.value)}
                          className="w-16 px-2 py-1 border-2 border-indigo-200 rounded-lg text-center text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-indigo-900 bg-indigo-50/80"
                        />
                      </td>

                      {/* Calculated Grade */}
                      <td className="px-3 py-3.5 text-center">
                        {data.score ? (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold border ${
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
                      <td className="px-4 py-3.5 font-medium">
                        {data.score ? (
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
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
            <p className="text-[11px] text-slate-400">
              *Make sure to click "Save Class Marks Ledger" to commit these entries to the server database.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                id="save_marks_btn"
                onClick={handleBulkSave}
                disabled={saving || isLocked}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold tracking-wide shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : isLocked ? 'Mark Sheet Locked' : 'Save Draft'}</span>
              </button>
              {!isAdmin && (
                <button
                  type="button"
                  onClick={handleSubmitForApproval}
                  disabled={isLocked || completeness?.completionPercent !== 100}
                  className="flex items-center gap-2 rounded-xl bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                  Submit for approval
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
