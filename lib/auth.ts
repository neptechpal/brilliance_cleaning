import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { MAX_AGE, SESSION_COOKIE, signSession, verifySession, type Session } from "./jwt";

export { SESSION_COOKIE, type Session };

export async function setSessionCookie(s: Session) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(s), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  // make sure the account still exists and is active
  const u = await db.user.findUnique({ where: { id: s.uid }, select: { active: true, role: true } });
  if (!u?.active) return null;
  return { ...s, role: u.role };
}

export async function requireUser(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  return s;
}

export async function requireAdmin(): Promise<Session> {
  const s = await requireUser();
  if (s.role !== "ADMIN") redirect("/admin?denied=1");
  return s;
}
