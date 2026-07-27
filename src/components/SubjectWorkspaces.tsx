import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Lock, 
  ShieldAlert, 
  CheckCircle, 
  Save, 
  Users, 
  Award, 
  BarChart2, 
  FileText, 
  Sparkles, 
  Layers, 
  Mail, 
  Check, 
  Calculator,
  Microscope,
  Compass,
  HeartHandshake,
  Info
} from 'lucide-react';
import { Student, Mark, Teacher, ClassName } from '../types';
import { getSubjectsForClass } from '../curriculum';
import AshinagaLogo from './AshinagaLogo';

interface SubjectWorkspacesProps {
  students: Student[];
  marks: Mark[];
  currentTeacher: Teacher;
  teachers: Teacher[];
  onSaveMarks: (updatedMarks: { studentId: string; subject: string; score: number; term: 1 | 2 | 3; year: number; teacherName: string }[]) => Promise<void>;
}

export interface SubjectDef {
  id: string;
  name: string;
  code: string;
  icon: any;
  color: string;
  bgGradient: string;
  description: string;
}

const SUBJECT_LIST: SubjectDef[] = [
  {
    id: 'math',
    name: 'Mathematics',
    code: 'MTC',
    icon: Calculator,
    color: 'text-blue-600 border-blue-200 bg-blue-50',
    bgGradient: 'from-blue-600 to-indigo-800',
    description: 'Numeracy, Problem Solving, Algebra, Geometry, and Business Arithmetic'
  },
  {
    id: 'science',
    name: 'Science',
    code: 'SCI',
    icon: Microscope,
    color: 'text-emerald-600 border-emerald-200 bg-emerald-50',
    bgGradient: 'from-emerald-600 to-teal-800',
    description: 'Integrated Science, Agriculture, Physics, Chemistry, and Health Education'
  },
  {
    id: 'english',
    name: 'English',
    code: 'ENG',
    icon: BookOpen,
    color: 'text-purple-600 border-purple-200 bg-purple-50',
    bgGradient: 'from-purple-600 to-pink-800',
    description: 'Grammar, Comprehension, Vocabulary, Composition, and Literature'
  },
  {
    id: 'sst',
    name: 'Social Studies',
    code: 'SST',
    icon: Compass,
    color: 'text-amber-600 border-amber-200 bg-amber-50',
    bgGradient: 'from-amber-600 to-orange-800',
    description: 'Ugandan History, Geography, Environment, Civics, and Social Welfare'
  },
  {
    id: 're',
    name: 'Religious Education',
    code: 'RE',
    icon: HeartHandshake,
    color: 'text-indigo-600 border-indigo-200 bg-indigo-50',
    bgGradient: 'from-indigo-600 to-blue-950',
    description: 'Christian Religious Education (CRE) & Islamic Religious Education (IRE)'
  },
  { id: 'literacy1', name: 'Literacy 1', code: 'LIT1', icon: BookOpen, color: 'text-cyan-600 border-cyan-200 bg-cyan-50', bgGradient: 'from-cyan-600 to-blue-800', description: 'Foundational language, comprehension, vocabulary, and communication' },
  { id: 'literacy2', name: 'Literacy 2 (Reading and Writing)', code: 'LIT2', icon: FileText, color: 'text-violet-600 border-violet-200 bg-violet-50', bgGradient: 'from-violet-600 to-purple-800', description: 'Reading fluency, handwriting, spelling, and written expression' },
  { id: 'luganda', name: 'Luganda', code: 'LUG', icon: BookOpen, color: 'text-orange-600 border-orange-200 bg-orange-50', bgGradient: 'from-orange-600 to-amber-800', description: 'Luganda language, reading, writing, vocabulary, and oral communication' },
  { id: 'ict', name: 'Computer/ ICT', code: 'ICT', icon: Sparkles, color: 'text-sky-600 border-sky-200 bg-sky-50', bgGradient: 'from-sky-600 to-indigo-800', description: 'Digital literacy, computer skills, responsible technology use, and ICT practice' },
  { id: 'kumon', name: 'KUMON', code: 'KUM', icon: Calculator, color: 'text-rose-600 border-rose-200 bg-rose-50', bgGradient: 'from-rose-600 to-red-800', description: 'Structured individual practice for numeracy and learning fluency' }
];

const ALL_CLASSES: ClassName[] = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];

export default function SubjectWorkspaces({
  students,
  marks,
  currentTeacher,
  teachers,
  onSaveMarks
}: SubjectWorkspacesProps) {
  const [selectedSubject, setSelectedSubject] = useState<SubjectDef>(SUBJECT_LIST[0]);
  const [selectedClass, setSelectedClass] = useState<ClassName>('P.7');
  const [selectedTerm, setSelectedTerm] = useState<1 | 2 | 3>(1);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeTab, setActiveTab] = useState<'marks' | 'syllabus' | 'analytics'>('marks');
  const availableSubjects = SUBJECT_LIST.filter(subject =>
    getSubjectsForClass(selectedClass).includes(subject.name as never)
  );

  useEffect(() => {
    if (!availableSubjects.some(subject => subject.name === selectedSubject.name)) {
      setSelectedSubject(availableSubjects[0]);
    }
  }, [selectedClass]);

  // Mark edit buffers
  const [scoresBuffer, setScoresBuffer] = useState<{ [studentId: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: '', msg: '' });

  // Determine if current teacher is authorized for this subject
  const isHeadteacherOrDos = currentTeacher.role === 'Headteacher' || currentTeacher.role === 'DOS' || currentTeacher.username === 'admin' || currentTeacher.username === 'dos';
  const isAssignedToSubject = isHeadteacherOrDos || currentTeacher.subjects.includes('All') || currentTeacher.subjects.some(s => s.toLowerCase() === selectedSubject.name.toLowerCase() || (selectedSubject.name === 'Science' && s.toLowerCase().includes('science')) || (selectedSubject.name === 'English' && s.toLowerCase().includes('english')));

  // Find responsible teachers for the current selected subject
  const responsibleTeachers = teachers.filter(t => 
    t.role === 'Headteacher' || 
    t.role === 'DOS' || 
    t.username === 'admin' || 
    t.subjects.includes('All') || 
    t.subjects.some(s => s.toLowerCase() === selectedSubject.name.toLowerCase() || (selectedSubject.name === 'Science' && s.toLowerCase().includes('science')) || (selectedSubject.name === 'English' && s.toLowerCase().includes('english')))
  );

  // Load scores into edit buffer when selected class/subject/term changes
  useEffect(() => {
    const classStudents = students.filter(s => s.className === selectedClass);
    const newBuffer: { [studentId: string]: string } = {};

    classStudents.forEach(st => {
      const existingMark = marks.find(m => 
        m.studentId === st.id && 
        (m.subject.toLowerCase() === selectedSubject.name.toLowerCase() || (selectedSubject.name === 'Science' && m.subject.toLowerCase().includes('science'))) && 
        m.term === selectedTerm && 
        m.year === selectedYear
      );
      newBuffer[st.id] = existingMark ? String(existingMark.score) : '';
    });

    setScoresBuffer(newBuffer);
    setSaveStatus({ type: '', msg: '' });
  }, [selectedSubject, selectedClass, selectedTerm, selectedYear, students, marks]);

  const handleScoreChange = (studentId: string, val: string) => {
    // Only numeric or empty
    if (val === '' || (/^\d+$/.test(val) && Number(val) <= 100)) {
      setScoresBuffer(prev => ({ ...prev, [studentId]: val }));
    }
  };

  const handleBatchSaveMarks = async () => {
    if (!isAssignedToSubject) {
      setSaveStatus({ type: 'error', msg: 'Access Denied: You are not authorized to save marks for this subject.' });
      return;
    }

    setIsSaving(true);
    setSaveStatus({ type: '', msg: '' });

    try {
      const classStudents = students.filter(s => s.className === selectedClass);
      const updatedMarksList: { studentId: string; subject: string; score: number; term: 1 | 2 | 3; year: number; teacherName: string }[] = [];

      classStudents.forEach(st => {
        const scoreVal = scoresBuffer[st.id];
        if (scoreVal !== undefined && scoreVal !== '') {
          updatedMarksList.push({
            studentId: st.id,
            subject: selectedSubject.name,
            score: Number(scoreVal),
            term: selectedTerm,
            year: selectedYear,
            teacherName: currentTeacher.name
          });
        }
      });

      if (updatedMarksList.length === 0) {
        setSaveStatus({ type: 'error', msg: 'No marks entered to save.' });
        setIsSaving(false);
        return;
      }

      await onSaveMarks(updatedMarksList);
      setSaveStatus({ type: 'success', msg: `Successfully saved ${updatedMarksList.length} pupil marks for ${selectedSubject.name} (${selectedClass} Term ${selectedTerm})!` });
    } catch (err) {
      setSaveStatus({ type: 'error', msg: 'Failed to save marks. Please check connection.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper for grade calculation
  const getGradeResult = (scoreNum: number) => {
    if (scoreNum >= 80) return { grade: 'D1', remark: 'Distinction 1', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (scoreNum >= 75) return { grade: 'D2', remark: 'Distinction 2', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (scoreNum >= 70) return { grade: 'C3', remark: 'Credit 3', badge: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (scoreNum >= 65) return { grade: 'C4', remark: 'Credit 4', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (scoreNum >= 60) return { grade: 'C5', remark: 'Credit 5', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (scoreNum >= 55) return { grade: 'C6', remark: 'Credit 6', badge: 'bg-indigo-50 text-indigo-600 border-indigo-200' };
    if (scoreNum >= 50) return { grade: 'P7', remark: 'Pass 7', badge: 'bg-amber-50 text-amber-800 border-amber-200' };
    if (scoreNum >= 45) return { grade: 'P8', remark: 'Pass 8', badge: 'bg-amber-100 text-amber-900 border-amber-300' };
    return { grade: 'F9', remark: 'Fail 9', badge: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  const currentClassStudents = students.filter(s => s.className === selectedClass);

  return (
    <div id="subject_workspaces_container" className="p-6 md:p-8 space-y-6 font-sans max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <AshinagaLogo size={56} className="bg-white p-1 rounded-2xl shadow-md shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-200 text-[10px] font-black uppercase tracking-wider rounded-md border border-indigo-400/30">
                  Subject Portals & Workspaces
                </span>
                <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md ${
                  currentTeacher.role === 'Headteacher' ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30' :
                  currentTeacher.role === 'DOS' ? 'bg-indigo-400/30 text-indigo-100 border border-indigo-300/30' :
                  'bg-blue-500/30 text-blue-200 border border-blue-400/30'
                }`}>
                  LoggedIn: {currentTeacher.name} ({currentTeacher.role || 'Subject Teacher'})
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight mt-1">
                Dedicated Subject Workspaces
              </h1>
              <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-xl">
                Each subject features a dedicated workspace restricted to its designated instructor. Headteachers & DOS retain global oversight.
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-xs space-y-1">
            <div className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">Your Official Designation:</div>
            <div className="font-extrabold text-white text-sm">{currentTeacher.name}</div>
            <div className="text-indigo-200 font-mono text-[11px] flex items-center gap-1">
              <Mail className="h-3 w-3 shrink-0" />
              <span>{currentTeacher.email || `${currentTeacher.username}@ashinaga.or.ug`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Navigation Tabs / Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {availableSubjects.map(sub => {
          const IconComp = sub.icon;
          const isSelected = selectedSubject.id === sub.id;
          const isAllowed = isHeadteacherOrDos || currentTeacher.subjects.includes('All') || currentTeacher.subjects.some(s => s.toLowerCase() === sub.name.toLowerCase() || (sub.name === 'Science' && s.toLowerCase().includes('science')) || (sub.name === 'English' && s.toLowerCase().includes('english')));

          return (
            <button
              key={sub.id}
              onClick={() => setSelectedSubject(sub)}
              className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[110px] ${
                isSelected 
                  ? 'bg-slate-900 text-white border-indigo-600 shadow-lg ring-2 ring-indigo-500/30 scale-[1.02]' 
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-indigo-600 text-white' : sub.color}`}>
                  <IconComp className="h-5 w-5" />
                </div>
                {!isAllowed ? (
                  <Lock className="h-4 w-4 text-rose-500 shrink-0" />
                ) : (
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                )}
              </div>

              <div className="mt-2">
                <div className="text-[10px] font-black uppercase opacity-60 font-mono">{sub.code}</div>
                <div className="font-extrabold text-xs leading-snug line-clamp-1">{sub.name}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* MAIN CONTENT AREA FOR SELECTED SUBJECT */}
      {!isAssignedToSubject ? (
        /* LOCK SCREEN FOR UNASSIGNED TEACHERS */
        <div className="bg-white rounded-3xl border-2 border-rose-200 shadow-xl p-8 md:p-12 text-center space-y-6 max-w-3xl mx-auto">
          <div className="w-20 h-20 bg-rose-50 border-2 border-rose-200 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <Lock className="h-10 w-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-widest rounded-full border border-rose-300">
              Access Restricted • Workspace Locked
            </span>
            <h2 className="text-2xl font-black text-slate-900 font-display">
              {selectedSubject.name} Subject Page is Locked
            </h2>
            <p className="text-slate-600 text-xs md:text-sm leading-relaxed max-w-lg mx-auto">
              You are logged in as <strong className="text-slate-900">{currentTeacher.name}</strong> ({currentTeacher.email || currentTeacher.username}). 
              You are not assigned to manage the <strong className="text-indigo-700">{selectedSubject.name}</strong> curriculum workspace.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left space-y-3 max-w-md mx-auto text-xs">
            <div className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <span>Designated Authorized Personnel for {selectedSubject.name}:</span>
            </div>
            <div className="space-y-2">
              {responsibleTeachers.length === 0 ? (
                <div className="text-slate-500 italic">No specific subject teacher assigned yet. Contact Headteacher.</div>
              ) : (
                responsibleTeachers.map(t => (
                  <div key={t.username} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                    <div>
                      <strong className="text-slate-800 block text-xs">{t.name}</strong>
                      <span className="text-slate-400 font-mono text-[10px]">{t.email || `${t.username}@ashinaga.or.ug`}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black rounded uppercase">
                      {t.role || 'Teacher'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            To view or modify marks for {selectedSubject.name}, please log into your designated subject account or ask the Headteacher / DOS.
          </p>
        </div>
      ) : (
        /* UNLOCKED SUBJECT WORKSPACE */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden space-y-6">
          {/* Workspace Header */}
          <div className={`p-6 md:p-8 text-white bg-gradient-to-r ${selectedSubject.bgGradient} flex flex-col md:flex-row md:items-center justify-between gap-6`}>
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl text-white">
                <selectedSubject.icon className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-white/20 text-white font-black text-[10px] rounded-full uppercase tracking-wider">
                    Official Curriculum Subject
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-400 text-slate-950 font-black text-[10px] rounded-full uppercase tracking-wider">
                    Authorized Access Granted
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black font-display mt-1">{selectedSubject.name} Workspace</h2>
                <p className="text-white/80 text-xs mt-1 max-w-xl">{selectedSubject.description}</p>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center bg-black/20 p-1.5 rounded-2xl border border-white/20 gap-1 self-start md:self-auto">
              <button
                onClick={() => setActiveTab('marks')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'marks' ? 'bg-white text-slate-900 shadow-md' : 'text-white/80 hover:text-white'
                }`}
              >
                Marks & Evaluation
              </button>
              <button
                onClick={() => setActiveTab('syllabus')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'syllabus' ? 'bg-white text-slate-900 shadow-md' : 'text-white/80 hover:text-white'
                }`}
              >
                Syllabus Tracker
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'analytics' ? 'bg-white text-slate-900 shadow-md' : 'text-white/80 hover:text-white'
                }`}
              >
                Grade Performance Analytics
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* TAB 1: MARKS ENTRY & EVALUATION */}
            {activeTab === 'marks' && (
              <div className="space-y-6">
                {/* Control Panel Filters */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Class Selector */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Target Class Level</label>
                      <div className="flex flex-wrap gap-1">
                        {ALL_CLASSES.map(cls => (
                          <button
                            key={cls}
                            onClick={() => setSelectedClass(cls)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                              selectedClass === cls 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {cls}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Term Selector */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Evaluation Term</label>
                      <div className="flex gap-1">
                        {([1, 2, 3] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setSelectedTerm(t)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                              selectedTerm === t 
                                ? 'bg-emerald-600 text-white shadow-md' 
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Term {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleBatchSaveMarks}
                    disabled={isSaving || currentClassStudents.length === 0}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSaving ? 'Saving Scores...' : `Save ${selectedSubject.name} Marks`}</span>
                  </button>
                </div>

                {saveStatus.msg && (
                  <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2.5 ${
                    saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-800 border-red-300'
                  }`}>
                    {saveStatus.type === 'success' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-red-600" />}
                    <span>{saveStatus.msg}</span>
                  </div>
                )}

                {/* Marks Roster Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-700">
                    <span className="uppercase tracking-wider">Class Roster: {selectedClass} • {selectedSubject.name} (Term {selectedTerm} {selectedYear})</span>
                    <span className="text-slate-500 font-mono">{currentClassStudents.length} Active Pupils Enrolled</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                          <th className="px-6 py-3">Pupil Name</th>
                          <th className="px-6 py-3">Gender</th>
                          <th className="px-6 py-3">Scholarship</th>
                          <th className="px-6 py-3 w-40">Score (0 - 100)</th>
                          <th className="px-6 py-3">PLE Grade</th>
                          <th className="px-6 py-3">Assessment Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {currentClassStudents.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                              No pupils registered in {selectedClass}. Register pupils in Class Roster.
                            </td>
                          </tr>
                        ) : (
                          currentClassStudents.map(st => {
                            const scoreStr = scoresBuffer[st.id] || '';
                            const scoreNum = scoreStr !== '' ? Number(scoreStr) : null;
                            const gradeRes = scoreNum !== null ? getGradeResult(scoreNum) : null;

                            return (
                              <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-3.5 font-bold text-slate-900">
                                  {st.surname} {st.otherNames}
                                </td>
                                <td className="px-6 py-3.5 text-slate-500">{st.gender}</td>
                                <td className="px-6 py-3.5">
                                  {st.hasScholarship ? (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded uppercase border border-emerald-200">
                                      Scholarship
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">Standard</span>
                                  )}
                                </td>
                                <td className="px-6 py-3.5">
                                  <input
                                    type="text"
                                    placeholder="e.g. 78"
                                    value={scoreStr}
                                    onChange={(e) => handleScoreChange(st.id, e.target.value)}
                                    className="w-28 px-3 py-1.5 border-2 border-slate-200 focus:border-indigo-600 rounded-xl font-mono text-center font-black text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white"
                                  />
                                </td>
                                <td className="px-6 py-3.5">
                                  {gradeRes ? (
                                    <span className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs border ${gradeRes.badge}`}>
                                      {gradeRes.grade}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 font-mono text-xs">--</span>
                                  )}
                                </td>
                                <td className="px-6 py-3.5">
                                  {gradeRes ? (
                                    <span className="font-semibold text-slate-700 text-xs">{gradeRes.remark}</span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">Pending entry</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SYLLABUS TRACKER */}
            {activeTab === 'syllabus' && (
              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <h3 className="font-extrabold text-slate-800 text-sm mb-1 uppercase tracking-wider">
                    UNEB Primary {selectedSubject.name} Curriculum Syllabus Roadmap ({selectedClass})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track lesson plan completion and core competence milestones required for National Examinations.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-xs">Term 1 Curriculum Coverage</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded">100% Complete</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full w-full"></div>
                    </div>
                    <p className="text-[11px] text-slate-500">All core competence units covered and revised for Term 1 examination.</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-xs">Term 2 Curriculum Coverage</span>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded">75% Complete</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full w-3/4"></div>
                    </div>
                    <p className="text-[11px] text-slate-500">Unit 3: Applied concepts and practical exercises currently underway.</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-xs">Term 3 Final Revision</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded">Upcoming</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-amber-400 h-2 rounded-full w-1/4"></div>
                    </div>
                    <p className="text-[11px] text-slate-500">PLE mock examinations and national curriculum past paper drills scheduled.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ANALYTICS & GRADE BREAKDOWN */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrolled Pupils</span>
                    <div className="text-2xl font-black text-slate-900 font-mono">{currentClassStudents.length}</div>
                  </div>

                  <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 text-center space-y-1">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Distinction Rate</span>
                    <div className="text-2xl font-black text-emerald-700 font-mono">
                      {currentClassStudents.length > 0 
                        ? `${Math.round((currentClassStudents.filter(s => Number(scoresBuffer[s.id] || 0) >= 75).length / currentClassStudents.length) * 100)}%`
                        : '0%'}
                    </div>
                  </div>

                  <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200 text-center space-y-1">
                    <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Credit Pass Rate</span>
                    <div className="text-2xl font-black text-blue-700 font-mono">
                      {currentClassStudents.length > 0 
                        ? `${Math.round((currentClassStudents.filter(s => Number(scoresBuffer[s.id] || 0) >= 55).length / currentClassStudents.length) * 100)}%`
                        : '0%'}
                    </div>
                  </div>

                  <div className="bg-purple-50 p-5 rounded-2xl border border-purple-200 text-center space-y-1">
                    <span className="text-[10px] font-black text-purple-800 uppercase tracking-widest">Class Average Score</span>
                    <div className="text-2xl font-black text-purple-700 font-mono">
                      {(() => {
                        const validScores = currentClassStudents
                          .map(s => scoresBuffer[s.id])
                          .filter(val => val !== undefined && val !== '')
                          .map(Number);
                        if (validScores.length === 0) return 'N/A';
                        const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
                        return `${avg.toFixed(1)}%`;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
