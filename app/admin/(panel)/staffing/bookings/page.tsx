import Link from "next/link";
import { BookingStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDay } from "@/lib/sydney";
import { Badge, LinkBtn, Notice, PageHeader, Table, td } from "@/components/admin/ui";

const PER = 50;
export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const sp = await searchParams;
  const status = Object.values(BookingStatus).find((s) => s === sp.status);
  const page = Math.max(1, Math.floor(Number(sp.page) || 1));
  const where = status ? { status } : {};
  const [rows, total] = await Promise.all([
    db.staffBooking.findMany({ where, orderBy: { createdAt: "desc" }, take: PER, skip: (page - 1) * PER }),
    db.staffBooking.count({ where }),
  ]);
  const href = (p: number) => `?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) })}`;
  return (
    <>
      <PageHeader title="Staff bookings" intro={`${total} booking${total === 1 ? "" : "s"}`} />
      {sp.deleted && <Notice>Booking deleted.</Notice>}
      <div className="mb-4 flex flex-wrap gap-2">
        {["", ...Object.values(BookingStatus)].map((s) => (
          <Link key={s} href={s ? `?status=${s}` : "/admin/staffing/bookings"} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${(status ?? "") === s ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line"}`}>{s || "All"}</Link>
        ))}
      </div>
      <Table head={["Booking", "Shift (Sydney)", "Staff requested", "Contact", "Estimate ex GST", "Status"]} empty={rows.length ? undefined : "No bookings match."}>
        {rows.map((b) => (
          <tr key={b.id}>
            <td className={td}><Link className="font-semibold text-brand-700 hover:underline" href={`/admin/staffing/bookings/${b.id}`}>#{b.id} · {b.venue}</Link><p className="text-xs text-ink-soft">{b.address}</p></td>
            <td className={td}>{fmtDay(b.date)}<p>{b.startTime}–{b.endTime}</p></td>
            <td className={td}>{b.quantity} × {b.position}</td>
            <td className={td}>{b.contactName}<p className="text-xs text-ink-soft">{b.contactEmail}</p></td>
            <td className={td}>{b.estimateAud == null ? "—" : `$${b.estimateAud.toFixed(2)}`}</td>
            <td className={td}><Badge>{b.status}</Badge></td>
          </tr>
        ))}
      </Table>
      <div className="mt-4 flex gap-2">
        {page > 1 && <LinkBtn variant="ghost" href={href(page - 1)}>← Previous</LinkBtn>}
        {page * PER < total && <LinkBtn variant="ghost" href={href(page + 1)}>Next →</LinkBtn>}
      </div>
    </>
  );
}
