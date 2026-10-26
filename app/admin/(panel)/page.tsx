import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readSettings } from "@/lib/settings";
import { channelLabel } from "@/lib/attribution";
import { channelBreakdown, daily, daysAgo, pagePerformance, sydneyStartOfToday } from "@/lib/admin-stats";
import { Badge, Bars, Notice, PageHeader, Panel, Stat, Table, fmtDate, td } from "@/components/admin/ui";

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  await requireUser();
  const sp = await searchParams;
  const d30 = daysAgo(30);
  const d7 = daysAgo(7);
  const startToday = sydneyStartOfToday();

  const notSpam = { status: { not: "SPAM" as const } };
  const [series, leads30, leads7, leadsToday, calls30, calls7, views30, won30, newCount, recent, channels, pages, settings, unsent] = await Promise.all([
    daily(30),
    db.lead.count({ where: { createdAt: { gte: d30 }, ...notSpam } }),
    db.lead.count({ where: { createdAt: { gte: d7 }, ...notSpam } }),
    db.lead.count({ where: { createdAt: { gte: startToday }, ...notSpam } }),
    db.trackEvent.count({ where: { createdAt: { gte: d30 }, type: "call_click" } }),
    db.trackEvent.count({ where: { createdAt: { gte: d7 }, type: "call_click" } }),
    db.trackEvent.count({ where: { createdAt: { gte: d30 }, type: "pageview" } }),
    db.lead.count({ where: { createdAt: { gte: d30 }, status: "WON" } }),
    db.lead.count({ where: { status: "NEW" } }),
    db.lead.findMany({ where: notSpam, orderBy: { createdAt: "desc" }, take: 8 }),
    channelBreakdown(d30),
    pagePerformance(d30, 8),
    readSettings(),
    db.lead.count({ where: { emailSent: false, emailError: { not: null }, createdAt: { gte: d7 } } }),
  ]);
  const conv = views30 ? (((leads30 + calls30) / views30) * 100).toFixed(1) : "0";

  return (
    <>
      <PageHeader title="Dashboard" intro="Last 30 days · Sydney time. Leads exclude spam; call clicks are taps on any phone number on the site." />
      {sp.denied && <Notice tone="warn">That area is for admins only.</Notice>}
      {!process.env.SMTP_HOST && <Notice tone="warn">Email notifications are off — set SMTP_* in the server .env. Leads are still saved here.</Notice>}
      {unsent > 0 && process.env.SMTP_HOST && <Notice tone="bad">{unsent} lead notification email(s) failed in the last 7 days. Check SMTP settings — the leads are safe in the Leads list.</Notice>}
      {!settings.ga4Id && !settings.gtmId && (
        <Notice tone="warn">
          Google Analytics isn&apos;t connected yet. Add your GA4 / Google Ads IDs in <Link className="underline" href="/admin/settings">Settings</Link> (built-in tracking below works regardless).
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="New leads (open)" value={newCount} tone="coral" sub={<Link href="/admin/leads?status=NEW" className="underline">View</Link>} />
        <Stat label="Leads today" value={leadsToday} />
        <Stat label="Leads 7d / 30d" value={`${leads7} / ${leads30}`} tone="brand" />
        <Stat label="Call clicks 7d / 30d" value={`${calls7} / ${calls30}`} tone="brand" />
        <Stat label="Page views 30d" value={views30.toLocaleString()} />
        <Stat label="Conversion" value={`${conv}%`} sub={`${won30} won in 30d`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Leads & call clicks per day" className="xl:col-span-2">
          <Bars
            data={series.map((d) => ({ label: d.label, values: [d.leads, d.calls] }))}
            series={[
              { name: "Leads", color: "#0b7a5f" },
              { name: "Calls", color: "#f05152" },
            ]}
          />
        </Panel>
        <Panel title="Where enquiries come from (30d)">
          <ul className="space-y-2 text-sm">
            {channels.slice(0, 8).map((c) => (
              <li key={c.channel} className="flex items-center justify-between gap-2">
                <span className="truncate">{channelLabel(c.channel)}</span>
                <span className="shrink-0 text-ink-soft">
                  <b className="text-ink">{c.leads}</b> leads · <b className="text-ink">{c.calls}</b> calls
                </span>
              </li>
            ))}
            {!channels.length && <li className="text-ink-soft">No data yet.</li>}
          </ul>
          <Link href="/admin/traffic" className="mt-3 block text-sm font-semibold text-brand-700 hover:underline">
            Full traffic report →
          </Link>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Recent leads" actions={<Link href="/admin/leads" className="text-xs font-semibold text-brand-700">All leads →</Link>}>
          <ul className="divide-y divide-line">
            {recent.map((l) => (
              <li key={l.id}>
                <Link href={`/admin/leads/${l.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-sand">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">
                      {l.name} <span className="font-normal text-ink-soft">· {l.serviceName || l.formType}</span>
                    </span>
                    <span className="block truncate text-xs text-ink-soft">
                      {fmtDate(l.createdAt)} · {l.suburb || "—"} · {channelLabel(l.channel)}
                    </span>
                  </span>
                  <Badge>{l.status}</Badge>
                </Link>
              </li>
            ))}
            {!recent.length && <li className="py-6 text-center text-sm text-ink-soft">No leads yet.</li>}
          </ul>
        </Panel>
        <Panel title="Top converting pages (30d)">
          <Table head={["Page", "Views", "Calls", "Leads"]}>
            {pages.map((p) => (
              <tr key={p.path}>
                <td className={`${td} max-w-[16rem] truncate`}>
                  <a href={p.path} target="_blank" className="hover:underline">
                    {p.path}
                  </a>
                </td>
                <td className={td}>{p.views}</td>
                <td className={td}>{p.calls}</td>
                <td className={td}>{p.leads}</td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </>
  );
}
