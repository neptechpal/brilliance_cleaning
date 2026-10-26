import { addDays, fromSydney, sydneyDate, sydneyTime, validDate, validTime } from "./sydney";
import type { StaffingSettings } from "./staffing-settings";

// Live price estimate shown on the booking form — same rules as the WordPress plugin:
// weekend/public-holiday multipliers follow each Sydney calendar day; on weekdays,
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
  if (!Number.isFinite(rate) || rate <= 0 || !validDate(date) || !validTime(start) || !validTime(end) || !Number.isInteger(quantity) || quantity < 1) return null;
  let startAt: number;
  let endAt: number;
  try {
    startAt = fromSydney(date, start).getTime();
    endAt = fromSydney(end <= start ? addDays(date, 1) : date, end).getTime();
  } catch { return null; }
  let total = 0;
  const hours = (endAt - startAt) / 3600000;
  for (let t = startAt; t < endAt; t += 60000) {
    const instant = new Date(t);
    const localDate = sydneyDate(instant);
    const [h, minute] = sydneyTime(instant).split(":").map(Number);
    const minuteOfDay = h * 60 + minute;
    const day = new Date(`${localDate}T12:00:00Z`).getUTCDay();
    let mult = 1;
    if (opts.publicHoliday && localDate === date) mult = m.publicHoliday;
    else if (day === 6) mult = m.saturday;
    else if (day === 0) mult = m.sunday;
    else if (minuteOfDay >= 19 * 60) mult = m.evening;
    else if (minuteOfDay < 7 * 60) mult = m.night;
    total += (rate * mult) / 60;
  }
  return { hours, perPerson: Math.round(total * 100) / 100, total: Math.round(total * quantity * 100) / 100 };
}
