import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, ChevronDown, HardHat, Home, Mail, MapPin, Phone } from "lucide-react";
import type { AreaT, ServiceT } from "@/lib/data";
import type { SiteSettings } from "@/lib/settings";
import { Container, Icon } from "./ui";
import { MobileNav } from "./MobileNav";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`} aria-label="Brilliance Cleaning – home">
      <Image src="/brand/mark-160.png" alt="" width={62} height={40} priority className="h-10 w-auto" />
      <span className="leading-none">
        <span className="block text-[1.15rem] font-extrabold tracking-tight text-ink">
          Brilliance<span className="text-brand-600"> Cleaning</span>
        </span>
        <span className="mt-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">
          Services
        </span>
      </span>
    </Link>
  );
}

export function Header({ s, services, hubs }: { s: SiteSettings; services: ServiceT[]; hubs: AreaT[] }) {
  const groups = [
    { id: "residential", title: "Home cleaning", icon: Home, items: services.filter((x) => x.category === "residential") },
    { id: "commercial", title: "Business & venues", icon: Building2, items: services.filter((x) => x.category === "commercial") },
    { id: "specialist", title: "Specialist", icon: HardHat, items: services.filter((x) => x.category === "specialist") },
  ].filter((g) => g.items.length);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="hidden bg-ink text-white/90 md:block">
        <Container className="flex h-9 items-center justify-between text-xs">
          <p className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-brand-200" aria-hidden />
            Local cleaners servicing Newcastle, Lake Macquarie, Maitland, the Hunter Valley &amp; Port Stephens
          </p>
          <div className="flex items-center gap-5" data-track-label="topbar">
            <Link href="/careers" className="font-semibold text-brand-200 hover:text-white">
              Join our team
            </Link>
            <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 hover:text-white">
              <Mail className="size-3.5" aria-hidden />
              {s.email}
            </a>
            <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 font-semibold hover:text-white">
              <Phone className="size-3.5" aria-hidden />
              {s.phoneDisplay}
            </a>
          </div>
        </Container>
      </div>

      <Container className="flex h-[4.25rem] items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          <div className="group relative">
            <Link href="/services" className="flex items-center gap-1 rounded-lg px-3 py-2 font-semibold text-ink hover:text-brand-700">
              Services <ChevronDown className="size-4 transition group-hover:rotate-180" aria-hidden />
            </Link>
            <div className="invisible absolute left-0 top-full w-[46rem] -translate-x-28 pt-2 xl:left-1/2 xl:-translate-x-1/2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="rounded-2xl border border-line bg-white shadow-xl">
                <div className="grid grid-cols-3 gap-x-6 gap-y-5 p-6">
                  {groups.map((g) => (
                    <div key={g.id}>
                      {/* group label: a heading, not a link — small caps, accent icon and a divider so it never reads as a menu item */}
                      <p
                        id={`nav-group-${g.id}`}
                        className="mb-2 flex items-center gap-2 border-b border-line pb-2.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-brand-700"
                      >
                        <g.icon className="size-4 text-coral-500" aria-hidden />
                        {g.title}
                      </p>
                      <ul aria-labelledby={`nav-group-${g.id}`} className="-mx-2 space-y-0.5">
                        {g.items.map((it) => (
                          <li key={it.slug}>
                            <Link
                              href={`/services/${it.slug}`}
                              className="group/item flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink transition hover:bg-brand-50 hover:text-brand-700 focus-visible:bg-brand-50 focus-visible:text-brand-700"
                            >
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sand text-ink-soft ring-1 ring-line transition group-hover/item:bg-white group-hover/item:text-brand-600">
                                <Icon name={it.icon} className="size-4" />
                              </span>
                              {it.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-b-2xl border-t border-line bg-sand px-6 py-3 text-sm">
                  <span className="text-ink-soft">Not sure what you need? We&apos;ll quote it for free.</span>
                  <Link href="/services" className="inline-flex items-center gap-1 font-bold text-brand-700 hover:text-brand-900">
                    All services <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="group relative">
            <Link href="/areas" className="flex items-center gap-1 rounded-lg px-3 py-2 font-semibold text-ink hover:text-brand-700">
              Areas <ChevronDown className="size-4 transition group-hover:rotate-180" aria-hidden />
            </Link>
            <div className="invisible absolute left-1/2 top-full w-64 -translate-x-1/2 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <ul className="space-y-1 rounded-2xl border border-line bg-white p-4 shadow-xl">
                {hubs.map((h) => (
                  <li key={h.slug}>
                    <Link href={`/areas/${h.slug}`} className="block rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-brand-50 hover:text-brand-700">
                      {h.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/areas" className="block rounded-lg px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50">
                    All suburbs →
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <Link href="/about" className="rounded-lg px-3 py-2 font-semibold text-ink hover:text-brand-700">
            About
          </Link>
          <Link href="/blog" className="rounded-lg px-3 py-2 font-semibold text-ink hover:text-brand-700">
            Tips &amp; Guides
          </Link>
          <Link href="/contact" className="rounded-lg px-3 py-2 font-semibold text-ink hover:text-brand-700">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${s.phone}`}
            data-track-label="header"
            className="hidden items-center gap-2 rounded-full bg-coral-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-coral-700 sm:inline-flex"
          >
            <Phone className="size-4" aria-hidden />
            {s.phoneDisplay}
          </a>
          <Link
            href="/quote"
            data-track="quote_cta"
            data-track-label="header"
            className="hidden rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 md:inline-flex"
          >
            Free quote
          </Link>
          <a
            href={`tel:${s.phone}`}
            data-track-label="header-mobile-icon"
            aria-label={`Call ${s.phoneDisplay}`}
            className="inline-flex size-11 items-center justify-center rounded-full bg-coral-600 text-white sm:hidden"
          >
            <Phone className="size-5" aria-hidden />
          </a>
          <MobileNav
            phone={s.phone}
            phoneDisplay={s.phoneDisplay}
            groups={groups.map((g) => ({
              id: g.id,
              title: g.title,
              icon: <g.icon className="size-4 text-coral-500" aria-hidden />,
              items: g.items.map((i) => ({ slug: i.slug, name: i.name, icon: <Icon name={i.icon} className="size-4" /> })),
            }))}
            hubs={hubs.map((h) => ({ slug: h.slug, name: h.name }))}
          />
        </div>
      </Container>
    </header>
  );
}
