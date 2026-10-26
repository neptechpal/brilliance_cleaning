import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveEmployee } from "@/app/admin/actions/roster";
import { fmt12, fmtDuration, fmtInstant, minutesBetween } from "@/lib/sydney";
import { Area, Check, Field, Notice, PageHeader, Panel, Select, Table, td } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

const ERR: Record<string, string> = {
  missing: "First name, last name, email and phone are required.",
  short: "Passwords must be at least 8 characters.",
  email: "That email is already used by another employee.",
};

export default async function EmployeeEdit({ params, searchParams }: PageProps<"/admin/roster/employees/[id]">) {
  await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const e = id === "new" ? null : await db.employee.findUnique({ where: { id: Number(id) } });
  if (id !== "new" && !e) notFound();
  const [sites, upcoming, recent] = await Promise.all([
    db.costCentre.findMany({ orderBy: { name: "asc" } }),
    e ? db.shift.findMany({ where: { employeeId: e.id, status: "SCHEDULED" }, orderBy: [{ date: "desc" }], take: 10 }) : [],
    e ? db.attendance.findMany({ where: { employeeId: e.id }, include: { shift: true }, orderBy: { signInAt: "desc" }, take: 10 }) : [],
  ]);
  return (
    <>
      <Link href="/admin/roster/employees" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Employees
      </Link>
      <PageHeader title={e ? `${e.firstName} ${e.lastName}` : "Add employee"} />
      {sp.saved && <Notice>Saved.</Notice>}
      {typeof sp.error === "string" && <Notice tone="bad">{ERR[sp.error] ?? "Could not save."}</Notice>}
      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <form action={saveEmployee} className="space-y-4">
          <input type="hidden" name="id" value={e?.id ?? ""} />
          <Panel title="Portal login">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name" name="firstName" required defaultValue={e?.firstName} />
              <Field label="Last name" name="lastName" required defaultValue={e?.lastName} />
              <Field label="Email (username)" name="email" type="email" required defaultValue={e?.email} />
              <Field
                label={e?.passwordHash ? "New password (leave blank to keep)" : "Password"}
                name="password"
                type="text"
                autoComplete="off"
                minLength={8}
                required={!e}
                hint="Share it with the employee by SMS; they can change it after logging in."
              />
              <div className="sm:col-span-2">
                <Check label="Ask the employee to choose a new password at next login" name="mustSetPassword" defaultChecked={e ? e.mustSetPassword : true} />
              </div>
            </div>
          </Panel>
          <Panel title="Contact & emergency">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone" name="phone" required defaultValue={e?.phone} />
              <Field label="Home address" name="address" defaultValue={e?.address ?? ""} />
              <Field label="Emergency contact name" name="emergencyName" defaultValue={e?.emergencyName ?? ""} />
              <Field label="Emergency contact phone" name="emergencyPhone" defaultValue={e?.emergencyPhone ?? ""} />
              <Area label="Comments / notes" name="comments" rows={3} className="sm:col-span-2" defaultValue={e?.comments ?? ""} />
            </div>
          </Panel>
          <Panel title="Team">
            <div className="grid gap-3 sm:grid-cols-3">
              <Select label="Site / team" name="costCentreId" defaultValue={String(e?.costCentreId ?? "")} options={[["", "— None —"], ...sites.map((s) => [String(s.id), s.name] as [string, string])]} />
              <Field label="Colour" name="color" type="color" defaultValue={e?.color ?? "#0b7a5f"} />
              <div className="flex items-end pb-2">
                <Check label="Active" name="active" defaultChecked={e?.active ?? true} hint="Inactive staff can't log in and are hidden from the roster." />
              </div>
            </div>
          </Panel>
          <SubmitButton>{e ? "Save employee" : "Create employee"}</SubmitButton>
        </form>
        {e && (
          <div className="space-y-4">
            <Panel title="Scheduled shifts">
              <ul className="space-y-1.5 text-sm">
                {upcoming.map((s) => (
                  <li key={s.id}>
                    {s.date} · {fmt12(s.startTime)}–{fmt12(s.endTime)} · {s.siteName}
                  </li>
                ))}
                {!upcoming.length && <li className="text-ink-soft">None.</li>}
              </ul>
            </Panel>
            <Panel title="Recent attendance">
              <Table head={["Signed in", "Site", "Duration"]}>
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td className={td}>{fmtInstant(a.signInAt)}</td>
                    <td className={td}>{a.shift?.siteName ?? "Ad hoc"}</td>
                    <td className={td}>{fmtDuration(minutesBetween(a.signInAt, a.signOutAt))}</td>
                  </tr>
                ))}
              </Table>
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}
