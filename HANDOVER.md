# Handover — Brilliance Cleaning website (for Codex / next developer)

Date: 2026-10-26. Branch with work in progress: **`wip/staffing-roster`**. `main` = what is deployed on staging.

Read first: `README.md` (stack, layout, lead capture, deploy), `docs/SEO-STRATEGY.md`, `content/BRIEF.md` (copy rules — **no unconfirmed claims**), and the Next.js 16 docs in `node_modules/next/dist/docs/` (this is Next 16 with Cache Components — APIs differ from older Next).

## 1. Where things stand

### Live (from `main`)
- Staging: https://brillianceservices.sahajilo.com on `root@46.250.244.227`, code `/var/projects/brilliance`, systemd `brilliance.service` (port 3011), nginx vhost `brillianceservices.sahajilo.com` (hand-written 443 block — suppora.conf is the 443 default_server). `.env` has `SITE_NOINDEX=1` (staging is never indexed).
- Update: push `main` → `ssh root@46.250.244.227 /var/projects/brilliance/deploy.sh`.
- Admin login = same as local (`../admin-credentials-local.txt`, outside repo).
- Public site, SEO pages (114), lead capture, call tracking, admin (leads, calls, traffic, content editors, SEO audit, keywords, redirects, settings, users) are done and verified.

### This branch adds (written, typechecks, mostly NOT browser-tested yet)
The old WordPress site had two custom plugins the client actively uses. They are being rebuilt here:

**A. Hospitality staffing** (old plugin "Hospitality Staffing Booking" — venues book chefs/cooks/kitchen hands/cleaners; staff apply via a signup form)
- Public **`/careers`** "Join our team" application form (all fields of the old `/signup` form incl. photo, CV, certificates, availability grid) → `app/api/applications/route.ts` → `StaffApplication` + private files (`lib/storage.ts`, `STORAGE_DIR`). Admin: `/admin/applications` (+ `[id]`, CSV export, private file viewer `/api/admin/files/[id]`). ✅ built; end-to-end browser test was interrupted (dev-server reload loop, see Gotchas) — re-test.
- Public **`/booking`** "Book hospitality staff" form: positions & base rates, live Award-based estimate (`lib/staffing-estimate.ts`), staff-preference picker (active staff + `/api/staff-photo/[id]`), policies accordion, acceptance → `app/api/staff-bookings/route.ts` → `StaffBooking` + emails (`lib/staffing-mail.ts`). ✅ built, untested.
- Settings model + defaults copied from the old plugin: `lib/staffing-settings.ts` (positions Cook $45, Chef $50, Kitchen Hand $40, Cleaner $45 ex GST; multipliers Sat 1.5 / Sun 1.75 / PH 2.5 / evening 1.10 / night 1.15; full policies text; confirmation + acknowledgement email templates with `{PLACEHOLDERS}`).
- Hospitality Staffing service copy now names chefs/cooks/kitchen hands/cleaners; 3 new service×area pages (`content/service-areas.json`); `/signup` → `/careers` redirect; nav/footer links.

**B. Roster** (old plugin "SJ Cleaning Staff Portal" a.k.a. **BR Roster** — cleaning staff at schools/TAFEs/hotel sign in/out with GPS + geofence)
- Prisma models: `CostCentre` (sites), `Employee` (own login), `Shift`, `Attendance` (+ enums) in `prisma/schema.prisma`.
- Admin `/admin/roster/*`: overview, weekly roster grid (`components/admin/RosterGrid.tsx` — add/edit/copy/paste shifts, copy last week), month calendar, attendance (`components/admin/AttendanceTable.tsx` — approve/decline/paid/edit/manual entry/map links), employees (+ edit with password), sites (geofence radius, auto-geocode via Nominatim `lib/geo.ts`). Actions: `app/admin/actions/roster.ts`. Excel export `app/api/admin/roster/export/route.ts` (uses `write-excel-file`; **verify runtime** — typings were cast, see TODO).
- Staff portal **`/brilliance-roster`** (same URL staff already use): login, forced password change, sign in/out with GPS, reverse-geocoded address, OSM mini-map, **server-side geofence** (old plugin only checked in the browser), shift notes, upcoming shifts, history. Files: `app/brilliance-roster/{page,actions}.ts(x)`, `components/portal/*`, session `lib/staff-session.ts` (cookie `bc_staff`, separate from admin). Timezone helpers `lib/sydney.ts` (shifts stored as Sydney-local `YYYY-MM-DD` + `HH:MM`; sign-in/out as real timestamps).

## 2. Remaining work (in order)

1. **Admin staffing pages (not written yet)**
   - `/admin/staffing/bookings` list (status filter NEW/CONFIRMED/FILLED/COMPLETED/CANCELLED) + `/admin/staffing/bookings/[id]`: details, status change, assign staff (`assignedStaffIds` from active `StaffApplication`), preferred staff shown, **Send confirmation** (`sendBookingMail(id, {kind:"confirmation"}, user.name)`), compose custom email (`{kind:"custom"}`), activity log (JSON array on the row; `logActivity` in `lib/staffing-mail.ts`), delete (admin).
   - `/admin/staffing/settings`: edit `StaffingSettings` (positions/rates table, multipliers, notify email, allow staff preference, policies markdown, confirmation/ack templates). Save to `Setting` key `"staffing"`; call `updateTag("settings")`.
   - Staff directory: on `/admin/applications` add **Active** toggle (controls the `/booking` picker; call `updateTag("staff")`), `source`, “Add staff manually” (`source: "admin"`, optional photo upload — server-action body limit already raised to 8 MB in `next.config.ts`), edit profile fields. `email`/`phone` are now nullable on `StaffApplication`.
2. **Sidebar** (`components/admin/Sidebar.tsx`): add groups *Roster* (Overview, Weekly roster, Calendar, Attendance, Employees, Sites → `/admin/roster…`) and *Staffing* (Bookings, Staff & applications, Settings). Dashboard: count new staff bookings.
3. **`/booking` redirect conflict**: seed + live DB still redirect `/booking` → `/quote`. Remove the row from `scripts/seed.ts` and run on each DB: `DELETE FROM "Redirect" WHERE "from" = '/booking';`. Add `/booking` to `app/sitemap.ts` and the SEO audit `FIXED` list. Add a “Book staff” CTA on the hospitality-staffing service page + header/footer.
4. **WordPress data import** — write `scripts/import-wp.ts` reading `../wp-export/part1.json` and `../wp-export/part2-attendance.json` (**outside the repo — contains staff PII; never commit**). Mapping:
   - `costCentres[]` → `CostCentre` (`legacyId`=ccId, radius=1000, geocode address with ≥1 s between Nominatim calls).
   - `employees[]` (`empId` = old `wp_sj_employees.id`) → `Employee` (split name, `legacyEmpId`, cost centre by name, random temp password + `mustSetPassword: true`; write the temp passwords to `../wp-export/temp-passwords.txt` chmod 600 for the office to SMS out). Old WP password hashes were **not** extractable.
   - `shifts[]` rows `[id, employee_id(=empId), site_name, site_address, date, start, end]` → `Shift` (`legacyId`; link cost centre by name when it matches; status `COMPLETED` if any attendance references it, else `SCHEDULED`).
   - attendance rows `[id, wpUserId, name, shiftId, signIn, signOut, notes, site, inAddr, inLat, inLng, outAddr, outLat, outLng, status, paid]` → `Attendance`. Times are **Sydney-local strings** → `fromSydneyString()`. Match employee **by name** (WP user ids differ; Shishir Bastola has two ids, 12 and 16). Names `''`, `'Mahesh Sapkota'`, `'sulove3939'` (8 admin/test rows) → one inactive employee "Legacy admin/test". Status `Pending/Approved` → enum.
   - `hosStaff[]` → `StaffApplication` (`source` form/admin, `active`, roles, expertise split on `,`, `locations`=areas, `legacyId`, signature = name, consent true). Download Mahesh's photo URL into storage as an `ApplicantFile` kind `photo`.
   - `hosBookings[]` (2 test bookings by the owner) → `StaffBooking` with `legacyId` + activity.
   - Make it idempotent (skip rows whose `legacyId` exists).
5. **Test in a browser** (desktop + 390 px): `/careers` submit with files, `/booking` estimate + submit, `/brilliance-roster` login → sign in/out (Chrome DevTools sensors can fake GPS), roster grid add/copy/paste, attendance approve + Excel export, sites geocode. Run `npx tsc --noEmit`, `npx eslint .`, `npx next build`.
6. **Deploy** (after merging to `main`):
   - Server `.env`: add `STORAGE_DIR="/var/projects/brilliance-storage"` (create dir, chmod 700).
   - nginx `client_max_body_size 32M;` in the 443 block (applications allow 30 MB total), `nginx -t && systemctl reload nginx`.
   - `deploy.sh` runs `prisma db push`; this branch adds unique columns → it will ask for `--accept-data-loss` (tables are empty on staging, safe) — run `npx prisma db push --accept-data-loss` once manually.
   - `npx tsx scripts/seed.ts --force-slugs=hospitality-staffing,hospitality-staffing-hunter-valley-peak-season` (updated copy + 3 new service×area pages are created automatically).
   - scp the two `wp-export` JSON files to the server, run the import, then **delete them from the server**.
7. **Cut-over notes for the client**: staff keep using `/brilliance-roster`; give each their temp password. SMTP still not configured (`SMTP_*` in server `.env`) — booking/application/lead emails are skipped until set (data is always saved).

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
