import type { ApplicationStatus, Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";

const csv = (v: unknown) => {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join("; ") : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return new Response("Unauthorized", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const where: Prisma.StaffApplicationWhereInput = {
    ...(sp.get("status") ? { status: sp.get("status") as ApplicationStatus } : {}),
    ...(sp.get("role") ? { roles: { has: sp.get("role")! } } : {}),
    ...(sp.get("qual") ? { qualifications: { has: sp.get("qual")! } } : {}),
  };
  const rows = await db.staffApplication.findMany({ where, orderBy: { createdAt: "desc" }, take: 5000 });
  const cols = [
    "id", "createdAt", "status", "rating", "firstName", "lastName", "email", "phone", "roles", "expertise", "qualifications", "workRights",
    "employmentType", "locations", "languages", "shiftTypes", "ownTransport", "availability", "referee1", "referee2", "emergencyName", "emergencyPhone", "experience",
  ] as const;
  const body = [cols.join(","), ...rows.map((r) => cols.map((c) => csv(r[c])).join(","))].join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="brilliance-applications-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
