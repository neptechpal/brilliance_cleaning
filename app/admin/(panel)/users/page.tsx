import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUser } from "@/app/admin/actions/seo";
import { Check, Field, Notice, PageHeader, Panel, Select, fmtDate } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

const ERRORS: Record<string, string> = {
  missing: "Name and email are required.",
  short: "Passwords must be at least 10 characters.",
  self: "You can't deactivate or demote your own account.",
};

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireAdmin();
  const sp = await searchParams;
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageHeader title="Users" intro="Staff can manage leads and content; admins can also change settings, users and delete records." />
      {sp.saved && <Notice>Saved.</Notice>}
      {typeof sp.error === "string" && <Notice tone="bad">{ERRORS[sp.error] ?? "Something went wrong."}</Notice>}
      <Panel title="Add user" className="mb-4">
        <form action={saveUser} className="grid gap-3 sm:grid-cols-5 sm:items-end">
          <Field label="Name" name="name" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Password" name="password" type="password" minLength={10} required autoComplete="new-password" />
          <Select label="Role" name="role" options={["STAFF", "ADMIN"]} />
          <SubmitButton>Add user</SubmitButton>
        </form>
      </Panel>
      <div className="space-y-3">
        {users.map((u) => (
          <Panel key={u.id}>
            <form action={saveUser} className="grid gap-3 sm:grid-cols-6 sm:items-end">
              <input type="hidden" name="id" value={u.id} />
              <Field label="Name" name="name" defaultValue={u.name} />
              <Field label="Email" name="email" type="email" defaultValue={u.email} />
              <Field label="New password" name="password" type="password" placeholder="unchanged" autoComplete="new-password" />
              <Select label="Role" name="role" defaultValue={u.role} options={["STAFF", "ADMIN"]} />
              <div className="pb-2">
                <Check label="Active" name="active" defaultChecked={u.active} />
                <p className="mt-1 text-xs text-ink-soft">Last login {fmtDate(u.lastLoginAt)}</p>
              </div>
              <SubmitButton variant="ghost">Save</SubmitButton>
            </form>
          </Panel>
        ))}
      </div>
    </>
  );
}
