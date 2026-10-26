# SEO & content strategy — Brilliance Cleaning (Newcastle & Hunter)

Goal: leads from organic search alone. The old WordPress site had almost no traffic, only 3 real pages, and **79 injected spam posts** (casino / betting / adult) in its sitemap — a hacked site that Google may already distrust. The rebuild starts clean and is built around local-intent searches.

## 1. Who we're targeting

| Segment | Typical searches | Landing page |
|---|---|---|
| Tenants moving out | end of lease cleaning newcastle, bond cleaning maitland, vacate clean | `/services/end-of-lease-cleaning` + `/…/<region>` |
| Homeowners | house cleaners newcastle, cleaners near me, deep clean | `/services/house-cleaning`, `/services/deep-cleaning`, suburb pages |
| Sellers & agents | home staging newcastle, pre sale clean | `/services/property-staging`, `/services/pre-sale-cleaning` |
| Venues (core strength) | restaurant / pub cleaning newcastle, winery cleaning hunter valley, hospitality staff hire | `/services/hospitality-cleaning`, `/services/hospitality-staffing` |
| Businesses | office cleaning newcastle, commercial cleaners | `/services/commercial-cleaning` |
| Builders / new estates | builders clean maitland, post construction cleaning | `/services/post-construction-cleaning/maitland` |

## 2. Site architecture (implemented)

```
/                                   brand + "cleaners newcastle"
/services/<service>                 9 live services (4 drafts ready to switch on)
/services/<service>/<region>        35 service × region pages, each with unique copy
/areas/<region>                     6 region hubs (Newcastle, Lake Macquarie, Maitland, Cessnock & Hunter Valley, Port Stephens, Singleton)
/areas/<suburb>                     48 suburb pages with unique local content
/blog/<post>                        guides + cost guides (informational → service pages)
```

- Hub-and-spoke internal links: home → services/regions → service×region → suburbs → back to services; blog posts link to 2+ services and `/quote`.
- Every page: one primary keyword in title, H1, first 100 words, one H2; unique title/description; canonical; breadcrumbs.
- Structured data: LocalBusiness (service-area business with areaServed), Service, FAQPage, BreadcrumbList, BlogPosting.
- `llms.txt` and FAQ "quick answer" paragraphs for AI Overviews / ChatGPT / Perplexity.
- Thin-content guard: Admin → SEO audit flags pages under word thresholds, duplicate titles/descriptions; any page can be set noindex.
- Old spam URLs return **410 Gone** so Google drops them fast; legacy pages 301 to their new equivalents.

## 3. Keyword map

All ~80 starting keywords are in **Admin → Content strategy**, grouped by cluster and mapped to a target URL. Status IDEA = no page yet (next content to write). Volumes and positions are blank until filled from Search Console (and optionally a keyword tool).

Priority 1 clusters: end of lease / bond cleaning, house cleaning, office/commercial cleaning, hospitality cleaning, property staging — each × Newcastle first, then Maitland and Lake Macquarie.

## 4. Content calendar (first 3 months)

2 posts a month minimum, cost guides and checklists first (they convert):

| Month | Posts | Pages |
|---|---|---|
| 1 | How to get your full bond back in NSW · What agents check at the final inspection | Switch on Airbnb cleaning if offered (Port Stephens / Hunter Valley holiday lets) |
| 2 | Office cleaning checklist for Newcastle businesses · Commercial kitchen cleaning checklist (NSW) | Add "commercial cleaning × Lake Macquarie/Maitland" variations with real examples |
| 3 | Home staging cost in Newcastle · Wedding-season venue cleaning (Hunter Valley) | Carpet / window cleaning pages if the team does them |

Each new post: quick-answer paragraph, 1,100–1,500 words, 3–5 FAQs, links to its service page(s) and `/quote`. Add the keyword to Content strategy and set status as it progresses.

## 5. Off-page (outside the website, highest impact for local)

1. **Google Business Profile** — the #1 lead source for local cleaners. Primary category "Cleaning service" (+ "Commercial cleaning service", "House cleaning service"), service areas = the six regions, services list matching the site, weekly photo posts, website link `https://brillianceservices.com.au/?utm_source=gbp&utm_medium=organic`.
2. **Reviews** — ask every happy customer; aim for 20+ in 90 days. Copy the best into Admin → Reviews (the site's review section appears automatically).
3. **NAP consistency** — identical name/phone everywhere: GBP, Facebook, Yelp AU, True Local, Hotfrog, StartLocal, Yellow Pages, Bing Places, Apple Business Connect.
4. **Local links** — Newcastle real estate agencies (preferred-supplier lists), Hunter Valley wine/tourism associations, local business chambers (Newcastle Business Chamber, Hunter Business Chamber), builders' supplier pages.
5. Confirm and switch on trust claims in Admin → Settings once true: insured, police-checked, re-clean promise. Add the ABN.

## 6. Measurement

- Admin dashboard: leads + call clicks per day, by channel, by page; conversion rate per page; organic landing pages.
- GA4 key events: `generate_lead`, `call_click`. Google Ads: lead + call conversion labels (Settings).
- Search Console monthly: update positions in Content strategy, add new queries as IDEA.
- KPIs: organic leads + calls per month, % of leads from organic, top-3 positions for priority-1 keywords, review count.
