import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getAreas, getPageSeo, getServices } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { QuoteForm } from "@/components/site/QuoteForm";
import { Breadcrumbs, Card, Container } from "@/components/site/ui";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Contact Us | Brilliance Cleaning Newcastle",
    description: "Contact Brilliance Cleaning & Property Staging in Newcastle. Call 0411 463 552, email admin@brillianceservices.com.au or send us a message.",
    path: "/contact",
    override: await getPageSeo("/contact"),
  });
}

export default async function ContactPage() {
  const [s, services, areas] = await Promise.all([getSettings(), getServices(), getAreas()]);
  const rows = [
    { icon: Phone, label: "Phone", value: s.phoneDisplay, href: `tel:${s.phone}` },
    { icon: Mail, label: "Email", value: s.email, href: `mailto:${s.email}` },
    { icon: Clock, label: "Hours", value: s.hours },
    { icon: MapPin, label: "Service area", value: s.serviceAreaText },
  ];
  return (
    <section className="hero-bg">
      <Container className="grid gap-10 py-10 sm:py-14 lg:grid-cols-2">
        <div>
          <Breadcrumbs items={[{ name: "Contact", path: "/contact" }]} />
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Contact us</h1>
          <p className="mt-4 text-lg text-ink-soft">Questions, quotes or a venue that needs extra staff this weekend — get in touch and a real person will get back to you.</p>
          <ul className="mt-8 space-y-4" data-track-label="contact-page">
            {rows.map((r) => (
              <li key={r.label} className="flex gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-brand-100">
                  <r.icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm text-ink-soft">{r.label}</span>
                  {r.href ? (
                    <a href={r.href} className="text-lg font-bold text-ink hover:text-brand-700">
                      {r.value}
                    </a>
                  ) : (
                    <span className="block font-semibold text-ink">{r.value}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Card className="self-start p-5 shadow-xl shadow-brand-900/5 sm:p-8">
          <QuoteForm variant="contact" services={services.map((x) => ({ slug: x.slug, name: x.name }))} areas={areas.map((a) => a.name)} title="Send us a message" />
        </Card>
      </Container>
    </section>
  );
}
