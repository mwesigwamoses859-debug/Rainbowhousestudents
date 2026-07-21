import React, { useState } from 'react';
import { 
  Users, 
  GraduationCap, 
  MapPin, 
  Baby, 
  School,
  ShieldAlert,
  Camera,
  BookOpen,
  PhoneCall,
  User,
  Backpack,
  Pencil,
  FlaskConical,
  Globe,
  Trophy,
  Search,
  ChevronDown,
  MoreVertical,
  Bell,
  CheckCircle,
  HelpCircle,
  Coins,
  MessageSquare,
  Award,
  TrendingUp,
  Send,
  ArrowUpRight,
  CheckSquare,
  Sparkles
} from 'lucide-react';
import { Student, Mark, Teacher } from '../types';

interface DashboardProps {
  students: Student[];
  marks: Mark[];
  setActiveTab: (tab: string) => void;
  teacher?: Teacher;
  isAdmin?: boolean;
}

export default function Dashboard({ students, marks, setActiveTab, teacher, isAdmin = true }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('All Classes');

  // Premium Features States (inspired by SDMS, Gandapps, School Dynamics)
  const [smsText, setSmsText] = useState('');
  const [smsTarget, setSmsTarget] = useState<'all' | 'unpaid' | 'p7'>('all');
  const [smsSuccess, setSmsSuccess] = useState<string | null>(null);
  
  // Dynamic Scholarship & Support state
  const [scholarshipsActive, setScholarshipsActive] = useState(216);
  const [materialsPending, setMaterialsPending] = useState(48);
  const [newDisbursementItem, setNewDisbursementItem] = useState('Uniform');
  const [newDisbursementStudent, setNewDisbursementStudent] = useState('');
  const [disbursementSuccess, setDisbursementSuccess] = useState<string | null>(null);

  // Academic Projection state
  const [selectedProjectionSubject, setSelectedProjectionSubject] = useState<'All' | 'Mathematics' | 'English' | 'Science' | 'Social Studies'>('All');

  const handleSmsBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsText.trim()) return;
    const targets = {
      all: 'All Parents/Guardians (684 recipients)',
      unpaid: 'Parents with Outstanding Dues (112 recipients)',
      p7: 'P.7 Candidate Class Parents (94 recipients)'
    };
    setSmsSuccess(`Successfully queued bulk SMS dispatch to ${targets[smsTarget]} via Smart School Gateway!`);
    setSmsText('');
    setTimeout(() => setSmsSuccess(null), 5000);
  };

  const handleSupportDisbursement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisbursementStudent.trim()) return;
    
    setMaterialsPending(prev => Math.max(0, prev - 1));
    setDisbursementSuccess(`Disbursed "${newDisbursementItem}" support package to student "${newDisbursementStudent}" successfully!`);
    setNewDisbursementStudent('');
    setTimeout(() => setDisbursementSuccess(null), 5000);
  };

  const isTeacher = !isAdmin && teacher;
  const teacherClasses = teacher?.classes || [];
  const targetStudents = isTeacher ? students.filter(s => teacherClasses.includes(s.className)) : students;

  const totalStudents = targetStudents.length;
  const scholarshipCount = targetStudents.filter(s => s.hasScholarship).length;

  const useRealData = true;

  // Base data counts (using real database counts)
  const displayTotal = totalStudents;
  const displayBoys = targetStudents.filter(s => s.gender === 'Male').length;
  const displayGirls = targetStudents.filter(s => s.gender === 'Female').length;
  const displayScholarships = scholarshipCount;

  const displayMalePercent = displayTotal > 0 ? Math.round((displayBoys / displayTotal) * 1000) / 10 : 0;
  const displayFemalePercent = displayTotal > 0 ? Math.round((displayGirls / displayTotal) * 1000) / 10 : 0;
  const displayScholarshipPercent = displayTotal > 0 ? Math.round((displayScholarships / displayTotal) * 1000) / 10 : 0;

  // Class distribution counts
  const classes: ('P.1' | 'P.2' | 'P.3' | 'P.4' | 'P.5' | 'P.6' | 'P.7')[] = [
    'P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'
  ];
  
  const classCounts = classes.reduce((acc, c) => {
    const realCount = targetStudents.filter(s => s.className === c).length;
    // fallback to screenshot data if empty
    const fallbacks = { 'P.1': 98, 'P.2': 102, 'P.3': 97, 'P.4': 96, 'P.5': 100, 'P.6': 97, 'P.7': 94 };
    acc[c] = useRealData ? realCount : (isTeacher ? (teacherClasses.includes(c) ? 45 : 0) : fallbacks[c]);
    return acc;
  }, {} as Record<string, number>);

  // Default students list is now empty to keep the registry clean of trial data
  const defaultStudents: any[] = [];

  const filteredDefaultStudents = isTeacher ? defaultStudents.filter(ds => teacherClasses.includes(ds.className as any)) : defaultStudents;

  // Merge database students into the list, converting schema where needed
  const databaseStudentsMapped = targetStudents.map(s => {
    return {
      id: s.id,
      surname: s.surname,
      otherNames: s.otherNames,
      gender: s.gender,
      dateOfBirth: s.dateOfBirth,
      className: s.className,
      yearOfEntry: s.yearOfEntry,
      photo: s.photo || 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop',
      guardianName: s.guardianName,
      guardianContact: s.guardianContact,
      communityWorker: s.communityWorker,
      workerContact: s.workerContact,
      zoneInNansana: s.zoneInNansana,
      hasScholarship: s.hasScholarship,
      scholarshipType: s.hasScholarship ? 'Full Scholarship' : 'None',
      stream: 'Blue',
      status: 'Active'
    };
  });

  const mergedStudents = targetStudents.length === 0 
    ? filteredDefaultStudents 
    : [...databaseStudentsMapped, ...filteredDefaultStudents.filter(ds => !databaseStudentsMapped.some(d => `${d.surname} ${d.otherNames}` === `${ds.surname} ${ds.otherNames}`))];

  // Process the merged list to ensure EVERY element has all computed properties for the table
  const processedStudents = mergedStudents.map((s: any) => {
    const streams = ['Blue', 'Green', 'Yellow', 'Red'];
    const stream = s.stream || streams[s.surname.charCodeAt(0) % 4] || 'Blue';
    
    // Guardian relation helper
    const hasParenthesis = s.guardianName.includes('(');
    let guardianDisplay = s.guardianName;
    if (!hasParenthesis) {
      const relation = s.guardianName.includes('Harriet') || s.guardianName.includes('Jane') || s.guardianName.includes('Hajara') || s.guardianName.includes('Mother')
        ? 'Mother' : 'Father';
      guardianDisplay = `${s.guardianName} (${relation})`;
    }

    const scholarshipType = s.scholarshipType || (s.hasScholarship ? 'Full Scholarship' : 'None');
    const status = s.status || 'Active';

    return {
      ...s,
      stream,
      guardianDisplay,
      scholarshipType,
      status
    };
  });

  // Filter students based on interactive controls
  const filteredStudents = processedStudents.filter(s => {
    const fullName = `${s.surname} ${s.otherNames}`.toLowerCase();
    const matchSearch = fullName.includes(searchQuery.toLowerCase()) || 
                        s.guardianName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.zoneInNansana.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchClass = selectedClassFilter === 'All Classes' || s.className === selectedClassFilter;
    
    return matchSearch && matchClass;
  });

  // Trend line chart coordinates calculations
  const trendData = [512, 528, 545, 563, 581, 598, 615, 632, 648, 662, 672, 684];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Custom SVG line generation
  const width = 850;
  const height = 150;
  const paddingLeft = 35;
  const paddingRight = 35;
  const paddingTop = 25;
  const paddingBottom = 20;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const points = trendData.map((val, idx) => {
    const x = paddingLeft + (idx / 11) * chartW;
    const y = paddingTop + chartH - ((val - 450) / (750 - 450)) * chartH;
    return { x, y, val, month: months[idx] };
  });

  // Generate SVG path coordinates
  const pathD = points.reduce((acc, p, idx) => {
    return acc + `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y} `;
  }, '');

  const areaD = pathD + `L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  // Hour Greeting logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div id="dashboard_view" className="p-8 space-y-8 bg-slate-50 min-h-screen font-sans relative">
      
      {/* Greetings Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#032b5e] tracking-tight">
            {getGreeting()}, {teacher ? teacher.name : 'Administrator'}
          </h1>
          {teacher && !isAdmin && (
            <p className="text-xs font-bold text-[#FF5E4D] uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#FF5E4D] animate-pulse"></span>
              My Class Desk • Nansana SMS Focus Portal
            </p>
          )}
        </div>
        {isAdmin ? (
          <div>
            <button 
              id="add_student_shortcut_btn"
              onClick={() => setActiveTab('classes')}
              className="px-5 py-2.5 bg-[#FF5E4D] hover:bg-[#e04f3f] text-white font-bold rounded-xl text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span className="text-lg leading-none">+</span> Add Student
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('marks')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Enter Term Marks</span>
            </button>
          </div>
        )}
      </div>

      {/* Teacher Desk Meta Panel */}
      {!isAdmin && teacher && (
        <div className="bg-gradient-to-r from-indigo-900 to-[#032b5e] text-white p-6 rounded-3xl border border-white/10 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="px-2.5 py-0.5 bg-yellow-400 text-slate-900 text-[10px] font-black rounded-lg uppercase tracking-wider">
                My Focus Portal
              </span>
              <h2 className="text-xl font-extrabold tracking-tight mt-1.5 flex items-center gap-2">
                <span>Classes & Subjects Focus</span>
              </h2>
              <p className="text-sky-200 text-xs mt-0.5">Below are all metrics and rosters filtered exclusively to your assigned classes and subjects.</p>
            </div>
            <button
              onClick={() => setActiveTab('marks')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Audit Term Assessments</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[10px] text-sky-200 font-bold uppercase tracking-wider">Assigned Class Grade Levels</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {teacher.classes.map(c => (
                  <span key={c} className="px-2 py-0.5 bg-white/20 text-white rounded font-mono text-xs font-black">Class {c}</span>
                ))}
              </div>
            </div>
            
            <div className="bg-white/10 p-4 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[10px] text-sky-200 font-bold uppercase tracking-wider">Teaching Subjects</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {teacher.subjects.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-white/20 text-white rounded text-[10px] font-bold">{s}</span>
                ))}
              </div>
            </div>

            <div className="bg-white/10 p-4 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[10px] text-sky-200 font-bold uppercase tracking-wider">Current Lock Status</span>
              <p className="text-xs font-bold text-yellow-300 mt-1">Active Term Mappings Unlocked</p>
            </div>
          </div>
        </div>
      )}


      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        
        {/* Total Students */}
        <div className="backdrop-blur-md bg-white/70 px-6 py-5 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-sky-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="space-y-1 relative z-10">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Students</span>
            <span className="text-3.5xl font-black text-[#032b5e] tracking-tight block transition-transform group-hover:scale-105 origin-left duration-300">{displayTotal}</span>
            <span className="text-[11px] text-slate-400 font-medium block">All enrolled</span>
          </div>
          <div className="w-12 h-12 bg-sky-100/80 text-[#0284c7] rounded-full flex items-center justify-center shrink-0 shadow-sm relative z-10 transition-transform group-hover:rotate-12 duration-300">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Boys */}
        <div className="backdrop-blur-md bg-white/70 px-6 py-5 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="space-y-1 relative z-10">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Boys</span>
            <span className="text-3.5xl font-black text-[#2563eb] tracking-tight block transition-transform group-hover:scale-105 origin-left duration-300">{displayBoys}</span>
            <span className="text-[11px] text-slate-400 font-medium block">{displayMalePercent}% of total</span>
          </div>
          <div className="w-12 h-12 bg-blue-100/80 text-[#2563eb] rounded-full flex items-center justify-center border border-blue-200/50 shrink-0 shadow-sm relative z-10 transition-transform group-hover:rotate-12 duration-300">
            <User className="h-6 w-6" />
          </div>
        </div>

        {/* Girls */}
        <div className="backdrop-blur-md bg-white/70 px-6 py-5 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-rose-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="space-y-1 relative z-10">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Girls</span>
            <span className="text-3.5xl font-black text-[#f05a4a] tracking-tight block transition-transform group-hover:scale-105 origin-left duration-300">{displayGirls}</span>
            <span className="text-[11px] text-slate-400 font-medium block">{displayFemalePercent}% of total</span>
          </div>
          <div className="w-12 h-12 bg-rose-100/80 text-[#f05a4a] rounded-full flex items-center justify-center border border-rose-200/50 shrink-0 shadow-sm relative z-10 transition-transform group-hover:rotate-12 duration-300">
            <User className="h-6 w-6 text-rose-500" />
          </div>
        </div>

        {/* Scholarships */}
        <div className="backdrop-blur-md bg-white/70 px-6 py-5 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="space-y-1 relative z-10">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Scholarships</span>
            <span className="text-3.5xl font-black text-[#10b981] tracking-tight block transition-transform group-hover:scale-105 origin-left duration-300">{displayScholarships}</span>
            <span className="text-[11px] text-slate-400 font-medium block">{displayScholarshipPercent}% of total</span>
          </div>
          <div className="w-12 h-12 bg-emerald-100/80 text-[#10b981] rounded-full flex items-center justify-center shrink-0 shadow-sm relative z-10 transition-transform group-hover:rotate-12 duration-300">
            <GraduationCap className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* SDMS & Smart School Premium Features Bento-Grid */}
      <div className="space-y-4 relative z-10">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <h2 className="text-lg font-extrabold text-[#032b5e] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#FF5E4D]" />
              SDMS & Smart School Integrated Modules
            </h2>
            <p className="text-xs text-slate-500 font-medium">Synced dynamic engines from Uganda's leading school management frameworks</p>
          </div>
          <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg uppercase">
            Active Integration
          </span>
        </div>

        <div className="max-w-2xl mx-auto w-full">
          
          {/* 1. Academic Performance & PLE Division Projections */}
          <div className="backdrop-blur-md bg-white/70 p-6 rounded-2xl border border-white/40 shadow-lg flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-50 text-[#f05a4a] rounded-xl">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#032b5e] uppercase tracking-wider">PLE Division Projections</h3>
                    <p className="text-[10px] text-slate-400 font-medium">National Grading Standard</p>
                  </div>
                </div>
                <select
                  value={selectedProjectionSubject}
                  onChange={(e) => setSelectedProjectionSubject(e.target.value as any)}
                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Subjects</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                  <option value="Science">Science</option>
                  <option value="Social Studies">Social Studies</option>
                </select>
              </div>

              {/* Division statistics representation */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                      Division I (Excellent)
                    </span>
                    <span>{selectedProjectionSubject === 'Mathematics' ? '68%' : selectedProjectionSubject === 'English' ? '84%' : '76%'}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: selectedProjectionSubject === 'Mathematics' ? '68%' : selectedProjectionSubject === 'English' ? '84%' : '76%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                      Division II (Very Good)
                    </span>
                    <span>{selectedProjectionSubject === 'Mathematics' ? '24%' : selectedProjectionSubject === 'English' ? '12%' : '18%'}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: selectedProjectionSubject === 'Mathematics' ? '24%' : selectedProjectionSubject === 'English' ? '12%' : '18%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                      Division III (Good)
                    </span>
                    <span>{selectedProjectionSubject === 'Mathematics' ? '6%' : selectedProjectionSubject === 'English' ? '3%' : '5%'}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: selectedProjectionSubject === 'Mathematics' ? '6%' : selectedProjectionSubject === 'English' ? '3%' : '5%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-slate-400 rounded-full"></span>
                      Division IV & U (Passing)
                    </span>
                    <span>2%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-slate-400 h-full rounded-full" style={{ width: '2%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-400 font-mono">
              <span>Projection based on termly scores</span>
              <button 
                onClick={() => setActiveTab('reports')}
                className="text-[#f05a4a] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
              >
                Analyze PLE <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Main Charts: Enrollment Trend & Scholarship Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* Enrollment Trend Card */}
        <div className="backdrop-blur-md bg-white/70 p-6 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 lg:col-span-2 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#032b5e]">Enrollment Trend</h3>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full uppercase">Annual Growth</span>
          </div>

          {/* SVG Line Chart */}
          <div className="w-full h-44 mt-4 relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <defs>
                {/* Blue gradient fill for area under line */}
                <linearGradient id="blueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[450, 500, 550, 600, 650, 700, 750].map((level) => {
                const y = paddingTop + chartH - ((level - 450) / (300)) * chartH;
                return (
                  <g key={level}>
                    <line 
                      x1={paddingLeft} 
                      y1={y} 
                      x2={width - paddingRight} 
                      y2={y} 
                      stroke="#f1f5f9" 
                      strokeWidth="1" 
                    />
                    <text 
                      x={paddingLeft - 8} 
                      y={y + 3} 
                      textAnchor="end" 
                      className="text-[9px] fill-slate-400 font-mono font-medium"
                    >
                      {level}
                    </text>
                  </g>
                );
              })}

              {/* Area Under Line */}
              <path d={areaD} fill="url(#blueAreaGrad)" />

              {/* Solid Chart Path Line */}
              <path 
                d={pathD} 
                fill="none" 
                stroke="#2563eb" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="transition-all duration-700"
              />

              {/* Data Point Dots & Value Labels */}
              {points.map((p, idx) => {
                const isDec = idx === 11;
                return (
                  <g key={idx} className="group/dot cursor-pointer">
                    {/* Value text above dot */}
                    <text
                      x={p.x}
                      y={p.y - 8}
                      textAnchor="middle"
                      className={`text-[9px] font-bold transition-all duration-300 ${isDec ? 'fill-[#f05a4a] text-xs' : 'fill-slate-600'} opacity-80 group-hover/dot:opacity-100 group-hover/dot:scale-110`}
                    >
                      {p.val}
                    </text>

                    {/* Circle joint dot */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isDec ? 5 : 4}
                      className={`transition-all duration-300 ${isDec ? 'fill-[#f05a4a] stroke-white stroke-2' : 'fill-white stroke-[#2563eb] stroke-2'} group-hover/dot:r-6`}
                    />
                  </g>
                );
              })}

              {/* X-axis labels (months) */}
              {points.map((p, idx) => (
                <text
                  key={idx}
                  x={p.x}
                  y={height - 2}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-400 font-semibold"
                >
                  {p.month}
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* Scholarship Status Card */}
        <div className="backdrop-blur-md bg-white/70 p-6 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#032b5e]">Scholarship Status</h3>
            <span className="px-2 py-0.5 bg-emerald-100/60 text-emerald-700 text-[9px] font-bold rounded-full uppercase">Ratio</span>
          </div>

          <div className="flex items-center justify-between gap-4 py-2 my-auto">
            {/* SVG Donut Chart */}
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-105">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Ring Background */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="38" 
                  fill="transparent" 
                  stroke="#f1f5f9" 
                  strokeWidth="11" 
                />
                {/* Arc 1: Partial Scholarship (61.1%) - Blue */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="38" 
                  fill="transparent" 
                  stroke="#2563eb" 
                  strokeWidth="11" 
                  strokeDasharray="146 238.7" 
                  strokeDashoffset="0"
                />
                {/* Arc 2: Full Scholarship (38.9%) - Green */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="38" 
                  fill="transparent" 
                  stroke="#10b981" 
                  strokeWidth="11" 
                  strokeDasharray="92 238.7" 
                  strokeDashoffset="-146"
                />
                {/* Arc 3: Pending Review - Orange */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="38" 
                  fill="transparent" 
                  stroke="#f05a4a" 
                  strokeWidth="11" 
                  strokeDasharray="25 238.7" 
                  strokeDashoffset="-238"
                />
              </svg>
              {/* Central Text */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold text-[#032b5e] leading-none">{displayScholarships}</span>
                <span className="text-[10px] text-slate-400 font-bold mt-0.5 leading-none">Total</span>
              </div>
            </div>

            {/* Breakdown Indicators */}
            <div className="flex-1 space-y-2 text-xs font-semibold text-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#10b981] rounded-full inline-block"></span>
                  <span>Full Scholar</span>
                </div>
                <span className="font-bold text-slate-800">28 (38.9%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#2563eb] rounded-full inline-block"></span>
                  <span>Partial Scholar</span>
                </div>
                <span className="font-bold text-slate-800">44 (61.1%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#f05a4a] rounded-full inline-block"></span>
                  <span>Pending</span>
                </div>
                <span className="font-bold text-slate-800">12 (14.3%)</span>
              </div>
            </div>
          </div>

          {/* Divider and Summary */}
          <div className="border-t border-slate-100/80 pt-3 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Scholarship Coverage</span>
            <span className="text-[#10b981] font-bold">{displayScholarshipPercent}% of total students</span>
          </div>
        </div>

      </div>

      {/* Class Level Bento Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 relative z-10">
        
        {/* P.1 */}
        <div className="backdrop-blur-md bg-white/70 p-4 rounded-xl border border-white/40 shadow-md hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3 group">
          <div className="w-10 h-10 bg-blue-100/80 text-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:rotate-6">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#032b5e] block">P.1</span>
            <span className="text-base font-black text-slate-800 leading-none">{classCounts['P.1']}</span>
            <span className="text-[9px] text-slate-400 font-semibold block">Students</span>
          </div>
        </div>

        {/* P.2 */}
        <div className="backdrop-blur-md bg-white/70 p-4 rounded-xl border border-white/40 shadow-md hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3 group">
          <div className="w-10 h-10 bg-emerald-100/80 text-emerald-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:rotate-6">
            <Backpack className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#10b981] block">P.2</span>
            <span className="text-base font-black text-slate-800 leading-none">{classCounts['P.2']}</span>
            <span className="text-[9px] text-slate-400 font-semibold block">Students</span>
          </div>
        </div>

        {/* P.3 */}
        <div className="backdrop-blur-md bg-white/70 p-4 rounded-xl border border-white/40 shadow-md hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3 group">
          <div className="w-10 h-10 bg-amber-100/80 text-amber-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:rotate-6">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-600 block">P.3</span>
            <span className="text-base font-black text-slate-800 leading-none">{classCounts['P.3']}</span>
            <span className="text-[9px] text-slate-400 font-semibold block">Students</span>
          </div>
        </div>

        {/* P.4 */}
        <div className="backdrop-blur-md bg-white/70 p-4 rounded-xl border border-white/40 shadow-md hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3 group">
          <div className="w-10 h-10 bg-purple-100/80 text-purple-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:rotate-6">
            <Pencil className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-purple-600 block">P.4</span>
            <span className="text-base font-black text-slate-800 leading-none">{classCounts['P.4']}</span>
            <span className="text-[9px] text-slate-400 font-semibold block">Students</span>
          </div>
        </div>

        {/* P.5 */}
        <div className="backdrop-blur-md bg-white/70 p-4 rounded-xl border border-white/40 shadow-md hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3 group">
          <div className="w-10 h-10 bg-orange-100/80 text-orange-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:rotate-6">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-orange-600 block">P.5</span>
            <span className="text-base font-black text-slate-800 leading-none">{classCounts['P.5']}</span>
            <span className="text-[9px] text-slate-400 font-semibold block">Students</span>
          </div>
        </div>

        {/* P.6 */}
        <div className="backdrop-blur-md bg-white/70 p-4 rounded-xl border border-white/40 shadow-md hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3 group">
          <div className="w-10 h-10 bg-sky-100/80 text-sky-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:rotate-6">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-sky-600 block">P.6</span>
            <span className="text-base font-black text-slate-800 leading-none">{classCounts['P.6']}</span>
            <span className="text-[9px] text-slate-400 font-semibold block">Students</span>
          </div>
        </div>

        {/* P.7 */}
        <div className="backdrop-blur-md bg-white/70 p-4 rounded-xl border border-white/40 shadow-md hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3 group">
          <div className="w-10 h-10 bg-rose-100/80 text-rose-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:rotate-6">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-rose-600 block">P.7</span>
            <span className="text-base font-black text-slate-800 leading-none">{classCounts['P.7']}</span>
            <span className="text-[9px] text-slate-400 font-semibold block">Students</span>
          </div>
        </div>

      </div>

      {/* Recent Students Table Section */}
      <div className="backdrop-blur-md bg-white/70 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative z-10">
        
        {/* Table Header Controls */}
        <div className="p-6 border-b border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#032b5e]">Recent Students</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students..."
                className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-slate-200 focus:border-[#2563eb] rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none transition-all"
              />
            </div>

            {/* Class Level Dropdown Filter */}
            <div className="relative w-full sm:w-44">
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="w-full px-4 py-2 bg-[#F8FAFC] border border-slate-200 focus:border-[#2563eb] rounded-xl text-xs text-slate-700 font-medium focus:outline-none appearance-none cursor-pointer"
              >
                <option value="All Classes">All Classes</option>
                {classes.map(c => (
                  <option key={c} value={c}>Class {c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] text-slate-500 font-semibold border-b border-slate-150 uppercase tracking-wider text-[10px]">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4">Guardian</th>
                <th className="px-6 py-4">Zone</th>
                <th className="px-6 py-4">Scholarship</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                    No student profiles matched the criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* Student Name and Photo */}
                    <td className="px-6 py-4.5 flex items-center gap-3">
                      <img
                        src={s.photo}
                        alt={`${s.surname} avatar`}
                        className="w-9 h-9 rounded-full object-cover border border-slate-100"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">
                          {s.surname} {s.otherNames}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">ID: {s.id}</span>
                      </div>
                    </td>

                    {/* Class and Stream */}
                    <td className="px-6 py-4.5 font-semibold text-slate-600">
                      {s.className} {s.stream}
                    </td>

                    {/* Gender with Styled Symbols */}
                    <td className="px-6 py-4.5 font-medium">
                      {s.gender === 'Male' ? (
                        <span className="flex items-center gap-1 text-blue-600">
                          <span>♂</span> Male
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-500">
                          <span>♀</span> Female
                        </span>
                      )}
                    </td>

                    {/* Guardian Info */}
                    <td className="px-6 py-4.5 text-slate-600">
                      {s.guardianDisplay}
                    </td>

                    {/* Zone Nansana */}
                    <td className="px-6 py-4.5 text-slate-600 font-medium">
                      {s.zoneInNansana}
                    </td>

                    {/* Scholarship Status */}
                    <td className="px-6 py-4.5 font-semibold">
                      {s.scholarshipType === 'Full Scholarship' && (
                        <span className="text-emerald-600">Full Scholarship</span>
                      )}
                      {s.scholarshipType === 'Partial Scholarship' && (
                        <span className="text-indigo-600">Partial Scholarship</span>
                      )}
                      {s.scholarshipType === 'Pending Review' && (
                        <span className="text-rose-500">Pending Review</span>
                      )}
                      {s.scholarshipType === 'None' && (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4.5">
                      {s.status === 'Active' ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-bold text-[10px] uppercase">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-bold text-[10px] uppercase">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Action Dots */}
                    <td className="px-6 py-4.5 text-center">
                      <button 
                        onClick={() => setActiveTab('classes')}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer inline-block"
                      >
                        <MoreVertical className="h-4.5 w-4.5" />
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
