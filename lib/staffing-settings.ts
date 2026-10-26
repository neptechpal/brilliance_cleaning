import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";

// Settings for the hospitality staffing booking system (ported from the WordPress
// "Hospitality Staffing Booking" plugin). Stored as one JSON row in Setting.
export type Position = { name: string; rate: number };
export type StaffingSettings = {
  notifyEmail: string;
  allowStaffPreference: boolean;
  positions: Position[];
  multipliers: { saturday: number; sunday: number; publicHoliday: number; evening: number; night: number };
  policies: string; // markdown
  confirmFromName: string;
  confirmSubject: string;
  confirmBody: string;
  ackSubject: string;
  ackBody: string;
};

export const STAFFING_KEY = "staffing";

export const DEFAULT_STAFFING: StaffingSettings = {
  notifyEmail: "info@brilliancepropertycleaning.com.au",
  allowStaffPreference: true,
  positions: [
    { name: "Cook", rate: 45 },
    { name: "Chef", rate: 50 },
    { name: "Kitchen Hand", rate: 40 },
    { name: "Cleaner", rate: 45 },
  ],
  multipliers: { saturday: 1.5, sunday: 1.75, publicHoliday: 2.5, evening: 1.1, night: 1.15 },
  policies: `### Booking terms
- **Service scope:** Supply of hospitality staff (e.g. cooks, chefs, kitchen hands) as requested and confirmed in writing.
- **Engagement type:** All staff are engaged as casual. The base rate shown for each position already reflects casual engagement (incl. casual loading).
- **Lead time:** Please allow at least 4 hours for us to organise staff. Urgent staffing can often be arranged subject to availability.
- **Rates:** All prices exclude GST (10%). This is a base rate. Penalty rates may apply according to the Hospitality Award — see Fees & rates.
- **Minimum shift:** A minimum shift may apply (typically 3–4 hours) unless otherwise agreed.
- **Breaks & overtime:** Paid meal/rest breaks and any overtime, late-night or public holiday loadings are billed per the Award or as agreed in writing.
- **Travel & parking:** Where applicable, reasonable travel time, tolls and parking are chargeable at cost.
- **Uniform & PPE:** Please specify uniform, grooming and PPE requirements in advance. Where we provide PPE or special items, costs may be charged.

### Fees & rates (Award-based)
The base rate comes from the position you choose. We apply the current Hospitality Award rules wherever they apply.

| When | Multiplier |
|---|---|
| Mon–Fri (ordinary hours) | 1.00× |
| Saturday (casual) | 1.50× |
| Sunday (casual) | 1.75× |
| Public holiday (casual) | 2.50× |
| Evening 7pm–midnight (Mon–Fri) | ≈1.10× |
| Night midnight–7am (Mon–Fri) | ≈1.15× |

Evening and night loadings are per-hour dollar amounts under the Award; they are shown here as approximate multipliers so you can see a live estimate. Final invoices always apply the current Award rules and values.

### Allowances & other notes
Common Award allowances may apply (meal allowance for overtime, split/broken shift, first aid, uniform/laundry, tool/knife, travel where directed to use own vehicle, higher duties). Where multiple conditions coincide we apply the correct Award method — usually the highest applicable rate rather than stacking. Rates depend on classification, hours worked and site requirements, and Award values are updated periodically.

### Changes & cancellations
- **Flexible changes:** Let us know as soon as possible if your requirements change.
- **Within 2 hours:** Cancellations made within 2 hours of the start time may incur a cancellation fee.
- **Force majeure:** Neither party is liable for delays caused by events beyond reasonable control (e.g. extreme weather, power/network failure, emergencies).

### On-site responsibilities
- **Briefing & supervision:** Provide a site contact on arrival, venue induction and task briefing.
- **Safety:** You must provide a safe workplace compliant with WHS laws, including required inductions, PPE and access to first aid.
- **Sign-in/out:** Ensure staff can sign/verify shift times. Where times are not verified, our records may be relied upon.
- **Conduct:** Advise us immediately of any concerns so we can resolve or replace where practical.

### Payment & invoicing
- **Payment terms:** Invoices are due in 14 days unless otherwise agreed.
- **Late payment:** We may charge reasonable admin/collection costs and interest on overdue amounts as permitted by law.
- **Deposits/credit:** Deposits or credit terms may be requested for new or large bookings.

### Privacy
Brilliance Group Pty Ltd (ABN 46 681 596 823) handles personal information in line with the Privacy Act 1988 (Cth) and the Australian Privacy Principles. We collect booking and contact details to process bookings, allocate staff, send confirmations and invoices, and meet legal and insurance obligations. See our [privacy policy](/privacy).`,
  confirmFromName: "Brilliance Hospitality",
  confirmSubject: "Booking Confirmation — {POSITION} for {VENUE} on {DATE}",
  confirmBody: `Hi {CONTACT_NAME},

Great news — your hospitality staffing is confirmed.

BOOKING SUMMARY
• Venue: {VENUE}
• Address: {ADDRESS}
• Date: {DATE}
• Time: {START_TIME}–{END_TIME}
• Number of staff: {QUANTITY}
• Position: {POSITION}
• Contact on the day: {CONTACT_NAME} — {CONTACT_PHONE} / {CONTACT_EMAIL}
• Notes: {NOTES}

NEXT STEPS
• Our team will arrive a few minutes early for briefing and sign-in.
• Please provide any access/parking details and point of contact at the venue.
• Billing is as agreed (ex GST). Minimum shift and standard terms apply.

If anything changes, just reply to this email and we'll adjust promptly.

Warm regards,
Brilliance Hospitality`,
  ackSubject: "Thanks — we received your hospitality staffing request",
  ackBody: `Hi {CONTACT_NAME},

Thanks for your request for {QUANTITY} × {POSITION} at {VENUE} on {DATE} ({START_TIME}–{END_TIME}). We're organising staff now and will confirm as soon as possible.

If anything changes, just reply to this email or call us.

Brilliance Hospitality`,
};

function merge(v: unknown): StaffingSettings {
  const o = (v && typeof v === "object" ? v : {}) as Partial<StaffingSettings>;
  return { ...DEFAULT_STAFFING, ...o, multipliers: { ...DEFAULT_STAFFING.multipliers, ...(o.multipliers ?? {}) } };
}

export async function getStaffingSettings(): Promise<StaffingSettings> {
  "use cache";
  cacheTag("settings");
  cacheLife("days");
  const row = await db.setting.findUnique({ where: { key: STAFFING_KEY } });
  return merge(row?.value);
}

export async function readStaffingSettings(): Promise<StaffingSettings> {
  const row = await db.setting.findUnique({ where: { key: STAFFING_KEY } });
  return merge(row?.value);
}

/** Replaces {PLACEHOLDERS} in booking email templates. */
export function fillBookingTemplate(tpl: string, b: Record<string, string | number | null | undefined>) {
  return tpl.replace(/\{([A-Z_]+)\}/g, (m, k: string) => {
    const v = b[k];
    return v == null || v === "" ? (k === "NOTES" ? "—" : "") : String(v);
  });
}
