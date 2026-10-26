import Link from "next/link";
import type { Prisma, LeadStatus } from "@prisma/client";
import { Download, Phone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { channelLabel } from "@/lib/attribution";
import { Badge, Notice, PageHeader, Table, fmtDate, td } from "@/components/admin/ui";

const STATUSES = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST", "SPAM"] as const;
const PER = 50;

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  await requireUser();
  const sp = await searchParams;
  const status = typeof sp.status === "string" && (STATUSES as readonly string[]).includes(sp.status) ? (sp.status as LeadStatus) : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const service = typeof sp.service === "string" ? sp.service : "";
  const channel = typeof sp.channel === "string" ? sp.channel : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.LeadWhereInput = {
    ...(status ? { status } : { status: { not: "SPAM" } }),
    ...(service ? { serviceSlug: service } : {}),
    ...(channel ? { channel } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" } },
            { suburb: { contains: q, mode: "insensitive" } },
            { message: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [leads, total, counts, services, channels] = await Promise.all([
    db.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: PER, skip: (page - 1) * PER }),
    db.lead.count({ where }),
    db.lead.groupBy({ by: ["status"], _count: true }),
    db.lead.findMany({ where: { serviceSlug: { not: null } }, distinct: ["serviceSlug"], select: { serviceSlug: true, serviceName: true } }),
    db.lead.findMany({ where: { channel: { not: null } }, distinct: ["channel"], select: { channel: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status, q, service, channel, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <PageHeader
        title="Leads"
        intro="Every form submission is stored here first — even if email notifications fail."
        actions={
          <a href={`/api/admin/leads/export${qs({})}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:bg-sand">
            <Download className="size-4" /> Export CSV
          </a>
        }
      />
      {sp.deleted && <Notice>Lead deleted.</Notice>}

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={`/admin/leads${qs({ status: undefined })}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${!status ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line"}`}>
          All open
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/leads${qs({ status: s })}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${status === s ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line"}`}>
            {s.charAt(0) + s.slice(1).toLowerCase()} <span className="opacity-60">{count(s)}</span>
          </Link>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap gap-2" action="/admin/leads">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="Search name, phone, email, suburb…" className="min-w-[14rem] flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm" />
        <select name="service" defaultValue={service} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
          <option value="">All services</option>
          {services.map((s) => (
            <option key={s.serviceSlug} value={s.serviceSlug!}>
              {s.serviceName || s.serviceSlug}
            </option>
          ))}
        </select>
        <select name="channel" defaultValue={channel} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
          <option value="">All sources</option>
          {channels.map((c) => (
            <option key={c.channel} value={c.channel!}>
              {channelLabel(c.channel)}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>

      <Table head={["Received", "Name", "Service", "Suburb", "Source", "Page", "Status"]} empty={leads.length ? undefined : "No leads match."}>
        {leads.map((l) => (
          <tr key={l.id} className={l.status === "NEW" ? "bg-coral-50/40" : ""}>
            <td className={`${td} whitespace-nowrap text-ink-soft`}>{fmtDate(l.createdAt)}</td>
            <td className={td}>
              <Link href={`/admin/leads/${l.id}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">
                {l.name}
              </Link>
              <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft hover:text-coral-600">
                <Phone className="size-3" /> {l.phone}
              </a>
            </td>
            <td className={td}>
              {l.serviceName || "—"}
              <span className="block text-xs text-ink-soft">{l.formType}</span>
            </td>
            <td className={td}>{l.suburb || "—"}</td>
            <td className={td}>
              {channelLabel(l.channel)}
              {l.utmCampaign && <span className="block text-xs text-ink-soft">{l.utmCampaign}</span>}
            </td>
            <td className={`${td} max-w-[12rem] truncate text-xs text-ink-soft`}>{l.pagePath}</td>
            <td className={td}>
              <Badge>{l.status}</Badge>
            </td>
          </tr>
        ))}
      </Table>

      {total > PER && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-soft">
            {(page - 1) * PER + 1}–{Math.min(page * PER, total)} of {total}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/admin/leads${qs({ page: String(page - 1) })}`} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-line">
                ← Prev
              </Link>
            )}
            {page * PER < total && (
              <Link href={`/admin/leads${qs({ page: String(page + 1) })}`} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-line">
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
