import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { readUpload } from "@/lib/storage";

// Serves private applicant uploads (CVs, certificates, photos) to signed-in staff only.
export async function GET(req: Request, { params }: RouteContext<"/api/admin/files/[id]">) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const id = Number((await params).id);
  const file = Number.isSafeInteger(id) && id > 0 ? await db.applicantFile.findUnique({ where: { id } }) : null;
  if (!file) return new Response("Not found", { status: 404 });
  let buf: Buffer;
  try {
    buf = await readUpload(file.storedName);
  } catch {
    return new Response("File missing", { status: 404 });
  }
  const download = new URL(req.url).searchParams.has("download");
  const name = file.originalName.replace(/[^\w.\- ]+/g, "_");
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(buf.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
