import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { channelLabel } from "@/lib/attribution";
import { channelBreakdown, daily, daysAgo, pagePerformance } from "@/lib/admin-stats";
import { Bars, PageHeader, Panel, Stat, Table, td } from "@/components/admin/ui";

const RANGES: Record<string, number> = { "7": 7, "30": 30, "90": 90 };

export default async function TrafficPage({ searchParams }: PageProps<"/admin/traffic">) {
  await requireUser();
  const sp = await searchParams;
  const days = RANGES[String(sp.days)] ?? 30;
  const since = daysAgo(days);

  const [series, channels, pages, visitors, organicLanding, formStarts, leads] = await Promise.all([
    daily(days),
    channelBreakdown(since),
    pagePerformance(since, 60),
    db.trackEvent.findMany({ where: { type: "pageview", createdAt: { gte: since } }, distinct: ["visitorId"], select: { visitorId: true } }),
    db.trackEvent.groupBy({
      by: ["landingPage"],
      where: { type: "pageview", createdAt: { gte: since }, channel: { in: ["google-organic", "bing-organic", "ai-search"] } },
      _count: true,
      orderBy: { _count: { landingPage: "desc" } },
      take: 15,
    }),
    db.trackEvent.count({ where: { type: "form_start", createdAt: { gte: since } } }),
    db.lead.count({ where: { createdAt: { gte: since }, status: { not: "SPAM" } } }),
  ]);
  const views = series.reduce((a, d) => a + d.views, 0);
  const calls = series.reduce((a, d) => a + d.calls, 0);

  return (
    <>
      <PageHeader
        title="Traffic & conversions"
        intro="First-party tracking (no cookies banner needed, bots excluded). Use alongside Google Search Console for search queries and rankings."
        actions={
          <div className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-line">
            {Object.keys(RANGES).map((r) => (
              <a key={r} href={`/admin/traffic?days=${r}`} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${String(days) === r ? "bg-ink text-white" : "text-ink"}`}>
                {r}d
              </a>
            ))}
          </div>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Page views" value={views.toLocaleString()} />
        <Stat label="Unique visitors" value={visitors.length.toLocaleString()} />
        <Stat label="Form starts" value={formStarts} sub={formStarts ? `${Math.round((leads / formStarts) * 100)}% completed` : undefined} />
        <Stat label="Leads" value={leads} tone="brand" />
        <Stat label="Call clicks" value={calls} tone="coral" />
      </div>
      <Panel title="Daily page views" className="mb-4">
        <Bars data={series.map((d) => ({ label: d.label, values: [d.views] }))} series={[{ name: "Views", color: "#3eb489" }]} />
      </Panel>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Channels">
          <Table head={["Channel", "Page views", "Calls", "Leads"]}>
            {channels.map((c) => (
              <tr key={c.channel}>
                <td className={td}>{channelLabel(c.channel)}</td>
                <td className={td}>{c.sessions}</td>
                <td className={td}>{c.calls}</td>
                <td className={td}>{c.leads}</td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Top organic landing pages (Google, Bing, AI search)">
          <Table head={["Landing page", "Entrances"]} empty={organicLanding.length ? undefined : "No organic visits recorded yet."}>
            {organicLanding.map((r) => (
              <tr key={r.landingPage ?? "?"}>
                <td className={`${td} max-w-[20rem] truncate`}>{r.landingPage}</td>
                <td className={td}>{r._count}</td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
      <Panel title="Page performance">
        <Table head={["Page", "Views", "Call clicks", "Leads submitted here", "Leads that landed here", "Conv. rate"]}>
          {pages.map((p) => (
            <tr key={p.path}>
              <td className={`${td} max-w-[22rem] truncate`}>
                <a href={p.path} target="_blank" className="hover:underline">
                  {p.path}
                </a>
              </td>
              <td className={td}>{p.views}</td>
              <td className={td}>{p.calls}</td>
              <td className={td}>{p.leads}</td>
              <td className={td}>{p.landed}</td>
              <td className={td}>{p.views ? `${(((p.calls + p.leads) / p.views) * 100).toFixed(1)}%` : "—"}</td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
