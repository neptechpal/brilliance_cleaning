import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Lightbulb } from "lucide-react";
import { getArea, getAreas, getService, getServiceArea, getServiceAreas, getServices } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { buildMetadata, faqJsonLd, serviceJsonLd } from "@/lib/seo";
import { QuoteForm } from "@/components/site/QuoteForm";
import { CtaBand, ProcessSteps } from "@/components/site/sections";
import { Breadcrumbs, CallButton, Card, Container, FaqList, Icon, JsonLd, SectionHeading } from "@/components/site/ui";

export async function generateStaticParams() {
  const rows = await getServiceAreas();
  return rows.length ? rows.map((r) => ({ service: r.serviceSlug, area: r.areaSlug })) : [{ service: "end-of-lease-cleaning", area: "newcastle" }];
}

export async function generateMetadata({ params }: PageProps<"/services/[service]/[area]">): Promise<Metadata> {
  const { service, area } = await params;
  const [row, sv, ar] = await Promise.all([getServiceArea(service, area), getService(service), getArea(area)]);
  if (!row || !sv || !ar) return {};
  return buildMetadata({
    title: row.metaTitle || `${sv.name} ${ar.name}`,
    description: row.metaDescription || `${sv.name} in ${ar.name}. Local team, free quotes. Call 0411 463 552.`,
    path: `/services/${service}/${area}`,
    noindex: !row.indexable,
  });
}

export default async function ServiceAreaPage({ params }: PageProps<"/services/[service]/[area]">) {
  const { service, area } = await params;
  const [row, sv, ar, s, services, areas, allRows] = await Promise.all([
    getServiceArea(service, area),
    getService(service),
    getArea(area),
    getSettings(),
    getServices(),
    getAreas(),
    getServiceAreas(),
  ]);
  if (!row || !sv || !ar) notFound();

  const path = `/services/${sv.slug}/${ar.slug}`;
  const suburbs = areas.filter((a) => a.region === ar.slug && !a.isHub);
  const otherHubs = allRows.filter((r) => r.serviceSlug === sv.slug && r.areaSlug !== ar.slug).map((r) => areas.find((a) => a.slug === r.areaSlug)).filter((a): a is NonNullable<typeof a> => !!a);
  const otherServices = allRows.filter((r) => r.areaSlug === ar.slug && r.serviceSlug !== sv.slug).map((r) => services.find((x) => x.slug === r.serviceSlug)).filter((x): x is NonNullable<typeof x> => !!x);
  const faqs = sv.faqs.slice(0, 5);

  return (
    <>
      <section className="hero-bg">
        <Container className="grid gap-10 py-8 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
          <div>
            <Breadcrumbs
              items={[
                { name: "Services", path: "/services" },
                { name: sv.name, path: `/services/${sv.slug}` },
                { name: ar.name, path },
              ]}
            />
            <span className="mt-6 flex size-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm ring-1 ring-brand-100">
              <Icon name={sv.icon} className="size-7" />
            </span>
            <h1 className="mt-5 text-[2.2rem] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">{row.h1 || `${sv.name} in ${ar.name}`}</h1>
            <div className="mt-5 max-w-xl space-y-4 text-lg leading-relaxed text-ink-soft">
              {row.intro.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="mt-8" data-track-label="service-area-hero">
              <CallButton phone={s.phone} display={`Call ${s.phoneDisplay}`} label="service-area-hero" size="lg" />
            </div>
          </div>
          <Card className="self-start p-5 shadow-xl shadow-brand-900/5 sm:p-7">
            <QuoteForm
              services={services.map((x) => ({ slug: x.slug, name: x.name }))}
              areas={areas.map((a) => a.name)}
              defaultService={sv.slug}
              title={`${sv.name} quote – ${ar.name}`}
              subtitle="Free and no obligation."
            />
          </Card>
        </Container>
      </section>

      {row.localTips.length > 0 && (
        <section className="py-14">
          <Container>
            <SectionHeading eyebrow="Local know-how" title={`${sv.name} tips for ${ar.name}`} />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {row.localTips.map((t, i) => (
                <Card key={i} className="p-6">
                  <Lightbulb className="size-6 text-coral-500" aria-hidden />
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t}</p>
                </Card>
              ))}
            </div>
          </Container>
        </section>
      )}

      {sv.inclusions.length > 0 && (
        <section className="bg-brand-50/60 py-14 sm:py-16">
          <Container>
            <SectionHeading eyebrow="Checklist" title={`What's included in ${sv.name.toLowerCase()} in ${ar.name}`} />
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
            <p className="mt-6 text-center">
              <Link href={`/services/${sv.slug}`} className="font-bold text-brand-700 hover:underline">
                Full details on our {sv.name.toLowerCase()} service →
              </Link>
            </p>
          </Container>
        </section>
      )}

      <section className="py-14 sm:py-16">
        <Container>
          <SectionHeading eyebrow="How it works" title="Simple from quote to finish" />
          <div className="mt-10">
            <ProcessSteps steps={sv.process} />
          </div>
        </Container>
      </section>

      {suburbs.length > 0 && (
        <section className="bg-sand py-14">
          <Container>
            <SectionHeading eyebrow="Coverage" title={`Suburbs we cover around ${ar.name}`} />
            <ul className="mt-8 flex flex-wrap justify-center gap-2">
              {suburbs.map((a) => (
                <li key={a.slug}>
                  <Link href={`/areas/${a.slug}`} className="inline-block rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-brand-500 hover:text-brand-700">
                    {a.name} {a.postcode}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="py-14 sm:py-16">
          <Container className="max-w-3xl">
            <SectionHeading eyebrow="FAQs" title={`${sv.name} questions`} />
            <FaqList faqs={faqs} className="mt-8" />
          </Container>
          <JsonLd data={faqJsonLd(faqs)} />
        </section>
      )}

      {(otherServices.length > 0 || otherHubs.length > 0) && (
        <section className="bg-brand-50/60 py-14">
          <Container className="grid gap-8 md:grid-cols-2">
            {otherServices.length > 0 && (
              <div>
                <h2 className="text-xl font-extrabold text-ink">More services in {ar.name}</h2>
                <ul className="mt-4 space-y-2">
                  {otherServices.map((x) => (
                    <li key={x.slug}>
                      <Link href={`/services/${x.slug}/${ar.slug}`} className="flex items-center gap-2 font-medium text-ink hover:text-brand-700">
                        <ArrowRight className="size-4 text-brand-600" aria-hidden /> {x.name} {ar.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {otherHubs.length > 0 && (
              <div>
                <h2 className="text-xl font-extrabold text-ink">{sv.name} in other areas</h2>
                <ul className="mt-4 space-y-2">
                  {otherHubs.map((h) => (
                    <li key={h.slug}>
                      <Link href={`/services/${sv.slug}/${h.slug}`} className="flex items-center gap-2 font-medium text-ink hover:text-brand-700">
                        <ArrowRight className="size-4 text-brand-600" aria-hidden /> {sv.name} {h.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Container>
        </section>
      )}

      <CtaBand s={s} label="service-area-cta" title={`Need ${sv.name.toLowerCase()} in ${ar.name}?`} />
      <JsonLd data={serviceJsonLd(sv, path, [ar.name, ...suburbs.map((x) => x.name)], row.metaDescription || undefined)} />
    </>
  );
}
