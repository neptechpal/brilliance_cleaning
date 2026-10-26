/**
 * Seeds content from content/*.json, the content-strategy keyword plan, legacy redirects and an admin user.
 *
 *   npx tsx scripts/seed.ts            # create missing rows only (safe on production — never overwrites admin edits)
 *   npx tsx scripts/seed.ts --force    # overwrite content rows from JSON
 *
 * Admin user: ADMIN_EMAIL / ADMIN_PASSWORD env, otherwise a random password is generated and written to
 * ../admin-credentials-local.txt (chmod 600, outside the repo).
 */
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "@prisma/client";

const db = new PrismaClient();
const FORCE = process.argv.includes("--force");
const dir = join(__dirname, "..", "content");

function load<T>(file: string): T[] {
  const p = join(dir, file);
  if (!existsSync(p)) {
    console.warn(`  ! ${file} not found — skipped`);
    return [];
  }
  return JSON.parse(readFileSync(p, "utf8")) as T[];
}

type Json = Prisma.InputJsonValue;
type SvcIn = {
  slug: string; name: string; category: string; active: boolean; featured?: boolean; icon?: string;
  metaTitle?: string; metaDescription?: string; h1?: string; heroIntro?: string; summary?: string; body?: string;
  inclusions?: Json; exclusions?: string[]; process?: Json; idealFor?: string[]; faqs?: Json; keywords?: string[]; related?: string[];
};
type AreaIn = {
  slug: string; name: string; region: string; isHub?: boolean; postcode?: string; lat?: number; lng?: number;
  metaTitle?: string; metaDescription?: string; h1?: string; intro?: string; localContent?: string;
  landmarks?: string[]; nearby?: string[]; topServices?: string[]; faqs?: Json;
};
type PostIn = {
  slug: string; title: string; metaTitle?: string; metaDescription?: string; excerpt?: string; category?: string; tags?: string[];
  readMinutes?: number; body?: string; faqs?: Json; relatedServices?: string[]; publishedAt?: string;
};
type SaIn = { service: string; area: string; metaTitle?: string; metaDescription?: string; h1?: string; intro?: string; localTips?: string[] };
type FaqIn = { q: string; a: string; category?: string };

const SERVICE_ORDER = [
  "end-of-lease-cleaning", "house-cleaning", "deep-cleaning", "pre-sale-cleaning", "commercial-cleaning", "hospitality-cleaning",
  "hospitality-staffing", "post-construction-cleaning", "property-staging", "airbnb-cleaning", "carpet-cleaning", "window-cleaning", "ndis-cleaning",
];
const HUB_ORDER = ["newcastle", "lake-macquarie", "maitland", "hunter-valley", "port-stephens", "singleton"];

async function upsert<T>(label: string, exists: () => Promise<unknown>, create: () => Promise<T>, update: () => Promise<T>) {
  const found = await exists();
  if (!found) {
    await create();
    return "created";
  }
  if (FORCE) {
    await update();
    return "updated";
  }
  return "kept";
}

async function seedServices() {
  const rows = load<SvcIn>("services.json");
  const tally: Record<string, number> = {};
  for (const s of rows) {
    const data = {
      name: s.name, category: s.category, active: s.active, featured: !!s.featured, icon: s.icon,
      sortOrder: SERVICE_ORDER.indexOf(s.slug) >= 0 ? SERVICE_ORDER.indexOf(s.slug) : 99,
      metaTitle: s.metaTitle, metaDescription: s.metaDescription, h1: s.h1, heroIntro: s.heroIntro, summary: s.summary, body: s.body ?? "",
      inclusions: s.inclusions ?? [], exclusions: s.exclusions ?? [], process: s.process ?? [], idealFor: s.idealFor ?? [],
      faqs: s.faqs ?? [], keywords: s.keywords ?? [], related: s.related ?? [],
    };
    const r = await upsert(
      s.slug,
      () => db.service.findUnique({ where: { slug: s.slug } }),
      () => db.service.create({ data: { slug: s.slug, ...data } }),
      () => db.service.update({ where: { slug: s.slug }, data }),
    );
    tally[r] = (tally[r] || 0) + 1;
  }
  console.log("  services", tally);
}

async function seedAreas() {
  const rows = [...load<AreaIn>("areas-newcastle.json"), ...load<AreaIn>("areas-hunter.json")];
  const tally: Record<string, number> = {};
  for (const [i, a] of rows.entries()) {
    const data = {
      name: a.name, region: a.region, isHub: !!a.isHub, postcode: a.postcode, lat: a.lat, lng: a.lng,
      metaTitle: a.metaTitle, metaDescription: a.metaDescription, h1: a.h1, intro: a.intro ?? "", localContent: a.localContent ?? "",
      landmarks: a.landmarks ?? [], nearby: a.nearby ?? [], topServices: a.topServices ?? [], faqs: a.faqs ?? [],
      sortOrder: a.isHub ? HUB_ORDER.indexOf(a.slug) : 100 + i,
    };
    const r = await upsert(
      a.slug,
      () => db.area.findUnique({ where: { slug: a.slug } }),
      () => db.area.create({ data: { slug: a.slug, ...data } }),
      () => db.area.update({ where: { slug: a.slug }, data }),
    );
    tally[r] = (tally[r] || 0) + 1;
  }
  console.log("  areas", tally);
}

async function seedServiceAreas() {
  const rows = load<SaIn>("service-areas.json");
  const tally: Record<string, number> = {};
  for (const x of rows) {
    const data = { metaTitle: x.metaTitle, metaDescription: x.metaDescription, h1: x.h1, intro: x.intro ?? "", localTips: x.localTips ?? [] };
    const where = { serviceSlug_areaSlug: { serviceSlug: x.service, areaSlug: x.area } };
    const r = await upsert(
      `${x.service}/${x.area}`,
      () => db.serviceArea.findUnique({ where }),
      () => db.serviceArea.create({ data: { serviceSlug: x.service, areaSlug: x.area, ...data } }),
      () => db.serviceArea.update({ where, data }),
    );
    tally[r] = (tally[r] || 0) + 1;
  }
  console.log("  service-areas", tally);
}

async function seedPosts() {
  const rows = load<PostIn>("posts.json");
  const tally: Record<string, number> = {};
  for (const p of rows) {
    const data = {
      title: p.title, metaTitle: p.metaTitle, metaDescription: p.metaDescription, excerpt: p.excerpt, category: p.category ?? "Guides",
      tags: p.tags ?? [], readMinutes: p.readMinutes ?? 5, body: p.body ?? "", faqs: p.faqs ?? [], relatedServices: p.relatedServices ?? [],
      status: "PUBLISHED" as const, publishedAt: p.publishedAt ? new Date(`${p.publishedAt}T09:00:00+11:00`) : new Date(),
    };
    const r = await upsert(
      p.slug,
      () => db.post.findUnique({ where: { slug: p.slug } }),
      () => db.post.create({ data: { slug: p.slug, ...data } }),
      () => db.post.update({ where: { slug: p.slug }, data }),
    );
    tally[r] = (tally[r] || 0) + 1;
  }
  console.log("  posts", tally);
}

async function seedFaqs() {
  const rows = load<FaqIn>("faqs.json");
  if (!rows.length) return;
  const count = await db.faq.count();
  if (count && !FORCE) return console.log("  faqs kept", count);
  if (FORCE) await db.faq.deleteMany();
  await db.faq.createMany({ data: rows.map((f, i) => ({ q: f.q, a: f.a, category: f.category ?? "General", sortOrder: i })) });
  console.log("  faqs created", rows.length);
}

// Content strategy: money keywords mapped to the page that should rank, plus gaps to write next.
async function seedKeywords() {
  const services = await db.service.findMany({ where: { active: true } });
  const sa = await db.serviceArea.findMany();
  const posts = await db.post.findMany();
  const hubNames: Record<string, string> = { newcastle: "newcastle", "lake-macquarie": "lake macquarie", maitland: "maitland", "hunter-valley": "cessnock", "port-stephens": "port stephens" };
  const primary: Record<string, string> = {
    "end-of-lease-cleaning": "end of lease cleaning", "house-cleaning": "house cleaning", "deep-cleaning": "deep cleaning",
    "pre-sale-cleaning": "pre sale cleaning", "commercial-cleaning": "commercial cleaning", "hospitality-cleaning": "restaurant cleaning",
    "hospitality-staffing": "hospitality staffing", "post-construction-cleaning": "builders cleaning", "property-staging": "property staging",
  };
  const list: { keyword: string; intent: string; cluster: string; targetUrl?: string; status: string; priority: number; notes?: string }[] = [];
  for (const s of services) {
    const kw = primary[s.slug] ?? s.name.toLowerCase();
    list.push({ keyword: `${kw} newcastle`, intent: "local", cluster: s.name, targetUrl: `/services/${s.slug}`, status: "PUBLISHED", priority: 1 });
    for (const [hub, name] of Object.entries(hubNames)) {
      if (hub === "newcastle") continue;
      const has = sa.some((r) => r.serviceSlug === s.slug && r.areaSlug === hub);
      list.push({ keyword: `${kw} ${name}`, intent: "local", cluster: s.name, targetUrl: has ? `/services/${s.slug}/${hub}` : undefined, status: has ? "PUBLISHED" : "IDEA", priority: 2 });
    }
  }
  const extra: [string, string, string, number, string?][] = [
    ["bond cleaning newcastle", "local", "End of Lease Cleaning", 1, "/services/end-of-lease-cleaning"],
    ["vacate cleaning newcastle", "local", "End of Lease Cleaning", 2, "/services/end-of-lease-cleaning"],
    ["cleaners newcastle", "local", "Brand / general", 1, "/"],
    ["cleaning services newcastle nsw", "local", "Brand / general", 1, "/"],
    ["house cleaners near me", "local", "House Cleaning", 1, "/services/house-cleaning"],
    ["office cleaning newcastle", "local", "Commercial & Office Cleaning", 1, "/services/commercial-cleaning"],
    ["pub cleaning newcastle", "local", "Hospitality Venue Cleaning", 2, "/services/hospitality-cleaning"],
    ["commercial kitchen cleaning newcastle", "local", "Hospitality Venue Cleaning", 2],
    ["winery cleaning hunter valley", "local", "Hospitality Venue Cleaning", 2, "/services/hospitality-cleaning/hunter-valley"],
    ["wedding venue cleaning hunter valley", "local", "Hospitality Venue Cleaning", 3],
    ["hospitality staff hire newcastle", "local", "Hospitality Staffing", 2, "/services/hospitality-staffing"],
    ["home staging newcastle", "local", "Property Staging", 1, "/services/property-staging"],
    ["home staging cost newcastle", "commercial", "Property Staging", 2],
    ["after builders clean newcastle", "local", "Post-Construction Cleaning", 2, "/services/post-construction-cleaning"],
    ["airbnb cleaning port stephens", "local", "Airbnb & Holiday Rental Cleaning", 2, undefined],
    ["airbnb cleaning newcastle", "local", "Airbnb & Holiday Rental Cleaning", 2, undefined],
    ["carpet steam cleaning newcastle", "local", "Carpet Steam Cleaning", 2, undefined],
    ["window cleaning newcastle", "local", "Window Cleaning", 3, undefined],
    ["how to get full bond back nsw", "informational", "End of Lease Cleaning", 2],
    ["what do real estate agents check at final inspection", "informational", "End of Lease Cleaning", 2],
    ["how much does a cleaner cost per hour newcastle", "informational", "House Cleaning", 2],
    ["how to remove mould from bathroom ceiling", "informational", "Deep & Spring Cleaning", 3],
    ["oven cleaning tips end of lease", "informational", "End of Lease Cleaning", 3],
    ["office cleaning checklist", "informational", "Commercial & Office Cleaning", 3],
    ["restaurant cleaning checklist nsw", "informational", "Hospitality Venue Cleaning", 3],
    ["how to prepare house for sale photos", "informational", "Property Staging", 3],
  ];
  for (const [keyword, intent, cluster, priority, url] of extra) {
    list.push({ keyword, intent, cluster, priority, targetUrl: url, status: url ? "PUBLISHED" : "IDEA" });
  }
  for (const p of posts) {
    list.push({ keyword: (p.metaTitle || p.title).toLowerCase().replace(/[|:–—].*$/, "").trim(), intent: "informational", cluster: p.category, targetUrl: `/blog/${p.slug}`, status: "PUBLISHED", priority: 2, notes: "Blog post" });
  }
  let created = 0;
  for (const k of list) {
    const found = await db.keyword.findUnique({ where: { keyword: k.keyword } });
    if (found) continue;
    await db.keyword.create({ data: k });
    created++;
  }
  console.log("  keywords created", created);
}

async function seedRedirects() {
  // URLs from the old WordPress site that had real pages
  const rows = [
    { from: "/booking", to: "/quote", code: 301, note: "Old WP booking page" },
    { from: "/home", to: "/", code: 301, note: "Old WP" },
    { from: "/residential-cleaning", to: "/services/house-cleaning", code: 301, note: "Old service name" },
    { from: "/commercial-cleaning", to: "/services/commercial-cleaning", code: 301, note: "Old service name" },
    { from: "/property-staging", to: "/services/property-staging", code: 301, note: "Old service name" },
    { from: "/move-in-move-out-cleaning", to: "/services/end-of-lease-cleaning", code: 301, note: "Old service name" },
    { from: "/post-construction-cleaning", to: "/services/post-construction-cleaning", code: 301, note: "Old service name" },
  ];
  let created = 0;
  for (const r of rows) {
    if (await db.redirect.findUnique({ where: { from: r.from } })) continue;
    await db.redirect.create({ data: r });
    created++;
  }
  console.log("  redirects created", created);
}

async function seedAdmin() {
  if (await db.user.count()) return console.log("  admin user exists");
  const email = process.env.ADMIN_EMAIL || "admin@brillianceservices.com.au";
  const password = process.env.ADMIN_PASSWORD || randomBytes(9).toString("base64url");
  await db.user.create({ data: { email, name: "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) } });
  if (!process.env.ADMIN_PASSWORD) {
    const file = join(__dirname, "..", "..", "admin-credentials-local.txt");
    writeFileSync(file, `Brilliance admin (${process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ":***@")})\nURL: /admin/login\nEmail: ${email}\nPassword: ${password}\n`);
    chmodSync(file, 0o600);
    console.log(`  admin user created — credentials written to ${file}`);
  } else console.log(`  admin user created: ${email}`);
}

async function main() {
  console.log(`Seeding${FORCE ? " (force)" : ""}…`);
  await seedServices();
  await seedAreas();
  await seedServiceAreas();
  await seedPosts();
  await seedFaqs();
  await seedKeywords();
  await seedRedirects();
  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
