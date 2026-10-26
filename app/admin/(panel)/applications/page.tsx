import Link from "next/link";
import type { ApplicationStatus, Prisma } from "@prisma/client";
import { Download, Phone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { APPLICATION_STATUSES, QUALIFICATIONS, ROLES } from "@/lib/staffing";
import { Badge, Notice, PageHeader, Table, fmtDate, td } from "@/components/admin/ui";

const PER = 50;
const TONE: Record<string, string> = { NEW: "NEW", REVIEWING: "CONTACTED", INTERVIEW: "QUOTED", APPROVED: "WON", REJECTED: "LOST", ARCHIVED: "SPAM" };

export default async function ApplicationsPage({ searchParams }: PageProps<"/admin/applications">) {
  await requireUser();
  const sp = await searchParams;
  const status = typeof sp.status === "string" && (APPLICATION_STATUSES as readonly string[]).includes(sp.status) ? (sp.status as ApplicationStatus) : undefined;
  const role = typeof sp.role === "string" ? sp.role : "";
  const qual = typeof sp.qual === "string" ? sp.qual : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.StaffApplicationWhereInput = {
    ...(status ? { status } : { status: { notIn: ["ARCHIVED", "REJECTED"] } }),
    ...(role ? { roles: { has: role } } : {}),
    ...(qual ? { qualifications: { has: qual } } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { locations: { contains: q, mode: "insensitive" } },
            { experience: { contains: q, mode: "insensitive" } },
            { expertise: { has: q } },
          ],
        }
      : {}),
  };
  const [apps, total, counts] = await Promise.all([
    db.staffApplication.findMany({ where, orderBy: { createdAt: "desc" }, take: PER, skip: (page - 1) * PER, include: { files: { where: { kind: "photo" }, select: { id: true } } } }),
    db.staffApplication.count({ where }),
    db.staffApplication.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, role, qual, q, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <PageHeader
        title="Staff applications"
        intro="Applications from the Join our team page (/careers). CVs and certificates are stored privately on the server."
        actions={
          <a href={`/api/admin/applications/export${qs({})}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:bg-sand">
            <Download className="size-4" /> Export CSV
          </a>
        }
      />
      {sp.deleted && <Notice>Application deleted (including its files).</Notice>}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={`/admin/applications${qs({ status: undefined })}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${!status ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line"}`}>
          Active
        </Link>
        {APPLICATION_STATUSES.map((s) => (
          <Link key={s} href={`/admin/applications${qs({ status: s })}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${status === s ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line"}`}>
            {s.charAt(0) + s.slice(1).toLowerCase()} <span className="opacity-60">{count(s)}</span>
          </Link>
        ))}
      </div>
      <form className="mb-4 flex flex-wrap gap-2" action="/admin/applications">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="Search name, phone, suburb, skill…" className="min-w-[14rem] flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm" />
        <select name="role" defaultValue={role} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select name="qual" defaultValue={qual} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
          <option value="">Any qualification</option>
          {QUALIFICATIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>
      <Table head={["Applied", "Applicant", "Roles", "Areas", "Availability", "Status"]} empty={apps.length ? undefined : "No applications match."}>
        {apps.map((a) => (
          <tr key={a.id} className={a.status === "NEW" ? "bg-coral-50/40" : ""}>
            <td className={`${td} whitespace-nowrap text-ink-soft`}>{fmtDate(a.createdAt)}</td>
            <td className={td}>
              <Link href={`/admin/applications/${a.id}`} className="flex items-center gap-2.5 font-semibold text-ink hover:text-brand-700">
                {a.files[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/admin/files/${a.files[0].id}`} alt="" className="size-8 rounded-full object-cover" />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-full bg-sand text-xs font-bold text-ink-soft">
                    {a.firstName[0]}
                    {a.lastName[0]}
                  </span>
                )}
                <span className="hover:underline">
                  {a.firstName} {a.lastName}
                </span>
              </Link>
              <a href={`tel:${(a.phone ?? "").replace(/\s/g, "")}`} className="mt-0.5 flex items-center gap-1 pl-[2.6rem] text-xs text-ink-soft hover:text-coral-600">
                <Phone className="size-3" /> {a.phone}
              </a>
            </td>
            <td className={td}>{a.roles.join(", ") || "—"}</td>
            <td className={`${td} max-w-[12rem] truncate`}>{a.locations}</td>
            <td className={td}>{a.availability.length}/21 slots</td>
            <td className={td}>
              <Badge tone={TONE[a.status]}>{a.status}</Badge>
              {a.rating ? <span className="ml-1 text-xs text-amber-500">{"★".repeat(a.rating)}</span> : null}
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
              <Link href={`/admin/applications${qs({ page: String(page - 1) })}`} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-line">
                ← Prev
              </Link>
            )}
            {page * PER < total && (
              <Link href={`/admin/applications${qs({ page: String(page + 1) })}`} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-line">
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
