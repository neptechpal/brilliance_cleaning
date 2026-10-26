import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteReview, saveReview } from "@/app/admin/actions/content";
import { Area, Check, Field, Notice, PageHeader, Panel, Select } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

export default async function ReviewsAdmin({ searchParams }: PageProps<"/admin/reviews">) {
  await requireUser();
  const sp = await searchParams;
  const reviews = await db.review.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  const form = (r?: (typeof reviews)[number]) => (
    <form action={saveReview} className="grid gap-3 sm:grid-cols-4">
      {r && <input type="hidden" name="id" value={r.id} />}
      <Field label="Customer name" name="author" required defaultValue={r?.author} />
      <Select label="Rating" name="rating" defaultValue={String(r?.rating ?? 5)} options={["5", "4", "3", "2", "1"]} />
      <Field label="Suburb" name="suburb" defaultValue={r?.suburb ?? ""} />
      <Field label="Date" name="reviewDate" type="date" defaultValue={r?.reviewDate?.toISOString().slice(0, 10) ?? ""} />
      <Area label="Review text (copy exactly)" name="text" rows={3} required defaultValue={r?.text} className="sm:col-span-4" />
      <Field label="Source" name="source" defaultValue={r?.source ?? "Google"} />
      <Field label="Service slug (optional)" name="serviceSlug" defaultValue={r?.serviceSlug ?? ""} />
      <Field label="Order" name="sortOrder" type="number" defaultValue={r?.sortOrder ?? 0} />
      <div className="flex items-end gap-3 pb-1">
        <Check label="Show on site" name="active" defaultChecked={r?.active ?? true} />
      </div>
      <div className="flex gap-2 sm:col-span-4">
        <SubmitButton variant={r ? "ghost" : "primary"}>{r ? "Save" : "Add review"}</SubmitButton>
        {r && (
          <SubmitButton variant="ghost" formAction={deleteReview} className="text-coral-600" confirm="Delete this review?">
            Delete
          </SubmitButton>
        )}
      </div>
    </form>
  );
  return (
    <>
      <PageHeader
        title="Reviews"
        intro="Add genuine reviews only (e.g. copied from your Google Business Profile). The reviews section stays hidden on the site until at least one is added. Fake or edited reviews breach Australian Consumer Law."
      />
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.deleted && <Notice>Deleted.</Notice>}
      <Panel title="Add a review" className="mb-4">
        {form()}
      </Panel>
      <div className="space-y-3">
        {reviews.map((r) => (
          <Panel key={r.id}>{form(r)}</Panel>
        ))}
      </div>
    </>
  );
}
