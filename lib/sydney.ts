// Australia/Sydney date & time helpers. Shifts are stored as Sydney-local "YYYY-MM-DD" + "HH:MM";
// sign-in/out instants are stored as real timestamps.

export const TZ = "Australia/Sydney";

function parts(d: Date) {
  const p = new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), mi: get("minute"), s: get("second") };
}

/** "YYYY-MM-DD" for the given instant in Sydney. */
export function sydneyDate(d: Date = new Date()) {
  const x = parts(d);
  return `${x.y}-${x.m}-${x.d}`;
}

/** "HH:MM" for the given instant in Sydney. */
export function sydneyTime(d: Date = new Date()) {
  const x = parts(d);
  return `${x.h}:${x.mi}`;
}

/** Converts a Sydney wall-clock date + time to the real instant (handles AEST/AEDT). */
export function fromSydney(date: string, time = "00:00", seconds = 0): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi, seconds);
  // offset = wall-clock(guess in Sydney) - guess
  const w = parts(new Date(guess));
  const wall = Date.UTC(+w.y, +w.m - 1, +w.d, +w.h, +w.mi, +w.s);
  const offset = wall - guess;
  const t = guess - offset;
  // second pass fixes the hour around DST changes
  const w2 = parts(new Date(t));
  const wall2 = Date.UTC(+w2.y, +w2.m - 1, +w2.d, +w2.h, +w2.mi, +w2.s);
  return new Date(t - (wall2 - guess));
}

/** Parses a WordPress "YYYY-MM-DD HH:MM:SS" Sydney-local string. */
export function fromSydneyString(s?: string | null): Date | null {
  if (!s) return null;
  const [date, time = "00:00:00"] = s.trim().split(" ");
  const [h, mi, sec] = time.split(":").map(Number);
  return fromSydney(date, `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`, sec || 0);
}

export function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** Monday of the week containing `date`. */
export function weekStart(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sun
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

export function fmt12(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, "0")}${ap}` : `${hh}${ap}`;
}

export function fmtDay(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-AU", { ...opts, timeZone: "UTC" });
}

export function fmtInstant(d: Date | null | undefined, withDate = true) {
  if (!d) return "—";
  return d.toLocaleString("en-AU", {
    timeZone: TZ,
    ...(withDate ? { day: "numeric", month: "short" } : {}),
    hour: "numeric",
    minute: "2-digit",
  });
}

export function minutesBetween(a?: Date | null, b?: Date | null) {
  if (!a || !b) return null;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

export function fmtDuration(mins: number | null) {
  if (mins == null) return "—";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** Shift length in minutes (supports shifts that end after midnight). */
export function shiftMinutes(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let m = eh * 60 + em - (sh * 60 + sm);
  if (m <= 0) m += 24 * 60;
  return m;
}
