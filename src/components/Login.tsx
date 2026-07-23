import React, { useState, useEffect } from 'react';
import { LogIn, Key, User, ShieldAlert, ArrowRight, Home, Mail, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Teacher } from '../types';
import AshinagaLogo from './AshinagaLogo';

interface LoginProps {
  onLoginSuccess: (teacher: Teacher) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp_verification'>('credentials');
  
  const [sentEmail, setSentEmail] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountRole, setAccountRole] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await fetch('/api/teachers');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setTeachersList(data);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch teachers:', err);
      }
      // Fallback
      setTeachersList([
        { username: 'admin', name: 'Headteacher / Administrator', role: 'Headteacher', email: 'headteacher@ashinaga.or.ug', password: 'admin123' },
        { username: 'dos', name: 'Mr. David Ochieng (DOS)', role: 'DOS', email: 'dos@ashinaga.or.ug', password: 'teacher123' },
        { username: 'teacher1', name: 'Mr. John Mukasa', role: 'Subject Teacher', email: 'john.mukasa@ashinaga.or.ug', password: 'teacher123' },
        { username: 'teacher2', name: 'Mrs. Sarah Babirye', role: 'Subject Teacher', email: 'sarah.babirye@ashinaga.or.ug', password: 'teacher123' }
      ]);
    };
    fetchTeachers();
  }, []);

  // Step 1: Submit credentials to dispatch email confirmation code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in both username and password');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSentEmail(data.email);
        setDemoCode(data.demoCode || '');
        setAccountName(data.teacherName || username);
        setAccountRole(data.role || 'Personnel');
        setStep('otp_verification');
        setSuccessMsg(`6-Digit security confirmation code dispatched to ${data.email}`);
      } else {
        setError(data.message || 'Invalid username or password');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify confirmation code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationCode || confirmationCode.length < 4) {
      setError('Please enter the 6-digit confirmation code sent to your email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, code: confirmationCode }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.teacher);
      } else {
        setError(data.message || 'Invalid confirmation code');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError('');
    setStep('credentials');
  };

  return (
    <div id="login_container" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-50 rounded-full mix-blend-multiply filter blur-3xl opacity-60 translate-x-1/2 translate-y-1/2"></div>

      {showWelcome ? (
        /* Welcome Notice Overlay */
        <div 
          id="welcome_notice_card" 
          className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border-2 border-slate-100 p-8 md:p-10 text-center relative overflow-hidden z-10 transition-all duration-300 transform scale-100 flex flex-col items-center justify-between min-h-[500px]"
        >
          {/* Logo background watermark picture */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none z-0 scale-150">
            <AshinagaLogo size={360} />
          </div>

          <div className="w-full space-y-6 z-10">
            {/* Logo in foreground */}
            <div className="flex justify-center transform hover:scale-105 transition-transform duration-300">
              <AshinagaLogo size={140} />
            </div>

            <div className="space-y-3">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-full">
                Terakoya Programme Portal
              </span>
              <h1 className="font-display text-2xl md:text-3xl font-black text-slate-800 leading-tight uppercase">
                Welcome to Ashinaga Uganda Rainbow House student database
              </h1>
              <div className="w-20 h-1 bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 to-cyan-400 mx-auto rounded-full mt-3"></div>
            </div>

            <p className="text-slate-500 text-xs md:text-sm leading-relaxed max-w-md mx-auto font-medium">
              Secure role-based portal for Headteacher, DOS, and Subject Teachers with official email 2FA confirmation codes.
            </p>
          </div>

          {/* Proceed CTA */}
          <div className="w-full mt-8 z-10 space-y-4">
            <button
              onClick={() => setShowWelcome(false)}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-indigo-200 flex justify-center items-center gap-2 cursor-pointer"
            >
              <span>Access Login System</span>
              <ArrowRight className="h-4 w-4 animate-pulse" />
            </button>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              AUTHORIZED SCHOOL PERSONNEL ONLY
            </div>
          </div>
        </div>
      ) : (
        /* Actual Login Credentials Screen with Back Link */
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-hidden relative z-10 transition-all duration-300">
          
          {/* Logo watermark */}
          <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none select-none">
            <AshinagaLogo size={180} />
          </div>

          {/* Upper Brand Section */}
          <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-950 px-6 py-8 text-center text-white relative">
            <button
              onClick={() => {
                setShowWelcome(true);
                setStep('credentials');
              }}
              className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Return to Welcome Page"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[10px] uppercase font-bold">Home</span>
            </button>

            <div className="flex justify-center mb-3">
              <AshinagaLogo size={80} className="filter drop-shadow-md" />
            </div>
            <h1 className="font-display text-lg font-black tracking-tight uppercase">
              Ashinaga Uganda
            </h1>
            <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mt-1">
              Protected Staff Access & Email 2FA
            </p>
          </div>

          {/* Form Body */}
          <div className="p-8">
            <h2 className="text-xs font-black text-slate-500 mb-5 font-display uppercase tracking-widest flex items-center gap-2">
              <LogIn className="h-4 w-4 text-indigo-600" /> Authorized Portal Sign-In
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 border-2 border-red-200 rounded-xl text-xs font-bold flex items-start gap-2">
                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* STEP 1: USERNAME & PASSWORD */}
            {step === 'credentials' && (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Username</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <User className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      placeholder="Enter username (e.g. admin, dos, teacher1)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Key className="h-5 w-5" />
                    </span>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-xs font-semibold"
                    />
                  </div>
                </div>

                <button
                  id="login_submit_btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Mail className="h-4 w-4" />
                  <span>{loading ? 'Sending Code...' : 'Send Confirmation Code to Email'}</span>
                </button>
              </form>
            )}

            {/* STEP 2: 2FA EMAIL CONFIRMATION CODE */}
            {step === 'otp_verification' && (
              <form onSubmit={handleVerifyCode} className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-indigo-900">{accountName}</span>
                    <span className="px-2 py-0.5 bg-indigo-200 text-indigo-900 font-black rounded-md text-[9px] uppercase">
                      {accountRole}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px] font-semibold">
                    <Mail className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">{sentEmail}</span>
                  </div>
                </div>

                {demoCode && (
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                    <div>
                      <span className="font-extrabold block text-[10px] uppercase text-amber-700">Official Email Security Dispatch:</span>
                      <span className="font-mono text-base font-black tracking-widest text-slate-900">{demoCode}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmationCode(demoCode)}
                      className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-black rounded-lg text-[10px] uppercase transition-all cursor-pointer"
                    >
                      Autofill Code
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Enter 6-Digit Email Security Confirmation Code
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-indigo-600">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 849201"
                      value={confirmationCode}
                      onChange={(e) => setConfirmationCode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full pl-11 pr-4 py-3 bg-white border-2 border-indigo-300 focus:border-indigo-600 rounded-xl text-slate-900 font-mono text-lg font-black tracking-widest focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all text-center"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('credentials')}
                    className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loading ? 'Verifying...' : 'Confirm & Enter Portal'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Quick Access Profiles for Testing */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Authorized School Personnel Accounts</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {teachersList.map((t) => {
                  const isHeadteacher = t.username === 'admin';
                  const isDos = t.username === 'dos';
                  const roleLabel = t.role || (isHeadteacher ? 'Headteacher' : isDos ? 'DOS' : 'Subject Teacher');
                  const officialMail = t.email || `${t.username}@ashinaga.or.ug`;

                  return (
                    <button
                      key={t.username}
                      type="button"
                      onClick={() => handleQuickLogin(t.username, t.password || (isHeadteacher ? 'admin123' : 'teacher123'))}
                      className="w-full text-left px-3.5 py-2.5 bg-slate-50 hover:bg-indigo-50/60 rounded-xl border border-slate-200 hover:border-indigo-300 text-xs flex justify-between items-center transition-all group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800 group-hover:text-indigo-800 transition-colors block">{t.name}</span>
                          <span className={`px-1.5 py-0.5 text-[8px] font-black rounded uppercase ${
                            isHeadteacher ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            isDos ? 'bg-indigo-100 text-indigo-900 border border-indigo-300' :
                            'bg-blue-100 text-blue-900'
                          }`}>
                            {roleLabel}
                          </span>
                        </div>
                        <span className="text-slate-400 block font-mono text-[10px] mt-0.5">
                          {officialMail}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-white text-indigo-700 border border-slate-200 rounded-lg text-[9px] font-extrabold uppercase group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        Select
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

