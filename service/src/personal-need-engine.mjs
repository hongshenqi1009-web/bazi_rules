import { readFile } from "node:fs/promises";
import { ELEMENTS } from "./repositories/city-repository.mjs";

const R2_KEY = "r2_balanced";

function clamp(value, low = 0, high = 1) {
  return Math.max(low, Math.min(high, value));
}

function normalize(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  return values.map((value) => value / total);
}

function percentile(sortedValues, quantile) {
  const position = (sortedValues.length - 1) * clamp(quantile);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] * (upper - position) + sortedValues[upper] * (position - lower);
}

function needPosition(value, tier, reference) {
  const band = reference[tier];
  if (value >= band.median) return clamp((value - band.median) / Math.max(band.q90 - band.median, 1e-9), -1, 1);
  return clamp((value - band.median) / Math.max(band.median - band.q10, 1e-9), -1, 1);
}

function applyDayun(baseMap, signalMap, tierByElement) {
  const base = ELEMENTS.map((element) => baseMap[element]);
  const adjustment = ELEMENTS.map((element) => signalMap[element] || 0);
  const first = normalize(base.map((value, index) => value * Math.exp(.10 * adjustment[index])));
  const delta = first.map((value, index) => value - base[index]);
  const l1 = delta.reduce((sum, value) => sum + Math.abs(value), 0);
  const maxComponent = Math.max(...delta.map(Math.abs));
  let scale = Math.min(1, l1 ? .08 / l1 : 1, maxComponent ? .03 / maxComponent : 1);
  const protectedTop = ELEMENTS.indexOf(Object.keys(tierByElement).find((element) => tierByElement[element] === "strong_prefer"));
  const protectedBottom = ELEMENTS.indexOf(Object.keys(tierByElement).find((element) => tierByElement[element] === "strong_avoid"));
  let adjusted = [...base];
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const candidate = normalize(base.map((value, index) => value + delta[index] * scale));
    const top = candidate.indexOf(Math.max(...candidate));
    const bottom = candidate.indexOf(Math.min(...candidate));
    if (top === protectedTop && bottom === protectedBottom) {
      adjusted = candidate;
      break;
    }
    scale *= .5;
  }
  return {
    current: Object.fromEntries(ELEMENTS.map((element, index) => [element, adjusted[index]])),
    delta: Object.fromEntries(ELEMENTS.map((element, index) => [element, adjusted[index] - base[index]]))
  };
}

export class PersonalNeedEngine {
  constructor(calibration, cityRepository) {
    this.definition = calibration.candidate_schemes[R2_KEY].definition;
    this.reference = calibration.need_strength_within_tier_reference;
    this.distributions = cityRepository.distributions();
  }

  static async create(calibrationPath, cityRepository) {
    return new PersonalNeedEngine(JSON.parse(await readFile(calibrationPath, "utf8")), cityRepository);
  }

  calculate(interpretation, bazi) {
    const applied = applyDayun(interpretation.base_need_vector, bazi.dayun.adjustment_signal, interpretation.tier_by_element);
    const preferredRanges = {};
    for (const element of ELEMENTS) {
      const tier = interpretation.tier_by_element[element];
      const band = this.definition.bands[tier];
      const position = needPosition(applied.current[element], tier, this.reference);
      const shift = this.definition.max_need_quantile_shift * position;
      const lowQ = clamp(band.low_q + shift);
      const highQ = clamp(band.high_q + shift);
      const targetQ = clamp(band.target_q + shift, lowQ, highQ);
      preferredRanges[element] = {
        low: percentile(this.distributions[element], lowQ),
        target: percentile(this.distributions[element], targetQ),
        high: percentile(this.distributions[element], highQ),
        quantiles: { low: lowQ, target: targetQ, high: highQ }
      };
    }
    return {
      type_name: interpretation.type_name,
      base_need_vector: interpretation.base_need_vector,
      current_need_vector: applied.current,
      preferred_ranges: preferredRanges,
      primary_element: interpretation.primary_element,
      secondary_element: interpretation.secondary_element,
      avoid_elements: interpretation.avoid_elements,
      tier_by_element: interpretation.tier_by_element,
      dayun_adjustment_vector: applied.delta,
      confidence: interpretation.confidence,
      rule_version: "personal-need-v0.1-candidate",
      preferred_exposure_version: this.definition.version,
      dayun_adjustment_version: "dayun-adjustment-v0.1-candidate"
    };
  }
}
