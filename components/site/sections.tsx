import Link from "next/link";
import { ArrowRight, CalendarCheck, ClipboardCheck, Leaf, MapPin, MessageSquareQuote, ShieldCheck, Sparkles, Star, Truck, UserCheck } from "lucide-react";
import type { AreaT, PostT, ServiceT, Step } from "@/lib/data";
import type { SiteSettings } from "@/lib/settings";
import type { Review } from "@prisma/client";
import { CallButton, Card, Container, Icon, QuoteButton, SectionHeading } from "./ui";

export function ServiceCard({ sv, href }: { sv: ServiceT; href?: string }) {
  return (
    <Link
      href={href || `/services/${sv.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
    >
      <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
        <Icon name={sv.icon} />
      </span>
      <h3 className="mt-4 text-lg font-bold text-ink">{sv.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{sv.summary}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-700">
        Learn more <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

export function ServiceGrid({ services, hrefFor }: { services: ServiceT[]; hrefFor?: (s: ServiceT) => string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((sv) => (
        <ServiceCard key={sv.slug} sv={sv} href={hrefFor?.(sv)} />
      ))}
    </div>
  );
}

export function TrustBar({ s }: { s: SiteSettings }) {
  const items = [
    { icon: MapPin, title: "Local team", text: "Based in Newcastle, working across the Hunter" },
    { icon: ClipboardCheck, title: "Free quotes", text: "Clear, no-obligation pricing" },
    { icon: CalendarCheck, title: "Flexible times", text: "Early, late and weekend bookings" },
    s.trustInsured
      ? { icon: ShieldCheck, title: "Fully insured", text: "Public liability cover on every job" }
      : { icon: Truck, title: "We bring it all", text: "Equipment and products supplied" },
  ];
  if (s.trustPoliceChecked) items.splice(3, 0, { icon: UserCheck, title: "Police checked", text: "Vetted, trained cleaners" });
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${items.length > 4 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
      {items.map((it) => (
        <div key={it.title} className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white/80 p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <it.icon className="size-5" aria-hidden />
          </span>
          <span>
            <span className="block font-bold text-ink">{it.title}</span>
            <span className="block text-sm text-ink-soft">{it.text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

const DEFAULT_STEPS: Step[] = [
  { title: "Tell us about the job", text: "Call or send the quote form with your suburb, property size and preferred date." },
  { title: "Get a clear quote", text: "We confirm scope, timing and price up front — no surprises on the day." },
  { title: "We clean, you relax", text: "Our team arrives with everything needed and works through an agreed checklist." },
  { title: "Check and sign off", text: "Walk through the result with us and point out anything you'd like another look at." },
];

export function ProcessSteps({ steps = DEFAULT_STEPS }: { steps?: Step[] }) {
  const list = steps.length ? steps : DEFAULT_STEPS;
  return (
    <ol className={`grid gap-4 sm:grid-cols-2 ${list.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {list.map((st, i) => (
        <li key={st.title} className="relative rounded-2xl border border-line bg-white p-6">
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-600 text-lg font-extrabold text-white">{i + 1}</span>
          <h3 className="mt-4 font-bold text-ink">{st.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{st.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function WhyUs({ s }: { s: SiteSettings }) {
  const items = [
    { icon: MapPin, title: "Genuinely local", text: "We live and work in Newcastle and the Hunter, so we know the housing, the agents and the venues." },
    { icon: ClipboardCheck, title: "Checklist-driven", text: "Every job runs to a written checklist — the same standard real estate agents and venue managers inspect against." },
    { icon: CalendarCheck, title: "Works around you", text: "Early starts, after-close venue cleans and weekend bookings, scheduled around your keys, trade or open home." },
    { icon: Sparkles, title: "Cleaning + staging + staff", text: "One team for the clean, the styling and the venue shifts — fewer contractors to juggle." },
    { icon: Leaf, title: "Eco options on request", text: "Prefer low-tox products for kids, pets or allergies? Just ask when you book." },
    s.trustReclean
      ? { icon: ShieldCheck, title: "We put it right", text: "If something on the agreed checklist was missed, tell us and we'll come back and fix it." }
      : { icon: Truck, title: "Fully equipped", text: "Commercial-grade vacuums, steam and floor equipment and all products supplied." },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <Card key={it.title} className="p-6">
          <it.icon className="size-7 text-coral-500" aria-hidden />
          <h3 className="mt-3 font-bold text-ink">{it.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{it.text}</p>
        </Card>
      ))}
    </div>
  );
}

export function AreasGrid({ areas, serviceSlug }: { areas: AreaT[]; serviceSlug?: string }) {
  const hubs = areas.filter((a) => a.isHub);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {hubs.map((h) => {
        const subs = areas.filter((a) => a.region === h.slug && !a.isHub);
        return (
          <Card key={h.slug} className="p-6">
            <Link href={`/areas/${h.slug}`} className="group flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink group-hover:text-brand-700">{h.name}</h3>
              <ArrowRight className="size-4 text-brand-600" aria-hidden />
            </Link>
            {h.postcode && <p className="text-xs font-medium text-ink-soft">NSW {h.postcode}</p>}
            {subs.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {subs.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/areas/${a.slug}`}
                      className="inline-block rounded-full bg-sand px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-700"
                    >
                      {a.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {serviceSlug && <span className="sr-only">{serviceSlug}</span>}
          </Card>
        );
      })}
    </div>
  );
}

export function Reviews({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null;
  return (
    <section className="bg-sand py-16 sm:py-20">
      <Container>
        <SectionHeading eyebrow="Reviews" title="What our customers say" />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {reviews.slice(0, 6).map((r) => (
            <Card key={r.id} className="flex flex-col p-6">
              <div className="flex gap-0.5 text-amber-400" aria-label={`${r.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`size-4 ${i < r.rating ? "fill-current" : "text-line"}`} aria-hidden />
                ))}
              </div>
              <MessageSquareQuote className="mt-3 size-6 text-brand-200" aria-hidden />
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{r.text}</p>
              <p className="mt-4 text-sm font-bold text-ink">
                {r.author}
                {r.suburb && <span className="font-normal text-ink-soft"> · {r.suburb}</span>}
              </p>
              <p className="text-xs text-ink-soft">via {r.source}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function PostCards({ posts }: { posts: PostT[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {posts.map((p) => (
        <Link key={p.slug} href={`/blog/${p.slug}`} className="group flex flex-col rounded-2xl border border-line bg-white p-6 transition hover:border-brand-200 hover:shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-coral-600">{p.category}</span>
          <h3 className="mt-2 text-lg font-bold leading-snug text-ink group-hover:text-brand-700">{p.title}</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{p.excerpt}</p>
          <span className="mt-4 text-xs font-medium text-ink-soft">{p.readMinutes} min read</span>
        </Link>
      ))}
    </div>
  );
}

export function CtaBand({ s, title, text, label }: { s: SiteSettings; title?: string; text?: string; label: string }) {
  return (
    <section className="py-16">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-brand-700 px-6 py-12 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-brand-500/30 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-coral-500/20 blur-2xl" />
          <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-4xl">{title || "Ready for a cleaner space?"}</h2>
          <p className="relative mx-auto mt-3 max-w-2xl text-white/85">
            {text || "Tell us what you need and we'll come back with a clear, no-obligation quote — usually the same day."}
          </p>
          <div className="relative mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row" data-track-label={label}>
            <CallButton phone={s.phone} display={`Call ${s.phoneDisplay}`} label={label} size="lg" />
            <QuoteButton label={label} variant="white" className="px-6 py-3.5 text-lg">
              Get a free quote
            </QuoteButton>
          </div>
        </div>
      </Container>
    </section>
  );
}
