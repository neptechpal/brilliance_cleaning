import { requireAdmin } from "@/lib/auth";
import { readSettings } from "@/lib/settings";
import { saveSettings } from "@/app/admin/actions/seo";
import { Check, Field, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { mailer, readMailSettings } from "@/lib/mailer";
import { saveMailSettings, sendTestEmail } from "@/app/admin/actions/mail";

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  await requireAdmin();
  const sp = await searchParams;
  const [s, mail, t] = await Promise.all([readSettings(), readMailSettings(), mailer()]);
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
          <p className="mt-2 text-xs text-ink-soft">{t ? `✓ Emails are sent via ${t.via} from ${t.from.address}.` : "⚠ Email sending isn’t set up yet — add your SMTP2GO API key under Email sending below."}</p>
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

      <form action={saveMailSettings} id="email" className="mt-6 scroll-mt-4">
        <Panel title="Email sending (SMTP2GO)">
          {sp.mail === "saved" && <Notice>Email settings saved.</Notice>}
          {sp.mail === "sent" && <Notice>Test email sent to {s.notifyEmails}. Check the inbox (and spam folder).</Notice>}
          {typeof sp.mailerror === "string" && <Notice tone="bad">{sp.mailerror}</Notice>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="SMTP2GO API key"
              name="smtp2goApiKey"
              type="password"
              autoComplete="off"
              placeholder={mail.smtp2goApiKey ? `Saved (ends …${mail.smtp2goApiKey.slice(-4)}) — leave blank to keep` : "api-XXXXXXXXXXXXXXXX"}
              hint="SMTP2GO → Sending → API Keys. Needs permission to send email."
            />
            <Field label="Sender email (verified in SMTP2GO)" name="fromEmail" type="email" defaultValue={mail.fromEmail} placeholder={t?.from.address} hint="Must be a verified sender or domain in SMTP2GO" />
            <Field label="Sender name" name="fromName" defaultValue={mail.fromName} placeholder={t?.from.name || "Brilliance Cleaning"} />
          </div>
          {mail.smtp2goApiKey && (
            <div className="mt-3">
              <Check label="Remove the saved API key" name="clearApiKey" />
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <SubmitButton>Save email settings</SubmitButton>
            <SubmitButton variant="ghost" formAction={sendTestEmail}>Send test email</SubmitButton>
          </div>
          <p className="mt-2 text-xs text-ink-soft">The test goes to the &ldquo;Send new leads to&rdquo; addresses above. Save first if you changed anything.</p>
        </Panel>
      </form>
    </>
  );
}
