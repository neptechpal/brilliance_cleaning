"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { TAGS } from "@/lib/data";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { bool, int, num, str } from "@/lib/admin-format";

const normPath = (p: string) => {
  let s = p.trim();
  try {
    if (/^https?:\/\//.test(s)) s = new URL(s).pathname;
  } catch {}
  if (!s.startsWith("/")) s = `/${s}`;
  return s.length > 1 ? s.replace(/\/+$/, "") : s;
};

// ─── Page meta overrides ─────────────────────────────────────────────
export async function savePageSeo(fd: FormData) {
  await requireUser();
  const path = normPath(String(fd.get("path") ?? "/"));
  const data = { metaTitle: str(fd.get("metaTitle")), metaDescription: str(fd.get("metaDescription")), noindex: bool(fd.get("noindex")) };
  await db.pageSeo.upsert({ where: { path }, create: { path, ...data }, update: data });
  updateTag(TAGS.pageSeo);
  redirect("/admin/seo?saved=1#meta");
}

// ─── Redirects ───────────────────────────────────────────────────────
export async function saveRedirect(fd: FormData) {
  await requireUser();
  const id = int(fd.get("id"));
  const code = [301, 302, 410].includes(Number(fd.get("code"))) ? Number(fd.get("code")) : 301;
  const toRaw = str(fd.get("to"));
  const data = {
    from: normPath(String(fd.get("from") ?? "")).toLowerCase(),
    to: code === 410 ? null : toRaw && (toRaw.startsWith("http") ? toRaw : normPath(toRaw)),
    code,
    note: str(fd.get("note")),
  };
  if (data.from === "/" || (code !== 410 && !data.to)) redirect("/admin/seo/redirects?error=1");
  if (data.from === data.to) redirect("/admin/seo/redirects?error=loop");
  if (id) await db.redirect.update({ where: { id }, data });
  else await db.redirect.upsert({ where: { from: data.from }, create: data, update: data });
  redirect("/admin/seo/redirects?saved=1");
}

export async function deleteRedirect(fd: FormData) {
  await requireUser();
  await db.redirect.delete({ where: { id: Number(fd.get("id")) } });
  redirect("/admin/seo/redirects?deleted=1");
}

// ─── Keyword / content plan ──────────────────────────────────────────
export async function saveKeyword(fd: FormData) {
  await requireUser();
  const id = int(fd.get("id"));
  const keyword = str(fd.get("keyword"))?.toLowerCase();
  if (!keyword) return;
  const data = {
    keyword,
    intent: str(fd.get("intent")) ?? "commercial",
    cluster: str(fd.get("cluster")),
    volume: int(fd.get("volume")),
    difficulty: int(fd.get("difficulty")),
    targetUrl: str(fd.get("targetUrl")),
    status: str(fd.get("status")) ?? "IDEA",
    priority: int(fd.get("priority")) ?? 2,
    position: num(fd.get("position")),
    notes: str(fd.get("notes")),
  };
  if (id) await db.keyword.update({ where: { id }, data });
  else await db.keyword.upsert({ where: { keyword }, create: data, update: data });
  const back = String(fd.get("back") || "/admin/seo/keywords");
  redirect(`${back}${back.includes("?") ? "&" : "?"}saved=1`);
}

export async function deleteKeyword(fd: FormData) {
  await requireUser();
  await db.keyword.delete({ where: { id: Number(fd.get("id")) } });
  redirect("/admin/seo/keywords?deleted=1");
}

// ─── Settings ────────────────────────────────────────────────────────
export async function saveSettings(fd: FormData) {
  await requireAdmin();
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (!fd.has(key) && typeof def !== "boolean") continue;
    const value = typeof def === "boolean" ? bool(fd.get(key)) : String(fd.get(key) ?? "").trim();
    await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  updateTag(TAGS.settings);
  redirect("/admin/settings?saved=1");
}

// ─── Users ───────────────────────────────────────────────────────────
export async function saveUser(fd: FormData) {
  const me = await requireAdmin();
  const id = int(fd.get("id"));
  const email = str(fd.get("email"))?.toLowerCase();
  const name = str(fd.get("name"));
  const password = String(fd.get("password") ?? "");
  const role = (fd.get("role") === "ADMIN" ? "ADMIN" : "STAFF") as Role;
  const active = bool(fd.get("active"));
  if (!email || !name) redirect("/admin/users?error=missing");
  if (password && password.length < 10) redirect("/admin/users?error=short");
  if (id === me.uid && (!active || role !== "ADMIN")) redirect("/admin/users?error=self");
  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
  if (id) {
    await db.user.update({ where: { id }, data: { email, name, role, active, ...(passwordHash ? { passwordHash } : {}) } });
  } else {
    if (!passwordHash) redirect("/admin/users?error=short");
    await db.user.create({ data: { email, name, role, active: true, passwordHash } });
  }
  redirect("/admin/users?saved=1");
}
