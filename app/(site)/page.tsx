import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BedDouble, Building2, CheckCircle2, Sofa, UtensilsCrossed, Users } from "lucide-react";
import { getAreas, getFaqs, getPageSeo, getPosts, getReviews, getServices } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { buildMetadata, faqJsonLd } from "@/lib/seo";
import { QuoteForm } from "@/components/site/QuoteForm";
import { InclusionsTabs } from "@/components/site/InclusionsTabs";
import { AreasGrid, CtaBand, PostCards, ProcessSteps, Reviews, ServiceGrid, TrustBar, WhyUs } from "@/components/site/sections";
import { CallButton, Card, Container, FaqList, JsonLd, QuoteButton, SectionHeading } from "@/components/site/ui";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Cleaning & Property Staging Newcastle | Brilliance Cleaning",
    description:
      "End of lease, house, commercial and hospitality venue cleaning plus property staging across Newcastle & the Hunter. Free quotes – call 0411 463 552.",
    path: "/",
    override: await getPageSeo("/"),
  });
}

export default async function HomePage() {
  const [s, services, areas, faqs, posts, reviews] = await Promise.all([
    getSettings(),
    getServices(),
    getAreas(),
    getFaqs(),
    getPosts(3),
    getReviews(),
  ]);
  const opts = services.map((x) => ({ slug: x.slug, name: x.name }));
  const tabs = ["end-of-lease-cleaning", "house-cleaning", "deep-cleaning", "commercial-cleaning", "hospitality-cleaning", "post-construction-cleaning"]
    .map((slug) => services.find((x) => x.slug === slug))
    .filter((x): x is NonNullable<typeof x> => !!x && x.inclusions.length > 0)
    .map((x) => ({ slug: x.slug, name: x.name, inclusions: x.inclusions }));
  const homeFaqs = faqs.slice(0, 7).map((f) => ({ q: f.q, a: f.a }));
  const featured = services.filter((x) => x.featured);
  const rest = services.filter((x) => !x.featured);

  return (
    <>
      {/* Hero */}
      <section className="hero-bg">
        <Container className="grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand-700 shadow-sm ring-1 ring-brand-100">
              <span className="size-2 rounded-full bg-brand-500" /> Newcastle &amp; Hunter Region cleaners
            </p>
            <h1 className="mt-5 text-[2.35rem] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
              Cleaning &amp; property staging <span className="text-brand-600">across Newcastle</span> and the Hunter
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              Homes, rentals, offices and hospitality venues — cleaned to a written checklist by a local team. Plus property staging to help you sell, and trained
              staff for busy venues.
            </p>
            <ul className="mt-6 grid max-w-xl gap-2 text-[0.95rem] font-medium text-ink sm:grid-cols-2">
              {["Free, no-obligation quotes", "Weekend & after-hours bookings", "End of lease to agent checklist", "Equipment & products supplied"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-brand-600" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row" data-track-label="hero">
              <CallButton phone={s.phone} display={`Call ${s.phoneDisplay}`} label="hero" size="lg" />
              <QuoteButton label="hero" variant="outline" className="px-6 py-3.5 text-lg">
                Get a free quote
              </QuoteButton>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
              {[
                [s.statCustomers, "Happy customers"],
                [s.statStaff, "Team members"],
                ["6", "Regions covered"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="text-3xl font-extrabold text-ink">{v}</dd>
                  <dd className="text-xs font-medium text-ink-soft">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Card className="p-5 shadow-xl shadow-brand-900/5 sm:p-7" id="quote">
            <QuoteForm
              services={opts}
              areas={areas.map((a) => a.name)}
              title="Get your free quote"
              subtitle="Takes under a minute. We usually reply within a few business hours."
            />
          </Card>
        </Container>
        <Container className="pb-12">
          <TrustBar s={s} />
        </Container>
      </section>

      {/* Services */}
      <section className="py-16 sm:py-20" id="services">
        <Container>
          <SectionHeading
            eyebrow="What we do"
            title="Cleaning services for homes, businesses and venues"
            intro="From a one-off bond clean to nightly venue cleaning and full property staging — one local team, one point of contact."
          />
          <div className="mt-10">
            <ServiceGrid services={featured} />
          </div>
          {rest.length > 0 && (
            <ul className="mt-6 flex flex-wrap justify-center gap-2">
              {rest.map((x) => (
                <li key={x.slug}>
                  <Link href={`/services/${x.slug}`} className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand-500 hover:text-brand-700">
                    {x.name} <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>

      {/* Inclusions */}
      {tabs.length > 0 && (
        <section className="bg-brand-50/60 py-16 sm:py-20">
          <Container>
            <SectionHeading
              eyebrow="No guesswork"
              title="What's included in every clean"
              intro="Every job runs to a written checklist, so you know exactly what you're paying for. Pick a service to see the list."
            />
            <div className="mt-10">
              <InclusionsTabs tabs={tabs} />
            </div>
          </Container>
        </section>
      )}

      {/* How it works */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading eyebrow="How it works" title="Booked in minutes, cleaned to a checklist" />
          <div className="mt-10">
            <ProcessSteps />
          </div>
        </Container>
      </section>

      {/* Specialities */}
      <section className="bg-ink py-16 text-white sm:py-20">
        <Container className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white/5 p-7 ring-1 ring-white/10 sm:p-9">
            <div className="flex gap-3 text-brand-200">
              <UtensilsCrossed className="size-8" aria-hidden />
              <Users className="size-8" aria-hidden />
            </div>
            <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">Cleaning &amp; staff for hospitality venues</h2>
            <p className="mt-3 leading-relaxed text-white/80">
              Pubs, clubs, restaurants, cafés, hotels, function centres and Hunter Valley cellar doors. We handle after-close cleaning of kitchens, bars, floors and
              amenities — and supply chefs, cooks, kitchen hands and cleaners when you&apos;re short for a busy weekend, wedding season or event.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/services/hospitality-cleaning" className="inline-flex items-center gap-1 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-ink hover:bg-brand-50">
                Venue cleaning <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/services/hospitality-staffing" className="inline-flex items-center gap-1 rounded-full px-5 py-2.5 text-sm font-bold text-white ring-1 ring-white/30 hover:bg-white/10">
                Hospitality staffing <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/careers" className="inline-flex items-center gap-1 rounded-full px-5 py-2.5 text-sm font-bold text-brand-200 hover:text-white">
                Work with us <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
          <div className="rounded-3xl bg-white/5 p-7 ring-1 ring-white/10 sm:p-9">
            <div className="flex gap-3 text-coral-500">
              <Sofa className="size-8" aria-hidden />
              <BedDouble className="size-8" aria-hidden />
              <Building2 className="size-8" aria-hidden />
            </div>
            <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">Selling? Clean, then stage</h2>
            <p className="mt-3 leading-relaxed text-white/80">
              Buyers decide from the listing photos. We deep clean first, then style rooms with furniture and décor so your home photographs well and feels ready to move
              into at the open home — one team, one timeline, ready for your agent&apos;s campaign.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/services/property-staging" className="inline-flex items-center gap-1 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-ink hover:bg-brand-50">
                Property staging <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/services/pre-sale-cleaning" className="inline-flex items-center gap-1 rounded-full px-5 py-2.5 text-sm font-bold text-white ring-1 ring-white/30 hover:bg-white/10">
                Pre-sale cleaning <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Why us */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading eyebrow="Why Brilliance" title="Why Newcastle chooses a local cleaning team" />
          <div className="mt-10">
            <WhyUs s={s} />
          </div>
        </Container>
      </section>

      <Reviews reviews={reviews} />

      {/* Areas */}
      <section className="bg-sand py-16 sm:py-20" id="areas">
        <Container>
          <SectionHeading
            eyebrow="Service areas"
            title="Cleaners across Newcastle & the Hunter"
            intro="We service homes, businesses and venues from the coast at Nelson Bay to the vineyards of Pokolbin. Find your suburb below."
          />
          <div className="mt-10">
            <AreasGrid areas={areas} />
          </div>
        </Container>
      </section>

      {/* FAQ */}
      {homeFaqs.length > 0 && (
        <section className="py-16 sm:py-20">
          <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <SectionHeading center={false} eyebrow="FAQs" title="Questions we get asked a lot" intro="Can't see your question? Give us a call — we're happy to help." />
              <div className="mt-6" data-track-label="faq-side">
                <CallButton phone={s.phone} display={s.phoneDisplay} label="faq-side" />
              </div>
              <Link href="/faq" className="mt-4 block font-semibold text-brand-700 hover:underline">
                See all FAQs →
              </Link>
            </div>
            <FaqList faqs={homeFaqs} />
          </Container>
          <JsonLd data={faqJsonLd(homeFaqs)} />
        </section>
      )}

      {/* Blog */}
      {posts.length > 0 && (
        <section className="bg-brand-50/60 py-16 sm:py-20">
          <Container>
            <SectionHeading eyebrow="Tips & guides" title="Cleaning advice for Newcastle homes and venues" />
            <div className="mt-10">
              <PostCards posts={posts} />
            </div>
            <p className="mt-8 text-center">
              <Link href="/blog" className="font-bold text-brand-700 hover:underline">
                Read more guides →
              </Link>
            </p>
          </Container>
        </section>
      )}

      <CtaBand s={s} label="home-cta" />
    </>
  );
}
