import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  Save,
  RefreshCw,
  Award,
  TriangleAlert,
  ClipboardCheck,
} from "lucide-react";
import { Teacher } from "../types";
import {
  CareRoster,
  CareDay,
  RegisterSettings,
  GeneralStudent,
  fullName,
  nextSaturday,
  todayInUganda,
  ageOn,
  addDays,
} from "./model";
import { generalApi } from "./api";
import { useDraft, readDraft } from "../lib/drafts";
import SaveIndicator from "../components/SaveIndicator";
import { exportCareExcel } from "./exports";
type Edit = {
  status: string;
  overrideReason: string;
  expectedUpdatedAt: string | null;
};
export default function SaturdayCare({
  teacher,
  settings,
  onOpenLearner,
}: {
  teacher: Teacher;
  settings: RegisterSettings;
  onOpenLearner: (id: string) => void;
}) {
  const [date, setDate] = useState(nextSaturday()),
    [roster, setRoster] = useState<CareRoster | null>(null),
    [plan, setPlan] = useState<CareDay | null>(null),
    [zone, setZone] = useState("All zones"),
    [search, setSearch] = useState(""),
    [view, setView] = useState("All learners"),
    [edits, setEdits] = useState<Record<string, Edit>>({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [summary, setSummary] = useState<any[]>([]),
    [planDirty, setPlanDirty] = useState(false);
  const api = generalApi(teacher),
    key = `care:${teacher.username}:${date}`,
    draft = useDraft<Record<string, Edit>>(key);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<CareRoster>(
        `care/roster?date=${encodeURIComponent(date)}`,
      );
      setRoster(data);
      setPlan(data.day);
      setPlanDirty(false);
      const restored = readDraft<Record<string, Edit>>(key)?.data || {};
      setEdits(restored);
      draft.setState(Object.keys(restored).length ? "unsaved" : "saved");
      setNotice(
        Object.keys(restored).length
          ? "An unsaved attendance draft from this browser tab was restored. Review before saving."
          : "",
      );
      const totals = await api<any[]>("care/summary");
      setSummary(totals);
    } catch (e: any) {
      setError(e.message);
      setRoster(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [date, settings.carePolicy]);
  const changeDate = (value: string) => {
    if (
      Object.keys(edits).length &&
      !window.confirm(
        "Switch Saturdays? Your current attendance draft will remain in this browser tab.",
      )
    )
      return;
    setDate(value);
    setEdits({});
    setNotice("");
  };
  const edit = (id: string, value: Partial<Edit>) => {
    if (!roster) return;
    const row = roster.rows.find((r) => r.student.id === id)!;
    const updated = {
      ...edits,
      [id]: {
        status: row.attendance?.status || "",
        overrideReason: row.attendance?.override_reason || "",
        expectedUpdatedAt: row.attendance?.updated_at || null,
        ...edits[id],
        ...value,
      },
    };
    setEdits(updated);
    draft.store(updated);
    setNotice("");
  };
  const save = async () => {
    if (!roster) return;
    const records = Object.entries(edits)
      .filter(([, e]) => e.status)
      .map(([studentId, e]) => ({ studentId, ...e }));
    if (!records.length) {
      setError("Mark at least one learner as Present, Absent or Excused.");
      return;
    }
    setBusy(true);
    setError("");
    draft.setState("saving");
    let remaining = { ...edits },
      saved = 0,
      dayRevision = roster.day.revision;
    try {
      for (let i = 0; i < records.length; i += 25) {
        const batch = records.slice(i, i + 25);
        const result = await api("care/attendance", "POST", {
          date,
          records: batch,
          dayRevision,
        });
        dayRevision = result.dayRevision;
        for (const r of batch) delete remaining[r.studentId];
        saved += batch.length;
        setEdits(remaining);
        if (Object.keys(remaining).length) draft.store(remaining);
      }
      draft.saved();
      setEdits({});
      await load();
      setNotice(`${saved} attendance record${saved === 1 ? "" : "s"} saved.`);
    } catch (e: any) {
      draft.store(remaining);
      draft.setState("failed");
      setError(
        `${e.message}${saved ? ` ${saved} records were saved; remaining edits are preserved.` : ""}`,
      );
    } finally {
      setBusy(false);
    }
  };
  const savePlan = async () => {
    if (!plan) return;
    setBusy(true);
    setError("");
    try {
      await api("care/day", "PUT", plan);
      await load();
      setNotice("Saturday plan saved. Eligibility has been recalculated.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const exportSheet = async (next = false) => {
    if (!roster) return;
    setBusy(true);
    setError("");
    try {
      const data = next
        ? await api<CareRoster>(`care/roster?date=${roster.nextDate}`)
        : roster;
      await exportCareExcel(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const zones = Array.from(
    new Set(roster?.rows.map((r) => r.student.zone).filter(Boolean) || []),
  ).sort();
  const filtered = useMemo(
    () =>
      roster?.rows.filter(
        (r) =>
          (zone === "All zones" || r.student.zone === zone) &&
          `${fullName(r.student)} ${r.student.registrationNumber}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (view === "All learners" ||
            (view === "Due to attend" && r.eligible) ||
            (view === "Not due" && !r.eligible) ||
            (view === "Due but not attended" &&
              r.eligible &&
              (edits[r.student.id]?.status || r.attendance?.status) !==
                "Present")),
      ) || [],
    [roster, zone, search, view, edits],
  );
  const present =
      roster?.rows.filter((r) => r.attendance?.status === "Present").length ||
      0,
    due = roster?.rows.filter((r) => r.eligible).length || 0,
    missing =
      roster?.rows.filter(
        (r) => r.eligible && r.attendance?.status !== "Present",
      ).length || 0;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0b2d59]">
            Saturday Care Program
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Plan by zone, check in learners and follow up on those expected but
            missing.
          </p>
        </div>
        <button
          className="secondary-button"
          disabled={loading || busy}
          onClick={load}
        >
          <RefreshCw size={16} />
          Refresh roster
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Care learners", roster?.rows.length || 0],
          ["Due this Saturday", due],
          ["Saved present", present],
          ["Due but not attended", missing],
        ].map(([label, value]) => (
          <div key={label} className="panel p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-[#0b2d59]">{value}</p>
          </div>
        ))}
      </div>
      <section className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm font-medium">
            Saturday date
            <input
              aria-label="Care Saturday date"
              type="date"
              className="mt-1.5 block rounded-lg border border-slate-300 p-2.5 font-normal"
              value={date}
              disabled={busy}
              onChange={(e) => changeDate(e.target.value)}
            />
          </label>
          <div className="flex-1 text-sm text-slate-500">
            <p>
              Attendance rule:{" "}
              <strong className="text-slate-800">
                {
                  {
                    alternate: "Alternate Saturdays",
                    zones: "Scheduled zones",
                    invitation: "Staff invitation",
                    weekly: "Every Saturday",
                  }[settings.carePolicy]
                }
              </strong>
            </p>
            <p className="mt-1 text-xs">
              Red rows are not due. A staff override reason is required to check
              them in.
            </p>
          </div>
        </div>
        {plan && (
          <div className="mt-4 grid items-end gap-4 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_auto]">
            <div>
              <label className="block text-sm font-medium">
                Scheduled zones (comma separated)
                <input
                  aria-label="Scheduled Care Program zones"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal"
                  value={plan.zones.join(", ")}
                  onChange={(e) => {
                    setPlan({
                      ...plan,
                      zones: e.target.value.split(",").map((v) => v.trim()),
                    });
                    setPlanDirty(true);
                  }}
                />
              </label>
              <label className="mt-3 flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={plan.status === "completed"}
                  onChange={(e) => {
                    setPlan({
                      ...plan,
                      status: e.target.checked ? "completed" : "planned",
                    });
                    setPlanDirty(true);
                  }}
                />
                Complete and lock this Saturday
              </label>
            </div>
            <button
              className="secondary-button"
              disabled={!planDirty || busy}
              onClick={savePlan}
            >
              <CalendarDays size={16} />
              Save Saturday plan
            </button>
          </div>
        )}
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}
      {draft.notice && (
        <p role="status" className="text-sm text-amber-800">
          {draft.notice}
        </p>
      )}
      {date > todayInUganda() && (
        <p className="flex items-start gap-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
          <CalendarDays size={17} className="shrink-0" />
          This is a future Saturday. Plan invitations and export the due list
          now; attendance can be saved on the day.
        </p>
      )}
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <input
            aria-label="Search care learners"
            placeholder="Search learner or registration no…"
            className="min-w-48 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Filter Care Program zone"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
          >
            <option>All zones</option>
            {zones.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
          <select
            aria-label="Filter Care Program attendance"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            {[
              "All learners",
              "Due to attend",
              "Due but not attended",
              "Not due",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-3">Learner / zone</th>
                <th className="p-3">Eligibility</th>
                {settings.carePolicy === "invitation" && (
                  <th className="p-3">Invited</th>
                )}
                <th className="p-3">Days attended</th>
                <th className="p-3">Attendance</th>
                <th className="p-3">Override / explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => {
                const e = edits[row.student.id],
                  status = e?.status || row.attendance?.status || "",
                  override =
                    e?.overrideReason ?? row.attendance?.override_reason ?? "";
                return (
                  <tr
                    key={row.student.id}
                    className={!row.eligible ? "bg-red-50" : ""}
                  >
                    <td className="p-3">
                      <button
                        className="font-semibold text-[#0b2d59] hover:underline"
                        onClick={() => onOpenLearner(row.student.id)}
                      >
                        {fullName(row.student)}
                      </button>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.student.zone} · {row.student.grade} ·{" "}
                        {ageOn(row.student.dateOfBirth, date)} years
                      </p>
                    </td>
                    <td className="max-w-64 p-3">
                      <p
                        className={`font-medium ${row.eligible ? "text-emerald-700" : "text-red-800"}`}
                      >
                        {row.eligible ? "Due to attend" : "Not due"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.reason}
                      </p>
                    </td>
                    {settings.carePolicy === "invitation" && (
                      <td className="p-3">
                        <input
                          aria-label={`Invite ${fullName(row.student)}`}
                          type="checkbox"
                          checked={
                            plan?.invitedIds.includes(row.student.id) || false
                          }
                          onChange={(e) => {
                            if (plan) {
                              setPlan({
                                ...plan,
                                invitedIds: e.target.checked
                                  ? [...plan.invitedIds, row.student.id]
                                  : plan.invitedIds.filter(
                                      (i) => i !== row.student.id,
                                    ),
                              });
                              setPlanDirty(true);
                            }
                          }}
                        />
                      </td>
                    )}
                    <td className="p-3">
                      <strong>{row.attendedDays}</strong>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.lastAttended || "No earlier visit"}
                      </p>
                    </td>
                    <td className="p-3">
                      <select
                        aria-label={`Attendance for ${fullName(row.student)}`}
                        disabled={
                          date > todayInUganda() ||
                          busy ||
                          plan?.status === "completed"
                        }
                        className="rounded-lg border border-slate-300 bg-white p-2 text-sm"
                        value={status}
                        onChange={(e) =>
                          edit(row.student.id, { status: e.target.value })
                        }
                      >
                        <option value="">Unmarked</option>
                        {["Present", "Absent", "Excused"].map((s) => (
                          <option
                            key={s}
                            disabled={
                              s === "Present" &&
                              !row.eligible &&
                              !override.trim()
                            }
                          >
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        aria-label={`Override reason for ${fullName(row.student)}`}
                        className="min-w-44 rounded-lg border border-slate-300 bg-white p-2 text-sm"
                        value={override}
                        disabled={busy || plan?.status === "completed"}
                        placeholder={
                          !row.eligible
                            ? "Required for exception"
                            : "Optional explanation"
                        }
                        onChange={(e) =>
                          edit(row.student.id, {
                            overrideReason: e.target.value,
                          })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="p-8 text-center text-sm text-slate-500">
              {loading
                ? "Loading Saturday roster…"
                : "No learners match this selection. Enrol learners in Care Program from the General Register."}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              className="secondary-button"
              disabled={!roster || busy}
              onClick={() => exportSheet()}
            >
              <Download size={16} />
              Excel register
            </button>
            <button
              className="secondary-button"
              disabled={!roster || busy}
              onClick={() => exportSheet(true)}
            >
              Next Saturday due list
            </button>
          </div>
          <div className="flex items-center gap-3">
            <SaveIndicator state={draft.state} />
            <button
              className="primary-button"
              disabled={
                !Object.keys(edits).length ||
                busy ||
                date > todayInUganda() ||
                plan?.status === "completed"
              }
              onClick={save}
            >
              <Save size={16} />
              {draft.state === "saving" ? "Saving…" : "Save attendance"}
            </button>
          </div>
        </div>
      </section>
      <section className="panel p-5">
        <h2 className="flex items-center gap-2 font-semibold text-[#0b2d59]">
          <Award size={19} />
          Attendance recognition
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Ranked by distinct saved Saturday visits across the programme. Tied
          attendance totals share recognition.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {summary.slice(0, 6).map((s, i) => {
            const pupil = roster?.rows.find(
              (r) => r.student.id === s.student_id,
            )?.student;
            return (
              <button
                key={s.student_id}
                className="rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50"
                onClick={() => onOpenLearner(s.student_id)}
              >
                <p className="text-xs text-sky-700">
                  {1 +
                    summary.filter((r) => r.attendedDays > s.attendedDays)
                      .length}{" "}
                  · Attendance recognition
                </p>
                <p className="mt-2 font-semibold">
                  {pupil ? fullName(pupil) : "Learner record"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {s.attendedDays} Saturday{s.attendedDays === 1 ? "" : "s"}{" "}
                  attended
                </p>
              </button>
            );
          })}
        </div>
        {!summary.length && (
          <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
            Recognition will appear after Saturday attendance is saved.
          </p>
        )}
      </section>
    </div>
  );
}
