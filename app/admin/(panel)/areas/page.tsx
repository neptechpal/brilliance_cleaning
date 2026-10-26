import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { wordCount } from "@/lib/markdown";
import { Badge, LinkBtn, Notice, PageHeader, Table, td } from "@/components/admin/ui";

export default async function AreasAdmin({ searchParams }: PageProps<"/admin/areas">) {
  await requireUser();
  const sp = await searchParams;
  const rows = await db.area.findMany({ orderBy: [{ isHub: "desc" }, { region: "asc" }, { name: "asc" }] });
  const hubs = rows.filter((r) => r.isHub);
  return (
    <>
      <PageHeader
        title="Areas & suburbs"
        intro="Region hubs and suburb pages at /areas/<slug>. Keep each page's local content unique — thin or copied suburb pages can hurt rankings, so untick “Indexable” on any page you haven't written properly."
        actions={
          <LinkBtn href="/admin/areas/new">
            <Plus className="size-4" /> New area
          </LinkBtn>
        }
      />
      {sp.deleted && <Notice>Area deleted.</Notice>}
      {hubs.map((h) => {
        const subs = rows.filter((r) => r.region === h.slug && !r.isHub);
        return (
          <div key={h.id} className="mb-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-ink-soft">{h.name} region</h2>
            <Table head={["Area", "Postcode", "Status", "Local words", "FAQs"]}>
              {[h, ...subs].map((a) => {
                const words = wordCount(a.intro) + wordCount(a.localContent);
                return (
                  <tr key={a.id}>
                    <td className={td}>
                      <Link href={`/admin/areas/${a.id}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">
                        {a.name}
                      </Link>
                      {a.isHub && <Badge tone="PLANNED">Hub</Badge>}
                      <span className="block text-xs text-ink-soft">/areas/{a.slug}</span>
                    </td>
                    <td className={td}>{a.postcode}</td>
                    <td className={td}>
                      {!a.active ? <Badge tone="warn">Hidden</Badge> : a.indexable ? <Badge tone="ok">Indexed</Badge> : <Badge tone="warn">Noindex</Badge>}
                    </td>
                    <td className={td}>
                      <Badge tone={words >= 300 ? "ok" : words >= 150 ? "warn" : "bad"}>{words}</Badge>
                    </td>
                    <td className={td}>{Array.isArray(a.faqs) ? a.faqs.length : 0}</td>
                  </tr>
                );
              })}
            </Table>
          </div>
        );
      })}
    </>
  );
}
