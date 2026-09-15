import test from "node:test";
import assert from "node:assert/strict";
import { calculateBazi } from "../src/bazi-engine.mjs";
import { resolveWallTime } from "../src/time.mjs";

test("resolves a non-hour IANA offset", () => {
  const resolved = resolveWallTime({ year: 2024, month: 1, day: 1, hour: 12, minute: 0 }, "Asia/Kolkata");
  assert.equal(resolved.utc, "2024-01-01T06:30:00.000Z");
  assert.equal(resolved.utcOffsetMinutes, 330);
});

test("rejects a DST gap and exposes both sides of a DST fold", () => {
  assert.throws(
    () => resolveWallTime({ year: 2024, month: 3, day: 31, hour: 1, minute: 30 }, "Europe/London"),
    (error) => error.code === "LOCAL_TIME_NONEXISTENT"
  );
  assert.throws(
    () => resolveWallTime({ year: 2024, month: 10, day: 27, hour: 1, minute: 30 }, "Europe/London"),
    (error) => error.code === "LOCAL_TIME_AMBIGUOUS" && error.details.candidates.length === 2
  );
  const later = resolveWallTime({ year: 2024, month: 10, day: 27, hour: 1, minute: 30 }, "Europe/London", { fold: 1 });
  assert.equal(later.utcOffsetMinutes, 0);
});

test("uses the audited lunar library wrapper and 23:00 day boundary", () => {
  const location = { timezone: "Asia/Shanghai", lat: 36.06488, lon: 120.38042 };
  const common = {
    birth_date_local: "2000-10-09",
    sex_for_dayun: "female",
    true_solar_time_enabled: false
  };
  const afternoon = calculateBazi({ ...common, birth_time: { mode: "exact", exact_local_time: "14:20" } }, location, { now: new Date("2026-09-15T00:00:00Z") });
  assert.deepEqual(afternoon.pillars, { year: "庚辰", month: "丙戌", day: "庚子", time: "癸未" });
  assert.equal(afternoon.versions.calendar_library, "lunar-javascript@1.7.7");
  const before = calculateBazi({ ...common, birth_time: { mode: "exact", exact_local_time: "22:59" } }, location);
  const after = calculateBazi({ ...common, birth_time: { mode: "exact", exact_local_time: "23:00" } }, location);
  assert.notEqual(before.pillars.day, after.pillars.day);
});

test("retains both candidate pillars when the zi segment is unknown", () => {
  const result = calculateBazi({
    birth_date_local: "2000-10-09",
    birth_time: { mode: "shichen", shichen_id: "zi", zi_segment: "unknown" },
    sex_for_dayun: "male",
    true_solar_time_enabled: false
  }, { timezone: "Asia/Shanghai", lat: 31.2, lon: 121.4 });
  assert.ok(result.alternate_pillars);
  assert.notEqual(result.pillars.day, result.alternate_pillars.day);
});
