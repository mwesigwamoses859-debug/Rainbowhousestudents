import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import {
  Users,
  GraduationCap,
  HeartHandshake,
  FileCheck2,
  Plus,
  Search,
  ArrowRight,
  RefreshCw,
  ClipboardList,
  Settings,
  AlertTriangle,
  CalendarDays,
  School,
  ArrowUpRight,
} from "lucide-react";
import { Teacher, Student } from "../types";
import {
  GeneralStudent,
  GeneralDocument,
  RegisterSettings,
  DEFAULT_SETTINGS,
  fullName,
  ageOn,
  DOCUMENT_CATEGORIES,
  RegisterNavigationRequest,
} from "./model";
import { generalApi } from "./api";
import RegistrationForm from "./RegistrationForm";
import LearnerOverview from "./LearnerOverview";
const SaturdayCare = lazy(() => import("./SaturdayCare"));
const CareProgram = lazy(() => import("../components/CareProgram"));
const requiredDocuments = (s: GeneralStudent) => [
  "Birth certificate",
  "Community worker form",
  ...(s.motherDeceased === "Yes" ? ["Mother’s death certificate"] : []),
  ...(s.fatherDeceased === "Yes" ? ["Father’s death certificate"] : []),
];
const outstanding = (s: GeneralStudent) =>
  requiredDocuments(s).filter(
    (k) => !["Uploaded", "Not applicable"].includes(s.documentStatus[k] || ""),
  );
interface Props {
  section: string;
  teacher: Teacher;
  onNavigate: (tab: string) => void;
  onSchoolDataChange: () => void;
  onOpenSchoolRecord: (schoolStudentId: string) => Promise<void>;
  request?: RegisterNavigationRequest | null;
  onRequestHandled: () => void;
}
export default function GeneralRegister({
  section,
  teacher,
  onNavigate,
  onSchoolDataChange,
  onOpenSchoolRecord,
  request,
  onRequestHandled,
}: Props) {
  const [students, setStudents] = useState<GeneralStudent[]>([]),
    [settings, setSettings] = useState<RegisterSettings>(DEFAULT_SETTINGS),
    [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [level, setLevel] = useState("All levels"),
    [zone, setZone] = useState("All zones"),
    [status, setStatus] = useState("Active learners"),
    [selected, setSelected] = useState<GeneralStudent | null>(null),
    [editing, setEditing] = useState<{
      student?: GeneralStudent;
      documents?: GeneralDocument[];
      step?: number;
      terakoya?: boolean;
      className?: string;
    } | null>(null),
    [profileTab, setProfileTab] = useState("Overview"),
    [busy, setBusy] = useState(false),
    [progression, setProgression] = useState<any>(null);
  const api = generalApi(teacher);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [s, c] = await Promise.all([
        api<GeneralStudent[]>("students"),
        api<RegisterSettings>("settings"),
      ]);
      setStudents(s);
      setSettings(c);
      setSettingsForm(c);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!request || loading) return;
    let cancelled = false;
    if (request.kind === "registration") {
      setEditing({ terakoya: request.terakoya, className: request.className });
      onRequestHandled();
    } else {
      api<GeneralStudent>(
        `students/by-school/${encodeURIComponent(request.schoolStudentId)}`,
      )
        .then((s) => {
          if (!cancelled) {
            setProfileTab(request.tab || "Overview");
            setSelected(s);
            setError("");
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        })
        .finally(() => {
          if (!cancelled) onRequestHandled();
        });
    }
    return () => {
      cancelled = true;
    };
  }, [request?.key, loading]);
  const zones = Array.from(
    new Set(students.map((s) => s.zone).filter(Boolean)),
  ).sort();
  const filtered = useMemo(
    () =>
      students.filter(
        (s) =>
          `${fullName(s)} ${s.registrationNumber} ${s.guardianName}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (level === "All levels" || s.educationLevel === level) &&
          (zone === "All zones" || s.zone === zone) &&
          (status === "All records" ||
            (status === "Active learners" && s.active) ||
            (status === "Inactive learners" && !s.active)),
      ),
    [students, search, level, zone, status],
  );
  const saved = async (s: GeneralStudent) => {
    setEditing(null);
    setSelected(s);
    await load();
    onSchoolDataChange();
    setNotice(`${s.registrationNumber} saved.`);
  };
  const open = async (id: string) => {
    try {
      setError("");
      setProfileTab("Overview");
      setSelected(
        await api<GeneralStudent>(`students/${encodeURIComponent(id)}`),
      );
    } catch (e: any) {
      setError(e.message);
    }
  };
  const saveSettings = async () => {
    setBusy(true);
    setError("");
    try {
      const s = await api<RegisterSettings>("settings", "PUT", settingsForm);
      setSettings(s);
      setNotice("Programme rules saved.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const previewProgression = async (run = false) => {
    setBusy(true);
    setError("");
    try {
      const result = await api<any>("progression", "POST", { preview: !run });
      setProgression(result);
      if (run) {
        await load();
        setNotice(
          `${result.promoted} study records advanced. ${result.remainingPossible ? "Further batches will continue automatically." : ""}`,
        );
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const count = (l: string) =>
    students.filter((s) => s.active && s.educationLevel === l).length;
  const schoolLearners = students
    .filter((s) => s.careEnrolled && s.active)
    .map(
      (s) =>
        ({
          id: s.id,
          surname: s.surname,
          otherNames: s.otherNames,
          photo: s.photo,
          communityWorker: s.communityWorker,
          className: s.grade,
          gender: s.gender,
          dateOfBirth: s.dateOfBirth,
          guardianName: s.guardianName,
          guardianContact: s.guardianContact,
          zoneInNansana: s.zone,
        }) as Student,
    );
  return (
    <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="h-2 w-2 rounded-full bg-sky-600" />
        Ashinaga Uganda <span>/</span>
        <span className="font-semibold text-slate-700">General Register</span>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
          <button className="ml-3 underline" onClick={load}>
            Retry
          </button>
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {notice}
          <button
            aria-label="Dismiss saved notice"
            className="float-right"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </p>
      )}
      {section === "general-dashboard" && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-sky-700">
                Rainbow House · Learner services
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-[#0b2d59]">
                Every learner. One record.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
                The master register for Ashinaga Uganda learners, from primary
                school through secondary and university.
              </p>
            </div>
            <button className="primary-button" onClick={() => setEditing({})}>
              <Plus size={17} />
              Register learner
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Active learners",
                value: students.filter((s) => s.active).length,
                detail: `${count("Primary")} primary · ${count("Secondary")} secondary · ${count("University")} university`,
                icon: Users,
              },
              {
                label: "Saturday Care Program",
                value: students.filter((s) => s.active && s.careEnrolled)
                  .length,
                detail: "Across all schools and study levels",
                icon: HeartHandshake,
              },
              {
                label: "Documents to follow up",
                value: students.filter((s) => s.active && outstanding(s).length)
                  .length,
                detail: "Learners with outstanding core documents",
                icon: FileCheck2,
              },
              {
                label: "Education transitions",
                value: students.filter((s) => s.transitionReview).length,
                detail: "School or course confirmation needed",
                icon: GraduationCap,
              },
            ].map((c) => (
              <div key={c.label} className="panel p-5">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  {c.label}
                  <c.icon size={19} className="text-sky-700" />
                </div>
                <p className="mt-3 text-3xl font-bold text-[#0b2d59]">
                  {loading ? "…" : c.value}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {c.detail}
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
            <section className="panel p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[#0b2d59]">
                Today’s register tasks
              </h2>
              <div className="mt-4 divide-y divide-slate-100">
                {[
                  {
                    title: "Outstanding registration documents",
                    text: `${students.filter((s) => s.active && outstanding(s).length).length} learner records need document follow-up`,
                    tab: "general-documents",
                    icon: FileCheck2,
                  },
                  {
                    title: "Saturday attendance & zone lists",
                    text: "Plan the next Saturday and follow up on expected learners",
                    tab: "general-care",
                    icon: CalendarDays,
                  },
                  {
                    title: "Review education transitions",
                    text: `${students.filter((s) => s.transitionReview).length} study transitions require confirmation`,
                    tab: "general-progression",
                    icon: GraduationCap,
                  },
                ].map((t) => (
                  <button
                    key={t.title}
                    className="flex w-full items-center gap-3 py-4 text-left"
                    onClick={() => onNavigate(t.tab)}
                  >
                    <span className="rounded-lg bg-sky-50 p-2.5 text-sky-700">
                      <t.icon size={19} />
                    </span>
                    <span className="flex-1">
                      <strong className="block text-sm font-semibold">
                        {t.title}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        {t.text}
                      </span>
                    </span>
                    <ArrowRight size={17} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-xl bg-[#0b2d59] p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-200">
                Terakoya Primary School
              </p>
              <h2 className="mt-3 text-xl font-semibold">
                A focused school workspace
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                School pupils, daily attendance, assessment marks, report cards
                and school controls are together under Terakoya.
              </p>
              <button
                className="mt-6 flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#0b2d59]"
                onClick={() => onNavigate("dashboard")}
              >
                Open Terakoya
                <ArrowUpRight size={17} />
              </button>
              <p className="mt-5 text-xs leading-relaxed text-sky-200">
                Existing Terakoya learners are linked to this master register
                using the same learner ID.
              </p>
            </section>
          </div>
          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recently registered</h2>
              <button
                className="text-sm font-semibold text-sky-800"
                onClick={() => onNavigate("general-students")}
              >
                View all learners →
              </button>
            </div>
            <div className="mt-3 divide-y divide-slate-100">
              {students.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left"
                  onClick={() => open(s.id)}
                >
                  <span>
                    <strong className="text-sm font-medium">
                      {fullName(s)}
                    </strong>
                    <span className="mt-1 block text-xs text-slate-500">
                      {s.registrationNumber} · {s.zone}
                    </span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {s.educationLevel} · {s.grade}
                  </span>
                </button>
              ))}
            </div>
            {!loading && !students.length && (
              <div className="py-9 text-center">
                <ClipboardList className="mx-auto text-slate-300" size={35} />
                <p className="mt-3 text-sm text-slate-500">
                  Your master register is ready for its first learner.
                </p>
                <button
                  className="mt-3 text-sm font-semibold text-sky-800"
                  onClick={() => setEditing({})}
                >
                  Start a registration →
                </button>
              </div>
            )}
          </section>
        </>
      )}
      {["general-students", "general-documents"].includes(section) && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#0b2d59]">
                {section === "general-documents"
                  ? "Documents & follow-up"
                  : "All Ashinaga learners"}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {section === "general-documents"
                  ? "Track missing documents and combine the registration form with saved attachments."
                  : "A permanent learner record across primary, secondary, university and other pathways."}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="secondary-button"
                disabled={loading}
                onClick={load}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button className="primary-button" onClick={() => setEditing({})}>
                <Plus size={16} />
                Register learner
              </button>
            </div>
          </div>
          <div className="panel overflow-hidden">
            <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
              <input
                aria-label="Search General Register"
                className="min-w-48 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="Search name, registration number or guardian…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                aria-label="General education level"
                className="rounded-lg border border-slate-300 p-2 text-sm"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                {[
                  "All levels",
                  "Primary",
                  "Secondary",
                  "University",
                  "Vocational",
                  "Out of school",
                  "Completed",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <select
                aria-label="General zone"
                className="rounded-lg border border-slate-300 p-2 text-sm"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
              >
                <option>All zones</option>
                {zones.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <select
                aria-label="General learner status"
                className="rounded-lg border border-slate-300 p-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {["Active learners", "Inactive learners", "All records"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="p-4">Learner</th>
                    <th className="p-4">Education</th>
                    <th className="p-4">Zone / guardian</th>
                    <th className="p-4">
                      {section === "general-documents"
                        ? "Outstanding core documents"
                        : "Programme"}
                    </th>
                    <th className="p-4">Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <button
                          className="font-semibold text-[#0b2d59] hover:underline"
                          onClick={() => open(s.id)}
                        >
                          {fullName(s)}
                        </button>
                        <p className="mt-1 text-xs text-slate-500">
                          {s.registrationNumber} · {ageOn(s.dateOfBirth)} years
                        </p>
                      </td>
                      <td className="p-4">
                        {s.educationLevel} · {s.grade}
                        <p className="mt-1 text-xs text-slate-500">
                          {s.school || "Institution not recorded"}
                          {s.transitionReview ? " · Review transition" : ""}
                        </p>
                      </td>
                      <td className="p-4">
                        {s.zone}
                        <p className="mt-1 text-xs text-slate-500">
                          {s.guardianName} · {s.guardianContact}
                        </p>
                      </td>
                      <td className="max-w-64 p-4 text-xs">
                        {section === "general-documents" ? (
                          <span
                            className={
                              outstanding(s).length
                                ? "text-amber-800"
                                : "text-emerald-700"
                            }
                          >
                            {outstanding(s).join(", ") ||
                              "Core documents complete"}
                          </span>
                        ) : (
                          <>
                            <span>
                              {s.careEnrolled
                                ? "Care Program"
                                : "General Register"}
                            </span>
                            {s.schoolStudentId && (
                              <span className="mt-1 block text-sky-700">
                                Linked Terakoya record
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="p-4">
                        <button
                          className="text-sm font-semibold text-sky-800"
                          onClick={() => open(s.id)}
                        >
                          Open →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <p className="p-9 text-center text-sm text-slate-500">
                  {loading
                    ? "Loading master register…"
                    : "No learners match this selection."}
                </p>
              )}
            </div>
            <p className="border-t border-slate-200 p-4 text-xs text-slate-500">
              {filtered.length} of {students.length} learner records ·
              Confidential staff workspace
            </p>
          </div>
        </>
      )}
      {section === "general-care" && (
        <Suspense fallback={<p>Loading Saturday programme…</p>}>
          <SaturdayCare
            teacher={teacher}
            settings={settings}
            onOpenLearner={open}
          />
        </Suspense>
      )}
      {section === "general-guide" && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-[#0b2d59]">
              Care activities & session plans
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Your existing Care Program guide, room groups, timetable and
              evaluation notes.
            </p>
            <button
              className="secondary-button mt-3"
              onClick={() => onNavigate("general-care")}
            >
              Open official Saturday attendance →
            </button>
          </div>
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Activity participation is recorded here. Official Saturday check-in,
            rotation rules and recognition totals are managed in Care Program
            Attendance.
          </p>
          <Suspense fallback={<p>Loading programme guide…</p>}>
            <CareProgram
              students={schoolLearners}
              teacher={teacher}
              isAdmin={true}
            />
          </Suspense>
        </>
      )}
      {section === "general-progression" && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-[#0b2d59]">
              Annual progression & programme rules
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Keep learners in the master register as they grow. A learner is
              never removed because they turn 15.
            </p>
          </div>
          <section className="panel space-y-5 p-5 sm:p-6">
            <h2 className="font-semibold">Programme settings</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Saturday attendance rule
                <select
                  aria-label="Saturday attendance rule"
                  className="mt-2 block w-full rounded-lg border border-slate-300 p-3 font-normal"
                  value={settingsForm.carePolicy}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      carePolicy: e.target.value as any,
                    })
                  }
                >
                  <option value="alternate">
                    Alternate Saturdays · wait 14 days between visits
                  </option>
                  <option value="zones">
                    Scheduled zones for each Saturday
                  </option>
                  <option value="invitation">
                    Staff invitation for each Saturday
                  </option>
                  <option value="weekly">Every Saturday</option>
                </select>
              </label>
              <div className="rounded-lg bg-slate-50 p-4 text-sm">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={settingsForm.autoPromotion}
                    className="mt-1"
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        autoPromotion: e.target.checked,
                      })
                    }
                  />
                  <span>
                    Automatically advance the master study timeline each January
                    1
                    <span className="mt-2 block text-xs leading-relaxed text-slate-500">
                      The scheduled job catches up in small batches. P.7, S.4,
                      S.6 and final university year transitions require staff
                      review before another annual move.
                    </span>
                  </span>
                </label>
              </div>
            </div>
            <button
              className="primary-button"
              disabled={busy}
              onClick={saveSettings}
            >
              <Settings size={16} />
              Save programme rules
            </button>
            <p className="text-xs leading-relaxed text-slate-500">
              Registration age rule: new intake age 6–14; continuing learners of
              any study level can be added with a recorded reason. Automatic
              master progression retains previous levels and does not alter
              Terakoya marks, school class decisions or report cards.
            </p>
          </section>
          <section className="panel space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Progression due this year</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review the next batch of up to 12 learners before applying any
                  outstanding annual moves.
                </p>
              </div>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => previewProgression()}
              >
                Preview due progression
              </button>
            </div>
            {progression && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr>
                        <th className="p-3">Learner</th>
                        <th className="p-3">From</th>
                        <th className="p-3">Next master level</th>
                        <th className="p-3">Review</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progression.changes?.map((c: any) => (
                        <tr key={c.id} className="border-t border-slate-100">
                          <td className="p-3">{c.name}</td>
                          <td className="p-3">{c.from}</td>
                          <td className="p-3">{c.to}</td>
                          <td className="p-3">{c.review ? "Required" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!progression.changes?.length && (
                  <p className="text-sm text-slate-500">
                    No annual progression is due.
                  </p>
                )}
                {progression.changes?.some((c: any) => !c.held) && (
                  <button
                    className="primary-button"
                    disabled={busy || !settings.autoPromotion}
                    onClick={() => previewProgression(true)}
                  >
                    Apply due progression
                  </button>
                )}
              </>
            )}
          </section>
          <section className="panel p-5">
            <h2 className="font-semibold">Transitions awaiting confirmation</h2>
            <div className="mt-3 divide-y divide-slate-100">
              {students
                .filter((s) => s.transitionReview)
                .map((s) => (
                  <button
                    key={s.id}
                    className="flex w-full items-center justify-between py-3 text-left text-sm"
                    onClick={() => open(s.id)}
                  >
                    <span>
                      {fullName(s)} · {s.educationLevel} {s.grade}
                    </span>
                    <span className="text-sky-800">Review →</span>
                  </button>
                ))}
            </div>
            {!students.some((s) => s.transitionReview) && (
              <p className="mt-3 text-sm text-slate-500">
                No transitions are awaiting review.
              </p>
            )}
          </section>
        </>
      )}
      {selected && !editing && (
        <LearnerOverview
          student={selected}
          teacher={teacher}
          onClose={() => setSelected(null)}
          initialTab={profileTab}
          onOpenSchoolRecord={onOpenSchoolRecord}
          onEdit={(documents, step, terakoya) =>
            setEditing({ student: selected, documents, step, terakoya })
          }
        />
      )}{" "}
      {editing && (
        <RegistrationForm
          teacher={teacher}
          student={editing.student}
          documents={editing.documents}
          initialStep={editing.step}
          initialTerakoya={editing.terakoya}
          initialClassName={editing.className}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      )}
    </div>
  );
}
