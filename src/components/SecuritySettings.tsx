import { FormEvent, useEffect, useState } from 'react';
import { KeyRound, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';

interface SecuritySettingsProps { authToken: string; }

export default function SecuritySettings({ authToken }: SecuritySettingsProps) {
  const [enabled, setEnabled] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const api = async (path: string, body?: Record<string, string>) => {
    const response = await fetch(path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${authToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Security request failed.');
    return data;
  };

  useEffect(() => {
    api('/api/auth/security').then(data => { setEnabled(data.twoFactorEnabled); setMaskedEmail(data.maskedEmail); }).catch(error => setError(error.message)).finally(() => setLoading(false));
  }, [authToken]);

  const startSetup = async () => {
    setLoading(true); setError(''); setMessage('');
    try { const data = await api('/api/auth/2fa/setup', {}); if (data.alreadyEnabled) setEnabled(true); else { setChallengeId(data.challengeId); setMaskedEmail(data.maskedEmail); setMessage(`A verification code was sent to ${data.maskedEmail}.`); } } catch (error) { setError(error instanceof Error ? error.message : 'Unable to send the code.'); } finally { setLoading(false); }
  };

  const confirmSetup = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try { await api('/api/auth/2fa/confirm', { challengeId, code }); setEnabled(true); setChallengeId(''); setCode(''); setMessage('Two-step verification is now enabled.'); } catch (error) { setError(error instanceof Error ? error.message : 'Unable to verify the code.'); } finally { setLoading(false); }
  };

  const disable = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try { await api('/api/auth/2fa/disable', { password }); setEnabled(false); setPassword(''); setMessage('Two-step verification has been disabled.'); } catch (error) { setError(error instanceof Error ? error.message : 'Unable to disable two-step verification.'); } finally { setLoading(false); }
  };

  if (loading && !challengeId) return <div className="p-8 text-center text-slate-500"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
  return <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
    <div className="flex items-start gap-4"><div className={`rounded-2xl p-3 ${enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{enabled ? <ShieldCheck /> : <ShieldOff />}</div><div><h3 className="text-xl font-black text-slate-900">Two-step verification</h3><p className="mt-1 text-sm text-slate-500">After your password, receive a six-digit code at {maskedEmail || 'your registered email'}.</p></div></div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    {message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p>}
    {!enabled && !challengeId && <button onClick={startSetup} disabled={loading} className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">Enable two-step verification</button>}
    {!enabled && challengeId && <form onSubmit={confirmSetup} className="mt-6 max-w-sm space-y-3"><label className="block text-xs font-black uppercase text-slate-500">Verification code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} className="mt-2 w-full rounded-xl border-2 border-slate-200 p-3 text-lg font-bold tracking-[.3em]" /></label><button disabled={loading} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">Confirm and enable</button></form>}
    {enabled && <form onSubmit={disable} className="mt-6 max-w-sm space-y-3"><label className="block text-xs font-black uppercase text-slate-500">Password confirmation<div className="relative mt-2"><KeyRound className="absolute left-3 top-3 h-5 w-5 text-slate-400" /><input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border-2 border-slate-200 p-3 pl-11" placeholder="Current password" /></div></label><button disabled={loading} className="rounded-xl border border-rose-200 px-5 py-3 text-sm font-black text-rose-700 disabled:opacity-50">Disable two-step verification</button></form>}
  </section>;
}
