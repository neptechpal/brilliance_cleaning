import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// Runtime uploads are provisioned separately; never include them in build tracing.
// Private uploads (CVs, certificates, profile photos). Never under /public — served only through
// the authenticated /api/admin/files/[id] route.
export const STORAGE_DIR = process.env.STORAGE_DIR || join(process.cwd(), "storage");

const TYPES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "application/pdf", ext: "pdf", test: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
];

/** Detects the real file type from its bytes (the browser-supplied type is not trusted). */
export function sniff(buf: Buffer, allowed: string[]) {
  const t = TYPES.find((x) => x.test(buf));
  return t && allowed.includes(t.mime) ? t : null;
}

export async function saveUpload(buf: Buffer, ext: string) {
  await mkdir(STORAGE_DIR, { recursive: true, mode: 0o700 });
  const storedName = `${randomUUID()}.${ext}`;
  await writeFile(join(/* turbopackIgnore: true */ STORAGE_DIR, storedName), buf, { mode: 0o600 });
  return storedName;
}

export async function readUpload(storedName: string) {
  if (!/^[0-9a-f-]{36}\.(pdf|png|jpg|webp)$/.test(storedName)) throw new Error("bad name");
  return readFile(/* turbopackIgnore: true */ join(/* turbopackIgnore: true */ STORAGE_DIR, storedName));
}

export async function deleteUpload(storedName: string) {
  if (!/^[0-9a-f-]{36}\.(pdf|png|jpg|webp)$/.test(storedName)) return;
  await unlink(join(/* turbopackIgnore: true */ STORAGE_DIR, storedName)).catch(() => {});
}
