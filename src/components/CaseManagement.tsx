import React, { useState, useEffect } from 'react';
import { 
  Home, 
  ShieldAlert, 
  Calendar, 
  Plus, 
  Check, 
  X, 
  FileText, 
  AlertTriangle, 
  User, 
  Phone, 
  MapPin, 
  Lock, 
  FileSpreadsheet,
  Briefcase
} from 'lucide-react';
import { Student, ClassName } from '../types';

interface HomeVisit {
  id: string;
  studentId: string;
  date: string;
  observations: string;
  challenges: string;
  followUpDate: string;
  referrals: string;
}

interface SafeguardingConcern {
  id: string;
  studentId: string;
  date: string;
  concern: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'CRITICAL';
  actionTaken: string;
}

interface CaseManagementProps {
  students: Student[];
  teacherClasses: ClassName[];
  isAdmin: boolean;
}

export default function CaseManagement({ students, teacherClasses, isAdmin }: CaseManagementProps) {
  const [selectedClass, setSelectedClass] = useState<ClassName>('P.1');
  const [subTab, setSubTab] = useState<'visits' | 'safeguarding'>('visits');

  const [homeVisits, setHomeVisits] = useState<HomeVisit[]>([]);
  const [safeguarding, setSafeguarding] = useState<SafeguardingConcern[]>([]);

  // Modals state
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showSafeguardingModal, setShowSafeguardingModal] = useState(false);

  // Home Visit form
  const [visitStudentId, setVisitStudentId] = useState('');
  const [visitObservations, setVisitObservations] = useState('');
  const [visitChallenges, setVisitChallenges] = useState('');
  const [visitFollowUpDate, setVisitFollowUpDate] = useState('');
  const [visitReferrals, setVisitReferrals] = useState('');

  // Safeguarding form
  const [safeStudentId, setSafeStudentId] = useState('');
  const [safeConcern, setSafeConcern] = useState('');
  const [safeRiskLevel, setSafeRiskLevel] = useState<'Low' | 'Medium' | 'High' | 'CRITICAL'>('High');
  const [safeActionTaken, setSafeActionTaken] = useState('');

  const classesList: ClassName[] = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];

  // Fetch lists
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const [visRes, safeRes] = await Promise.all([
          fetch('/api/visits'),
          fetch('/api/safeguarding')
        ]);
        if (visRes.ok && safeRes.ok) {
          const visData = await visRes.json();
          const safeData = await safeRes.json();
          setHomeVisits(visData);
          setSafeguarding(safeData);
        }
      } catch (err) {
        console.log('Error fetching cases logs');
      }
    };
    fetchLogs();
  }, []);

  const hasAccessToClass = (c: ClassName) => {
    if (isAdmin) return true;
    return teacherClasses.includes(c);
  };

  const filteredStudents = students.filter(s => s.className === selectedClass);

  const handleAddHomeVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitStudentId) {
      alert('Please select a student');
      return;
    }

    const payload = {
      studentId: visitStudentId,
      date: new Date().toISOString().split('T')[0],
      observations: visitObservations,
      challenges: visitChallenges,
      followUpDate: visitFollowUpDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      referrals: visitReferrals
    };

    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        setHomeVisits(prev => [...prev, saved]);
        setShowVisitModal(false);
        // Reset form
        setVisitObservations('');
        setVisitChallenges('');
        setVisitFollowUpDate('');
        setVisitReferrals('');
      }
    } catch (err) {
      alert('Error saving home visit log.');
    }
  };

  const handleAddSafeguarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!safeStudentId) {
      alert('Please select a student');
      return;
    }

    const payload = {
      studentId: safeStudentId,
      date: new Date().toISOString().split('T')[0],
      concern: safeConcern,
      riskLevel: safeRiskLevel,
      actionTaken: safeActionTaken
    };

    try {
      const res = await fetch('/api/safeguarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        setSafeguarding(prev => [...prev, saved]);
        setShowSafeguardingModal(false);
        // Reset form
        setSafeConcern('');
        setSafeActionTaken('');
      }
    } catch (err) {
      alert('Error saving safeguarding incident report.');
    }
  };

  return (
    <div id="case_management_view" className="p-8 space-y-6 font-sans max-w-7xl mx-auto">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-150 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
            <Lock className="h-3 w-3 text-rose-500" /> Secure Child Safeguarding Ledger
          </div>
          <h1 className="font-display text-2xl font-black text-slate-800">Case & Social Work Management</h1>
          <p className="text-xs text-slate-400 mt-1">Authorized personnel only. Log community worker home visits and flag secure child protection issues.</p>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 self-start md:self-center">
          <button
            onClick={() => setSubTab('visits')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'visits'
                ? 'bg-white text-indigo-600 shadow-md font-black scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Home className="h-4 w-4" />
            <span>Home Visitation Logs</span>
          </button>
          <button
            onClick={() => setSubTab('safeguarding')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'safeguarding'
                ? 'bg-white text-indigo-600 shadow-md font-black scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-rose-500 animate-pulse" />
            <span>Safeguarding Incidents</span>
          </button>
        </div>
      </div>

      {/* Class Selector */}
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

      {subTab === 'visits' ? (
        <div className="space-y-6">
          {/* Action Header bar */}
          <div className="bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-400 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300">
            <div>
              <h2 className="text-lg font-black text-slate-800">Community Home Visit Reports</h2>
              <p className="text-xs text-slate-400 mt-0.5">Visits completed in Nansana zones. Notes family environment challenges and intervention suggestions.</p>
            </div>

            <button
              onClick={() => {
                if (filteredStudents.length > 0) {
                  setVisitStudentId(filteredStudents[0].id);
                }
                setShowVisitModal(true);
              }}
              disabled={filteredStudents.length === 0}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Log Home Visitation</span>
            </button>
          </div>

          {/* Visits Timeline */}
          {homeVisits.filter(v => filteredStudents.some(s => s.id === v.studentId)).length === 0 ? (
            <div className="bg-white py-16 text-center text-slate-400 text-xs rounded-3xl border-2 border-transparent">
              <FileText className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              No Home Visit logs recorded for Class {selectedClass} this term.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {homeVisits
                .filter(v => filteredStudents.some(s => s.id === v.studentId))
                .map(visit => {
                  const student = students.find(s => s.id === visit.studentId);
                  if (!student) return null;
                  return (
                    <div key={visit.id} className="vibrant-card p-6 space-y-4 relative">
                      <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Home className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-850 uppercase text-xs">{student.surname} {student.otherNames}</h4>
                            <span className="text-[10px] text-slate-400 block font-mono">{student.zoneInNansana} Residence</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                          Visited: {visit.date}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs text-slate-600">
                        <p className="leading-relaxed">
                          <strong className="text-slate-700 uppercase tracking-wider text-[10px] block mb-1">Observations:</strong>
                          {visit.observations}
                        </p>
                        <p className="leading-relaxed">
                          <strong className="text-slate-700 uppercase tracking-wider text-[10px] block mb-1 text-rose-600">Family Challenges:</strong>
                          {visit.challenges}
                        </p>
                        {visit.referrals && (
                          <p className="leading-relaxed">
                            <strong className="text-slate-700 uppercase tracking-wider text-[10px] block mb-1 text-emerald-600">Recommended Referrals:</strong>
                            {visit.referrals}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-50 flex justify-between items-center text-[10px] font-mono text-slate-400">
                        <span>Staff Assigned: {student.communityWorker || 'Officer'}</span>
                        <span className="text-amber-600 font-bold">Next Follow-Up: {visit.followUpDate}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Action Header bar */}
          <div className="bg-rose-50/50 p-6 rounded-3xl border-2 border-rose-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300">
            <div>
              <h2 className="text-lg font-black text-rose-800 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600" /> Secure Child Safeguarding Ledger
              </h2>
              <p className="text-xs text-rose-600/80 mt-0.5">Please record active child abuse, trauma, abandonment or serious medical issues instantly. Encrypted access.</p>
            </div>

            <button
              onClick={() => {
                if (filteredStudents.length > 0) {
                  setSafeStudentId(filteredStudents[0].id);
                }
                setShowSafeguardingModal(true);
              }}
              disabled={filteredStudents.length === 0}
              className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Report Safeguarding Incident</span>
            </button>
          </div>

          {/* Incidents listing */}
          {safeguarding.filter(s => filteredStudents.some(stu => stu.id === s.studentId)).length === 0 ? (
            <div className="bg-white py-16 text-center text-slate-400 text-xs rounded-3xl border-2 border-transparent">
              <Check className="h-10 w-10 mx-auto text-emerald-500 mb-2 bg-emerald-50 p-2 rounded-full" />
              Awesome! No open Safeguarding concern reports in Class {selectedClass}.
            </div>
          ) : (
            <div className="space-y-4">
              {safeguarding
                .filter(s => filteredStudents.some(stu => stu.id === s.studentId))
                .map(item => {
                  const student = students.find(s => s.id === item.studentId);
                  if (!student) return null;
                  return (
                    <div key={item.id} className="bg-white border-2 border-rose-200 p-6 rounded-3xl flex flex-col md:flex-row justify-between gap-6 hover:shadow-lg transition-all">
                      <div className="space-y-3.5 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            item.riskLevel === 'CRITICAL' ? 'bg-red-200 text-red-800 animate-pulse' :
                            item.riskLevel === 'High' ? 'bg-orange-100 text-orange-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {item.riskLevel} Severity Concern
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Date Filed: {item.date}</span>
                        </div>

                        <div>
                          <h4 className="text-base font-extrabold text-slate-900 uppercase">
                            Concern regarding: {student.surname} {student.otherNames}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 font-mono">Guardian: {student.guardianName} ({student.guardianContact})</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs text-slate-700 border border-slate-100">
                          <p className="leading-relaxed">
                            <strong className="text-slate-800 block uppercase tracking-wider text-[9px] mb-1">Details of Concern:</strong>
                            {item.concern}
                          </p>
                          <p className="leading-relaxed pt-2.5 border-t border-slate-200">
                            <strong className="text-slate-800 block uppercase tracking-wider text-[9px] mb-1 text-emerald-600">Immediate Action Taken:</strong>
                            {item.actionTaken}
                          </p>
                        </div>
                      </div>

                      <div className="md:w-56 text-[11px] text-slate-500 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-5 space-y-2.5 flex flex-col justify-between">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-700 uppercase text-[9px] tracking-wider">Social Officer Assigned</p>
                          <p className="text-slate-900 font-semibold">{student.communityWorker || 'Pending assignment'}</p>
                          <p className="text-slate-400 font-mono">{student.workerContact || 'No contact phone'}</p>
                        </div>

                        <div className="bg-indigo-50 p-3 rounded-xl flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5 text-indigo-600" />
                          <span className="text-[10px] text-indigo-700 font-bold uppercase leading-none">PDPO Legal Privacy Consent Obtained</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Home Visit Dialog Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative font-sans border border-slate-100">
            <button
              onClick={() => setShowVisitModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={handleAddHomeVisit} className="p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-display font-extrabold text-lg text-slate-800">Log Community Home Visit</h3>
                <p className="text-slate-400 text-xs mt-1">Record observations from the pupil's home environment.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Select Student *</label>
                <select
                  value={visitStudentId}
                  onChange={(e) => setVisitStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                  required
                >
                  {filteredStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.surname} {s.otherNames}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Observations *</label>
                <textarea
                  placeholder="e.g. Living environment is stable. Pupil has a designated study table."
                  value={visitObservations}
                  onChange={(e) => setVisitObservations(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none h-20 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Family Challenges *</label>
                <textarea
                  placeholder="e.g. Guardian lacks stable daily income. Food insecurity concerns."
                  value={visitChallenges}
                  onChange={(e) => setVisitChallenges(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-850 focus:outline-none h-20 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Follow-up Referrals / Action Items</label>
                <input
                  type="text"
                  placeholder="e.g. Referral to local clinic, extra books needed"
                  value={visitReferrals}
                  onChange={(e) => setVisitReferrals(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Next Follow-Up Date</label>
                <input
                  type="date"
                  value={visitFollowUpDate}
                  onChange={(e) => setVisitFollowUpDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowVisitModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md cursor-pointer"
                >
                  Save Log Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safeguarding Modal Form */}
      {showSafeguardingModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative font-sans border border-slate-100">
            <button
              onClick={() => setShowSafeguardingModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={handleAddSafeguarding} className="p-6 space-y-4">
              <div className="border-b border-rose-100 pb-3 text-rose-800">
                <h3 className="font-display font-extrabold text-lg flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-600 animate-pulse" /> File Safeguarding Report
                </h3>
                <p className="text-rose-600/85 text-xs mt-1">This report is confidential and protected by the PDPO Uganda legislation.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Target Pupil *</label>
                <select
                  value={safeStudentId}
                  onChange={(e) => setSafeStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-rose-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                  required
                >
                  {filteredStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.surname} {s.otherNames}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Risk Severity *</label>
                <select
                  value={safeRiskLevel}
                  onChange={(e) => setSafeRiskLevel(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-rose-500 rounded-xl text-xs text-slate-800 focus:outline-none font-bold"
                  required
                >
                  <option value="Low">Low Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="High">High Risk</option>
                  <option value="CRITICAL">CRITICAL URGENT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Safeguarding Incident / Concern *</label>
                <textarea
                  placeholder="e.g. Signs of severe malnutrition, trauma, or prolonged absence without notification."
                  value={safeConcern}
                  onChange={(e) => setSafeConcern(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-rose-500 rounded-xl text-xs text-slate-800 focus:outline-none h-20 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Immediate Actions Taken / Follow-ups *</label>
                <textarea
                  placeholder="e.g. Conducted a counselling session. Contacted the parish worker immediately."
                  value={safeActionTaken}
                  onChange={(e) => setSafeActionTaken(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-rose-500 rounded-xl text-xs text-slate-800 focus:outline-none h-20 resize-none"
                  required
                />
              </div>

              <div className="pt-4 border-t border-rose-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSafeguardingModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 shadow-md cursor-pointer"
                >
                  File Urgent Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
