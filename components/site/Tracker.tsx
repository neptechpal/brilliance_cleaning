"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { beacon, captureAttribution, trackContactClick } from "@/lib/track-client";

function clickType(a: HTMLAnchorElement): string | null {
  const href = (a.getAttribute("href") || "").toLowerCase();
  if (href.startsWith("tel:")) return "call_click";
  if (href.startsWith("sms:")) return "sms_click";
  if (href.startsWith("mailto:")) return "email_click";
  if (href.includes("wa.me/") || href.includes("whatsapp.com")) return "whatsapp_click";
  if (a.dataset.track === "quote_cta") return "quote_cta";
  return null;
}

/**
 * Site-wide tracking:
 *  - stores first/last-touch attribution (UTM, gclid, referrer, landing page)
 *  - records a pageview per route change
 *  - records EVERY tel:/sms:/mailto:/WhatsApp click anywhere on the page (incl. links inside
 *    markdown content) with the nearest data-track-label, and forwards it to GA4/Ads/Meta
 */
export function Tracker({ adsLead, adsCall }: { adsLead?: string; adsCall?: string }) {
  const pathname = usePathname();

  useEffect(() => {
    window.__bcTrack = { adsLead, adsCall };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a) return;
      const type = clickType(a as HTMLAnchorElement);
      if (!type) return;
      const label = a.closest("[data-track-label]")?.getAttribute("data-track-label") || "inline";
      trackContactClick(type, label, a.getAttribute("href") || "");
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [adsLead, adsCall]);

  useEffect(() => {
    captureAttribution();
    beacon("pageview");
  }, [pathname]);

  return null;
}
