import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CityContentService } from "../src/content-service.mjs";
import { CityRepository } from "../src/repositories/city-repository.mjs";
import { CityProfileRepository } from "../src/repositories/city-profile-repository.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_CONTENT_MODEL;
if (!apiKey || !model) {
  console.error("OPENAI_API_KEY and OPENAI_CONTENT_MODEL must be configured on the server; no request was sent.");
  process.exit(2);
}

const cities = await CityRepository.fromCsv(resolve(repoRoot, "data/cities.csv"));
const profiles = await CityProfileRepository.fromFile(resolve(repoRoot, "data/city_profiles_mvp.json"));
const content = new CityContentService({
  apiKey,
  model,
  baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  timeoutMs: Number(process.env.CONTENT_TIMEOUT_MS) || 18_000
});
const personal = {
  type_name: "水木相生型（合成验收输入）",
  primary_element: "water",
  secondary_element: "wood",
  tier_by_element: { wood: "prefer", fire: "avoid", earth: "neutral", metal: "strong_avoid", water: "strong_prefer" },
  confidence: { level: "medium" }
};
const inputPrice = Number(process.env.OPENAI_INPUT_USD_PER_MTOK);
const outputPrice = Number(process.env.OPENAI_OUTPUT_USD_PER_MTOK);
const priceKnown = Number.isFinite(inputPrice) && inputPrice > 0 && Number.isFinite(outputPrice) && outputPrice > 0;
const results = [];

for (const profile of profiles.profiles.values()) {
  const city = cities.get(profile.city_id);
  const result = await content.generate(personal, {
    zh: city.zh,
    en: city.en,
    vector: city.vectorPoints,
    match_reasons: { short: "合成验收：检查城市事实与五行组合的表达；不代表真实用户推荐。" }
  }, profile);
  const usage = result.usage || null;
  const estimatedCostUsd = priceKnown && usage
    ? (usage.input_tokens * inputPrice + usage.output_tokens * outputPrice) / 1_000_000
    : null;
  results.push({
    city: city.en,
    status: result.status,
    error_code: result.error_code || null,
    model: result.model || model,
    usage,
    estimated_cost_usd: estimatedCostUsd,
    feature: result.feature || null,
    why: result.why || null,
    feeling: result.feeling || null
  });
}

console.log(JSON.stringify({
  checked_at: new Date().toISOString(),
  model,
  timeout_ms: content.timeoutMs,
  automatic_retries: 0,
  operator_retry: "one city at a time; re-run only after diagnosing failures",
  pricing_input_usd_per_mtok: priceKnown ? inputPrice : null,
  pricing_output_usd_per_mtok: priceKnown ? outputPrice : null,
  results
}, null, 2));
if (results.some((result) => result.status !== "ready")) process.exitCode = 1;
