import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteRedirect, saveRedirect } from "@/app/admin/actions/seo";
import { Field, Notice, PageHeader, Panel, Select, Table, fmtDate, td } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

export default async function RedirectsPage({ searchParams }: PageProps<"/admin/seo/redirects">) {
  await requireUser();
  const sp = await searchParams;
  const rows = await db.redirect.findMany({ orderBy: [{ hits: "desc" }, { createdAt: "desc" }] });
  return (
    <>
      <PageHeader
        title="Redirects"
        intro="Use 301 when a page moves (keeps its Google ranking), 410 when a page is gone for good. Changes apply within a minute. Old WordPress spam URLs (casino, betting etc.) already return 410 automatically."
      />
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.deleted && <Notice>Deleted.</Notice>}
      {sp.error && <Notice tone="bad">Check the paths — a redirect needs a “from” path (not the homepage) and a destination (unless it&apos;s a 410), and can&apos;t point to itself.</Notice>}
      <Panel title="Add redirect" className="mb-4">
        <form action={saveRedirect} className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem_1fr_auto] sm:items-end">
          <Field label="From path" name="from" placeholder="/old-page" required />
          <Field label="To" name="to" placeholder="/services/house-cleaning" />
          <Select label="Type" name="code" options={[["301", "301 moved"], ["302", "302 temporary"], ["410", "410 gone"]]} />
          <Field label="Note" name="note" />
          <SubmitButton>Add</SubmitButton>
        </form>
      </Panel>
      <Table head={["From", "To", "Type", "Hits", "Last hit", "Note", ""]} empty={rows.length ? undefined : "No redirects yet."}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={`${td} font-mono text-xs`}>{r.from}</td>
            <td className={`${td} font-mono text-xs`}>{r.to ?? "—"}</td>
            <td className={td}>{r.code}</td>
            <td className={td}>{r.hits}</td>
            <td className={`${td} text-ink-soft`}>{fmtDate(r.lastHitAt)}</td>
            <td className={`${td} text-xs text-ink-soft`}>{r.note}</td>
            <td className={td}>
              <form action={deleteRedirect}>
                <input type="hidden" name="id" value={r.id} />
                <SubmitButton variant="ghost" className="text-coral-600" confirm="Delete this redirect?">
                  Delete
                </SubmitButton>
              </form>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
