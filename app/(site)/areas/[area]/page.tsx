import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { getArea, getAreas, getServiceAreas, getServices } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { renderMarkdown } from "@/lib/markdown";
import { buildMetadata, faqJsonLd } from "@/lib/seo";
import { QuoteForm } from "@/components/site/QuoteForm";
import { CtaBand, ServiceGrid } from "@/components/site/sections";
import { Breadcrumbs, CallButton, Card, Container, FaqList, JsonLd, Markdown, SectionHeading } from "@/components/site/ui";

export async function generateStaticParams() {
  const areas = await getAreas();
  return areas.length ? areas.map((a) => ({ area: a.slug })) : [{ area: "newcastle" }];
}

export async function generateMetadata({ params }: PageProps<"/areas/[area]">): Promise<Metadata> {
  const ar = await getArea((await params).area);
  if (!ar) return {};
  return buildMetadata({
    title: ar.metaTitle || `Cleaners ${ar.name} | House & End of Lease Cleaning`,
    description: ar.metaDescription || `Local cleaning services in ${ar.name}. Free quotes – call 0411 463 552.`,
    path: `/areas/${ar.slug}`,
    noindex: !ar.indexable,
  });
}

export default async function AreaPage({ params }: PageProps<"/areas/[area]">) {
  const { area } = await params;
  const [ar, s, services, areas, serviceAreas] = await Promise.all([getArea(area), getSettings(), getServices(), getAreas(), getServiceAreas()]);
  if (!ar) notFound();

  const hub = ar.isHub ? ar : areas.find((a) => a.slug === ar.region);
  const suburbs = ar.isHub ? areas.filter((a) => a.region === ar.slug && !a.isHub) : [];
  const nearby = ar.nearby.map((n) => areas.find((a) => a.slug === n)).filter((a): a is NonNullable<typeof a> => !!a);
  const top = ar.topServices.map((t) => services.find((x) => x.slug === t)).filter((x): x is NonNullable<typeof x> => !!x);
  const others = services.filter((x) => !ar.topServices.includes(x.slug));
  // Hubs link to their dedicated service+area landing pages when one exists
  const landing = new Set(serviceAreas.filter((r) => r.areaSlug === (hub?.slug ?? "")).map((r) => r.serviceSlug));
  const hrefFor = (x: { slug: string }) => (hub && landing.has(x.slug) ? `/services/${x.slug}/${hub.slug}` : `/services/${x.slug}`);
  const path = `/areas/${ar.slug}`;
  const crumbs = [{ name: "Areas", path: "/areas" }, ...(hub && !ar.isHub ? [{ name: hub.name, path: `/areas/${hub.slug}` }] : []), { name: ar.name, path }];

  return (
    <>
      <section className="hero-bg">
        <Container className="grid gap-10 py-8 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
          <div>
            <Breadcrumbs items={crumbs} />
            <p className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 ring-1 ring-brand-100">
              <MapPin className="size-4" aria-hidden /> {ar.name} NSW {ar.postcode}
            </p>
            <h1 className="mt-4 text-[2.2rem] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">{ar.h1 || `Cleaning services in ${ar.name}`}</h1>
            <div className="mt-5 max-w-xl space-y-4 text-lg leading-relaxed text-ink-soft">
              {ar.intro.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="mt-8" data-track-label="area-hero">
              <CallButton phone={s.phone} display={`Call ${s.phoneDisplay}`} label="area-hero" size="lg" />
            </div>
          </div>
          <Card className="self-start p-5 shadow-xl shadow-brand-900/5 sm:p-7">
            <QuoteForm
              services={services.map((x) => ({ slug: x.slug, name: x.name }))}
              areas={areas.map((a) => a.name)}
              defaultSuburb={ar.isHub ? "" : ar.name}
              title={`Get a quote in ${ar.name}`}
              subtitle="Free and no obligation."
            />
          </Card>
        </Container>
      </section>

      {top.length > 0 && (
        <section className="py-14 sm:py-16">
          <Container>
            <SectionHeading eyebrow={`Popular in ${ar.name}`} title={`Most-booked services in ${ar.name}`} />
            <div className="mt-10">
              <ServiceGrid services={top} hrefFor={hrefFor} />
            </div>
          </Container>
        </section>
      )}

      {ar.localContent && (
        <section className="bg-brand-50/60 py-14 sm:py-16">
          <Container className="grid gap-12 lg:grid-cols-[1fr_20rem]">
            <Markdown html={renderMarkdown(ar.localContent)} />
            <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
              {ar.landmarks.length > 0 && (
                <Card className="p-6">
                  <p className="font-bold text-ink">Around {ar.name}</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                    {ar.landmarks.map((l) => (
                      <li key={l} className="flex gap-2">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden /> {l}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              <Card className="p-6">
                <p className="font-bold text-ink">All our services in {ar.name}</p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {others.concat(top).map((x) => (
                    <li key={x.slug}>
                      <Link href={hrefFor(x)} className="text-ink-soft hover:text-brand-700">
                        {x.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </aside>
          </Container>
        </section>
      )}

      {suburbs.length > 0 && (
        <section className="py-14">
          <Container>
            <SectionHeading eyebrow="Coverage" title={`Suburbs we service in ${ar.name}`} />
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {suburbs.map((a) => (
                <Link key={a.slug} href={`/areas/${a.slug}`} className="group flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 font-medium text-ink hover:border-brand-200 hover:text-brand-700">
                  <span>
                    {a.name} <span className="text-sm text-ink-soft">{a.postcode}</span>
                  </span>
                  <ArrowRight className="size-4 text-brand-600" aria-hidden />
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      {ar.faqs.length > 0 && (
        <section className="py-14 sm:py-16">
          <Container className="max-w-3xl">
            <SectionHeading eyebrow="FAQs" title={`Cleaning in ${ar.name}: common questions`} />
            <FaqList faqs={ar.faqs} className="mt-8" />
          </Container>
          <JsonLd data={faqJsonLd(ar.faqs)} />
        </section>
      )}

      {nearby.length > 0 && (
        <section className="bg-sand py-14">
          <Container>
            <h2 className="text-center text-2xl font-extrabold text-ink">{ar.isHub ? "Other regions we cover" : `Also servicing near ${ar.name}`}</h2>
            <ul className="mt-6 flex flex-wrap justify-center gap-2">
              {nearby.map((a) => (
                <li key={a.slug}>
                  <Link href={`/areas/${a.slug}`} className="inline-block rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand-500 hover:text-brand-700">
                    Cleaners {a.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <CtaBand s={s} label="area-cta" title={`Book a cleaner in ${ar.name}`} />
    </>
  );
}
