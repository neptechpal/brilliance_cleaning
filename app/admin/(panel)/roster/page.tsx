import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, fmt12, fmtDuration, fmtInstant, minutesBetween, sydneyDate, sydneyTime, weekStart } from "@/lib/sydney";
import { mapsLink } from "@/lib/geo";
import { RosterTabs } from "@/components/admin/RosterTabs";
import { Badge, PageHeader, Panel, Stat, Table, td } from "@/components/admin/ui";

export default async function RosterOverview() {
  await requireUser();
  const today = sydneyDate();
  const now = sydneyTime();
  const mon = weekStart(today);
  const [activeEmps, todayShifts, onSite, weekShifts, recent, pending] = await Promise.all([
    db.employee.count({ where: { active: true } }),
    db.shift.findMany({ where: { date: today, status: { not: "CANCELLED" } }, include: { employee: true }, orderBy: { startTime: "asc" } }),
    db.attendance.findMany({ where: { signOutAt: null, signInAt: { not: null } }, include: { employee: true, shift: true }, orderBy: { signInAt: "desc" } }),
    db.shift.count({ where: { date: { gte: mon, lte: addDays(mon, 6) }, status: { not: "CANCELLED" } } }),
    db.attendance.findMany({ include: { employee: true, shift: true }, orderBy: { signInAt: "desc" }, take: 15 }),
    db.attendance.count({ where: { status: "PENDING", signOutAt: { not: null } } }),
  ]);

  return (
    <>
      <PageHeader title="Roster" intro="Staff shifts, sign-in/out with location, and timesheets for your cleaning sites." />
      <RosterTabs active="/admin/roster" />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Active employees" value={activeEmps} />
        <Stat label="Shifts today" value={todayShifts.length} tone="brand" />
        <Stat label="On site now" value={onSite.length} tone="coral" />
        <Stat label="Shifts this week" value={weekShifts} />
        <Stat label="Timesheets to approve" value={pending} sub={<Link className="underline" href="/admin/roster/attendance?status=PENDING">Review</Link>} />
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel title={`Today's shifts · ${today}`}>
          <ul className="divide-y divide-line text-sm">
            {todayShifts.map((s) => {
              const live = s.startTime <= now && now <= s.endTime;
              return (
                <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    <b>{s.employee.firstName} {s.employee.lastName}</b> · {s.siteName}
                  </span>
                  <span className="shrink-0 text-ink-soft">
                    {fmt12(s.startTime)}–{fmt12(s.endTime)} {live && <Badge tone="ok">now</Badge>}
                  </span>
                </li>
              );
            })}
            {!todayShifts.length && <li className="py-4 text-ink-soft">No shifts rostered today.</li>}
          </ul>
        </Panel>
        <Panel title="Currently signed in">
          <ul className="divide-y divide-line text-sm">
            {onSite.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  <b>{a.employee.firstName} {a.employee.lastName}</b> · {a.shift?.siteName ?? "Ad hoc"}
                  <span className="block text-xs text-ink-soft">{a.signInAddress}</span>
                </span>
                <span className="shrink-0 text-ink-soft">since {fmtInstant(a.signInAt, false)}</span>
              </li>
            ))}
            {!onSite.length && <li className="py-4 text-ink-soft">Nobody is signed in right now.</li>}
          </ul>
        </Panel>
      </div>
      <Panel title="Recent attendance" actions={<Link href="/admin/roster/attendance" className="text-xs font-semibold text-brand-700">All records →</Link>}>
        <Table head={["Employee", "Site", "Sign in", "Location", "Sign out", "Duration", "Status"]}>
          {recent.map((a) => {
            const map = mapsLink(a.signInLat, a.signInLng, a.signInAddress);
            return (
              <tr key={a.id}>
                <td className={`${td} font-semibold`}>
                  {a.employee.firstName} {a.employee.lastName}
                </td>
                <td className={td}>{a.shift?.siteName ?? "Ad hoc"}</td>
                <td className={`${td} whitespace-nowrap`}>{fmtInstant(a.signInAt)}</td>
                <td className={`${td} max-w-[14rem] truncate text-xs`}>
                  {map ? (
                    <a href={map} target="_blank" className="hover:underline">
                      {a.signInAddress || "Map"}
                    </a>
                  ) : (
                    a.signInAddress || "—"
                  )}
                </td>
                <td className={`${td} whitespace-nowrap`}>{a.signOutAt ? fmtInstant(a.signOutAt) : <Badge tone="warn">On site</Badge>}</td>
                <td className={td}>{fmtDuration(minutesBetween(a.signInAt, a.signOutAt))}</td>
                <td className={td}>
                  <Badge tone={a.status === "APPROVED" ? "ok" : a.status === "DECLINED" ? "bad" : "warn"}>{a.status.toLowerCase()}</Badge>
                </td>
              </tr>
            );
          })}
        </Table>
      </Panel>
    </>
  );
}
