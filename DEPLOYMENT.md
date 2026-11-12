# Rainbow House deployment

Production is the existing `rainbowhousestudents` Cloudflare Worker, connected to
this repository's `main` branch. Retain its existing `DB` binding and secrets.
Cloudflare currently runs `bun run build`, then `npx wrangler deploy`.

## Validation

```sh
npm ci
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.worker.json
npm test
npm run build:worker
npx wrangler deploy --dry-run
```

Tests use a separate, in-memory D1 database and synthetic pupils. They exercise
backup encryption, integrity checks, actual restoration, rollback on constraint
failure, role restrictions, empty dashboard data and guardian message accuracy.
They do not read or change production records.

## Durable storage

The existing migrations 0001–0005 describe the legacy database. The live `staff`
table also has a `responsibility` column. Fresh test fixtures add this explicitly
and omit the real staff roster migration 0004.

Migration 0006 adds idempotent tables for encrypted checkpoints, pupil documents,
support notes and support records. The new Worker routes also initialise those
specific tables with `CREATE TABLE IF NOT EXISTS`, so an existing installation
can publish this update without destructive migration or a database reset.

## Recovery

- Backup operations require a current, active Headteacher or DOS account.
- AES-256-GCM encrypts pupil and academic data before it is stored in D1.
- `BACKUP_ENCRYPTION_KEY` is an optional dedicated, stable server secret. When
  absent, a separate HKDF-derived key from the existing `SESSION_SECRET` is used.
  Keep that secret stable and securely retained while its backups are needed.
  Never commit either secret or expose it to the frontend.
- Recovery checkpoints cover pupils, marks, attendance, assessment settings,
  academic years, mark submissions, promotion history, historical reports,
  year archives, support records/notes and personal document files.
- Staff accounts, assignments, login codes and the permanent audit trail are
  retained during live restoration. They are not rolled back with pupil data.
- Every live restoration first creates a safety checkpoint. The replacement
  uses one transactional D1 batch. Failed constraints roll back the replacement.
- Snapshots currently have an 8 MB unencrypted limit. Large restores that exceed
  the online query budget stop with a maintenance-copy message. No live-table
  replacement is attempted in that case. Larger installations should move backup
  storage to R2 and implement a maintenance-mode recovery workflow.
- D1 checkpoints protect against application-level changes; retain separate
  off-site database exports for recovery from deletion of the database itself.

## Pupil records and communication

Support notes and personal documents are restricted on the server to current
Headteacher/DOS accounts. Document files are PDFs, JPEGs or PNGs up to 500 KB.
Guardian notices are editable drafts. Staff review the recipient and content
before copying a draft or opening it in WhatsApp. No SMS or email is sent by
these tools, and no new messaging subscription is configured.

Attendance and assessment drafts are scoped to the staff account and exact
sheet in browser session storage. They expire after 24 hours and are removed
when a successful server save is confirmed. Drafts survive navigation and reload
in the same browser tab; closing the tab clears session storage. They are not
shown as saved school records.

## Browser QA preview

`npm run build:worker`, then `npm run dev:preview -- --port 4173` runs an isolated
Miniflare instance with a random signing key, synthetic pupils and no connection
to production D1. Its orange test button can simulate failed mark/attendance
saves. This script is not part of the deployed Worker or frontend build.

## General Register and Terakoya workspaces

The General Register is the master Ashinaga learner record. Terakoya retains its
school tools, daily school attendance, assessments and reports. Migration 0009 is
additive and the General Register routes initialise its tables idempotently.
Existing school pupils are linked once using their original ID. New primary
registrations can explicitly enrol the learner in Terakoya. Guardian/contact and
photo updates synchronise to the linked school record. Family health fields and
personal registration documents are available only to active Headteacher/DOS
accounts; they are excluded from Care Program Excel rosters.

Each linked learner has an **Open Terakoya record** link in the General Register
and an **Open General Register** link in the school pupil overview. Administrator
school registration opens the same six-step master form with the selected class
and Terakoya enrolment prefilled. An existing primary master record can be
enrolled from its overview without creating a second master record. Exact school
name/date-of-birth matches are reused, and ambiguous matches require review.
Registration documents are shared by reference between the two workspaces;
existing school files remain accessible and are included in the combined PDF.
The passport photo is also placed on the registration PDF when available.

- The six registration steps mirror the supplied Rainbow House form. New intake
  is age 6–14 on the registration date. Continuing learners can be recorded beyond
  that range with a source/reason, and records are retained as learners grow.
- Guardian and next-of-kin changes require a reason and retain previous details.
- PDF/JPEG/PNG attachments are limited to 1 MB per file and 10 MB per learner.
  A missing/requested/not-applicable checklist permits registration before all
  documents arrive. Camera capture is optional and stops the camera on closing.
- The combined PDF is generated in the authorised staff browser. It includes the
  registration data, checklist and original PDF/image attachments. An unreadable
  or encrypted attachment stops the bundle rather than silently omitting it.
- Saturday attendance is separate from daily school attendance and activity
  participation. Unmarked is not present. Distinct saved Saturday visits drive
  recognition totals. The default rule is a 14-day interval; scheduled-zone,
  invitation-only and weekly rules can be selected in Progression & rules.
- A not-due check-in requires a recorded staff override reason. The server
  validates the rule, Saturday date, future-date restriction and sheet revision.
  Excel downloads retain red not-due rows and include a conditional formatting
  rule; the next-Saturday export recomputes eligibility from saved attendance.
- Attendance drafts are scoped to the staff account and Saturday, kept only in
  browser session storage for 24 hours. Saves run in small atomic batches, preserve
  remaining edits after failure and report Unsaved / Saving / Saved / Failed.
- The existing care timetable, room activities, ground rules and evaluation
  module is preserved under Care activities & plans. These activity notes are
  not counted as official Saturday check-in records. Generated fallback sessions
  and assumed attendance have been removed; saves now require acknowledgement.
- Encrypted recovery snapshots also cover all General Register tables and the
  care session archive. Older snapshots without the new tables cannot overwrite
  a database containing the expanded register. Create a fresh checkpoint after
  deployment. Large snapshots still use the documented 8 MB recovery limit.

## Annual master progression

Wrangler installs an hourly scheduled trigger (`20 * * * *`, UTC). From January
1, it advances up to 12 due master study records per invocation, once per learner
and academic year. Its schedule catches up after downtime and it does not require
marks or the learner to attend that week. Each learner and the whole programme
can be paused from progression. An administrator can preview/apply a due batch.

The master sequence is P.1–P.7, S.1–S.6, university Year 1 onward. P.7→S.1,
S.4→S.5, S.6→university and final university year completion are flagged for
staff confirmation. Confirm the actual institution/course, then clear the
transition flag. Unknown university course duration is explicitly recorded as 0;
set the actual duration to recognise final-year completion. These master study
moves do not claim an admission or change Terakoya class decisions, marks or
report-card histories. School class promotion remains in the Terakoya workspace.
