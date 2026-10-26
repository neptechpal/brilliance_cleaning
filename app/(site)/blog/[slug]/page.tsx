import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock } from "lucide-react";
import { getPost, getPosts, getServices } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { renderMarkdown } from "@/lib/markdown";
import { articleJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { CtaBand, PostCards } from "@/components/site/sections";
import { Breadcrumbs, CallButton, Card, Container, FaqList, JsonLd, Markdown, QuoteButton } from "@/components/site/ui";

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.length ? posts.map((p) => ({ slug: p.slug })) : [{ slug: "welcome" }];
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const p = await getPost((await params).slug);
  if (!p) return {};
  return buildMetadata({
    title: p.metaTitle || p.title,
    description: p.metaDescription || p.excerpt || "",
    path: `/blog/${p.slug}`,
    type: "article",
    publishedTime: p.publishedAt?.toISOString(),
    modifiedTime: p.updatedAt.toISOString(),
  });
}

const fmt = (d: Date) => d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" });

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const [p, s, services, posts] = await Promise.all([getPost(slug), getSettings(), getServices(), getPosts()]);
  if (!p) notFound();
  const related = p.relatedServices.map((r) => services.find((x) => x.slug === r)).filter((x): x is NonNullable<typeof x> => !!x);
  const more = posts.filter((x) => x.slug !== p.slug && (x.category === p.category || x.relatedServices.some((r) => p.relatedServices.includes(r)))).slice(0, 3);

  return (
    <>
      <section className="hero-bg">
        <Container className="max-w-4xl py-10 sm:py-14">
          <Breadcrumbs items={[{ name: "Tips & guides", path: "/blog" }, { name: p.title, path: `/blog/${p.slug}` }]} />
          <p className="mt-6 text-sm font-bold uppercase tracking-wider text-coral-600">{p.category}</p>
          <h1 className="mt-2 text-[2.1rem] font-extrabold leading-[1.15] tracking-tight text-ink sm:text-5xl">{p.title}</h1>
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
            <span>By {p.authorName}</span>
            {p.publishedAt && <time dateTime={p.publishedAt.toISOString()}>{fmt(p.publishedAt)}</time>}
            <span className="flex items-center gap-1">
              <Clock className="size-4" aria-hidden /> {p.readMinutes} min read
            </span>
          </p>
        </Container>
      </section>
      <section className="py-12">
        <Container className="grid max-w-6xl gap-12 lg:grid-cols-[1fr_18rem]">
          <article>
            <Markdown html={renderMarkdown(p.body)} />
            {p.faqs.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-extrabold text-ink">Frequently asked questions</h2>
                <FaqList faqs={p.faqs} className="mt-6" />
                <JsonLd data={faqJsonLd(p.faqs)} />
              </div>
            )}
          </article>
          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            <Card className="p-6">
              <p className="font-bold text-ink">Want it done for you?</p>
              <p className="mt-1 text-sm text-ink-soft">Free quotes across Newcastle &amp; the Hunter.</p>
              <div className="mt-4 grid gap-2" data-track-label="blog-sidebar">
                <CallButton phone={s.phone} display={s.phoneDisplay} label="blog-sidebar" />
                <QuoteButton label="blog-sidebar" variant="outline" />
              </div>
            </Card>
            {related.length > 0 && (
              <Card className="p-6">
                <p className="font-bold text-ink">Related services</p>
                <ul className="mt-3 space-y-2">
                  {related.map((x) => (
                    <li key={x.slug}>
                      <Link href={`/services/${x.slug}`} className="flex items-center gap-2 text-sm font-medium text-ink hover:text-brand-700">
                        <ArrowRight className="size-4 text-brand-600" aria-hidden /> {x.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </aside>
        </Container>
      </section>
      {more.length > 0 && (
        <section className="bg-sand py-14">
          <Container>
            <h2 className="mb-6 text-2xl font-extrabold text-ink">Keep reading</h2>
            <PostCards posts={more} />
          </Container>
        </section>
      )}
      <CtaBand s={s} label="post-cta" />
      <JsonLd data={articleJsonLd(p)} />
    </>
  );
}
