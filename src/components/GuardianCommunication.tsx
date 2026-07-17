import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  MessageSquare, 
  Calendar, 
  Send, 
  Users, 
  Check, 
  AlertCircle, 
  Clock, 
  Plus, 
  X,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { Student, ClassName } from '../types';

interface InteractionLog {
  id: string;
  studentId: string;
  date: string;
  type: 'Phone Call' | 'In-Person Meeting' | 'SMS Alert' | 'Home Visit Follow-up';
  guardianName: string;
  summary: string;
  actionRequired: string;
  loggedBy: string;
}

interface SMSLog {
  id: string;
  studentId: string;
  guardianName: string;
  phoneNumber: string;
  messageBody: string;
  status: 'Delivered' | 'Failed' | 'Sending';
  dateSent: string;
}

interface GuardianCommunicationProps {
  students: Student[];
}

export default function GuardianCommunication({ students }: GuardianCommunicationProps) {
  const [selectedClass, setSelectedClass] = useState<ClassName>('P.1');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [subTab, setSubTab] = useState<'interactions' | 'sms'>('interactions');

  const [interactions, setInteractions] = useState<InteractionLog[]>([]);
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);

  // Modals
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);

  // New Interaction state
  const [interType, setInterType] = useState<'Phone Call' | 'In-Person Meeting' | 'SMS Alert' | 'Home Visit Follow-up'>('Phone Call');
  const [interSummary, setInterSummary] = useState('');
  const [interAction, setInterAction] = useState('');
  const [interLoggedBy, setInterLoggedBy] = useState('Primary Class Teacher');

  // New SMS state
  const [smsTemplate, setSmsTemplate] = useState<string>('attendance');
  const [smsCustomBody, setSmsCustomBody] = useState('');
  const [smsStatusAlert, setSmsStatusAlert] = useState(false);

  const classesList: ClassName[] = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];
  const filteredStudents = students.filter(s => s.className === selectedClass);

  useEffect(() => {
    if (filteredStudents.length > 0) {
      setSelectedStudentId(filteredStudents[0].id);
    } else {
      setSelectedStudentId('');
    }
  }, [selectedClass]);

  // Load from API on mount
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const [intRes, smsRes] = await Promise.all([
          fetch('/api/interactions'),
          fetch('/api/sms')
        ]);
        if (intRes.ok && smsRes.ok) {
          const intData = await intRes.json();
          const smsData = await smsRes.json();
          setInteractions(intData);
          setSmsLogs(smsData);
        }
      } catch (err) {
        console.log('Error loading communication logs');
      }
    };
    fetchLogs();
  }, []);

  const activeStudent = students.find(s => s.id === selectedStudentId);

  // Pre-fill custom SMS body based on template
  useEffect(() => {
    if (!activeStudent) return;
    const guardian = activeStudent.guardianName || 'Guardian';
    const studentName = `${activeStudent.surname} ${activeStudent.otherNames}`;

    if (smsTemplate === 'attendance') {
      setSmsCustomBody(`Dear ${guardian}, your child ${studentName} was marked ABSENT today from Nansana School. Please contact the class teacher.`);
    } else if (smsTemplate === 'performance') {
      setSmsCustomBody(`Dear ${guardian}, Term 1 assessment marks for ${studentName} have been compiled. Please attend the report card distribution meeting.`);
    } else if (smsTemplate === 'fees') {
      setSmsCustomBody(`Dear ${guardian}, this is a reminder regarding the term sponsorship renewal / lunch program fees for ${studentName}. Thank you.`);
    } else {
      setSmsCustomBody('');
    }
  }, [smsTemplate, selectedStudentId]);

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    const payload = {
      studentId: selectedStudentId,
      date: new Date().toISOString().split('T')[0],
      type: interType,
      guardianName: student.guardianName || 'Parent / Guardian',
      summary: interSummary,
      actionRequired: interAction,
      loggedBy: interLoggedBy
    };

    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        setInteractions(prev => [saved, ...prev]);
        setShowInteractionModal(false);
        setInterSummary('');
        setInterAction('');
      }
    } catch (err) {
      alert('Error saving meeting log.');
    }
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !activeStudent) return;

    const payload = {
      studentId: selectedStudentId,
      guardianName: activeStudent.guardianName || 'Parent',
      phoneNumber: activeStudent.guardianContact || '+256 700 000000',
      messageBody: smsCustomBody,
      status: 'Delivered', // simulate successful EMIS broadcast
      dateSent: new Date().toISOString().split('T')[0]
    };

    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        setSmsLogs(prev => [saved, ...prev]);
        setSmsStatusAlert(true);
        setTimeout(() => {
          setSmsStatusAlert(false);
          setShowSMSModal(false);
        }, 1500);
      }
    } catch (err) {
      alert('Error recording SMS dispatch log.');
    }
  };

  return (
    <div id="guardian_communication_view" className="p-8 space-y-6 font-sans max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-150 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
            <Smartphone className="h-3 w-3 text-teal-500" /> Parent Portal Integration
          </div>
          <h1 className="font-display text-2xl font-black text-slate-800">Guardian Engagement Hub</h1>
          <p className="text-xs text-slate-400 mt-1">Track classroom engagement reports, record family visits / phone interactions, and dispatch official SMS notices.</p>
        </div>

        {/* Sub-Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 self-start md:self-center">
          <button
            onClick={() => setSubTab('interactions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'interactions'
                ? 'bg-white text-indigo-600 shadow-md font-black scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Parent Meetings & Logs</span>
          </button>
          <button
            onClick={() => setSubTab('sms')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'sms'
                ? 'bg-white text-indigo-600 shadow-md font-black scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>SMS Notification Dispatch</span>
          </button>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="flex flex-wrap bg-slate-50 p-1.5 rounded-2xl gap-1 border border-slate-150">
        {classesList.map((c) => {
          const isSelected = selectedClass === c;
          return (
            <button
              key={c}
              onClick={() => setSelectedClass(c)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Class {c}
            </button>
          );
        })}
      </div>

      {subTab === 'interactions' ? (
        <div className="space-y-6">
          {/* Action Header block */}
          <div className="bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-400 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300">
            <div>
              <h2 className="text-lg font-black text-slate-800">Meeting Logs & Phone Logs</h2>
              <p className="text-xs text-slate-400 mt-0.5">Maintain legal, structured interaction histories for registered guardians in Wakiso District.</p>
            </div>

            <button
              onClick={() => {
                if (filteredStudents.length > 0) {
                  setSelectedStudentId(filteredStudents[0].id);
                }
                setShowInteractionModal(true);
              }}
              disabled={filteredStudents.length === 0}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Log Parent Interaction</span>
            </button>
          </div>

          {/* List section */}
          {interactions.filter(i => filteredStudents.some(s => s.id === i.studentId)).length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-transparent py-16 text-center text-slate-400 text-xs">
              <PhoneCall className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              No guardian interactions registered for Class {selectedClass} this term.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {interactions
                .filter(i => filteredStudents.some(s => s.id === i.studentId))
                .map(item => {
                  const student = students.find(s => s.id === item.studentId);
                  if (!student) return null;
                  return (
                    <div key={item.id} className="vibrant-card p-6 space-y-4 relative">
                      <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            item.type === 'Phone Call' ? 'bg-indigo-50 text-indigo-700' :
                            item.type === 'In-Person Meeting' ? 'bg-emerald-50 text-emerald-700' :
                            item.type === 'SMS Alert' ? 'bg-sky-50 text-sky-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-400 font-black uppercase">PUPIL PROFILE</span>
                        <h4 className="text-sm font-extrabold text-slate-800 uppercase leading-none">{student.surname} {student.otherNames}</h4>
                        <p className="text-xs text-slate-500 font-medium">Guardian: <strong className="text-slate-700">{item.guardianName}</strong></p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl text-xs text-slate-600 space-y-2 border border-slate-100">
                        <p className="leading-relaxed">
                          <strong className="text-slate-800 uppercase tracking-wider text-[9px] block mb-1">Interaction Notes:</strong>
                          {item.summary}
                        </p>
                        {item.actionRequired && (
                          <p className="leading-relaxed pt-2.5 border-t border-slate-200">
                            <strong className="text-slate-800 uppercase tracking-wider text-[9px] block mb-1 text-indigo-600">Action Plan / Follow Up:</strong>
                            {item.actionRequired}
                          </p>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono text-right">
                        Logged by: {item.loggedBy}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Action Header block */}
          <div className="bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-400 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300">
            <div>
              <h2 className="text-lg font-black text-slate-800">SMS Outbox Broadcast History</h2>
              <p className="text-xs text-slate-400 mt-0.5">View and queue urgent EMIS SMS communications regarding school reports, fee updates or welfare issues.</p>
            </div>

            <button
              onClick={() => {
                if (filteredStudents.length > 0) {
                  setSelectedStudentId(filteredStudents[0].id);
                }
                setShowSMSModal(true);
              }}
              disabled={filteredStudents.length === 0}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
            >
              <Send className="h-4 w-4 animate-bounce" />
              <span>Compose & Dispatch SMS</span>
            </button>
          </div>

          {/* SMS History List */}
          {smsLogs.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-transparent py-16 text-center text-slate-400 text-xs">
              <MessageSquare className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              No SMS alerts sent today.
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase font-black tracking-wider border-b border-slate-100">
                    <th className="px-6 py-4">Recipient Guardian</th>
                    <th className="px-6 py-4">Contact Phone</th>
                    <th className="px-6 py-4">Message Context</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {smsLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <strong className="text-slate-800 uppercase block">{log.guardianName}</strong>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-500">
                        {log.phoneNumber}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 font-medium max-w-xs truncate" title={log.messageBody}>
                        {log.messageBody}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wide bg-green-150 text-green-700">
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-400 font-mono">
                        {log.dateSent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Interaction Modal Dialog Form */}
      {showInteractionModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setShowInteractionModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={handleAddInteraction} className="p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-display font-extrabold text-lg text-slate-800">Record Parent Interaction</h3>
                <p className="text-slate-400 text-xs mt-1">Log counseling discussions, financial or academic reports.</p>
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
                <label className="block text-xs font-bold text-slate-500 mb-1">Interaction Type *</label>
                <select
                  value={interType}
                  onChange={(e) => setInterType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-850 focus:outline-none"
                  required
                >
                  <option value="Phone Call">Phone Call Discussion</option>
                  <option value="In-Person Meeting">In-Person School Meeting</option>
                  <option value="SMS Alert">SMS Alert & Request</option>
                  <option value="Home Visit Follow-up">Home Visit Follow-up</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Conversation Notes *</label>
                <textarea
                  placeholder="e.g. Guardian confirmed scholarship support application forms were signed."
                  value={interSummary}
                  onChange={(e) => setInterSummary(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none h-24 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Follow-up Action Plan</label>
                <input
                  type="text"
                  placeholder="e.g. Expecting guardian to submit passport photos next Monday."
                  value={interAction}
                  onChange={(e) => setInterAction(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Authorized Official *</label>
                <input
                  type="text"
                  value={interLoggedBy}
                  onChange={(e) => setInterLoggedBy(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInteractionModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md cursor-pointer"
                >
                  Log Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SMS Compose Dialog Modal */}
      {showSMSModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setShowSMSModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={handleSendSMS} className="p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-display font-extrabold text-lg text-slate-800 flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-indigo-600" /> Compose SMS Alert
                </h3>
                <p className="text-slate-400 text-xs mt-1">Dispatches a simulated SMS notification directly to the parent cell network.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Target Student Profile *</label>
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

              {activeStudent && (
                <div className="bg-slate-50 p-3 rounded-2xl text-[11px] text-slate-500 grid grid-cols-2 gap-1 border border-slate-150">
                  <p>Guardian: <strong className="text-slate-700">{activeStudent.guardianName || 'None'}</strong></p>
                  <p>Phone: <strong className="text-slate-700 font-mono">{activeStudent.guardianContact || 'None'}</strong></p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">SMS Quick-Templates</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'attendance', label: 'Absence Warn' },
                    { id: 'performance', label: 'Marks meeting' },
                    { id: 'fees', label: 'Fees Notice' }
                  ].map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSmsTemplate(tpl.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        smsTemplate === tpl.id 
                          ? 'bg-indigo-600 text-white border-indigo-600 font-black' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Message Body *</label>
                <textarea
                  placeholder="Type message text here..."
                  value={smsCustomBody}
                  onChange={(e) => setSmsCustomBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-850 focus:outline-none h-24 resize-none"
                  required
                />
                <span className="text-[10px] text-slate-400 block mt-1 font-mono">Character Count: {smsCustomBody.length} (1 SMS credit unit per 160 characters)</span>
              </div>

              {smsStatusAlert && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 border border-emerald-150 animate-pulse">
                  <Check className="h-4 w-4" /> Message Sent Successfully via EMIS Network!
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSMSModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={smsStatusAlert}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Broadcast</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
