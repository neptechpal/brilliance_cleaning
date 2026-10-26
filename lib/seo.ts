import type { Metadata } from "next";
import type { SiteSettings } from "./settings";
import type { AreaT, PostT, QA, ServiceT } from "./data";

export const SITE_URL = (process.env.SITE_URL || "https://brillianceservices.com.au").replace(/\/$/, "");
export const BRAND = "Brilliance Cleaning";

export function absUrl(path = "/") {
  return path.startsWith("http") ? path : `${SITE_URL}${path === "/" ? "" : path}`;
}

/** Appends the brand only when the full title still fits in ~60 characters. */
export function fullTitle(title: string) {
  const withBrand = `${title} | ${BRAND}`;
  return withBrand.length <= 62 ? withBrand : title;
}

export function buildMetadata(opts: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  override?: { metaTitle?: string | null; metaDescription?: string | null; noindex?: boolean } | null;
}): Metadata {
  const title = fullTitle(opts.override?.metaTitle || opts.title);
  const description = opts.override?.metaDescription || opts.description;
  const noindex = opts.override?.noindex || opts.noindex;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: absUrl(opts.path) },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    openGraph: {
      type: opts.type ?? "website",
      url: absUrl(opts.path),
      title,
      description,
      siteName: "Brilliance Cleaning & Property Staging",
      locale: "en_AU",
      ...(opts.publishedTime ? { publishedTime: opts.publishedTime } : {}),
      ...(opts.modifiedTime ? { modifiedTime: opts.modifiedTime } : {}),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// ─── JSON-LD ─────────────────────────────────────────────────────────

const BUSINESS_ID = `${SITE_URL}/#business`;

export function businessJsonLd(s: SiteSettings, hubs: AreaT[], services: ServiceT[]) {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
    "@id": BUSINESS_ID,
    name: s.businessName,
    alternateName: ["Brilliance Services", "Brilliance Cleaning"],
    url: SITE_URL,
    logo: absUrl("/brand/logo-full.png"),
    image: absUrl("/brand/logo-full.png"),
    telephone: s.phone,
    email: s.email,
    priceRange: "$$",
    ...(s.abn ? { taxID: s.abn } : {}),
    address: {
      "@type": "PostalAddress",
      ...(s.address ? { streetAddress: s.address } : {}),
      addressLocality: s.locality,
      addressRegion: s.region,
      postalCode: s.postcode,
      addressCountry: "AU",
    },
    geo: { "@type": "GeoCoordinates", latitude: -32.9283, longitude: 151.7817 },
    areaServed: hubs.map((h) => ({
      "@type": "City",
      name: h.name,
      ...(h.lat && h.lng ? { geo: { "@type": "GeoCoordinates", latitude: h.lat, longitude: h.lng } } : {}),
    })),
    sameAs: [s.facebook, s.instagram, s.googleBusinessUrl].filter(Boolean),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: s.phone,
      contactType: "customer service",
      areaServed: "AU",
      availableLanguage: "English",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Cleaning & property staging services",
      itemListElement: services.map((sv) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: sv.name, url: absUrl(`/services/${sv.slug}`) },
      })),
    },
  };
}

export function websiteJsonLd(s: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: s.businessName,
    publisher: { "@id": BUSINESS_ID },
    inLanguage: "en-AU",
  };
}

export function serviceJsonLd(sv: ServiceT, path: string, areaNames: string[], description?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: sv.name,
    serviceType: sv.name,
    url: absUrl(path),
    description: description || sv.metaDescription || sv.summary || "",
    provider: { "@id": BUSINESS_ID },
    areaServed: areaNames.map((n) => ({ "@type": "Place", name: `${n}, NSW` })),
    ...(sv.priceFrom
      ? { offers: { "@type": "Offer", priceCurrency: "AUD", price: sv.priceFrom, description: sv.priceNote || "Starting price" } }
      : {}),
  };
}

export function faqJsonLd(faqs: QA[]) {
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absUrl(it.path) })),
  };
}

export function articleJsonLd(p: PostT) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.metaDescription || p.excerpt || "",
    url: absUrl(`/blog/${p.slug}`),
    mainEntityOfPage: absUrl(`/blog/${p.slug}`),
    datePublished: p.publishedAt?.toISOString(),
    dateModified: p.updatedAt.toISOString(),
    author: { "@type": "Organization", name: p.authorName, url: SITE_URL },
    publisher: { "@id": BUSINESS_ID },
    image: absUrl("/opengraph-image"),
    inLanguage: "en-AU",
  };
}
