import { FormEvent, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Teacher } from '../types';

interface ForcePasswordChangeProps {
  teacher: Teacher;
  onComplete: (teacher: Teacher) => void;
  onLogout: () => void;
}

export default function ForcePasswordChange({ teacher, onComplete, onLogout }: ForcePasswordChangeProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage('The new passwords do not match.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacher.authToken || ''}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Password change failed.');
      onComplete({ ...teacher, mustChangePassword: false });
    } catch (error: any) {
      setMessage(error.message || 'Password change failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
          <KeyRound className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-slate-900">Create your private password</h1>
        <p className="mt-2 text-sm text-slate-500">
          The administrator issued a temporary password. Change it before opening pupil records.
        </p>
        <div className="mt-6 space-y-4">
          <input required type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} placeholder="Temporary password" className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm" />
          <input required minLength={10} type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="New password (10+ characters, letter and number)" className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm" />
          <input required minLength={10} type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Confirm new password" className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm" />
        </div>
        {message && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{message}</p>}
        <button disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
          <ShieldCheck className="h-4 w-4" />{saving ? 'Saving…' : 'Change password and continue'}
        </button>
        <button type="button" onClick={onLogout} className="mt-3 w-full text-xs font-bold text-slate-500">Sign out</button>
      </form>
    </main>
  );
}
