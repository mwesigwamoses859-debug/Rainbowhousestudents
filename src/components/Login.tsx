import { FormEvent, useState } from 'react';
import { KeyRound, Loader2, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { Teacher } from '../types';
import AshinagaLogo from './AshinagaLogo';

interface LoginProps {
  onLoginSuccess: (teacher: Teacher) => void;
}

async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) throw new Error(`The login server returned an empty response (HTTP ${response.status}).`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('The login server returned an invalid response.');
  }
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password })
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.message || 'Sign-in failed.');
      onLoginSuccess({ ...data.teacher, authToken: data.token });
    } catch (error: any) {
      setError(error.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f3f6fa] grid lg:grid-cols-[1.08fr_.92fr]">
      <section className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#06182c] via-[#092a4c] to-indigo-950 p-14 text-white">
        <div className="flex items-center gap-3">
          <AshinagaLogo size={58} className="rounded-2xl bg-white p-1" />
          <div><p className="text-lg font-black">Rainbow House</p><p className="text-xs uppercase tracking-[.2em] text-indigo-200">Staff portal</p></div>
        </div>
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
            <ShieldCheck className="h-4 w-4" /> Role-protected access
          </span>
          <h1 className="mt-6 text-5xl font-black leading-tight">One login. The correct workspace automatically.</h1>
          <p className="mt-5 text-slate-300">Headteachers and DOS receive administration tools. Teachers receive only their assigned classes, subjects, marks and attendance.</p>
        </div>
        <p className="text-xs text-slate-500">Ashinaga Uganda • Nansana Rainbow House</p>
      </section>

      <section className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
          <div className="flex items-center gap-3 lg:hidden mb-8"><AshinagaLogo size={60} /><strong>Rainbow House</strong></div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><LockKeyhole className="h-6 w-6" /></div>
          <p className="mt-6 text-xs font-black uppercase tracking-[.2em] text-indigo-600">Authorized personnel</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">Staff sign in</h2>
          <p className="mt-2 text-sm text-slate-500">Use the username and password issued by the school administrator.</p>

          {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}

          <form onSubmit={signIn} className="mt-7 space-y-5">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">Staff username</span>
              <div className="relative mt-2"><UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input required autoComplete="username" value={username} onChange={event => setUsername(event.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200 py-3.5 pl-12 pr-4 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" placeholder="e.g. teacher1" />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">Password</span>
              <div className="relative mt-2"><KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input required minLength={8} type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200 py-3.5 pl-12 pr-4 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" placeholder="Enter your password" />
              </div>
            </label>
            <button disabled={loading} className="w-full rounded-2xl bg-indigo-600 py-4 text-sm font-black text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60">
              {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Sign in securely'}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-400">Your role is assigned by the administrator and cannot be changed here.</p>
        </div>
      </section>
    </main>
  );
}
