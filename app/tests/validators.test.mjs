import test from "node:test";
import assert from "node:assert/strict";
import { buildInputSummary, createReadingRequest, validateBirthStep, validatePlaceStep } from "../src/domain/validators.js";
import { LOCATIONS } from "../src/data/demo-fixture.js";

test("validates an ordinary shichen input", () => {
  const errors = validateBirthStep({ date: "2000-10-09", timeMode: "shichen", shichenId: "wei", ziSegment: null, exactTime: "" });
  assert.deepEqual(errors, {});
});

test("requires a subrange for zi hour", () => {
  const errors = validateBirthStep({ date: "2000-10-09", timeMode: "shichen", shichenId: "zi", ziSegment: null, exactTime: "" });
  assert.equal(errors.ziSegment, "请补充子时所在的时间段");
});

test("allows unknown time but not an omitted time choice", () => {
  assert.deepEqual(validateBirthStep({ date: "2000-10-09", timeMode: "unknown", shichenId: null, ziSegment: null, exactTime: "" }), {});
  assert.ok(validateBirthStep({ date: "2000-10-09", timeMode: null, shichenId: null, ziSegment: null, exactTime: "" }).time);
});

test("requires a standard location and sex parameter", () => {
  assert.deepEqual(validatePlaceStep({ location: null, sex: null }), {
    location: "请从搜索结果中选择出生城市",
    sex: "请选择用于传统排运规则的性别口径"
  });
});

test("builds the confirmed request contract without free-text location", () => {
  const location = LOCATIONS.find((item) => item.zh === "青岛");
  const state = {
    birth: { date: "2000-10-09", timeMode: "shichen", shichenId: "wei", ziSegment: null, exactTime: "" },
    location,
    sex: "female"
  };
  const request = createReadingRequest(state);
  assert.equal(request.birth_location_id, "geonames:1797929");
  assert.equal(request.birth_time.precision, "two_hour");
  assert.equal(request.true_solar_time_enabled, false);
  assert.equal(request.direction_adjustment_enabled, false);
  assert.equal(buildInputSummary(state.birth, location), "2000.10.09 · 未时 · 青岛");
});
