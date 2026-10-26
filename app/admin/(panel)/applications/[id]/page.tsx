import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText, Mail, MessageSquare, Phone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { channelLabel } from "@/lib/attribution";
import { APPLICATION_STATUSES, DAY_PARTS, DAYS } from "@/lib/staffing";
import { addApplicationNote, deleteApplication, updateApplication } from "@/app/admin/actions/applications";
import { Badge, Notice, PageHeader, Panel, Select, fmtDate } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

import { StaffProfileForm } from "@/components/admin/StaffProfileForm";

const TONE: Record<string, string> = { NEW: "NEW", REVIEWING: "CONTACTED", INTERVIEW: "QUOTED", APPROVED: "WON", REJECTED: "LOST", ARCHIVED: "SPAM" };
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

export default async function ApplicationPage({ params, searchParams }: PageProps<"/admin/applications/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const a = await db.staffApplication.findUnique({
    where: { id },
    include: { files: { orderBy: { id: "asc" } }, notes: { orderBy: { createdAt: "desc" } } },
  });
  if (!a) notFound();
  const sp = await searchParams;
  const photo = a.files.find((f) => f.kind === "photo");
  const docs = a.files.filter((f) => f.kind !== "photo");
  const tel = (a.phone ?? "").replace(/\s/g, "");
  const avail = new Set(a.availability);

  const details: [string, React.ReactNode][] = [
    ["Source", a.source],
    ["Active", a.active ? "Yes" : "No"],
    ["Roles", a.roles.join(", ")],
    ["Area of expertise", a.expertise.join(", ")],
    ["Qualifications", a.qualifications.join(", ")],
    ["Work rights", a.workRights],
    ["Employment type", a.employmentType.join(", ")],
    ["Preferred areas", a.locations],
    ["Shift types", a.shiftTypes.join(", ")],
    ["Own transport", a.ownTransport ? "Yes" : "No"],
    ["Languages", a.languages],
    [
      "LinkedIn / portfolio",
      a.linkedinUrl && (
        <a href={a.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
          Open <ExternalLink className="size-3" />
        </a>
      ),
    ],
  ];

  return (
    <>
      <Link href="/admin/applications" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Staff applications
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/admin/files/${photo.id}`} alt="" className="size-20 rounded-full object-cover ring-2 ring-white shadow" />
        ) : (
          <span className="flex size-20 items-center justify-center rounded-full bg-white text-2xl font-extrabold text-ink-soft ring-1 ring-line">
            {a.firstName[0]}
            {a.lastName[0]}
          </span>
        )}
        <div className="flex-1">
          <PageHeader
            title={`${a.firstName} ${a.lastName}`}
            intro={
              <>
                Application #{a.id} · {fmtDate(a.createdAt)} · <Badge tone={TONE[a.status]}>{a.status}</Badge>
                {a.spamReason && <span className="ml-2 text-coral-600">Auto-archived: {a.spamReason}</span>}
              </>
            }
            actions={
              <>
                {a.phone && <><a href={`tel:${tel}`} className="inline-flex items-center gap-1.5 rounded-lg bg-coral-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-coral-700">
                  <Phone className="size-4" /> {a.phone}
                </a>
                <a href={`sms:${tel}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:bg-sand">
                  <MessageSquare className="size-4" /> SMS
                </a></>}
                {a.email && <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:bg-sand">
                  <Mail className="size-4" /> {a.email}
                </a>}
              </>
            }
          />
        </div>
      </div>

      {sp.saved && <Notice>Staff profile saved.</Notice>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Edit profile"><StaffProfileForm staff={a} /></Panel>
          <Panel title="Experience">
            <p className="whitespace-pre-wrap text-sm text-ink">{a.experience}</p>
          </Panel>
          <Panel title="Details">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {details
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-semibold text-ink-soft">{k}</dt>
                    <dd className="text-sm text-ink">{v}</dd>
                  </div>
                ))}
            </dl>
          </Panel>
          <Panel title={`Availability (${a.availability.length}/21)`}>
            <table className="w-full max-w-md text-sm">
              <thead>
                <tr className="text-xs text-ink-soft">
                  <th />
                  {DAY_PARTS.map((p) => (
                    <th key={p} className="py-1 font-semibold capitalize">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((d) => (
                  <tr key={d}>
                    <th className="py-1 pr-3 text-left font-semibold text-ink">{d}</th>
                    {DAY_PARTS.map((p) => (
                      <td key={p} className="p-1 text-center">
                        <span className={`block rounded-md py-1 text-xs font-bold ${avail.has(`${d}:${p}`) ? "bg-brand-600 text-white" : "bg-sand text-ink-soft/40"}`}>
                          {avail.has(`${d}:${p}`) ? "✓" : "–"}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="Documents">
            {docs.length ? (
              <ul className="divide-y divide-line">
                {docs.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <a href={`/api/admin/files/${f.id}`} target="_blank" className="flex min-w-0 items-center gap-2 text-ink hover:text-brand-700">
                      <FileText className="size-4 shrink-0 text-brand-600" />
                      <span className="truncate">{f.originalName}</span>
                      <span className="shrink-0 text-xs text-ink-soft">
                        {f.kind === "resume" ? "CV" : "Certificate"} · {kb(f.size)}
                      </span>
                    </a>
                    <a href={`/api/admin/files/${f.id}?download=1`} className="shrink-0 text-ink-soft hover:text-ink" aria-label={`Download ${f.originalName}`}>
                      <Download className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">No documents uploaded.</p>
            )}
          </Panel>
          <Panel title="Notes & history">
            <form action={addApplicationNote} className="flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="id" value={a.id} />
              <textarea name="body" required rows={2} placeholder="e.g. Phone screen done, RSA verified, available weekends." className="flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
              <SubmitButton>Add note</SubmitButton>
            </form>
            <ul className="mt-4 space-y-3">
              {a.notes.map((n) => (
                <li key={n.id} className="rounded-lg border border-line p-3 text-sm">
                  <p className="whitespace-pre-wrap text-ink">{n.body}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {n.authorName} · {fmtDate(n.createdAt)}
                  </p>
                </li>
              ))}
              {!a.notes.length && <li className="text-sm text-ink-soft">No notes yet.</li>}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Status">
            <form action={updateApplication} className="space-y-3">
              <input type="hidden" name="id" value={a.id} />
              <Select label="Status" name="status" defaultValue={a.status} options={[...APPLICATION_STATUSES]} />
              <Select
                label="Rating"
                name="rating"
                defaultValue={String(a.rating ?? "")}
                options={[
                  ["", "Not rated"],
                  ["5", "★★★★★"],
                  ["4", "★★★★"],
                  ["3", "★★★"],
                  ["2", "★★"],
                  ["1", "★"],
                ]}
              />
              <SubmitButton className="w-full">Update</SubmitButton>
            </form>
          </Panel>
          <Panel title="References & emergency">
            <dl className="space-y-2.5 text-sm">
              {(
                [
                  ["Referee 1", a.referee1],
                  ["Referee 2", a.referee2],
                  ["Emergency contact", [a.emergencyName, a.emergencyPhone].filter(Boolean).join(" · ")],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold text-ink-soft">{k}</dt>
                  <dd className="text-ink">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Declaration">
            <p className="text-sm text-ink">
              Consent: <b>{a.consent ? "Agreed" : "No"}</b>
            </p>
            <p className="mt-1 text-sm text-ink">
              Signed: <span className="font-semibold italic">{a.signature}</span>
            </p>
            <p className="mt-3 text-xs text-ink-soft">
              Source: {channelLabel(a.channel)} · {a.device} · email {a.emailSent ? "sent" : a.emailError ? `failed (${a.emailError})` : "not sent"}
            </p>
          </Panel>
          {user.role === "ADMIN" && (
            <form action={deleteApplication}>
              <input type="hidden" name="id" value={a.id} />
              <SubmitButton variant="danger" confirm="Delete this application and its uploaded files permanently?" className="w-full">
                Delete application
              </SubmitButton>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
