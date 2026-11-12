import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Paperclip,
  X,
  Check,
  UserRound,
} from "lucide-react";
import { Teacher } from "../types";
import {
  GeneralStudent,
  GeneralDocument,
  DOCUMENT_CATEGORIES,
  ageOn,
  blankStudent,
  todayInUganda,
} from "./model";
import { FORM_SECTIONS, Field } from "./fields";
import { generalApi, fileData } from "./api";
import { validateGeneralStudent } from "./rules";
import CameraCapture from "./CameraCapture";
type Pending = { id: string; category: string; file: File };
export default function RegistrationForm({
  teacher,
  student,
  documents = [],
  initialStep = 0,
  onSaved,
  onClose,
}: {
  teacher: Teacher;
  student?: GeneralStudent;
  documents?: GeneralDocument[];
  initialStep?: number;
  onSaved: (s: GeneralStudent) => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<GeneralStudent>(() =>
    student ? structuredClone(student) : blankStudent(),
  );
  const [step, setStep] = useState(initialStep),
    [pending, setPending] = useState<Pending[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [camera, setCamera] = useState(false),
    [enrolTerakoya, setEnrolTerakoya] = useState(false),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState(student?.photo || "");
  const form = useRef<HTMLFormElement>(null);
  const api = generalApi(teacher);
  useEffect(() => {
    const stop = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", stop);
    return () => window.removeEventListener("beforeunload", stop);
  }, [dirty]);
  const update = (key: keyof GeneralStudent, value: any) => {
    setData((d) => {
      const changed = { ...d, [key]: value };
      if (key === "educationLevel") changed.grade = "";
      return changed;
    });
    setDirty(true);
  };
  const close = () => {
    if (
      !dirty ||
      window.confirm(
        "Leave this registration form? Unsaved form changes and selected files will be lost.",
      )
    )
      onClose();
  };
  const choose = (category: string, file?: File) => {
    if (!file) return;
    if (
      !["application/pdf", "image/jpeg", "image/png"].includes(file.type) ||
      file.size > 1024 * 1024
    ) {
      setError("Choose a PDF, JPEG or PNG file smaller than 1 MB.");
      return;
    }
    if (category === "Student photo" && !file.type.startsWith("image/")) {
      setError("Choose a JPEG or PNG photo.");
      return;
    }
    setPending((p) => [...p, { id: crypto.randomUUID(), category, file }]);
    setDirty(true);
    setError("");
    if (category === "Student photo") {
      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result));
      reader.readAsDataURL(file);
    }
  };
  const field = (f: Field) => {
    let options = f.options;
    if (f.key === "grade") {
      options =
        data.educationLevel === "Primary"
          ? ["", ...Array.from({ length: 7 }, (_, i) => `P.${i + 1}`)]
          : data.educationLevel === "Secondary"
            ? ["", ...Array.from({ length: 6 }, (_, i) => `S.${i + 1}`)]
            : data.educationLevel === "University"
              ? ["", ...Array.from({ length: 9 }, (_, i) => `Year ${i + 1}`)]
              : undefined;
    }
    const cls =
      "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-100";
    const value = String(data[f.key] ?? "");
    return (
      <label
        key={f.key}
        className={`block text-sm font-medium text-slate-700 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}
      >
        {f.label}
        {f.required && <span className="text-rose-600"> *</span>}
        {options ? (
          <select
            required={f.required}
            className={cls}
            value={value}
            onChange={(e) => update(f.key, e.target.value)}
          >
            {options.map((o) => (
              <option key={o} value={o}>
                {o || "Select / not recorded"}
              </option>
            ))}
          </select>
        ) : f.type === "textarea" ? (
          <textarea
            rows={2}
            className={cls}
            maxLength={4000}
            value={value}
            onChange={(e) => update(f.key, e.target.value)}
          />
        ) : (
          <input
            required={f.required}
            type={f.type || "text"}
            className={cls}
            value={value}
            min={f.type === "number" ? 0 : undefined}
            max={f.type === "date" ? todayInUganda() : undefined}
            onChange={(e) =>
              update(
                f.key,
                f.key === "academicYear" || f.key === "universityDuration"
                  ? Number(e.target.value)
                  : e.target.value,
              )
            }
          />
        )}
      </label>
    );
  };
  const next = () => {
    if (form.current?.reportValidity()) {
      setStep((s) => Math.min(5, s + 1));
      setError("");
    }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 5) {
      next();
      return;
    }
    const invalid = validateGeneralStudent(data);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError("");
    let saved = data;
    try {
      saved = await api<GeneralStudent>(
        `students${data.id ? `/${encodeURIComponent(data.id)}` : ""}`,
        data.id ? "PUT" : "POST",
        { ...data, enrolTerakoya },
      );
      setData(saved);
      for (const item of pending) {
        await api(
          `students/${encodeURIComponent(saved.id)}/documents`,
          "POST",
          { ...(await fileData(item.file)), category: item.category },
        );
        setPending((p) => p.filter((i) => i.id !== item.id));
      }
      saved = await api<GeneralStudent>(
        `students/${encodeURIComponent(saved.id)}`,
      );
      setData(saved);
      setDirty(false);
      onSaved(saved);
    } catch (err: any) {
      setError(
        `${err.message}${saved.id && pending.length ? " The learner record is saved. Remaining selected files can be retried." : ""}`,
      );
      if (saved.id) {
        const latest = await api<GeneralStudent>(
          `students/${encodeURIComponent(saved.id)}`,
        ).catch(() => null);
        if (latest) setData(latest);
      }
    } finally {
      setBusy(false);
    }
  };
  const current = FORM_SECTIONS[step];
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-2 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={
        student ? "Edit general registration" : "Register Ashinaga learner"
      }
    >
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">
              General Register · Ashinaga Uganda
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#0b2d59]">
              {student ? "Update learner record" : "Register a learner"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {data.registrationNumber ||
                "Registration number assigned when saved"}{" "}
              · Step {step + 1} of 6
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            aria-label="Close registration"
            onClick={close}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>
        <form ref={form} onSubmit={submit} className="overflow-y-auto">
          <div className="space-y-6 p-5 sm:p-7">
            <ol
              aria-label="General registration progress"
              className="grid grid-cols-6 gap-2"
            >
              {FORM_SECTIONS.map((s, i) => (
                <li key={s.title} className="min-w-0">
                  <div
                    className={`mb-2 h-1.5 rounded ${i <= step ? "bg-[#0b2d59]" : "bg-slate-200"}`}
                  />
                  <span
                    className={`hidden text-xs sm:block ${i === step ? "font-semibold text-slate-900" : "text-slate-500"}`}
                  >
                    {s.title}
                  </span>
                </li>
              ))}
            </ol>
            <div>
              <h3 className="text-lg font-semibold">{current.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                {current.intro}
              </p>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {current.fields.map(field)}
            </div>
            {step === 0 && data.dateOfBirth && (
              <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
                Age at registration:{" "}
                <strong>
                  {ageOn(data.dateOfBirth, data.intakeDate) ?? "Check dates"}
                </strong>{" "}
                ·{" "}
                {data.intakeType === "New intake"
                  ? "New intake must be age 6–14."
                  : "Continuing records remain available beyond age 14."}
              </p>
            )}
            {step === 1 && student && (
              <label className="block text-sm font-medium text-slate-700">
                Reason for guardian / next-of-kin changes
                <textarea
                  rows={2}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 font-normal"
                  value={data.guardianChangeReason || ""}
                  onChange={(e) =>
                    update("guardianChangeReason", e.target.value)
                  }
                  placeholder="For example: guardian has moved; learner now lives with aunt"
                />
              </label>
            )}
            {step === 2 && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={data.careEnrolled}
                    onChange={(e) => update("careEnrolled", e.target.checked)}
                  />
                  Enrolled in Saturday Care Program
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={data.active}
                    onChange={(e) => update("active", e.target.checked)}
                  />
                  Active Ashinaga learner
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={data.autoPromote}
                    onChange={(e) => update("autoPromote", e.target.checked)}
                  />
                  Include in annual study-level progression
                </label>
                {(data.transitionReview || student?.transitionReview) && (
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={data.transitionReview}
                      onChange={(e) =>
                        update("transitionReview", e.target.checked)
                      }
                    />
                    Education transition needs review (clear after confirming
                    the school / course)
                  </label>
                )}
                {!data.schoolStudentId && data.educationLevel === "Primary" && (
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={enrolTerakoya}
                      onChange={(e) => {
                        setEnrolTerakoya(e.target.checked);
                        if (e.target.checked) {
                          update("school", "Terakoya Primary School");
                          update("inSchool", "Yes");
                        }
                      }}
                    />
                    Also enrol this learner in Terakoya Primary School
                  </label>
                )}
                <p className="text-xs leading-relaxed text-slate-500">
                  The master study timeline advances each year. Terakoya class
                  promotion, marks and report cards remain in the school
                  workspace.
                </p>
              </div>
            )}
            {step === 5 && (
              <div className="space-y-5">
                <div className="flex items-center gap-4 rounded-lg bg-slate-50 p-4">
                  {preview ? (
                    <img
                      src={preview}
                      className="h-24 w-24 rounded-lg object-cover"
                      alt="Learner photo preview"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-slate-200 text-slate-500">
                      <UserRound size={30} />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">
                      {data.surname} {data.otherNames}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {data.educationLevel} · {data.grade} · {data.zone}
                    </p>
                    <button
                      type="button"
                      onClick={() => setCamera(true)}
                      className="secondary-button mt-3"
                    >
                      <Camera size={16} />
                      Take a photo
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                  {DOCUMENT_CATEGORIES.map((category) => {
                    const existing = documents.filter(
                      (d) => d.category === category,
                    );
                    const selected = pending.filter(
                      (p) => p.category === category,
                    );
                    return (
                      <div key={category} className="space-y-2 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong className="text-sm font-medium">
                            {category}
                          </strong>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              aria-label={`${category} document status`}
                              value={
                                selected.length || existing.length
                                  ? "Uploaded"
                                  : data.documentStatus[category] ||
                                    "Missing / follow up"
                              }
                              disabled={!!(selected.length || existing.length)}
                              className="rounded border border-slate-300 px-2 py-1.5 text-xs"
                              onChange={(e) =>
                                update("documentStatus", {
                                  ...data.documentStatus,
                                  [category]: e.target.value,
                                })
                              }
                            >
                              {[
                                "Missing / follow up",
                                "Requested",
                                "Not applicable",
                                "Uploaded",
                              ].map((v) => (
                                <option
                                  key={v}
                                  disabled={
                                    v === "Uploaded" &&
                                    !selected.length &&
                                    !existing.length
                                  }
                                >
                                  {v}
                                </option>
                              ))}
                            </select>
                            <label className="secondary-button cursor-pointer text-xs">
                              <Paperclip size={14} />
                              Attach
                              <input
                                type="file"
                                className="hidden"
                                aria-label={`Upload ${category}`}
                                accept={
                                  category === "Student photo"
                                    ? "image/jpeg,image/png"
                                    : "application/pdf,image/jpeg,image/png"
                                }
                                multiple
                                onChange={(e) => {
                                  Array.from(e.target.files || []).forEach(
                                    (f) => choose(category, f),
                                  );
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        {existing.map((d) => (
                          <p
                            key={d.id}
                            className="flex items-center gap-2 text-xs text-emerald-700"
                          >
                            <Check size={13} />
                            {d.name} · saved
                          </p>
                        ))}
                        {selected.map((p) => (
                          <p
                            key={p.id}
                            className="flex items-center gap-2 text-xs text-sky-800"
                          >
                            <Paperclip size={13} />
                            {p.file.name} · ready to upload
                            <button
                              type="button"
                              aria-label={`Remove selected ${p.file.name}`}
                              onClick={() =>
                                setPending((v) =>
                                  v.filter((i) => i.id !== p.id),
                                )
                              }
                            >
                              <X size={13} />
                            </button>
                          </p>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  Files upload when you save. Maximum 1 MB per file and 10 MB
                  per learner. You can download the completed form and uploaded
                  documents as one combined PDF from the learner overview.
                </p>
              </div>
            )}
          </div>
          <div className="sticky bottom-0 flex flex-wrap justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className="secondary-button"
            >
              Cancel
            </button>
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  className="secondary-button"
                  onClick={() => setStep((s) => s - 1)}
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              )}
              {step < 5 ? (
                <button
                  key="next"
                  type="button"
                  disabled={busy}
                  className="primary-button"
                  onClick={(e) => {
                    e.preventDefault();
                    next();
                  }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  key="save"
                  type="submit"
                  disabled={busy}
                  className="primary-button"
                >
                  {busy
                    ? "Saving record & files…"
                    : data.id
                      ? "Save learner record"
                      : "Register learner"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
      {camera && (
        <CameraCapture
          onCapture={(file) => choose("Student photo", file)}
          onClose={() => setCamera(false)}
        />
      )}
    </div>
  );
}
