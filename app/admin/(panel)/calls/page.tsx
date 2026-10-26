import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { channelLabel } from "@/lib/attribution";
import { daily, daysAgo } from "@/lib/admin-stats";
import { Bars, PageHeader, Panel, Stat, Table, fmtDate, td } from "@/components/admin/ui";

const TYPES: Record<string, string> = { call_click: "Call", sms_click: "SMS", email_click: "Email", whatsapp_click: "WhatsApp", quote_cta: "Quote button" };

export default async function CallsPage({ searchParams }: PageProps<"/admin/calls">) {
  await requireUser();
  const sp = await searchParams;
  const type = typeof sp.type === "string" && sp.type in TYPES ? sp.type : "call_click";
  const d30 = daysAgo(30);

  const [events, series, byLabel, byPage, byChannel, byDevice, totals] = await Promise.all([
    db.trackEvent.findMany({ where: { type }, orderBy: { createdAt: "desc" }, take: 200 }),
    daily(30),
    db.trackEvent.groupBy({ by: ["label"], where: { type, createdAt: { gte: d30 } }, _count: true, orderBy: { _count: { label: "desc" } } }),
    db.trackEvent.groupBy({ by: ["pagePath"], where: { type, createdAt: { gte: d30 } }, _count: true, orderBy: { _count: { pagePath: "desc" } }, take: 10 }),
    db.trackEvent.groupBy({ by: ["channel"], where: { type, createdAt: { gte: d30 } }, _count: true, orderBy: { _count: { channel: "desc" } } }),
    db.trackEvent.groupBy({ by: ["device"], where: { type, createdAt: { gte: d30 } }, _count: true }),
    db.trackEvent.groupBy({ by: ["type"], where: { createdAt: { gte: d30 }, type: { in: Object.keys(TYPES) } }, _count: true }),
  ]);
  const total = (t: string) => totals.find((x) => x.type === t)?._count ?? 0;

  return (
    <>
      <PageHeader
        title="Call & contact clicks"
        intro="Every tap on a phone number, SMS, email or quote button across the site, with the page and position it was tapped from. (Taps made while you're logged in to the admin aren't counted.)"
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {Object.entries(TYPES).map(([k, l]) => (
          <a key={k} href={`/admin/calls?type=${k}`} className={type === k ? "ring-2 ring-brand-500 rounded-xl" : ""}>
            <Stat label={`${l} clicks · 30d`} value={total(k)} tone={k === "call_click" ? "coral" : "default"} />
          </a>
        ))}
      </div>
      {type === "call_click" && (
        <Panel title="Call clicks per day (30d)" className="mb-4">
          <Bars data={series.map((d) => ({ label: d.label, values: [d.calls] }))} series={[{ name: "Calls", color: "#f05152" }]} />
        </Panel>
      )}
      <div className="mb-4 grid gap-4 lg:grid-cols-4">
        <Panel title="Button position">
          <ul className="space-y-1.5 text-sm">
            {byLabel.map((r) => (
              <li key={r.label ?? "none"} className="flex justify-between gap-2">
                <span className="truncate">{r.label ?? "—"}</span>
                <b>{r._count}</b>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Top pages">
          <ul className="space-y-1.5 text-sm">
            {byPage.map((r) => (
              <li key={r.pagePath} className="flex justify-between gap-2">
                <span className="truncate">{r.pagePath}</span>
                <b>{r._count}</b>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Source">
          <ul className="space-y-1.5 text-sm">
            {byChannel.map((r) => (
              <li key={r.channel ?? "none"} className="flex justify-between gap-2">
                <span className="truncate">{channelLabel(r.channel)}</span>
                <b>{r._count}</b>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Device">
          <ul className="space-y-1.5 text-sm">
            {byDevice.map((r) => (
              <li key={r.device ?? "none"} className="flex justify-between gap-2">
                <span className="capitalize">{r.device ?? "—"}</span>
                <b>{r._count}</b>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Table head={["When", "Type", "Position", "Page", "Source", "Landing page", "Device"]} empty={events.length ? undefined : "No clicks recorded yet."}>
        {events.map((e) => (
          <tr key={e.id}>
            <td className={`${td} whitespace-nowrap text-ink-soft`}>{fmtDate(e.createdAt)}</td>
            <td className={td}>{TYPES[e.type] ?? e.type}</td>
            <td className={td}>{e.label}</td>
            <td className={`${td} max-w-[14rem] truncate`}>{e.pagePath}</td>
            <td className={td}>
              {channelLabel(e.channel)}
              {e.utmCampaign && <span className="block text-xs text-ink-soft">{e.utmCampaign}</span>}
            </td>
            <td className={`${td} max-w-[12rem] truncate text-xs text-ink-soft`}>{e.landingPage}</td>
            <td className={`${td} capitalize`}>{e.device}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
