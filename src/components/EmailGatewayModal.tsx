import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  ShieldCheck, 
  ShieldAlert, 
  Bell, 
  X, 
  CheckCircle2, 
  RefreshCw, 
  Filter, 
  Search, 
  Key, 
  ArrowRight, 
  Clock, 
  UserCheck, 
  Send,
  Sparkles,
  Inbox
} from 'lucide-react';
import { Teacher } from '../types';
import AshinagaLogo from './AshinagaLogo';

export interface EmailLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole: string;
  subject: string;
  category: 'CONFIRMATION_CODE' | 'ACTIVITY_ALERT' | 'LOGIN_ALERT' | 'MARK_MODIFICATION';
  code?: string;
  body: string;
  timestamp: string;
  status: 'DELIVERED' | 'DISPATCHED';
}

interface EmailGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTeacher: Teacher;
}

export default function EmailGatewayModal({ isOpen, onClose, currentTeacher }: EmailGatewayModalProps) {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

  // Manual Test Email Dispatch state
  const [testRecipient, setTestRecipient] = useState('john.mukasa@ashinaga.or.ug');
  const [testSubject, setTestSubject] = useState('Workspace Access Security Alert');
  const [testCategory, setTestCategory] = useState<'CONFIRMATION_CODE' | 'ACTIVITY_ALERT' | 'LOGIN_ALERT' | 'MARK_MODIFICATION'>('ACTIVITY_ALERT');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');

  const fetchEmailLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/email-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (data.logs && data.logs.length > 0 && !selectedEmail) {
          setSelectedEmail(data.logs[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching email gateway logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEmailLogs();
    }
  }, [isOpen]);

  const handleSendTestAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setSendSuccess('');

    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const res = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: testRecipient,
          recipientName: testRecipient.split('@')[0].replace('.', ' ').toUpperCase(),
          recipientRole: testRecipient.includes('headteacher') ? 'Headteacher' : testRecipient.includes('dos') ? 'DOS' : 'Subject Teacher',
          subject: `[Automated Gateway Alert] ${testSubject}`,
          category: testCategory,
          code,
          body: `Security Notification Dispatch:\nAn activity trigger occurred in the Ashinaga Rainbow House Database.\nSecurity Code: ${code}\nInitiator: ${currentTeacher.name} (${currentTeacher.email || currentTeacher.username})\nTimestamp: ${new Date().toLocaleString()}`
        })
      });

      if (res.ok) {
        setSendSuccess('Activity alert email successfully dispatched to company inbox!');
        fetchEmailLogs();
      }
    } catch (err) {
      console.error('Failed to send test email', err);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.code && log.code.includes(searchQuery));

    if (filterRole === 'ALL') return matchesSearch;
    return matchesSearch && log.recipientRole === filterRole;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/30 border border-indigo-400/30 rounded-2xl text-indigo-200">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 text-[9px] font-black uppercase rounded tracking-wider border border-indigo-400/30">
                  Automated Gateway Service
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-200 text-[9px] font-black uppercase rounded tracking-wider border border-emerald-400/30">
                  @ashinaga.or.ug Company Mail
                </span>
              </div>
              <h2 className="text-xl font-black font-display tracking-tight text-white mt-0.5">
                Company Email Notification & Alert Gateway
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchEmailLogs}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Refresh Email Logs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-rose-500/80 rounded-xl text-white transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Content - Grid 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200">
          
          {/* Left Panel: Email Feed (5 cols) */}
          <div className="md:col-span-5 flex flex-col bg-slate-50/50 overflow-hidden">
            {/* Filter bar */}
            <div className="p-4 border-b border-slate-200 bg-white space-y-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search company email, name, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1 text-[11px] font-extrabold text-slate-600">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider mr-1">Filter:</span>
                {['ALL', 'Headteacher', 'DOS', 'Subject Teacher'].map(role => (
                  <button
                    key={role}
                    onClick={() => setFilterRole(role)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-black transition-all cursor-pointer ${
                      filterRole === role 
                        ? 'bg-indigo-600 text-white shadow' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {role === 'ALL' ? 'All Roles' : role}
                  </button>
                ))}
              </div>
            </div>

            {/* Email List Feed */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 px-4 text-slate-400 space-y-2">
                  <Inbox className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold">No dispatched emails found for this filter.</p>
                </div>
              ) : (
                filteredLogs.map(log => {
                  const isSelected = selectedEmail?.id === log.id;
                  const isConfirmation = log.category === 'CONFIRMATION_CODE';

                  return (
                    <button
                      key={log.id}
                      onClick={() => setSelectedEmail(log)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected 
                          ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20' 
                          : 'bg-white hover:bg-slate-100/70 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          isConfirmation 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                            : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                        }`}>
                          {log.category.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="mt-2 font-extrabold text-xs text-slate-900 truncate">
                        {log.subject}
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700 truncate">{log.recipientName}</span>
                        <span className="font-mono text-[10px] text-indigo-600 shrink-0">{log.recipientEmail}</span>
                      </div>

                      {log.code && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Dispatched Code:</span>
                          <span className="px-2 py-0.5 bg-slate-900 text-amber-400 font-mono font-black text-xs rounded">
                            {log.code}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Email Detail & Test Dispatcher (7 cols) */}
          <div className="md:col-span-7 flex flex-col bg-white overflow-y-auto p-6 space-y-6">
            
            {/* EMAIL VIEWER */}
            {selectedEmail ? (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
                {/* Email Header Info */}
                <div className="border-b border-slate-200 pb-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-full uppercase border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Status: Dispatched via Official Gateway
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(selectedEmail.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 font-display">
                    {selectedEmail.subject}
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Recipient</span>
                      <strong className="text-slate-800">{selectedEmail.recipientName}</strong>
                      <span className="text-[10px] text-indigo-600 font-mono block">{selectedEmail.recipientEmail}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Company Role</span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded border border-indigo-200 inline-block mt-0.5">
                        {selectedEmail.recipientRole}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Security Code Banner if applicable */}
                {selectedEmail.code && (
                  <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">
                        Official Security Confirmation Code
                      </span>
                      <span className="font-mono text-2xl font-black tracking-widest text-slate-900">
                        {selectedEmail.code}
                      </span>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedEmail.code!)}
                      className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Copy Code
                    </button>
                  </div>
                )}

                {/* Email Body Content */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 text-slate-700 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
                  {selectedEmail.body}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 italic">
                Select an email log from the inbox on the left to inspect full notification details.
              </div>
            )}

            {/* LIVE TEST DISPATCH FORM */}
            <div className="border-t border-slate-200 pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-indigo-600" />
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-800">
                  Simulate Email Gateway Alert Dispatch
                </h4>
              </div>

              {sendSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{sendSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSendTestAlert} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Company Email</label>
                    <select
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="headteacher@ashinaga.or.ug">headteacher@ashinaga.or.ug (Headteacher)</option>
                      <option value="dos@ashinaga.or.ug">dos@ashinaga.or.ug (DOS - Mr. Ochieng)</option>
                      <option value="john.mukasa@ashinaga.or.ug">john.mukasa@ashinaga.or.ug (Math/Science)</option>
                      <option value="sarah.babirye@ashinaga.or.ug">sarah.babirye@ashinaga.or.ug (English/SST)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Category</label>
                    <select
                      value={testCategory}
                      onChange={(e) => setTestCategory(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="CONFIRMATION_CODE">CONFIRMATION_CODE (2FA)</option>
                      <option value="ACTIVITY_ALERT">ACTIVITY_ALERT (System Audit)</option>
                      <option value="MARK_MODIFICATION">MARK_MODIFICATION (Grades Saved)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Subject Header</label>
                  <input
                    type="text"
                    value={testSubject}
                    onChange={(e) => setTestSubject(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Subject title..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{isSending ? 'Dispatching Email...' : 'Trigger & Dispatch Automated Email Alert'}</span>
                </button>
              </form>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
