import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { build } from "esbuild";
import {
  blankStudent,
  DEFAULT_SETTINGS,
  addDays,
} from "../src/general/model.ts";
import {
  careEligibility,
  nextEducation,
  validateGeneralStudent,
} from "../src/general/rules.ts";
test("care rotation, exact age boundaries and study transitions", () => {
  const s = {
    ...blankStudent(),
    surname: "Test",
    otherNames: "Learner",
    gender: "Female",
    dateOfBirth: "2012-11-10",
    intakeDate: "2026-11-10",
    guardianName: "Test Guardian",
    guardianRelationship: "Aunt",
    guardianContact: "0700000000",
    zone: "Example",
    grade: "P.7",
  };
  assert.equal(validateGeneralStudent(s), null);
  assert.match(
    validateGeneralStudent({ ...s, dateOfBirth: "2011-11-10" })!,
    /6–14/,
  );
  assert.equal(
    validateGeneralStudent({
      ...s,
      dateOfBirth: "2000-01-01",
      intakeType: "Continuing learner",
      intakeReason: "Existing sponsored university learner",
      educationLevel: "University",
      grade: "Year 3",
    }),
    null,
  );
  assert.match(
    validateGeneralStudent({ ...s, dateOfBirth: "2015-02-30" })!,
    /valid birth/,
  );
  assert.equal(
    careEligibility(s, "2026-11-14", "2026-11-07", DEFAULT_SETTINGS, [], false)
      .eligible,
    false,
  );
  assert.equal(
    careEligibility(s, "2026-11-21", "2026-11-07", DEFAULT_SETTINGS, [], false)
      .eligible,
    true,
  );
  assert.equal(
    careEligibility(
      s,
      "2026-11-14",
      null,
      { ...DEFAULT_SETTINGS, carePolicy: "zones" },
      ["Other zone"],
      false,
    ).eligible,
    false,
  );
  assert.equal(
    careEligibility(
      s,
      "2026-11-14",
      null,
      { ...DEFAULT_SETTINGS, carePolicy: "zones" },
      ["example"],
      false,
    ).eligible,
    true,
  );
  assert.deepEqual(nextEducation(s), {
    educationLevel: "Secondary",
    grade: "S.1",
    transitionReview: true,
  });
  assert.equal(
    nextEducation({
      ...s,
      educationLevel: "University",
      grade: "Year 4",
      universityDuration: 4,
    }).educationLevel,
    "Completed",
  );
});
test("master register, guardian history, private uploads, Care Program rules and annual progression use isolated D1", async () => {
  const built = await build({
    entryPoints: ["cloudflare/worker.ts"],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
    target: "es2022",
  });
  const secret = "non-production-general-test-key";
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: built.outputFiles[0].text,
      compatibilityDate: "2026-07-27",
      compatibilityFlags: ["nodejs_compat"],
      d1Databases: ["DB"],
      bindings: { SESSION_SECRET: secret },
    }),
  );
  try {
    const db = await mf.getD1Database("DB");
    for (const f of (await readdir("migrations"))
      .filter((f) => f.endsWith(".sql") && !f.startsWith("0004"))
      .sort()) {
      for (const sql of (await readFile(`migrations/${f}`, "utf8"))
        .replace(/^\s*--.*$/gm, "")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await db.prepare(sql).run();
    }
    await db
      .prepare(
        "ALTER TABLE staff ADD COLUMN responsibility TEXT NOT NULL DEFAULT ''",
      )
      .run();
    await db
      .prepare(
        "INSERT INTO staff (username,name,email,role,subjects,classes) VALUES ('teacher','Test Teacher','test@example.invalid','Subject Teacher','[]','[\"P.1\"]')",
      )
      .run();
    const token = (sub = "admin", role = "Headteacher") => {
      const p = Buffer.from(
        JSON.stringify({ sub, role, exp: Date.now() + 3600000 }),
      ).toString("base64url");
      return `${p}.${createHmac("sha256", secret).update(p).digest("hex")}`;
    };
    const call = async (
      path: string,
      method = "GET",
      body?: any,
      sub = "admin",
    ) => {
      const r = await mf.dispatchFetch(`https://example.test/api/${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(sub
            ? {
                Authorization: `Bearer ${token(sub, sub === "admin" ? "Headteacher" : "Subject Teacher")}`,
              }
            : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      return { status: r.status, data: (await r.json()) as any };
    };
    assert.equal(
      (await call("general/students", "GET", undefined, "")).status,
      401,
    );
    assert.equal(
      (await call("general/students", "GET", undefined, "teacher")).status,
      403,
    );
    const fixture = {
      ...blankStudent(),
      surname: "Example",
      otherNames: "Care Learner",
      dateOfBirth: "2016-05-10",
      gender: "Female",
      zone: "Zone A",
      guardianName: "Example Guardian",
      guardianRelationship: "Aunt",
      guardianContact: "0700000000",
      grade: "P.4",
      academicYear: 2025,
      familyConcerns: "Synthetic confidential family note",
    };
    assert.equal(
      (
        await call("general/students", "POST", {
          ...fixture,
          dateOfBirth: "2000-01-01",
        })
      ).status,
      400,
    );
    let r = await call("general/students", "POST", {
      ...fixture,
      enrolTerakoya: true,
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    let s = r.data;
    const id = s.id;
    assert.match(s.registrationNumber, /^AU-2026-\d{5}$/);
    assert.equal(
      (await db.prepare("SELECT COUNT(*) AS n FROM students").first<any>()).n,
      1,
    );
    assert.equal((await call("general/students")).data.length, 1);
    assert.equal((await call("general/students")).data[0].familyConcerns, "");
    assert.equal(
      (await call(`general/students/${id}`)).data.familyConcerns,
      "Synthetic confidential family note",
    );
    assert.equal((await call("general/students", "POST", fixture)).status, 409);
    assert.equal(
      (
        await call(`general/students/${id}`, "PUT", {
          ...s,
          guardianName: "Updated Guardian",
        })
      ).status,
      400,
    );
    r = await call(`general/students/${id}`, "PUT", {
      ...s,
      guardianName: "Updated Guardian",
      guardianContact: "0711111111",
      guardianChangeReason: "Learner moved to a new guardian",
    });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    s = r.data;
    const history = (await call(`general/students/${id}/history`)).data;
    assert.equal(history.length, 1);
    assert.equal(
      JSON.parse(history[0].before_value).guardianName,
      "Example Guardian",
    );
    assert.equal(
      JSON.parse(
        (
          await db
            .prepare("SELECT payload FROM students WHERE id=?")
            .bind(id)
            .first<any>()
        ).payload,
      ).guardianName,
      "Updated Guardian",
    );
    assert.equal(
      (await call(`general/students/${id}`, "PUT", { ...s, revision: 1 }))
        .status,
      409,
    );
    assert.equal(
      (
        await call(`general/students/${id}/documents`, "POST", {
          name: "fake.pdf",
          mime: "application/pdf",
          category: "Birth certificate",
          data: btoa("not pdf"),
        })
      ).status,
      400,
    );
    const upload = await call(`general/students/${id}/documents`, "POST", {
      name: "synthetic.pdf",
      mime: "application/pdf",
      category: "Birth certificate",
      data: btoa("%PDF-1.4\n% Synthetic only\n%%EOF"),
    });
    assert.equal(upload.status, 201, JSON.stringify(upload.data));
    const docs = (await call(`general/students/${id}/documents`)).data;
    assert.equal(docs.length, 1);
    assert.equal("data" in docs[0], false);
    assert.equal(
      (
        await call(
          `general/students/${id}/documents`,
          "GET",
          undefined,
          "teacher",
        )
      ).status,
      403,
    );
    // Both profiles use the same learner and original file, with role checks.
    const linkedRecord = await call(`general/students/by-school/${id}`);
    assert.equal(linkedRecord.status, 200);
    assert.equal(linkedRecord.data.id, id);
    assert.equal(
      (
        await call(
          `general/students/by-school/${id}`,
          "GET",
          undefined,
          "teacher",
        )
      ).status,
      403,
    );
    const schoolProfile = (await call(`pupils/${id}/overview`)).data;
    assert.equal(schoolProfile.generalRecord.id, id);
    const sharedFile = schoolProfile.documents.find(
      (d: any) => d.id === `general:${upload.data.id}`,
    );
    assert.ok(sharedFile);
    assert.equal(sharedFile.source, "general");
    const download = async (path: string, sub = "admin") => {
      const response = await mf.dispatchFetch(
        `https://example.test/api/${path}`,
        {
          headers: {
            Authorization: `Bearer ${token(sub, sub === "admin" ? "Headteacher" : "Subject Teacher")}`,
          },
        },
      );
      return { status: response.status, text: await response.text() };
    };
    assert.equal(
      (
        await download(
          `pupils/${id}/documents/${encodeURIComponent(sharedFile.id)}`,
        )
      ).text,
      "%PDF-1.4\n% Synthetic only\n%%EOF",
    );
    assert.equal(
      (
        await download(
          `pupils/${id}/documents/${encodeURIComponent(sharedFile.id)}`,
          "teacher",
        )
      ).status,
      403,
    );
    const schoolUpload = await call(`pupils/${id}/documents`, "POST", {
      name: "school-document.pdf",
      mime: "application/pdf",
      data: btoa("%PDF-1.4\n% School fixture\n%%EOF"),
    });
    assert.equal(schoolUpload.status, 201);
    const allFiles = (await call(`general/students/${id}/documents`)).data;
    const originalSchoolFile = allFiles.find(
      (d: any) => d.id === `school:${schoolUpload.data.id}`,
    );
    assert.ok(originalSchoolFile);
    assert.equal(originalSchoolFile.source, "terakoya");
    assert.equal(
      (
        await download(
          `general/students/${id}/documents/${encodeURIComponent(originalSchoolFile.id)}`,
        )
      ).text,
      "%PDF-1.4\n% School fixture\n%%EOF",
    );
    assert.equal(
      (
        await download(
          `general/students/unknown/documents/${encodeURIComponent(originalSchoolFile.id)}`,
        )
      ).status,
      404,
    );
    const sat = "2026-11-07";
    r = await call(`general/care/roster?date=${sat}`);
    assert.equal(r.status, 200);
    assert.equal(r.data.rows[0].attendedDays, 0);
    assert.equal(r.data.rows[0].attendance, null);
    r = await call("general/care/attendance", "POST", {
      date: sat,
      records: [{ studentId: id, status: "Present", expectedUpdatedAt: null }],
    });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const first = (await call(`general/care/roster?date=${sat}`)).data;
    assert.equal(first.rows[0].attendedDays, 1);
    assert.equal(
      (
        await call("general/care/attendance", "POST", {
          date: sat,
          records: [
            { studentId: id, status: "Present", expectedUpdatedAt: null },
          ],
        })
      ).status,
      409,
    );
    r = await call("general/care/roster?date=2026-11-14");
    assert.equal(r.data.rows[0].eligible, false);
    assert.match(r.data.rows[0].reason, /Not due/);
    assert.equal(
      (await call("general/care/roster?date=2026-11-21")).data.rows[0].eligible,
      true,
    );
    // Zone rule is enforced by the server, even if a client alters its controls.
    await call("general/settings", "PUT", {
      ...DEFAULT_SETTINGS,
      carePolicy: "zones",
    });
    await call("general/care/day", "PUT", { ...first.day, zones: ["Zone B"] });
    assert.equal(
      (
        await call("general/care/attendance", "POST", {
          date: sat,
          records: [
            {
              studentId: id,
              status: "Present",
              expectedUpdatedAt: first.rows[0].attendance.updated_at,
            },
          ],
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call("general/care/attendance", "POST", {
          date: sat,
          records: [
            {
              studentId: id,
              status: "Present",
              expectedUpdatedAt: first.rows[0].attendance.updated_at,
              overrideReason: "Staff approved an exceptional visit",
            },
          ],
        })
      ).status,
      200,
    );
    assert.equal((await call("general/care/summary")).data[0].attendedDays, 1);
    assert.equal(
      (
        await call("general/care/attendance", "POST", {
          date: "2026-11-14",
          records: [{ studentId: id, status: "Present" }],
        })
      ).status,
      400,
    );
    await call("general/settings", "PUT", DEFAULT_SETTINGS);
    const preview = (await call("general/progression", "POST", {})).data;
    assert.equal(preview.changes[0].to, "Primary P.5");
    assert.equal(
      (await call("general/progression", "POST", { preview: false })).data
        .promoted,
      1,
    );
    assert.equal(
      (await call("general/progression", "POST", { preview: false })).data
        .promoted,
      0,
    );
    s = (await call(`general/students/${id}`)).data;
    assert.equal(s.grade, "P.5");
    assert.equal(s.progressionHistory.length, 1);
    assert.equal(s.documentStatus["Birth certificate"], "Uploaded");
    r = await call(`general/students/${id}`, "PUT", {
      ...s,
      guardianContact2: "0722222222",
      guardianChangeReason: "Added an alternative contact",
    });
    assert.equal(r.status, 200);
    assert.equal(
      JSON.parse(
        (
          await db
            .prepare("SELECT payload FROM students WHERE id=?")
            .bind(id)
            .first<any>()
        ).payload,
      ).className,
      "P.4",
    );
    assert.equal(
      (await call(`general/students/${id}/care-attendance`)).data.length,
      1,
    );
    const second = await call("general/students", "POST", {
      ...fixture,
      surname: "Different",
      otherNames: "Pupil",
      enrolTerakoya: true,
    });
    assert.equal(second.status, 201);
    assert.equal(
      (
        await download(
          `general/students/${second.data.id}/documents/${encodeURIComponent(originalSchoolFile.id)}`,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await download(
          `pupils/${second.data.schoolStudentId}/documents/${encodeURIComponent(sharedFile.id)}`,
        )
      ).status,
      404,
    );
    // Existing school records automatically appear without duplicate master rows.
    const legacy = {
      id: "school-only",
      surname: "Older",
      otherNames: "Pupil",
      dateOfBirth: "2015-01-01",
      className: "P.7",
      guardianName: "Guardian",
      guardianContact: "0700000000",
      zoneInNansana: "Zone C",
    };
    await db
      .prepare("INSERT INTO students VALUES (?,?,?,?)")
      .bind(legacy.id, JSON.stringify(legacy), 1, 1)
      .run();
    const all = (await call("general/students")).data;
    assert.equal(all.length, 3);
    assert.equal(
      all.find((r: any) => r.id === "school-only").intakeType,
      "Continuing learner",
    );
    const university = await call("general/students", "POST", {
      ...fixture,
      id: "",
      surname: "University",
      otherNames: "Example",
      dateOfBirth: "2005-02-11",
      intakeType: "Continuing learner",
      intakeReason: "Continuing university learner",
      educationLevel: "University",
      grade: "Year 2",
    });
    assert.equal(university.status, 201);
    const uniSchool = {
      ...legacy,
      id: "school-match",
      surname: "University",
      otherNames: "Example",
      dateOfBirth: "2005-02-11",
    };
    await db
      .prepare("INSERT INTO students VALUES (?,?,?,?)")
      .bind(uniSchool.id, JSON.stringify(uniSchool), 1, 1)
      .run();
    const linked = (await call("general/students")).data;
    assert.equal(linked.length, 4);
    assert.equal(
      linked.find((r: any) => r.id === university.data.id).schoolStudentId,
      "school-match",
    );
    // Backups now include the master register, guardian history and Saturday data.
    const backup = await call("backups", "POST", {
      note: "General register fixture",
    });
    assert.equal(backup.status, 201, JSON.stringify(backup.data));
    assert.equal(
      (await call(`backups/${backup.data.id}/verify`, "POST", {})).status,
      200,
    );
  } finally {
    await mf.dispose();
  }
});
