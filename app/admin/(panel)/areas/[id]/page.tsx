import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { QA } from "@/lib/data";
import { faqsToText } from "@/lib/admin-format";
import { deleteArea, saveArea } from "@/app/admin/actions/content";
import { Area, Check, Field, Notice, PageHeader, Panel, Select } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { MarkdownField } from "@/components/admin/MarkdownField";
import { SeoAssistant } from "@/components/admin/SeoAssistant";

export default async function AreaEdit({ params, searchParams }: PageProps<"/admin/areas/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const a = id === "new" ? null : await db.area.findUnique({ where: { id: Number(id) } });
  if (id !== "new" && !a) notFound();
  const [hubs, services] = await Promise.all([
    db.area.findMany({ where: { isHub: true }, orderBy: { sortOrder: "asc" } }),
    db.service.findMany({ where: { active: true }, select: { slug: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <Link href="/admin/areas" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Areas
      </Link>
      <PageHeader
        title={a ? a.name : "New area"}
        actions={
          a?.active && (
            <a href={`/areas/${a.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:bg-sand">
              <ExternalLink className="size-4" /> View page
            </a>
          )
        }
      />
      {sp.saved && <Notice>Saved — the live page updates immediately.</Notice>}
      <form id="area-form" action={saveArea} className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <input type="hidden" name="id" value={a?.id ?? ""} />
        <div className="space-y-4">
          <Panel title="Basics">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Name" name="name" required defaultValue={a?.name} />
              <Field label="URL slug" name="slug" defaultValue={a?.slug} />
              <Field label="Postcode" name="postcode" defaultValue={a?.postcode ?? ""} />
              <Select label="Region (hub)" name="region" defaultValue={a?.region ?? "newcastle"} options={hubs.map((h) => [h.slug, h.name] as [string, string])} />
              <Field label="Latitude" name="lat" defaultValue={a?.lat ?? ""} />
              <Field label="Longitude" name="lng" defaultValue={a?.lng ?? ""} />
              <Field label="Sort order" name="sortOrder" type="number" defaultValue={a?.sortOrder ?? 0} />
              <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-end sm:gap-6 sm:pb-1">
                <Check label="Region hub" name="isHub" defaultChecked={a?.isHub ?? false} />
                <Check label="Live on site" name="active" defaultChecked={a?.active ?? true} />
                <Check label="Indexable" name="indexable" defaultChecked={a?.indexable ?? true} />
              </div>
            </div>
          </Panel>
          <Panel title="Search appearance">
            <div className="grid gap-3">
              <Field label="Meta title" name="metaTitle" defaultValue={a?.metaTitle ?? ""} maxLength={70} />
              <Area label="Meta description" name="metaDescription" rows={2} defaultValue={a?.metaDescription ?? ""} maxLength={200} />
            </div>
          </Panel>
          <Panel title="Local content">
            <div className="grid gap-3">
              <Field label="H1 heading" name="h1" defaultValue={a?.h1 ?? ""} />
              <Area label="Intro (shown in the hero)" name="intro" rows={5} defaultValue={a?.intro ?? ""} />
              <MarkdownField name="localContent" label="Local content (unique to this suburb)" defaultValue={a?.localContent ?? ""} rows={16} />
              <Area label="Local FAQs" name="faqs" mono rows={8} defaultValue={faqsToText((a?.faqs as QA[]) ?? [])} hint="Q: … / A: … blocks separated by a blank line" />
            </div>
          </Panel>
        </div>
        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Panel>
            <SubmitButton className="w-full">Save area</SubmitButton>
          </Panel>
          <SeoAssistant formId="area-form" path={`/areas/${a?.slug ?? "new"}`} bodyFields={["intro", "localContent"]} defaultKeyword={a ? `cleaners ${a.name.toLowerCase()}` : ""} minWords={a?.isHub ? 500 : 300} />
          <Panel title="Linking">
            <div className="space-y-3">
              <Area label="Top services (slugs, one per line)" name="topServices" mono rows={3} defaultValue={a?.topServices.join("\n") ?? ""} hint={`Active: ${services.map((s) => s.slug).join(", ")}`} />
              <Area label="Nearby areas (slugs)" name="nearby" mono rows={4} defaultValue={a?.nearby.join("\n") ?? ""} />
              <Area label="Landmarks (one per line)" name="landmarks" mono rows={4} defaultValue={a?.landmarks.join("\n") ?? ""} />
            </div>
          </Panel>
        </div>
      </form>
      {a && user.role === "ADMIN" && (
        <form action={deleteArea} className="mt-6">
          <input type="hidden" name="id" value={a.id} />
          <SubmitButton variant="danger" confirm={`Delete ${a.name}? Add a redirect if the page was indexed.`}>
            Delete area
          </SubmitButton>
        </form>
      )}
    </>
  );
}
