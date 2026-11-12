import { useEffect, useState } from "react";
import {
  X,
  Download,
  Edit3,
  FileText,
  Paperclip,
  History,
  Phone,
} from "lucide-react";
import {
  GeneralStudent,
  GeneralDocument,
  fullName,
  ageOn,
  DOCUMENT_CATEGORIES,
} from "./model";
import { Teacher } from "../types";
import { generalApi, downloadBlob } from "./api";
import { FORM_SECTIONS } from "./fields";
import { combinedLearnerPdf } from "./exports";
export default function LearnerOverview({
  student,
  teacher,
  onEdit,
  onClose,
}: {
  student: GeneralStudent;
  teacher: Teacher;
  onEdit: (documents: GeneralDocument[], step?: number) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("Overview"),
    [documents, setDocuments] = useState<GeneralDocument[]>([]),
    [history, setHistory] = useState<any[]>([]),
    [careHistory, setCareHistory] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const api = generalApi(teacher);
  useEffect(() => {
    Promise.all([
      api<GeneralDocument[]>(
        `students/${encodeURIComponent(student.id)}/documents`,
      ),
      api<any[]>(`students/${encodeURIComponent(student.id)}/history`),
      api<any[]>(`students/${encodeURIComponent(student.id)}/care-attendance`),
    ])
      .then(([d, h, c]) => {
        setDocuments(d);
        setHistory(h);
        setCareHistory(c);
      })
      .catch((e) => setError(e.message));
  }, [student.id]);
  const bundle = async () => {
    setBusy(true);
    setError("");
    try {
      await combinedLearnerPdf(student, documents, teacher);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const download = async (d: GeneralDocument) => {
    try {
      const res = await fetch(
        `/api/general/students/${encodeURIComponent(student.id)}/documents/${encodeURIComponent(d.id)}`,
        { headers: { Authorization: `Bearer ${teacher.authToken || ""}` } },
      );
      if (!res.ok) throw new Error("The document could not be downloaded.");
      downloadBlob(await res.blob(), d.name);
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Learner overview"
    >
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              {student.photo && (
                <img
                  className="h-16 w-16 rounded-lg object-cover"
                  src={student.photo}
                  alt="Learner"
                />
              )}
              <div>
                <p className="text-xs font-semibold text-sky-700">
                  {student.registrationNumber}
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#0b2d59]">
                  {fullName(student)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {student.educationLevel} · {student.grade} ·{" "}
                  {ageOn(student.dateOfBirth)} years · {student.zone}
                </p>
              </div>
            </div>
            <button
              aria-label="Close learner overview"
              className="p-2"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="primary-button"
              onClick={() => onEdit(documents)}
            >
              <Edit3 size={15} />
              Edit record
            </button>
            <button
              className="secondary-button"
              disabled={busy}
              onClick={bundle}
            >
              <Download size={15} />
              {busy ? "Combining documents…" : "Combined registration PDF"}
            </button>
          </div>
        </div>
        <div
          className="flex overflow-x-auto border-b border-slate-200 px-5"
          role="tablist"
          aria-label="Learner record sections"
        >
          {[
            "Overview",
            "Family & support",
            "Documents",
            "Guardian history",
            "Saturday attendance",
            "Study history",
            "Guardian message",
          ].map((t) => (
            <button
              role="tab"
              aria-selected={tab === t}
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm ${tab === t ? "border-sky-700 font-semibold text-sky-800" : "border-transparent text-slate-500"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="space-y-5 overflow-y-auto p-5 sm:p-7">
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}
          {tab === "Overview" && (
            <>
              {[
                FORM_SECTIONS[0],
                FORM_SECTIONS[1],
                FORM_SECTIONS[2],
                FORM_SECTIONS[4],
              ].map((section) => (
                <section key={section.title}>
                  <h3 className="mb-3 font-semibold">{section.title}</h3>
                  <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                    {section.fields.map((f) => (
                      <div
                        key={f.key}
                        className="border-b border-slate-100 pb-2"
                      >
                        <dt className="text-xs text-slate-500">{f.label}</dt>
                        <dd className="mt-1 text-sm">
                          {String(student[f.key] ?? "") || "Not recorded"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </>
          )}
          {tab === "Family & support" && (
            <>
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                Confidential family and health information · authorised
                administration staff only.
              </p>
              <dl className="grid gap-4 sm:grid-cols-2">
                {FORM_SECTIONS[3].fields.map((f) => (
                  <div key={f.key} className="border-b border-slate-100 pb-3">
                    <dt className="text-xs text-slate-500">{f.label}</dt>
                    <dd className="mt-1 text-sm">
                      {String(student[f.key] || "Not recorded")}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          {tab === "Documents" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">{`${documents.length} saved attachment${documents.length === 1 ? "" : "s"}`}</p>
                <button
                  className="primary-button"
                  onClick={() => onEdit(documents, 5)}
                >
                  <Paperclip size={16} />
                  Add documents / photo
                </button>
              </div>
              {DOCUMENT_CATEGORIES.map((category) => {
                const files = documents.filter((d) => d.category === category);
                return (
                  <section
                    key={category}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex justify-between gap-3 text-sm">
                      <strong>{category}</strong>
                      <span
                        className={
                          files.length ? "text-emerald-700" : "text-amber-700"
                        }
                      >
                        {files.length
                          ? "Uploaded"
                          : student.documentStatus[category] ||
                            "Missing / follow up"}
                      </span>
                    </div>
                    {files.map((d) => (
                      <button
                        key={d.id}
                        className="mt-3 flex items-center gap-2 text-sm text-sky-800 underline"
                        onClick={() => download(d)}
                      >
                        <FileText size={15} />
                        {d.name} · {Math.ceil(d.size / 1024)} KB
                        <Download size={13} />
                      </button>
                    ))}
                  </section>
                );
              })}
            </>
          )}
          {tab === "Guardian history" && (
            <>
              <p className="text-sm text-slate-500">
                Current guardian: <strong>{student.guardianName}</strong> ·{" "}
                {student.guardianContact}
              </p>
              {!history.length ? (
                <p className="rounded-lg bg-slate-50 p-5 text-sm text-slate-500">
                  No guardian changes have been recorded.
                </p>
              ) : (
                history.map((h) => {
                  const before = JSON.parse(h.before_value || "{}"),
                    after = JSON.parse(h.after_value);
                  return (
                    <section
                      key={h.id}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <History size={16} />
                        {new Date(h.created_at).toLocaleString("en-UG", {
                          timeZone: "Africa/Kampala",
                        })}
                      </p>
                      <p className="mt-2 text-sm">
                        {before.guardianName || "Not recorded"} (
                        {before.guardianContact || "No phone"}) →{" "}
                        {after.guardianName} ({after.guardianContact})
                      </p>
                      <p className="mt-2 text-sm text-slate-600">{h.reason}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Recorded by {h.changed_by}
                      </p>
                    </section>
                  );
                })
              )}
            </>
          )}
          {tab === "Saturday attendance" && (
            <>
              <p className="rounded-lg bg-sky-50 p-4 text-sm text-sky-900">
                <strong>
                  {careHistory.filter((r) => r.status === "Present").length}
                </strong>{" "}
                Saturday visits attended ·{" "}
                {careHistory.filter((r) => r.status === "Absent").length} marked
                absent
              </p>
              {careHistory.length ? (
                careHistory.map((r) => (
                  <div
                    key={r.date}
                    className="flex flex-wrap justify-between gap-3 border-b border-slate-100 py-3 text-sm"
                  >
                    <span>{r.date}</span>
                    <strong>{r.status}</strong>
                    <span className="text-xs text-slate-500">
                      {r.override_reason || r.recorded_by}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No official Saturday check-ins have been recorded yet.
                </p>
              )}
            </>
          )}
          {tab === "Study history" && (
            <>
              <p className="rounded-lg bg-sky-50 p-4 text-sm text-sky-900">
                Current master level:{" "}
                <strong>
                  {student.educationLevel} {student.grade}
                </strong>{" "}
                · {student.academicYear}
                {student.transitionReview
                  ? " · School / course transition needs review."
                  : ""}
              </p>
              {student.progressionHistory?.length ? (
                student.progressionHistory.map((h, i) => (
                  <div
                    key={i}
                    className="border-b border-slate-100 p-3 text-sm"
                  >
                    <strong>{h.year}</strong> · {h.from} → {h.to}
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(h.at).toLocaleDateString("en-UG")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No annual progression has been recorded yet.
                </p>
              )}
            </>
          )}
          {tab === "Guardian message" && (
            <div className="space-y-4">
              <p className="flex gap-2 text-sm">
                <Phone size={16} />
                {student.guardianName} · {student.guardianContact}
              </p>
              <p className="text-sm text-slate-500">
                Prepare a message for staff review. Messages are never sent
                automatically.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="secondary-button"
                  onClick={() =>
                    setMessage(
                      `Dear ${student.guardianName}, we would like to follow up on ${fullName(student)}'s Saturday Care Program attendance. Please contact Ashinaga Uganda Rainbow House to confirm the next scheduled visit. Thank you.`,
                    )
                  }
                >
                  Attendance follow-up
                </button>
                <button
                  className="secondary-button"
                  onClick={() =>
                    setMessage(
                      `Dear ${student.guardianName}, please contact Ashinaga Uganda Rainbow House to review the outstanding registration documents for ${fullName(student)}. Thank you.`,
                    )
                  }
                >
                  Document follow-up
                </button>
              </div>
              <textarea
                aria-label="Guardian message draft"
                rows={6}
                className="w-full rounded-lg border border-slate-300 p-3 text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                className="primary-button"
                disabled={!message.trim()}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(message);
                    setError("");
                  } catch {
                    setError(
                      "Copy is unavailable in this browser. Select and copy the draft text.",
                    );
                  }
                }}
              >
                Copy reviewed message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
