import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { mapsLink } from "./geo";
import { addDays, fmt12, fmtDuration, fromSydney, minutesBetween, sydneyDate, sydneyTime } from "./sydney";

export type AttendanceFilter = { employeeId?: number; from: string; to: string; status?: "PENDING" | "APPROVED" | "DECLINED" };

export async function findAttendance(f: AttendanceFilter) {
  const where: Prisma.AttendanceWhereInput = {
    signInAt: { gte: fromSydney(f.from, "00:00"), lt: fromSydney(addDays(f.to, 1), "00:00") },
    ...(f.employeeId ? { employeeId: f.employeeId } : {}),
    ...(f.status ? { status: f.status } : {}),
  };
  return db.attendance.findMany({ where, include: { employee: true, shift: true }, orderBy: { signInAt: "desc" } });
}

export function toRow(a: Awaited<ReturnType<typeof findAttendance>>[number]) {
  const mins = minutesBetween(a.signInAt, a.signOutAt);
  return {
    id: a.id,
    employeeId: a.employeeId,
    employee: `${a.employee.firstName} ${a.employee.lastName}`,
    site: a.shift?.siteName ?? "Ad hoc",
    shiftId: a.shiftId,
    date: a.signInAt ? sydneyDate(a.signInAt) : "",
    rostered: a.shift ? `${fmt12(a.shift.startTime)}–${fmt12(a.shift.endTime)}` : null,
    signIn: a.signInAt ? sydneyTime(a.signInAt) : "",
    signOutDate: a.signOutAt ? sydneyDate(a.signOutAt) : null,
    signOut: a.signOutAt ? sydneyTime(a.signOutAt) : null,
    inAddress: a.signInAddress,
    inMap: mapsLink(a.signInLat, a.signInLng, null),
    inDistance: a.signInDistance,
    outAddress: a.signOutAddress,
    outMap: mapsLink(a.signOutLat, a.signOutLng, null),
    duration: fmtDuration(mins),
    minutes: mins,
    notes: a.notes,
    status: a.status,
    paid: a.paid,
    manual: a.manual,
  };
}
