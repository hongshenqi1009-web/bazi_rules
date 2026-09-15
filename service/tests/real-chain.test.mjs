import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unavailableContent } from "../src/content-service.mjs";
import { interpretBazi } from "../src/interpretation-engine.mjs";
import { MatchingEngine } from "../src/matching-engine.mjs";
import { PersonalNeedEngine } from "../src/personal-need-engine.mjs";
import { ReadingStore } from "../src/reading-store.mjs";
import { CityProfileRepository } from "../src/repositories/city-profile-repository.mjs";
import { CityRepository } from "../src/repositories/city-repository.mjs";
import { LocationRepository } from "../src/repositories/location-repository.mjs";

const serviceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(serviceRoot, "..");

async function fixtures() {
  const [locations, cities, profiles] = await Promise.all([
    LocationRepository.fromFile(resolve(serviceRoot, "data", "locations.json")),
    CityRepository.fromCsv(resolve(repoRoot, "data", "cities.csv")),
    CityProfileRepository.fromFile(resolve(repoRoot, "data", "city_profiles_mvp.json"))
  ]);
  const personalNeedEngine = await PersonalNeedEngine.create(resolve(repoRoot, "data", "preferred_ranges_calibration_results.json"), cities);
  return { locations, cities, profiles, personalNeedEngine };
}

test("GeoNames search supports Chinese, English and disambiguation fields", async () => {
  const { locations } = await fixtures();
  const english = locations.search("London", 3);
  const chinese = locations.search("伦敦", 3);
  assert.equal(english[0].id, "2643743");
  assert.equal(chinese[0].id, "2643743");
  for (const field of ["standard_id", "country", "admin_area", "iana_timezone", "lat", "lon"]) assert.ok(field in english[0]);
});

test("eight reviewed City Profiles have sources and cannot change scores", async () => {
  const { cities, profiles } = await fixtures();
  assert.equal(profiles.profiles.size, 8);
  for (const profile of profiles.profiles.values()) {
    assert.equal(profile.review_status, "facts_reviewed_media_missing");
    assert.ok(profile.sources.length >= 2);
    assert.ok(cities.get(profile.city_id));
    assert.ok(profile.sources.every((source) => source.url && source.license && source.usage_boundary));
    assert.equal("score" in profile, false);
    assert.equal("vector" in profile, false);
  }
});

test("a real birth input completes BaZi, interpretation, R2 and 100-city matching without storing raw input", async () => {
  const { locations, cities, profiles, personalNeedEngine } = await fixtures();
  const store = new ReadingStore({
    locationRepository: locations,
    cityRepository: cities,
    cityProfileRepository: profiles,
    personalNeedEngine,
    matchingEngine: new MatchingEngine(cities, profiles),
    contentService: { generate: async () => unavailableContent("TEST_AI_OFFLINE") },
    interpretationEngine: interpretBazi,
    config: { readingTtlMs: 15 * 60_000, publicAppUrl: "https://example.com/" }
  });
  const created = store.create({
    birth_date_local: "2000-10-09",
    birth_time: { mode: "exact", exact_local_time: "14:20", precision: "minute" },
    birth_location_id: "geonames:1797929",
    sex_for_dayun: "female",
    true_solar_time_enabled: false,
    direction_adjustment_enabled: false,
    locale: "zh-CN"
  });
  let response;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    response = store.get(created.result_id);
    if (["complete", "failed"].includes(response.status)) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }
  assert.equal(response.status, "complete");
  assert.equal(response.ranked_cities.length, 3);
  assert.equal(response.versions.preferred_exposure, "preferred-exposure-r2-balanced-candidate");
  assert.equal(response.versions.city_engine, "city-elements-v0.2.1-scheme-c-candidate");
  assert.equal(response.privacy.birth_input_persisted, false);
  assert.equal(response.privacy.result_ttl_seconds, 900);
  assert.equal(response.disclaimer.privacy_url, "/privacy.html");
  assert.equal(store.records.get(created.result_id).request, undefined);
  assert.match(response.share.qr_data_url, /^data:image\/png;base64,/);
  assert.ok(response.ranked_cities.every((city) => city.content.status === "unavailable"));
  assert.equal("technical" in response, false);
  assert.doesNotMatch(JSON.stringify(response), /2000-10-09|14:20/);
});
