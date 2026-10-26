import type { Metadata } from "next";
import { getFaqs, getPageSeo } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { buildMetadata, faqJsonLd } from "@/lib/seo";
import { CtaBand } from "@/components/site/sections";
import { Breadcrumbs, Container, FaqList, JsonLd } from "@/components/site/ui";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Cleaning FAQs | Newcastle & Hunter",
    description: "Answers to common questions about booking, pricing, end of lease cleaning, commercial cleaning and property staging with Brilliance Cleaning.",
    path: "/faq",
    override: await getPageSeo("/faq"),
  });
}

export default async function FaqPage() {
  const [s, faqs] = await Promise.all([getSettings(), getFaqs()]);
  const cats = [...new Set(faqs.map((f) => f.category))];
  return (
    <>
      <section className="hero-bg">
        <Container className="max-w-4xl py-10 sm:py-14">
          <Breadcrumbs items={[{ name: "FAQs", path: "/faq" }]} />
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Frequently asked questions</h1>
          <p className="mt-4 text-lg text-ink-soft">Everything you need to know before booking. Still unsure? Call {s.phoneDisplay}.</p>
        </Container>
      </section>
      <section className="py-12">
        <Container className="max-w-3xl space-y-10">
          {cats.map((c) => (
            <div key={c}>
              <h2 className="mb-4 text-2xl font-extrabold text-ink">{c}</h2>
              <FaqList faqs={faqs.filter((f) => f.category === c).map((f) => ({ q: f.q, a: f.a }))} />
            </div>
          ))}
        </Container>
        <JsonLd data={faqJsonLd(faqs.map((f) => ({ q: f.q, a: f.a })))} />
      </section>
      <CtaBand s={s} label="faq-cta" />
    </>
  );
}
