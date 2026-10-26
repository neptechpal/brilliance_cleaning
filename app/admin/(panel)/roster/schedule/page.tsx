import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, fmtDay, sydneyDate, weekStart } from "@/lib/sydney";
import { RosterTabs } from "@/components/admin/RosterTabs";
import { RosterGrid } from "@/components/admin/RosterGrid";
import { PageHeader } from "@/components/admin/ui";

export default async function SchedulePage({ searchParams }: PageProps<"/admin/roster/schedule">) {
  await requireUser();
  const sp = await searchParams;
  const today = sydneyDate();
  const mon = weekStart(typeof sp.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? sp.week : today);
  const sun = addDays(mon, 6);
  const [employees, sites, shifts] = await Promise.all([
    db.employee.findMany({ where: { active: true }, include: { costCentre: true }, orderBy: [{ firstName: "asc" }] }),
    db.costCentre.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.shift.findMany({ where: { date: { gte: mon, lte: sun }, status: { not: "CANCELLED" } }, orderBy: { startTime: "asc" } }),
  ]);
  const emps = employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, color: e.color || "#0b7a5f", costCentreId: e.costCentreId, site: e.costCentre?.name ?? "No site assigned" }));
  const groupNames = [...new Set(emps.map((e) => e.site))].sort((a, b) => (a === "No site assigned" ? 1 : b === "No site assigned" ? -1 : a.localeCompare(b)));
  const groups = groupNames.map((name) => ({ name, employees: emps.filter((e) => e.site === name) }));
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(mon, i);
    return { date, day: fmtDay(date, { weekday: "short" }), label: fmtDay(date, { day: "numeric" }) };
  });

  return (
    <>
      <PageHeader
        title="Weekly roster"
        intro={`${fmtDay(mon, { day: "numeric", month: "short" })} – ${fmtDay(sun, { day: "numeric", month: "short", year: "numeric" })}`}
        actions={
          <div className="flex items-center gap-1 rounded-lg bg-white p-1 ring-1 ring-line">
            <Link href={`/admin/roster/schedule?week=${addDays(mon, -7)}`} className="rounded-md p-1.5 hover:bg-sand" aria-label="Previous week">
              <ChevronLeft className="size-4" />
            </Link>
            <Link href="/admin/roster/schedule" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-sand">
              This week
            </Link>
            <Link href={`/admin/roster/schedule?week=${addDays(mon, 7)}`} className="rounded-md p-1.5 hover:bg-sand" aria-label="Next week">
              <ChevronRight className="size-4" />
            </Link>
          </div>
        }
      />
      <RosterTabs active="/admin/roster/schedule" />
      <RosterGrid
        days={days}
        today={today}
        groups={groups}
        shifts={shifts.map((s) => ({ id: s.id, employeeId: s.employeeId, costCentreId: s.costCentreId, siteName: s.siteName, siteAddress: s.siteAddress, date: s.date, startTime: s.startTime, endTime: s.endTime, notes: s.notes, status: s.status }))}
        sites={sites.map((s) => ({ id: s.id, name: s.name, address: s.address }))}
        employees={emps.map((e) => ({ id: e.id, name: e.name, color: e.color, costCentreId: e.costCentreId }))}
        prevMonday={addDays(mon, -7)}
      />
    </>
  );
}
