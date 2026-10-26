import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { AreaT, ServiceT } from "@/lib/data";
import type { SiteSettings } from "@/lib/settings";
import { Container } from "./ui";

export function Footer({ s, services, hubs }: { s: SiteSettings; services: ServiceT[]; hubs: AreaT[] }) {
  return (
    <footer className="mt-auto bg-ink pb-24 text-white/80 md:pb-0">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-extrabold text-white">
            Brilliance <span className="text-brand-200">Cleaning</span>
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/60">&amp; Property Staging</p>
          <p className="mt-4 text-sm leading-relaxed">
            Cleaning, property staging and hospitality staffing for homes, businesses and venues across Newcastle and the Hunter Region.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm" data-track-label="footer">
            <li>
              <a href={`tel:${s.phone}`} className="flex items-center gap-2 font-semibold text-white hover:text-brand-200">
                <Phone className="size-4" aria-hidden /> {s.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${s.email}`} className="flex items-center gap-2 hover:text-white">
                <Mail className="size-4" aria-hidden /> {s.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {s.address ? `${s.address}, ` : ""}
              {s.locality} {s.region} {s.postcode}
            </li>
          </ul>
        </div>
        <div>
          <p className="font-bold text-white">Services</p>
          <ul className="mt-4 space-y-2 text-sm">
            {services.map((sv) => (
              <li key={sv.slug}>
                <Link href={`/services/${sv.slug}`} className="hover:text-white">
                  {sv.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-bold text-white">Areas we service</p>
          <ul className="mt-4 space-y-2 text-sm">
            {hubs.map((h) => (
              <li key={h.slug}>
                <Link href={`/areas/${h.slug}`} className="hover:text-white">
                  Cleaners {h.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/areas" className="font-semibold text-brand-200 hover:text-white">
                All suburbs →
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-bold text-white">Company</p>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              ["/about", "About us"],
              ["/quote", "Get a quote"],
              ["/blog", "Tips & guides"],
              ["/booking", "Book hospitality staff"],
              ["/careers", "Careers – join our team"],
              ["/faq", "FAQs"],
              ["/contact", "Contact"],
              ["/privacy", "Privacy policy"],
              ["/terms", "Terms of service"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="hover:text-white">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm">
            <span className="font-semibold text-white">Hours:</span> {s.hours}
          </p>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-5 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {s.businessName}
            {s.abn ? ` · ABN ${s.abn}` : ""}
          </p>
          <p>Servicing {s.serviceAreaText}.</p>
        </Container>
      </div>
    </footer>
  );
}

export function MobileCallBar({ s }: { s: SiteSettings }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-line bg-white/95 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgb(15_42_54/0.08)] backdrop-blur md:hidden"
      data-track-label="sticky-mobile"
    >
      <a href={`tel:${s.phone}`} className="flex items-center justify-center gap-2 rounded-full bg-coral-600 py-3 text-[0.95rem] font-bold text-white active:bg-coral-700">
        <Phone className="size-4" aria-hidden /> Call now
      </a>
      <Link href="/quote" data-track="quote_cta" className="flex items-center justify-center rounded-full bg-brand-600 py-3 text-[0.95rem] font-bold text-white active:bg-brand-700">
        Free quote
      </Link>
    </div>
  );
}
