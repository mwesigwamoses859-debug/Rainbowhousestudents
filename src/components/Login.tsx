import React, { useState, useEffect } from 'react';
import { Key, User, ArrowRight } from 'lucide-react';
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
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchTeachers = async (retries = 3, delay = 1000) => {
      try {
        const res = await fetch('/api/teachers');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            if (isMounted) setTeachersList(data);
            return;
          }
        }
      } catch (err) {
        if (retries > 0 && isMounted) {
          setTimeout(() => fetchTeachers(retries - 1, delay * 1.5), delay);
          return;
        }
        console.warn('Failed to fetch teachers from API, using fallback data:', err);
      }
      
      // Fallback
      if (isMounted) {
        setTeachersList([
          { username: 'admin', name: 'Headteacher / Administrator', role: 'Headteacher', email: 'headteacher@school.edu', subjects: [], classes: [], password: 'admin123' } as any,
          { username: 'teacher1', name: 'Mr. John Mukasa', role: 'Subject Teacher', email: 'john.mukasa@school.edu', subjects: [], classes: [], password: 'teacher123' } as any
        ]);
      }
    };
    fetchTeachers();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in both username and password');
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
    <div className="min-h-screen bg-slate-50 flex font-sans">
      
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-[#008AD8] text-white flex-col justify-center items-center relative overflow-hidden p-12 shadow-[10px_0_30px_rgba(0,0,0,0.1)] z-10">
        
        {/* Soft atmospheric gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-indigo-900 rounded-full mix-blend-overlay filter blur-[120px] opacity-50 animate-pulse" style={{ animationDuration: '8s' }}></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] bg-sky-300 rounded-full mix-blend-overlay filter blur-[100px] opacity-40"></div>
        </div>
        
        {/* Logo and Welcome Text */}
        <div className="relative z-20 flex flex-col items-center text-center max-w-lg">
          <div className="bg-slate-900/10 p-8 rounded-[40px] backdrop-blur-sm border border-white/10 shadow-2xl mb-12">
            <AshinagaLogo size={280} className="drop-shadow-2xl filter" />
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-black mb-6 tracking-tight leading-tight text-white drop-shadow-md">
            Ashinaga Uganda <br/> Rainbow House
          </h1>
          
          <p className="text-sky-100 font-medium text-sm lg:text-base leading-relaxed opacity-90">
            A comprehensive portal for managing student welfare, academics, and community engagement in Nansana. Providing emotional and educational support for orphaned children.
          </p>
        </div>
        
        {/* Bottom decorative elements */}
        <div className="absolute bottom-10 left-12 right-12 flex justify-between items-center text-[10px] uppercase tracking-[0.2em] font-bold text-white/50">
          <span>Uganda Node</span>
          <span>Secured System</span>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="w-full lg:w-7/12 xl:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-slate-50">
        
        {/* Subtle background artifacts for the right side */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-50 rounded-full mix-blend-multiply filter blur-3xl opacity-60 -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          
          {/* Mobile Logo Fallback (Only visible on small screens) */}
          <div className="lg:hidden flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-[#008AD8] p-4 rounded-3xl shadow-xl mb-4 border border-[#0070b0]">
              <AshinagaLogo size={90} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 text-center tracking-tight">Ashinaga Uganda</h1>
          </div>

          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-8 sm:p-10 border border-slate-100/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Welcome Back</h2>
              <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">
                Staff Authentication Portal
              </p>
            </div>

            {error && (
              <div className="w-full bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-xs font-bold mb-8 text-center flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="w-full space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Username or Staff ID</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <User className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. admin or teacher1"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 hover:bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Secure Password</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <Key className="h-5 w-5" />
                  </span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 hover:bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-slate-900/20 hover:shadow-indigo-600/30 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In To Portal'}</span>
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center lg:text-left">One-Click Demo Access</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teachersList.map((t) => {
                  const isHeadteacher = t.username === 'admin';
                  const roleLabel = t.role || (isHeadteacher ? 'Headteacher' : 'Subject Teacher');
                  
                  return (
                    <button
                      key={t.username}
                      type="button"
                      onClick={() => handleQuickLogin(t.username, (t as any).password || (isHeadteacher ? 'admin123' : 'teacher123'))}
                      className="w-full text-left px-4 py-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl text-xs transition-all group cursor-pointer shadow-sm hover:shadow"
                    >
                      <div className="font-extrabold text-slate-800 group-hover:text-indigo-800 transition-colors mb-1 truncate">
                        {t.name}
                      </div>
                      <div className={`inline-block px-2 py-0.5 text-[8px] font-black rounded uppercase tracking-wider ${
                        isHeadteacher ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                      }`}>
                        {roleLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
