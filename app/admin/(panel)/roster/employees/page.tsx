import Link from "next/link";
import { Plus, Phone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { RosterTabs } from "@/components/admin/RosterTabs";
import { Badge, LinkBtn, PageHeader, Table, fmtDate, td } from "@/components/admin/ui";

export default async function EmployeesPage({ searchParams }: PageProps<"/admin/roster/employees">) {
  await requireUser();
  const sp = await searchParams;
  const showAll = sp.all === "1";
  const employees = await db.employee.findMany({
    where: showAll ? {} : { active: true },
    include: { costCentre: true, _count: { select: { attendance: true } } },
    orderBy: [{ active: "desc" }, { firstName: "asc" }],
  });
  return (
    <>
      <PageHeader
        title="Employees"
        intro="Roster staff and their portal logins. Staff sign in at /brilliance-roster with their email and password."
        actions={
          <LinkBtn href="/admin/roster/employees/new">
            <Plus className="size-4" /> Add employee
          </LinkBtn>
        }
      />
      <RosterTabs active="/admin/roster/employees" />
      <p className="mb-3 text-sm">
        <Link href={showAll ? "/admin/roster/employees" : "/admin/roster/employees?all=1"} className="font-semibold text-brand-700 hover:underline">
          {showAll ? "Show active only" : "Include inactive employees"}
        </Link>
      </p>
      <Table head={["Employee", "Contact", "Site / team", "Portal", "Records", "Status"]}>
        {employees.map((e) => (
          <tr key={e.id}>
            <td className={td}>
              <Link href={`/admin/roster/employees/${e.id}`} className="flex items-center gap-2 font-semibold text-ink hover:text-brand-700">
                <span className="flex size-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: e.color || "#0b7a5f" }}>
                  {e.firstName[0]}
                  {e.lastName[0]}
                </span>
                {e.firstName} {e.lastName}
              </Link>
            </td>
            <td className={td}>
              <span className="block text-xs">{e.email}</span>
              <a href={`tel:${e.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-coral-600">
                <Phone className="size-3" /> {e.phone}
              </a>
            </td>
            <td className={td}>{e.costCentre?.name ?? "—"}</td>
            <td className={td}>
              {e.passwordHash ? <Badge tone="ok">Password set</Badge> : <Badge tone="bad">No password</Badge>}
              <span className="block text-xs text-ink-soft">Last login {fmtDate(e.lastLoginAt)}</span>
            </td>
            <td className={td}>{e._count.attendance}</td>
            <td className={td}>{e.active ? <Badge tone="ok">Active</Badge> : <Badge>Inactive</Badge>}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
