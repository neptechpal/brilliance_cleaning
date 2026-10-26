import { cookies } from "next/headers";
import writeXlsxFile from "write-excel-file/node";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";
import { findAttendance, toRow } from "@/lib/roster-data";
import { addDays, sydneyDate } from "@/lib/sydney";

// Approved timesheets as an Excel workbook (Timesheets + Summary). Admin session required —
// the old WordPress plugin exposed this export without login.
export async function GET(req: Request) {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return new Response("Unauthorized", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const valid = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const to = valid(sp.get("to")) ?? sydneyDate();
  const from = valid(sp.get("from")) ?? addDays(to, -14);
  const status = (["PENDING", "APPROVED", "DECLINED"] as const).find((s) => s === sp.get("status"));
  const rows = (await findAttendance({ from, to, status, employeeId: Number(sp.get("emp")) || undefined })).map(toRow).reverse();

  const header = ["Employee", "Site", "Date", "Rostered", "Sign in", "Sign out", "Hours", "Duration", "Location in", "Location out", "Notes", "Status", "Paid"].map((value) => ({
    value,
    fontWeight: "bold" as const,
    backgroundColor: "#D5F1E5",
  }));
  const sheet1 = [
    header,
    ...rows.map((r) => [
      { type: String, value: r.employee },
      { type: String, value: r.site },
      { type: String, value: r.date },
      { type: String, value: r.rostered ?? "" },
      { type: String, value: r.signIn },
      { type: String, value: r.signOut ? (r.signOutDate !== r.date ? `${r.signOut} (${r.signOutDate})` : r.signOut) : "" },
      { type: Number, value: r.minutes != null ? Math.round((r.minutes / 60) * 100) / 100 : 0 },
      { type: String, value: r.duration },
      { type: String, value: r.inAddress ?? "" },
      { type: String, value: r.outAddress ?? "" },
      { type: String, value: r.notes ?? "" },
      { type: String, value: r.status },
      { type: String, value: r.paid ? "Yes" : "No" },
    ]),
  ];
  const totals = new Map<string, { shifts: number; minutes: number }>();
  for (const r of rows) {
    const t = totals.get(r.employee) ?? { shifts: 0, minutes: 0 };
    t.shifts++;
    t.minutes += r.minutes ?? 0;
    totals.set(r.employee, t);
  }
  const sheet2 = [
    ["Employee", "Shifts", "Total hours"].map((value) => ({ value, fontWeight: "bold" as const, backgroundColor: "#D5F1E5" })),
    ...[...totals.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, t]) => [
        { type: String, value: name },
        { type: Number, value: t.shifts },
        { type: Number, value: Math.round((t.minutes / 60) * 100) / 100 },
      ]),
  ];
  // TODO(verify): write-excel-file v4 typings reject mixed header/data rows; runtime API is (data[], { sheets, columns, buffer })
  const write = writeXlsxFile as unknown as (data: unknown, opts: unknown) => Promise<Buffer>;
  const buffer = await write([sheet1, sheet2], {
    sheets: ["Timesheets", "Summary"],
    columns: [[{ width: 22 }, { width: 24 }, { width: 12 }, { width: 14 }, { width: 9 }, { width: 18 }, { width: 8 }, { width: 10 }, { width: 34 }, { width: 34 }, { width: 30 }, { width: 11 }, { width: 6 }], [{ width: 24 }, { width: 8 }, { width: 12 }]],
    buffer: true,
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="brilliance-timesheets-${from}-to-${to}${status ? `-${status.toLowerCase()}` : ""}.xlsx"`,
    },
  });
}
