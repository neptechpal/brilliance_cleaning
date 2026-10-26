import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MessageSquare, Phone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { channelLabel } from "@/lib/attribution";
import { addNote, deleteLead, updateLead } from "@/app/admin/actions/leads";
import { Badge, Field, PageHeader, Panel, Select, fmtDate } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

export default async function LeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();
  const lead = await db.lead.findUnique({ where: { id }, include: { notes: { orderBy: { createdAt: "desc" } } } });
  if (!lead) notFound();

  // Other activity from the same visitor (earlier leads / call clicks)
  const [otherLeads, visitorCalls] = await Promise.all([
    db.lead.findMany({
      where: { id: { not: id }, OR: [{ phone: lead.phone }, ...(lead.email ? [{ email: lead.email }] : []), ...(lead.visitorId ? [{ visitorId: lead.visitorId }] : [])] },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    lead.visitorId ? db.trackEvent.findMany({ where: { visitorId: lead.visitorId, type: { not: "pageview" } }, orderBy: { createdAt: "desc" }, take: 20 }) : [],
  ]);

  const ft = (lead.firstTouch ?? {}) as Record<string, string | undefined>;
  const extras = Array.isArray(lead.extras) ? (lead.extras as string[]) : [];
  const tel = lead.phone.replace(/\s/g, "");
  const rows: [string, React.ReactNode][] = [
    ["Service", lead.serviceName || lead.serviceSlug],
    ["Suburb", [lead.suburb, lead.postcode].filter(Boolean).join(" ")],
    ["Property", [lead.propertyType, lead.bedrooms != null && `${lead.bedrooms} bed`, lead.bathrooms != null && `${lead.bathrooms} bath`].filter(Boolean).join(" · ")],
    ["Preferred date", lead.preferredDate],
    ["Frequency", lead.frequency],
    ["Add-ons", extras.join(", ")],
    ["Form", lead.formType],
  ];
  const attribution: [string, React.ReactNode][] = [
    ["Source / channel", channelLabel(lead.channel)],
    ["Submitted on", lead.pagePath],
    ["Session landing page", lead.landingPage],
    ["Referrer", lead.referrer],
    ["UTM source / medium", [lead.utmSource, lead.utmMedium].filter(Boolean).join(" / ")],
    ["UTM campaign", lead.utmCampaign],
    ["UTM term / content", [lead.utmTerm, lead.utmContent].filter(Boolean).join(" / ")],
    ["Google click ID", lead.gclid ? "Yes (gclid)" : null],
    ["Meta click ID", lead.fbclid ? "Yes (fbclid)" : null],
    ["First visit", ft.at ? `${fmtDate(ft.at)} · ${ft.landingPage ?? ""}` : null],
    ["First-touch source", ft.source || ft.referrer || (ft.at ? "Direct" : null)],
    ["Device", lead.device],
  ];

  return (
    <>
      <Link href="/admin/leads" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Leads
      </Link>
      <PageHeader
        title={`${lead.name}`}
        intro={
          <>
            Lead #{lead.id} · received {fmtDate(lead.createdAt)} · <Badge>{lead.status}</Badge>
            {lead.spamReason && <span className="ml-2 text-coral-600">Spam reason: {lead.spamReason}</span>}
          </>
        }
        actions={
          <>
            <a href={`tel:${tel}`} className="inline-flex items-center gap-1.5 rounded-lg bg-coral-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-coral-700">
              <Phone className="size-4" /> {lead.phone}
            </a>
            <a href={`sms:${tel}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:bg-sand">
              <MessageSquare className="size-4" /> SMS
            </a>
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:bg-sand">
                <Mail className="size-4" /> {lead.email}
              </a>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Request">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {rows
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-semibold text-ink-soft">{k}</dt>
                    <dd className="text-sm text-ink">{v}</dd>
                  </div>
                ))}
            </dl>
            {lead.message && (
              <div className="mt-4 rounded-lg bg-sand p-3 text-sm whitespace-pre-wrap text-ink">
                <p className="mb-1 text-xs font-semibold text-ink-soft">Message</p>
                {lead.message}
              </div>
            )}
          </Panel>

          <Panel title="Notes & history">
            <form action={addNote} className="flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="id" value={lead.id} />
              <textarea name="body" required rows={2} placeholder="e.g. Called, left voicemail. Quoted $420 for Friday." className="flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
              <SubmitButton>Add note</SubmitButton>
            </form>
            <ul className="mt-4 space-y-3">
              {lead.notes.map((n) => (
                <li key={n.id} className="rounded-lg border border-line p-3 text-sm">
                  <p className="whitespace-pre-wrap text-ink">{n.body}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {n.authorName} · {fmtDate(n.createdAt)}
                  </p>
                </li>
              ))}
              {!lead.notes.length && <li className="text-sm text-ink-soft">No notes yet.</li>}
            </ul>
          </Panel>

          {(otherLeads.length > 0 || visitorCalls.length > 0) && (
            <Panel title="Same customer / visitor">
              <ul className="space-y-1.5 text-sm">
                {otherLeads.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/leads/${o.id}`} className="text-brand-700 hover:underline">
                      Lead #{o.id}
                    </Link>{" "}
                    · {o.serviceName || o.formType} · {fmtDate(o.createdAt)} · <Badge>{o.status}</Badge>
                  </li>
                ))}
                {visitorCalls.map((e) => (
                  <li key={e.id} className="text-ink-soft">
                    {e.type.replace("_", " ")} · {e.label} on {e.pagePath} · {fmtDate(e.createdAt)}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="space-y-4">
          <Panel title="Status">
            <form action={updateLead} className="space-y-3">
              <input type="hidden" name="id" value={lead.id} />
              <Select label="Status" name="status" defaultValue={lead.status} options={["NEW", "CONTACTED", "QUOTED", "WON", "LOST", "SPAM"]} />
              <Field label="Job value (AUD)" name="valueAud" type="number" min={0} defaultValue={lead.valueAud ?? ""} hint="Quoted or won amount — used for ROI reporting." />
              <SubmitButton className="w-full">Update</SubmitButton>
            </form>
          </Panel>
          <Panel title="Attribution">
            <dl className="space-y-2.5">
              {attribution
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-semibold text-ink-soft">{k}</dt>
                    <dd className="break-words text-sm text-ink">{v}</dd>
                  </div>
                ))}
            </dl>
          </Panel>
          <Panel title="Email notification">
            <p className="text-sm">{lead.emailSent ? "Sent ✓" : lead.emailError ? <span className="text-coral-600">Failed: {lead.emailError}</span> : "Not sent"}</p>
          </Panel>
          {user.role === "ADMIN" && (
            <form action={deleteLead}>
              <input type="hidden" name="id" value={lead.id} />
              <SubmitButton variant="danger" confirm="Delete this lead permanently?" className="w-full">
                Delete lead
              </SubmitButton>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
