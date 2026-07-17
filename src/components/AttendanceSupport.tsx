import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  HandHeart, 
  Check, 
  X, 
  AlertCircle, 
  Smile, 
  Plus, 
  Sparkles, 
  Coins, 
  Shirt, 
  BookOpen, 
  Utensils, 
  Activity, 
  HeartHandshake, 
  Compass, 
  UserCheck,
  Briefcase
} from 'lucide-react';
import { Student, ClassName } from '../types';

interface SupportRecord {
  id: string;
  studentId: string;
  type: string; // 'School Fees' | 'Uniforms & Shoes' | 'Books & Scholastic Materials' | 'Meals' | 'Medical Assistance' | 'Transport' | 'Counselling'
  amount: number;
  date: string;
  sponsor: string;
  approvedBy: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'sick' | 'late';
}

interface AttendanceSupportProps {
  students: Student[];
  teacherClasses: ClassName[];
  isAdmin: boolean;
}

export default function AttendanceSupport({ students, teacherClasses, isAdmin }: AttendanceSupportProps) {
  const [selectedClass, setSelectedClass] = useState<ClassName>('P.1');
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [subTab, setSubTab] = useState<'attendance' | 'support'>('attendance');

  // Load / Mock records
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [supportRecords, setSupportRecords] = useState<SupportRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State for new Support log
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [supportType, setSupportType] = useState<string>('School Fees');
  const [supportAmount, setSupportAmount] = useState<number>(50000); // UGX default estimate
  const [supportSponsor, setSupportSponsor] = useState<string>('Nansana Hope Foundation');
  const [supportApprovedBy, setSupportApprovedBy] = useState<string>('Headteacher');

  const classesList: ClassName[] = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];

  // Load from server or localStorage
  useEffect(() => {
    // Fetch records
    const fetchRecords = async () => {
      try {
        const [attRes, supRes] = await Promise.all([
          fetch('/api/attendance'),
          fetch('/api/support')
        ]);
        if (attRes.ok && supRes.ok) {
          const attData = await attRes.json();
          const supData = await supRes.json();
          setAttendance(attData);
          setSupportRecords(supData);
        }
      } catch (err) {
        // Fallback mock
        console.log('Using local fallback for attendance and support');
      }
    };
    fetchRecords();
  }, []);

  const hasAccessToClass = (c: ClassName) => {
    if (isAdmin) return true;
    return teacherClasses.includes(c);
  };

  const filteredStudents = students.filter(s => s.className === selectedClass);

  // Manage daily attendance changes locally before saving
  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent' | 'sick' | 'late') => {
    setAttendance(prev => {
      const existingIdx = prev.findIndex(r => r.studentId === studentId && r.date === currentDate);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], status };
        return updated;
      } else {
        return [...prev, { id: `att-${Date.now()}-${studentId}`, studentId, date: currentDate, status }];
      }
    });
  };

  const handleSaveAttendance = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Save current date's attendance list
      const recordsToSave = filteredStudents.map(student => {
        const rec = attendance.find(r => r.studentId === student.id && r.date === currentDate);
        return {
          studentId: student.id,
          date: currentDate,
          status: rec ? rec.status : 'present' // default present
        };
      });

      const res = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: recordsToSave })
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      alert('Error updating attendance logs on server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSupportRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      alert('Please select a student');
      return;
    }

    const newRecord = {
      studentId: selectedStudentId,
      type: supportType,
      amount: Number(supportAmount),
      date: new Date().toISOString().split('T')[0],
      sponsor: supportSponsor,
      approvedBy: supportApprovedBy
    };

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord)
      });
      if (res.ok) {
        const saved = await res.json();
        setSupportRecords(prev => [...prev, saved]);
        setShowSupportModal(false);
      }
    } catch (err) {
      alert('Error adding support record.');
    }
  };

  // Get current record status
  const getStatus = (studentId: string): 'present' | 'absent' | 'sick' | 'late' => {
    const rec = attendance.find(r => r.studentId === studentId && r.date === currentDate);
    return rec ? rec.status : 'present';
  };

  const getSupportTypeIcon = (type: string) => {
    switch (type) {
      case 'School Fees': return <Coins className="h-4 w-4 text-amber-600" />;
      case 'Uniforms & Shoes': return <Shirt className="h-4 w-4 text-emerald-600" />;
      case 'Books & Scholastic Materials': return <BookOpen className="h-4 w-4 text-indigo-600" />;
      case 'Meals': return <Utensils className="h-4 w-4 text-rose-600" />;
      case 'Medical Assistance': return <Activity className="h-4 w-4 text-sky-600" />;
      case 'Counselling': return <HeartHandshake className="h-4 w-4 text-purple-600" />;
      default: return <HandHeart className="h-4 w-4 text-slate-600" />;
    }
  };

  return (
    <div id="attendance_support_view" className="p-8 space-y-6 font-sans max-w-7xl mx-auto">
      {/* Header section with Android 16/Material Design vibe */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-150 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
            <Sparkles className="h-3 w-3 text-indigo-500 animate-spin" /> Child Welfare Engine
          </div>
          <h1 className="font-display text-2xl font-black text-slate-800">Attendance & Pupil Support</h1>
          <p className="text-xs text-slate-400 mt-1">Track daily school attendance and distribute crucial welfare items to registered children.</p>
        </div>

        {/* Tactile Pill Sub-Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 self-start md:self-center">
          <button
            onClick={() => setSubTab('attendance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'attendance'
                ? 'bg-white text-indigo-600 shadow-md font-black scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Daily Attendance</span>
          </button>
          <button
            onClick={() => setSubTab('support')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'support'
                ? 'bg-white text-indigo-600 shadow-md font-black scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <HandHeart className="h-4 w-4" />
            <span>Welfare & Material Support</span>
          </button>
        </div>
      </div>

      {/* Class Selector Row */}
      <div className="flex flex-wrap bg-slate-50 p-1.5 rounded-2xl gap-1 border border-slate-150">
        {classesList.map((c) => {
          const isSelected = selectedClass === c;
          const hasAccess = hasAccessToClass(c);
          return (
            <button
              key={c}
              onClick={() => {
                if (hasAccess) setSelectedClass(c);
              }}
              disabled={!hasAccess}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              Class {c} {!hasAccess && '🔒'}
            </button>
          );
        })}
      </div>

      {subTab === 'attendance' ? (
        <div className="space-y-6">
          {/* Calendar Picker & Controls Banner */}
          <div className="bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-400 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Attendance Date</span>
                <input 
                  type="date"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5 animate-pulse">
                  <Check className="h-4 w-4" /> Records Saved Successfully!
                </span>
              )}
              <button
                onClick={handleSaveAttendance}
                disabled={isSaving || filteredStudents.length === 0}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isSaving ? 'Saving Roster...' : 'Save Roster'}
              </button>
            </div>
          </div>

          {/* Attendance Roster list */}
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-transparent py-16 text-center text-slate-400 text-xs">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              No pupils registered in {selectedClass} yet.
            </div>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 uppercase font-black tracking-wider border-b border-slate-100">
                      <th className="px-6 py-4">Pupil Profile</th>
                      <th className="px-6 py-4">Current Status</th>
                      <th className="px-6 py-4 text-center">Daily Roll-Call Mark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map(student => {
                      const status = getStatus(student.id);
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-indigo-50 border overflow-hidden shrink-0">
                                {student.photo ? (
                                  <img src={student.photo} alt="Student" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-indigo-600 font-bold text-[11px]">
                                    {student.surname[0]}{student.otherNames[0]}
                                  </div>
                                )}
                              </div>
                              <div>
                                <strong className="text-slate-800 uppercase block">{student.surname} {student.otherNames}</strong>
                                <span className="text-[10px] text-slate-400 font-mono">Zone: {student.zoneInNansana}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wide ${
                              status === 'present' ? 'bg-green-100 text-green-700' :
                              status === 'absent' ? 'bg-red-100 text-red-700' :
                              status === 'sick' ? 'bg-amber-100 text-amber-700' :
                              'bg-sky-100 text-sky-700'
                            }`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex justify-center gap-1.5">
                              {[
                                { val: 'present', label: 'Present', color: 'hover:bg-green-500 hover:text-white border-green-200 text-green-700' },
                                { val: 'absent', label: 'Absent', color: 'hover:bg-red-500 hover:text-white border-red-200 text-red-700' },
                                { val: 'sick', label: 'Sick / Medical', color: 'hover:bg-amber-500 hover:text-white border-amber-200 text-amber-700' },
                                { val: 'late', label: 'Late', color: 'hover:bg-sky-500 hover:text-white border-sky-200 text-sky-700' }
                              ].map(btn => {
                                const active = status === btn.val;
                                return (
                                  <button
                                    key={btn.val}
                                    onClick={() => handleAttendanceChange(student.id, btn.val as any)}
                                    className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] uppercase transition-all duration-150 cursor-pointer ${btn.color} ${
                                      active 
                                        ? btn.val === 'present' ? 'bg-green-500 text-white shadow-sm' :
                                          btn.val === 'absent' ? 'bg-red-500 text-white shadow-sm' :
                                          btn.val === 'sick' ? 'bg-amber-500 text-white shadow-sm' :
                                          'bg-sky-500 text-white shadow-sm'
                                        : 'bg-white'
                                    }`}
                                  >
                                    {btn.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Material Support Stats & Trigger Panel */}
          <div className="bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-400 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300">
            <div>
              <h2 className="text-lg font-black text-slate-800">Welfare Log Ledger</h2>
              <p className="text-xs text-slate-400 mt-0.5">Record items disbursed such as school fees sponsorships, meals, school uniforms, transport, or books.</p>
            </div>

            <button
              onClick={() => {
                if (filteredStudents.length > 0) {
                  setSelectedStudentId(filteredStudents[0].id);
                }
                setShowSupportModal(true);
              }}
              disabled={filteredStudents.length === 0}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Log Support / Welfare Item</span>
            </button>
          </div>

          {/* Support record listing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {supportRecords.filter(r => filteredStudents.some(s => s.id === r.studentId)).length === 0 ? (
              <div className="bg-white p-12 text-center rounded-3xl border-2 border-transparent text-slate-400 text-xs md:col-span-2">
                <Smile className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                No support records logged for {selectedClass} this term. Click "Log Support" to start.
              </div>
            ) : (
              supportRecords
                .filter(r => filteredStudents.some(s => s.id === r.studentId))
                .map(rec => {
                  const student = students.find(s => s.id === rec.studentId);
                  if (!student) return null;
                  return (
                    <div key={rec.id} className="vibrant-card p-5 space-y-3.5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 h-16 w-16 bg-slate-50 rounded-bl-3xl flex items-center justify-center border-l border-b border-slate-100">
                        {getSupportTypeIcon(rec.type)}
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Welfare Disbursed</span>
                        <h4 className="text-base font-extrabold text-indigo-750 uppercase mt-0.5">{rec.type}</h4>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <div className="h-6 w-6 bg-slate-100 rounded overflow-hidden">
                            {student.photo && <img src={student.photo} alt="Pupil" className="h-full w-full object-cover" />}
                          </div>
                          <span className="text-xs font-bold text-slate-700 uppercase">{student.surname} {student.otherNames}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-3.5 border-t border-slate-100 text-slate-500 font-sans">
                        <p>Value: <span className="font-extrabold text-slate-800 font-mono">UGX {rec.amount.toLocaleString()}</span></p>
                        <p>Date: <span className="font-semibold text-slate-800">{rec.date}</span></p>
                        <p className="col-span-2 truncate">Sponsor: <span className="font-semibold text-slate-800">{rec.sponsor}</span></p>
                        <p className="col-span-2 truncate">Approved: <span className="font-semibold text-slate-800">{rec.approvedBy}</span></p>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Welfare Modal Dialog Form */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative font-sans border border-slate-100">
            <button
              onClick={() => setShowSupportModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={handleAddSupportRecord} className="p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-display font-extrabold text-lg text-slate-800">Record Support / Welfare</h3>
                <p className="text-slate-400 text-xs mt-1">Disburse items or fees sponsorship to Class {selectedClass} pupil.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Select Pupil *</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                  required
                >
                  {filteredStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.surname} {s.otherNames}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Support Item Type *</label>
                <select
                  value={supportType}
                  onChange={(e) => setSupportType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                  required
                >
                  <option value="School Fees">School Fees / Scholarship Payment</option>
                  <option value="Uniforms & Shoes">Uniforms & Shoes</option>
                  <option value="Books & Scholastic Materials">Books & Scholastic Materials</option>
                  <option value="Meals">Meals / Feeding Program</option>
                  <option value="Medical Assistance">Medical Assistance / Clinic Voucher</option>
                  <option value="Transport">Transport Fare</option>
                  <option value="Counselling">Counselling & Psychosocial support</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Estimated Value (UGX) *</label>
                <input
                  type="number"
                  value={supportAmount}
                  onChange={(e) => setSupportAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-850 focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Sponsor / Donor Partner *</label>
                <input
                  type="text"
                  value={supportSponsor}
                  onChange={(e) => setSupportSponsor(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Approved By *</label>
                <input
                  type="text"
                  value={supportApprovedBy}
                  onChange={(e) => setSupportApprovedBy(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSupportModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md cursor-pointer"
                >
                  Submit Disbursal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
