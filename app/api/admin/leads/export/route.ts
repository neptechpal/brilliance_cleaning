import type { LeadStatus, Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";
import { channelLabel } from "@/lib/attribution";

const csv = (v: unknown) => {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") as LeadStatus | null;
  const where: Prisma.LeadWhereInput = {
    ...(status ? { status } : { status: { not: "SPAM" } }),
    ...(sp.get("service") ? { serviceSlug: sp.get("service")! } : {}),
    ...(sp.get("channel") ? { channel: sp.get("channel")! } : {}),
  };
  const leads = await db.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 10000 });
  const cols = [
    "id", "createdAt", "status", "formType", "name", "phone", "email", "suburb", "postcode", "serviceName", "propertyType", "bedrooms", "bathrooms",
    "preferredDate", "frequency", "message", "valueAud", "channel", "utmSource", "utmMedium", "utmCampaign", "utmTerm", "gclid", "pagePath", "landingPage", "referrer", "device",
  ] as const;
  const body = [
    cols.join(","),
    ...leads.map((l) => cols.map((c) => csv(c === "channel" ? channelLabel(l.channel) : l[c])).join(",")),
  ].join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="brilliance-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
