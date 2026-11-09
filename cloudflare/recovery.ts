// Recovery data is encrypted before it is written to D1. Authentication and
// role checks belong to the caller. Live restores deliberately retain staff
// credentials, assignments, login codes and the permanent audit trail.
export const RECOVERY_TABLES = [
  'students', 'marks', 'attendance', 'assessment_settings', 'academic_years',
  'mark_submissions', 'promotion_history', 'historical_report_cards',
  'academic_year_archives', 'pupil_support_notes', 'pupil_documents', 'support_records',
] as const;

export type Snapshot = { version: 1; createdAt: string; tables: Record<string, Record<string, unknown>[]> };
const encoder = new TextEncoder();
const decoder = new TextDecoder();
export const quoteIdentifier = (value: string) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error('Invalid recovery identifier.');
  return `"${value}"`;
};
const toBase64 = (bytes: Uint8Array) => {
  let text = '';
  for (let offset = 0; offset < bytes.length; offset += 16384) text += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
  return btoa(text);
};
const fromBase64 = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0));
export const digest = async (text: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text)))].map(n => n.toString(16).padStart(2, '0')).join('');

async function recoveryKey(secret: string) {
  if (!secret) throw new Error('The server recovery key is unavailable.');
  const material = await crypto.subtle.importKey('raw', encoder.encode(secret), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('rainbow-house-recovery-v1'), info: encoder.encode('backup-data-only') }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptSnapshot(snapshot: Snapshot, secret: string) {
  const text = JSON.stringify(snapshot);
  if (encoder.encode(text).byteLength > 8 * 1024 * 1024) throw new Error('This snapshot exceeds the 8 MB recovery limit. Contact the administrator to configure larger backup storage.');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await recoveryKey(secret), encoder.encode(text));
  return { content: toBase64(new Uint8Array(encrypted)), iv: toBase64(iv), checksum: await digest(text), size: encrypted.byteLength };
}

export async function decryptSnapshot(content: string, iv: string, checksum: string, secret: string): Promise<Snapshot> {
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, await recoveryKey(secret), fromBase64(content));
  const text = decoder.decode(decrypted);
  if (await digest(text) !== checksum) throw new Error('Backup integrity validation failed.');
  const snapshot = JSON.parse(text) as Snapshot;
  if (snapshot.version !== 1 || !snapshot.tables || typeof snapshot.tables !== 'object') throw new Error('Unsupported backup format.');
  for (const [table, rows] of Object.entries(snapshot.tables)) {
    if (!RECOVERY_TABLES.includes(table as any) || !Array.isArray(rows)) throw new Error('Unexpected table in recovery snapshot.');
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid recovery row.');
      Object.keys(row).forEach(quoteIdentifier);
    }
  }
  return snapshot;
}

// Each insert uses one JSON parameter, keeping row and parameter counts within
// D1 limits. The caller executes the full delete/insert plan in one D1 batch.
export function recoveryInsertPlans(table: string, rows: Record<string, unknown>[], allowedColumns: string[]) {
  if (!RECOVERY_TABLES.includes(table as any)) throw new Error('Table is not eligible for live restoration.');
  const plans: { sql: string; values: string }[] = [];
  if (!rows.length) return plans;
  const columns = Object.keys(rows[0]);
  if (!columns.length || columns.some(c => !allowedColumns.includes(c))) throw new Error(`Schema changed for ${table}. Restore a copy and migrate it first.`);
  const expected = [...columns].sort().join('|');
  let group: Record<string, unknown>[] = [];
  let size = 0;
  const flush = () => {
    if (!group.length) return;
    plans.push({ sql: `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(',')}) SELECT ${columns.map(c => `json_extract(value, '$.${c}')`).join(',')} FROM json_each(?)`, values: JSON.stringify(group) });
    group = []; size = 0;
  };
  for (const row of rows) {
    if (Object.keys(row).sort().join('|') !== expected) throw new Error('Inconsistent columns in backup.');
    const rowSize = encoder.encode(JSON.stringify(row)).byteLength;
    if (rowSize > 1400000) throw new Error('A backup row exceeds the safe restoration limit.');
    if (size + rowSize > 500000) flush();
    group.push(row); size += rowSize;
  }
  flush();
  return plans;
}
