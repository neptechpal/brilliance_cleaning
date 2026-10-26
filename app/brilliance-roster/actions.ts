"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clearStaffSession, getEmployee, setStaffSession } from "@/lib/staff-session";
import { clientIp, hashIp, rateLimited } from "@/lib/request";
import { checkGeofence } from "@/lib/geo";

import { addDays, sydneyDate, sydneyTime } from "@/lib/sydney";

export async function portalLogin(_prev: { error?: string } | undefined, fd: FormData) {
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const password = String(fd.get("password") || "");
  const ip = hashIp(clientIp(await headers()));
  if (rateLimited(`portal-login:${ip}`, 10, 15 * 60_000)) return { error: "Too many attempts. Please wait 15 minutes or call the office." };
  const emp = await db.employee.findUnique({ where: { email } });
  const ok = emp?.active && emp.passwordHash && (await bcrypt.compare(password, emp.passwordHash));
  if (!emp || !ok) return { error: "Incorrect email or password." };
  await db.employee.update({ where: { id: emp.id }, data: { lastLoginAt: new Date() } });
  await setStaffSession(emp.id);
  revalidatePath("/brilliance-roster");
  return {};
}

export async function portalLogout() {
  await clearStaffSession();
  revalidatePath("/brilliance-roster");
}

export async function setOwnPassword(_prev: { error?: string; ok?: boolean } | undefined, fd: FormData) {
  const emp = await getEmployee();
  if (!emp) return { error: "Please log in again." };
  const pw = String(fd.get("password") || "");
  if (pw.length < 8 || Buffer.byteLength(pw, "utf8") > 72) return { error: "Use at least 8 characters and at most 72 UTF-8 bytes." };
  if (pw !== String(fd.get("confirm") || "")) return { error: "The passwords don't match." };
  await db.employee.update({ where: { id: emp.id }, data: { passwordHash: await bcrypt.hash(pw, 12), mustSetPassword: false } });
  revalidatePath("/brilliance-roster");
  return { ok: true };
}

type Loc = { lat?: number | null; lng?: number | null; accuracy?: number | null; address?: string | null };

function clean(l: Loc) {
  const ok = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  return {
    lat: ok(l.lat) && Math.abs(l.lat!) <= 90 ? l.lat! : null,
    lng: ok(l.lng) && Math.abs(l.lng!) <= 180 ? l.lng! : null,
    accuracy: ok(l.accuracy) && l.accuracy! >= 0 ? Math.min(Math.round(l.accuracy!), 100000) : null,
    address: typeof l.address === "string" ? l.address.slice(0, 400) : null,
  };
}

export async function signIn(input: Loc & { shiftId?: number | null }): Promise<{ ok: boolean; error?: string }> {
  const emp = await getEmployee();
  if (!emp) return { ok: false, error: "Your session has expired. Please log in again." };
  if (emp.mustSetPassword) return { ok: false, error: "Set your password before signing in." };
  const result = await db.$transaction(async (tx) => {
    // Serialise attendance mutations for this employee, including duplicate taps.
    await tx.$queryRaw`SELECT id FROM "Employee" WHERE id = ${emp.id} FOR UPDATE`;
    const open = await tx.attendance.findFirst({ where: { employeeId: emp.id, signOutAt: null } });
    if (open) return { ok: false, error: "You are already signed in." };
    const shift = input.shiftId ? await tx.shift.findFirst({ where: { id: input.shiftId, employeeId: emp.id, status: "SCHEDULED" }, include: { costCentre: true } }) : null;
    if (input.shiftId && !shift) return { ok: false, error: "That shift isn't available any more — refresh the page." };
    const today = sydneyDate();
    if (shift && shift.date !== today && !(shift.date === addDays(today, -1) && shift.endTime <= shift.startTime && sydneyTime() < shift.endTime)) {
      return { ok: false, error: "You can only sign in for today's shift or an overnight shift still in progress." };
    }
    if (!shift && !emp.costCentre) return { ok: false, error: "No site is assigned. Please contact the office." };
    if ((shift?.costCentre && !shift.costCentre.active) || (!shift && emp.costCentre && !emp.costCentre.active)) return { ok: false, error: "This site is inactive. Please contact the office." };
    const site = shift
      ? { lat: shift.costCentre?.lat ?? shift.siteLat, lng: shift.costCentre?.lng ?? shift.siteLng, radius: shift.costCentre?.geofenceRadius ?? 200 }
      : { lat: emp.costCentre!.lat, lng: emp.costCentre!.lng, radius: emp.costCentre!.geofenceRadius };
    const loc = clean(input);
    const { distance, error } = checkGeofence(site, loc);
    if (error) return { ok: false, error };
    await tx.attendance.create({
      data: { employeeId: emp.id, shiftId: shift?.id ?? null, signInAt: new Date(), signInLat: loc.lat, signInLng: loc.lng, signInAccuracy: loc.accuracy, signInAddress: loc.address, signInDistance: distance },
    });
    return { ok: true };
  });
  revalidatePath("/brilliance-roster");
  return result;
}

export async function signOut(input: Loc & { attendanceId: number; notes?: string }): Promise<{ ok: boolean; error?: string }> {
  const emp = await getEmployee();
  if (!emp) return { ok: false, error: "Your session has expired. Please log in again." };
  if (emp.mustSetPassword) return { ok: false, error: "Set your password before signing out." };
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Employee" WHERE id = ${emp.id} FOR UPDATE`;
    const att = await tx.attendance.findFirst({ where: { id: input.attendanceId, employeeId: emp.id, signOutAt: null }, include: { shift: { include: { costCentre: true } } } });
    if (!att) return { ok: false, error: "No open shift found — refresh the page." };
    const loc = clean(input);
    const site = att.shift
      ? { lat: att.shift.costCentre?.lat ?? att.shift.siteLat, lng: att.shift.costCentre?.lng ?? att.shift.siteLng, radius: att.shift.costCentre?.geofenceRadius ?? 200 }
      : { lat: emp.costCentre?.lat ?? null, lng: emp.costCentre?.lng ?? null, radius: emp.costCentre?.geofenceRadius ?? 200 };
    const { distance, error } = checkGeofence(site, loc);
    if (error) return { ok: false, error };
    await tx.attendance.update({
      where: { id: att.id },
      data: {
        signOutAt: new Date(), signOutLat: loc.lat, signOutLng: loc.lng, signOutAccuracy: loc.accuracy,
        signOutAddress: loc.address, signOutDistance: distance,
        ...(typeof input.notes === "string" ? { notes: input.notes.slice(0, 2000) || null } : {}),
      },
    });
    if (att.shiftId) await tx.shift.updateMany({ where: { id: att.shiftId, status: "SCHEDULED" }, data: { status: "COMPLETED" } });
    return { ok: true };
  });
  revalidatePath("/brilliance-roster");
  return result;
}

export async function saveNotes(attendanceId: number, notes: string) {
  const emp = await getEmployee();
  if (!emp || emp.mustSetPassword || typeof notes !== "string") return { ok: false };
  await db.attendance.updateMany({ where: { id: attendanceId, employeeId: emp.id }, data: { notes: notes.slice(0, 2000) || null } });
  return { ok: true };
}
