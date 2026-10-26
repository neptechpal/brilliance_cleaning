import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";

export type SiteSettings = {
  businessName: string;
  shortName: string;
  phone: string; // E.164-ish for tel: links, e.g. +61411463552
  phoneDisplay: string;
  email: string;
  abn: string;
  address: string; // optional street address (service-area business can leave blank)
  locality: string;
  region: string;
  postcode: string;
  hours: string;
  serviceAreaText: string;
  facebook: string;
  instagram: string;
  googleBusinessUrl: string;
  // stats shown on the site
  statCustomers: string;
  statStaff: string;
  // trust claims: only switch on once confirmed by the business
  trustInsured: boolean;
  trustPoliceChecked: boolean;
  trustReclean: boolean;
  // tracking
  ga4Id: string;
  gtmId: string;
  googleAdsId: string; // AW-XXXXXXXXX
  googleAdsLeadLabel: string;
  googleAdsCallLabel: string;
  metaPixelId: string;
  gscVerification: string;
  bingVerification: string;
  // notifications
  notifyEmails: string; // comma separated
  autoReply: boolean;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  businessName: "Brilliance Cleaning & Property Staging",
  shortName: "Brilliance Cleaning",
  phone: "+61411463552",
  phoneDisplay: "0411 463 552",
  email: "admin@brillianceservices.com.au",
  abn: "",
  address: "",
  locality: "Newcastle",
  region: "NSW",
  postcode: "2300",
  hours: "Mon–Sat 7am–6pm",
  serviceAreaText: "Newcastle, Lake Macquarie, Maitland, Cessnock & the Hunter Valley, Port Stephens and Singleton",
  facebook: "",
  instagram: "",
  googleBusinessUrl: "",
  statCustomers: "50+",
  statStaff: "30+",
  trustInsured: false,
  trustPoliceChecked: false,
  trustReclean: false,
  ga4Id: "",
  gtmId: "",
  googleAdsId: "",
  googleAdsLeadLabel: "",
  googleAdsCallLabel: "",
  metaPixelId: "",
  gscVerification: "",
  bingVerification: "",
  notifyEmails: "admin@brillianceservices.com.au",
  autoReply: true,
};

export async function getSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag("settings");
  cacheLife("days");
  const rows = await db.setting.findMany();
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) merged[r.key] = r.value;
  return merged as SiteSettings;
}

/** Uncached read, for server code that runs outside the cache (route handlers, actions). */
export async function readSettings(): Promise<SiteSettings> {
  const rows = await db.setting.findMany();
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) merged[r.key] = r.value;
  return merged as SiteSettings;
}
