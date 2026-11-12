import {
  PUPIL_DOCUMENT_TABLE,
  registrationDocuments,
  registrationDocument,
} from "./learner-documents";
import {
  blankStudent,
  DEFAULT_SETTINGS,
  GeneralStudent,
  RegisterSettings,
  CareDay,
  CareRosterRow,
  DOCUMENT_CATEGORIES,
  addDays,
  todayInUganda,
} from "../src/general/model";
import {
  validateGeneralStudent,
  nextEducation,
  careEligibility,
} from "../src/general/rules";
type Session = { sub: string; role: string };
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const GENERAL_SCHEMA = [
  PUPIL_DOCUMENT_TABLE,
  `CREATE TABLE IF NOT EXISTS general_students (id TEXT PRIMARY KEY,registration_number TEXT UNIQUE NOT NULL,school_student_id TEXT UNIQUE,payload TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS general_register_counter (id INTEGER PRIMARY KEY CHECK(id=1),value INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS general_guardian_history (id TEXT PRIMARY KEY,student_id TEXT NOT NULL,before_value TEXT,after_value TEXT NOT NULL,reason TEXT NOT NULL,changed_by TEXT NOT NULL,created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS general_documents (id TEXT PRIMARY KEY,student_id TEXT NOT NULL,category TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,data TEXT NOT NULL,uploaded_by TEXT NOT NULL,created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_general_documents_student ON general_documents(student_id)`,
  `CREATE TABLE IF NOT EXISTS general_settings (id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS general_care_days (id TEXT PRIMARY KEY,date TEXT UNIQUE NOT NULL,payload TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS general_care_attendance (student_id TEXT NOT NULL,date TEXT NOT NULL,status TEXT NOT NULL,override_reason TEXT NOT NULL DEFAULT '',recorded_by TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(student_id,date))`,
  `CREATE INDEX IF NOT EXISTS idx_general_care_date ON general_care_attendance(date)`,
  `CREATE TABLE IF NOT EXISTS general_progression_history (id TEXT PRIMARY KEY,student_id TEXT NOT NULL,academic_year INTEGER NOT NULL,from_level TEXT NOT NULL,to_level TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(student_id,academic_year))`,
];
const initialized = new WeakSet<object>();
export async function ensureGeneralSchema(db: D1Database) {
  if (initialized.has(db)) return 0;
  await db.batch(GENERAL_SCHEMA.map((s) => db.prepare(s)));
  initialized.add(db);
  return GENERAL_SCHEMA.length;
}
const guardianKeys = [
  "guardianName",
  "guardianRelationship",
  "guardianContact",
  "guardianContact2",
  "nextOfKin",
  "nextOfKinRelationship",
  "nextOfKinContact",
];
const guardian = (s: any) =>
  Object.fromEntries(guardianKeys.map((k) => [k, s[k] || ""]));
const parseStudent = (r: any): GeneralStudent => {
  const s = {
    ...blankStudent(),
    ...JSON.parse(r.payload),
    id: r.id,
    registrationNumber: r.registration_number,
    schoolStudentId: r.school_student_id || undefined,
    revision: r.revision,
    updatedAt: r.updated_at,
  };
  delete s._writeToken;
  return s;
};
const audit = (db: D1Database, actor: Session, action: string, id: string) =>
  db
    .prepare(
      "INSERT INTO audit_logs (id,actor_username,actor_role,action,entity_type,entity_id,created_at) VALUES (?,?,?,?,?,?,?)",
    )
    .bind(
      crypto.randomUUID(),
      actor.sub,
      actor.role,
      action,
      "general_register",
      id,
      Date.now(),
    );
const validDate = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
const readSettings = async (db: D1Database): Promise<RegisterSettings> => ({
  ...DEFAULT_SETTINGS,
  ...JSON.parse(
    (
      await db
        .prepare("SELECT payload FROM general_settings WHERE id=1")
        .first<{ payload: string }>()
    )?.payload || "{}",
  ),
});
// Link every existing school pupil once. The same stable ID is used by Care
// Program and school records; this does not copy marks, attendance or credentials.
export async function importSchoolLearners(db: D1Database) {
  const year = Number(todayInUganda().slice(0, 4)),
    now = Date.now();
  // If a learner already has a master record, link an exact, unambiguous
  // name-and-birth-date school match instead of creating another master record.
  await db
    .prepare(
      `UPDATE general_students AS g SET school_student_id=s.id,revision=g.revision+1
 FROM students AS s WHERE g.school_student_id IS NULL
 AND lower(trim(json_extract(g.payload,'$.surname')))=lower(trim(json_extract(s.payload,'$.surname')))
 AND lower(trim(json_extract(g.payload,'$.otherNames')))=lower(trim(json_extract(s.payload,'$.otherNames')))
 AND json_extract(g.payload,'$.dateOfBirth')=json_extract(s.payload,'$.dateOfBirth')
 AND (SELECT COUNT(*) FROM general_students g2 WHERE lower(trim(json_extract(g2.payload,'$.surname')))=lower(trim(json_extract(s.payload,'$.surname'))) AND lower(trim(json_extract(g2.payload,'$.otherNames')))=lower(trim(json_extract(s.payload,'$.otherNames'))) AND json_extract(g2.payload,'$.dateOfBirth')=json_extract(s.payload,'$.dateOfBirth'))=1
 AND (SELECT COUNT(*) FROM students s2 WHERE lower(trim(json_extract(s2.payload,'$.surname')))=lower(trim(json_extract(s.payload,'$.surname'))) AND lower(trim(json_extract(s2.payload,'$.otherNames')))=lower(trim(json_extract(s.payload,'$.otherNames'))) AND json_extract(s2.payload,'$.dateOfBirth')=json_extract(s.payload,'$.dateOfBirth'))=1
 AND NOT EXISTS (SELECT 1 FROM general_students linked WHERE linked.school_student_id=s.id)`,
    )
    .run();
  await db
    .prepare(
      `INSERT OR IGNORE INTO general_students (id,registration_number,school_student_id,payload,revision,created_at,updated_at)
 SELECT s.id,'TK-'||s.id,s.id,json_patch(?,json_set(s.payload,'$.zone',coalesce(json_extract(s.payload,'$.zoneInNansana'),''),'$.grade',coalesce(json_extract(s.payload,'$.className'),''),'$.educationLevel',CASE WHEN json_extract(s.payload,'$.className')='Graduated' THEN 'Secondary' ELSE 'Primary' END,'$.intakeType','Continuing learner','$.intakeReason','Linked existing Terakoya record','$.school','Terakoya Primary School','$.inSchool','Yes')),1,?,? FROM students s WHERE NOT EXISTS (SELECT 1 FROM general_students g WHERE g.school_student_id=s.id)`,
    )
    .bind(JSON.stringify({ ...blankStudent(), academicYear: year }), now, now)
    .run();
  // School edits update shared details and retain the previous guardian contacts.
  const rows = await db
    .prepare(
      `SELECT g.*,s.payload AS school_payload,s.updated_at AS school_updated FROM general_students g JOIN students s ON s.id=g.school_student_id WHERE s.updated_at>g.updated_at LIMIT 10`,
    )
    .all<any>();
  for (const row of rows.results) {
    const old = parseStudent(row),
      school = JSON.parse(row.school_payload);
    const updated = { ...old };
    for (const k of [
      "surname",
      "otherNames",
      "gender",
      "dateOfBirth",
      "guardianName",
      "guardianContact",
      "guardianContact2",
      "guardianRelationship",
      "nextOfKin",
      "nextOfKinContact",
      "communityWorker",
      "workerContact",
      "photo",
    ] as const)
      if (school[k] !== undefined) (updated as any)[k] = school[k];
    updated.zone = school.zoneInNansana || old.zone;
    // The General Register keeps its projected study level at transitions.
    if (
      !old.progressionHistory?.length &&
      !old.transitionReview &&
      old.educationLevel === "Primary" &&
      /^P\.[1-7]$/.test(school.className)
    )
      updated.grade = school.className;
    const statements = [
      db
        .prepare(
          "UPDATE general_students SET payload=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
        )
        .bind(
          JSON.stringify(updated),
          row.school_updated,
          row.id,
          row.revision,
        ),
    ];
    if (JSON.stringify(guardian(old)) !== JSON.stringify(guardian(updated)))
      statements.push(
        db
          .prepare(
            "INSERT INTO general_guardian_history VALUES (?,?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            row.id,
            JSON.stringify(guardian(old)),
            JSON.stringify(guardian(updated)),
            "Updated from Terakoya pupil record",
            "school-workspace",
            new Date().toISOString(),
          ),
      );
    await db.batch(statements);
  }
}
function schoolPayload(s: GeneralStudent, existing: any = {}) {
  return {
    ...existing,
    id: s.schoolStudentId || s.id,
    surname: s.surname,
    otherNames: s.otherNames,
    gender: s.gender,
    dateOfBirth: s.dateOfBirth,
    className: existing.className || s.grade,
    yearOfEntry: existing.yearOfEntry || Number(s.intakeDate.slice(0, 4)),
    photo: s.photo,
    guardianName: s.guardianName,
    guardianRelationship: s.guardianRelationship,
    guardianContact: s.guardianContact,
    guardianContact2: s.guardianContact2,
    nextOfKin: s.nextOfKin,
    nextOfKinContact: s.nextOfKinContact,
    communityWorker: s.communityWorker,
    workerContact: s.workerContact,
    zoneInNansana: s.zone,
    school: s.school,
    hasScholarship: existing.hasScholarship || false,
  };
}
async function schoolSync(
  db: D1Database,
  s: GeneralStudent,
  now: number,
  writeToken: string,
) {
  if (!s.schoolStudentId) return [];
  const row = await db
    .prepare("SELECT payload FROM students WHERE id=?")
    .bind(s.schoolStudentId)
    .first<{ payload: string }>();
  if (!row && (s.educationLevel !== "Primary" || !/^P\.[1-7]$/.test(s.grade)))
    return [];
  return [
    db
      .prepare(
        `INSERT INTO students (id,payload,created_at,updated_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM general_students WHERE id=? AND json_extract(payload,'$._writeToken')=?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at`,
      )
      .bind(
        s.schoolStudentId,
        JSON.stringify(schoolPayload(s, row ? JSON.parse(row.payload) : {})),
        now,
        now,
        s.id,
        writeToken,
      ),
  ];
}
async function careRoster(db: D1Database, date: string) {
  const settings = await readSettings(db);
  const row = await db
    .prepare("SELECT * FROM general_care_days WHERE date=?")
    .bind(date)
    .first<any>();
  const day: CareDay = row
    ? { ...JSON.parse(row.payload), revision: row.revision }
    : {
        id: `saturday-${date}`,
        date,
        title: "Saturday Care Program",
        zones: [],
        invitedIds: [],
        revision: 0,
        status: "planned",
      };
  const [learners, counts, attendance] = await Promise.all([
    db
      .prepare(
        "SELECT * FROM general_students WHERE json_extract(payload,'$.careEnrolled')=1 AND json_extract(payload,'$.active')=1 ORDER BY json_extract(payload,'$.zone'),json_extract(payload,'$.surname')",
      )
      .all<any>(),
    db
      .prepare(
        "SELECT student_id,COUNT(DISTINCT date) AS days,MAX(date) AS last_date FROM general_care_attendance WHERE status='Present' AND date<? GROUP BY student_id",
      )
      .bind(date)
      .all<any>(),
    db
      .prepare("SELECT * FROM general_care_attendance WHERE date=?")
      .bind(date)
      .all<any>(),
  ]);
  const rows: CareRosterRow[] = learners.results.map((r) => {
    const s = parseStudent(r),
      c = counts.results.find((c) => c.student_id === s.id),
      a = attendance.results.find((a) => a.student_id === s.id) || null;
    const invited = day.invitedIds.includes(s.id);
    return {
      student: {
        id: s.id,
        registrationNumber: s.registrationNumber,
        surname: s.surname,
        otherNames: s.otherNames,
        dateOfBirth: s.dateOfBirth,
        zone: s.zone,
        grade: s.grade,
        educationLevel: s.educationLevel,
        guardianName: s.guardianName,
        guardianContact: s.guardianContact,
      },
      ...careEligibility(
        s,
        date,
        c?.last_date || null,
        settings,
        day.zones,
        invited,
      ),
      invited,
      attendedDays: Number(c?.days || 0) + (a?.status === "Present" ? 1 : 0),
      lastAttended: c?.last_date || null,
      attendance: a,
    };
  });
  return { day, rows, policy: settings.carePolicy, nextDate: addDays(date, 7) };
}
export async function runGeneralProgression(
  env: Env,
  actor: Session,
  targetYear = Number(todayInUganda().slice(0, 4)),
  dryRun = false,
) {
  await ensureGeneralSchema(env.DB);
  const settings = await readSettings(env.DB);
  if (!settings.autoPromotion && !dryRun)
    return { promoted: 0, disabled: true };
  const rows = await env.DB.prepare(
    "SELECT * FROM general_students WHERE json_extract(payload,'$.active')=1 AND json_extract(payload,'$.autoPromote')=1 AND coalesce(json_extract(payload,'$.transitionReview'),0)=0 AND CAST(json_extract(payload,'$.academicYear') AS INTEGER)<? AND json_extract(payload,'$.educationLevel') NOT IN ('Completed','Out of school','Vocational') ORDER BY id LIMIT 12",
  )
    .bind(targetYear)
    .all<any>();
  const changes = [];
  let promoted = 0;
  for (const row of rows.results) {
    const s = parseStudent(row);
    if (s.transitionReview) {
      changes.push({
        id: s.id,
        name: `${s.surname} ${s.otherNames}`,
        from: `${s.educationLevel} ${s.grade}`,
        to: "Review the previous transition first",
        review: true,
        held: true,
      });
      continue;
    }
    const next = nextEducation(s),
      toYear = s.academicYear + 1;
    const change = {
      id: s.id,
      name: `${s.surname} ${s.otherNames}`,
      year: toYear,
      from: `${s.educationLevel} ${s.grade}`,
      to: `${next.educationLevel} ${next.grade}`,
      review: next.transitionReview,
      held: false,
    };
    changes.push(change);
    if (dryRun) continue;
    const now = Date.now(),
      writeToken = crypto.randomUUID();
    const updated = {
      ...s,
      _writeToken: writeToken,
      ...next,
      academicYear: toYear,
      progressionHistory: [
        ...(s.progressionHistory || []),
        {
          year: toYear,
          from: change.from,
          to: change.to,
          at: new Date(now).toISOString(),
        },
      ],
    };
    // A study transition in the master record never invents a school admission or
    // changes a Terakoya mark sheet. School promotion remains an academic decision.
    const result = await env.DB.batch([
      env.DB.prepare(
        "UPDATE general_students SET payload=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
      ).bind(JSON.stringify(updated), now, s.id, s.revision),
      env.DB.prepare(
        `INSERT OR IGNORE INTO general_progression_history (id,student_id,academic_year,from_level,to_level,created_by,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM general_students WHERE id=? AND json_extract(payload,'$._writeToken')=?)`,
      ).bind(
        crypto.randomUUID(),
        s.id,
        toYear,
        change.from,
        change.to,
        actor.sub,
        new Date(now).toISOString(),
        s.id,
        writeToken,
      ),
    ]);
    if (result[0].meta.changes) promoted++;
  }
  return {
    promoted,
    changes,
    batchLimit: 12,
    remainingPossible: rows.results.length === 12,
  };
}
export async function scheduledGeneralProgression(env: Env) {
  await ensureGeneralSchema(env.DB);
  const settings = await readSettings(env.DB),
    today = todayInUganda();
  if (
    today.slice(5) >=
    `${String(settings.promotionMonth).padStart(2, "0")}-${String(settings.promotionDay).padStart(2, "0")}`
  )
    await runGeneralProgression(env, {
      sub: "annual-progression",
      role: "System",
    });
}
export async function handleGeneralRegister(
  request: Request,
  env: Env,
  session: Session,
): Promise<Response | null> {
  const u = new URL(request.url),
    path = u.pathname;
  if (!path.startsWith("/api/general/")) return null;
  const staff = await env.DB.prepare(
    "SELECT role FROM staff WHERE username=? AND active=1",
  )
    .bind(session.sub)
    .first<{ role: string }>();
  if (!staff)
    return json({ message: "Sign in with an active staff account." }, 401);
  if (!["Headteacher", "DOS"].includes(staff.role))
    return json(
      {
        message:
          "General Register access is restricted to authorised administration staff.",
      },
      403,
    );
  session = { ...session, role: staff.role };
  await ensureGeneralSchema(env.DB);
  if (path === "/api/general/students" && request.method === "GET") {
    await importSchoolLearners(env.DB);
    const rows = await env.DB.prepare(
      "SELECT id,registration_number,school_student_id,revision,created_at,updated_at,json_remove(payload,'$.photo','$.hivDetails','$.motherCauseOfDeath','$.fatherCauseOfDeath','$.survivingParentHivStatus','$.survivingParentHealth','$.otherConditions','$.familyConcerns','$.studentConcerns','$.officialComments') AS payload FROM general_students ORDER BY created_at DESC",
    ).all();
    return json(rows.results.map(parseStudent));
  }
  if (path === "/api/general/settings") {
    if (request.method === "GET") return json(await readSettings(env.DB));
    if (request.method === "PUT") {
      const body = (await request.json()) as RegisterSettings;
      if (
        !["alternate", "zones", "invitation", "weekly"].includes(
          body.carePolicy,
        ) ||
        typeof body.autoPromotion !== "boolean" ||
        body.promotionMonth !== 1 ||
        body.promotionDay !== 1
      )
        return json(
          {
            message:
              "Select an attendance rule and an annual January 1 progression setting.",
          },
          400,
        );
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO general_settings VALUES (1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
        ).bind(JSON.stringify(body)),
        audit(env.DB, session, "REGISTER_SETTINGS_UPDATED", "settings"),
      ]);
      return json(body);
    }
  }
  if (path === "/api/general/progression" && request.method === "POST") {
    const b = (await request.json()) as any;
    return json(
      await runGeneralProgression(
        env,
        session,
        Number(todayInUganda().slice(0, 4)),
        b.preview !== false,
      ),
    );
  }
  const schoolRecordMatch = path.match(
    /^\/api\/general\/students\/by-school\/([^/]+)$/,
  );
  if (schoolRecordMatch && request.method === "GET") {
    await importSchoolLearners(env.DB);
    const row = await env.DB.prepare(
      "SELECT * FROM general_students WHERE school_student_id=?",
    )
      .bind(decodeURIComponent(schoolRecordMatch[1]))
      .first();
    return row
      ? json(parseStudent(row))
      : json(
          {
            message:
              "This school pupil is unavailable. Refresh the Terakoya register.",
          },
          404,
        );
  }
  const studentMatch = path.match(/^\/api\/general\/students(?:\/([^/]+))?$/);
  if (studentMatch?.[1] && request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT * FROM general_students WHERE id=?",
    )
      .bind(decodeURIComponent(studentMatch[1]))
      .first();
    return row
      ? json(parseStudent(row))
      : json({ message: "Learner not found." }, 404);
  }
  if (studentMatch && ["POST", "PUT"].includes(request.method)) {
    const body = (await request.json()) as any;
    if (JSON.stringify(body).length > 300000)
      return json(
        {
          message:
            "The form is too large. Upload documents in the documents step.",
        },
        413,
      );
    const id = studentMatch[1]
      ? decodeURIComponent(studentMatch[1])
      : `au-${crypto.randomUUID()}`;
    const current = studentMatch[1]
      ? await env.DB.prepare("SELECT * FROM general_students WHERE id=?")
          .bind(id)
          .first<any>()
      : null;
    if (studentMatch[1] && !current)
      return json({ message: "Learner not found." }, 404);
    if (current && body.revision !== current.revision)
      return json(
        {
          message:
            "This learner was changed by another staff member. Reopen the record before saving.",
        },
        409,
      );
    const existing = current ? parseStudent(current) : null;
    const s: GeneralStudent = {
      ...blankStudent(),
      ...body,
      id,
      revision: current ? current.revision + 1 : 1,
      schoolStudentId: current?.school_student_id || undefined,
      registrationNumber: current?.registration_number || "",
    };
    // Ignore unknown fields and limit each text field, including confidential notes.
    for (const key of Object.keys(blankStudent())) {
      const v = (s as any)[key];
      if (typeof v === "string" && key !== "photo")
        (s as any)[key] = v.trim().slice(0, 4000);
    }
    s.photo = existing?.photo || "";
    for (const [key, value] of Object.entries(blankStudent()))
      if (typeof value === "string" && typeof (s as any)[key] !== "string")
        return json(
          {
            message:
              "A form field has an invalid value. Reopen the learner record.",
          },
          400,
        );
    for (const key of [
      "careEnrolled",
      "active",
      "autoPromote",
      "transitionReview",
    ] as const)
      if (typeof s[key] !== "boolean")
        return json({ message: "Invalid programme option." }, 400);
    if (
      !s.documentStatus ||
      typeof s.documentStatus !== "object" ||
      Array.isArray(s.documentStatus) ||
      Object.values(s.documentStatus).some(
        (v) =>
          typeof v !== "string" ||
          ![
            "Missing / follow up",
            "Requested",
            "Not applicable",
            "Uploaded",
          ].includes(v),
      )
    )
      return json({ message: "Invalid document checklist." }, 400);
    s.progressionHistory = existing?.progressionHistory || [];
    const error = validateGeneralStudent(s);
    if (error) return json({ message: error }, 400);
    const duplicate = await env.DB.prepare(
      "SELECT registration_number FROM general_students WHERE id<>? AND lower(trim(json_extract(payload,'$.surname')))=lower(trim(?)) AND lower(trim(json_extract(payload,'$.otherNames')))=lower(trim(?)) AND json_extract(payload,'$.dateOfBirth')=? LIMIT 1",
    )
      .bind(id, s.surname, s.otherNames, s.dateOfBirth)
      .first<any>();
    if (duplicate)
      return json(
        {
          message: `This learner is already registered as ${duplicate.registration_number}. Open the existing record.`,
        },
        409,
      );
    if (
      existing &&
      JSON.stringify(guardian(existing)) !== JSON.stringify(guardian(s)) &&
      !String(body.guardianChangeReason || "").trim()
    )
      return json(
        {
          message:
            "Enter a reason for changing the guardian or next-of-kin details.",
        },
        400,
      );
    if (!current) {
      const c = await env.DB.prepare(
        "INSERT INTO general_register_counter (id,value) VALUES (1,1) ON CONFLICT(id) DO UPDATE SET value=value+1 RETURNING value",
      ).first<{ value: number }>();
      s.registrationNumber = `AU-${s.intakeDate.slice(0, 4)}-${String(c!.value).padStart(5, "0")}`;
    }
    if (body.enrolTerakoya === true && !s.schoolStudentId) {
      if (s.educationLevel !== "Primary" || !/^P\.[1-7]$/.test(s.grade))
        return json(
          { message: "Only primary learners can be enrolled in Terakoya." },
          400,
        );
      const matches = await env.DB.prepare(
        "SELECT id FROM students WHERE lower(trim(json_extract(payload,'$.surname')))=lower(trim(?)) AND lower(trim(json_extract(payload,'$.otherNames')))=lower(trim(?)) AND json_extract(payload,'$.dateOfBirth')=? LIMIT 2",
      )
        .bind(s.surname, s.otherNames, s.dateOfBirth)
        .all<{ id: string }>();
      if (matches.results.length > 1)
        return json(
          {
            message:
              "More than one school record matches. Resolve the duplicate school records before enrolling this learner.",
          },
          409,
        );
      const schoolId = matches.results[0]?.id || s.id;
      const linked = await env.DB.prepare(
        "SELECT id FROM general_students WHERE school_student_id=? AND id<>?",
      )
        .bind(schoolId, s.id)
        .first();
      if (linked)
        return json(
          {
            message:
              "This school pupil is already linked to another master record. Open that record instead.",
          },
          409,
        );
      s.schoolStudentId = schoolId;
      s.school = "Terakoya Primary School";
      s.inSchool = "Yes";
    }
    delete s.guardianChangeReason;
    const now = Date.now(),
      statements: D1PreparedStatement[] = [],
      writeToken = crypto.randomUUID();
    (s as any)._writeToken = writeToken;
    if (current)
      statements.push(
        env.DB.prepare(
          "UPDATE general_students SET payload=?,school_student_id=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
        ).bind(
          JSON.stringify(s),
          s.schoolStudentId || null,
          now,
          id,
          current.revision,
        ),
      );
    else
      statements.push(
        env.DB.prepare(
          "INSERT INTO general_students VALUES (?,?,?,?,?,?,?)",
        ).bind(
          id,
          s.registrationNumber,
          s.schoolStudentId || null,
          JSON.stringify(s),
          1,
          now,
          now,
        ),
      );
    if (
      existing &&
      JSON.stringify(guardian(existing)) !== JSON.stringify(guardian(s))
    )
      statements.push(
        env.DB.prepare(
          "INSERT INTO general_guardian_history SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM general_students WHERE id=? AND json_extract(payload,'$._writeToken')=?)",
        ).bind(
          crypto.randomUUID(),
          id,
          JSON.stringify(guardian(existing)),
          JSON.stringify(guardian(s)),
          String(body.guardianChangeReason).slice(0, 1000),
          session.sub,
          new Date(now).toISOString(),
          id,
          writeToken,
        ),
      );
    statements.push(
      ...(await schoolSync(env.DB, s, now, writeToken)),
      env.DB.prepare(
        "INSERT INTO audit_logs (id,actor_username,actor_role,action,entity_type,entity_id,created_at) SELECT ?,?,?,?,'general_register',?,? WHERE EXISTS (SELECT 1 FROM general_students WHERE id=? AND json_extract(payload,'$._writeToken')=?)",
      ).bind(
        crypto.randomUUID(),
        session.sub,
        session.role,
        current ? "LEARNER_UPDATED" : "LEARNER_REGISTERED",
        id,
        now,
        id,
        writeToken,
      ),
    );
    const result = await env.DB.batch(statements);
    if (current && !result[0].meta.changes)
      return json(
        {
          message:
            "Another staff member saved this record first. Reload before editing.",
        },
        409,
      );
    delete (s as any)._writeToken;
    return json({ ...s, updatedAt: now }, current ? 200 : 201);
  }
  const detail = path.match(
    /^\/api\/general\/students\/([^/]+)\/(history|documents|photo|care-attendance)(?:\/([^/]+))?$/,
  );
  if (detail) {
    const id = decodeURIComponent(detail[1]);
    const row = await env.DB.prepare(
      "SELECT * FROM general_students WHERE id=?",
    )
      .bind(id)
      .first<any>();
    if (!row) return json({ message: "Learner not found." }, 404);
    if (detail[2] === "care-attendance" && request.method === "GET") {
      const rows = await env.DB.prepare(
        "SELECT date,status,override_reason,recorded_by,updated_at FROM general_care_attendance WHERE student_id=? ORDER BY date DESC",
      )
        .bind(id)
        .all();
      return json(rows.results);
    }
    if (detail[2] === "history" && request.method === "GET") {
      const r = await env.DB.prepare(
        "SELECT * FROM general_guardian_history WHERE student_id=? ORDER BY created_at DESC",
      )
        .bind(id)
        .all();
      return json(r.results);
    }
    if (detail[2] === "documents" && !detail[3] && request.method === "GET") {
      return json(
        await registrationDocuments(env.DB, id, row.school_student_id),
      );
    }
    if (detail[2] === "documents" && detail[3] && request.method === "GET") {
      const doc = await registrationDocument(
        env.DB,
        id,
        row.school_student_id,
        decodeURIComponent(detail[3]),
      );
      if (!doc) return json({ message: "Document not found." }, 404);
      return new Response(
        Uint8Array.from(atob(doc.data), (c) => c.charCodeAt(0)),
        {
          headers: {
            "Content-Type": doc.mime,
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }
    if (
      (detail[2] === "documents" || detail[2] === "photo") &&
      request.method === "POST"
    ) {
      const b = (await request.json()) as any;
      const data = String(b.data || ""),
        mime = String(b.mime || ""),
        name = String(b.name || "")
          .trim()
          .slice(0, 180),
        category = String(b.category || "Other document").slice(0, 80);
      if (
        !name ||
        !["application/pdf", "image/jpeg", "image/png"].includes(mime) ||
        data.length > 1400000 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(data)
      )
        return json(
          { message: "Choose a PDF, JPEG or PNG of at most 1 MB." },
          400,
        );
      let bytes: Uint8Array;
      try {
        bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      } catch {
        return json({ message: "Invalid file encoding." }, 400);
      }
      if (!DOCUMENT_CATEGORIES.includes(category as any))
        return json({ message: "Choose a supported document category." }, 400);
      const valid =
        mime === "application/pdf"
          ? new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-"
          : mime === "image/png"
            ? [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)
            : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      if (!valid || bytes.length > 1024 * 1024)
        return json(
          {
            message:
              "The file format or size is not accepted (PDF, JPEG or PNG, up to 1 MB).",
          },
          400,
        );
      const total = await env.DB.prepare(
        "SELECT COALESCE(SUM(size),0) AS n FROM general_documents WHERE student_id=?",
      )
        .bind(id)
        .first<{ n: number }>();
      if ((total?.n || 0) + bytes.length > 10 * 1024 * 1024)
        return json(
          {
            message:
              "This learner’s attachments have reached 10 MB. Reduce large scans before uploading.",
          },
          400,
        );
      const docId = crypto.randomUUID(),
        now = Date.now(),
        s = parseStudent(row);
      s.documentStatus = { ...s.documentStatus, [category]: "Uploaded" };
      if (category === "Student photo") {
        if (mime === "application/pdf")
          return json(
            { message: "Student photos must be JPEG or PNG images." },
            400,
          );
        s.photo = `data:${mime};base64,${data}`;
      }
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO general_documents VALUES (?,?,?,?,?,?,?,?,?)",
        ).bind(
          docId,
          id,
          category,
          name,
          mime,
          bytes.length,
          data,
          session.sub,
          new Date(now).toISOString(),
        ),
        env.DB.prepare(
          "UPDATE general_students SET payload=json_set(payload,?,'Uploaded','$.photo',CASE WHEN ?='Student photo' THEN ? ELSE json_extract(payload,'$.photo') END),revision=revision+1,updated_at=? WHERE id=?",
        ).bind(
          "$.documentStatus." + JSON.stringify(category),
          category,
          s.photo,
          now,
          id,
        ),
        ...(category === "Student photo" && s.schoolStudentId
          ? [
              env.DB.prepare(
                "UPDATE students SET payload=json_set(payload,'$.photo',?),updated_at=? WHERE id=?",
              ).bind(s.photo, now, s.schoolStudentId),
            ]
          : []),
        audit(env.DB, session, "LEARNER_DOCUMENT_UPLOADED", id),
      ]);
      return json({ id: docId, success: true }, 201);
    }
  }
  if (path === "/api/general/care/roster" && request.method === "GET") {
    const date = String(u.searchParams.get("date") || "");
    if (!validDate(date) || new Date(`${date}T12:00:00Z`).getUTCDay() !== 6)
      return json({ message: "Select a Saturday date." }, 400);
    await importSchoolLearners(env.DB);
    return json(await careRoster(env.DB, date));
  }
  if (path === "/api/general/care/summary" && request.method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT student_id,COUNT(DISTINCT date) AS attendedDays,MAX(date) AS lastAttended FROM general_care_attendance WHERE status='Present' GROUP BY student_id ORDER BY attendedDays DESC,lastAttended DESC",
    ).all();
    return json(rows.results);
  }
  if (path === "/api/general/care/day" && request.method === "PUT") {
    const b = (await request.json()) as CareDay;
    if (!validDate(b.date) || new Date(`${b.date}T12:00:00Z`).getUTCDay() !== 6)
      return json({ message: "Care Program days must be Saturdays." }, 400);
    if (
      !Array.isArray(b.zones) ||
      b.zones.length > 100 ||
      !b.zones.every((z) => typeof z === "string" && z.length < 150) ||
      !Array.isArray(b.invitedIds) ||
      b.invitedIds.length > 3000 ||
      !b.invitedIds.every((i) => typeof i === "string" && i.length < 150)
    )
      return json({ message: "Invalid zone or invitation list." }, 400);
    const old = await env.DB.prepare(
      "SELECT revision FROM general_care_days WHERE date=?",
    )
      .bind(b.date)
      .first<{ revision: number }>();
    if ((old?.revision || 0) !== b.revision)
      return json(
        { message: "This Saturday plan changed. Refresh before saving." },
        409,
      );
    const day: CareDay = {
      id: `saturday-${b.date}`,
      date: b.date,
      title: String(b.title || "Saturday Care Program").slice(0, 180),
      zones: b.zones,
      invitedIds: b.invitedIds,
      revision: (old?.revision || 0) + 1,
      status: b.status === "completed" ? "completed" : "planned",
    };
    const result = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO general_care_days (id,date,payload,revision) VALUES (?,?,?,?) ON CONFLICT(date) DO UPDATE SET payload=excluded.payload,revision=excluded.revision WHERE general_care_days.revision=?",
      ).bind(day.id, day.date, JSON.stringify(day), day.revision, b.revision),
      audit(env.DB, session, "CARE_DAY_PLANNED", day.date),
    ]);
    if (!result[0].meta.changes)
      return json(
        {
          message:
            "Another staff member changed this Saturday plan. Refresh and retry.",
        },
        409,
      );
    return json(day);
  }
  if (path === "/api/general/care/attendance" && request.method === "POST") {
    const b = (await request.json()) as any;
    if (
      !validDate(b.date) ||
      new Date(`${b.date}T12:00:00Z`).getUTCDay() !== 6 ||
      b.date > todayInUganda()
    )
      return json(
        { message: "Record attendance for a Saturday on or before today." },
        400,
      );
    if (!Array.isArray(b.records) || !b.records.length || b.records.length > 25)
      return json(
        { message: "Save between 1 and 25 attendance records at once." },
        400,
      );
    const roster = await careRoster(env.DB, b.date);
    if (roster.day.status === "completed")
      return json(
        {
          message:
            "Reopen this Saturday before changing its completed attendance.",
        },
        423,
      );
    await env.DB.prepare(
      "INSERT OR IGNORE INTO general_care_days VALUES (?,?,?,?)",
    )
      .bind(
        roster.day.id,
        b.date,
        JSON.stringify(roster.day),
        roster.day.revision,
      )
      .run();
    if (b.dayRevision !== undefined && b.dayRevision !== roster.day.revision)
      return json(
        { message: "The Saturday sheet changed. Reload before saving." },
        409,
      );
    const seen = new Set(),
      statements = [];
    for (const r of b.records) {
      if (seen.has(r.studentId))
        return json(
          { message: "A learner is repeated in this attendance batch." },
          400,
        );
      seen.add(r.studentId);
      const learner = roster.rows.find((x) => x.student.id === r.studentId);
      if (!learner)
        return json(
          {
            message:
              "One learner is no longer active in the Care Program. Refresh the roster.",
          },
          409,
        );
      if (!["Present", "Absent", "Excused"].includes(r.status))
        return json({ message: "Select Present, Absent or Excused." }, 400);
      const before = learner.attendance?.updated_at || null;
      if ((r.expectedUpdatedAt || null) !== before)
        return json(
          {
            message:
              "Another staff member changed attendance. Reload before saving.",
          },
          409,
        );
      const reason = String(r.overrideReason || "")
        .trim()
        .slice(0, 1000);
      if (r.status === "Present" && !learner.eligible && !reason)
        return json(
          {
            message: `${learner.student.surname} is not due. Record a staff override reason to check in.`,
          },
          409,
        );
      statements.push(
        env.DB.prepare(
          "INSERT INTO general_care_attendance SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM general_care_days WHERE date=? AND revision=?) ON CONFLICT(student_id,date) DO UPDATE SET status=excluded.status,override_reason=excluded.override_reason,recorded_by=excluded.recorded_by,updated_at=excluded.updated_at",
        ).bind(
          r.studentId,
          b.date,
          r.status,
          reason,
          session.sub,
          new Date().toISOString(),
          b.date,
          roster.day.revision,
        ),
      );
    }
    // One JSON parameter per record remains within D1’s per-statement limits;
    // the batch is atomic, so no partial Saturday sheet can be marked saved.
    statements.push(
      env.DB.prepare(
        "INSERT INTO audit_logs (id,actor_username,actor_role,action,entity_type,entity_id,created_at) SELECT ?,?,?,'CARE_ATTENDANCE_SAVED','general_register',?,? WHERE EXISTS (SELECT 1 FROM general_care_days WHERE date=? AND revision=?)",
      ).bind(
        crypto.randomUUID(),
        session.sub,
        session.role,
        b.date,
        Date.now(),
        b.date,
        roster.day.revision,
      ),
    );
    statements.push(
      env.DB.prepare(
        "UPDATE general_care_days SET revision=revision+1 WHERE date=? AND revision=?",
      ).bind(b.date, roster.day.revision),
    );
    const result = await env.DB.batch(statements);
    if (!result[result.length - 1].meta.changes)
      return json(
        {
          message:
            "Another staff member saved this Saturday first. Your changes were not applied. Reload and review.",
        },
        409,
      );
    return json({
      success: true,
      saved: b.records.length,
      dayRevision: roster.day.revision + 1,
    });
  }
  return json({ message: "General Register operation not found." }, 404);
}
