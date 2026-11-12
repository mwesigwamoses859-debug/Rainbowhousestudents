// Both workspaces reference the original file. Authorisation is enforced by
// the caller before supplying a verified master ID or school pupil ID.
export const PUPIL_DOCUMENT_TABLE = `CREATE TABLE IF NOT EXISTS pupil_documents (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, data TEXT NOT NULL, uploaded_by TEXT NOT NULL, created_at TEXT NOT NULL)`;

export async function registrationDocuments(
  db: D1Database,
  generalId: string,
  schoolId: string | null,
) {
  const rows = await db
    .prepare(
      `SELECT id,student_id,category,name,mime,size,uploaded_by,created_at,'general' AS source FROM general_documents WHERE student_id=?
    UNION ALL SELECT 'school:'||id,? AS student_id,'Other document' AS category,name,mime,size,uploaded_by,created_at,'terakoya' AS source FROM pupil_documents WHERE student_id=? ORDER BY created_at`,
    )
    .bind(generalId, generalId, schoolId || "")
    .all();
  return rows.results;
}
export async function registrationDocument(
  db: D1Database,
  generalId: string,
  schoolId: string | null,
  id: string,
) {
  return id.startsWith("school:")
    ? db
        .prepare(
          "SELECT name,mime,data FROM pupil_documents WHERE id=? AND student_id=?",
        )
        .bind(id.slice(7), schoolId || "")
        .first<{ name: string; mime: string; data: string }>()
    : db
        .prepare(
          "SELECT name,mime,data FROM general_documents WHERE id=? AND student_id=?",
        )
        .bind(id, generalId)
        .first<{ name: string; mime: string; data: string }>();
}
export async function schoolDocuments(db: D1Database, schoolId: string) {
  const rows = await db
    .prepare(
      `SELECT id,name,mime,size,uploaded_by,created_at,'terakoya' AS source FROM pupil_documents WHERE student_id=?
    UNION ALL SELECT 'general:'||d.id,d.name,d.mime,d.size,d.uploaded_by,d.created_at,'general' AS source FROM general_documents d JOIN general_students g ON g.id=d.student_id WHERE g.school_student_id=? ORDER BY created_at DESC`,
    )
    .bind(schoolId, schoolId)
    .all();
  return rows.results;
}
export async function schoolDocument(
  db: D1Database,
  schoolId: string,
  id: string,
) {
  return id.startsWith("general:")
    ? db
        .prepare(
          "SELECT d.name,d.mime,d.data FROM general_documents d JOIN general_students g ON g.id=d.student_id WHERE d.id=? AND g.school_student_id=?",
        )
        .bind(id.slice(8), schoolId)
        .first<{ name: string; mime: string; data: string }>()
    : db
        .prepare(
          "SELECT name,mime,data FROM pupil_documents WHERE id=? AND student_id=?",
        )
        .bind(id, schoolId)
        .first<{ name: string; mime: string; data: string }>();
}
