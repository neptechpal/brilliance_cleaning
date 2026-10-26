import type { MetadataRoute } from "next";
import { SITE_NOINDEX, absUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (SITE_NOINDEX) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/thank-you"] }],
    sitemap: absUrl("/sitemap.xml"),
    host: absUrl("/"),
  };
}
