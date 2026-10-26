"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AttendanceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { bool, int, num, str, text } from "@/lib/admin-format";
import { geocode } from "@/lib/geo";
import { addDays, fromSydney, validDate, validTime, weekStart } from "@/lib/sydney";

const PALETTE = ["#2d5be3", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#0b7a5f", "#f05152"];

// ─── Sites (cost centres) ────────────────────────────────────────────
export async function saveCostCentre(fd: FormData) {
  await requireUser();
  const id = int(fd.get("id"));
  const address = str(fd.get("address"));
  let lat = num(fd.get("lat"));
  let lng = num(fd.get("lng"));
  if ((lat != null && Math.abs(lat) > 90) || (lng != null && Math.abs(lng) > 180)) redirect("/admin/roster/sites?error=coordinates");
  const prev = id ? await db.costCentre.findUnique({ where: { id } }) : null;
  if (address && (lat == null || lng == null || (prev && prev.address !== address && lat === prev.lat && lng === prev.lng))) {
    lat = null;
    lng = null;
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
  const inUse = (await db.employee.count({ where: { costCentreId: id } })) + (await db.shift.count({ where: { costCentreId: id } }));
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
  if (!z.email().safeParse(email).success) redirect(`${back}?error=email`);
  if (password && (password.length < 8 || Buffer.byteLength(password, "utf8") > 72)) redirect(`${back}?error=short`);
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
  const parsed = z.object({
    id: z.number().int().positive().optional(), employeeId: z.number().int().positive(), costCentreId: z.number().int().positive().nullable().optional(),
    siteName: z.string().trim().max(200).optional(), siteAddress: z.string().trim().max(400).optional(),
    date: z.string().refine(validDate), startTime: z.string().refine(validTime), endTime: z.string().refine(validTime),
    notes: z.string().max(4000).optional(), repeatDays: z.array(z.string().refine(validDate)).max(60).optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the employee, date and times." };
  input = parsed.data;
  const emp = await db.employee.findUnique({ where: { id: input.employeeId } });
  if (!emp?.active) return { ok: false, error: "Choose an employee." };
  const cc = input.costCentreId ? await db.costCentre.findUnique({ where: { id: input.costCentreId } }) : null;
  if (input.costCentreId && !cc?.active) return { ok: false, error: "Choose an active site." };
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
  const dates = [...new Set([input.date, ...(input.repeatDays ?? [])])];
  try {
    for (const date of dates) {
      fromSydney(date, input.startTime);
      fromSydney(input.endTime <= input.startTime ? addDays(date, 1) : date, input.endTime);
    }
  } catch { return { ok: false, error: "A shift time does not exist in Sydney due to daylight saving." }; }
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Employee" WHERE id = ${emp.id} FOR UPDATE`;
    if (input.id) {
      const existing = await tx.shift.findUnique({ where: { id: input.id }, include: { _count: { select: { attendance: true } } } });
      if (!existing || existing.status !== "SCHEDULED" || existing._count.attendance) return { ok: false, error: "Only scheduled shifts without attendance can be edited." };
      await tx.shift.update({ where: { id: input.id }, data: { ...base, date: input.date } });
    } else await tx.shift.create({ data: { ...base, date: input.date } });
    await tx.shift.createMany({ data: dates.filter((d) => d !== input.date).map((date) => ({ ...base, date })) });
    return { ok: true };
  });
  revalidatePath("/admin/roster", "layout");
  return result;
}

export async function deleteShift(id: number) {
  await requireUser();
  const result = await db.$transaction(async (tx) => {
    const shift = await tx.shift.findUnique({ where: { id } });
    if (!shift) return { ok: false, error: "Shift not found." };
    await tx.$queryRaw`SELECT id FROM "Employee" WHERE id = ${shift.employeeId} FOR UPDATE`;
    if (await tx.attendance.count({ where: { shiftId: id } })) return { ok: false, error: "This shift has attendance. Review the attendance record before cancelling it." };
    await tx.shift.update({ where: { id }, data: { status: "CANCELLED" } });
    return { ok: true };
  });
  revalidatePath("/admin/roster", "layout");
  revalidatePath("/brilliance-roster");
  return result;
}

/** Copies every non-cancelled shift from one week to the week starting `toMonday`. */
export async function copyWeek(fromMonday: string, toMonday: string) {
  await requireUser();
  if (!validDate(fromMonday) || !validDate(toMonday) || weekStart(fromMonday) !== fromMonday || weekStart(toMonday) !== toMonday || fromMonday === toMonday) return { ok: false, copied: 0, error: "Choose two different weeks." };
  const offset = Math.round((Date.parse(toMonday) - Date.parse(fromMonday)) / 86400000);
  const copied = await db.$transaction(async (tx) => {
    // Repeated/concurrent copy requests must not duplicate the destination roster.
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(7061, hashtext(${toMonday}))`;
    const src = await tx.shift.findMany({ where: { date: { gte: fromMonday, lte: addDays(fromMonday, 6) }, status: { not: "CANCELLED" }, employee: { active: true } } });
    let count = 0;
    for (const s of src) {
      const date = addDays(s.date, offset);
      const exists = await tx.shift.findFirst({ where: { employeeId: s.employeeId, date, startTime: s.startTime, endTime: s.endTime, siteName: s.siteName, status: { not: "CANCELLED" } } });
      if (exists) continue;
      await tx.shift.create({ data: { employeeId: s.employeeId, costCentreId: s.costCentreId, siteName: s.siteName, siteAddress: s.siteAddress, siteLat: s.siteLat, siteLng: s.siteLng, date, startTime: s.startTime, endTime: s.endTime, notes: s.notes } });
      count++;
    }
    return count;
  }, { timeout: 15000 });
  revalidatePath("/admin/roster", "layout");
  return { ok: true, copied };
}

// ─── Attendance ──────────────────────────────────────────────────────
export async function setAttendanceStatus(ids: number[], status: AttendanceStatus) {
  const user = await requireUser();
  if (!["PENDING", "APPROVED", "DECLINED"].includes(status) || !Array.isArray(ids) || ids.length > 1000 || ids.some((id) => !Number.isSafeInteger(id) || id < 1)) return { ok: false };
  await db.attendance.updateMany({ where: { id: { in: ids }, ...(status === "APPROVED" ? { signInAt: { not: null }, signOutAt: { not: null } } : {}) }, data: { status, ...(status !== "APPROVED" ? { paid: false } : {}), editedBy: user.name } });
  revalidatePath("/admin/roster/attendance");
  return { ok: true };
}

export async function setAttendancePaid(id: number, paid: boolean) {
  const user = await requireUser();
  if (typeof paid !== "boolean") return { ok: false };
  await db.attendance.updateMany({ where: { id, ...(paid ? { status: "APPROVED", signInAt: { not: null }, signOutAt: { not: null } } : {}) }, data: { paid, editedBy: user.name } });
  revalidatePath("/admin/roster/attendance");
  return { ok: true };
}

export type AttendanceInput = { id?: number; employeeId: number; shiftId?: number | null; date: string; signIn: string; signOutDate?: string; signOut?: string; notes?: string };

export async function saveAttendance(input: AttendanceInput): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = z.object({
    id: z.number().int().positive().optional(), employeeId: z.number().int().positive(), shiftId: z.number().int().positive().nullable().optional(),
    date: z.string().refine(validDate), signIn: z.string().refine(validTime), signOutDate: z.string().optional(), signOut: z.string().optional(), notes: z.string().max(4000).optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the employee and sign-in date/time." };
  input = parsed.data;
  let signInAt: Date;
  let signOutAt: Date | null = null;
  try {
    signInAt = fromSydney(input.date, input.signIn);
    if (input.signOut) {
      const date = input.signOutDate || (input.signOut <= input.signIn ? addDays(input.date, 1) : input.date);
      signOutAt = fromSydney(date, input.signOut);
      if (signOutAt <= signInAt) return { ok: false, error: "Sign-out must be after sign-in. Check the sign-out date." };
    }
  } catch { return { ok: false, error: "Check the dates and times. Times skipped by Sydney daylight saving cannot be used." }; }
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Employee" WHERE id = ${input.employeeId} FOR UPDATE`;
    const employee = await tx.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee) return { ok: false, error: "Employee not found." };
    if (input.shiftId) {
      const shift = await tx.shift.findFirst({ where: { id: input.shiftId, employeeId: input.employeeId, status: { not: "CANCELLED" } } });
      if (!shift) return { ok: false, error: "The shift must belong to this employee and must not be cancelled." };
    }
    if (!signOutAt && await tx.attendance.findFirst({ where: { employeeId: input.employeeId, signOutAt: null, ...(input.id ? { id: { not: input.id } } : {}) } })) return { ok: false, error: "This employee already has an open attendance record." };
    const old = input.id ? await tx.attendance.findUnique({ where: { id: input.id } }) : null;
    if (input.id && (!old || old.employeeId !== input.employeeId)) return { ok: false, error: "The attendance record does not belong to this employee." };
    const data = { employeeId: input.employeeId, shiftId: input.shiftId || null, signInAt, signOutAt, notes: input.notes?.trim() || null, manual: true, editedBy: user.name, status: "PENDING" as const, paid: false };
    if (input.id) await tx.attendance.update({ where: { id: input.id }, data });
    else await tx.attendance.create({ data });
    if (old?.shiftId && old.shiftId !== input.shiftId) {
      const remaining = await tx.attendance.count({ where: { shiftId: old.shiftId, signOutAt: { not: null } } });
      if (!remaining) await tx.shift.updateMany({ where: { id: old.shiftId, status: "COMPLETED" }, data: { status: "SCHEDULED" } });
    }
    if (input.shiftId) await tx.shift.update({ where: { id: input.shiftId }, data: { status: signOutAt ? "COMPLETED" : "SCHEDULED" } });
    return { ok: true };
  });
  revalidatePath("/admin/roster", "layout");
  revalidatePath("/brilliance-roster");
  return result;
}

export async function deleteAttendance(id: number) {
  await requireAdmin();
  await db.$transaction(async (tx) => {
    const old = await tx.attendance.findUniqueOrThrow({ where: { id } });
    await tx.$queryRaw`SELECT id FROM "Employee" WHERE id = ${old.employeeId} FOR UPDATE`;
    await tx.attendance.delete({ where: { id } });
    if (old.shiftId && !(await tx.attendance.count({ where: { shiftId: old.shiftId, signOutAt: { not: null } } }))) {
      await tx.shift.updateMany({ where: { id: old.shiftId, status: "COMPLETED" }, data: { status: "SCHEDULED" } });
    }
  });
  revalidatePath("/admin/roster", "layout");
  return { ok: true };
}
