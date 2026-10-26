import type { Metadata } from "next";
import { CheckCircle2, Clock, Phone } from "lucide-react";
import { getAreas, getPageSeo, getServices } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { QuoteForm } from "@/components/site/QuoteForm";
import { Breadcrumbs, Card, Container } from "@/components/site/ui";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Get a Free Cleaning Quote | Newcastle & Hunter",
    description:
      "Request a free, no-obligation quote for end of lease, house, commercial or venue cleaning or property staging in Newcastle & the Hunter. Fast reply.",
    path: "/quote",
    override: await getPageSeo("/quote"),
  });
}

export default async function QuotePage() {
  const [s, services, areas] = await Promise.all([getSettings(), getServices(), getAreas()]);
  return (
    <section className="hero-bg">
      <Container className="grid gap-10 py-10 sm:py-14 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <Breadcrumbs items={[{ name: "Get a quote", path: "/quote" }]} />
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Get a free quote</h1>
          <p className="mt-4 text-lg text-ink-soft">Tell us a little about the job and we&apos;ll come back with a clear price — usually within a few business hours.</p>
          <ul className="mt-8 space-y-4">
            {[
              [CheckCircle2, "No obligation", "A quote is just a quote. No pressure, no lock-in."],
              [Clock, "Quick response", "We reply during business hours, often the same day."],
              [Phone, "Prefer to talk?", `Call ${s.phoneDisplay} and we'll quote over the phone.`],
            ].map(([I, t, d]) => {
              const IconCmp = I as typeof CheckCircle2;
              return (
                <li key={t as string} className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-brand-100">
                    <IconCmp className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-bold text-ink">{t as string}</span>
                    <span className="block text-sm text-ink-soft">{d as string}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <a href={`tel:${s.phone}`} data-track-label="quote-page" className="mt-8 inline-flex items-center gap-2 text-2xl font-extrabold text-coral-600 hover:underline">
            <Phone className="size-6" aria-hidden /> {s.phoneDisplay}
          </a>
        </div>
        <Card className="p-5 shadow-xl shadow-brand-900/5 sm:p-8">
          <QuoteForm variant="full" services={services.map((x) => ({ slug: x.slug, name: x.name }))} areas={areas.map((a) => a.name)} title="Your quote request" />
        </Card>
      </Container>
    </section>
  );
}
