import React, { useState, useEffect } from 'react';
import { LogIn, Key, User, ShieldAlert, BookOpen, ArrowRight, Home } from 'lucide-react';
import { Teacher } from '../types';
import AshinagaLogo from './AshinagaLogo';

interface LoginProps {
  onLoginSuccess: (teacher: Teacher) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
        { username: 'admin', name: 'Headteacher / Administrator', password: 'admin123' },
        { username: 'teacher1', name: 'Mr. John Mukasa', password: 'teacher123' },
        { username: 'teacher2', name: 'Mrs. Sarah Babirye', password: 'teacher123' }
      ]);
    };
    fetchTeachers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.teacher);
      } else {
        setError(data.message || 'Invalid username or password');
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
  };

  return (
    <div id="login_container" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-50 rounded-full mix-blend-multiply filter blur-3xl opacity-60 translate-x-1/2 translate-y-1/2"></div>

      {showWelcome ? (
        /* Welcome Notice Overlay with Large Logo Background Picture */
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
              This terminal progress registry hosts active rosters, student photo profiles, social visitation logs, and verified academic report cards for children under our care in Nansana, Uganda.
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
          
          {/* Logo as watermark inside card top corner */}
          <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none select-none">
            <AshinagaLogo size={180} />
          </div>

          {/* Upper Brand Section */}
          <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-950 px-6 py-8 text-center text-white relative">
            <button
              onClick={() => setShowWelcome(true)}
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
              Rainbow House Student Database
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Enter username"
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
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            {/* Quick Access Profiles */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Access Profiles (Select to Autofill)</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {teachersList.map((t) => {
                  const isSystemAdmin = t.username === 'admin';
                  const defaultPass = isSystemAdmin ? 'admin123' : 'teacher123';
                  const displayPass = t.password || defaultPass;

                  return (
                    <button
                      key={t.username}
                      type="button"
                      onClick={() => handleQuickLogin(t.username, displayPass)}
                      className="w-full text-left px-4 py-3 bg-white hover:bg-indigo-50/50 rounded-2xl border-2 border-slate-100 hover:border-indigo-300 text-xs flex justify-between items-center transition-all group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-750 group-hover:text-indigo-700 transition-colors block">{t.name}</span>
                          {isSystemAdmin && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[8px] font-black rounded uppercase">Admin</span>
                          )}
                        </div>
                        <span className="text-slate-400 block font-medium text-[10px] mt-0.5">
                          Username: <span className="font-mono text-indigo-600/80 font-bold">{t.username}</span> | Pass: <span className="font-mono text-indigo-600/80 font-bold">{displayPass}</span>
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] uppercase font-mono group-hover:bg-indigo-100 group-hover:text-indigo-700 font-bold transition-all">Fill</span>
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
