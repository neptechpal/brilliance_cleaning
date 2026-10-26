import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Mail, MapPin, Phone } from "lucide-react";
import type { AreaT, ServiceT } from "@/lib/data";
import type { SiteSettings } from "@/lib/settings";
import { Container } from "./ui";
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
          &amp; Property Staging
        </span>
      </span>
    </Link>
  );
}

export function Header({ s, services, hubs }: { s: SiteSettings; services: ServiceT[]; hubs: AreaT[] }) {
  const groups = [
    { title: "Home cleaning", items: services.filter((x) => x.category === "residential") },
    { title: "Business & venues", items: services.filter((x) => x.category === "commercial") },
    { title: "Specialist", items: services.filter((x) => x.category === "specialist") },
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
            <div className="invisible absolute left-1/2 top-full w-[40rem] -translate-x-1/2 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="grid grid-cols-3 gap-6 rounded-2xl border border-line bg-white p-6 shadow-xl">
                {groups.map((g) => (
                  <div key={g.title}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">{g.title}</p>
                    <ul className="space-y-1.5">
                      {g.items.map((it) => (
                        <li key={it.slug}>
                          <Link href={`/services/${it.slug}`} className="text-sm font-medium text-ink hover:text-brand-700">
                            {it.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
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
            groups={groups.map((g) => ({ title: g.title, items: g.items.map((i) => ({ slug: i.slug, name: i.name })) }))}
            hubs={hubs.map((h) => ({ slug: h.slug, name: h.name }))}
          />
        </div>
      </Container>
    </header>
  );
}
