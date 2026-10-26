import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFaq, saveFaq } from "@/app/admin/actions/content";
import { Area, Check, Field, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

export default async function FaqsAdmin({ searchParams }: PageProps<"/admin/faqs">) {
  await requireUser();
  const sp = await searchParams;
  const faqs = await db.faq.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  return (
    <>
      <PageHeader title="Site FAQs" intro="Shown on /faq (grouped by category) and the first 7 on the homepage, with FAQ structured data. Service and area FAQs are edited on their own pages." />
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.deleted && <Notice>Deleted.</Notice>}
      <Panel title="Add FAQ" className="mb-4">
        <form action={saveFaq} className="grid gap-3 sm:grid-cols-[1fr_10rem_6rem]">
          <Field label="Question" name="q" required />
          <Field label="Category" name="category" defaultValue="Booking" />
          <Field label="Order" name="sortOrder" type="number" defaultValue={faqs.length} />
          <Area label="Answer" name="a" rows={3} required className="sm:col-span-3" />
          <input type="hidden" name="active" value="on" />
          <div>
            <SubmitButton>Add FAQ</SubmitButton>
          </div>
        </form>
      </Panel>
      <div className="space-y-3">
        {faqs.map((f) => (
          <Panel key={f.id}>
            <form action={saveFaq} className="grid gap-3 sm:grid-cols-[1fr_10rem_6rem]">
              <input type="hidden" name="id" value={f.id} />
              <Field label="Question" name="q" defaultValue={f.q} required />
              <Field label="Category" name="category" defaultValue={f.category} />
              <Field label="Order" name="sortOrder" type="number" defaultValue={f.sortOrder} />
              <Area label="Answer" name="a" rows={3} defaultValue={f.a} required className="sm:col-span-3" />
              <div className="flex items-center gap-4 sm:col-span-3">
                <Check label="Live" name="active" defaultChecked={f.active} />
                <SubmitButton variant="ghost">Save</SubmitButton>
                <SubmitButton variant="ghost" formAction={deleteFaq} className="text-coral-600" confirm="Delete this FAQ?">
                  Delete
                </SubmitButton>
              </div>
            </form>
          </Panel>
        ))}
      </div>
    </>
  );
}
