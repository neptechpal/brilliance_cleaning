import type { Metadata } from "next";
import { getAreas, getPageSeo } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { AreasGrid, CtaBand } from "@/components/site/sections";
import { Breadcrumbs, Container } from "@/components/site/ui";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Areas We Service | Newcastle & Hunter Cleaners",
    description:
      "Find local cleaners in your suburb: Newcastle, Lake Macquarie, Maitland, Cessnock & the Hunter Valley, Port Stephens and Singleton. Free quotes.",
    path: "/areas",
    override: await getPageSeo("/areas"),
  });
}

export default async function AreasPage() {
  const [s, areas] = await Promise.all([getSettings(), getAreas()]);
  return (
    <>
      <section className="hero-bg">
        <Container className="py-10 sm:py-14">
          <Breadcrumbs items={[{ name: "Areas", path: "/areas" }]} />
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Areas we service across Newcastle &amp; the Hunter</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Our team covers {s.serviceAreaText}. Choose your region or suburb for local information and quotes.
          </p>
        </Container>
      </section>
      <section className="py-12">
        <Container>
          <AreasGrid areas={areas} />
        </Container>
      </section>
      <CtaBand s={s} label="areas-cta" text="Not sure if we cover your suburb? Call or send a quote request and we'll let you know straight away." />
    </>
  );
}
