/**
 * Property staging was dropped as a service (Nov 2026) and the brand is now "Brilliance Cleaning Services".
 * This brings an EXISTING database in line with content/*.json without a full `seed --force`:
 *
 *   npx tsx scripts/remove-staging.ts             # apply
 *   npx tsx scripts/remove-staging.ts --dry-run   # only report what would change
 *
 * Idempotent: a second run reports 0 changes. Only fields that still mention property staging are overwritten from the
 * JSON, so admin edits elsewhere are kept. What it does:
 *  - services / areas / service×area pages / posts: staging-mentioning fields → new copy from content/*.json
 *  - the 5 property-staging region pages become pre-sale-cleaning region pages; the property-staging service is deleted
 *  - the staging blog post becomes the pre-sale cleaning checklist post (new slug)
 *  - FAQs, settings (business name), page SEO overrides, content-strategy keywords
 *  - 301 redirects from every old staging URL
 * Run it BEFORE `next build` (or restart the app after) — public pages cache their data.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";

const db = new PrismaClient();
const DRY = process.argv.includes("--dry-run");
const dir = join(__dirname, "..", "content");

const OLD_SERVICE = "property-staging";
const NEW_SERVICE = "pre-sale-cleaning";
const OLD_POST = "does-property-staging-help-sell-newcastle";
const NEW_POST = "pre-sale-cleaning-checklist-newcastle";
const OLD_BRAND = /Brilliance Cleaning (&|&amp;|and) Property Staging/gi;
const NEW_BRAND = "Brilliance Cleaning Services";
// "stages" / "staged visits" in builders-clean copy are fine; only the staging service is matched
const STAGING = /\bstag(ing|er|ers)\b|property-staging|\bstage (it|the home|the property|a home)\b/i;

let changes = 0;
const warnings: string[] = [];
const log = (msg: string) => {
  changes++;
  console.log(`  ${DRY ? "[dry] " : ""}${msg}`);
};
const run = async (fn: () => Promise<unknown>) => {
  if (!DRY) await fn();
};
const str = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v ?? null));
const mentions = (v: unknown) => STAGING.test(str(v));

function load<T>(file: string): T[] {
  const p = join(dir, file);
  if (!existsSync(p)) throw new Error(`${file} not found`);
  return JSON.parse(readFileSync(p, "utf8")) as T[];
}

type Json = Prisma.InputJsonValue;
type Row = Record<string, unknown>;

/**
 * Fields of `current` that still mention staging, replaced by the value in `source` (when that is clean), else by
 * `fallback(field)` (e.g. a slug list with the dead slug swapped). Anything left is reported for a manual edit.
 */
function staleFields(label: string, current: Row, source: Row | undefined, fields: string[], fallback?: (field: string) => unknown) {
  const data: Row = {};
  for (const f of fields) {
    if (!mentions(current[f])) continue;
    const next = source?.[f] !== undefined && !mentions(source[f]) ? source[f] : fallback?.(f);
    if (next !== undefined && !mentions(next)) data[f] = next;
    else warnings.push(`${label}.${f} mentions staging but has no clean replacement — edit it in the admin`);
  }
  return data;
}

/** A slug list with the staging service replaced by pre-sale cleaning (deduped). */
const swapSlug = (list: unknown) => (Array.isArray(list) ? [...new Set(list.map((x) => (x === OLD_SERVICE ? NEW_SERVICE : x)))] : undefined);

async function services() {
  console.log("Services");
  const rows = load<Row & { slug: string }>("services.json");
  const fields = ["name", "metaTitle", "metaDescription", "h1", "heroIntro", "summary", "body", "inclusions", "exclusions", "process", "idealFor", "faqs", "keywords", "related"];
  for (const s of await db.service.findMany({ where: { slug: { not: OLD_SERVICE } } })) {
    const src = rows.find((r) => r.slug === s.slug);
    const data = staleFields(`service ${s.slug}`, s as unknown as Row, src, fields, (f) => (f === "related" ? swapSlug(s.related) : undefined));
    if (Object.keys(data).length) {
      log(`service ${s.slug}: ${Object.keys(data).join(", ")}`);
      await run(() => db.service.update({ where: { slug: s.slug }, data: data as Prisma.ServiceUpdateInput }));
    }
  }
}

async function serviceAreas() {
  console.log("Service × region pages");
  const rows = load<{ service: string; area: string; metaTitle?: string; metaDescription?: string; h1?: string; intro?: string; localTips?: string[] }>("service-areas.json");
  const contentOf = (x: (typeof rows)[number]) => ({ metaTitle: x.metaTitle, metaDescription: x.metaDescription, h1: x.h1, intro: x.intro ?? "", localTips: x.localTips ?? [] });

  // property-staging/<hub> → pre-sale-cleaning/<hub> (kept in place, so active/indexable flags survive)
  for (const old of await db.serviceArea.findMany({ where: { serviceSlug: OLD_SERVICE } })) {
    const src = rows.find((r) => r.service === NEW_SERVICE && r.area === old.areaSlug);
    const exists = await db.serviceArea.findUnique({ where: { serviceSlug_areaSlug: { serviceSlug: NEW_SERVICE, areaSlug: old.areaSlug } } });
    if (src && !exists) {
      log(`service-area ${OLD_SERVICE}/${old.areaSlug} → ${NEW_SERVICE}/${old.areaSlug}`);
      await run(() => db.serviceArea.update({ where: { id: old.id }, data: { serviceSlug: NEW_SERVICE, ...contentOf(src) } }));
    } else {
      log(`service-area ${OLD_SERVICE}/${old.areaSlug} deleted`);
      await run(() => db.serviceArea.delete({ where: { id: old.id } }));
    }
  }
  // pre-sale region pages that should exist (e.g. a database that never had the staging pages)
  for (const src of rows.filter((r) => r.service === NEW_SERVICE)) {
    const where = { serviceSlug_areaSlug: { serviceSlug: NEW_SERVICE, areaSlug: src.area } };
    if (DRY && (await db.serviceArea.count({ where: { serviceSlug: OLD_SERVICE, areaSlug: src.area } }))) continue; // converted above
    if (!(await db.serviceArea.findUnique({ where }))) {
      log(`service-area ${NEW_SERVICE}/${src.area} created`);
      await run(() => db.serviceArea.create({ data: { serviceSlug: NEW_SERVICE, areaSlug: src.area, ...contentOf(src) } }));
    }
  }
  // anything else that still mentions staging
  for (const sa of await db.serviceArea.findMany({ where: { serviceSlug: { not: OLD_SERVICE } } })) {
    const src = rows.find((r) => r.service === sa.serviceSlug && r.area === sa.areaSlug);
    const data = staleFields(`service-area ${sa.serviceSlug}/${sa.areaSlug}`, sa as unknown as Row, src as Row | undefined, ["metaTitle", "metaDescription", "h1", "intro", "localTips"]);
    if (Object.keys(data).length) {
      log(`service-area ${sa.serviceSlug}/${sa.areaSlug}: ${Object.keys(data).join(", ")}`);
      await run(() => db.serviceArea.update({ where: { id: sa.id }, data: data as Prisma.ServiceAreaUpdateInput }));
    }
  }

  const svc = await db.service.findUnique({ where: { slug: OLD_SERVICE } });
  if (svc) {
    log(`service ${OLD_SERVICE} deleted`);
    await run(() => db.service.delete({ where: { slug: OLD_SERVICE } }));
  }
  const reviews = await db.review.count({ where: { serviceSlug: OLD_SERVICE } });
  if (reviews) warnings.push(`${reviews} review(s) are tagged ${OLD_SERVICE} — left as they are; reassign or hide them in Admin → Reviews`);
}

async function areas() {
  console.log("Areas");
  const rows = [...load<Row & { slug: string }>("areas-newcastle.json"), ...load<Row & { slug: string }>("areas-hunter.json")];
  const fields = ["metaTitle", "metaDescription", "h1", "intro", "localContent", "landmarks", "nearby", "topServices", "faqs"];
  for (const a of await db.area.findMany()) {
    const src = rows.find((r) => r.slug === a.slug);
    const data = staleFields(`area ${a.slug}`, a as unknown as Row, src, fields, (f) => (f === "topServices" ? swapSlug(a.topServices) : undefined));
    if (Object.keys(data).length) {
      log(`area ${a.slug}: ${Object.keys(data).join(", ")}`);
      await run(() => db.area.update({ where: { id: a.id }, data: data as Prisma.AreaUpdateInput }));
    }
  }
}

type PostIn = {
  slug: string; title: string; metaTitle?: string; metaDescription?: string; excerpt?: string; category?: string; tags?: string[];
  readMinutes?: number; body?: string; faqs?: Json; relatedServices?: string[]; publishedAt?: string;
};

async function posts() {
  console.log("Posts");
  const rows = load<PostIn>("posts.json");
  const src = rows.find((p) => p.slug === NEW_POST);
  if (!src) throw new Error(`${NEW_POST} missing from posts.json`);
  const old = await db.post.findUnique({ where: { slug: OLD_POST } });
  if (old) {
    if (await db.post.findUnique({ where: { slug: NEW_POST } })) {
      log(`post ${OLD_POST} deleted (${NEW_POST} already exists)`);
      await run(() => db.post.delete({ where: { id: old.id } }));
    } else {
      log(`post ${OLD_POST} → ${NEW_POST}`);
      await run(() =>
        db.post.update({
          where: { id: old.id },
          data: {
            slug: src.slug, title: src.title, metaTitle: src.metaTitle, metaDescription: src.metaDescription, excerpt: src.excerpt,
            category: src.category ?? "Guides", tags: src.tags ?? [], readMinutes: src.readMinutes ?? 5, body: src.body ?? "",
            faqs: src.faqs ?? [], relatedServices: src.relatedServices ?? [],
            publishedAt: src.publishedAt ? new Date(`${src.publishedAt}T09:00:00+11:00`) : old.publishedAt,
          },
        }),
      );
    }
  }
  const fields = ["title", "metaTitle", "metaDescription", "excerpt", "tags", "body", "faqs", "relatedServices"];
  for (const p of await db.post.findMany({ where: { slug: { not: OLD_POST } } })) {
    const s = rows.find((r) => r.slug === p.slug) as Row | undefined;
    const data = staleFields(`post ${p.slug}`, p as unknown as Row, s, fields, (f) => (f === "relatedServices" ? swapSlug(p.relatedServices) : undefined));
    if (p.category === "Property Staging") data.category = (s?.category as string) ?? "Guides";
    if (Object.keys(data).length) {
      log(`post ${p.slug}: ${Object.keys(data).join(", ")}`);
      await run(() => db.post.update({ where: { id: p.id }, data: data as Prisma.PostUpdateInput }));
    }
  }
}

async function faqs() {
  console.log("FAQs");
  const rows = load<{ q: string; a: string }>("faqs.json");
  for (const f of await db.faq.findMany()) {
    if (!mentions(f.q) && !mentions(f.a)) continue;
    const src = rows.find((r) => r.q.trim().toLowerCase() === f.q.trim().toLowerCase());
    if (src && !mentions(src.q) && !mentions(src.a)) {
      log(`faq #${f.id} "${f.q}"`);
      await run(() => db.faq.update({ where: { id: f.id }, data: { q: src.q, a: src.a } }));
    } else warnings.push(`faq #${f.id} "${f.q}" mentions staging — edit or deactivate it in Admin → FAQs`);
  }
}

async function settings() {
  console.log("Settings");
  for (const s of await db.setting.findMany()) {
    const text = JSON.stringify(s.value);
    const renamed = text.replace(OLD_BRAND, NEW_BRAND);
    if (renamed === text) continue;
    log(`setting ${s.key}: business name → ${NEW_BRAND}`);
    const value = JSON.parse(renamed) as Json;
    await run(() => db.setting.update({ where: { key: s.key }, data: { value } }));
  }
  for (const s of await db.setting.findMany()) {
    if (mentions(s.value) && !DRY) warnings.push(`setting ${s.key} still mentions staging — check Admin → Settings`);
  }
}

async function pageSeo() {
  console.log("Page SEO overrides");
  for (const p of await db.pageSeo.findMany()) {
    if (p.path.startsWith(`/services/${OLD_SERVICE}`) || p.path === `/blog/${OLD_POST}`) {
      log(`page-seo ${p.path} deleted (page removed)`);
      await run(() => db.pageSeo.delete({ where: { id: p.id } }));
      continue;
    }
    const data: { metaTitle?: string | null; metaDescription?: string | null } = {};
    for (const f of ["metaTitle", "metaDescription"] as const) {
      const v = p[f];
      if (!v || !(mentions(v) || /property staging/i.test(v))) continue;
      const next = v.replace(OLD_BRAND, NEW_BRAND);
      // anything still about staging falls back to the page's built-in (updated) default
      data[f] = mentions(next) ? null : next;
    }
    if (Object.keys(data).length) {
      log(`page-seo ${p.path}: ${Object.entries(data).map(([k, v]) => (v === null ? `${k} reset to default` : k)).join(", ")}`);
      await run(() => db.pageSeo.update({ where: { id: p.id }, data }));
    }
  }
}

async function keywords() {
  console.log("Content-strategy keywords");
  const remap = (url: string | null) =>
    url ? url.replace(`/services/${OLD_SERVICE}`, `/services/${NEW_SERVICE}`).replace(`/blog/${OLD_POST}`, `/blog/${NEW_POST}`) : url;
  for (const k of await db.keyword.findMany()) {
    const about = /staging/i.test(k.keyword);
    const linked = k.cluster === "Property Staging" || (k.targetUrl ?? "").includes(OLD_SERVICE) || (k.targetUrl ?? "").includes(OLD_POST);
    if (about) {
      log(`keyword "${k.keyword}" deleted`);
      await run(() => db.keyword.delete({ where: { id: k.id } }));
    } else if (linked) {
      const targetUrl = k.keyword === "how to prepare house for sale photos" ? `/blog/${NEW_POST}` : remap(k.targetUrl);
      log(`keyword "${k.keyword}" → Pre-Sale Cleaning ${targetUrl ?? ""}`);
      await run(() =>
        db.keyword.update({ where: { id: k.id }, data: { cluster: "Pre-Sale Cleaning", targetUrl, status: targetUrl ? "PUBLISHED" : k.status } }),
      );
    }
  }
  // the new pre-sale region pages and post now answer these
  const hubs: Record<string, string> = { "lake-macquarie": "lake macquarie", maitland: "maitland", "hunter-valley": "cessnock", "port-stephens": "port stephens" };
  const wanted: { keyword: string; intent: string; cluster: string; targetUrl: string; priority: number; notes?: string }[] = [
    ...Object.entries(hubs).map(([hub, name]) => ({
      keyword: `pre sale cleaning ${name}`, intent: "local", cluster: "Pre-Sale Cleaning", targetUrl: `/services/${NEW_SERVICE}/${hub}`, priority: 2,
    })),
    { keyword: "cleaning before selling house newcastle", intent: "local", cluster: "Pre-Sale Cleaning", targetUrl: `/services/${NEW_SERVICE}`, priority: 1 },
    { keyword: "pre-sale cleaning checklist for newcastle sellers", intent: "informational", cluster: "Guides", targetUrl: `/blog/${NEW_POST}`, priority: 2, notes: "Blog post" },
  ];
  for (const w of wanted) {
    const found = await db.keyword.findUnique({ where: { keyword: w.keyword } });
    if (!found) {
      log(`keyword "${w.keyword}" created → ${w.targetUrl}`);
      await run(() => db.keyword.create({ data: { ...w, status: "PUBLISHED" } }));
    } else if (!found.targetUrl) {
      log(`keyword "${w.keyword}" → ${w.targetUrl}`);
      await run(() => db.keyword.update({ where: { id: found.id }, data: { targetUrl: w.targetUrl, status: "PUBLISHED" } }));
    }
  }
}

async function redirects() {
  console.log("Redirects");
  const hubs = ["newcastle", "lake-macquarie", "maitland", "hunter-valley", "port-stephens", "singleton"];
  const preSaleHubs = new Set(
    (await db.serviceArea.findMany({ where: { serviceSlug: { in: DRY ? [NEW_SERVICE, OLD_SERVICE] : [NEW_SERVICE] } }, select: { areaSlug: true } })).map((r) => r.areaSlug),
  );
  const note = "Property staging discontinued (Nov 2026)";
  const rows = [
    { from: "/property-staging", to: `/services/${NEW_SERVICE}` },
    { from: `/services/${OLD_SERVICE}`, to: `/services/${NEW_SERVICE}` },
    ...hubs.map((h) => ({ from: `/services/${OLD_SERVICE}/${h}`, to: preSaleHubs.has(h) ? `/services/${NEW_SERVICE}/${h}` : `/services/${NEW_SERVICE}` })),
    { from: `/blog/${OLD_POST}`, to: `/blog/${NEW_POST}` },
  ];
  for (const r of rows) {
    const found = await db.redirect.findUnique({ where: { from: r.from } });
    if (!found) {
      log(`redirect ${r.from} → ${r.to} (301) created`);
      await run(() => db.redirect.create({ data: { ...r, code: 301, note } }));
    } else if (found.to !== r.to || found.code !== 301) {
      log(`redirect ${r.from}: ${found.to} → ${r.to} (301)`);
      await run(() => db.redirect.update({ where: { id: found.id }, data: { to: r.to, code: 301, note } }));
    }
  }
  // no chains: anything else that pointed at a staging URL goes straight to the new page
  const targets = new Map(rows.map((r) => [r.from, r.to]));
  for (const r of await db.redirect.findMany({ where: { to: { contains: "staging" } } })) {
    const to = r.to ? targets.get(r.to.replace(/\/+$/, "")) : undefined;
    if (to && !targets.has(r.from)) {
      log(`redirect ${r.from}: ${r.to} → ${to}`);
      await run(() => db.redirect.update({ where: { id: r.id }, data: { to } }));
    }
  }
}

async function main() {
  console.log(`Removing property staging${DRY ? " (dry run — nothing is written)" : ""} — ${process.env.DATABASE_URL?.replace(/\/\/[^@]*@/, "//***@")}`);
  await services();
  await serviceAreas();
  await areas();
  await posts();
  await faqs();
  await settings();
  await pageSeo();
  await keywords();
  await redirects();
  console.log(`\n${changes} change(s)${DRY ? " would be made" : " made"}.`);
  if (warnings.length) console.log(`\nCheck by hand:\n${warnings.map((w) => `  - ${w}`).join("\n")}`);
  if (changes && !DRY) console.log("\nRebuild or restart the app so cached pages pick up the new content (redirects apply within 60s).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
