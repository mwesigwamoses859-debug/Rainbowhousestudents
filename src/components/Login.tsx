import { FormEvent, useState } from 'react';
import { ArrowLeft, KeyRound, Loader2, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { Teacher } from '../types';
import AshinagaLogo from './AshinagaLogo';

interface LoginProps { onLoginSuccess: (teacher: Teacher) => void; }
type Mode = 'login' | 'two-factor' | 'recover' | 'reset';

async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) throw new Error(`The login server returned an empty response (HTTP ${response.status}).`);
  try { return JSON.parse(text); } catch { throw new Error('The login server returned an invalid response.'); }
}

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unable to complete this request.';

export default function Login({ onLoginSuccess }: LoginProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [account, setAccount] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(''); setNotice('');
    try {
      let path = '/api/auth/login';
      let body: Record<string, string> = { username: username.trim().toLowerCase(), password };
      if (mode === 'two-factor') { path = '/api/auth/verify-2fa'; body = { challengeId, code }; }
      if (mode === 'recover') { path = '/api/auth/request-password-reset'; body = { account: account.trim().toLowerCase() }; }
      if (mode === 'reset') { path = '/api/auth/reset-password'; body = { challengeId, code, newPassword }; }
      const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.message || 'Request failed.');
      if (mode === 'login' && data.requiresTwoFactor) {
        setChallengeId(data.challengeId); setMaskedEmail(data.maskedEmail || 'your registered email'); setMode('two-factor'); setPassword(''); return;
      }
      if (mode === 'recover') {
        setNotice(data.message); if (data.challengeId) { setChallengeId(data.challengeId); setMode('reset'); } return;
      }
      if (mode === 'reset') {
        setNotice(data.message); setMode('login'); setCode(''); setNewPassword(''); return;
      }
      onLoginSuccess({ ...data.teacher, authToken: data.token });
    } catch (error) { setError(errorMessage(error)); } finally { setLoading(false); }
  };

  const goBack = () => { setMode('login'); setError(''); setNotice(''); setCode(''); };
  const title = mode === 'login' ? 'Staff sign in' : mode === 'two-factor' ? 'Verify it is you' : mode === 'recover' ? 'Recover password' : 'Choose a new password';

  return (
    <main className="min-h-screen bg-[#f3f6fa] grid lg:grid-cols-[1.08fr_.92fr]">
      <section className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#06182c] via-[#092a4c] to-indigo-950 p-14 text-white">
        <div className="flex items-center gap-3"><AshinagaLogo size={58} className="rounded-2xl bg-white p-1" /><div><p className="text-lg font-black">Rainbow House</p><p className="text-xs uppercase tracking-[.2em] text-indigo-200">Staff portal</p></div></div>
        <div className="max-w-xl"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200"><ShieldCheck className="h-4 w-4" /> Role-protected access</span><h1 className="mt-6 text-5xl font-black leading-tight">One login. The correct workspace automatically.</h1><p className="mt-5 text-slate-300">Secure access for headteachers, directors of studies and assigned teachers.</p></div>
        <p className="text-xs text-slate-500">Ashinaga Uganda • Nansana Rainbow House</p>
      </section>
      <section className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
          <div className="flex items-center gap-3 lg:hidden mb-8"><AshinagaLogo size={60} /><strong>Rainbow House</strong></div>
          {mode !== 'login' && <button type="button" onClick={goBack} className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600"><ArrowLeft className="h-4 w-4" /> Back to sign in</button>}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><LockKeyhole className="h-6 w-6" /></div>
          <p className="mt-6 text-xs font-black uppercase tracking-[.2em] text-indigo-600">Authorized personnel</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">{mode === 'two-factor' ? `Enter the six-digit code sent to ${maskedEmail}.` : mode === 'recover' ? 'Enter your username or registered staff email.' : mode === 'reset' ? 'Enter the emailed code and a strong new password.' : 'Use the username and password issued by the school administrator.'}</p>
          {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
          {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</div>}
          <form onSubmit={submit} className="mt-7 space-y-5">
            {mode === 'login' && <><Field label="Staff username" icon={<UserRound className="h-5 w-5" />}><input required autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} className="field" placeholder="e.g. teacher1" /></Field><Field label="Password" icon={<KeyRound className="h-5 w-5" />}><input required minLength={8} type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="field" placeholder="Enter your password" /></Field></>}
            {mode === 'recover' && <Field label="Username or email" icon={<UserRound className="h-5 w-5" />}><input required autoComplete="username" value={account} onChange={event => setAccount(event.target.value)} className="field" placeholder="teacher1 or name@ashinaga.org" /></Field>}
            {(mode === 'two-factor' || mode === 'reset') && <Field label="Six-digit code" icon={<ShieldCheck className="h-5 w-5" />}><input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} className="field tracking-[.35em]" placeholder="000000" /></Field>}
            {mode === 'reset' && <Field label="New password" icon={<KeyRound className="h-5 w-5" />}><input required minLength={12} type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="field" placeholder="At least 12 characters" /></Field>}
            <button disabled={loading} className="w-full rounded-2xl bg-indigo-600 py-4 text-sm font-black text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60">{loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : mode === 'login' ? 'Sign in securely' : mode === 'two-factor' ? 'Verify and sign in' : mode === 'recover' ? 'Send reset code' : 'Reset password'}</button>
          </form>
          {mode === 'login' && <button type="button" onClick={() => { setMode('recover'); setAccount(username); setError(''); }} className="mt-5 w-full text-center text-sm font-bold text-indigo-600 hover:text-indigo-800">Forgot your password?</button>}
          <p className="mt-6 text-center text-xs text-slate-400">Your role is assigned by the administrator and cannot be changed here.</p>
        </div>
      </section>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span><div className="relative mt-2"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>{children}</div></label>;
}
