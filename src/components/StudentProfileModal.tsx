import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  GraduationCap, 
  Calendar, 
  HeartHandshake, 
  ShieldAlert, 
  Phone, 
  Heart, 
  FileText, 
  History, 
  Award, 
  Clock, 
  MapPin, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  File, 
  Trash2, 
  Plus, 
  Sparkles,
  Camera,
  Coins,
  Smile,
  TrendingUp,
  TrendingDown,
  Info,
  QrCode,
  Printer
} from 'lucide-react';
import { Student, Mark, ClassName } from '../types';
import StudentQrCodeModal from './StudentQrCodeModal';
import AshinagaLogo from './AshinagaLogo';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface StudentProfileModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  marks: Mark[];
  onUpdateStudent: (id: string, data: Partial<Student>) => Promise<void>;
}

// Global alert thresholds interface
export interface AlertThresholds {
  consecutiveAbsences: number;
  minAttendanceRate: number;
  minAcademicScore: number;
  maxHomeVisitGapDays: number;
  requireConsentDoc: boolean;
}

export default function StudentProfileModal({ 
  student, 
  isOpen, 
  onClose, 
  marks,
  onUpdateStudent
}: StudentProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'academics' | 'attendance' | 'support' | 'community' | 'guardians' | 'health' | 'documents' | 'history'>('overview');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  
  // Local editable alert thresholds
  const [thresholds, setThresholds] = useState<AlertThresholds>({
    consecutiveAbsences: 3,
    minAttendanceRate: 85,
    minAcademicScore: 50,
    maxHomeVisitGapDays: 60,
    requireConsentDoc: true
  });
  const [showConfigThresholds, setShowConfigThresholds] = useState(false);

  // Loaded/Mocked detailed datasets for the 360-degree profile
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([
    { date: '2026-07-15', status: 'Present', notes: 'Attended full day' },
    { date: '2026-07-14', status: 'Present', notes: 'Attended full day' },
    { date: '2026-07-13', status: 'Present', notes: 'Attended full day' },
    { date: '2026-07-10', status: 'Absent', notes: 'Malaria fever treatment' },
    { date: '2026-07-09', status: 'Absent', notes: 'Family emergency' },
    { date: '2026-07-08', status: 'Absent', notes: 'No transport fees' },
    { date: '2026-07-07', status: 'Present', notes: 'Attended full day' },
    { date: '2026-07-06', status: 'Present', notes: 'Attended full day' }
  ]);

  const [supportRecords, setSupportRecords] = useState<any[]>([
    { term: 'Term 2, 2026', items: ['School Uniform (2 pairs)', 'Standard Stationery Kit', 'Daily Porridge Meal Plan'], status: 'Disbursed' },
    { term: 'Term 1, 2026', items: ['School Uniform (1 pair)', 'Core Primary Textbook Bundle', 'PTA Fee Scholarship Support'], status: 'Disbursed' },
    { term: 'Term 3, 2025', items: ['Math and Science Exercise Books', 'Daily Porridge Meal Plan'], status: 'Disbursed' }
  ]);

  const [visitLogs, setVisitLogs] = useState<any[]>([
    { date: '2026-06-18', worker: student.communityWorker || 'Florence Namatovu', observations: 'Slightly congested house in Gganda, mother has a small fruit stall. Child seems keen to read but lacks adequate lighting at night.', challenges: 'Water sanitation nearby is poor. Family needs study lamp.', referrals: 'Allocated solar-charged study lantern.' },
    { date: '2026-04-10', worker: student.communityWorker || 'Florence Namatovu', observations: 'Visibly healthy environment, guardian is supportive and tracks school report card actively.', challenges: 'None major.', referrals: 'Encouraged to continue regular attendance.' }
  ]);

  const [documents, setDocuments] = useState<any[]>([
    { id: 'doc-1', name: 'Parental Consent Form.pdf', category: 'Consent', size: '240 KB', dateAdded: '2025-01-15' },
    { id: 'doc-2', name: 'Birth Certificate Copied.jpg', category: 'Identification', size: '1.2 MB', dateAdded: '2025-01-15' },
    { id: 'doc-3', name: 'Scholarship Grant Agreement.pdf', category: 'Contract', size: '412 KB', dateAdded: '2025-02-10' }
  ]);

  const [historyLogs, setHistoryLogs] = useState<any[]>([
    { date: '2026-01-05', event: 'Promoted to Class ' + student.className, category: 'Academic', author: 'School Registrar' },
    { date: '2025-02-10', event: 'Scholarship Support Approved & Finalized', category: 'Support', author: 'Nansana Sponsorship Desk' },
    { date: '2025-01-15', event: 'Pupil Registered & Home Profile Intake Completed', category: 'Intake', author: student.communityWorker || 'Florence Namatovu' }
  ]);

  const [newDocName, setNewDocName] = useState('');
  const [newDocCat, setNewDocCat] = useState('Consent');

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;
    const newDoc = {
      id: 'doc-' + Date.now(),
      name: newDocName.trim() + '.pdf',
      category: newDocCat,
      size: '120 KB',
      dateAdded: new Date().toISOString().split('T')[0]
    };
    setDocuments(prev => [...prev, newDoc]);
    setNewDocName('');

    // Add to history
    setHistoryLogs(prev => [
      { date: new Date().toISOString().split('T')[0], event: `Uploaded document: ${newDoc.name} (${newDoc.category})`, category: 'Document', author: 'Current User' },
      ...prev
    ]);
  };

  const handleDeleteDocument = (id: string, name: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    setHistoryLogs(prev => [
      { date: new Date().toISOString().split('T')[0], event: `Removed document: ${name}`, category: 'Document', author: 'Current User' },
      ...prev
    ]);
  };

  if (!isOpen) return null;

  const [showQrModal, setShowQrModal] = useState(false);

  // Filter marks for this specific student
  const studentMarks = marks.filter(m => m.studentId === student.id);
  const avgAcademicScore = studentMarks.length > 0 
    ? Math.round(studentMarks.reduce((sum, m) => sum + m.score, 0) / studentMarks.length) 
    : 0;

  // Calculate dynamic warning checks
  const hasThreeConsecutiveAbsences = attendanceLogs.length >= 3 && 
    attendanceLogs.slice(0, 3).every(l => l.status === 'Absent');

  const attendanceRate = Math.round(
    (attendanceLogs.filter(l => l.status === 'Present').length / attendanceLogs.length) * 100
  ) || 92;

  const academicDrop = avgAcademicScore < thresholds.minAcademicScore && studentMarks.length > 0;
  
  // Calculate gap since last home visit
  const lastVisitDateStr = visitLogs.length > 0 ? visitLogs[0].date : null;
  const daysSinceLastVisit = lastVisitDateStr 
    ? Math.round((Date.now() - new Date(lastVisitDateStr).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const isVisitOverdue = daysSinceLastVisit > thresholds.maxHomeVisitGapDays;

  const missingGuardianContact = !student.guardianContact || student.guardianContact.trim().length < 5;
  const missingConsentDoc = thresholds.requireConsentDoc && !documents.some(d => d.category === 'Consent');

  // Compile specific Early-Warning alert messages
  const redAlerts: string[] = [];
  const orangeAlerts: string[] = [];

  if (hasThreeConsecutiveAbsences) {
    redAlerts.push(`Missed ${thresholds.consecutiveAbsences}+ consecutive school days (Intensive case intervention required)`);
  }
  if (attendanceRate < thresholds.minAttendanceRate) {
    redAlerts.push(`Overall Attendance is ${attendanceRate}% (Below acceptable threshold of ${thresholds.minAttendanceRate}%)`);
  }
  if (academicDrop) {
    orangeAlerts.push(`Academic Performance Average is ${avgAcademicScore}% (Below safety benchmark of ${thresholds.minAcademicScore}%)`);
  }
  if (isVisitOverdue) {
    orangeAlerts.push(`Community Worker visit is overdue (${daysSinceLastVisit} days since last physical home log)`);
  }
  if (missingGuardianContact) {
    redAlerts.push(`CRITICAL: Guardian contact mobile number is completely missing or invalid`);
  }
  if (missingConsentDoc) {
    orangeAlerts.push(`Missing signed Parental/Guardian legal Consent Form`);
  }

  // Final early warning status
  const overallSafetyStatus: 'Red' | 'Orange' | 'Green' = 
    redAlerts.length > 0 ? 'Red' : 
    orangeAlerts.length > 0 ? 'Orange' : 'Green';

  // Calculate student age
  const calculateAge = (dobString: string) => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl border border-slate-100 w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200">
        
        {/* Header section with closing button */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#0b2d59] text-white rounded-t-3xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl">
              <Activity className="h-6 w-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-amber-400 text-slate-900 rounded-full">360° Profile Matrix</span>
                <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full ${
                  overallSafetyStatus === 'Red' ? 'bg-rose-500 text-white animate-bounce' :
                  overallSafetyStatus === 'Orange' ? 'bg-amber-500 text-slate-900' :
                  'bg-emerald-500 text-white'
                }`}>
                  {overallSafetyStatus === 'Red' ? '🚨 RED: URGENT INTERVENTION' : 
                   overallSafetyStatus === 'Orange' ? '⚠️ ORANGE: RECOVERY FOLLOW-UP' : 
                   '✅ GREEN: PROGRESSING NORMALLY'}
                </span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight mt-1 uppercase">
                {student.surname} {student.otherNames}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm border border-indigo-400/30"
              title="Print CSS-friendly 1-page summary sheet for student record"
            >
              <Printer className="h-3.5 w-3.5 text-amber-300" />
              <span>Print Summary Sheet</span>
            </button>
            <button
              onClick={() => setShowQrModal(true)}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <QrCode className="h-3.5 w-3.5 text-slate-900" />
              <span>Digital QR Code</span>
            </button>
            <button
              onClick={() => setShowConfigThresholds(!showConfigThresholds)}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/5"
            >
              Configure Alarm Thresholds
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/15 text-white/80 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Alarm thresholds configuration panel overlay */}
        {showConfigThresholds && (
          <div className="bg-amber-50 border-b border-amber-200 p-5 shrink-0 grid grid-cols-2 md:grid-cols-5 gap-4 text-xs text-slate-700 font-sans z-20">
            <div>
              <label className="block font-bold text-slate-600 mb-1">Consecutive Absences</label>
              <input 
                type="number" 
                value={thresholds.consecutiveAbsences} 
                onChange={(e) => setThresholds(prev => ({...prev, consecutiveAbsences: parseInt(e.target.value) || 3}))}
                className="w-full p-2 border border-amber-200 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Min Attendance (%)</label>
              <input 
                type="number" 
                value={thresholds.minAttendanceRate} 
                onChange={(e) => setThresholds(prev => ({...prev, minAttendanceRate: parseInt(e.target.value) || 85}))}
                className="w-full p-2 border border-amber-200 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Min Exam Avg (%)</label>
              <input 
                type="number" 
                value={thresholds.minAcademicScore} 
                onChange={(e) => setThresholds(prev => ({...prev, minAcademicScore: parseInt(e.target.value) || 50}))}
                className="w-full p-2 border border-amber-200 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Max Visit Gap (Days)</label>
              <input 
                type="number" 
                value={thresholds.maxHomeVisitGapDays} 
                onChange={(e) => setThresholds(prev => ({...prev, maxHomeVisitGapDays: parseInt(e.target.value) || 60}))}
                className="w-full p-2 border border-amber-200 rounded-lg bg-white"
              />
            </div>
            <div className="col-span-2 md:col-span-1 flex items-end">
              <button 
                onClick={() => setShowConfigThresholds(false)}
                className="w-full py-2 bg-amber-600 text-white rounded-lg font-black uppercase text-[10px] tracking-wider hover:bg-amber-700"
              >
                Apply Thresholds
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation links */}
        <div className="flex bg-slate-50 border-b border-slate-100 p-1.5 shrink-0 overflow-x-auto gap-1 font-sans">
          {[
            { id: 'overview', name: 'Overview', icon: User },
            { id: 'academics', name: 'Academics', icon: GraduationCap },
            { id: 'attendance', name: 'Attendance', icon: Calendar },
            { id: 'support', name: 'Support', icon: Smile },
            { id: 'community', name: 'Community', icon: HeartHandshake },
            { id: 'guardians', name: 'Guardians', icon: Phone },
            { id: 'health', name: 'Health', icon: Heart },
            { id: 'documents', name: 'Documents', icon: FileText },
            { id: 'history', name: 'History', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase rounded-lg transition-all cursor-pointer shrink-0 ${
                  isSel 
                    ? 'bg-indigo-600 text-white shadow-sm font-black' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Modal body Content area (scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* Active warnings and alarming signals */}
          {(redAlerts.length > 0 || orangeAlerts.length > 0) && (
            <div className="mb-6 bg-white border border-rose-100 rounded-2xl p-4 shadow-sm space-y-2">
              <h3 className="text-xs font-black text-rose-700 flex items-center gap-1.5 uppercase tracking-wide">
                <ShieldAlert className="h-4.5 w-4.5 text-rose-500 animate-bounce" />
                Early-Warning Signals Flagged
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                {redAlerts.map((alt, i) => (
                  <div key={i} className="flex items-start gap-1.5 bg-rose-50/70 border border-rose-100 p-2 rounded-xl text-rose-700 font-bold">
                    <span className="w-2 h-2 mt-1 bg-red-600 rounded-full animate-ping shrink-0" />
                    <span>{alt}</span>
                  </div>
                ))}
                {orangeAlerts.map((alt, i) => (
                  <div key={i} className="flex items-start gap-1.5 bg-amber-50/70 border border-amber-100 p-2 rounded-xl text-amber-700 font-bold">
                    <span className="w-2 h-2 mt-1 bg-amber-500 rounded-full shrink-0" />
                    <span>{alt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Profile Card left */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center flex flex-col items-center">
                <div className="h-36 w-36 bg-slate-100 rounded-3xl overflow-hidden border border-slate-150 shadow-inner relative">
                  {student.photo ? (
                    <img src={student.photo} alt={student.surname} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-indigo-50 text-indigo-700 text-3xl font-black uppercase">
                      {student.surname[0]}{student.otherNames[0]}
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-black text-[#032b5e] uppercase mt-4">
                  {student.surname} {student.otherNames}
                </h3>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-full mt-1.5">
                  ID: {student.id} | {student.className} Pupil
                </span>

                <div className="w-full grid grid-cols-2 gap-3 mt-6 text-left">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide block">Gender</span>
                    <span className="text-xs font-bold text-slate-700">{student.gender}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide block">Calculated Age</span>
                    <span className="text-xs font-bold text-slate-700">{calculateAge(student.dateOfBirth)} Years</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide block">Nansana Zone</span>
                    <span className="text-xs font-bold text-slate-700 truncate block">{student.zoneInNansana || 'Gganda'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide block">Sponsorship</span>
                    <span className="text-xs font-bold text-slate-700 block">{student.hasScholarship ? 'On Scholarship' : 'Self-Sponsored'}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="w-full mt-4 py-2.5 px-4 bg-[#0b2d59] hover:bg-indigo-900 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                >
                  <QrCode className="h-4 w-4 text-amber-400" />
                  <span>View Student QR Pass & Link</span>
                </button>
              </div>

              {/* Bento cards details */}
              <div className="md:col-span-2 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1.5">
                    <div className="flex items-center gap-2 text-[#032b5e]">
                      <GraduationCap className="h-5 w-5" />
                      <h4 className="text-xs font-black uppercase tracking-wide">Academics Status</h4>
                    </div>
                    <p className="text-xs text-slate-500">Overall academic average across assessed terms.</p>
                    <div className="flex items-baseline gap-2 pt-2">
                      <span className="text-3xl font-black text-indigo-600">{avgAcademicScore}%</span>
                      <span className="text-[10px] font-bold text-slate-400">Average Score</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Calendar className="h-5 w-5" />
                      <h4 className="text-xs font-black uppercase tracking-wide">Attendance Matrix</h4>
                    </div>
                    <p className="text-xs text-slate-500">Calculated attendance logging rate this term.</p>
                    <div className="flex items-baseline gap-2 pt-2">
                      <span className="text-3xl font-black text-emerald-600">{attendanceRate}%</span>
                      <span className="text-[10px] font-bold text-slate-400">Regularity Status</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                  <h3 className="text-xs font-black text-[#032b5e] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
                    <HeartHandshake className="h-4 w-4 text-indigo-500" />
                    Community Support Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Assigned Worker</span>
                      <span className="font-bold text-slate-800">{student.communityWorker || 'Florence Namatovu'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Worker Phone</span>
                      <span className="font-bold text-slate-800">{student.workerContact || '+256 772 112233'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Last Home Visitation Log</span>
                      <span className="font-bold text-slate-800">{visitLogs[0]?.date || 'None recorded'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Follow-Up Recommended</span>
                      <span className="font-bold text-slate-800">{visitLogs[0]?.followUpDate || 'None pending'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACADEMICS */}
          {activeTab === 'academics' && (() => {
            // Group and sort marks chronologically
            const uniqueTermYears = Array.from(
              new Set(studentMarks.map(m => `${m.year}-T${m.term}`))
            ).map(key => {
              const [year, termStr] = key.split('-T');
              return {
                key,
                year: parseInt(year),
                term: parseInt(termStr),
                label: `Term ${termStr} (${year})`,
                shortLabel: `T${termStr} '${year.toString().slice(-2)}`
              };
            }).sort((a, b) => {
              if (a.year !== b.year) return a.year - b.year;
              return a.term - b.term;
            });

            const uniqueSubjects = Array.from(new Set(studentMarks.map(m => m.subject)));

            const chartData = uniqueTermYears.map(ty => {
              const dataPoint: any = {
                name: ty.shortLabel,
                fullName: ty.label,
                year: ty.year,
                term: ty.term,
              };

              // Find marks for this term and year
              const tyMarks = studentMarks.filter(m => m.year === ty.year && m.term === ty.term);
              
              let sum = 0;
              let count = 0;

              tyMarks.forEach(m => {
                dataPoint[m.subject] = m.score;
                sum += m.score;
                count++;
              });

              if (count > 0) {
                dataPoint['Overall Average'] = Math.round(sum / count);
              }

              return dataPoint;
            });

            // Color palette mapping
            const SUBJECT_COLORS: Record<string, string> = {
              'Mathematics': '#6366f1', // indigo-500
              'English': '#06b6d4',     // cyan-500
              'Science': '#10b981',     // emerald-500
              'Social Studies': '#f59e0b', // amber-500
              'R.E': '#ec4899',         // pink-500
              'Luganda': '#8b5cf6',     // purple-500
              'Primary Mathematics': '#6366f1',
              'English Language': '#06b6d4',
              'Integrated Science': '#10b981',
              'Social Studies (SST)': '#f59e0b',
              'Overall Average': '#334155' // slate-700 for average line
            };
            const COLOR_PALETTE = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#14b8a6'];

            // Support Needs Diagnostics
            const supportDiagnoses = uniqueSubjects.map(sub => {
              const subMarks = studentMarks
                .filter(m => m.subject === sub)
                .sort((a, b) => {
                  if (a.year !== b.year) return a.year - b.year;
                  return a.term - b.term;
                });
              if (subMarks.length === 0) return null;

              const latest = subMarks[subMarks.length - 1];
              const previous = subMarks.length > 1 ? subMarks[subMarks.length - 2] : null;

              const isBelowThreshold = latest.score < thresholds.minAcademicScore;
              const isDeclining = previous ? latest.score < previous.score : false;
              const scoreDiff = previous ? latest.score - previous.score : 0;

              return {
                subject: sub,
                latestScore: latest.score,
                previousScore: previous ? previous.score : null,
                isBelowThreshold,
                isDeclining,
                scoreDiff,
                latestTermLabel: `Term ${latest.term} (${latest.year})`
              };
            }).filter(Boolean) as any[];

            const flaggedNeeds = supportDiagnoses.filter(d => d.isBelowThreshold || d.isDeclining);

            return (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                  <div>
                    <h3 className="text-sm font-black text-[#032b5e] uppercase">Academic Performance & Progress Analytics</h3>
                    <p className="text-xs text-slate-400 mt-1">Multi-term tracking line charts to help teachers and community workers identify students in need of academic support.</p>
                  </div>
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <div className="p-3 bg-indigo-50 rounded-2xl text-center min-w-[100px]">
                      <span className="text-[10px] text-indigo-400 font-bold block uppercase tracking-wide">Overall Average</span>
                      <span className="text-2xl font-black text-indigo-700">{avgAcademicScore}%</span>
                    </div>
                  </div>
                </div>

                {studentMarks.length === 0 ? (
                  <div className="text-center py-10">
                    <GraduationCap className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-bold">No academic evaluation logs found for this pupil.</p>
                  </div>
                ) : (
                  <>
                    {/* Visual Analytics / Recharts Line Chart Block */}
                    <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                            <TrendingUp className="h-4 w-4 text-indigo-500" />
                            Subject-Specific Performance Trend
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Plotting scores (0 - 100%) across academic evaluations.</p>
                        </div>

                        {/* Subject Filter Dropdown Selector */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-slate-400">View focus:</span>
                          <select
                            value={selectedSubjectFilter}
                            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                            className="text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer animate-none"
                          >
                            <option value="all">All Subjects & Avg</option>
                            <option value="average-only">Overall Average Only</option>
                            {uniqueSubjects.map(sub => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Recharts Chart Container */}
                      <div className="h-72 w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={chartData}
                            margin={{ top: 10, right: 20, left: -15, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis 
                              domain={[0, 100]} 
                              tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                              axisLine={false}
                              tickLine={false}
                              tickCount={6}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1e293b', 
                                border: 'none', 
                                borderRadius: '16px', 
                                color: '#f8fafc',
                                fontSize: '11px',
                                fontFamily: 'sans-serif',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
                              }}
                              itemStyle={{ padding: '2px 0' }}
                            />
                            <Legend 
                              verticalAlign="top" 
                              height={36}
                              iconType="circle"
                              iconSize={8}
                              wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', fill: '#475569' }}
                            />
                            
                            {/* Overall Average Line */}
                            {(selectedSubjectFilter === 'all' || selectedSubjectFilter === 'average-only') && (
                              <Line
                                type="monotone"
                                dataKey="Overall Average"
                                stroke={SUBJECT_COLORS['Overall Average']}
                                strokeWidth={3}
                                activeDot={{ r: 6 }}
                                name="Overall Average"
                                strokeDasharray="4 4"
                              />
                            )}

                            {/* Subjects Lines */}
                            {uniqueSubjects.map((sub, idx) => {
                              // If filter is specific subject, only draw that. If average-only, don't draw any. If all, draw all.
                              if (selectedSubjectFilter !== 'all' && selectedSubjectFilter !== sub) {
                                return null;
                              }
                              const strokeColor = SUBJECT_COLORS[sub] || COLOR_PALETTE[idx % COLOR_PALETTE.length];
                              return (
                                <Line
                                  key={sub}
                                  type="monotone"
                                  dataKey={sub}
                                  stroke={strokeColor}
                                  strokeWidth={2.5}
                                  dot={{ r: 4, strokeWidth: 1.5 }}
                                  activeDot={{ r: 6 }}
                                  name={sub}
                                  connectNulls
                                />
                              );
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Support Needs Warnings Block */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="md:col-span-2 bg-indigo-50/40 border border-indigo-100 rounded-3xl p-5 space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-xl">
                            <Info className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-[#032b5e] uppercase tracking-wide">Academic Diagnostic Report</h4>
                            <p className="text-[10px] text-slate-400">Assigned worker & teacher evaluation checklist based on multi-term trends.</p>
                          </div>
                        </div>

                        {flaggedNeeds.length === 0 ? (
                          <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                            <div className="text-xs">
                              <p className="font-extrabold text-slate-800">Excellent Standing!</p>
                              <p className="text-slate-400 font-medium">This pupil maintains scores consistently above the {thresholds.minAcademicScore}% benchmark in all recorded subjects.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-56 overflow-y-auto">
                            {flaggedNeeds.map((need, idx) => (
                              <div key={idx} className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${
                                need.isBelowThreshold 
                                  ? 'bg-rose-50/50 border-rose-200/50 hover:border-rose-300' 
                                  : 'bg-amber-50/50 border-amber-200/50 hover:border-amber-300'
                              }`}>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black text-slate-800 uppercase">{need.subject}</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                      need.isBelowThreshold 
                                        ? 'bg-rose-100 text-rose-700' 
                                        : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {need.isBelowThreshold ? 'Below Threshold' : 'Declining Trend'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                    Latest score is <strong className="font-bold text-slate-700">{need.latestScore}%</strong> in {need.latestTermLabel}.
                                    {need.previousScore && (
                                      <span> Previously was <strong className="font-bold text-slate-700">{need.previousScore}%</strong> (Change: {need.scoreDiff > 0 ? `+${need.scoreDiff}` : need.scoreDiff}%).</span>
                                    )}
                                  </p>
                                </div>
                                <div className="text-left sm:text-right shrink-0">
                                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Recommended Action</span>
                                  <span className="text-[10px] font-black text-indigo-700 block mt-0.5">
                                    {need.isBelowThreshold ? '🚨 Remedial Tutoring Required' : '⚠️ Monitor Next Assessment'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Intervention Suggestions Card */}
                      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1">
                            <Heart className="h-4 w-4 text-rose-500 animate-pulse" />
                            Academic Support Actions
                          </h4>
                          <p className="text-[10px] text-slate-400">Empower community workers and teachers with structural intervention tactics.</p>
                        </div>

                        <ul className="space-y-2 text-[11px] text-slate-600 font-semibold flex-1">
                          <li className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                            <span>Notify {student.guardianName || 'Guardian'} regarding specific subjects of concern.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                            <span>Coordinate home visitation with {student.communityWorker || 'Florence Namatovu'} to assess study conditions.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                            <span>Enroll in the upcoming term's weekend remedial sessions held at Nansana Community Center.</span>
                          </li>
                        </ul>

                        <div className="pt-2 border-t border-slate-200/50">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Intake Lead</span>
                          <span className="text-xs font-bold text-[#032b5e]">{student.communityWorker || 'Florence Namatovu'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Marks Registry Table */}
                    <div className="space-y-3 pt-4 border-t border-slate-150">
                      <div>
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">Historical Marks Ledger</h4>
                        <p className="text-[10px] text-slate-400">Comprehensive raw scores and corresponding evaluation metadata.</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-150 text-slate-500 uppercase font-black text-[10px] tracking-wider">
                              <th className="pb-3">Subject</th>
                              <th className="pb-3">Score</th>
                              <th className="pb-3">Grade</th>
                              <th className="pb-3">Term / Year</th>
                              <th className="pb-3">Teacher In-Charge</th>
                              <th className="pb-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                            {studentMarks.map((mark) => {
                              let grade = 'F9';
                              let color = 'text-red-500';
                              if (mark.score >= 90) { grade = 'D1'; color = 'text-emerald-600 font-black'; }
                              else if (mark.score >= 80) { grade = 'D2'; color = 'text-emerald-500'; }
                              else if (mark.score >= 75) { grade = 'C3'; color = 'text-blue-600'; }
                              else if (mark.score >= 70) { grade = 'C4'; color = 'text-blue-500'; }
                              else if (mark.score >= 65) { grade = 'C5'; color = 'text-indigo-500'; }
                              else if (mark.score >= 60) { grade = 'C6'; color = 'text-indigo-400'; }
                              else if (mark.score >= 50) { grade = 'P7'; color = 'text-amber-600'; }
                              else if (mark.score >= 40) { grade = 'P8'; color = 'text-amber-500'; }

                              return (
                                <tr key={mark.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-3.5 font-bold text-slate-900">{mark.subject}</td>
                                  <td className="py-3.5 font-mono font-bold text-slate-800">{mark.score} / 100</td>
                                  <td className={`py-3.5 font-black uppercase text-xs ${color}`}>{grade}</td>
                                  <td className="py-3.5">Term {mark.term} ({mark.year})</td>
                                  <td className="py-3.5">{mark.teacherName}</td>
                                  <td className="py-3.5">
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded text-[9px] font-bold">Approved</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* TAB 3: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center flex flex-col justify-center space-y-2">
                <span className="text-5xl font-black text-emerald-600">{attendanceRate}%</span>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Termly Attendance Rate</h4>
                <p className="text-[11px] text-slate-400">Based on dynamic daily registry sync with class teacher.</p>
                <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-2 text-left">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Present Days</span>
                    <span className="text-sm font-black text-emerald-600">142 Days</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Absences</span>
                    <span className="text-sm font-black text-rose-500">12 Days</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-[#032b5e] uppercase tracking-wider border-b border-slate-50 pb-2">Recent Daily Attendance Logs</h3>
                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {attendanceLogs.map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl transition-all">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${log.status === 'Present' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                        <div>
                          <p className="text-xs font-extrabold text-slate-800">{log.date}</p>
                          <p className="text-[10px] text-slate-400">{log.notes}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${log.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SUPPORT */}
          {activeTab === 'support' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-black text-[#032b5e] uppercase">Sponsorship & Support Materials Ledger</h3>
                  <p className="text-xs text-slate-400 mt-1">Tracks student aid including meals, uniforms, books, and scholarship coverage.</p>
                </div>
                <span className="px-2.5 py-1 bg-yellow-400 text-white rounded text-[10px] font-black uppercase">
                  {student.hasScholarship ? 'Active Sponsor Plan' : 'Self-Financed'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {supportRecords.map((rec, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 p-5 rounded-3xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-indigo-700 uppercase tracking-wide">{rec.term}</h4>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-bold uppercase">{rec.status}</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600 font-medium">
                      {rec.items.map((item: string, j: number) => (
                        <li key={j} className="flex items-center gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: COMMUNITY */}
          {activeTab === 'community' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-black text-[#032b5e] uppercase">Home Visitations & Family Environment Logs</h3>
                <p className="text-xs text-slate-400 mt-1">Physical assessment logs registered by assigned community workers in Nansana.</p>
              </div>

              <div className="space-y-4">
                {visitLogs.map((log, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 p-5 rounded-3xl space-y-3 relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-indigo-600 font-black uppercase block">Visitation Completed</span>
                        <span className="text-xs font-bold text-slate-800 font-mono">{log.date}</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-lg">
                        Worker: {log.worker}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mt-2 pt-2 border-t border-slate-200/50">
                      <div>
                        <span className="font-extrabold text-slate-500 uppercase block text-[9px] tracking-wide mb-0.5">Physical Observations</span>
                        <p className="text-slate-700 font-medium leading-relaxed">{log.observations}</p>
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-500 uppercase block text-[9px] tracking-wide mb-0.5">Key Challenges Identifed</span>
                        <p className="text-slate-700 font-medium leading-relaxed">{log.challenges}</p>
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-500 uppercase block text-[9px] tracking-wide mb-0.5">Action & Referrals</span>
                        <p className="text-slate-700 font-medium leading-relaxed">{log.referrals}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: GUARDIANS */}
          {activeTab === 'guardians' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-black text-[#032b5e] uppercase">Guardian & Emergency Contacts</h3>
                <p className="text-xs text-slate-400 mt-1">Intended parents or guardians authorized as primary emergency lines.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-2.5">
                  <h4 className="font-black text-[#032b5e] uppercase tracking-wide border-b border-slate-200/60 pb-1.5">Primary Guardian</h4>
                  <div className="space-y-1.5">
                    <p className="flex justify-between font-medium">
                      <span className="text-slate-400">Full Name:</span>
                      <span className="font-bold text-slate-800">{student.guardianName}</span>
                    </p>
                    <p className="flex justify-between font-medium">
                      <span className="text-slate-400">Mobile Phone:</span>
                      <span className="font-bold text-slate-850 font-mono">{student.guardianContact || 'Missing!'}</span>
                    </p>
                    <p className="flex justify-between font-medium">
                      <span className="text-slate-400">Residential Address:</span>
                      <span className="font-bold text-slate-800">Nansana, Zone {student.zoneInNansana || 'Gganda'}</span>
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-2.5">
                  <h4 className="font-black text-[#032b5e] uppercase tracking-wide border-b border-slate-200/60 pb-1.5">Authorized Community Worker</h4>
                  <div className="space-y-1.5">
                    <p className="flex justify-between font-medium">
                      <span className="text-slate-400">Full Name:</span>
                      <span className="font-bold text-slate-800">{student.communityWorker || 'Florence Namatovu'}</span>
                    </p>
                    <p className="flex justify-between font-medium">
                      <span className="text-slate-400">Mobile Phone:</span>
                      <span className="font-bold text-slate-850 font-mono">{student.workerContact || '+256 772 112233'}</span>
                    </p>
                    <p className="flex justify-between font-medium">
                      <span className="text-slate-400">Case Allocation:</span>
                      <span className="font-bold text-slate-800">Nansana West & Gganda Node</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: HEALTH */}
          {activeTab === 'health' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-black text-[#032b5e] uppercase">Medical Records & Special Needs Information</h3>
                <p className="text-xs text-slate-400 mt-1">Sensitive student wellbeing ledger tracking medical parameters and chronic challenges.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Medical Conditions & Allergies</span>
                    <p className="font-bold text-slate-800">No known drug/food allergies reported during physical intake assessments.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Special Educational Needs (SEN)</span>
                    <p className="font-bold text-slate-800">Requires front-row classroom seating due to minor astigmatism visual observation.</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-3">
                  <h4 className="font-black text-[#032b5e] uppercase tracking-wide">Immunization Tracker</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="font-bold">Measles Vaccine</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded uppercase">Fully Certified</span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="font-bold">BCG Vaccine</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded uppercase">Fully Certified</span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="font-bold">Polio Vaccine (OPV)</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded uppercase">Fully Certified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                <div>
                  <h3 className="text-sm font-black text-[#032b5e] uppercase font-sans">Uploaded Legal & Academic Consent Documents</h3>
                  <p className="text-xs text-slate-400 mt-1">Secure repository of birth records, legal consent terms, and school agreements.</p>
                </div>

                <form onSubmit={handleAddDocument} className="flex gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="New document name (e.g. Immunization Card)"
                    required
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={newDocCat}
                    onChange={(e) => setNewDocCat(e.target.value)}
                    className="px-2 py-2 border border-slate-200 bg-white rounded-xl"
                  >
                    <option value="Consent">Consent</option>
                    <option value="Identification">Identification</option>
                    <option value="Contract">Contract</option>
                    <option value="Medical">Medical</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] cursor-pointer"
                  >
                    Add Doc
                  </button>
                </form>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-bold">
                  No uploaded documentation assets located in child folder.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center justify-between group hover:border-indigo-300 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                          <File className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-800 truncate uppercase">{doc.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{doc.category} | {doc.size}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteDocument(doc.id, doc.name)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 9: HISTORY */}
          {activeTab === 'history' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-black text-[#032b5e] uppercase">Student Audit History & Milestones Timeline</h3>
                <p className="text-xs text-slate-400 mt-1">Timeline logs recording transitions, Promotions, home visits, and support modifications.</p>
              </div>

              <div className="relative border-l-2 border-slate-150 pl-6 space-y-6 py-2 ml-4">
                {historyLogs.map((log, i) => (
                  <div key={i} className="relative">
                    <span className="absolute -left-10 top-1 w-8 h-8 rounded-full bg-indigo-50 border-2 border-slate-200 flex items-center justify-center text-indigo-600">
                      <Clock className="h-4 w-4" />
                    </span>
                    <div className="bg-slate-50 hover:bg-slate-100/80 p-4 rounded-2xl border border-slate-100 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold text-slate-500 gap-1 mb-1.5">
                        <span className="px-2 py-0.5 bg-white border border-slate-150 text-slate-600 rounded-md uppercase text-[9px]">
                          {log.category}
                        </span>
                        <span className="font-mono">{log.date}</span>
                      </div>
                      <p className="text-xs font-extrabold text-slate-850">{log.event}</p>
                      <p className="text-[10px] text-slate-400 mt-1">Registered by: {log.author}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal footer Section */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center rounded-b-3xl shrink-0 text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider px-6">
          <span>Ashinaga Child Protection Register</span>
          <span>Nansana District Node Sync Active</span>
        </div>

      </div>

      {/* Unique Student QR Code Modal */}
      <StudentQrCodeModal
        student={student}
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        marks={marks}
      />

      {/* CSS-FRIENDLY PRINT-ONLY ONE-PAGE SUMMARY SHEET FOR STAFF */}
      <div className="print-only p-8 bg-white text-slate-900 font-sans text-xs leading-normal">
        {/* Printable Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex items-center gap-4">
            <AshinagaLogo size={56} />
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight text-slate-900">
                Ashinaga Uganda Rainbow House
              </h1>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                Terakoya Education Programme • Student 360° Summary Sheet
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white font-mono font-bold text-[10px] rounded uppercase">
              Official Student Record
            </span>
            <p className="text-[10px] font-mono text-slate-500 mt-1">
              Printed: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Top Profile Summary Grid */}
        <div className="grid grid-cols-12 gap-6 mb-6 pb-6 border-b border-slate-200">
          {/* Photo & ID */}
          <div className="col-span-3 flex flex-col items-center">
            <div className="h-28 w-28 rounded-xl border-2 border-slate-900 overflow-hidden bg-slate-100 flex items-center justify-center mb-2">
              {student.photo ? (
                <img src={student.photo} alt="Student" className="h-full w-full object-cover" />
              ) : (
                <span className="font-extrabold text-slate-400 text-xl">
                  {student.surname[0]}{student.otherNames[0]}
                </span>
              )}
            </div>
            <span className="font-mono font-bold text-[10px] text-slate-600">ID: {student.id}</span>
          </div>

          {/* Pupil Details */}
          <div className="col-span-5 space-y-2">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
              {student.surname} {student.otherNames}
            </h2>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <div><span className="font-bold text-slate-500">Class:</span> Class {student.className}</div>
              <div><span className="font-bold text-slate-500">Gender:</span> {student.gender}</div>
              <div><span className="font-bold text-slate-500">Date of Birth:</span> {student.dateOfBirth}</div>
              <div><span className="font-bold text-slate-500">Entry Year:</span> {student.yearOfEntry}</div>
              <div><span className="font-bold text-slate-500">Residency Zone:</span> {student.zoneInNansana}</div>
              <div>
                <span className="font-bold text-slate-500">Sponsorship:</span>{' '}
                <span className="font-bold text-amber-700">
                  {student.hasScholarship ? 'Scholarship Recipient' : 'Self-Supported'}
                </span>
              </div>
            </div>
          </div>

          {/* Guardian & Social Worker Contacts */}
          <div className="col-span-4 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-[10px]">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">
              Contacts & Outreach
            </h3>
            <div>
              <p className="font-bold text-slate-700">Guardian:</p>
              <p className="text-slate-900">{student.guardianName || 'N/A'}</p>
              <p className="font-mono text-slate-600">{student.guardianContact || 'N/A'}</p>
            </div>
            <div>
              <p className="font-bold text-slate-700">Community Social Worker:</p>
              <p className="text-slate-900">{student.communityWorker || 'Florence Namatovu'}</p>
              <p className="font-mono text-slate-600">{student.workerContact || '+256 772 112233'}</p>
            </div>
          </div>
        </div>

        {/* Academic History Table with BOT, MOT, EOT */}
        <div className="mb-6">
          <h3 className="font-black text-sm uppercase text-slate-900 tracking-wide mb-2">
            Academic Performance Summary (BOT, MOT, EOT Breakdown)
          </h3>
          <table className="w-full text-left border-collapse border border-slate-900 text-[11px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900 font-bold uppercase font-mono">
                <th className="border-r border-slate-900 p-2">Subject Name</th>
                <th className="border-r border-slate-900 p-2 text-center w-20">BOT (20%)</th>
                <th className="border-r border-slate-900 p-2 text-center w-20">MOT (30%)</th>
                <th className="border-r border-slate-900 p-2 text-center w-20">EOT (50%)</th>
                <th className="border-r border-slate-900 p-2 text-center w-24 font-black">Final (%)</th>
                <th className="border-r border-slate-900 p-2 text-center w-16">Grade</th>
                <th className="p-2">Assessment Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {['MATHEMATICS', 'ENGLISH LANGUAGE', 'INTEGRATED SCIENCE', 'SOCIAL STUDIES', 'RELIGIOUS EDUCATION'].map((subName, i) => {
                const matchingMark = studentMarks.find(m => m.subject.toLowerCase().replace(/\s+/g, '') === subName.toLowerCase().replace(/\s+/g, ''));
                const finalScore = matchingMark ? matchingMark.score : 65 + (i * 4);
                const bot = matchingMark?.botScore ?? Math.max(30, finalScore - 4);
                const mot = matchingMark?.motScore ?? Math.max(30, finalScore - 2);
                const eot = matchingMark?.eotScore ?? finalScore;

                const getGrade = (s: number) => {
                  if (s >= 90) return { code: 'D1', remark: 'Excellent' };
                  if (s >= 80) return { code: 'D2', remark: 'V. Good' };
                  if (s >= 70) return { code: 'C3', remark: 'Good' };
                  if (s >= 60) return { code: 'C4', remark: 'Fair' };
                  if (s >= 50) return { code: 'C6', remark: 'Fair' };
                  if (s >= 40) return { code: 'P8', remark: 'Aim Higher' };
                  return { code: 'F9', remark: 'Needs Improvement' };
                };
                const gr = getGrade(finalScore);

                return (
                  <tr key={subName}>
                    <td className="border-r border-slate-900 p-2 font-bold">{subName}</td>
                    <td className="border-r border-slate-900 p-2 text-center font-mono">{bot}</td>
                    <td className="border-r border-slate-900 p-2 text-center font-mono">{mot}</td>
                    <td className="border-r border-slate-900 p-2 text-center font-mono">{eot}</td>
                    <td className="border-r border-slate-900 p-2 text-center font-mono font-black">{finalScore}%</td>
                    <td className="border-r border-slate-900 p-2 text-center font-mono font-bold">{gr.code}</td>
                    <td className="p-2 font-medium">{gr.remark}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Overall Status & Signatures */}
        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-300">
          <div>
            <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider mb-1">
              Attendance & Social Support Summary
            </h4>
            <p className="text-[10px] text-slate-700">
              • Overall Attendance Rate: <strong className="text-slate-900">{attendanceRate}%</strong> ({attendanceLogs.filter(l => l.status === 'Present').length} days present)
            </p>
            <p className="text-[10px] text-slate-700">
              • Academic Performance Average: <strong className="text-slate-900">{avgAcademicScore}%</strong>
            </p>
            <p className="text-[10px] text-slate-700">
              • Disbursed Support: Uniforms, Textbook kit, Daily Porridge meal plan.
            </p>
          </div>

          <div className="border border-slate-900 p-3 rounded-lg text-[10px]">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-900 pb-1 mb-3">
              Official Administrative Verification
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500">Headteacher Signature:</p>
                <div className="h-6 border-b border-slate-400 mt-2"></div>
              </div>
              <div>
                <p className="text-slate-500">Date & Stamp:</p>
                <div className="h-6 border-b border-slate-400 mt-2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
