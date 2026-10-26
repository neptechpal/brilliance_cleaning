"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clearSession, setSessionCookie } from "@/lib/auth";
import { clientIp, hashIp, rateLimited } from "@/lib/request";

export async function login(_prev: { error?: string } | undefined, fd: FormData) {
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const password = String(fd.get("password") || "");
  const next = String(fd.get("next") || "/admin");
  const ip = hashIp(clientIp(await headers()));
  if (rateLimited(`login:${ip}`, 8, 15 * 60_000)) return { error: "Too many attempts. Try again in 15 minutes." };

  const user = await db.user.findUnique({ where: { email } });
  const ok = user?.active && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok) return { error: "Incorrect email or password." };

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setSessionCookie({ uid: user.id, name: user.name, email: user.email, role: user.role });
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  await clearSession();
  redirect("/admin/login");
}
