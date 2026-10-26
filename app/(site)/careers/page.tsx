import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ChefHat, ClipboardCheck, MapPin, Sparkles, UtensilsCrossed } from "lucide-react";
import { getAreas, getPageSeo } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { buildMetadata, faqJsonLd } from "@/lib/seo";
import { ApplicationForm } from "@/components/site/ApplicationForm";
import { Breadcrumbs, Card, Container, FaqList, JsonLd, SectionHeading } from "@/components/site/ui";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Hospitality & Cleaning Jobs Newcastle | Join Our Team",
    description:
      "Chef, cook, kitchen hand and cleaning jobs across Newcastle and the Hunter. Casual, part-time, full-time and event shifts. Apply online in minutes.",
    path: "/careers",
    override: await getPageSeo("/careers"),
  });
}

const ROLES = [
  { icon: ChefHat, title: "Chefs", text: "À la carte, bistro, banquet and function kitchens. Cert III in Commercial Cookery valued." },
  { icon: UtensilsCrossed, title: "Cooks", text: "Line, grill, prep and breakfast service for pubs, clubs, cafés and venues." },
  { icon: ClipboardCheck, title: "Kitchen hands", text: "Dishwashing, prep support and keeping busy kitchens clean and organised." },
  { icon: Sparkles, title: "Cleaners", text: "Venue, commercial and residential cleaning, early mornings, evenings and weekends." },
];

const FAQS = [
  {
    q: "What kind of work do you offer?",
    a: "Shifts for chefs, cooks, kitchen hands and cleaners at hospitality venues, businesses and homes across Newcastle and the Hunter — regular rosters, casual shifts and event work.",
  },
  {
    q: "Do I need qualifications?",
    a: "It depends on the role. Chefs benefit from a Cert III in Commercial Cookery, and food handling, Food Safety Supervisor, RSA, first aid or a Working With Children Check open up more shifts. Tell us what you hold and upload copies with your application.",
  },
  {
    q: "Can I choose my areas and hours?",
    a: "Yes. Tell us your preferred locations, shift types and the days and times you're available, and we'll match you to shifts that fit.",
  },
  {
    q: "Can I work as PAYG or on an ABN?",
    a: "Let us know your preference on the form — PAYG (TFN) or ABN contractor — and we'll talk it through with you.",
  },
  {
    q: "What happens after I apply?",
    a: "We review your application and contact you if there's a suitable role or shift. That usually includes a quick chat, a check of your certificates and references, then onboarding before your first shift.",
  },
];

export default async function CareersPage() {
  const [s, areas] = await Promise.all([getSettings(), getAreas()]);
  return (
    <>
      <section className="hero-bg">
        <Container className="py-10 sm:py-14">
          <Breadcrumbs items={[{ name: "Careers", path: "/careers" }]} />
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Hospitality &amp; cleaning jobs across Newcastle and the Hunter</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            We place chefs, cooks, kitchen hands and cleaners with pubs, clubs, restaurants, hotels, function venues and wineries — plus cleaning work for homes and businesses.
            Casual, part-time, full-time and event shifts.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-ink">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-line">
              <MapPin className="size-4 text-brand-600" aria-hidden /> Newcastle, Lake Macquarie, Maitland, Hunter Valley, Port Stephens
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-line">
              <CalendarClock className="size-4 text-brand-600" aria-hidden /> Flexible shifts that fit your availability
            </span>
          </div>
          <a href="#apply" className="mt-8 inline-flex rounded-full bg-brand-600 px-6 py-3.5 text-lg font-bold text-white hover:bg-brand-700">
            Apply now
          </a>
        </Container>
      </section>

      <section className="py-14">
        <Container>
          <SectionHeading eyebrow="Who we're looking for" title="Roles we hire for" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r) => (
              <Card key={r.title} className="p-6">
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <r.icon className="size-6" aria-hidden />
                </span>
                <h2 className="mt-4 text-lg font-bold text-ink">{r.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{r.text}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-brand-50/60 py-14" id="apply">
        <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading center={false} eyebrow="Join our team" title="Apply in about 5 minutes" intro="Have your CV and any certificates ready to upload. Fields marked * are required." />
            <ol className="mt-6 space-y-3 text-sm text-ink-soft">
              {["Send your application", "We review your experience, certificates and availability", "Quick chat and reference check", "Onboarding, then your first shift"].map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-ink-soft">
              Questions about working with us? Call{" "}
              <a href={`tel:${s.phone}`} data-track-label="careers" className="font-semibold text-brand-700 hover:underline">
                {s.phoneDisplay}
              </a>
              .
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Need staff for your venue instead?{" "}
              <Link href="/services/hospitality-staffing" className="font-semibold text-brand-700 hover:underline">
                See hospitality staffing
              </Link>
              .
            </p>
          </div>
          <Card className="p-5 shadow-xl shadow-brand-900/5 sm:p-8">
            <ApplicationForm areas={areas.map((a) => a.name)} />
          </Card>
        </Container>
      </section>

      <section className="py-14">
        <Container className="max-w-3xl">
          <SectionHeading eyebrow="FAQs" title="Working with Brilliance" />
          <FaqList faqs={FAQS} className="mt-8" />
        </Container>
        <JsonLd data={faqJsonLd(FAQS)} />
      </section>
    </>
  );
}
