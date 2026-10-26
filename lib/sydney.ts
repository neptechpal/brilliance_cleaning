// Australia/Sydney date & time helpers. Shifts are stored as Sydney-local "YYYY-MM-DD" + "HH:MM";
// sign-in/out instants are stored as real timestamps.

export const TZ = "Australia/Sydney";

const formatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function parts(d: Date) {
  const p = formatter.formatToParts(d);
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

export function validDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < "1900-01-01") return false;
  const d = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export function validTime(time: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

/** Converts Sydney wall time. Rejects DST gaps; repeated times use the earlier instant. */
export function fromSydney(date: string, time = "00:00", seconds = 0): Date {
  if (!validDate(date) || !validTime(time) || !Number.isInteger(seconds) || seconds < 0 || seconds > 59) throw new RangeError("Invalid Sydney date or time");
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, h, mi, seconds);
  const offsets = new Set<number>();
  for (const delta of [-36, 0, 36]) {
    const instant = wall + delta * 3600000;
    const p = parts(new Date(instant));
    offsets.add(Date.UTC(+p.y, +p.m - 1, +p.d, +p.h, +p.mi, +p.s) - instant);
  }
  const candidates = [...offsets].map((offset) => new Date(wall - offset)).filter((instant) => {
    const p = parts(instant);
    return `${p.y}-${p.m}-${p.d}` === date && `${p.h}:${p.mi}` === time && +p.s === seconds;
  }).sort((a, b) => a.getTime() - b.getTime());
  if (!candidates.length) throw new RangeError("This Sydney time does not exist because the clocks move forward");
  return candidates[0];
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
