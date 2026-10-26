import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Inclusion, QA, Step } from "@/lib/data";
import { faqsToText, inclusionsToText, stepsToText } from "@/lib/admin-format";
import { deleteService, saveService } from "@/app/admin/actions/content";
import { Area, Check, Field, Notice, PageHeader, Panel, Select } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { MarkdownField } from "@/components/admin/MarkdownField";
import { SeoAssistant } from "@/components/admin/SeoAssistant";

export default async function ServiceEdit({ params, searchParams }: PageProps<"/admin/services/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const s = id === "new" ? null : await db.service.findUnique({ where: { id: Number(id) } });
  if (id !== "new" && !s) notFound();
  const all = await db.service.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } });

  return (
    <>
      <Link href="/admin/services" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Services
      </Link>
      <PageHeader
        title={s ? s.name : "New service"}
        actions={
          s?.active && (
            <a href={`/services/${s.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:bg-sand">
              <ExternalLink className="size-4" /> View page
            </a>
          )
        }
      />
      {sp.saved && <Notice>Saved — the live page updates immediately.</Notice>}

      <form id="service-form" action={saveService} className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <input type="hidden" name="id" value={s?.id ?? ""} />
        <div className="space-y-4">
          <Panel title="Basics">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" name="name" required defaultValue={s?.name} />
              <Field label="URL slug" name="slug" defaultValue={s?.slug} hint="Changing a live slug? Add a redirect from the old URL." />
              <Select
                label="Category"
                name="category"
                defaultValue={s?.category ?? "residential"}
                options={[
                  ["residential", "Home cleaning"],
                  ["commercial", "Business & venues"],
                  ["specialist", "Specialist"],
                ]}
              />
              <Field label="Icon (lucide name)" name="icon" defaultValue={s?.icon ?? ""} hint="e.g. Sparkles, Home, Building2, KeyRound" />
              <Field label="Price from ($)" name="priceFrom" type="number" defaultValue={s?.priceFrom ?? ""} hint="Leave blank to hide pricing" />
              <Field label="Price note" name="priceNote" defaultValue={s?.priceNote ?? ""} hint="e.g. per hour, 2 hr minimum" />
              <Field label="Sort order" name="sortOrder" type="number" defaultValue={s?.sortOrder ?? 0} />
              <div className="flex flex-col justify-end gap-2 pb-1">
                <Check label="Live on site" name="active" defaultChecked={s?.active ?? false} />
                <Check label="Featured on homepage" name="featured" defaultChecked={s?.featured ?? false} />
              </div>
            </div>
          </Panel>
          <Panel title="Search appearance">
            <div className="grid gap-3">
              <Field label="Meta title" name="metaTitle" defaultValue={s?.metaTitle ?? ""} maxLength={70} hint="Brand is appended automatically when it fits." />
              <Area label="Meta description" name="metaDescription" rows={2} defaultValue={s?.metaDescription ?? ""} maxLength={200} />
            </div>
          </Panel>
          <Panel title="Page content">
            <div className="grid gap-3">
              <Field label="H1 heading" name="h1" defaultValue={s?.h1 ?? ""} />
              <Area label="Hero intro" name="heroIntro" rows={3} defaultValue={s?.heroIntro ?? ""} />
              <Area label="Card summary (≤ 25 words)" name="summary" rows={2} defaultValue={s?.summary ?? ""} />
              <MarkdownField name="body" label="Main content" defaultValue={s?.body ?? ""} />
            </div>
          </Panel>
          <Panel title="Checklist, process & FAQs">
            <div className="grid gap-3 lg:grid-cols-2">
              <Area label="What's included" name="inclusions" mono rows={14} defaultValue={inclusionsToText((s?.inclusions as Inclusion[]) ?? [])} hint="## Room name, then - one item per line" />
              <Area label="Not included (one per line)" name="exclusions" mono rows={14} defaultValue={s?.exclusions.join("\n") ?? ""} />
              <Area label="Process steps" name="process" mono rows={10} defaultValue={stepsToText((s?.process as Step[]) ?? [])} hint="## Step title, then the description on the next line" />
              <Area label="Ideal for (one per line)" name="idealFor" mono rows={10} defaultValue={s?.idealFor.join("\n") ?? ""} />
              <Area label="FAQs" name="faqs" mono rows={14} className="lg:col-span-2" defaultValue={faqsToText((s?.faqs as QA[]) ?? [])} hint="Q: question / A: answer, blank line between each. Shown on the page and as FAQ rich results." />
            </div>
          </Panel>
        </div>
        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Panel>
            <SubmitButton className="w-full">Save service</SubmitButton>
          </Panel>
          <SeoAssistant formId="service-form" path={`/services/${s?.slug ?? "new"}`} bodyFields={["heroIntro", "body"]} defaultKeyword={s?.keywords[0] ?? ""} minWords={700} />
          <Panel title="Targeting">
            <div className="space-y-3">
              <Area label="Keywords (one per line, primary first)" name="keywords" mono rows={6} defaultValue={s?.keywords.join("\n") ?? ""} />
              <Area label="Related services (slugs)" name="related" mono rows={4} defaultValue={s?.related.join("\n") ?? ""} hint={`Available: ${all.map((x) => x.slug).join(", ")}`} />
            </div>
          </Panel>
        </div>
      </form>
      {s && user.role === "ADMIN" && (
        <form action={deleteService} className="mt-6">
          <input type="hidden" name="id" value={s.id} />
          <SubmitButton variant="danger" confirm={`Delete ${s.name}? Consider setting it to Draft instead.`}>
            Delete service
          </SubmitButton>
        </form>
      )}
    </>
  );
}
