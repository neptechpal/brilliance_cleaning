import type { StaffingSettings } from "./staffing-settings";

// Live price estimate shown on the booking form — same rules as the WordPress plugin:
// weekend/public-holiday casual multipliers apply to the whole shift; on weekdays,
// hours 7pm–midnight get the evening loading and midnight–7am the night loading.
export function estimateBooking(opts: {
  rate: number;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string;
  quantity: number;
  publicHoliday?: boolean;
  m: StaffingSettings["multipliers"];
}) {
  const { rate, date, start, end, quantity, m } = opts;
  if (!rate || !date || !start || !end || quantity < 1) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60;
  const [y, mo, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  let total = 0;
  let hours = 0;
  for (let t = startMin; t < endMin; t += 15) {
    const dayOffset = Math.floor(t / 1440);
    const minuteOfDay = t % 1440;
    const day = (dow + dayOffset) % 7;
    let mult = 1;
    if (opts.publicHoliday && dayOffset === 0) mult = m.publicHoliday;
    else if (day === 6) mult = m.saturday;
    else if (day === 0) mult = m.sunday;
    else if (minuteOfDay >= 19 * 60) mult = m.evening;
    else if (minuteOfDay < 7 * 60) mult = m.night;
    total += (rate * mult) / 4;
    hours += 0.25;
  }
  return { hours, perPerson: Math.round(total * 100) / 100, total: Math.round(total * quantity * 100) / 100 };
}
