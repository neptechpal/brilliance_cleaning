"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MapPin, Menu, Phone, X } from "lucide-react";

type Item = { slug: string; name: string };
type ServiceItem = Item & { icon?: ReactNode };
type Group = { id: string; title: string; icon?: ReactNode; items: ServiceItem[] };

/** Section label — small caps with an accent icon and a divider, so it can't be mistaken for a link. */
function GroupLabel({ id, icon, children }: { id: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <p id={id} className="mb-1.5 flex items-center gap-2 border-b border-line pb-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-brand-700">
      {icon}
      {children}
    </p>
  );
}

export function MobileNav({
  phone,
  phoneDisplay,
  groups,
  hubs,
}: {
  phone: string;
  phoneDisplay: string;
  groups: Group[];
  hubs: Item[];
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-11 items-center justify-center rounded-full border border-line text-ink lg:hidden"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>
      {/* portal: the sticky header uses backdrop-blur, which would trap a fixed overlay inside it */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col overflow-y-auto bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <span className="font-extrabold text-ink">Menu</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex size-10 items-center justify-center rounded-full border border-line"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>
              {/* close the menu as soon as any link inside it is followed */}
              <nav className="flex-1 space-y-6 px-5 py-5" aria-label="Mobile" onClick={(e) => (e.target as Element).closest("a") && setOpen(false)}>
                {groups.map((g) => (
                  <div key={g.id}>
                    <GroupLabel id={`m-nav-group-${g.id}`} icon={g.icon}>
                      {g.title}
                    </GroupLabel>
                    <ul aria-labelledby={`m-nav-group-${g.id}`} className="grid gap-0.5">
                      {g.items.map((i) => (
                        <li key={i.slug}>
                          <Link
                            href={`/services/${i.slug}`}
                            className="flex items-center gap-3 rounded-lg px-2 py-2 font-medium text-ink active:bg-brand-50 hover:bg-brand-50 hover:text-brand-700"
                          >
                            {i.icon && (
                              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sand text-ink-soft ring-1 ring-line">{i.icon}</span>
                            )}
                            {i.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div>
                  <GroupLabel id="m-nav-group-areas" icon={<MapPin className="size-4 text-coral-500" aria-hidden />}>
                    Areas
                  </GroupLabel>
                  <ul aria-labelledby="m-nav-group-areas" className="grid grid-cols-2 gap-0.5">
                    {hubs.map((h) => (
                      <li key={h.slug}>
                        <Link href={`/areas/${h.slug}`} className="block rounded-lg px-2 py-2 text-sm font-medium text-ink active:bg-brand-50 hover:bg-brand-50 hover:text-brand-700">
                          {h.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <ul className="grid gap-1 border-t border-line pt-4">
                  {[
                    ["/about", "About us"],
                    ["/blog", "Tips & guides"],
                    ["/careers", "Careers"],
                    ["/faq", "FAQs"],
                    ["/contact", "Contact"],
                  ].map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="block rounded-lg px-2 py-2 font-semibold text-ink hover:bg-brand-50">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div
                className="grid gap-2 border-t border-line p-5"
                data-track-label="mobile-menu"
                onClick={(e) => (e.target as Element).closest("a") && setOpen(false)}
              >
                <a href={`tel:${phone}`} className="flex items-center justify-center gap-2 rounded-full bg-coral-600 py-3 font-bold text-white">
                  <Phone className="size-4" /> Call {phoneDisplay}
                </a>
                <Link href="/quote" data-track="quote_cta" className="flex items-center justify-center rounded-full bg-brand-600 py-3 font-bold text-white">
                  Get a free quote
                </Link>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
