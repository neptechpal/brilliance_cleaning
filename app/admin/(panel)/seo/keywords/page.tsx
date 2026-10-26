import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteKeyword, saveKeyword } from "@/app/admin/actions/seo";
import { Badge, Field, Notice, PageHeader, Panel, Select, Stat, Table, td } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

const STATUSES = ["IDEA", "PLANNED", "WRITING", "PUBLISHED", "RANKING"];
const INTENTS = ["local", "commercial", "informational", "transactional"];

export default async function KeywordsPage({ searchParams }: PageProps<"/admin/seo/keywords">) {
  await requireUser();
  const sp = await searchParams;
  const status = typeof sp.status === "string" && STATUSES.includes(sp.status) ? sp.status : undefined;
  const cluster = typeof sp.cluster === "string" ? sp.cluster : undefined;
  const where: Prisma.KeywordWhereInput = { ...(status ? { status } : {}), ...(cluster ? { cluster } : {}) };
  const [rows, byStatus, clusters] = await Promise.all([
    db.keyword.findMany({ where, orderBy: [{ priority: "asc" }, { status: "asc" }, { keyword: "asc" }] }),
    db.keyword.groupBy({ by: ["status"], _count: true }),
    db.keyword.groupBy({ by: ["cluster"], _count: true, orderBy: { cluster: "asc" } }),
  ]);
  const c = (s: string) => byStatus.find((x) => x.status === s)?._count ?? 0;
  const back = `/admin/seo/keywords${status || cluster ? `?${new URLSearchParams({ ...(status ? { status } : {}), ...(cluster ? { cluster } : {}) })}` : ""}`;

  return (
    <>
      <PageHeader
        title="Content strategy"
        intro={
          <>
            Every keyword we want to rank for, mapped to the page that should rank. Work the <b>IDEA</b> list into new pages or posts, then track Google position (from Search Console → Performance) monthly.
          </>
        }
      />
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.deleted && <Notice>Deleted.</Notice>}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/seo/keywords?status=${s}`} className={status === s ? "rounded-xl ring-2 ring-brand-500" : ""}>
            <Stat label={s.toLowerCase()} value={c(s)} tone={s === "RANKING" ? "brand" : s === "IDEA" ? "coral" : "default"} />
          </Link>
        ))}
      </div>

      <Panel title="Monthly SEO routine" className="mb-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-soft">
          <li>Search Console → Performance → Queries (last 28 days): update positions here; add new queries with impressions but no page as IDEA.</li>
          <li>Publish 2–4 posts from the IDEA list (cost guides and checklists convert best), each linking to its service page and /quote.</li>
          <li>Refresh one service or area page: add a local FAQ, a recent job example or photos.</li>
          <li>Ask every happy customer for a Google review (link from Google Business Profile) and add the best ones in Reviews.</li>
          <li>Check Traffic → top organic landing pages and Leads by source; double down on what converts.</li>
        </ol>
      </Panel>

      <Panel title="Add keyword" className="mb-4">
        <form action={saveKeyword} className="grid gap-3 sm:grid-cols-6 sm:items-end">
          <input type="hidden" name="back" value={back} />
          <Field label="Keyword" name="keyword" required className="sm:col-span-2" />
          <Select label="Intent" name="intent" options={INTENTS} />
          <Field label="Cluster" name="cluster" placeholder="e.g. End of Lease Cleaning" />
          <Field label="Target URL" name="targetUrl" placeholder="/services/…" />
          <Select label="Priority" name="priority" defaultValue="2" options={[["1", "High"], ["2", "Medium"], ["3", "Low"]]} />
          <input type="hidden" name="status" value="IDEA" />
          <SubmitButton>Add</SubmitButton>
        </form>
      </Panel>

      <div className="mb-3 flex flex-wrap gap-2">
        <Link href="/admin/seo/keywords" className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!cluster && !status ? "bg-ink text-white" : "bg-white ring-1 ring-line"}`}>
          All
        </Link>
        {clusters.map((x) => (
          <Link key={x.cluster ?? "none"} href={`/admin/seo/keywords?cluster=${encodeURIComponent(x.cluster ?? "")}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${cluster === x.cluster ? "bg-ink text-white" : "bg-white ring-1 ring-line"}`}>
            {x.cluster ?? "Unassigned"} <span className="opacity-60">{x._count}</span>
          </Link>
        ))}
      </div>

      <Table head={["Keyword", "Intent", "Target page", "Status", "Priority", "Volume", "Position", ""]} empty={rows.length ? undefined : "No keywords."}>
        {rows.map((k) => (
          <tr key={k.id}>
            <td className={td}>
              <span className="font-semibold text-ink">{k.keyword}</span>
              {k.cluster && <span className="block text-xs text-ink-soft">{k.cluster}</span>}
            </td>
            <td className={`${td} capitalize`}>{k.intent}</td>
            <td className={`${td} max-w-[14rem] truncate text-xs`}>
              {k.targetUrl ? (
                <a href={k.targetUrl} target="_blank" className="text-brand-700 hover:underline">
                  {k.targetUrl}
                </a>
              ) : (
                <span className="text-coral-600">No page yet</span>
              )}
            </td>
            <td className={td} colSpan={4}>
              <form action={saveKeyword} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={k.id} />
                <input type="hidden" name="back" value={back} />
                <input type="hidden" name="keyword" value={k.keyword} />
                <input type="hidden" name="intent" value={k.intent} />
                <input type="hidden" name="cluster" value={k.cluster ?? ""} />
                <input type="hidden" name="targetUrl" value={k.targetUrl ?? ""} />
                <input type="hidden" name="difficulty" value={k.difficulty ?? ""} />
                <input type="hidden" name="notes" value={k.notes ?? ""} />
                <select name="status" defaultValue={k.status} className="rounded-md border border-line px-2 py-1 text-xs">
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <select name="priority" defaultValue={String(k.priority)} className="rounded-md border border-line px-2 py-1 text-xs">
                  <option value="1">High</option>
                  <option value="2">Med</option>
                  <option value="3">Low</option>
                </select>
                <input name="volume" defaultValue={k.volume ?? ""} placeholder="vol" className="w-16 rounded-md border border-line px-2 py-1 text-xs" />
                <input name="position" defaultValue={k.position ?? ""} placeholder="pos" className="w-14 rounded-md border border-line px-2 py-1 text-xs" />
                <SubmitButton variant="ghost" className="!px-2 !py-1 text-xs">
                  Save
                </SubmitButton>
                <Badge>{k.status}</Badge>
              </form>
            </td>
            <td className={td}>
              <form action={deleteKeyword}>
                <input type="hidden" name="id" value={k.id} />
                <SubmitButton variant="ghost" className="!px-2 !py-1 text-xs text-coral-600" confirm="Delete keyword?">
                  ✕
                </SubmitButton>
              </form>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
