import { FormEvent, useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { Teacher } from '../types';
import AshinagaLogo from './AshinagaLogo';

interface LoginProps {
  onLoginSuccess: (teacher: Teacher) => void;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function readApiResponse(response: Response) {
  const body = await response.text();
  if (body) {
    try {
      return JSON.parse(body);
    } catch {
      throw new Error('The server returned an invalid response. Check the backend deployment and API URL.');
    }
  }

  if (response.status === 405) {
    throw new Error(
      'Login API unavailable: this website is deployed as static files only. Configure VITE_API_BASE_URL to point to the Node.js backend.'
    );
  }

  throw new Error(`The server returned an empty response (HTTP ${response.status}).`);
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'Unable to send a confirmation code.');
      setMaskedEmail(data.email);
      setDemoCode(data.demoCode || '');
      setStep('code');
    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code })
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'That code could not be verified.');
      onLoginSuccess({ ...data.teacher, authToken: data.token });
    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] grid lg:grid-cols-[1.05fr_.95fr] font-sans">
      <section className="hidden lg:flex bg-[#071a2f] text-white p-14 flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <AshinagaLogo size={54} className="rounded-2xl bg-white p-1" />
          <div>
            <p className="font-black text-lg">Rainbow House</p>
            <p className="text-indigo-200 text-xs uppercase tracking-[.2em]">Student Information System</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 border border-emerald-300/20 px-3 py-1 text-xs font-bold text-emerald-200">
            <ShieldCheck className="h-4 w-4" /> Staff-only access
          </span>
          <h1 className="mt-6 text-5xl font-black leading-[1.08]">One secure sign-in. The right workspace for every educator.</h1>
          <p className="mt-5 text-slate-300 leading-relaxed">
            Administrators receive school-wide controls. Teachers see only their assigned classes, subjects, attendance and assessment work.
          </p>
        </div>
        <p className="relative text-xs text-slate-500">Ashinaga Uganda • Nansana Rainbow House</p>
      </section>

      <section className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <AshinagaLogo size={72} className="rounded-2xl bg-white p-1 shadow-sm" />
          </div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-indigo-600">Protected staff portal</p>
          <h2 className="mt-3 text-3xl font-black text-slate-900">
            {step === 'email' ? 'Sign in with your work email' : 'Check your inbox'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {step === 'email'
              ? 'Enter the official email registered by your administrator. No password is needed.'
              : `We sent a six-digit code to ${maskedEmail}. It expires in 10 minutes.`}
          </p>

          {error && (
            <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={requestCode} className="mt-8 space-y-5">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Official Ashinaga email</span>
                <div className="relative mt-2">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="name@ashinaga.org"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200 bg-white py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </label>
              <button disabled={loading} className="w-full rounded-2xl bg-indigo-600 py-4 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-60">
                {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Email me a confirmation code'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="mt-8 space-y-5">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Confirmation code</span>
                <div className="relative mt-2">
                  <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-500" />
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="000000"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-2xl border-2 border-indigo-200 bg-white py-4 pl-12 pr-4 text-center font-mono text-2xl font-black tracking-[.35em] text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </label>
              {demoCode && (
                <button type="button" onClick={() => setCode(demoCode)} className="w-full rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">
                  Local development code: {demoCode}
                </button>
              )}
              <button disabled={loading || code.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:opacity-60">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5" /> Verify and sign in</>}
              </button>
              <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }} className="flex w-full items-center justify-center gap-2 py-2 text-sm font-bold text-slate-500 hover:text-slate-800">
                <ArrowLeft className="h-4 w-4" /> Use another email
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            Your access level is assigned by the school administrator and detected automatically after verification.
          </p>
        </div>
      </section>
    </main>
  );
}
