import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage";

// Public profile photo — only for staff an admin has marked active (shown in the /booking picker).
export async function GET(_req: Request, { params }: RouteContext<"/api/staff-photo/[id]">) {
  const id = Number((await params).id);
  const staff = Number.isSafeInteger(id) && id > 0 ? await db.staffApplication.findFirst({ where: { id, active: true }, include: { files: { where: { kind: "photo" }, take: 1 } } }) : null;
  const f = staff?.files[0];
  if (!f) return new Response("Not found", { status: 404 });
  try {
    const buf = await readUpload(f.storedName);
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": f.mime, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
