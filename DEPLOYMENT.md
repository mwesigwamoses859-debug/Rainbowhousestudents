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
