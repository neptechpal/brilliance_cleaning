import { db } from "./db";

const TZ = "Australia/Sydney";

/** Daily counts for the last `days` days (Sydney time), gaps filled with 0. */
export async function daily(days: number) {
  const since = new Date(Date.now() - days * 86400_000);
  const [leads, calls, views] = await Promise.all([
    db.$queryRaw<{ d: string; n: bigint }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}, 'YYYY-MM-DD') d, count(*) n
      FROM "Lead" WHERE "createdAt" >= ${since} AND status <> 'SPAM' GROUP BY 1`,
    db.$queryRaw<{ d: string; n: bigint }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}, 'YYYY-MM-DD') d, count(*) n
      FROM "TrackEvent" WHERE "createdAt" >= ${since} AND type = 'call_click' GROUP BY 1`,
    db.$queryRaw<{ d: string; n: bigint }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}, 'YYYY-MM-DD') d, count(*) n
      FROM "TrackEvent" WHERE "createdAt" >= ${since} AND type = 'pageview' GROUP BY 1`,
  ]);
  const m = (rows: { d: string; n: bigint }[]) => new Map(rows.map((r) => [r.d, Number(r.n)]));
  const L = m(leads), C = m(calls), V = m(views);
  const out: { day: string; label: string; leads: number; calls: number; views: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400_000);
    const day = dt.toLocaleDateString("en-CA", { timeZone: TZ });
    out.push({
      day,
      label: dt.toLocaleDateString("en-AU", { timeZone: TZ, day: "numeric", month: "short" }),
      leads: L.get(day) ?? 0,
      calls: C.get(day) ?? 0,
      views: V.get(day) ?? 0,
    });
  }
  return out;
}

export async function channelBreakdown(since: Date) {
  const [leads, calls, views] = await Promise.all([
    db.lead.groupBy({ by: ["channel"], where: { createdAt: { gte: since }, status: { not: "SPAM" } }, _count: true }),
    db.trackEvent.groupBy({ by: ["channel"], where: { createdAt: { gte: since }, type: "call_click" }, _count: true }),
    db.trackEvent.groupBy({ by: ["channel"], where: { createdAt: { gte: since }, type: "pageview", channel: { not: "internal" } }, _count: true }),
  ]);
  const map = new Map<string, { leads: number; calls: number; sessions: number }>();
  const get = (k: string | null) => {
    const key = k || "unknown";
    if (!map.has(key)) map.set(key, { leads: 0, calls: 0, sessions: 0 });
    return map.get(key)!;
  };
  leads.forEach((r) => (get(r.channel).leads = r._count));
  calls.forEach((r) => (get(r.channel).calls = r._count));
  views.forEach((r) => (get(r.channel).sessions = r._count));
  return [...map.entries()].map(([channel, v]) => ({ channel, ...v })).sort((a, b) => b.leads + b.calls - (a.leads + a.calls) || b.sessions - a.sessions);
}

/** Per page: views, call clicks, leads submitted on that page, leads that landed on that page. */
export async function pagePerformance(since: Date, limit = 50) {
  const rows = await db.$queryRaw<{ path: string; views: bigint; calls: bigint; leads: bigint; landed: bigint }[]>`
    WITH v AS (SELECT "pagePath" path, count(*) views FROM "TrackEvent" WHERE type='pageview' AND "createdAt" >= ${since} GROUP BY 1),
         c AS (SELECT "pagePath" path, count(*) calls FROM "TrackEvent" WHERE type='call_click' AND "createdAt" >= ${since} GROUP BY 1),
         l AS (SELECT "pagePath" path, count(*) leads FROM "Lead" WHERE status <> 'SPAM' AND "createdAt" >= ${since} GROUP BY 1),
         lp AS (SELECT split_part("landingPage", '?', 1) path, count(*) landed FROM "Lead" WHERE status <> 'SPAM' AND "createdAt" >= ${since} GROUP BY 1)
    SELECT p.path, coalesce(v.views,0) views, coalesce(c.calls,0) calls, coalesce(l.leads,0) leads, coalesce(lp.landed,0) landed
    FROM (SELECT path FROM v UNION SELECT path FROM c UNION SELECT path FROM l UNION SELECT path FROM lp) p
    LEFT JOIN v ON v.path=p.path LEFT JOIN c ON c.path=p.path LEFT JOIN l ON l.path=p.path LEFT JOIN lp ON lp.path=p.path
    WHERE p.path IS NOT NULL
    ORDER BY (coalesce(l.leads,0) + coalesce(c.calls,0) + coalesce(lp.landed,0)) DESC, coalesce(v.views,0) DESC
    LIMIT ${limit}`;
  return rows.map((r) => ({ path: r.path, views: Number(r.views), calls: Number(r.calls), leads: Number(r.leads), landed: Number(r.landed) }));
}

/** The instant Sydney's current day started, independent of the server's timezone. */
export function sydneyStartOfToday() {
  const now = new Date();
  const wall = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
  const diff = wall.getTime() - now.getTime();
  wall.setHours(0, 0, 0, 0);
  return new Date(wall.getTime() - diff);
}

export const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);
