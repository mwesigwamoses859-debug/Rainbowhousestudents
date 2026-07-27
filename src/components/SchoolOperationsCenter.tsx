import { useEffect, useState } from 'react';
import {
  CalendarRange,
  CheckCircle,
  ClipboardCheck,
  History,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Teacher } from '../types';

interface SchoolOperationsCenterProps {
  teacher: Teacher;
}

type Section = 'assessment' | 'years' | 'approvals' | 'audit';

const authHeaders = (teacher: Teacher, json = false) => ({
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  Authorization: `Bearer ${teacher.authToken || ''}`,
});

export default function SchoolOperationsCenter({ teacher }: SchoolOperationsCenterProps) {
  const [section, setSection] = useState<Section>('assessment');
  const [settings, setSettings] = useState({
    botWeight: 20,
    motWeight: 30,
    eotWeight: 50,
    passMark: 50,
    maximumScore: 100,
    requireAllSubjects: true,
    gradingBoundaries: { D1: 80, D2: 75, C3: 70, C4: 65, C5: 60, C6: 50, P7: 45, P8: 35 } as Record<string, number>,
  });
  const [years, setYears] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);
  const [message, setMessage] = useState('');

  const load = async () => {
    const [settingsResponse, yearsResponse, submissionsResponse, auditResponse] = await Promise.all([
      fetch('/api/assessment-settings', { headers: authHeaders(teacher) }),
      fetch('/api/academic-years', { headers: authHeaders(teacher) }),
      fetch('/api/mark-submissions', { headers: authHeaders(teacher) }),
      fetch('/api/audit-logs', { headers: authHeaders(teacher) }),
    ]);
    if (settingsResponse.ok) {
      const item = await settingsResponse.json();
      setSettings({
        botWeight: Number(item.bot_weight),
        motWeight: Number(item.mot_weight),
        eotWeight: Number(item.eot_weight),
        passMark: Number(item.pass_mark),
        maximumScore: Number(item.maximum_score),
        requireAllSubjects: Boolean(item.require_all_subjects),
        gradingBoundaries: JSON.parse(item.grading_boundaries || '{}'),
      });
    }
    if (yearsResponse.ok) setYears(await yearsResponse.json());
    if (submissionsResponse.ok) setSubmissions(await submissionsResponse.json());
    if (auditResponse.ok) setAuditLogs(await auditResponse.json());
  };

  useEffect(() => {
    load().catch(() => setMessage('Some school-control records could not be loaded.'));
  }, []);

  const saveSettings = async () => {
    setMessage('');
    const response = await fetch('/api/assessment-settings', {
      method: 'PUT',
      headers: authHeaders(teacher, true),
      body: JSON.stringify(settings),
    });
    const data = await response.json();
    setMessage(response.ok ? 'Assessment settings saved.' : data.message || 'Settings could not be saved.');
    if (response.ok) await load();
  };

  const createYear = async () => {
    const response = await fetch('/api/academic-years', {
      method: 'POST',
      headers: authHeaders(teacher, true),
      body: JSON.stringify({ year: newYear, status: 'planned' }),
    });
    const data = await response.json();
    setMessage(response.ok ? `${newYear} academic year created.` : data.message);
    if (response.ok) await load();
  };

  const closeYear = async (year: number) => {
    if (!window.confirm(`Close ${year}? Marks and attendance for the closed year become historical records.`)) return;
    const response = await fetch(`/api/academic-years/${year}/close`, {
      method: 'POST',
      headers: authHeaders(teacher, true),
      body: '{}',
    });
    const data = await response.json();
    setMessage(response.ok ? `${year} has been closed.` : data.message);
    if (response.ok) await load();
  };

  const activateYear = async (year: number) => {
    const response = await fetch('/api/academic-years', {
      method: 'POST',
      headers: authHeaders(teacher, true),
      body: JSON.stringify({ year, status: 'active' }),
    });
    const data = await response.json();
    setMessage(response.ok ? `${year} is now the active academic year.` : data.message);
    if (response.ok) await load();
  };

  const review = async (id: string, action: 'approve' | 'return') => {
    const comment = window.prompt(action === 'approve' ? 'Optional approval comment' : 'Explain what the teacher must correct') || '';
    if (action === 'return' && !comment.trim()) {
      setMessage('A return comment is required.');
      return;
    }
    const response = await fetch(`/api/mark-submissions/${id}/review`, {
      method: 'POST',
      headers: authHeaders(teacher, true),
      body: JSON.stringify({ action, comment }),
    });
    const data = await response.json();
    setMessage(response.ok ? `Mark sheet ${action === 'approve' ? 'approved and locked' : 'returned to the teacher'}.` : data.message);
    if (response.ok) await load();
  };

  const sections = [
    { id: 'assessment' as const, label: 'Assessment rules', icon: Settings2 },
    { id: 'years' as const, label: 'Academic years', icon: CalendarRange },
    { id: 'approvals' as const, label: 'Mark approvals', icon: ClipboardCheck },
    { id: 'audit' as const, label: 'Audit history', icon: History },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <header className="rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 p-7 text-white shadow-xl">
        <p className="text-xs font-black uppercase tracking-[.2em] text-indigo-200">Administration</p>
        <h1 className="mt-2 text-3xl font-black">School Operations Control Centre</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Configure assessment rules, manage academic years, approve teacher mark sheets, and inspect permanent activity history.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black ${
              section === id ? 'bg-indigo-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {message && <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs font-bold text-indigo-800">{message}</div>}

      {section === 'assessment' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Assessment configuration</h2>
          <p className="mt-1 text-xs text-slate-500">BOT, MOT and EOT weights must total 100%.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['botWeight', 'BOT weight (%)'],
              ['motWeight', 'MOT weight (%)'],
              ['eotWeight', 'EOT weight (%)'],
              ['passMark', 'Pass mark'],
              ['maximumScore', 'Maximum score'],
            ].map(([key, label]) => (
              <label key={key} className="text-xs font-bold text-slate-600">
                {label}
                <input
                  type="number"
                  value={(settings as any)[key]}
                  onChange={event => setSettings(previous => ({ ...previous, [key]: Number(event.target.value) }))}
                  className="mt-2 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm font-black text-slate-900"
                />
              </label>
            ))}
          </div>
          <label className="mt-5 flex items-center gap-3 text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={settings.requireAllSubjects}
              onChange={event => setSettings(previous => ({ ...previous, requireAllSubjects: event.target.checked }))}
            />
            Require all curriculum subjects before promotion is recommended
          </label>
          <div className="mt-6">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Minimum score for each grade</p>
            <div className="mt-3 grid grid-cols-4 gap-3 lg:grid-cols-8">
              {['D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'P8'].map(grade => (
                <label key={grade} className="text-center text-[11px] font-black text-slate-600">
                  {grade}
                  <input
                    type="number"
                    value={settings.gradingBoundaries[grade] ?? 0}
                    onChange={event => setSettings(previous => ({
                      ...previous,
                      gradingBoundaries: { ...previous.gradingBoundaries, [grade]: Number(event.target.value) }
                    }))}
                    className="mt-1 w-full rounded-lg border-2 border-slate-200 px-2 py-2 text-center text-xs"
                  />
                </label>
              ))}
            </div>
          </div>
          <button onClick={saveSettings} className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white">
            <Save className="h-4 w-4" />Save assessment rules
          </button>
        </section>
      )}

      {section === 'years' && (
        <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="font-black text-slate-900">Prepare another year</h2>
            <input
              type="number"
              value={newYear}
              onChange={event => setNewYear(Number(event.target.value))}
              className="mt-4 w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-black"
            />
            <button onClick={createYear} className="mt-3 w-full rounded-xl bg-indigo-700 px-4 py-3 text-xs font-black text-white">Create planned year</button>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="font-black text-slate-900">Academic-year register</h2>
            <div className="mt-4 space-y-3">
              {years.map(item => (
                <div key={item.year} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                  <div><p className="font-black text-slate-900">{item.year}</p><p className="text-xs uppercase text-slate-500">{item.status}</p></div>
                  {item.status === 'planned' && (
                    <button onClick={() => activateYear(item.year)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">Activate year</button>
                  )}
                  {item.status === 'active' && (
                    <button onClick={() => closeYear(item.year)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">Close year</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {section === 'approvals' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-black text-slate-900">Teacher mark-sheet approvals</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="border-b bg-slate-50 text-slate-500"><th className="p-3">Teacher</th><th className="p-3">Scope</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
              <tbody>
                {submissions.map(item => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="p-3 font-bold">{item.username}</td>
                    <td className="p-3">{item.class_name} · {item.subject} · Term {item.term} · {item.year}</td>
                    <td className="p-3 font-black uppercase">{item.status}</td>
                    <td className="p-3">
                      {item.status === 'submitted' && (
                        <div className="flex gap-2">
                          <button onClick={() => review(item.id, 'approve')} className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 font-black text-emerald-700"><CheckCircle className="h-3.5 w-3.5" />Approve</button>
                          <button onClick={() => review(item.id, 'return')} className="flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 font-black text-amber-700"><RotateCcw className="h-3.5 w-3.5" />Return</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {section === 'audit' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-indigo-700" /><h2 className="text-lg font-black text-slate-900">Permanent audit history</h2></div>
          <div className="mt-5 max-h-[620px] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50"><tr><th className="p-3">Time</th><th className="p-3">Staff</th><th className="p-3">Action</th><th className="p-3">Record</th></tr></thead>
              <tbody>
                {auditLogs.map(item => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="p-3 text-slate-500">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="p-3 font-bold">{item.actor_username}</td>
                    <td className="p-3 font-black text-indigo-700">{item.action}</td>
                    <td className="p-3">{item.entity_type} · {item.entity_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
