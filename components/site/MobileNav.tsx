"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, Phone, X } from "lucide-react";

type Item = { slug: string; name: string };

export function MobileNav({
  phone,
  phoneDisplay,
  groups,
  hubs,
}: {
  phone: string;
  phoneDisplay: string;
  groups: { title: string; items: Item[] }[];
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
                  <div key={g.title}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">{g.title}</p>
                    <ul className="grid gap-1">
                      {g.items.map((i) => (
                        <li key={i.slug}>
                          <Link href={`/services/${i.slug}`} className="block rounded-lg px-2 py-2 font-medium text-ink hover:bg-brand-50">
                            {i.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Areas</p>
                  <ul className="grid grid-cols-2 gap-1">
                    {hubs.map((h) => (
                      <li key={h.slug}>
                        <Link href={`/areas/${h.slug}`} className="block rounded-lg px-2 py-2 text-sm font-medium text-ink hover:bg-brand-50">
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
