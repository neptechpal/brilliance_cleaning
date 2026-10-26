import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

// Separate session for roster staff (the /brilliance-roster portal) — never grants admin access.
export const STAFF_COOKIE = "bc_staff";
const MAX_AGE = 60 * 60 * 24 * 30;

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET missing or too short");
  return new TextEncoder().encode(`staff:${s}`);
}

export async function setStaffSession(employeeId: number) {
  const token = await new SignJWT({ eid: employeeId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(key());
  (await cookies()).set(STAFF_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearStaffSession() {
  (await cookies()).delete(STAFF_COOKIE);
}

export async function getEmployee() {
  const token = (await cookies()).get(STAFF_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const emp = await db.employee.findUnique({ where: { id: Number(payload.eid) }, include: { costCentre: true } });
    return emp?.active ? emp : null;
  } catch {
    return null;
  }
}
