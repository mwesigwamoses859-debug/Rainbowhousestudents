import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  BookOpen, 
  Sparkles, 
  ShieldAlert, 
  KeyRound, 
  CheckSquare, 
  Square
} from 'lucide-react';
import { Teacher, ClassName } from '../types';
import AshinagaLogo from './AshinagaLogo';

interface TeacherAssignmentHubProps {
  teachers: Teacher[];
  onAddOrUpdateTeacher: (teacherData: any) => Promise<void>;
  onDeleteTeacher: (username: string) => Promise<void>;
  currentTeacher: Teacher;
  isAdmin: boolean;
}

const SUBJECT_LIST = [
  'Mathematics', 
  'English', 
  'Science', 
  'Social Studies', 
  'Religious Education'
];

const CLASSES_LIST: ClassName[] = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];

export default function TeacherAssignmentHub({
  teachers,
  onAddOrUpdateTeacher,
  onDeleteTeacher,
  currentTeacher,
  isAdmin
}: TeacherAssignmentHubProps) {
  // Modal / Form state
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  
  // Input states
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<ClassName[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<(1 | 2 | 3)[]>([1, 2, 3]);
  
  const [status, setStatus] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  // Open form for new teacher
  const handleNewTeacher = () => {
    setEditingTeacher(null);
    setUsername('');
    setName('');
    setPassword('');
    setSelectedSubjects([]);
    setSelectedClasses([]);
    setSelectedTerms([1, 2, 3]);
    setShowForm(true);
    setStatus({ type: '', text: '' });
  };

  // Open form for editing
  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setUsername(teacher.username);
    setName(teacher.name);
    // Cast password safely (it might be defined on the model now)
    setPassword((teacher as any).password || 'teacher123');
    setSelectedSubjects(teacher.subjects);
    setSelectedClasses(teacher.classes);
    setSelectedTerms(teacher.activeTerms || [1, 2, 3]);
    setShowForm(true);
    setStatus({ type: '', text: '' });
  };

  // Toggle subject selection
  const handleToggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(prev => prev.filter(s => s !== subject));
    } else {
      setSelectedSubjects(prev => [...prev, subject]);
    }
  };

  // Toggle class selection
  const handleToggleClass = (className: ClassName) => {
    if (selectedClasses.includes(className)) {
      setSelectedClasses(prev => prev.filter(c => c !== className));
    } else {
      setSelectedClasses(prev => [...prev, className]);
    }
  };

  // Toggle active term selection
  const handleToggleTerm = (term: 1 | 2 | 3) => {
    if (selectedTerms.includes(term)) {
      setSelectedTerms(prev => prev.filter(t => t !== term));
    } else {
      setSelectedTerms(prev => [...prev, term].sort());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) {
      setStatus({ type: 'error', text: 'Username and Full Name are strictly required fields.' });
      return;
    }

    // Check username uniqueness if adding new
    if (!editingTeacher && teachers.some(t => t.username.toLowerCase() === username.trim().toLowerCase())) {
      setStatus({ type: 'error', text: 'This username is already registered. Please choose a unique one.' });
      return;
    }

    setLoading(true);
    try {
      await onAddOrUpdateTeacher({
        username: username.trim(),
        name: name.trim(),
        password: password.trim() || 'teacher123',
        subjects: selectedSubjects,
        classes: selectedClasses,
        activeTerms: selectedTerms
      });
      
      setStatus({ 
        type: 'success', 
        text: editingTeacher 
          ? `Successfully saved subject mappings for ${name}!` 
          : `Teacher profile registered successfully for ${name}!` 
      });
      
      setTimeout(() => {
        setShowForm(false);
        setEditingTeacher(null);
      }, 1500);
    } catch (err) {
      setStatus({ type: 'error', text: 'Operation failed. Check network link and try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="teacher_hub_container" className="p-8 space-y-6 font-sans max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-100 pb-5">
        <div className="flex items-center gap-3">
          <AshinagaLogo size={50} className="shrink-0 bg-white p-1 rounded-xl shadow-xs border border-slate-100" />
          <div>
            <h1 className="font-display text-2xl font-black text-slate-800 flex items-center gap-2.5">
              <span>Teacher Assignments & Subject Controls</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">Assign curriculum instructors to specific subjects and grades to enforce focused grading scopes</p>
          </div>
        </div>

        {isAdmin && !showForm && (
          <button
            onClick={handleNewTeacher}
            className="inline-flex items-center gap-2 bg-[#0b2d59] hover:bg-[#1c3f6e] text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 cursor-pointer text-xs"
          >
            <UserPlus className="h-4 w-4" />
            <span>Register New Instructor</span>
          </button>
        )}
      </div>

      {/* Access Denied / SafeGuard Panel for general teachers */}
      {!isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-sky-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Your Active Assignment</h3>
              <p className="text-xs text-slate-400 mt-1">Below are the specific class levels and subjects you are currently authorized to enter marks for.</p>
            </div>
            <div className="space-y-2 border-t border-slate-50 pt-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Authorized Subjects</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentTeacher.subjects.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No subjects assigned</span>
                  ) : (
                    currentTeacher.subjects.map(s => (
                      <span key={s} className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-lg border border-blue-200/20">
                        {s}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Authorized Grades</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentTeacher.classes.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No classes assigned</span>
                  ) : (
                    currentTeacher.classes.map(c => (
                      <span key={c} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-lg border border-emerald-200/20">
                        Class {c}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 bg-slate-50 p-8 rounded-3xl border border-slate-150 flex flex-col items-center justify-center text-center space-y-3">
            <ShieldAlert className="h-10 w-10 text-slate-400" />
            <h4 className="font-bold text-slate-700 text-sm">Instructor Access Mode</h4>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              To guarantee school grade ledger accuracy and meet National EMIS requirements, only the Headteacher / Administrator can modify instructor curriculum roles and credential profiles. If you need additions to your assigned subjects or grades, please contact the administrator desk.
            </p>
          </div>
        </div>
      )}

      {/* Editor Form Modal or Block */}
      {isAdmin && showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-lg max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <h3 className="text-base font-extrabold text-[#032b5e]">
              {editingTeacher ? `Configure Assignment: ${editingTeacher.name}` : 'Register New Curriculum Instructor'}
            </h3>
            <button 
              onClick={() => setShowForm(false)}
              className="p-1 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-700"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {status.text && (
              <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-bold ${
                status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-500/20' : 'bg-red-50 text-red-800 border-red-500/20'
              }`}>
                {status.type === 'success' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-red-600" />}
                <span>{status.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Username (cannot be changed if editing) */}
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  placeholder="e.g. teacher3"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                  disabled={!!editingTeacher}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                  <KeyRound className="h-3 w-3" />
                  <span>Access Password</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. teacher123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                />
              </div>

              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-wider">Full Instructor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Madam Florence Namatovu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Subject Multi-Select (Grid checkbox blocks) */}
            <div>
              <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                <span>Assigned Curriculum Subjects</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {SUBJECT_LIST.map(subject => {
                  const isChecked = selectedSubjects.includes(subject);
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => handleToggleSubject(subject)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all text-xs font-semibold cursor-pointer ${
                        isChecked 
                          ? 'bg-blue-50/50 border-blue-400 text-blue-900 shadow-sm' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="h-4.5 w-4.5 text-blue-600" /> : <Square className="h-4.5 w-4.5 text-slate-300" />}
                      <span>{subject}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Class Multi-Select (Grid Checkbox blocks) */}
            <div>
              <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-emerald-500" />
                <span>Assigned Class Levels</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {CLASSES_LIST.map(className => {
                  const isChecked = selectedClasses.includes(className);
                  return (
                    <button
                      key={className}
                      type="button"
                      onClick={() => handleToggleClass(className)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-xs font-bold cursor-pointer h-16 ${
                        isChecked 
                          ? 'bg-emerald-50/50 border-emerald-400 text-emerald-900 shadow-sm' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span className="text-[10px] opacity-60">Grade</span>
                      <span className="text-sm font-extrabold mt-0.5">{className}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Authorized Terms Selection */}
            <div>
              <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-[#032b5e]" />
                <span>Authorized Active Terms (Subject-Locked Mark Entry)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {([1, 2, 3] as const).map(term => {
                  const isChecked = selectedTerms.includes(term);
                  return (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleToggleTerm(term)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all text-xs font-semibold cursor-pointer ${
                        isChecked 
                          ? 'bg-indigo-50/50 border-indigo-400 text-indigo-900 shadow-sm' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="h-4.5 w-4.5 text-indigo-600" /> : <Square className="h-4.5 w-4.5 text-slate-300" />}
                      <span>Term {term}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">Selected terms define which school terms this teacher is authorized to enter marks for, preventing unauthorized data modification during closed evaluation periods.</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 bg-[#0b2d59] hover:bg-[#1c3f6e] text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 cursor-pointer text-xs disabled:opacity-50"
              >
                <span>{loading ? 'Saving...' : 'Save Assignments'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teachers List View for Admin */}
      {isAdmin && !showForm && (
        <div className="backdrop-blur-md bg-white/70 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative z-10">
          <div className="p-5 border-b border-slate-100/80">
            <h3 className="text-sm font-bold text-[#032b5e]">Registered Curriculum Personnel</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-100 uppercase tracking-wider">
                  <th className="px-6 py-4">Full Instructor Details</th>
                  <th className="px-6 py-4">Auth Username</th>
                  <th className="px-6 py-4">Assigned Subjects</th>
                  <th className="px-6 py-4">Assigned Grades</th>
                  <th className="px-6 py-4">Active Terms</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">No curriculum personnel recorded.</td>
                  </tr>
                ) : (
                  teachers.map(teacher => (
                    <tr key={teacher.username} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <strong className="text-slate-800 text-sm block">{teacher.name}</strong>
                          {teacher.username === 'admin' && (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-bold text-[9px] uppercase border border-indigo-500/20 mt-1 inline-block">
                              Super Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500 font-semibold">{teacher.username}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {teacher.username === 'admin' ? (
                            <span className="text-xs text-indigo-600 font-bold italic">All Subjects (Global Access)</span>
                          ) : teacher.subjects.length === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">No subjects assigned</span>
                          ) : (
                            teacher.subjects.map(s => (
                              <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-md border border-blue-200/20">
                                {s}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {teacher.username === 'admin' ? (
                            <span className="text-xs text-emerald-600 font-bold italic">All Grades (Global Access)</span>
                          ) : teacher.classes.length === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">No grades assigned</span>
                          ) : (
                            teacher.classes.map(c => (
                              <span key={c} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-md border border-emerald-200/20">
                                {c}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {teacher.username === 'admin' ? (
                            <span className="text-xs text-[#032b5e] font-bold italic">All Terms (Global Access)</span>
                          ) : !teacher.activeTerms || teacher.activeTerms.length === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">No terms active</span>
                          ) : (
                            teacher.activeTerms.map(t => (
                              <span key={t} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-md border border-indigo-200/20">
                                Term {t}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => handleEditTeacher(teacher)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            title="Edit Assignment"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          
                          {teacher.username !== 'admin' && (
                            <button
                              onClick={() => onDeleteTeacher(teacher.username)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                              title="Delete Teacher"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
