import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { wordCount } from "@/lib/markdown";
import { Badge, LinkBtn, Notice, PageHeader, Table, fmtDate, td } from "@/components/admin/ui";

export default async function PostsAdmin({ searchParams }: PageProps<"/admin/posts">) {
  await requireUser();
  const sp = await searchParams;
  const rows = await db.post.findMany({ orderBy: [{ status: "asc" }, { publishedAt: "desc" }] });
  return (
    <>
      <PageHeader
        title="Blog posts"
        intro="Guides and cost articles that capture informational searches and link visitors to service pages. Publish 2–4 a month, see Content strategy for topics."
        actions={
          <LinkBtn href="/admin/posts/new">
            <Plus className="size-4" /> New post
          </LinkBtn>
        }
      />
      {sp.deleted && <Notice>Post deleted.</Notice>}
      <Table head={["Title", "Category", "Status", "Words", "Published"]}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td className={td}>
              <Link href={`/admin/posts/${p.id}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">
                {p.title}
              </Link>
              <span className="block text-xs text-ink-soft">/blog/{p.slug}</span>
            </td>
            <td className={td}>{p.category}</td>
            <td className={td}>
              <Badge>{p.status}</Badge>
            </td>
            <td className={td}>{wordCount(p.body)}</td>
            <td className={`${td} text-ink-soft`}>{fmtDate(p.publishedAt, false)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
