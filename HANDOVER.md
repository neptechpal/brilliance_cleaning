# Handover — Brilliance Cleaning website (for Codex / next developer)

Date: 2026-10-26. Branch with work in progress: **`wip/staffing-roster`**. `main` = what is deployed on staging.

Read first: `README.md` (stack, layout, lead capture, deploy), `docs/SEO-STRATEGY.md`, `content/BRIEF.md` (copy rules — **no unconfirmed claims**), and the Next.js 16 docs in `node_modules/next/dist/docs/` (this is Next 16 with Cache Components — APIs differ from older Next).

> **Status 2026-10-26 (evening):** everything in this document is merged to `main` and deployed to https://brillianceservices.sahajilo.com — staffing admin, staff directory, `/booking`, `/careers`, roster admin and the `/brilliance-roster` staff portal. The WordPress data import has been run on the server (10 sites, 12 employees, 63 shifts, 166 attendance, 3 staff + photo, 2 bookings); the export files were deleted from the server and the staff temporary passwords handed to the client (`../wp-export/staff-portal-temp-passwords-LIVE.txt`, outside the repo). WordPress security findings are deliberately parked for now. Still open: SMTP credentials, a real address for the "DOE" site, real-device GPS check, and the production domain cut-over.

## 1. Where things stand

### Live (from `main`)
- Staging: https://brillianceservices.sahajilo.com on `root@46.250.244.227`, code `/var/projects/brilliance`, systemd `brilliance.service` (port 3011), nginx vhost `brillianceservices.sahajilo.com` (hand-written 443 block — suppora.conf is the 443 default_server). `.env` has `SITE_NOINDEX=1` (staging is never indexed).
- Update: push `main` → `ssh root@46.250.244.227 /var/projects/brilliance/deploy.sh`.
- Admin login = same as local (`../admin-credentials-local.txt`, outside repo).
- Public site, SEO pages (114), lead capture, call tracking, admin (leads, calls, traffic, content editors, SEO audit, keywords, redirects, settings, users) are done and verified.

### This branch adds (implementation complete; production HTTP-tested, visual browser checks pending)
The old WordPress site had two custom plugins the client actively uses. They are being rebuilt here:

**A. Hospitality staffing** (old plugin "Hospitality Staffing Booking" — venues book chefs/cooks/kitchen hands/cleaners; staff apply via a signup form)
- Public **`/careers`** "Join our team" application form (all fields of the old `/signup` form incl. photo, CV, certificates, availability grid) → `app/api/applications/route.ts` → `StaffApplication` + private files (`lib/storage.ts`, `STORAGE_DIR`). Admin: `/admin/applications` (+ `[id]`, CSV export, private file viewer `/api/admin/files/[id]`). ✅ built; production HTTP submission with photo/CV verified; visual browser acceptance remains.
- Public **`/booking`** "Book hospitality staff" form: positions & base rates, live Award-based estimate (`lib/staffing-estimate.ts`), staff-preference picker (active staff + `/api/staff-photo/[id]`), policies accordion, acceptance → `app/api/staff-bookings/route.ts` → `StaffBooking` + emails (`lib/staffing-mail.ts`). ✅ built; production HTTP submission and validation verified.
- Settings model + defaults copied from the old plugin: `lib/staffing-settings.ts` (positions Cook $45, Chef $50, Kitchen Hand $40, Cleaner $45 ex GST; multipliers Sat 1.5 / Sun 1.75 / PH 2.5 / evening 1.10 / night 1.15; full policies text; confirmation + acknowledgement email templates with `{PLACEHOLDERS}`).
- Hospitality Staffing service copy now names chefs/cooks/kitchen hands/cleaners; 3 new service×area pages (`content/service-areas.json`); `/signup` → `/careers` redirect; nav/footer links.

**B. Roster** (old plugin "SJ Cleaning Staff Portal" a.k.a. **BR Roster** — cleaning staff at schools/TAFEs/hotel sign in/out with GPS + geofence)
- Prisma models: `CostCentre` (sites), `Employee` (own login), `Shift`, `Attendance` (+ enums) in `prisma/schema.prisma`.
- Admin `/admin/roster/*`: overview, weekly roster grid (`components/admin/RosterGrid.tsx` — add/edit/copy/paste shifts, copy last week), month calendar, attendance (`components/admin/AttendanceTable.tsx` — approve/decline/paid/edit/manual entry/map links), employees (+ edit with password), sites (geofence radius, auto-geocode via Nominatim `lib/geo.ts`). Actions: `app/admin/actions/roster.ts`. Excel export `app/api/admin/roster/export/route.ts` uses the verified `write-excel-file` v4 runtime API via `lib/roster-export.ts`.
- Staff portal **`/brilliance-roster`** (same URL staff already use): login, forced password change, sign in/out with GPS, reverse-geocoded address, OSM mini-map, **server-side geofence** (old plugin only checked in the browser), shift notes, upcoming shifts, history. Files: `app/brilliance-roster/{page,actions}.ts(x)`, `components/portal/*`, session `lib/staff-session.ts` (cookie `bc_staff`, separate from admin). Timezone helpers `lib/sydney.ts` (shifts stored as Sydney-local `YYYY-MM-DD` + `HH:MM`; sign-in/out as real timestamps).

## 2. Remaining work (in order)

### Completed on `wip/staffing-roster`
- Admin staffing bookings: paginated status-filtered list, all booking details and stored estimate, preferred/assigned staff, status/assignment changes, confirmation/custom email forms, internal notes, concurrent-safe activity timeline, admin-only deletion.
- Admin-only staffing settings: all positions/rates, multipliers, preferences, notification address, policies markdown and email templates/placeholders. Saves the `staffing` JSON setting and expires the settings cache.
- Hospitality staff directory: source, Active control, manual creation (`source: admin`), nullable contact details, profile editing and optional private profile photo upload. Staff cache expires on changes; public photos recheck active status.
- Roster/Staffing sidebar groups, NEW booking badge and dashboard stat. `/booking` is in the sitemap/SEO audit, hospitality service CTA and footer. Removed its seed redirect and deleted the conflicting redirect from **local `brilliance_dev`**.
- Excel export uses the installed `write-excel-file` v4 sheet-object API and `.toBuffer()` without an unsafe cast. Approved-only export link is fixed; same-name employees have separate summaries. Private file/export routes check current account status.
- Reviewed roster, portal and public submission code: real date validation, Sydney DST gaps/repeated times, elapsed overnight hours, exact-minute estimates, atomic attendance changes, duplicate sign-in protection, server-side password/geofence enforcement for sign-in/out, fresh GPS fixes, repeat/copy safeguards, profile file cleanup and upload tracing exclusions. Public estimates explicitly leave public holiday/other adjustments for office confirmation.
- **WordPress migration is DONE locally.** The existing import script was not changed or rerun, and private export data was not accessed. No Prisma schema change or `db push` was needed.
- Verification: `npx tsc --noEmit`, `npx eslint .`, `npx next build` passed. Build has no upload-tracing warnings. `node --import tsx --test tests/staffing-roster.test.ts` passed (Sydney/DST, estimates, geofences, workbook contents).
- Production-server HTTP checks passed: 17 routes; authenticated booking/profile/settings forms; staff photo and CV upload; active-picker/settings cache refresh; public applications/bookings; XLSX download; current-role/disabled-account protection; internal notes and concurrent activity appends; portal password/geofence/concurrent sign-in and sign-out; manual overnight attendance; repeat shifts and idempotent week copy. Only synthetic fixtures were used and removed. SMTP was disabled for these tests; no emails were sent.

### Still to do
1. **Commit the changes on `wip/staffing-roster`.** This execution environment mounted `.git` read-only: `git add` / `git commit` failed creating `.git/index.lock` with “Operation not permitted”. Suggested logical commits: staffing admin/directory/navigation; roster, timezone, submission and export fixes with regression tests; handover update. No push, merge, deployment or SSH was attempted.
2. **Visual/browser acceptance** at desktop and 390 px: new admin forms, `/careers`, `/booking`, roster add/copy/paste, attendance, and portal with real/simulated GPS. Headless Chrome exited before opening in this environment; production HTTP/action tests do not verify client rendering or browser GPS permissions. External geocoding and real-device GPS remain to be checked.
3. **SMTP delivery check** after configuring SMTP on the target environment: acknowledgement, office notification, confirmation, custom email, and application notification. Missing-SMTP errors were verified in both admin email forms.
4. **Deploy later, only from `main` after review/merge** (outside this task):
   - Provision private `STORAGE_DIR` outside the deployed app, mode 700; runtime uploads are intentionally excluded from build tracing.
   - Set nginx `client_max_body_size 32M;` for application uploads, validate config, then reload nginx.
   - Back up the target database before schema synchronisation. Use `npx prisma db push` **without `--accept-data-loss`**; stop and investigate any data-loss warning. This completion pass made no schema changes.
   - Remove the old redirect on each target database before testing `/booking`:
     ```sql
     DELETE FROM "Redirect" WHERE "from" = '/booking';
     ```
     Restart the app (or allow its redirect cache to expire) afterwards.
   - Run `npx tsx scripts/seed.ts --force-slugs=hospitality-staffing,hospitality-staffing-hunter-valley-peak-season` for the previously updated copy/service-area pages.
   - Verify migrated records/private files on the target environment; do not assume that a local import has populated a remote database.
5. **Client cut-over:** staff keep `/brilliance-roster`; securely hand over their credentials and confirm SMTP delivery. Old WordPress security findings remain deferred by client decision.

## 3. Facts gathered from the old site (already in code/content)
- Legal entity **Brilliance Group Pty Ltd, ABN 46 681 596 823** (from the old booking-form privacy policy) — not yet put in Admin → Settings → ABN (do it).
- Booking notifications went to **info@brilliancepropertycleaning.com.au** (default in staffing settings).
- 11 active roster employees, 10 sites (schools, TAFEs, Imperial Hotel Singleton), all with 1000 m geofence; last real attendance May 2026.

## 4. Security findings on the old WordPress (tell the client)
- Site is **hacked**: 79 spam posts (new site 410s them), **2 must-use plugins** and a random-named **`wp-3a1cd1.php` inside `wp-content/plugins/sj-cleaning-staff-portal/`** — almost certainly backdoors.
- Old roster plugin exposes timesheet export **without login** (`wp_ajax_nopriv_sj_attendance_export`).
- Recommend: take the WP site offline at DNS cut-over, rotate all WP/hosting passwords, don't reuse anything from that install.

## 5. Conventions & gotchas
- Cache Components: public data via `'use cache'` + `cacheTag` (`lib/data.ts`); admin mutations call `updateTag()`. Admin panel layout sets `export const instant = false`; the portal page too.
- `proxy.ts` (not middleware) does admin auth gate, DB redirects, 410s for spam/WP paths.
- Never put secrets/PII in the repo. Local DB `brilliance_dev`; dev server `npx next dev -p 3020`.
- **Dev reload loop**: running `npx next typegen` while `next dev` is running put the dev server into a reload loop (pages reload every few seconds). Fix: stop dev, `rm -rf .next/dev`, restart.
- Seed is create-only; `--force` overwrites all content, `--force-slugs=a,b` only those rows.
- Old-site data was scraped via the logged-in WP admin in Chrome (HostGator → “Edit Site” SSO). Cloudflare obfuscates emails in HTML (`data-cfemail`) — decode if you scrape again.
