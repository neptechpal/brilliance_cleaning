import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { findAttendance, toRow } from "@/lib/roster-data";
import { addDays, fmt12, sydneyDate } from "@/lib/sydney";
import { RosterTabs } from "@/components/admin/RosterTabs";
import { AttendanceTable } from "@/components/admin/AttendanceTable";
import { PageHeader } from "@/components/admin/ui";

const STATUSES = ["PENDING", "APPROVED", "DECLINED"] as const;

export default async function AttendancePage({ searchParams }: PageProps<"/admin/roster/attendance">) {
  await requireUser();
  const sp = await searchParams;
  const today = sydneyDate();
  const valid = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const from = valid(sp.from) ? (sp.from as string) : addDays(today, -30);
  const to = valid(sp.to) ? (sp.to as string) : today;
  const employeeId = Number(sp.emp) || undefined;
  const status = typeof sp.status === "string" && (STATUSES as readonly string[]).includes(sp.status) ? (sp.status as (typeof STATUSES)[number]) : undefined;

  const [records, employees, shifts] = await Promise.all([
    findAttendance({ from, to, employeeId, status }),
    db.employee.findMany({ orderBy: [{ active: "desc" }, { firstName: "asc" }] }),
    db.shift.findMany({ where: { date: { gte: addDays(today, -60) }, status: { not: "CANCELLED" } }, orderBy: { date: "desc" }, take: 300 }),
  ]);
  const qs = new URLSearchParams({ from, to, ...(employeeId ? { emp: String(employeeId) } : {}), ...(status ? { status } : {}) }).toString();

  return (
    <>
      <PageHeader title="Attendance & timesheets" intro="Sign-ins and sign-outs from the staff portal, with GPS location. Approve before exporting for payroll." />
      <RosterTabs active="/admin/roster/attendance" />
      <form className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-white p-3" action="/admin/roster/attendance">
        <label className="text-xs font-semibold">
          Employee
          <select name="emp" defaultValue={employeeId ?? ""} className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">All employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName}
                {e.active ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          From
          <input type="date" name="from" defaultValue={from} className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold">
          To
          <input type="date" name="to" defaultValue={to} className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold">
          Status
          <select name="status" defaultValue={status ?? ""} className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Filter</button>
        <a href={`/api/admin/roster/export?${qs}&status=APPROVED`} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink hover:bg-sand">
          <Download className="size-4" /> Export approved (Excel)
        </a>
      </form>
      <AttendanceTable
        rows={records.map(toRow)}
        employees={employees.map((e) => ({ id: e.id, label: `${e.firstName} ${e.lastName}${e.active ? "" : " (inactive)"}` }))}
        shifts={shifts.map((s) => ({ id: s.id, employeeId: s.employeeId, date: s.date, label: `${s.siteName} — ${s.date} ${fmt12(s.startTime)}–${fmt12(s.endTime)}` }))}
      />
    </>
  );
}
