import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";
import { getAreas, getService, getServiceAreas, getServices } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { renderMarkdown } from "@/lib/markdown";
import { buildMetadata, faqJsonLd, serviceJsonLd } from "@/lib/seo";
import { QuoteForm } from "@/components/site/QuoteForm";
import { CtaBand, ProcessSteps, ServiceGrid } from "@/components/site/sections";
import { Breadcrumbs, CallButton, Card, Container, FaqList, Icon, JsonLd, Markdown, SectionHeading } from "@/components/site/ui";

export async function generateStaticParams() {
  const services = await getServices();
  return services.length ? services.map((s) => ({ service: s.slug })) : [{ service: "end-of-lease-cleaning" }];
}

export async function generateMetadata({ params }: PageProps<"/services/[service]">): Promise<Metadata> {
  const sv = await getService((await params).service);
  if (!sv) return {};
  return buildMetadata({
    title: sv.metaTitle || `${sv.name} Newcastle & Hunter`,
    description: sv.metaDescription || sv.summary || "",
    path: `/services/${sv.slug}`,
  });
}

export default async function ServicePage({ params }: PageProps<"/services/[service]">) {
  const { service } = await params;
  const [sv, s, services, areas, serviceAreas] = await Promise.all([getService(service), getSettings(), getServices(), getAreas(), getServiceAreas()]);
  if (!sv) notFound();

  const hubs = areas.filter((a) => a.isHub);
  const landing = new Set(serviceAreas.filter((x) => x.serviceSlug === sv.slug).map((x) => x.areaSlug));
  const related = sv.related.map((r) => services.find((x) => x.slug === r)).filter((x): x is NonNullable<typeof x> => !!x);
  const opts = services.map((x) => ({ slug: x.slug, name: x.name }));
  const path = `/services/${sv.slug}`;

  return (
    <>
      <section className="hero-bg">
        <Container className="grid gap-10 py-8 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
          <div>
            <Breadcrumbs items={[{ name: "Services", path: "/services" }, { name: sv.name, path }]} />
            <span className="mt-6 flex size-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm ring-1 ring-brand-100">
              <Icon name={sv.icon} className="size-7" />
            </span>
            <h1 className="mt-5 text-[2.2rem] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">{sv.h1 || sv.name}</h1>
            {sv.heroIntro && <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">{sv.heroIntro}</p>}
            {sv.priceFrom ? (
              <p className="mt-5 inline-flex items-baseline gap-2 rounded-xl bg-white px-4 py-2 shadow-sm ring-1 ring-line">
                <span className="text-sm text-ink-soft">From</span>
                <span className="text-2xl font-extrabold text-ink">${sv.priceFrom}</span>
                {sv.priceNote && <span className="text-sm text-ink-soft">{sv.priceNote}</span>}
              </p>
            ) : null}
            {sv.idealFor.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {sv.idealFor.map((t) => (
                  <li key={t} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-ink ring-1 ring-line">
                    {t}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-8 flex flex-wrap gap-3" data-track-label="service-hero">
              {sv.slug === "hospitality-staffing" && <Link href="/booking" className="inline-flex items-center justify-center rounded-full bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700">Book hospitality staff</Link>}
              <CallButton phone={s.phone} display={`Call ${s.phoneDisplay}`} label="service-hero" size="lg" />
            </div>
          </div>
          <Card className="self-start p-5 shadow-xl shadow-brand-900/5 sm:p-7">
            <QuoteForm services={opts} areas={areas.map((a) => a.name)} defaultService={sv.slug} title={`Quote for ${sv.name.toLowerCase()}`} subtitle="Free and no obligation." />
          </Card>
        </Container>
      </section>

      <section className="py-14 sm:py-16">
        <Container className="grid gap-12 lg:grid-cols-[1fr_20rem]">
          <Markdown html={renderMarkdown(sv.body)} />
          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            <Card className="p-6">
              <p className="font-bold text-ink">Talk to a real person</p>
              <p className="mt-1 text-sm text-ink-soft">Questions about scope, timing or access? We&apos;re happy to help.</p>
              <div className="mt-4" data-track-label="service-sidebar">
                <CallButton phone={s.phone} display={s.phoneDisplay} label="service-sidebar" className="w-full" />
              </div>
              <Link href="/quote" data-track="quote_cta" data-track-label="service-sidebar" className="mt-2 block rounded-full border-2 border-brand-600 py-2.5 text-center font-bold text-brand-700 hover:bg-brand-50">
                Request a quote
              </Link>
            </Card>
            {hubs.length > 0 && (
              <Card className="p-6">
                <p className="font-bold text-ink">{sv.name} near you</p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {hubs.map((h) => (
                    <li key={h.slug}>
                      <Link href={landing.has(h.slug) ? `${path}/${h.slug}` : `/areas/${h.slug}`} className="text-ink-soft hover:text-brand-700">
                        {sv.name} {h.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </aside>
        </Container>
      </section>

      {sv.inclusions.length > 0 && (
        <section className="bg-brand-50/60 py-14 sm:py-16">
          <Container>
            <SectionHeading eyebrow="Checklist" title={`What's included in our ${sv.name.toLowerCase()}`} />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sv.inclusions.map((g) => (
                <Card key={g.area} className="p-6">
                  <h3 className="font-bold text-ink">{g.area}</h3>
                  <ul className="mt-3 space-y-2">
                    {g.items.map((it) => (
                      <li key={it} className="flex gap-2 text-sm text-ink-soft">
                        <Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden /> {it}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
            {sv.exclusions.length > 0 && (
              <Card className="mt-6 p-6">
                <h3 className="font-bold text-ink">Not included (ask us about add-ons)</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {sv.exclusions.map((it) => (
                    <li key={it} className="flex gap-2 text-sm text-ink-soft">
                      <X className="mt-0.5 size-4 shrink-0 text-coral-500" aria-hidden /> {it}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </Container>
        </section>
      )}

      <section className="py-14 sm:py-16">
        <Container>
          <SectionHeading eyebrow="How it works" title={`How we handle your ${sv.name.toLowerCase()}`} />
          <div className="mt-10">
            <ProcessSteps steps={sv.process} />
          </div>
        </Container>
      </section>

      {hubs.length > 0 && (
        <section className="bg-sand py-14 sm:py-16">
          <Container>
            <SectionHeading eyebrow="Service areas" title={`${sv.name} across Newcastle & the Hunter`} />
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {hubs.map((h) => (
                <Link
                  key={h.slug}
                  href={landing.has(h.slug) ? `${path}/${h.slug}` : `/areas/${h.slug}`}
                  className="group flex items-center justify-between rounded-2xl border border-line bg-white px-5 py-4 font-semibold text-ink hover:border-brand-200 hover:text-brand-700"
                >
                  {sv.name} in {h.name}
                  <ArrowRight className="size-4 text-brand-600 transition group-hover:translate-x-0.5" aria-hidden />
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      {sv.faqs.length > 0 && (
        <section className="py-14 sm:py-16">
          <Container className="max-w-3xl">
            <SectionHeading eyebrow="FAQs" title={`${sv.name} FAQs`} />
            <FaqList faqs={sv.faqs} className="mt-8" />
          </Container>
          <JsonLd data={faqJsonLd(sv.faqs)} />
        </section>
      )}

      {related.length > 0 && (
        <section className="bg-brand-50/60 py-14 sm:py-16">
          <Container>
            <SectionHeading title="Related services" />
            <div className="mt-8">
              <ServiceGrid services={related} />
            </div>
          </Container>
        </section>
      )}

      <CtaBand s={s} label="service-cta" title={`Book your ${sv.name.toLowerCase()}`} />
      <JsonLd data={serviceJsonLd(sv, path, hubs.map((h) => h.name))} />
    </>
  );
}
