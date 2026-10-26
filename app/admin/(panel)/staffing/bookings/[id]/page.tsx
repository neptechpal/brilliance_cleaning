import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookingActivity } from "@/lib/staffing-mail";
import { addBookingNote, deleteBooking, emailBooking, updateBooking } from "@/app/admin/actions/staffing";
import { ActionForm } from "@/components/admin/ActionForm";
import { Area, Badge, Field, LinkBtn, PageHeader, Panel, Select, fmtDate } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const b = await db.staffBooking.findUnique({ where: { id } });
  if (!b) notFound();
  const staff = await db.staffApplication.findMany({
    where: { OR: [{ active: true }, { id: { in: [...b.preferredStaffIds, ...b.assignedStaffIds] } }] },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  const staffList = (ids: number[]) => ids.length ? ids.map((id) => {
    const s = staff.find((s) => s.id === id);
    return <li key={id}>{s ? <Link href={`/admin/applications/${id}`} className="text-brand-700 hover:underline">{s.firstName} {s.lastName}{!s.active && " (inactive)"}</Link> : `Deleted staff #${id}`}</li>;
  }) : <li>None</li>;
  const details = [
    ["Venue", b.venue], ["Address", b.address], ["Contact", b.contactName], ["Email", b.contactEmail], ["Phone", b.contactPhone],
    ["Date (Sydney)", b.date], ["Time (Sydney)", `${b.startTime}–${b.endTime}${b.endTime <= b.startTime ? " (next day)" : ""}`],
    ["Position", b.position], ["Number of staff", b.quantity], ["Base rate ex GST", b.rateAud == null ? "—" : `$${b.rateAud.toFixed(2)}/hour`],
    ["Estimate ex GST", b.estimateAud == null ? "—" : `$${b.estimateAud.toFixed(2)}`], ["Policies accepted", b.acceptedPolicies ? "Yes" : "No"],
    ["Created", fmtDate(b.createdAt)], ["Updated", fmtDate(b.updatedAt)], ["Legacy ID", b.legacyId ?? "—"],
  ];
  return (
    <>
      <PageHeader title={`Booking #${b.id} · ${b.venue}`} intro={<Badge>{b.status}</Badge>} actions={<LinkBtn href="/admin/staffing/bookings" variant="ghost">← Bookings</LinkBtn>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Booking details">
            <dl className="grid gap-3 sm:grid-cols-2">{details.map(([k, v]) => <div key={k}><dt className="text-xs font-semibold text-ink-soft">{k}</dt><dd className="break-words text-sm text-ink">{v}</dd></div>)}</dl>
            <p className="mt-4 text-xs font-semibold text-ink-soft">Client notes</p><p className="whitespace-pre-wrap text-sm">{b.notes || "—"}</p>
          </Panel>
          <Panel title="Staff preferences"><ul className="space-y-1 text-sm">{staffList(b.preferredStaffIds)}</ul></Panel>
          <Panel title="Assigned staff"><ul className="space-y-1 text-sm">{staffList(b.assignedStaffIds)}</ul></Panel>
          <Panel title="Custom email">
            <ActionForm action={emailBooking}>
              <input type="hidden" name="id" value={id} /><input type="hidden" name="kind" value="custom" />
              <Field label="To" name="to" type="email" required defaultValue={b.contactEmail} maxLength={160} />
              <Field label="Subject" name="subject" required maxLength={200} />
              <Area label="Message" name="body" required rows={8} maxLength={20000} />
              <SubmitButton>Send email</SubmitButton>
            </ActionForm>
          </Panel>
          <Panel title="Activity & internal notes">
            <ActionForm action={addBookingNote}>
              <input type="hidden" name="id" value={id} />
              <Area label="Internal note" name="body" required rows={3} maxLength={4000} />
              <SubmitButton>Add note</SubmitButton>
            </ActionForm>
            <ol className="mt-4 space-y-3 border-l border-line pl-4">
              {bookingActivity(b.activity).reverse().map((a, i) => <li key={`${a.at}-${i}`} className="rounded-lg border border-line p-3 text-sm"><p className="whitespace-pre-wrap break-words">{a.message}</p><p className="mt-1 text-xs text-ink-soft">{a.actor} · {a.type} · {fmtDate(a.at)}</p></li>)}
            </ol>
          </Panel>
          <Panel title="Attribution">
            <dl className="grid gap-3 sm:grid-cols-2">{Object.entries({ pagePath: b.pagePath, channel: b.channel, utmSource: b.utmSource, utmMedium: b.utmMedium, utmCampaign: b.utmCampaign, gclid: b.gclid, visitorId: b.visitorId, device: b.device, ipHash: b.ipHash }).map(([k, v]) => <div key={k}><dt className="text-xs font-semibold text-ink-soft">{k}</dt><dd className="break-all text-sm">{v || "—"}</dd></div>)}</dl>
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel title="Status & assignments">
            <ActionForm action={updateBooking}>
              <input type="hidden" name="id" value={id} />
              <Select label="Status" name="status" defaultValue={b.status} options={Object.values(BookingStatus)} />
              <fieldset className="space-y-2"><legend className="mb-2 text-xs font-semibold">Assign staff</legend>
                {staff.filter((s) => s.active || b.assignedStaffIds.includes(s.id)).map((s) => <label key={s.id} className="flex items-start gap-2 text-sm"><input className="mt-1 accent-brand-600" type="checkbox" name="assignedStaffIds" value={s.id} defaultChecked={b.assignedStaffIds.includes(s.id)} /><span>{s.firstName} {s.lastName}{!s.active && " (inactive)"}<span className="block text-xs text-ink-soft">{s.roles.join(", ")}</span></span></label>)}
              </fieldset>
              <SubmitButton>Save booking</SubmitButton>
            </ActionForm>
          </Panel>
          <Panel title="Confirmation">
            <p className="mb-3 text-sm text-ink-soft">Sends the confirmation template to {b.contactEmail}. Update the booking status separately.</p>
            <ActionForm action={emailBooking}><input type="hidden" name="id" value={id} /><input type="hidden" name="kind" value="confirmation" /><SubmitButton confirm="Send the booking confirmation to the client?">Send confirmation</SubmitButton></ActionForm>
          </Panel>
          {user.role === "ADMIN" && <form action={deleteBooking}><input type="hidden" name="id" value={id} /><SubmitButton variant="danger" confirm="Permanently delete this booking and its activity log?">Delete booking</SubmitButton></form>}
        </div>
      </div>
    </>
  );
}
