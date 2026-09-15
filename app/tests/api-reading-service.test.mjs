import test from "node:test";
import assert from "node:assert/strict";
import { ApiReadingService, ReadingServiceError } from "../src/services/reading-service.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

test("real location adapter uses the standard ID and IANA timezone contract", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({
    items: [{
      id: "2643743",
      standard_id: "geonames:2643743",
      city_name_zh: "伦敦",
      city_name: "London",
      admin_area: "England",
      country_zh: "英国",
      country_code: "GB",
      iana_timezone: "Europe/London",
      lat: 51.50853,
      lon: -0.12574,
      source: "GeoNames"
    }]
  });
  try {
    const [place] = await new ApiReadingService().searchLocations("伦敦");
    assert.equal(place.standardId, "geonames:2643743");
    assert.equal(place.timezone, "Europe/London");
    assert.equal(place.zh, "伦敦");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("real reading adapter renders server ranking unchanged", async () => {
  const originalFetch = globalThis.fetch;
  const responses = [
    jsonResponse({ result_id: "fixture-id", status: "queued", stage: "bazi" }, 202),
    jsonResponse({
      result_id: "fixture-id",
      status: "complete",
      stage: "complete",
      source: "t009-real-chain-v0.1",
      input_location: { id: "geonames:2643743", zh: "伦敦", en: "London" },
      personal_profile: {
        type_name: "水木相生型",
        strength_summary: "水偏强 · 木次显",
        one_line_reading: "水木相承。",
        visual_levels: { wood: 4, fire: 1, earth: 2, metal: 3, water: 5 },
        confidence: { level: "medium", score: 0.6, display_hint: "娱乐参考。" }
      },
      desired_city_energy: { paragraphs: ["一", "二", "三"], visual_levels: { wood: 4, fire: 1, earth: 2, metal: 3, water: 5 } },
      ranked_cities: [
        { rank: 1, city_id: "1", city_name_zh: "甲", city_name_en: "A", compatibility_index: 91, compatibility_tier: "top", very_close_match: true, core_mood_tags: [], content: { status: "unavailable" }, share_line: "甲回应你。" },
        { rank: 2, city_id: "2", city_name_zh: "乙", city_name_en: "B", compatibility_index: 91, compatibility_tier: "top", very_close_match: true, core_mood_tags: [], content: { status: "unavailable" }, share_line: "乙回应你。" },
        { rank: 3, city_id: "3", city_name_zh: "丙", city_name_en: "C", compatibility_index: 89, compatibility_tier: "top", very_close_match: false, core_mood_tags: [], content: { status: "unavailable" }, share_line: "丙回应你。" }
      ],
      share: { landing_url: "https://example.com/", qr_data_url: "data:image/png;base64,AA==" },
      privacy: { birth_input_persisted: false },
      disclaimer: { short: "娱乐参考。" },
      versions: { preferred_exposure: "preferred-exposure-r2-balanced-candidate" }
    })
  ];
  globalThis.fetch = async () => responses.shift();
  try {
    const result = await new ApiReadingService({ pollInterval: 1 }).createReading({}, {});
    assert.deepEqual(result.rankedCities.map((city) => city.id), ["1", "2", "3"]);
    assert.equal(result.rankedCities[0].index, 91);
    assert.equal(result.privacy.birth_input_persisted, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("real adapter reports a service failure instead of returning demo data", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    await assert.rejects(
      () => new ApiReadingService().searchLocations("London"),
      (error) => error instanceof ReadingServiceError && error.code === "NETWORK_ERROR"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
