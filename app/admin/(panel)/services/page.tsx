import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { wordCount } from "@/lib/markdown";
import { Badge, LinkBtn, Notice, PageHeader, Table, fmtDate, td } from "@/components/admin/ui";

export default async function ServicesAdmin({ searchParams }: PageProps<"/admin/services">) {
  await requireUser();
  const sp = await searchParams;
  const rows = await db.service.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader
        title="Services"
        intro="Each active service gets its own page at /services/<slug>. Draft (inactive) services are hidden from the site and sitemap."
        actions={
          <LinkBtn href="/admin/services/new">
            <Plus className="size-4" /> New service
          </LinkBtn>
        }
      />
      {sp.deleted && <Notice>Service deleted.</Notice>}
      <Table head={["Service", "Category", "Status", "Words", "Title length", "Updated"]}>
        {rows.map((s) => (
          <tr key={s.id}>
            <td className={td}>
              <Link href={`/admin/services/${s.id}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">
                {s.name}
              </Link>
              <span className="block text-xs text-ink-soft">/services/{s.slug}</span>
            </td>
            <td className={`${td} capitalize`}>{s.category}</td>
            <td className={td}>
              {s.active ? <Badge tone="ok">Live</Badge> : <Badge tone="warn">Draft</Badge>} {s.featured && <Badge tone="PLANNED">Featured</Badge>}
            </td>
            <td className={td}>{wordCount(s.body)}</td>
            <td className={td}>{(s.metaTitle ?? s.name).length}</td>
            <td className={`${td} text-ink-soft`}>{fmtDate(s.updatedAt)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
