import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, LinkBtn, Notice, PageHeader, td } from "@/components/admin/ui";

export default async function ServiceAreasAdmin({ searchParams }: PageProps<"/admin/service-areas">) {
  await requireUser();
  const sp = await searchParams;
  const [rows, services, hubs] = await Promise.all([
    db.serviceArea.findMany(),
    db.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.area.findMany({ where: { isHub: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const cell = (s: string, a: string) => rows.find((r) => r.serviceSlug === s && r.areaSlug === a);

  return (
    <>
      <PageHeader
        title="Service × area pages"
        intro="Landing pages like /services/end-of-lease-cleaning/maitland. Each needs its own unique intro — only create one when you can say something specific about that service in that region."
        actions={
          <LinkBtn href="/admin/service-areas/new">
            <Plus className="size-4" /> New page
          </LinkBtn>
        }
      />
      {sp.deleted && <Notice>Page deleted.</Notice>}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line bg-sand text-xs uppercase tracking-wider text-ink-soft">
            <tr>
              <th className="px-3 py-2.5 text-left">Service</th>
              {hubs.map((h) => (
                <th key={h.slug} className="px-3 py-2.5 text-left">
                  {h.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {services.map((s) => (
              <tr key={s.slug}>
                <td className={`${td} font-semibold`}>{s.name}</td>
                {hubs.map((h) => {
                  const r = cell(s.slug, h.slug);
                  return (
                    <td key={h.slug} className={td}>
                      {r ? (
                        <Link href={`/admin/service-areas/${r.id}`} className="hover:underline">
                          {r.active ? r.indexable ? <Badge tone="ok">Live</Badge> : <Badge tone="warn">Noindex</Badge> : <Badge tone="warn">Hidden</Badge>}
                        </Link>
                      ) : (
                        <Link href={`/admin/service-areas/new?service=${s.slug}&area=${h.slug}`} className="text-xs font-semibold text-brand-700 hover:underline">
                          + Create
                        </Link>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
