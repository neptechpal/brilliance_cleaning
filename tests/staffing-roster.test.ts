import assert from "node:assert/strict";
import { test } from "node:test";
import { inflateRawSync } from "node:zlib";
import { addDays, fromSydney, sydneyDate, sydneyTime, validDate, weekStart } from "../lib/sydney";
import { estimateBooking } from "../lib/staffing-estimate";
import { checkGeofence } from "../lib/geo";
import { attendanceWorkbook } from "../lib/roster-export";
import type { toRow } from "../lib/roster-data";

const m = { saturday: 1.5, sunday: 1.75, publicHoliday: 2.5, evening: 1.1, night: 1.15 };

test("Sydney conversion handles seasons, leap days and both DST boundaries", () => {
  assert.equal(fromSydney("2026-01-15", "09:30").toISOString(), "2026-01-14T22:30:00.000Z");
  assert.equal(fromSydney("2026-07-15", "09:30").toISOString(), "2026-07-14T23:30:00.000Z");
  assert.equal(fromSydney("2026-04-05", "02:30").toISOString(), "2026-04-04T15:30:00.000Z");
  assert.throws(() => fromSydney("2026-10-04", "02:30"), /does not exist/);
  assert.equal(fromSydney("2026-10-04", "03:00").toISOString(), "2026-10-03T16:00:00.000Z");
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2025-02-29"), false);
  assert.throws(() => fromSydney("2026-01-01", "25:00"));
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(weekStart("2026-10-25"), "2026-10-19");
  for (const date of ["2026-04-04", "2026-04-05", "2026-10-03", "2026-10-04"]) {
    for (const time of ["00:00", "01:30", "03:30", "23:59"]) {
      const instant = fromSydney(date, time);
      assert.equal(sydneyDate(instant), date);
      assert.equal(sydneyTime(instant), time);
    }
  }
  assert.equal((fromSydney("2026-10-04", "04:00").getTime() - fromSydney("2026-10-03", "22:00").getTime()) / 3600000, 5);
});

test("estimates bill exact minutes across weekday, evening and weekend boundaries", () => {
  const estimate = (date: string, start: string, end: string) => estimateBooking({ rate: 60, date, start, end, quantity: 2, m });
  assert.deepEqual(estimate("2026-10-26", "10:01", "10:02"), { hours: 1 / 60, perPerson: 1, total: 2 });
  assert.deepEqual(estimate("2026-10-26", "18:59", "19:01"), { hours: 2 / 60, perPerson: 2.1, total: 4.2 });
  assert.deepEqual(estimate("2026-10-30", "23:59", "00:01"), { hours: 2 / 60, perPerson: 2.6, total: 5.2 });
  assert.equal(estimate("2026-10-03", "22:00", "04:00")?.hours, 5);
  assert.equal(estimate("2026-04-04", "22:00", "04:00")?.hours, 7);
  assert.equal(estimate("2026-02-30", "09:00", "10:00"), null);
});

test("geofences reject missing pins/fixes and cap GPS accuracy allowance", () => {
  const site = { lat: -32.9, lng: 151.7, radius: 200 };
  assert.equal(checkGeofence(site, { lat: -32.9, lng: 151.7, accuracy: 5 }).error, undefined);
  assert.match(checkGeofence(site, { lat: null, lng: null, accuracy: null }).error!, /Location is required/);
  assert.match(checkGeofence({ ...site, lng: null }, { lat: -32.9, lng: 151.7, accuracy: 5 }).error!, /pin is missing/);
  assert.ok(checkGeofence(site, { lat: -33, lng: 151.7, accuracy: 99999 }).error);
  assert.equal(checkGeofence({ lat: null, lng: null, radius: 0 }, { lat: null, lng: null, accuracy: null }).error, undefined);
});

function unzip(buffer: Buffer) {
  const files = new Map<string, string>();
  for (let i = 0; i < buffer.length - 46; i++) {
    if (buffer.readUInt32LE(i) !== 0x02014b50) continue;
    const method = buffer.readUInt16LE(i + 10);
    const size = buffer.readUInt32LE(i + 20);
    const nameLength = buffer.readUInt16LE(i + 28);
    const offset = buffer.readUInt32LE(i + 42);
    const name = buffer.subarray(i + 46, i + 46 + nameLength).toString();
    assert.equal(buffer.readUInt32LE(offset), 0x04034b50);
    const start = offset + 30 + buffer.readUInt16LE(offset + 26) + buffer.readUInt16LE(offset + 28);
    const compressed = buffer.subarray(start, start + size);
    files.set(name, (method === 8 ? inflateRawSync(compressed) : compressed).toString());
  }
  return files;
}

test("Excel v4 produces a real workbook and keeps same-name employees separate", async () => {
  const row: ReturnType<typeof toRow> = {
    id: 1, employeeId: 1, employee: "Example Staff", site: "Test site", shiftId: null,
    date: "2026-10-26", rostered: null, signIn: "09:00", signOutDate: "2026-10-26", signOut: "10:00",
    inAddress: null, inMap: null, inDistance: null, outAddress: null, outMap: null,
    duration: "1h 0m", minutes: 60, notes: "=1+1", status: "APPROVED", paid: false, manual: true,
  };
  const buffer = await attendanceWorkbook([row, { ...row, id: 2, employeeId: 2, minutes: 120 }]);
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
  const files = unzip(buffer);
  assert.match(files.get("xl/workbook.xml")!, /Timesheets/);
  assert.match(files.get("xl/workbook.xml")!, /Summary/);
  assert.equal((files.get("xl/worksheets/sheet2.xml")!.match(/<row\b/g) || []).length, 3);
  assert.doesNotMatch(files.get("xl/worksheets/sheet1.xml")!, /<f[ >]/);
  assert.ok(unzip(await attendanceWorkbook([])).has("xl/worksheets/sheet2.xml"));
});
