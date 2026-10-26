import { SignJWT, jwtVerify } from "jose";

// Token helpers with no Next.js request APIs, so proxy.ts can import them.
export const SESSION_COOKIE = "bc_session";
export const MAX_AGE = 60 * 60 * 24 * 7;

export type Session = { uid: number; name: string; email: string; role: "ADMIN" | "STAFF" };

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET missing or too short");
  return new TextEncoder().encode(s);
}

export async function signSession(s: Session) {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { uid: Number(payload.uid), name: String(payload.name), email: String(payload.email), role: payload.role as Session["role"] };
  } catch {
    return null;
  }
}
