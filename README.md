# Brilliance Cleaning & Property Staging — website + admin

Replacement for the WordPress site at brillianceservices.com.au. Goal: win leads from organic search across Newcastle and the Hunter, capture every enquiry and phone tap, and give the team an admin panel to manage leads, content and SEO.

## Stack

- **Next.js 16** (App Router, Cache Components, `proxy.ts`) + React 19 + TypeScript + Tailwind v4
- **Postgres** via **Prisma 6** (`prisma/schema.prisma`)
- No external CMS: all content lives in the DB and is edited in `/admin`
- Email: any SMTP (SMTP2GO recommended) via nodemailer

> Next 16 differs from older versions. Read `node_modules/next/dist/docs/` before changing caching, routing or proxy code (see `AGENTS.md`).

## Local development

```bash
cp .env.example .env            # set DATABASE_URL, SESSION_SECRET, IP_SALT, SITE_URL
createdb brilliance_dev
npx prisma db push
npx tsx scripts/seed.ts         # content from content/*.json + admin user
npx next dev -p 3020            # http://localhost:3020  ·  /admin
```

The seed creates the first admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`, or generates a password and writes it to `../admin-credentials-local.txt` (outside the repo, chmod 600). Re-running the seed only creates missing rows; `--force` overwrites content from the JSON files.

## Layout

| Path | What |
|---|---|
| `app/(site)/` | Public site: home, `/services/[service]`, `/services/[service]/[area]`, `/areas/[area]`, `/blog/[slug]`, `/quote`, `/contact`, `/about`, `/faq`, legal, `/thank-you` |
| `app/admin/` | Admin panel (login, dashboard, leads, call clicks, traffic, content editors, SEO audit, content strategy, redirects, settings, users) |
| `app/api/leads` | Lead capture endpoint (validation, spam scoring, attribution, email after response) |
| `app/api/track` | Beacon endpoint for page views, call/SMS/email clicks, quote-button clicks, form starts |
| `app/sitemap.ts`, `robots.ts`, `llms.txt/` | Generated from the DB |
| `proxy.ts` | Admin auth gate, DB redirects (301/302/410), 410 for the old WP spam URLs |
| `lib/data.ts` | Cached (`'use cache'` + tags) content queries; admin actions call `updateTag()` so edits go live instantly |
| `lib/seo.ts` | Metadata builder + JSON-LD (LocalBusiness, Service, FAQPage, BreadcrumbList, BlogPosting) |
| `lib/track-client.ts`, `components/site/Tracker.tsx` | First/last-touch attribution, beacons, GA4/Ads/Meta events |
| `content/` | Seed copy (services, 54 areas, 35 service×area pages, blog posts, FAQs) + `BRIEF.md` writing rules |
| `docs/SEO-STRATEGY.md` | Keyword map, architecture, content calendar, off-page plan, KPIs |

## Lead capture

1. Every form posts to `/api/leads`. The lead is **written to the DB first**; the notification email is sent afterwards (`after()`), so an SMTP failure never loses a lead. Failures are shown on the dashboard and on the lead.
2. Spam is flagged (honeypot, <2.5 s submit, link-stuffing, keywords) and stored with status `SPAM`, never silently dropped.
3. Attribution stored with each lead: page submitted on, session landing page, referrer, channel (Google organic / Google Ads / GBP / AI search / social / direct…), UTM source/medium/campaign/term/content, gclid/fbclid/msclkid, first-touch, device.
4. **Call tracking**: a global capture-phase click listener records every `tel:`, `sms:`, `mailto:` and WhatsApp link anywhere on the site (including links inside markdown content), with the nearest `data-track-label` (header, hero, sticky-mobile, footer…). Events go to `/api/track` via `sendBeacon` and to GA4 (`call_click`), Google Ads (call conversion label) and Meta (`Contact`).
5. Conversions fire `generate_lead` (GA4 + dataLayer), the Google Ads lead conversion (deduplicated by `transaction_id`) and Meta `Lead`, then redirect to `/thank-you` (noindex).
6. The team's own browsing while logged into `/admin` isn't counted.

## Deploy (self-hosted)

```bash
npm ci
npx prisma db push              # or migrate
SITE_URL=https://brillianceservices.com.au npx next build
npx tsx scripts/seed.ts         # first deploy only
npx next start -p <port>        # behind nginx, systemd unit, certbot
```

- `SITE_URL` must be the production origin **at build time** (canonicals, sitemap, schema).
- Behind nginx, pass `X-Forwarded-For` so rate limiting and IP hashing work.
- Before DNS cutover: set up SMTP, add GA4/Ads IDs and the Search Console verification code in Admin → Settings.
- After cutover: verify Search Console, submit `/sitemap.xml`, request indexing for the home and service pages, import into Bing Webmaster Tools.
