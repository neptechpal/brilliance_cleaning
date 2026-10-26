# Content brief — Brilliance Cleaning & Property Staging

All site copy is seeded from JSON files in this folder (`content/*.json`) into Postgres by `scripts/seed.ts`, then editable in the admin panel. Write JSON with a Python script using `json.dump(..., ensure_ascii=False, indent=2)` so escaping is always valid, then re-load it with `json.load` to validate.

## Business facts (only use these — never invent others)
- Brand: **Brilliance Cleaning & Property Staging** (also "Brilliance Services"). Domain brillianceservices.com.au
- Phone **0411 463 552** · Email admin@brillianceservices.com.au
- Service area: **Newcastle and the Hunter Region, NSW** (Newcastle, Lake Macquarie, Maitland, Cessnock/Hunter Valley, Port Stephens, Singleton).
- What they do: residential cleaning, end of lease (move-in / move-out) cleaning, commercial cleaning, post-construction cleaning, property staging, and **cleaning + staffing solutions for hospitality venues** (pubs, clubs, restaurants, cafés, hotels, function venues, wineries) across Newcastle and the Hunter.
- Numbers they publish: 50+ happy customers, 30+ staff.
- Positioning they use: professional trained team, tailored packages, flexible scheduling around the client, "Let us handle the details so you don't have to".

## Claims you must NOT make (not confirmed by the client yet)
No years-in-business, no insurance amounts, no "police checked", no "bond back guarantee" / "100% guarantee", no awards, no review counts or star ratings, no "#1", no named clients, no fake testimonials, no specific prices presented as Brilliance's own prices. Do not name competitors.
You MAY say: "we clean to the checklist real estate agents use", "eco-friendly products on request", "we bring our own equipment and products", "free, no-obligation quotes", "flexible scheduling incl. weekends", "local Newcastle & Hunter team", "re-clean: if your agent flags something on our checklist, tell us and we'll come back" — phrase that last one softly ("we'll work with you to put it right").
Cost guides (blog) may quote **typical market ranges** for Newcastle, clearly framed as "typical ranges we see in the Newcastle market" and "your quote depends on…", never as a fixed Brilliance price.

## Voice & SEO rules
- Australian English (colour, organise, neighbour, metres, bond, real estate agent, tenancy, NSW Fair Trading). Plain, friendly, specific. Short paragraphs.
- Banned filler: "in today's fast-paced world", "look no further", "one-stop shop", "nestled", "bustling", "elevate", "unlock", "seamless", "tailored to your unique needs", "we pride ourselves", "spotless" more than once per page, "sparkling" more than once.
- Every page targets one primary keyword (e.g. "end of lease cleaning Newcastle") used in metaTitle, h1 (natural variant), first 100 words, and once in an H2. No keyword stuffing.
- metaTitle ≤ 60 chars, metaDescription 140–155 chars with a call to action. Don't put the brand in metaTitle if it pushes over 60 (the site appends " | Brilliance Cleaning" automatically only when it fits — so write titles WITHOUT the brand).
- Markdown bodies: use `##` and `###` only (never `#`), bullet lists where useful, no images, no links except internal links in the form `/services/<slug>`, `/areas/<slug>`, `/quote`, `/blog/<slug>` (only slugs listed below).
- Local accuracy matters: real postcodes, real landmarks/streets/beaches/universities/hospitals, real housing character (e.g. Cooks Hill terraces, student rentals near the University of Newcastle at Callaghan, new estates in Chisholm). If unsure of a fact, web-search it; if still unsure, leave it out.

## Canonical slugs

### Services (`active` = shown on site now; drafts are hidden until the client confirms)
| slug | name | category | active |
|---|---|---|---|
| end-of-lease-cleaning | End of Lease Cleaning | residential | true |
| house-cleaning | House Cleaning | residential | true |
| deep-cleaning | Deep & Spring Cleaning | residential | true |
| pre-sale-cleaning | Pre-Sale Cleaning | residential | true |
| commercial-cleaning | Commercial & Office Cleaning | commercial | true |
| hospitality-cleaning | Hospitality Venue Cleaning | commercial | true |
| hospitality-staffing | Hospitality Staffing | commercial | true |
| post-construction-cleaning | Post-Construction Cleaning | specialist | true |
| property-staging | Property Staging | specialist | true |
| airbnb-cleaning | Airbnb & Holiday Rental Cleaning | residential | false |
| carpet-cleaning | Carpet Steam Cleaning | specialist | false |
| window-cleaning | Window Cleaning | specialist | false |
| ndis-cleaning | NDIS Cleaning | residential | false |

### Areas (hubs are regions; every suburb has a `region` = one hub slug)
Hubs: `newcastle` (Newcastle), `lake-macquarie` (Lake Macquarie), `maitland` (Maitland), `hunter-valley` (Cessnock & Hunter Valley), `port-stephens` (Port Stephens), `singleton` (Singleton).

Newcastle region suburbs: cooks-hill, the-junction, merewether, hamilton, adamstown, kotara, lambton, new-lambton, jesmond, wallsend, mayfield, waratah, islington, wickham, carrington, stockton, broadmeadow, elermore-vale, shortland, newcastle-east
Lake Macquarie region suburbs: charlestown, warners-bay, belmont, cardiff, glendale, toronto, swansea, speers-point, whitebridge, edgeworth
Maitland region suburbs: east-maitland, rutherford, thornton, lochinvar, chisholm, morpeth, gillieston-heights, telarah
Hunter Valley region suburbs: cessnock, kurri-kurri, pokolbin, branxton, greta
Port Stephens region suburbs: raymond-terrace, medowie, nelson-bay, williamtown, fern-bay
Singleton: hub only (no suburbs)

## File formats

### content/services.json — array
```json
{
  "slug": "end-of-lease-cleaning",
  "name": "End of Lease Cleaning",
  "category": "residential",
  "active": true,
  "featured": true,
  "icon": "KeyRound",            // a lucide-react icon name
  "metaTitle": "End of Lease Cleaning Newcastle & Hunter",
  "metaDescription": "…140-155 chars with CTA…",
  "h1": "End of Lease Cleaning in Newcastle & the Hunter",
  "heroIntro": "40–60 words under the H1",
  "summary": "≤ 25 words for service cards",
  "body": "markdown, 700–1000 words, ## / ### headings",
  "inclusions": [{ "area": "Kitchen", "items": ["Oven, racks and trays degreased", "…"] }],
  "exclusions": ["…"],
  "process": [{ "title": "Get a quote", "text": "…" }],
  "idealFor": ["Tenants moving out", "…"],
  "faqs": [{ "q": "…", "a": "…" }],
  "keywords": ["end of lease cleaning newcastle", "bond cleaning newcastle", "…"],
  "related": ["deep-cleaning", "carpet-cleaning"]
}
```
5–7 FAQs per service. `related` = 3 slugs from the table.

### content/areas-*.json — array
```json
{
  "slug": "cooks-hill",
  "name": "Cooks Hill",
  "region": "newcastle",        // hub slug; for a hub use its own slug
  "isHub": false,
  "postcode": "2300",
  "lat": -32.933, "lng": 151.770,
  "metaTitle": "Cleaners in Cooks Hill | House & End of Lease",
  "metaDescription": "…",
  "h1": "Cleaning Services in Cooks Hill",
  "intro": "80–120 words, unique, local",
  "localContent": "markdown 250–400 words: housing/property character, who lives/works there (renters, families, students, venues), which of the services matter most here and why, practical notes (parking, terraces with stairs, salt air near beaches, new-build dust in estates, wine-country venues). Unique per suburb — no shared paragraphs.",
  "landmarks": ["Darby Street", "Newcastle Art Gallery"],
  "nearby": ["the-junction", "merewether"],   // 3–5 slugs from the list above
  "topServices": ["end-of-lease-cleaning", "house-cleaning", "hospitality-cleaning"],  // 3 active service slugs most relevant locally
  "faqs": [{ "q": "…", "a": "…" }]           // 2–3 local FAQs
}
```
Hubs: intro 120–160 words, localContent 450–650 words covering the whole region, `nearby` = other hubs.

### content/posts.json — array
```json
{
  "slug": "end-of-lease-cleaning-checklist-nsw",
  "title": "…",
  "metaTitle": "…≤60",
  "metaDescription": "…",
  "excerpt": "≤ 35 words",
  "category": "Guides",          // Guides | Cost Guides | Tips | Hospitality | Property Staging
  "tags": ["end of lease", "bond"],
  "readMinutes": 7,
  "body": "markdown 1100–1500 words, ## / ### only, includes a short 'Quick answer' paragraph at the top for AI Overviews, at least 2 internal links to /services/... and one to /quote",
  "faqs": [{ "q": "…", "a": "…" }],
  "relatedServices": ["end-of-lease-cleaning"],
  "publishedAt": "2026-10-20"
}
```

### content/service-areas.json — array (service × hub landing pages)
```json
{
  "service": "end-of-lease-cleaning",
  "area": "maitland",
  "metaTitle": "End of Lease Cleaning Maitland",
  "metaDescription": "…",
  "h1": "End of Lease Cleaning in Maitland",
  "intro": "110–160 words unique to this service in this region (local rental market, property types, typical jobs, travel/coverage)",
  "localTips": ["3 short, practical local tips specific to this service + region"]
}
```
