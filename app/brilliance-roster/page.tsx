import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { getEmployee } from "@/lib/staff-session";
import { addDays, fmt12, fmtDay, minutesBetween, sydneyDate, sydneyTime } from "@/lib/sydney";
import { PortalLogin, SetPassword } from "@/components/portal/PortalForms";
import { Portal } from "@/components/portal/Portal";

export const metadata: Metadata = {
  title: { absolute: "Staff Portal | Brilliance Roster" },
  robots: { index: false, follow: false },
};

// Every visit is personal (cookie session), so this page is allowed to block.
export const instant = false;

async function PortalContent() {
  const emp = await getEmployee();
  if (!emp) return <PortalLogin />;
  if (emp.mustSetPassword) return <SetPassword name={emp.firstName} />;

  const today = sydneyDate();
  const [open, todayShifts, upcoming, history] = await Promise.all([
    db.attendance.findFirst({ where: { employeeId: emp.id, signOutAt: null, signInAt: { not: null } }, include: { shift: true }, orderBy: { signInAt: "desc" } }),
    db.shift.findMany({ where: { employeeId: emp.id, OR: [{ date: today }, { date: addDays(today, -1), endTime: { gt: sydneyTime() } }], status: "SCHEDULED" }, include: { costCentre: true }, orderBy: { startTime: "asc" } }),
    db.shift.findMany({ where: { employeeId: emp.id, date: { gte: today, lte: addDays(today, 30) }, status: "SCHEDULED" }, include: { costCentre: true }, orderBy: [{ date: "asc" }, { startTime: "asc" }], take: 20 }),
    db.attendance.findMany({ where: { employeeId: emp.id, signOutAt: { not: null }, signInAt: { not: null } }, include: { shift: true }, orderBy: { signInAt: "desc" }, take: 30 }),
  ]);
  const site = (s: (typeof todayShifts)[number]) => ({
    lat: s.costCentre?.lat ?? s.siteLat ?? null,
    lng: s.costCentre?.lng ?? s.siteLng ?? null,
    radius: s.costCentre?.geofenceRadius ?? 200,
  });
  const h = Number(sydneyTime().slice(0, 2));

  return (
    <Portal
      greeting={h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"}
      name={`${emp.firstName} ${emp.lastName}`}
      initials={`${emp.firstName[0] ?? ""}${emp.lastName[0] ?? ""}`}
      open={
        open
          ? {
              id: open.id,
              signInAt: open.signInAt!.toISOString(),
              site: open.shift?.siteName ?? "Ad hoc",
              address: open.signInAddress,
              notes: open.notes ?? "",
            }
          : null
      }
      todayShifts={todayShifts.filter((s) => s.date === today || s.endTime <= s.startTime).map((s) => ({
        id: s.id,
        site: s.siteName,
        address: s.siteAddress,
        time: `${fmt12(s.startTime)} – ${fmt12(s.endTime)}`,
        notes: s.notes ?? s.costCentre?.notes ?? null,
        ...site(s),
      }))}
      adHocSite={
        emp.costCentre
          ? { name: emp.costCentre.name, lat: emp.costCentre.lat, lng: emp.costCentre.lng, radius: emp.costCentre.geofenceRadius }
          : null
      }
      upcoming={upcoming.map((s) => ({
        id: s.id,
        day: s.date === today ? "Today" : fmtDay(s.date),
        time: `${fmt12(s.startTime)} – ${fmt12(s.endTime)}`,
        site: s.siteName,
        address: s.siteAddress ?? s.costCentre?.address ?? null,
        notes: s.notes ?? s.costCentre?.notes ?? null,
        contact: s.costCentre?.contactName ? `${s.costCentre.contactName} ${s.costCentre.contactPhone ?? ""}`.trim() : null,
      }))}
      history={history.map((a) => {
        const mins = minutesBetween(a.signInAt, a.signOutAt) ?? 0;
        return {
          id: a.id,
          day: fmtDay(sydneyDate(a.signInAt!)),
          site: a.shift?.siteName ?? "Ad hoc",
          time: `${fmt12(sydneyTime(a.signInAt!))} – ${fmt12(sydneyTime(a.signOutAt!))}`,
          duration: `${Math.floor(mins / 60)}h ${mins % 60}m`,
          status: a.status,
        };
      })}
    />
  );
}

export default function RosterPortalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-sand">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          </div>
        }
      >
        <PortalContent />
      </Suspense>
    </div>
  );
}
