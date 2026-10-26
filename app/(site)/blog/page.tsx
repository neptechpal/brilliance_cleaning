import type { Metadata } from "next";
import { getPageSeo, getPosts } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { CtaBand, PostCards } from "@/components/site/sections";
import { Breadcrumbs, Container } from "@/components/site/ui";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Cleaning Tips, Checklists & Cost Guides",
    description:
      "Practical cleaning advice for Newcastle and Hunter homes, rentals and venues: end of lease checklists, price guides, property staging and hospitality tips.",
    path: "/blog",
    override: await getPageSeo("/blog"),
  });
}

export default async function BlogPage() {
  const [s, posts] = await Promise.all([getSettings(), getPosts()]);
  const categories = [...new Set(posts.map((p) => p.category))];
  return (
    <>
      <section className="hero-bg">
        <Container className="py-10 sm:py-14">
          <Breadcrumbs items={[{ name: "Tips & guides", path: "/blog" }]} />
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Cleaning tips, checklists &amp; cost guides</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">Straight answers from a local Newcastle team — what agents check, what things cost and how to keep on top of it.</p>
        </Container>
      </section>
      {categories.map((c) => (
        <section key={c} className="py-10">
          <Container>
            <h2 className="mb-6 text-2xl font-extrabold text-ink">{c}</h2>
            <PostCards posts={posts.filter((p) => p.category === c)} />
          </Container>
        </section>
      ))}
      {posts.length === 0 && (
        <Container className="py-16 text-center text-ink-soft">
          <p>New guides coming soon.</p>
        </Container>
      )}
      <CtaBand s={s} label="blog-cta" />
    </>
  );
}
