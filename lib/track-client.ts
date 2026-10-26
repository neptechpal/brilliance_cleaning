// Browser-only helpers: attribution storage, beacons and ad-platform events.

const FT = "bc_ft"; // first touch (localStorage, forever)
const LT = "bc_lt"; // last non-direct touch (localStorage)
const VID = "bc_vid"; // anonymous visitor id
const SLP = "bc_slp"; // session landing page (sessionStorage)
const SREF = "bc_sref"; // session external referrer (sessionStorage)

type Dict = Record<string, string | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    __bcTrack?: { adsLead?: string; adsCall?: string };
  }
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

const read = (s: Storage, k: string): Dict | null => safe(() => JSON.parse(s.getItem(k) || "null"), null);
const write = (s: Storage, k: string, v: unknown) => safe(() => s.setItem(k, typeof v === "string" ? v : JSON.stringify(v)), undefined);

export function captureAttribution() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const p = url.searchParams;
  const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : "";
  const newSession = !safe(() => sessionStorage.getItem(SLP), null);

  if (!safe(() => localStorage.getItem(VID), null)) {
    write(localStorage, VID, safe(() => crypto.randomUUID(), String(Math.random()).slice(2)));
  }
  if (newSession) {
    write(sessionStorage, SLP, url.pathname + (p.toString() ? `?${p.toString()}` : ""));
    write(sessionStorage, SREF, ref);
  }

  const touch: Dict = {
    source: p.get("utm_source") || undefined,
    medium: p.get("utm_medium") || undefined,
    campaign: p.get("utm_campaign") || undefined,
    term: p.get("utm_term") || undefined,
    content: p.get("utm_content") || undefined,
    gclid: p.get("gclid") || p.get("gbraid") || p.get("wbraid") || undefined,
    fbclid: p.get("fbclid") || undefined,
    msclkid: p.get("msclkid") || undefined,
    referrer: ref || undefined,
    landingPage: url.pathname,
    at: new Date().toISOString(),
  };
  const hasCampaign = touch.source || touch.gclid || touch.fbclid || touch.msclkid;
  if (hasCampaign && !newSession) {
    // a fresh ad/campaign click mid-session starts a new attribution window
    write(sessionStorage, SLP, url.pathname + `?${p.toString()}`);
    write(sessionStorage, SREF, ref);
  }
  if (!read(localStorage, FT)) write(localStorage, FT, touch);
  if (hasCampaign || (newSession && ref)) write(localStorage, LT, touch);
}

export function getAttribution() {
  const lt = read(localStorage, LT) || {};
  return {
    pagePath: window.location.pathname,
    landingPage: safe(() => sessionStorage.getItem(SLP), null) || undefined,
    referrer: safe(() => sessionStorage.getItem(SREF), null) || lt.referrer || undefined,
    utmSource: lt.source,
    utmMedium: lt.medium,
    utmCampaign: lt.campaign,
    utmTerm: lt.term,
    utmContent: lt.content,
    gclid: lt.gclid,
    fbclid: lt.fbclid,
    msclkid: lt.msclkid,
    visitorId: safe(() => localStorage.getItem(VID), null) || undefined,
    firstTouch: read(localStorage, FT) || undefined,
  };
}

export function beacon(type: string, extra: Dict = {}) {
  const a = getAttribution();
  const payload = JSON.stringify({
    type,
    pagePath: a.pagePath,
    landingPage: a.landingPage,
    referrer: a.referrer,
    utmSource: a.utmSource,
    utmMedium: a.utmMedium,
    utmCampaign: a.utmCampaign,
    gclid: a.gclid,
    fbclid: a.fbclid,
    visitorId: a.visitorId,
    ...extra,
  });
  const blob = new Blob([payload], { type: "text/plain" });
  if (!(navigator.sendBeacon && navigator.sendBeacon("/api/track", blob))) {
    fetch("/api/track", { method: "POST", body: payload, keepalive: true }).catch(() => {});
  }
}

function dl(event: Record<string, unknown>) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);
}

export function trackContactClick(type: string, label: string, target: string) {
  beacon(type, { label, target });
  dl({ event: type, click_label: label, click_target: target, page_path: location.pathname });
  if (window.gtag) {
    window.gtag("event", type, { click_label: label, page_path: location.pathname });
    if (type === "call_click" && window.__bcTrack?.adsCall) window.gtag("event", "conversion", { send_to: window.__bcTrack.adsCall });
  }
  if (window.fbq) window.fbq("track", "Contact", { method: type });
}

export function trackLead(leadId: number, service?: string, formType?: string) {
  dl({ event: "generate_lead", lead_id: leadId, service, form_type: formType });
  if (window.gtag) {
    window.gtag("event", "generate_lead", { lead_id: leadId, service, form_type: formType, currency: "AUD", value: 1 });
    if (window.__bcTrack?.adsLead) window.gtag("event", "conversion", { send_to: window.__bcTrack.adsLead, transaction_id: String(leadId) });
  }
  if (window.fbq) window.fbq("track", "Lead", { content_name: service });
}
