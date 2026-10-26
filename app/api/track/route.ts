import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classifyChannel } from "@/lib/attribution";
import { clientIp, clip, deviceFromUa, hashIp, isBot, rateLimited } from "@/lib/request";
import { SESSION_COOKIE } from "@/lib/jwt";

const TYPES = new Set(["pageview", "call_click", "sms_click", "email_click", "whatsapp_click", "quote_cta", "form_start"]);

// Receives navigator.sendBeacon() payloads (text/plain JSON) from components/site/Tracker.tsx
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  if (isBot(ua)) return new NextResponse(null, { status: 204 });
  // don't count the team's own browsing while logged in to the admin
  if (req.headers.get("cookie")?.includes(`${SESSION_COOKIE}=`)) return new NextResponse(null, { status: 204 });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const type = String(body.type || "");
  if (!TYPES.has(type)) return new NextResponse(null, { status: 400 });

  const ipHash = hashIp(clientIp(req.headers));
  if (rateLimited(`track:${ipHash}`, 120, 60_000)) return new NextResponse(null, { status: 204 });

  const pagePath = clip(body.pagePath, 500) || "/";
  if (pagePath.startsWith("/admin")) return new NextResponse(null, { status: 204 });

  const referrer = clip(body.referrer, 500);
  const utmSource = clip(body.utmSource, 200);
  const utmMedium = clip(body.utmMedium, 200);
  const gclid = clip(body.gclid, 300);

  await db.trackEvent.create({
    data: {
      type,
      label: clip(body.label, 80),
      target: clip(body.target, 200),
      pagePath,
      landingPage: clip(body.landingPage, 500),
      referrer,
      channel: classifyChannel({ utmSource, utmMedium, gclid, fbclid: clip(body.fbclid), referrer, ownHost: new URL(req.url).hostname }),
      utmSource,
      utmMedium,
      utmCampaign: clip(body.utmCampaign, 200),
      gclid,
      visitorId: clip(body.visitorId, 64),
      device: deviceFromUa(ua),
      ipHash,
    },
  });
  return new NextResponse(null, { status: 204 });
}
