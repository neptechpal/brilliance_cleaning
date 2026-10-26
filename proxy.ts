import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";

// ─── Redirect table (Admin → SEO → Redirects), cached in memory for 60s ───
type Rule = { id: number; to: string | null; code: number };
let rules: Map<string, Rule> | null = null;
let loadedAt = 0;

async function getRules() {
  if (rules && Date.now() - loadedAt < 60_000) return rules;
  try {
    const rows = await db.redirect.findMany({ select: { id: true, from: true, to: true, code: true } });
    rules = new Map(rows.map((r) => [normalise(r.from), { id: r.id, to: r.to, code: r.code }]));
    loadedAt = Date.now();
  } catch {
    rules ??= new Map();
  }
  return rules;
}

const normalise = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p).toLowerCase();

// The old WordPress site was injected with casino / betting / adult spam posts. Return 410 Gone so
// Google drops them quickly instead of treating them as soft 404s.
const SPAM = /(casino|kasyno|kasyna|1xbet|x3bet|betting|bukmacher|sportsbook|sportwetten|onlyfans|jackpot|gamstop|wager|slot-sites|aviator|krash|spinboss|monsterwin|slimking|boomzino|baxterbet|lolajack|zombillion|sankra|spinlander|pinocasino|goldbet|horus-casino|test-post|test123|upx-strategija|paris-hippiques|online-course|digital-marketing-courses|python-programming|art-and-design-courses|language-learning|new-hobbies|productivity-while|founding-of-youtube)/i;
const WP_GONE = /^\/(wp-admin|wp-login\.php|xmlrpc\.php|wp-content\/plugins|wp-includes|feed|comments\/feed|author\/|category\/|tag\/|wp-sitemap|sitemap_index\.xml|cart-online-course|checkout-online-course|signup)/i;

function gone() {
  return new NextResponse("410 Gone", { status: 410, headers: { "Content-Type": "text/plain", "X-Robots-Tag": "noindex" } });
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Admin: optimistic auth check (pages/actions still verify the session themselves)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = pathname !== "/admin" ? `?next=${encodeURIComponent(pathname)}` : "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Legacy WordPress query URLs (?p=123, ?page_id=, ?s=)
  if (pathname === "/" && /[?&](p|page_id|cat|author|s|attachment_id)=/.test(search)) return gone();
  if (WP_GONE.test(pathname)) return gone();

  const key = normalise(pathname);
  const rule = (await getRules()).get(key);
  if (rule) {
    db.redirect.update({ where: { id: rule.id }, data: { hits: { increment: 1 }, lastHitAt: new Date() } }).catch(() => {});
    if (rule.code === 410 || !rule.to) return gone();
    const dest = rule.to.startsWith("http") ? new URL(rule.to) : new URL(rule.to + search, req.url);
    return NextResponse.redirect(dest, rule.code === 302 ? 302 : 301);
  }

  if (SPAM.test(pathname)) return gone();

  return NextResponse.next();
}

export const config = {
  // Skip Next internals, static files and APIs
  matcher: ["/((?!_next/|api/|brand/|favicon|icon|apple-icon|opengraph-image|robots.txt|sitemap.xml|llms.txt).*)"],
};
