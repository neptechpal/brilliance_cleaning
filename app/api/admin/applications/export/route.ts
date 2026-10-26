import { ApplicationStatus, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const csv = (v: unknown) => {
  const raw = v == null ? "" : v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join("; ") : String(v);
  const s = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const status = Object.values(ApplicationStatus).find((s) => s === sp.get("status"));
  const where: Prisma.StaffApplicationWhereInput = {
    ...(status ? { status } : { status: { notIn: ["ARCHIVED", "REJECTED"] } }),
    ...(sp.get("role") ? { roles: { has: sp.get("role")! } } : {}),
    ...(sp.get("qual") ? { qualifications: { has: sp.get("qual")! } } : {}),
  };
  const rows = await db.staffApplication.findMany({ where, orderBy: { createdAt: "desc" }, take: 5000 });
  const cols = [
    "id", "createdAt", "status", "source", "active", "rating", "firstName", "lastName", "email", "phone", "roles", "expertise", "qualifications", "workRights",
    "employmentType", "locations", "languages", "shiftTypes", "ownTransport", "availability", "referee1", "referee2", "emergencyName", "emergencyPhone", "experience",
  ] as const;
  const body = [cols.join(","), ...rows.map((r) => cols.map((c) => csv(r[c])).join(","))].join("\n");
  return new Response(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="brilliance-applications-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
