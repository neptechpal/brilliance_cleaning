import { attendanceWorkbook } from "@/lib/roster-export";
import { getSession } from "@/lib/auth";
import { findAttendance, toRow } from "@/lib/roster-data";
import { addDays, sydneyDate, validDate } from "@/lib/sydney";

// Approved timesheets as an Excel workbook (Timesheets + Summary). Admin session required —
// the old WordPress plugin exposed this export without login.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const valid = (v: string | null) => (v && validDate(v) ? v : null);
  const to = valid(sp.get("to")) ?? sydneyDate();
  const from = valid(sp.get("from")) ?? addDays(to, -14);
  if (from > to) return new Response("Start date must be before end date", { status: 400 });
  const status = (["PENDING", "APPROVED", "DECLINED"] as const).find((s) => s === sp.get("status")) ?? "APPROVED";
  const rows = (await findAttendance({ from, to, status, employeeId: Number(sp.get("emp")) || undefined })).map(toRow).reverse();

  const buffer = await attendanceWorkbook(rows);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="brilliance-timesheets-${from}-to-${to}${status ? `-${status.toLowerCase()}` : ""}.xlsx"`,
    },
  });
}
