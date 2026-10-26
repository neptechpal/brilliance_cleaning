import { getAreas, getPosts, getServices } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { absUrl } from "@/lib/seo";

// Plain-language summary for AI assistants (ChatGPT, Perplexity, Claude…) that read /llms.txt
export async function GET() {
  const [s, services, areas, posts] = await Promise.all([getSettings(), getServices(), getAreas(), getPosts()]);
  const hubs = areas.filter((a) => a.isHub);
  const body = `# ${s.businessName}

> Local cleaning, property staging and hospitality staffing company servicing Newcastle and the Hunter Region, NSW, Australia.

- Phone: ${s.phoneDisplay}
- Email: ${s.email}
- Website: ${absUrl("/")}
- Service area: ${s.serviceAreaText}
- Hours: ${s.hours}
- Free quotes: ${absUrl("/quote")}
- Jobs (chefs, cooks, kitchen hands, cleaners): ${absUrl("/careers")}

## Services
${services.map((x) => `- [${x.name}](${absUrl(`/services/${x.slug}`)}): ${x.summary ?? ""}`).join("\n")}

## Areas
${hubs
  .map((h) => {
    const subs = areas.filter((a) => a.region === h.slug && !a.isHub).map((a) => a.name);
    return `- [${h.name}](${absUrl(`/areas/${h.slug}`)})${subs.length ? `: ${subs.join(", ")}` : ""}`;
  })
  .join("\n")}

## Guides
${posts.map((p) => `- [${p.title}](${absUrl(`/blog/${p.slug}`)})`).join("\n")}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
