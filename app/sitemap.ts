import type { MetadataRoute } from "next";
import { getAreas, getPosts, getServiceAreas, getServices } from "@/lib/data";
import { absUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, areas, serviceAreas, posts] = await Promise.all([getServices(), getAreas(), getServiceAreas(), getPosts()]);
  const activeServices = new Set(services.map((s) => s.slug));
  const indexableAreas = new Set(areas.filter((a) => a.indexable).map((a) => a.slug));

  const fixed: MetadataRoute.Sitemap = [
    { url: absUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absUrl("/services"), changeFrequency: "monthly", priority: 0.9 },
    { url: absUrl("/areas"), changeFrequency: "monthly", priority: 0.8 },
    { url: absUrl("/quote"), changeFrequency: "yearly", priority: 0.8 },
    { url: absUrl("/contact"), changeFrequency: "yearly", priority: 0.6 },
    { url: absUrl("/about"), changeFrequency: "yearly", priority: 0.5 },
    { url: absUrl("/faq"), changeFrequency: "monthly", priority: 0.5 },
    { url: absUrl("/blog"), changeFrequency: "weekly", priority: 0.6 },
  ];

  return [
    ...fixed,
    ...services.map((s) => ({ url: absUrl(`/services/${s.slug}`), lastModified: s.updatedAt, changeFrequency: "monthly" as const, priority: 0.9 })),
    ...serviceAreas
      .filter((r) => r.indexable && activeServices.has(r.serviceSlug) && indexableAreas.has(r.areaSlug))
      .map((r) => ({ url: absUrl(`/services/${r.serviceSlug}/${r.areaSlug}`), lastModified: r.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...areas
      .filter((a) => a.indexable)
      .map((a) => ({ url: absUrl(`/areas/${a.slug}`), lastModified: a.updatedAt, changeFrequency: "monthly" as const, priority: a.isHub ? 0.8 : 0.6 })),
    ...posts.map((p) => ({ url: absUrl(`/blog/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
