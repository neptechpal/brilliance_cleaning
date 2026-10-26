"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { PostStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { TAGS } from "@/lib/data";
import { bool, int, lines, num, slugify, str, text, textToFaqs, textToInclusions, textToSteps } from "@/lib/admin-format";

const back = (path: string, msg = "saved") => redirect(`${path}${path.includes("?") ? "&" : "?"}${msg}=1`);

// ─── Services ────────────────────────────────────────────────────────
export async function saveService(fd: FormData) {
  await requireUser();
  const id = int(fd.get("id"));
  const name = str(fd.get("name")) ?? "Untitled service";
  const data = {
    name,
    slug: slugify(str(fd.get("slug")) || name),
    category: str(fd.get("category")) ?? "residential",
    icon: str(fd.get("icon")),
    active: bool(fd.get("active")),
    featured: bool(fd.get("featured")),
    sortOrder: int(fd.get("sortOrder")) ?? 0,
    priceFrom: int(fd.get("priceFrom")),
    priceNote: str(fd.get("priceNote")),
    metaTitle: str(fd.get("metaTitle")),
    metaDescription: str(fd.get("metaDescription")),
    h1: str(fd.get("h1")),
    heroIntro: str(fd.get("heroIntro")),
    summary: str(fd.get("summary")),
    body: text(fd.get("body")),
    inclusions: textToInclusions(text(fd.get("inclusions"))),
    exclusions: lines(fd.get("exclusions")),
    process: textToSteps(text(fd.get("process"))),
    idealFor: lines(fd.get("idealFor")),
    faqs: textToFaqs(text(fd.get("faqs"))),
    keywords: lines(fd.get("keywords")),
    related: lines(fd.get("related")).map(slugify),
  };
  const row = id ? await db.service.update({ where: { id }, data }) : await db.service.create({ data });
  updateTag(TAGS.services);
  back(`/admin/services/${row.id}`);
}

export async function deleteService(fd: FormData) {
  await requireAdmin();
  await db.service.delete({ where: { id: Number(fd.get("id")) } });
  updateTag(TAGS.services);
  redirect("/admin/services?deleted=1");
}

// ─── Areas ───────────────────────────────────────────────────────────
export async function saveArea(fd: FormData) {
  await requireUser();
  const id = int(fd.get("id"));
  const name = str(fd.get("name")) ?? "Untitled area";
  const slug = slugify(str(fd.get("slug")) || name);
  const isHub = bool(fd.get("isHub"));
  const data = {
    name,
    slug,
    isHub,
    region: isHub ? slug : slugify(str(fd.get("region")) ?? "newcastle"),
    postcode: str(fd.get("postcode")),
    lat: num(fd.get("lat")),
    lng: num(fd.get("lng")),
    active: bool(fd.get("active")),
    indexable: bool(fd.get("indexable")),
    sortOrder: int(fd.get("sortOrder")) ?? 0,
    metaTitle: str(fd.get("metaTitle")),
    metaDescription: str(fd.get("metaDescription")),
    h1: str(fd.get("h1")),
    intro: text(fd.get("intro")),
    localContent: text(fd.get("localContent")),
    landmarks: lines(fd.get("landmarks")),
    nearby: lines(fd.get("nearby")).map(slugify),
    topServices: lines(fd.get("topServices")).map(slugify),
    faqs: textToFaqs(text(fd.get("faqs"))),
  };
  const row = id ? await db.area.update({ where: { id }, data }) : await db.area.create({ data });
  updateTag(TAGS.areas);
  back(`/admin/areas/${row.id}`);
}

export async function deleteArea(fd: FormData) {
  await requireAdmin();
  await db.area.delete({ where: { id: Number(fd.get("id")) } });
  updateTag(TAGS.areas);
  redirect("/admin/areas?deleted=1");
}

// ─── Service × area landing pages ────────────────────────────────────
export async function saveServiceArea(fd: FormData) {
  await requireUser();
  const id = int(fd.get("id"));
  const data = {
    serviceSlug: slugify(text(fd.get("serviceSlug"))),
    areaSlug: slugify(text(fd.get("areaSlug"))),
    metaTitle: str(fd.get("metaTitle")),
    metaDescription: str(fd.get("metaDescription")),
    h1: str(fd.get("h1")),
    intro: text(fd.get("intro")),
    localTips: lines(fd.get("localTips")),
    active: bool(fd.get("active")),
    indexable: bool(fd.get("indexable")),
  };
  const dupe = await db.serviceArea.findUnique({ where: { serviceSlug_areaSlug: { serviceSlug: data.serviceSlug, areaSlug: data.areaSlug } } });
  if (dupe && dupe.id !== id) redirect(`/admin/service-areas/${dupe.id}?exists=1`);
  const row = id ? await db.serviceArea.update({ where: { id }, data }) : await db.serviceArea.create({ data });
  updateTag(TAGS.serviceAreas);
  back(`/admin/service-areas/${row.id}`);
}

export async function deleteServiceArea(fd: FormData) {
  await requireAdmin();
  await db.serviceArea.delete({ where: { id: Number(fd.get("id")) } });
  updateTag(TAGS.serviceAreas);
  redirect("/admin/service-areas?deleted=1");
}

// ─── Blog posts ──────────────────────────────────────────────────────
export async function savePost(fd: FormData) {
  const user = await requireUser();
  const id = int(fd.get("id"));
  const title = str(fd.get("title")) ?? "Untitled post";
  const status = (fd.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT") as PostStatus;
  const publishedAtRaw = str(fd.get("publishedAt"));
  const body = text(fd.get("body"));
  const data = {
    title,
    slug: slugify(str(fd.get("slug")) || title),
    status,
    publishedAt: publishedAtRaw ? new Date(`${publishedAtRaw}T09:00:00+10:00`) : status === "PUBLISHED" ? new Date() : null,
    metaTitle: str(fd.get("metaTitle")),
    metaDescription: str(fd.get("metaDescription")),
    excerpt: str(fd.get("excerpt")),
    category: str(fd.get("category")) ?? "Guides",
    tags: lines(fd.get("tags")),
    readMinutes: Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 220)),
    body,
    faqs: textToFaqs(text(fd.get("faqs"))),
    relatedServices: lines(fd.get("relatedServices")).map(slugify),
    authorName: str(fd.get("authorName")) ?? user.name,
  };
  const row = id ? await db.post.update({ where: { id }, data }) : await db.post.create({ data });
  updateTag(TAGS.posts);
  back(`/admin/posts/${row.id}`);
}

export async function deletePost(fd: FormData) {
  await requireAdmin();
  await db.post.delete({ where: { id: Number(fd.get("id")) } });
  updateTag(TAGS.posts);
  redirect("/admin/posts?deleted=1");
}

// ─── FAQs ────────────────────────────────────────────────────────────
export async function saveFaq(fd: FormData) {
  await requireUser();
  const id = int(fd.get("id"));
  const data = {
    q: str(fd.get("q")) ?? "",
    a: str(fd.get("a")) ?? "",
    category: str(fd.get("category")) ?? "General",
    sortOrder: int(fd.get("sortOrder")) ?? 0,
    active: bool(fd.get("active")),
  };
  if (!data.q || !data.a) return;
  if (id) await db.faq.update({ where: { id }, data });
  else await db.faq.create({ data });
  updateTag(TAGS.faqs);
  back("/admin/faqs");
}

export async function deleteFaq(fd: FormData) {
  await requireUser();
  await db.faq.delete({ where: { id: Number(fd.get("id")) } });
  updateTag(TAGS.faqs);
  back("/admin/faqs", "deleted");
}

// ─── Reviews ─────────────────────────────────────────────────────────
export async function saveReview(fd: FormData) {
  await requireUser();
  const id = int(fd.get("id"));
  const date = str(fd.get("reviewDate"));
  const data = {
    author: str(fd.get("author")) ?? "",
    rating: Math.min(5, Math.max(1, int(fd.get("rating")) ?? 5)),
    text: str(fd.get("text")) ?? "",
    source: str(fd.get("source")) ?? "Google",
    suburb: str(fd.get("suburb")),
    serviceSlug: str(fd.get("serviceSlug")),
    reviewDate: date ? new Date(date) : null,
    active: bool(fd.get("active")),
    sortOrder: int(fd.get("sortOrder")) ?? 0,
  };
  if (!data.author || !data.text) return;
  if (id) await db.review.update({ where: { id }, data });
  else await db.review.create({ data });
  updateTag(TAGS.reviews);
  back("/admin/reviews");
}

export async function deleteReview(fd: FormData) {
  await requireUser();
  await db.review.delete({ where: { id: Number(fd.get("id")) } });
  updateTag(TAGS.reviews);
  back("/admin/reviews", "deleted");
}
