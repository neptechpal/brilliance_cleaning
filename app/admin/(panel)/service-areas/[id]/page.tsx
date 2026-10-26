import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteServiceArea, saveServiceArea } from "@/app/admin/actions/content";
import { Area, Check, Field, Notice, PageHeader, Panel, Select } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { SeoAssistant } from "@/components/admin/SeoAssistant";

export default async function ServiceAreaEdit({ params, searchParams }: PageProps<"/admin/service-areas/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const r = id === "new" ? null : await db.serviceArea.findUnique({ where: { id: Number(id) } });
  if (id !== "new" && !r) notFound();
  const [services, areas] = await Promise.all([
    db.service.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    db.area.findMany({ orderBy: [{ isHub: "desc" }, { name: "asc" }], select: { slug: true, name: true, isHub: true } }),
  ]);
  const serviceSlug = r?.serviceSlug ?? (typeof sp.service === "string" ? sp.service : services[0]?.slug);
  const areaSlug = r?.areaSlug ?? (typeof sp.area === "string" ? sp.area : areas[0]?.slug);
  const svName = services.find((s) => s.slug === serviceSlug)?.name ?? "";
  const arName = areas.find((a) => a.slug === areaSlug)?.name ?? "";
  const path = `/services/${serviceSlug}/${areaSlug}`;

  return (
    <>
      <Link href="/admin/service-areas" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Service × area pages
      </Link>
      <PageHeader
        title={r ? `${svName} – ${arName}` : "New service × area page"}
        actions={
          r?.active && (
            <a href={path} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:bg-sand">
              <ExternalLink className="size-4" /> View page
            </a>
          )
        }
      />
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.exists && <Notice tone="warn">A page for that service and area already exists — you&apos;re editing it now.</Notice>}
      <form id="sa-form" action={saveServiceArea} className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <input type="hidden" name="id" value={r?.id ?? ""} />
        <div className="space-y-4">
          <Panel title="Page">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Service" name="serviceSlug" defaultValue={serviceSlug} options={services.map((s) => [s.slug, s.name] as [string, string])} />
              <Select label="Area" name="areaSlug" defaultValue={areaSlug} options={areas.map((a) => [a.slug, a.isHub ? `${a.name} (region)` : a.name] as [string, string])} />
              <Field label="Meta title" name="metaTitle" defaultValue={r?.metaTitle ?? (svName && arName ? `${svName} ${arName}` : "")} className="sm:col-span-2" />
              <Area label="Meta description" name="metaDescription" rows={2} defaultValue={r?.metaDescription ?? ""} className="sm:col-span-2" />
              <Field label="H1 heading" name="h1" defaultValue={r?.h1 ?? (svName && arName ? `${svName} in ${arName}` : "")} className="sm:col-span-2" />
              <Area label="Intro (unique to this service in this area)" name="intro" rows={8} defaultValue={r?.intro ?? ""} className="sm:col-span-2" hint="Blank line = new paragraph. Aim for 120+ words specific to this location." />
              <Area label="Local tips (one per line)" name="localTips" rows={5} defaultValue={r?.localTips.join("\n") ?? ""} className="sm:col-span-2" />
              <div className="flex gap-6">
                <Check label="Live" name="active" defaultChecked={r?.active ?? true} />
                <Check label="Indexable" name="indexable" defaultChecked={r?.indexable ?? true} />
              </div>
            </div>
          </Panel>
        </div>
        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Panel>
            <SubmitButton className="w-full">Save page</SubmitButton>
          </Panel>
          <SeoAssistant
            formId="sa-form"
            path={path}
            bodyFields={["intro", "localTips"]}
            fallbackTitleField="metaTitle"
            defaultKeyword={svName && arName ? `${svName.toLowerCase()} ${arName.toLowerCase()}` : ""}
            minWords={120}
          />
        </div>
      </form>
      {r && user.role === "ADMIN" && (
        <form action={deleteServiceArea} className="mt-6">
          <input type="hidden" name="id" value={r.id} />
          <SubmitButton variant="danger" confirm="Delete this landing page?">
            Delete page
          </SubmitButton>
        </form>
      )}
    </>
  );
}
