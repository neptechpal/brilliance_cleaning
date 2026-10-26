import type { Metadata } from "next";
import { getPageSeo, getServices } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { CtaBand, ServiceGrid } from "@/components/site/sections";
import { Breadcrumbs, Container, SectionHeading } from "@/components/site/ui";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Cleaning Services Newcastle & Hunter",
    description:
      "Every service we offer across Newcastle and the Hunter: end of lease, house, deep, commercial, hospitality and post-construction cleaning, plus property staging.",
    path: "/services",
    override: await getPageSeo("/services"),
  });
}

const GROUPS = [
  { key: "residential", title: "Home cleaning", intro: "Regular, one-off and moving cleans for houses, units and rentals." },
  { key: "commercial", title: "Business & hospitality", intro: "Offices, shops, pubs, clubs, restaurants, hotels and venues." },
  { key: "specialist", title: "Specialist services", intro: "Builders cleans and property staging for sales and new builds." },
];

export default async function ServicesPage() {
  const [s, services] = await Promise.all([getSettings(), getServices()]);
  return (
    <>
      <section className="hero-bg">
        <Container className="py-10 sm:py-14">
          <Breadcrumbs items={[{ name: "Services", path: "/services" }]} />
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Cleaning services across Newcastle &amp; the Hunter</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            One local team for homes, rentals, workplaces and hospitality venues — plus property staging and venue staff when you need extra hands.
          </p>
        </Container>
      </section>
      {GROUPS.map((g) => {
        const list = services.filter((x) => x.category === g.key);
        if (!list.length) return null;
        return (
          <section key={g.key} className="py-12">
            <Container>
              <SectionHeading center={false} title={g.title} intro={g.intro} />
              <div className="mt-8">
                <ServiceGrid services={list} />
              </div>
            </Container>
          </section>
        );
      })}
      <CtaBand s={s} label="services-cta" />
    </>
  );
}
