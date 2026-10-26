"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clearStaffSession, getEmployee, setStaffSession } from "@/lib/staff-session";
import { clientIp, hashIp, rateLimited } from "@/lib/request";
import { distanceMeters } from "@/lib/geo";

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
  if (pw.length < 8) return { error: "Use at least 8 characters." };
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
    accuracy: ok(l.accuracy) ? Math.round(l.accuracy!) : null,
    address: typeof l.address === "string" ? l.address.slice(0, 400) : null,
  };
}

export async function signIn(input: Loc & { shiftId?: number | null }): Promise<{ ok: boolean; error?: string }> {
  const emp = await getEmployee();
  if (!emp) return { ok: false, error: "Your session has expired. Please log in again." };
  const open = await db.attendance.findFirst({ where: { employeeId: emp.id, signOutAt: null } });
  if (open) return { ok: false, error: "You are already signed in." };

  const shift = input.shiftId ? await db.shift.findFirst({ where: { id: input.shiftId, employeeId: emp.id, status: "SCHEDULED" }, include: { costCentre: true } }) : null;
  if (input.shiftId && !shift) return { ok: false, error: "That shift isn't available any more — refresh the page." };
  const site = shift
    ? { lat: shift.siteLat ?? shift.costCentre?.lat ?? null, lng: shift.siteLng ?? shift.costCentre?.lng ?? null, radius: shift.costCentre?.geofenceRadius ?? emp.costCentre?.geofenceRadius ?? 0 }
    : { lat: emp.costCentre?.lat ?? null, lng: emp.costCentre?.lng ?? null, radius: emp.costCentre?.geofenceRadius ?? 0 };

  const loc = clean(input);
  let distance: number | null = null;
  if (loc.lat != null && loc.lng != null && site.lat != null && site.lng != null) distance = distanceMeters(loc.lat, loc.lng, site.lat, site.lng);
  if (site.radius > 0 && site.lat != null) {
    if (distance == null) return { ok: false, error: "Location is required to sign in at this site. Please allow location access." };
    // allow for GPS accuracy (capped) so a weak signal doesn't lock people out at the gate
    const slack = Math.min(loc.accuracy ?? 0, 150);
    if (distance > site.radius + slack) return { ok: false, error: `You're about ${distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`} from the site. You need to be within ${site.radius} m to sign in.` };
  }

  await db.attendance.create({
    data: { employeeId: emp.id, shiftId: shift?.id ?? null, signInAt: new Date(), signInLat: loc.lat, signInLng: loc.lng, signInAccuracy: loc.accuracy, signInAddress: loc.address, signInDistance: distance },
  });
  revalidatePath("/brilliance-roster");
  return { ok: true };
}

export async function signOut(input: Loc & { attendanceId: number; notes?: string }): Promise<{ ok: boolean; error?: string }> {
  const emp = await getEmployee();
  if (!emp) return { ok: false, error: "Your session has expired. Please log in again." };
  const att = await db.attendance.findFirst({ where: { id: input.attendanceId, employeeId: emp.id, signOutAt: null }, include: { shift: { include: { costCentre: true } } } });
  if (!att) return { ok: false, error: "No open shift found — refresh the page." };
  const loc = clean(input);
  const sLat = att.shift?.siteLat ?? att.shift?.costCentre?.lat ?? emp.costCentre?.lat;
  const sLng = att.shift?.siteLng ?? att.shift?.costCentre?.lng ?? emp.costCentre?.lng;
  const distance = loc.lat != null && loc.lng != null && sLat != null && sLng != null ? distanceMeters(loc.lat, loc.lng, sLat, sLng) : null;
  await db.attendance.update({
    where: { id: att.id },
    data: {
      signOutAt: new Date(),
      signOutLat: loc.lat,
      signOutLng: loc.lng,
      signOutAccuracy: loc.accuracy,
      signOutAddress: loc.address,
      signOutDistance: distance,
      ...(input.notes !== undefined ? { notes: input.notes.slice(0, 2000) || null } : {}),
    },
  });
  if (att.shiftId) await db.shift.update({ where: { id: att.shiftId }, data: { status: "COMPLETED" } });
  revalidatePath("/brilliance-roster");
  return { ok: true };
}

export async function saveNotes(attendanceId: number, notes: string) {
  const emp = await getEmployee();
  if (!emp) return { ok: false };
  await db.attendance.updateMany({ where: { id: attendanceId, employeeId: emp.id }, data: { notes: notes.slice(0, 2000) || null } });
  return { ok: true };
}
