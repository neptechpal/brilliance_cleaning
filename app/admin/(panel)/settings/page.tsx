import { requireAdmin } from "@/lib/auth";
import { readSettings } from "@/lib/settings";
import { saveSettings } from "@/app/admin/actions/seo";
import { Check, Field, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  await requireAdmin();
  const sp = await searchParams;
  const s = await readSettings();
  return (
    <>
      <PageHeader title="Settings & tracking" intro="Business details used across the site, schema markup and emails, plus analytics/ads IDs." />
      {sp.saved && <Notice>Saved — the website updates immediately.</Notice>}
      <form action={saveSettings} className="space-y-4">
        <Panel title="Business details (NAP — keep identical to Google Business Profile)">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Business name" name="businessName" defaultValue={s.businessName} />
            <Field label="Short name" name="shortName" defaultValue={s.shortName} />
            <Field label="ABN" name="abn" defaultValue={s.abn} hint="Shown in footer and schema once set" />
            <Field label="Phone (tel: format)" name="phone" defaultValue={s.phone} hint="+61411463552" />
            <Field label="Phone (display)" name="phoneDisplay" defaultValue={s.phoneDisplay} />
            <Field label="Email" name="email" type="email" defaultValue={s.email} />
            <Field label="Street address (optional)" name="address" defaultValue={s.address} hint="Leave blank for a service-area business" />
            <Field label="Suburb" name="locality" defaultValue={s.locality} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="State" name="region" defaultValue={s.region} />
              <Field label="Postcode" name="postcode" defaultValue={s.postcode} />
            </div>
            <Field label="Hours" name="hours" defaultValue={s.hours} />
            <Field label="Service area text" name="serviceAreaText" defaultValue={s.serviceAreaText} className="lg:col-span-2" />
            <Field label="Facebook URL" name="facebook" defaultValue={s.facebook} />
            <Field label="Instagram URL" name="instagram" defaultValue={s.instagram} />
            <Field label="Google Business Profile URL" name="googleBusinessUrl" defaultValue={s.googleBusinessUrl} />
            <Field label="Customers stat" name="statCustomers" defaultValue={s.statCustomers} />
            <Field label="Staff stat" name="statStaff" defaultValue={s.statStaff} />
          </div>
        </Panel>

        <Panel title="Trust claims — only tick what you can prove">
          <div className="grid gap-3 sm:grid-cols-3">
            <Check label="Fully insured" name="trustInsured" defaultChecked={s.trustInsured} hint="Shows 'Fully insured' badge (public liability)" />
            <Check label="Police-checked staff" name="trustPoliceChecked" defaultChecked={s.trustPoliceChecked} hint="Adds a 'Police checked' badge" />
            <Check label="Re-clean promise" name="trustReclean" defaultChecked={s.trustReclean} hint="'If we missed something on the checklist, we come back'" />
          </div>
        </Panel>

        <Panel title="Lead notifications">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Send new leads to (comma separated)" name="notifyEmails" defaultValue={s.notifyEmails} />
            <div className="flex items-end pb-1">
              <Check label="Send customer an automatic 'thanks, we got it' email" name="autoReply" defaultChecked={s.autoReply} />
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-soft">SMTP server details live in the server&apos;s .env file (SMTP_HOST, SMTP_USER, SMTP_PASS). {process.env.SMTP_HOST ? "✓ SMTP configured." : "⚠ SMTP not configured yet."}</p>
        </Panel>

        <Panel title="Analytics & ads">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="GA4 measurement ID" name="ga4Id" defaultValue={s.ga4Id} placeholder="G-XXXXXXXXXX" />
            <Field label="Google Tag Manager ID" name="gtmId" defaultValue={s.gtmId} placeholder="GTM-XXXXXXX" hint="Optional — use GTM or GA4, not both for the same tag" />
            <Field label="Meta Pixel ID" name="metaPixelId" defaultValue={s.metaPixelId} />
            <Field label="Google Ads ID" name="googleAdsId" defaultValue={s.googleAdsId} placeholder="AW-123456789" />
            <Field label="Ads conversion label — lead" name="googleAdsLeadLabel" defaultValue={s.googleAdsLeadLabel} />
            <Field label="Ads conversion label — call click" name="googleAdsCallLabel" defaultValue={s.googleAdsCallLabel} />
            <Field label="Google Search Console verification" name="gscVerification" defaultValue={s.gscVerification} hint="Content value of the google-site-verification meta tag" />
            <Field label="Bing verification" name="bingVerification" defaultValue={s.bingVerification} hint="msvalidate.01 value" />
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            Events sent automatically: <code>generate_lead</code> on every form submission and <code>call_click</code> on every phone tap (also pushed to the GTM dataLayer). Mark them as Key events in GA4.
          </p>
        </Panel>

        <div className="sticky bottom-4">
          <SubmitButton className="shadow-lg">Save settings</SubmitButton>
        </div>
      </form>
    </>
  );
}
