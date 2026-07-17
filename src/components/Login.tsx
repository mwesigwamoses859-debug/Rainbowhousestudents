import React, { useState, useEffect } from 'react';
import { LogIn, Key, User, ShieldAlert, GraduationCap } from 'lucide-react';
import { Teacher } from '../types';

interface LoginProps {
  onLoginSuccess: (teacher: Teacher) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [teachersList, setTeachersList] = useState<any[]>([]);

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
    <div id="login_container" className="min-h-screen bg-sky-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 translate-x-1/2 translate-y-1/2"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border-2 border-transparent hover:border-indigo-400 overflow-hidden relative z-10 transition-all duration-300">
        {/* Upper Brand Section */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 px-6 py-8 text-center text-white">
          <div className="inline-flex p-3 bg-white/10 rounded-2xl mb-4">
            <GraduationCap className="h-10 w-10 text-yellow-400 animate-bounce" />
          </div>
          <h1 className="font-display text-2xl font-black tracking-tight uppercase">Student Management</h1>
          <p className="text-sky-100 text-xs mt-2 font-bold uppercase tracking-widest">Nansana Education Organisation, Uganda</p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <h2 className="text-sm font-black text-slate-800 mb-6 font-display uppercase tracking-wider flex items-center gap-2">
            <LogIn className="h-5 w-5 text-indigo-600" /> Teacher & Admin Login
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
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Access Profiles (Select to Autofill)</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
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
    </div>
  );
}
