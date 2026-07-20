import { useState, useEffect } from 'react';
import { Teacher, Student, Mark, ClassName } from './types';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ClassList from './components/ClassList';
import MarkEntry from './components/MarkEntry';
import ReportCardView from './components/ReportCardView';
import GraduationList from './components/GraduationList';
import ExcelUpload from './components/ExcelUpload';
import AttendanceSupport from './components/AttendanceSupport';
import StudentIdCards from './components/StudentIdCards';
import SchoolTimetable from './components/SchoolTimetable';
import TeacherAssignmentHub from './components/TeacherAssignmentHub';
import AutoPromotionEngine from './components/AutoPromotionEngine';
import BackupRecovery from './components/BackupRecovery';
import StudentProfileModal from './components/StudentProfileModal';
import DocumentGenerator from './components/DocumentGenerator';
import AiAssistant from './components/AiAssistant';
import AcademicAnalytics from './components/AcademicAnalytics';
import { 
  ShieldAlert, 
  BookOpen, 
  RefreshCw, 
  LayoutDashboard, 
  Home,
  Users, 
  GraduationCap, 
  FileSpreadsheet, 
  Bell, 
  ChevronDown, 
  Camera, 
  PhoneCall, 
  CheckCircle,
  HelpCircle,
  Calendar,
  Sparkles,
  CreditCard,
  Award,
  UserCheck,
  TrendingUp,
  Database,
  Lock,
  FileText,
  Shield,
  FileKey
} from 'lucide-react';

export default function App() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Secondary sub-tab states for grouped views
  const [studentsSubTab, setStudentsSubTab] = useState<'list' | 'upload'>('list');
  const [academicsSubTab, setAcademicsSubTab] = useState<'marks' | 'timetable' | 'teachers' | 'promotion' | 'analytics'>('marks');
  const [examsSubTab, setExamsSubTab] = useState<'reports' | 'graduation' | 'idcards' | 'docgen'>('reports');
  const [settingsSubTab, setSettingsSubTab] = useState<'upload' | 'backup' | 'audit'>('upload');

  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bell Notifications Dropdown State
  const [showNotifications, setShowNotifications] = useState(false);

  // 360-Degree Profile & Custom Documents state
  const [selectedProfileStudent, setSelectedProfileStudent] = useState<Student | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>('administrator');
  const [auditLogs, setAuditLogs] = useState<any[]>([
    { id: 1, timestamp: '2026-07-17 10:15:30', user: 'Admin Mukasa (administrator)', action: 'Approved Term 2 P.7 Mathematics marks', ip: '192.168.1.14' },
    { id: 2, timestamp: '2026-07-17 09:44:12', user: 'Florence Namatovu (community_worker)', action: 'Registered home visit log for John Mukasa (st-1)', ip: '102.16.88.42' },
    { id: 3, timestamp: '2026-07-16 16:30:00', user: 'Head Teacher Kibirige (head_teacher)', action: 'Generated completion certificates for Class P.7 candidates', ip: '192.168.1.2' },
    { id: 4, timestamp: '2026-07-16 11:22:15', user: 'Bursar Nabakooza (bursar)', action: 'Allocated uniform & school meal support to Patience Atwine (st-6)', ip: '192.168.1.5' },
  ]);

  const addAuditLog = (action: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newLog = {
      id: Date.now(),
      timestamp,
      user: teacher ? `${teacher.name} (${currentRole})` : `Guest (${currentRole})`,
      action,
      ip: '192.168.1.10'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Report Card selection carrier
  const [selectedReportCardStudent, setSelectedReportCardStudent] = useState<Student | null>(null);

  // Load teacher from session or localStorage
  useEffect(() => {
    const savedTeacher = localStorage.getItem('school_sms_teacher');
    if (savedTeacher) {
      try {
        const parsed = JSON.parse(savedTeacher);
        setTeacher(parsed);
        if (parsed.username === 'admin') {
          setCurrentRole('administrator');
        } else {
          setCurrentRole('class_teacher');
        }
      } catch (err) {
        localStorage.removeItem('school_sms_teacher');
      }
    }
  }, []);

  // Fetch student, mark and teacher databases from full-stack API
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [studentsRes, marksRes, teachersRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/marks'),
        fetch('/api/teachers')
      ]);

      if (!studentsRes.ok || !marksRes.ok || !teachersRes.ok) {
        throw new Error('Failed to retrieve student or academic ledger records.');
      }

      const studentsData = await studentsRes.json();
      const marksData = await marksRes.json();
      const teachersData = await teachersRes.json();

      setStudents(studentsData);
      setMarks(marksData);
      setTeachers(teachersData);
    } catch (err) {
      setError('Connection to backend failed. Please check that the server is online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teacher) {
      fetchData();
    }
  }, [teacher]);

  // Auth Handlers
  const handleLoginSuccess = (loggedInTeacher: Teacher) => {
    setTeacher(loggedInTeacher);
    localStorage.setItem('school_sms_teacher', JSON.stringify(loggedInTeacher));
    if (loggedInTeacher.username === 'admin') {
      setCurrentRole('administrator');
    } else {
      setCurrentRole('class_teacher');
    }
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setTeacher(null);
    localStorage.removeItem('school_sms_teacher');
  };

  // Teacher Assignments
  const handleAddOrUpdateTeacher = async (teacherData: any) => {
    try {
      const response = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacherData),
      });

      if (!response.ok) throw new Error();
      
      // Refresh teachers list from server
      const teachersResponse = await fetch('/api/teachers');
      if (teachersResponse.ok) {
        const data = await teachersResponse.json();
        setTeachers(data);
      }
    } catch (err) {
      alert('Failed to register or update teacher.');
      throw err;
    }
  };

  const handleDeleteTeacher = async (username: string) => {
    if (username === 'admin') {
      alert('Cannot delete the administrator account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete teacher "${username}"?`)) {
      return;
    }
    try {
      const response = await fetch(`/api/teachers/${username}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error();
      setTeachers(prev => prev.filter(t => t.username !== username));
    } catch (err) {
      alert('Failed to delete teacher.');
    }
  };

  // Bulk / automatic student promotion
  const handlePromoteStudents = async (promotions: { studentId: string; nextClassName: any }[]) => {
    try {
      const response = await fetch('/api/students/promote-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotions }),
      });

      if (!response.ok) throw new Error();
      
      // Refresh students
      const studentsRes = await fetch('/api/students');
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data);
      }
    } catch (err) {
      alert('Failed to execute student promotions.');
      throw err;
    }
  };

  // Student Transactions
  const handleAddStudent = async (studentData: Omit<Student, 'id'>) => {
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to register student.');
      }
      const addedStudent = await response.json();
      
      setStudents(prev => [...prev, addedStudent]);
    } catch (err: any) {
      alert(err.message || 'Failed to register student. Please try again.');
      throw err;
    }
  };

  const handleUpdateStudent = async (id: string, updatedData: Partial<Student>) => {
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save student details.');
      }
      const updatedStudent = await response.json();

      setStudents(prev => prev.map(s => s.id === id ? updatedStudent : s));
    } catch (err: any) {
      alert(err.message || 'Failed to save student details. Please try again.');
      throw err;
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this pupil? All recorded marks for this student will be permanently removed.')) {
      return;
    }

    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error();

      setStudents(prev => prev.filter(s => s.id !== id));
      setMarks(prev => prev.filter(m => m.studentId !== id)); // client cascade sync
    } catch (err) {
      alert('Failed to delete student. Please try again.');
    }
  };

  // Bulk student import
  const handleBulkAddStudents = async (importedStudents: any[]) => {
    try {
      const response = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importedStudents),
      });

      if (!response.ok) throw new Error();
      const data = await response.json();

      if (data.success) {
        setStudents(prev => [...prev, ...data.students]);
      }
      return data;
    } catch (err) {
      alert('Bulk import transaction failed. Please ensure file formatting matches the template.');
      throw err;
    }
  };

  // Mark ledger transactions
  const handleSaveMarks = async (marksToSave: Omit<Mark, 'id'>[]) => {
    try {
      const response = await fetch('/api/marks/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-teacher-username': teacher?.username || ''
        },
        body: JSON.stringify({ marks: marksToSave }),
      });

      if (!response.ok) throw new Error();

      // Refresh marks list from server to ensure accurate syncing
      const marksResponse = await fetch('/api/marks');
      if (marksResponse.ok) {
        const marksData = await marksResponse.json();
        setMarks(marksData);
      }
    } catch (err) {
      alert('Failed to save marks. Please check your network and try again.');
      throw err;
    }
  };

  const handleGenerateReportCardRedirect = (pupil: Student) => {
    setSelectedReportCardStudent(pupil);
    setActiveTab('reports');
    setExamsSubTab('reports');
  };

  // Custom Navigation setter to sync subtabs
  const handleSetTab = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'classes') setStudentsSubTab('list');
    if (tab === 'marks') setAcademicsSubTab('marks');
    if (tab === 'reports') setExamsSubTab('reports');
  };

  // If not logged in, force Login screen
  if (!teacher) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentRole === 'administrator';

  const activeTeacherClasses = currentRole === 'administrator' || currentRole === 'head_teacher' || currentRole === 'bursar'
    ? ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'] as ClassName[]
    : currentRole === 'subject_teacher' 
      ? ['P.5', 'P.6', 'P.7'] as ClassName[]
      : teacher.classes;

  // Calculate Alerts Center dynamically to show in notification bell
  const notificationAlerts: { id: string; type: 'danger' | 'warning'; title: string; desc: string; icon: any; action: () => void }[] = [];

  const missingPhotos = students.filter(s => !s.photo);
  if (missingPhotos.length > 0) {
    notificationAlerts.push({
      id: 'photo',
      type: 'warning',
      title: 'Missing Pupil Photos',
      desc: `${missingPhotos.length} child profiles lack official photographs.`,
      icon: Camera,
      action: () => {
        setActiveTab('classes');
        setStudentsSubTab('list');
      }
    });
  }

  const missingContacts = students.filter(s => !s.guardianContact || s.guardianContact.trim().length < 5);
  if (missingContacts.length > 0) {
    notificationAlerts.push({
      id: 'contact',
      type: 'danger',
      title: 'Emergency Contact Warning',
      desc: `${missingContacts.length} pupils have no guardian contact phone number.`,
      icon: PhoneCall,
      action: () => {
        setActiveTab('classes');
        setStudentsSubTab('list');
      }
    });
  }

  const p7Students = students.filter(s => s.className === 'P.7');
  const p7NoMarks = p7Students.filter(s => !marks.some(m => m.studentId === s.id));
  if (p7NoMarks.length > 0) {
    notificationAlerts.push({
      id: 'marks',
      type: 'danger',
      title: 'P.7 Academic Assessment Gap',
      desc: `${p7NoMarks.length} candidate students have no marks recorded.`,
      icon: GraduationCap,
      action: () => {
        setActiveTab('marks');
        setAcademicsSubTab('marks');
      }
    });
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex flex-col font-sans text-slate-800">
      
      {/* 1. Header Navigation Banner */}
      <header className="bg-[#0b2d59] text-white px-8 py-3.5 flex items-center justify-between shadow-md relative z-40 select-none no-print">
        
        {/* Left Section: Shield Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 flex items-center justify-center">
            {/* Red laurel wreath/dashed styling */}
            <div className="absolute inset-0 rounded-full border-2 border-red-500/80 animate-[spin_50s_linear_infinite]" />
            <div className="absolute inset-1 rounded-full bg-[#051c3a] border border-red-500/60 flex items-center justify-center">
              <span className="text-xl">🛡️</span>
            </div>
          </div>
          <div>
            <h1 className="font-display font-extrabold text-base lg:text-lg tracking-tight leading-none text-white">
              Ashinaga Uganda Rainbow House
            </h1>
            <p className="text-[10px] text-sky-200 mt-0.5 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <span>National EMIS Node</span>
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block"></span>
              <span className="text-emerald-400">Online</span>
            </p>
          </div>
        </div>

        {/* Center Section: Main Navigation Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-[#051c3a] p-1 rounded-xl border border-white/10">
          {[
            { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
            { id: 'classes', name: 'Students', icon: Users },
            { id: 'marks', name: 'Academics', icon: GraduationCap },
            { id: 'reports', name: 'Reports', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id || 
              (tab.id === 'classes' && activeTab === 'upload') ||
              (tab.id === 'marks' && activeTab === 'timetable') ||
              (tab.id === 'reports' && (activeTab === 'graduation' || activeTab === 'idcards'));
            
            return (
              <button
                key={tab.id}
                onClick={() => handleSetTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1e4e8c] text-white shadow-sm border border-white/10'
                    : 'text-sky-100 hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Section: Notification Bell and User Profile */}
        <div className="flex items-center gap-4 relative">
          
          {/* Notification Bell Dropdown Button */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 bg-[#051c3a] hover:bg-[#13315c] text-slate-300 hover:text-white rounded-full transition-colors relative cursor-pointer"
            >
              <Bell className="h-4.5 w-4.5" />
              {notificationAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-extrabold text-[9px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce border-2 border-[#0b2d59]">
                  {notificationAlerts.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Card */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 z-50 text-slate-800 animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-extrabold text-xs text-[#032b5e] uppercase tracking-wider">Alerts & Actions ({notificationAlerts.length})</span>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-700 font-bold"
                  >
                    Close
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                  {notificationAlerts.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 font-medium text-xs">
                      <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                      All pupil audits are fully compliant!
                    </div>
                  ) : (
                    notificationAlerts.map((alert) => {
                      const AlertIcon = alert.icon;
                      return (
                        <div key={alert.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3">
                          <div className={`p-2 rounded-lg shrink-0 ${alert.type === 'danger' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                            <AlertIcon className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-xs text-slate-800 leading-tight">{alert.title}</h4>
                            <p className="text-[10px] text-slate-500 leading-normal">{alert.desc}</p>
                            <button
                              onClick={() => {
                                alert.action();
                                setShowNotifications(false);
                              }}
                              className="text-[10px] text-indigo-600 font-bold underline hover:text-indigo-800 block mt-1"
                            >
                              Resolve Audit Action →
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* System Role Selector */}
          <div className="flex items-center gap-1.5 bg-[#051c3a] border border-white/10 px-3 py-1.5 rounded-xl text-white">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-300">Active Role:</span>
            <select
              value={currentRole}
              onChange={(e) => {
                const newRole = e.target.value;
                setCurrentRole(newRole);
                addAuditLog(`Switched active system role to: ${newRole.toUpperCase()}`);
              }}
              className="bg-transparent text-xs font-black text-white focus:outline-none cursor-pointer border-none"
            >
              <option className="text-slate-850" value="administrator">Administrator</option>
              <option className="text-slate-850" value="head_teacher">Head Teacher</option>
              <option className="text-slate-850" value="subject_teacher">Subject Teacher</option>
              <option className="text-slate-850" value="class_teacher">Class Teacher</option>
              <option className="text-slate-850" value="community_worker">Community Worker</option>
              <option className="text-slate-850" value="bursar">Bursar</option>
              <option className="text-slate-850" value="parent_guardian">Parent/Guardian</option>
              <option className="text-slate-850" value="data_entry">Data Entry Officer</option>
            </select>
          </div>

          {/* User Profile Card */}
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold leading-tight">{teacher.name}</p>
              <p className="text-[9px] text-sky-300 font-bold uppercase tracking-widest mt-0.5 leading-none">
                {currentRole.replace('_', ' ').toUpperCase()}
              </p>
            </div>
            <div className="relative">
              <img 
                src={teacher.username === 'admin' 
                  ? "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&h=150&fit=crop" 
                  : "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&h=150&fit=crop"
                } 
                alt="Avatar" 
                className="w-9 h-9 rounded-full object-cover border-2 border-sky-400"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0b2d59] rounded-full"></span>
            </div>
          </div>

        </div>

      </header>

      {/* 2. Main Frame Layout (Sidebar + Body Viewport) */}
      <div className="flex flex-1">
        
        {/* Sidebar - Navigation bar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            // Default sub-tabs
            if (tab === 'classes') setStudentsSubTab('list');
            if (tab === 'marks') setAcademicsSubTab('marks');
            if (tab === 'reports') setExamsSubTab('reports');
          }} 
          teacher={teacher} 
          onLogout={handleLogout} 
        />

        {/* Main content area */}
        <main className="flex-1 flex flex-col justify-between overflow-x-hidden relative min-h-[calc(100vh-70px)]">
          
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white m-6 rounded-2xl border border-slate-100 shadow-sm">
              <RefreshCw className="h-10 w-10 text-[#0b2d59] animate-spin mb-3.5" />
              <h3 className="text-slate-600 font-bold text-sm">Syncing Ledger Database</h3>
              <p className="text-slate-400 text-xs mt-1">Retrieving pupil data and academic records from school servers...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 max-w-md mx-auto text-center space-y-4">
              <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100">
                <ShieldAlert className="h-10 w-10 mx-auto mb-2 text-red-600" />
                <p className="text-sm font-semibold">{error}</p>
              </div>
              <button 
                onClick={fetchData} 
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer animate-pulse"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <div className="flex-1 pb-24 md:pb-16">
              
              {/* Active Tab Router */}
              
              {/* 1. Dashboard Tab */}
              {activeTab === 'dashboard' && (
                <Dashboard 
                  students={students} 
                  marks={marks} 
                  teacher={teacher || undefined}
                  isAdmin={isAdmin}
                  setActiveTab={(tab) => {
                    setActiveTab(tab);
                    if (tab === 'classes') setStudentsSubTab('list');
                    if (tab === 'marks') setAcademicsSubTab('marks');
                    if (tab === 'reports') setExamsSubTab('reports');
                  }} 
                />
              )}

              {/* 2. Students Tab (grouped: Registry & Excel upload) */}
              {activeTab === 'classes' && (
                <div className="p-8 space-y-6">
                  {/* Secondary Inner Toggles */}
                  <div className="flex bg-white/80 p-1 rounded-xl gap-1 self-start w-fit border border-slate-200 no-print">
                    <button
                      onClick={() => setStudentsSubTab('list')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        studentsSubTab === 'list'
                          ? 'bg-[#0b2d59] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span>Student Registry</span>
                    </button>
                    <button
                      onClick={() => setStudentsSubTab('upload')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        studentsSubTab === 'upload'
                          ? 'bg-[#0b2d59] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Spreadsheet Excel Upload</span>
                    </button>
                  </div>

                  {studentsSubTab === 'list' ? (
                    <ClassList 
                      students={students}
                      onAddStudent={handleAddStudent}
                      onUpdateStudent={handleUpdateStudent}
                      onDeleteStudent={handleDeleteStudent}
                      onGenerateReportCard={handleGenerateReportCardRedirect}
                      onOpenProfile={(student) => {
                        setSelectedProfileStudent(student);
                        setIsProfileModalOpen(true);
                      }}
                      teacherClasses={activeTeacherClasses}
                      isAdmin={isAdmin}
                    />
                  ) : (
                    <ExcelUpload 
                      students={students}
                      onBulkAddStudents={handleBulkAddStudents}
                      onSuccessRedirect={() => {
                        setStudentsSubTab('list');
                      }}
                    />
                  )}
                </div>
              )}

              {/* 3. Academics Tab (grouped: Marks entry, Timetable, Teachers, Promotion) */}
              {activeTab === 'marks' && (
                <div className="p-8 space-y-6">
                  {/* Secondary Inner Toggles */}
                  <div className="flex flex-wrap bg-white/80 p-1 rounded-xl gap-1 self-start w-fit border border-slate-200 no-print">
                    <button
                      onClick={() => setAcademicsSubTab('marks')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        academicsSubTab === 'marks'
                          ? 'bg-[#0b2d59] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <GraduationCap className="h-4 w-4" />
                      <span>Assessments & Marks Entry</span>
                    </button>
                    <button
                      onClick={() => setAcademicsSubTab('timetable')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        academicsSubTab === 'timetable'
                          ? 'bg-[#0b2d59] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Weekly Class Timetables</span>
                    </button>
                    <button
                      onClick={() => setAcademicsSubTab('teachers')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        academicsSubTab === 'teachers'
                          ? 'bg-[#0b2d59] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Teacher Assignments</span>
                    </button>
                    <button
                      onClick={() => setAcademicsSubTab('promotion')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        academicsSubTab === 'promotion'
                          ? 'bg-[#0b2d59] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <TrendingUp className="h-4 w-4" />
                      <span>Auto-Promotion Engine</span>
                    </button>
                    <button
                      onClick={() => setAcademicsSubTab('analytics')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        academicsSubTab === 'analytics'
                          ? 'bg-[#0b2d59] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                      <span>PLE Academic Analytics</span>
                    </button>
                  </div>

                  {academicsSubTab === 'marks' ? (
                    <MarkEntry 
                      students={students}
                      marks={marks}
                      onSaveMarks={handleSaveMarks}
                      teacher={teacher}
                      isAdmin={isAdmin}
                    />
                  ) : academicsSubTab === 'timetable' ? (
                    <SchoolTimetable 
                      teacherClasses={teacher.classes}
                      isAdmin={isAdmin}
                    />
                  ) : academicsSubTab === 'teachers' ? (
                    <TeacherAssignmentHub 
                      teachers={teachers}
                      onAddOrUpdateTeacher={handleAddOrUpdateTeacher}
                      onDeleteTeacher={handleDeleteTeacher}
                      currentTeacher={teacher}
                      isAdmin={isAdmin}
                    />
                  ) : academicsSubTab === 'promotion' ? (
                    <AutoPromotionEngine 
                      students={students}
                      marks={marks}
                      onPromoteStudents={handlePromoteStudents}
                      isAdmin={isAdmin}
                    />
                  ) : (
                    <AcademicAnalytics 
                      students={students}
                      marks={marks}
                      isAdmin={isAdmin}
                    />
                  )}
                </div>
              )}

              {/* 4. Reports Tab (grouped: Report cards, P.7 Graduation list, Printable Pupil IDs & Completion Certificates, Custom Document Creator) */}
              {activeTab === 'reports' && (
                <div className="p-8 space-y-6">
                  {/* Secondary Inner Toggles */}
                  <div className="flex flex-wrap bg-white/80 p-1.5 rounded-xl gap-1 self-start w-fit border border-slate-200 no-print">
                    <button
                      onClick={() => setExamsSubTab('reports')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        examsSubTab === 'reports'
                          ? 'bg-[#0b2d59] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Term Report Cards</span>
                    </button>
                    <button
                      onClick={() => setExamsSubTab('graduation')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        examsSubTab === 'graduation'
                          ? 'bg-[#0b2d59] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Award className="h-4 w-4" />
                      <span>P.7 Graduation Registry</span>
                    </button>
                    <button
                      onClick={() => setExamsSubTab('idcards')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        examsSubTab === 'idcards'
                          ? 'bg-[#0b2d59] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Pupil IDs & Certificates</span>
                    </button>
                    <button
                      onClick={() => setExamsSubTab('docgen')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        examsSubTab === 'docgen'
                          ? 'bg-[#0b2d59] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Custom Document Creator</span>
                    </button>
                  </div>

                  {examsSubTab === 'reports' && (
                    <ReportCardView 
                      students={students}
                      marks={marks}
                      selectedStudent={selectedReportCardStudent}
                    />
                  )}

                  {examsSubTab === 'graduation' && (
                    <GraduationList 
                      students={students}
                      marks={marks}
                    />
                  )}

                  {examsSubTab === 'idcards' && (
                    <StudentIdCards 
                      students={students}
                    />
                  )}

                  {examsSubTab === 'docgen' && (
                    <DocumentGenerator 
                      students={students}
                      marks={marks}
                    />
                  )}
                </div>
              )}

              {/* 5. Support & Attendance Module */}
              {activeTab === 'attendance' && (
                <AttendanceSupport 
                  students={students}
                  teacherClasses={teacher.classes}
                  isAdmin={isAdmin}
                />
              )}

              {/* AI Assistant Tab */}
              {activeTab === 'ai-chat' && (
                <AiAssistant />
              )}

              {/* 9. Settings and Administration Panel */}
              {activeTab === 'upload' && (
                <div className="p-8 space-y-6">
                  {/* Secondary Inner Toggles */}
                  <div className="flex bg-white/80 p-1 rounded-xl gap-1 self-start w-fit border border-slate-200 no-print">
                    <button
                      onClick={() => setSettingsSubTab('upload')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        settingsSubTab === 'upload'
                          ? 'bg-[#0b2d59] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Spreadsheet Excel Upload</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setSettingsSubTab('backup')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          settingsSubTab === 'backup'
                            ? 'bg-[#0b2d59] text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Database className="h-4 w-4" />
                        <span>Backup & Recovery</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSettingsSubTab('audit')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        settingsSubTab === 'audit'
                          ? 'bg-[#0b2d59] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      <span>System Audit Logs</span>
                    </button>
                  </div>

                  {settingsSubTab === 'upload' ? (
                    <ExcelUpload 
                      students={students}
                      onBulkAddStudents={handleBulkAddStudents}
                      onSuccessRedirect={() => {
                        setActiveTab('classes');
                        setStudentsSubTab('list');
                      }}
                    />
                  ) : settingsSubTab === 'backup' && isAdmin ? (
                    <BackupRecovery onRestoreSuccess={fetchData} />
                  ) : settingsSubTab === 'audit' ? (
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-sm md:text-base">System Audit Logs</h3>
                          <p className="text-slate-500 text-xs mt-0.5">Real-time security trail and user actions log for accountability.</p>
                        </div>
                        <span className="px-3 py-1 bg-sky-50 text-sky-700 text-[10px] md:text-xs font-bold rounded-lg uppercase tracking-wider">
                          Active Session Safeguards
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600 border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-slate-700 font-extrabold uppercase">
                              <th className="p-3">Timestamp</th>
                              <th className="p-3">Operator</th>
                              <th className="p-3">Action logged</th>
                              <th className="p-3 font-mono">IP Address</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-sans">
                            {auditLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                                <td className="p-3 whitespace-nowrap">
                                  <span className="font-bold text-slate-800">{log.user.split(' ')[0]}</span>
                                  <span className="ml-1 text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase font-semibold">
                                    {log.user.includes('(') ? log.user.split('(')[1].replace(')', '') : 'staff'}
                                  </span>
                                </td>
                                <td className="p-3 font-medium text-slate-700">{log.action}</td>
                                <td className="p-3 font-mono text-[11px] text-slate-400">{log.ip}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 bg-white rounded-2xl border border-slate-100 shadow-sm text-center max-w-md mx-auto space-y-4">
                      <Lock className="h-12 w-12 text-slate-300 mx-auto" />
                      <h3 className="text-sm font-bold text-slate-800">Administrator Access Required</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        You do not have the required administrative permissions to run encrypted system backups or ledger rollbacks.
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Core Footer */}
          <footer className="bg-slate-900 h-16 flex items-center px-8 justify-between text-white no-print mt-auto shrink-0 font-sans z-10 border-t border-slate-800">
            <div className="flex gap-4 text-xs font-bold items-center">
              <span className="opacity-60 uppercase">System Context:</span>
              <span className="text-yellow-400">Academic Year 2026</span>
              <span className="text-sky-300">Term 1 Node</span>
            </div>
            <div className="flex gap-3 text-xs text-slate-400 font-mono items-center">
              <span className="hidden sm:inline">Ashinaga Uganda Rainbow House © 2026</span>
              <span className="bg-emerald-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded uppercase">EMIS Sync Active</span>
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
          </footer>

        </main>

      </div>

      {/* 360-Degree Pupil Profile Modal popup */}
      {isProfileModalOpen && selectedProfileStudent && (
        <StudentProfileModal 
          student={selectedProfileStudent}
          isOpen={isProfileModalOpen}
          marks={marks}
          onUpdateStudent={handleUpdateStudent}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedProfileStudent(null);
          }}
        />
      )}

      {/* Ergonomic Mobile Bottom Tab Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#06182c] border-t border-[#0f243c] h-16 flex justify-around items-center px-2 shadow-[0_-5px_20px_rgba(0,0,0,0.3)] no-print">
        {[
          { id: 'dashboard', name: 'Dashboard', icon: Home, action: () => handleSetTab('dashboard') },
          { id: 'classes', name: 'Students', icon: Users, action: () => handleSetTab('classes') },
          { id: 'marks', name: 'Academics', icon: GraduationCap, action: () => handleSetTab('marks') },
          { id: 'reports', name: 'Reports', icon: FileSpreadsheet, action: () => handleSetTab('reports') },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || 
            (tab.id === 'classes' && activeTab === 'upload') ||
            (tab.id === 'marks' && activeTab === 'timetable') ||
            (tab.id === 'reports' && (activeTab === 'graduation' || activeTab === 'idcards'));

          return (
            <button
              key={tab.id}
              onClick={tab.action}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all duration-150 cursor-pointer ${
                isActive 
                  ? 'text-[#FF5E4D] font-black' 
                  : 'text-slate-300 font-bold hover:text-white'
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 mb-1 ${isActive ? 'text-[#FF5E4D]' : 'text-slate-400'}`} />
              <span className="text-[10px] tracking-wider uppercase font-sans block leading-none">{tab.name}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
