import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, fmt12, fmtDay, sydneyDate, weekStart } from "@/lib/sydney";
import { RosterTabs } from "@/components/admin/RosterTabs";
import { PageHeader } from "@/components/admin/ui";

export default async function CalendarPage({ searchParams }: PageProps<"/admin/roster/calendar">) {
  await requireUser();
  const sp = await searchParams;
  const today = sydneyDate();
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const gridStart = weekStart(first);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const gridEnd = addDays(weekStart(`${month}-${String(lastDay).padStart(2, "0")}`), 6);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);

  const [shifts, employees] = await Promise.all([
    db.shift.findMany({ where: { date: { gte: gridStart, lte: gridEnd }, status: { not: "CANCELLED" } }, include: { employee: true }, orderBy: [{ date: "asc" }, { startTime: "asc" }] }),
    db.employee.findMany({ where: { active: true }, orderBy: { firstName: "asc" } }),
  ]);
  const days: string[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  return (
    <>
      <PageHeader
        title="Calendar"
        intro={fmtDay(first, { month: "long", year: "numeric" })}
        actions={
          <div className="flex items-center gap-1 rounded-lg bg-white p-1 ring-1 ring-line">
            <Link href={`/admin/roster/calendar?month=${prev}`} className="rounded-md p-1.5 hover:bg-sand" aria-label="Previous month">
              <ChevronLeft className="size-4" />
            </Link>
            <Link href="/admin/roster/calendar" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-sand">
              Today
            </Link>
            <Link href={`/admin/roster/calendar?month=${next}`} className="rounded-md p-1.5 hover:bg-sand" aria-label="Next month">
              <ChevronRight className="size-4" />
            </Link>
          </div>
        }
      />
      <RosterTabs active="/admin/roster/calendar" />
      <div className="mb-3 flex flex-wrap gap-3 text-xs">
        {employees.map((e) => (
          <span key={e.id} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: e.color || "#0b7a5f" }} /> {e.firstName} {e.lastName}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <div className="grid min-w-[840px] grid-cols-7 border-b border-line bg-sand text-center text-xs font-bold uppercase tracking-wider text-ink-soft">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid min-w-[840px] grid-cols-7">
          {days.map((d) => {
            const list = shifts.filter((s) => s.date === d);
            const inMonth = d.startsWith(month);
            return (
              <Link
                key={d}
                href={`/admin/roster/schedule?week=${weekStart(d)}`}
                className={`min-h-28 border-b border-r border-line p-1.5 hover:bg-brand-50/40 ${inMonth ? "" : "bg-sand/60 text-ink-soft/60"}`}
              >
                <span className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${d === today ? "bg-brand-600 text-white" : ""}`}>{Number(d.slice(8))}</span>
                <div className="space-y-0.5">
                  {list.slice(0, 5).map((s) => (
                    <div key={s.id} className="truncate rounded px-1 py-0.5 text-[10.5px] font-semibold text-white" style={{ background: s.employee.color || "#0b7a5f" }} title={`${s.employee.firstName} ${s.employee.lastName} · ${s.siteName} ${fmt12(s.startTime)}–${fmt12(s.endTime)}`}>
                      {fmt12(s.startTime)} {s.employee.firstName} · {s.siteName}
                    </div>
                  ))}
                  {list.length > 5 && <div className="text-[10.5px] font-semibold text-ink-soft">+{list.length - 5} more</div>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
