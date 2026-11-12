import { Teacher } from "../types";
export function generalApi(teacher: Teacher) {
  return async <T = any>(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<T> => {
    const response = await fetch(`/api/general/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${teacher.authToken || ""}`,
        "Content-Type": "application/json",
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        data.message || `The request failed (${response.status}).`,
      );
    return data;
  };
}
export async function fileData(
  file: File,
): Promise<{ data: string; mime: string; name: string }> {
  if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type))
    throw new Error("Choose a PDF, JPEG or PNG.");
  if (file.size > 1024 * 1024)
    throw new Error("Please choose a file smaller than 1 MB.");
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(new Error("The file could not be read."));
    r.readAsDataURL(file);
  });
  return { data, mime: file.type, name: file.name };
}
export function downloadBlob(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 30000);
}
