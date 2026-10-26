import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { wordCount } from "@/lib/markdown";
import { SITE_URL, fullTitle } from "@/lib/seo";
import { savePageSeo } from "@/app/admin/actions/seo";
import { Area, Badge, Check, Field, Notice, PageHeader, Panel, Stat, Table, td } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

type Row = { url: string; type: string; title: string; desc: string; words: number; indexable: boolean; edit?: string; issues: string[] };

const FIXED = [
  { path: "/", label: "Home" },
  { path: "/services", label: "Services index" },
  { path: "/areas", label: "Areas index" },
  { path: "/quote", label: "Quote" },
  { path: "/contact", label: "Contact" },
  { path: "/about", label: "About" },
  { path: "/faq", label: "FAQ" },
  { path: "/blog", label: "Blog index" },
];

export default async function SeoAudit({ searchParams }: PageProps<"/admin/seo">) {
  await requireUser();
  const sp = await searchParams;
  const filter = typeof sp.filter === "string" ? sp.filter : "issues";
  const [services, areas, sas, posts, overrides] = await Promise.all([
    db.service.findMany({ where: { active: true } }),
    db.area.findMany({ where: { active: true } }),
    db.serviceArea.findMany({ where: { active: true } }),
    db.post.findMany({ where: { status: "PUBLISHED" } }),
    db.pageSeo.findMany(),
  ]);
  const svcName = new Map(services.map((s) => [s.slug, s.name]));
  const areaName = new Map(areas.map((a) => [a.slug, a.name]));

  const rows: Row[] = [
    ...services.map((s) => ({ url: `/services/${s.slug}`, type: "Service", title: s.metaTitle || s.name, desc: s.metaDescription || "", words: wordCount(s.body) + wordCount(s.heroIntro || ""), indexable: true, edit: `/admin/services/${s.id}`, issues: [] as string[] })),
    ...sas
      .filter((r) => svcName.has(r.serviceSlug) && areaName.has(r.areaSlug))
      .map((r) => ({ url: `/services/${r.serviceSlug}/${r.areaSlug}`, type: "Service × area", title: r.metaTitle || `${svcName.get(r.serviceSlug)} ${areaName.get(r.areaSlug)}`, desc: r.metaDescription || "", words: wordCount(r.intro) + wordCount(r.localTips.join(" ")), indexable: r.indexable, edit: `/admin/service-areas/${r.id}`, issues: [] as string[] })),
    ...areas.map((a) => ({ url: `/areas/${a.slug}`, type: a.isHub ? "Region" : "Suburb", title: a.metaTitle || `Cleaners ${a.name}`, desc: a.metaDescription || "", words: wordCount(a.intro) + wordCount(a.localContent), indexable: a.indexable, edit: `/admin/areas/${a.id}`, issues: [] as string[] })),
    ...posts.map((p) => ({ url: `/blog/${p.slug}`, type: "Post", title: p.metaTitle || p.title, desc: p.metaDescription || p.excerpt || "", words: wordCount(p.body), indexable: true, edit: `/admin/posts/${p.id}`, issues: [] as string[] })),
  ];

  const minWords: Record<string, number> = { Service: 600, "Service × area": 110, Region: 400, Suburb: 250, Post: 900 };
  const titleCount = new Map<string, number>();
  const descCount = new Map<string, number>();
  rows.forEach((r) => {
    titleCount.set(r.title.toLowerCase(), (titleCount.get(r.title.toLowerCase()) ?? 0) + 1);
    if (r.desc) descCount.set(r.desc.toLowerCase(), (descCount.get(r.desc.toLowerCase()) ?? 0) + 1);
  });
  for (const r of rows) {
    const t = fullTitle(r.title);
    if (t.length > 62) r.issues.push(`Title too long (${t.length})`);
    if (r.title.length < 25) r.issues.push("Title short");
    if (!r.desc) r.issues.push("No meta description");
    else if (r.desc.length < 110 || r.desc.length > 165) r.issues.push(`Description ${r.desc.length} chars`);
    if (r.words < (minWords[r.type] ?? 300)) r.issues.push(`Thin content (${r.words} words)`);
    if ((titleCount.get(r.title.toLowerCase()) ?? 0) > 1) r.issues.push("Duplicate title");
    if (r.desc && (descCount.get(r.desc.toLowerCase()) ?? 0) > 1) r.issues.push("Duplicate description");
  }
  const shown = rows.filter((r) => (filter === "issues" ? r.issues.length > 0 : filter === "noindex" ? !r.indexable : true));
  const withIssues = rows.filter((r) => r.issues.length).length;
  const indexable = rows.filter((r) => r.indexable).length + FIXED.length;
  const totalWords = rows.reduce((a, r) => a + r.words, 0);

  return (
    <>
      <PageHeader title="SEO audit & page meta" intro="On-page health of every page the site publishes, recalculated live from the content." />
      {sp.saved && <Notice>Saved.</Notice>}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Indexable pages" value={indexable} tone="brand" />
        <Stat label="Pages with issues" value={withIssues} tone={withIssues ? "coral" : "brand"} />
        <Stat label="Words of content" value={totalWords.toLocaleString()} />
        <Stat label="Blog posts" value={posts.length} />
      </div>

      <Panel title="Search engine setup checklist" className="mb-4">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {[
            ["Google Search Console — add property, verify (Settings → GSC code), submit sitemap", "https://search.google.com/search-console"],
            [`Sitemap: ${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap.xml`],
            ["Bing Webmaster Tools — import from GSC (feeds ChatGPT / Copilot search)", "https://www.bing.com/webmasters"],
            ["Google Business Profile — category ‘Cleaning service’, service areas, link to site with ?utm_source=gbp", "https://business.google.com"],
            ["Rich Results test — check FAQ / LocalBusiness markup", `https://search.google.com/test/rich-results?url=${encodeURIComponent(SITE_URL)}`],
            ["PageSpeed Insights — mobile Core Web Vitals", `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(SITE_URL)}`],
          ].map(([label, href]) => (
            <li key={href}>
              <a href={href} target="_blank" className="flex items-start gap-2 text-ink hover:text-brand-700">
                <ExternalLink className="mt-0.5 size-4 shrink-0 text-brand-600" /> {label}
              </a>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="mb-3 flex gap-2">
        {[
          ["issues", `With issues (${withIssues})`],
          ["all", `All (${rows.length})`],
          ["noindex", "Noindex"],
        ].map(([k, l]) => (
          <Link key={k} href={`/admin/seo?filter=${k}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filter === k ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line"}`}>
            {l}
          </Link>
        ))}
      </div>
      <Table head={["Page", "Type", "Title", "Words", "Issues"]} empty={shown.length ? undefined : "No issues found 🎉"}>
        {shown.map((r) => (
          <tr key={r.url}>
            <td className={`${td} max-w-[16rem]`}>
              {r.edit ? (
                <Link href={r.edit} className="font-semibold text-ink hover:text-brand-700 hover:underline">
                  {r.url}
                </Link>
              ) : (
                r.url
              )}
              {!r.indexable && <Badge tone="warn">noindex</Badge>}
            </td>
            <td className={td}>{r.type}</td>
            <td className={`${td} max-w-[18rem] text-xs`}>{r.title}</td>
            <td className={td}>{r.words}</td>
            <td className={td}>
              <div className="flex flex-wrap gap-1">
                {r.issues.length ? r.issues.map((i) => <Badge key={i} tone={/Thin|Duplicate|No meta/.test(i) ? "bad" : "warn"}>{i}</Badge>) : <Badge tone="ok">OK</Badge>}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <h2 id="meta" className="mb-3 mt-10 text-lg font-extrabold text-ink">Fixed page titles & descriptions</h2>
      <p className="mb-4 text-sm text-ink-soft">Override the default meta for pages that aren&apos;t edited elsewhere. Leave blank to use the built-in copy.</p>
      <div className="grid gap-3 lg:grid-cols-2">
        {FIXED.map((f) => {
          const o = overrides.find((x) => x.path === f.path);
          return (
            <Panel key={f.path} title={`${f.label} · ${f.path}`}>
              <form action={savePageSeo} className="space-y-2">
                <input type="hidden" name="path" value={f.path} />
                <Field label="Meta title" name="metaTitle" defaultValue={o?.metaTitle ?? ""} maxLength={70} />
                <Area label="Meta description" name="metaDescription" rows={2} defaultValue={o?.metaDescription ?? ""} maxLength={200} />
                <div className="flex items-center justify-between">
                  <Check label="Noindex" name="noindex" defaultChecked={o?.noindex ?? false} />
                  <SubmitButton variant="ghost">Save</SubmitButton>
                </div>
              </form>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
