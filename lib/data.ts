import { cacheLife, cacheTag } from "next/cache";
import type { Area, Post, Service, ServiceArea } from "@prisma/client";
import { db } from "./db";

export type QA = { q: string; a: string };
export type Inclusion = { area: string; items: string[] };
export type Step = { title: string; text: string };

export type ServiceT = Omit<Service, "inclusions" | "process" | "faqs"> & {
  inclusions: Inclusion[];
  process: Step[];
  faqs: QA[];
};
export type AreaT = Omit<Area, "faqs"> & { faqs: QA[] };
export type PostT = Omit<Post, "faqs"> & { faqs: QA[] };
export type { ServiceArea };

// Cache tags — admin mutations call updateTag() with these.
export const TAGS = {
  services: "services",
  areas: "areas",
  serviceAreas: "service-areas",
  posts: "posts",
  faqs: "faqs",
  reviews: "reviews",
  pageSeo: "page-seo",
  settings: "settings",
} as const;

function asService(s: Service): ServiceT {
  return { ...s, inclusions: (s.inclusions as Inclusion[]) ?? [], process: (s.process as Step[]) ?? [], faqs: (s.faqs as QA[]) ?? [] };
}

export async function getServices(): Promise<ServiceT[]> {
  "use cache";
  cacheTag(TAGS.services);
  cacheLife("days");
  const rows = await db.service.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return rows.map(asService);
}

export async function getService(slug: string): Promise<ServiceT | null> {
  "use cache";
  cacheTag(TAGS.services);
  cacheLife("days");
  const s = await db.service.findFirst({ where: { slug, active: true } });
  return s ? asService(s) : null;
}

export async function getAreas(): Promise<AreaT[]> {
  "use cache";
  cacheTag(TAGS.areas);
  cacheLife("days");
  const rows = await db.area.findMany({ where: { active: true }, orderBy: [{ isHub: "desc" }, { sortOrder: "asc" }, { name: "asc" }] });
  return rows.map((a) => ({ ...a, faqs: (a.faqs as QA[]) ?? [] }));
}

export async function getArea(slug: string): Promise<AreaT | null> {
  "use cache";
  cacheTag(TAGS.areas);
  cacheLife("days");
  const a = await db.area.findFirst({ where: { slug, active: true } });
  return a ? { ...a, faqs: (a.faqs as QA[]) ?? [] } : null;
}

export async function getServiceAreas(): Promise<ServiceArea[]> {
  "use cache";
  cacheTag(TAGS.serviceAreas);
  cacheLife("days");
  return db.serviceArea.findMany({ where: { active: true }, orderBy: [{ serviceSlug: "asc" }, { areaSlug: "asc" }] });
}

export async function getServiceArea(service: string, area: string): Promise<ServiceArea | null> {
  "use cache";
  cacheTag(TAGS.serviceAreas);
  cacheLife("days");
  return db.serviceArea.findFirst({ where: { serviceSlug: service, areaSlug: area, active: true } });
}

export async function getPosts(limit?: number): Promise<PostT[]> {
  "use cache";
  cacheTag(TAGS.posts);
  cacheLife("hours");
  const rows = await db.post.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
  return rows.map((p) => ({ ...p, faqs: (p.faqs as QA[]) ?? [] }));
}

export async function getPost(slug: string): Promise<PostT | null> {
  "use cache";
  cacheTag(TAGS.posts);
  cacheLife("hours");
  const p = await db.post.findFirst({ where: { slug, status: "PUBLISHED" } });
  return p ? { ...p, faqs: (p.faqs as QA[]) ?? [] } : null;
}

export async function getFaqs() {
  "use cache";
  cacheTag(TAGS.faqs);
  cacheLife("days");
  return db.faq.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
}

export async function getReviews() {
  "use cache";
  cacheTag(TAGS.reviews);
  cacheLife("days");
  return db.review.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { reviewDate: "desc" }] });
}

export async function getPageSeo(path: string) {
  "use cache";
  cacheTag(TAGS.pageSeo);
  cacheLife("days");
  return db.pageSeo.findUnique({ where: { path } });
}
