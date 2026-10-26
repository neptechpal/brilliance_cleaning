"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AttendanceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { bool, int, num, str, text } from "@/lib/admin-format";
import { geocode } from "@/lib/geo";
import { fromSydney } from "@/lib/sydney";

const PALETTE = ["#2d5be3", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#0b7a5f", "#f05152"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// ─── Sites (cost centres) ────────────────────────────────────────────
export async function saveCostCentre(fd: FormData) {
  await requireUser();
  const id = int(fd.get("id"));
  const address = str(fd.get("address"));
  let lat = num(fd.get("lat"));
  let lng = num(fd.get("lng"));
  const prev = id ? await db.costCentre.findUnique({ where: { id } }) : null;
  if (address && (lat == null || lng == null || (prev && prev.address !== address && lat === prev.lat && lng === prev.lng))) {
    const g = await geocode(address);
    if (g) ({ lat, lng } = g);
  }
  const data = {
    name: str(fd.get("name")) ?? "Untitled site",
    address,
    contactName: str(fd.get("contactName")),
    contactPhone: str(fd.get("contactPhone")),
    notes: str(fd.get("notes")),
    geofenceRadius: Math.max(0, int(fd.get("geofenceRadius")) ?? 200),
    lat,
    lng,
    active: bool(fd.get("active")),
  };
  try {
    if (id) await db.costCentre.update({ where: { id }, data });
    else await db.costCentre.create({ data });
  } catch {
    redirect("/admin/roster/sites?error=name");
  }
  redirect(`/admin/roster/sites?saved=1${lat == null && address ? "&nogeo=1" : ""}`);
}

export async function deleteCostCentre(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const inUse = await db.employee.count({ where: { costCentreId: id } });
  if (inUse) redirect("/admin/roster/sites?error=inuse");
  await db.costCentre.delete({ where: { id } });
  redirect("/admin/roster/sites?deleted=1");
}

// ─── Employees ───────────────────────────────────────────────────────
export async function saveEmployee(fd: FormData) {
  await requireUser();
  const id = int(fd.get("id"));
  const email = str(fd.get("email"))?.toLowerCase();
  const firstName = str(fd.get("firstName"));
  const lastName = str(fd.get("lastName"));
  const phone = str(fd.get("phone"));
  const password = String(fd.get("password") ?? "");
  const back = id ? `/admin/roster/employees/${id}` : "/admin/roster/employees/new";
  if (!email || !firstName || !lastName || !phone) redirect(`${back}?error=missing`);
  if (password && password.length < 8) redirect(`${back}?error=short`);
  const data = {
    firstName,
    lastName,
    email,
    phone,
    address: str(fd.get("address")),
    emergencyName: str(fd.get("emergencyName")),
    emergencyPhone: str(fd.get("emergencyPhone")),
    comments: text(fd.get("comments")).trim() || null,
    costCentreId: int(fd.get("costCentreId")),
    active: bool(fd.get("active")),
    color: str(fd.get("color")),
    ...(password ? { passwordHash: await bcrypt.hash(password, 12), mustSetPassword: bool(fd.get("mustSetPassword")) } : {}),
  };
  let row;
  try {
    row = id ? await db.employee.update({ where: { id }, data }) : await db.employee.create({ data: { ...data, color: data.color ?? PALETTE[(await db.employee.count()) % PALETTE.length] } });
  } catch {
    redirect(`${back}?error=email`);
  }
  redirect(`/admin/roster/employees/${row.id}?saved=1`);
}

// ─── Shifts (called from the roster grid client component) ──────────
export type ShiftInput = {
  id?: number;
  employeeId: number;
  costCentreId?: number | null;
  siteName?: string;
  siteAddress?: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  repeatDays?: string[]; // extra dates to create the same shift on
};

export async function saveShift(input: ShiftInput): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  if (!DATE.test(input.date) || !TIME.test(input.startTime) || !TIME.test(input.endTime)) return { ok: false, error: "Check the date and times." };
  const emp = await db.employee.findUnique({ where: { id: input.employeeId } });
  if (!emp) return { ok: false, error: "Choose an employee." };
  const cc = input.costCentreId ? await db.costCentre.findUnique({ where: { id: input.costCentreId } }) : null;
  const siteName = cc?.name ?? input.siteName?.trim();
  if (!siteName) return { ok: false, error: "Choose a site." };
  const base = {
    employeeId: emp.id,
    costCentreId: cc?.id ?? null,
    siteName,
    siteAddress: cc?.address ?? input.siteAddress?.trim() ?? null,
    siteLat: cc?.lat ?? null,
    siteLng: cc?.lng ?? null,
    startTime: input.startTime,
    endTime: input.endTime,
    notes: input.notes?.trim() || null,
  };
  if (input.id) await db.shift.update({ where: { id: input.id }, data: { ...base, date: input.date } });
  else await db.shift.create({ data: { ...base, date: input.date } });
  for (const d of input.repeatDays ?? []) if (DATE.test(d) && d !== input.date) await db.shift.create({ data: { ...base, date: d } });
  revalidatePath("/admin/roster", "layout");
  return { ok: true };
}

export async function deleteShift(id: number) {
  await requireUser();
  await db.shift.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/admin/roster", "layout");
  return { ok: true };
}

/** Copies every non-cancelled shift from one week to the week starting `toMonday`. */
export async function copyWeek(fromMonday: string, toMonday: string) {
  await requireUser();
  const [fy, fm, fdd] = fromMonday.split("-").map(Number);
  const [ty, tm, tdd] = toMonday.split("-").map(Number);
  const offset = Math.round((Date.UTC(ty, tm - 1, tdd) - Date.UTC(fy, fm - 1, fdd)) / 86400000);
  const end = new Date(Date.UTC(fy, fm - 1, fdd + 6)).toISOString().slice(0, 10);
  const src = await db.shift.findMany({ where: { date: { gte: fromMonday, lte: end }, status: { not: "CANCELLED" } } });
  for (const s of src) {
    const [y, m, d] = s.date.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10);
    await db.shift.create({
      data: { employeeId: s.employeeId, costCentreId: s.costCentreId, siteName: s.siteName, siteAddress: s.siteAddress, siteLat: s.siteLat, siteLng: s.siteLng, date, startTime: s.startTime, endTime: s.endTime, notes: s.notes },
    });
  }
  revalidatePath("/admin/roster", "layout");
  return { ok: true, copied: src.length };
}

// ─── Attendance ──────────────────────────────────────────────────────
export async function setAttendanceStatus(ids: number[], status: AttendanceStatus) {
  const user = await requireUser();
  await db.attendance.updateMany({ where: { id: { in: ids } }, data: { status, editedBy: user.name } });
  revalidatePath("/admin/roster/attendance");
  return { ok: true };
}

export async function setAttendancePaid(id: number, paid: boolean) {
  const user = await requireUser();
  await db.attendance.update({ where: { id }, data: { paid, editedBy: user.name } });
  revalidatePath("/admin/roster/attendance");
  return { ok: true };
}

export type AttendanceInput = { id?: number; employeeId: number; shiftId?: number | null; date: string; signIn: string; signOutDate?: string; signOut?: string; notes?: string };

export async function saveAttendance(input: AttendanceInput): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!DATE.test(input.date) || !TIME.test(input.signIn)) return { ok: false, error: "Sign-in date and time are required." };
  const signInAt = fromSydney(input.date, input.signIn);
  let signOutAt: Date | null = null;
  if (input.signOut) {
    if (!TIME.test(input.signOut)) return { ok: false, error: "Check the sign-out time." };
    signOutAt = fromSydney(input.signOutDate && DATE.test(input.signOutDate) ? input.signOutDate : input.date, input.signOut);
    if (signOutAt <= signInAt) signOutAt = new Date(signOutAt.getTime() + 86400000); // finished after midnight
  }
  const data = { employeeId: input.employeeId, shiftId: input.shiftId || null, signInAt, signOutAt, notes: input.notes?.trim() || null, manual: true, editedBy: user.name };
  if (input.id) await db.attendance.update({ where: { id: input.id }, data });
  else await db.attendance.create({ data: { ...data, status: "PENDING" } });
  if (input.shiftId && signOutAt) await db.shift.update({ where: { id: input.shiftId }, data: { status: "COMPLETED" } });
  revalidatePath("/admin/roster", "layout");
  return { ok: true };
}

export async function deleteAttendance(id: number) {
  await requireAdmin();
  await db.attendance.delete({ where: { id } });
  revalidatePath("/admin/roster", "layout");
  return { ok: true };
}
