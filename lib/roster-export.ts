import writeXlsxFile from "write-excel-file/node";
import type { toRow } from "./roster-data";

export function attendanceWorkbook(rows: ReturnType<typeof toRow>[]) {
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
  const totals = new Map<number, { name: string; shifts: number; minutes: number }>();
  for (const r of rows) {
    const t = totals.get(r.employeeId) ?? { name: r.employee, shifts: 0, minutes: 0 };
    t.shifts++;
    t.minutes += r.minutes ?? 0;
    totals.set(r.employeeId, t);
  }
  const sheet2 = [
    ["Employee", "Shifts", "Total hours"].map((value) => ({ value, fontWeight: "bold" as const, backgroundColor: "#D5F1E5" })),
    ...[...totals.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => [
        { type: String, value: t.name },
        { type: Number, value: t.shifts },
        { type: Number, value: Math.round((t.minutes / 60) * 100) / 100 },
      ]),
  ];
  return writeXlsxFile([
    { data: sheet1, sheet: "Timesheets", columns: [{ width: 22 }, { width: 24 }, { width: 12 }, { width: 14 }, { width: 9 }, { width: 18 }, { width: 8 }, { width: 10 }, { width: 34 }, { width: 34 }, { width: 30 }, { width: 11 }, { width: 6 }] },
    { data: sheet2, sheet: "Summary", columns: [{ width: 24 }, { width: 8 }, { width: 12 }] },
  ]).toBuffer();
}
