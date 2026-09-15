import { ELEMENTS } from "./repositories/city-repository.mjs";

const TIER_IMPORTANCE = Object.freeze({ strong_prefer: 1.30, prefer: 1, neutral: .55, avoid: 1.15, strong_avoid: 1.40 });
const INDEX_ANCHORS = Object.freeze({ q05: .660507724936153, q50: .7836200143429652, q95: .8942541484781287 });
const ELEMENT_ZH = Object.freeze({ wood: "木", fire: "火", earth: "土", metal: "金", water: "水" });
const PROFILE_FALLBACK_TAGS = Object.freeze({
  humid_tropical_marine: ["湿热丰沛", "海洋流动", "常绿生长"], hot_arid_desert: ["晴热开阔", "干燥明亮", "边界鲜明"],
  cold_continental: ["寒冷清冽", "四季分明", "大陆纵深"], sunlit_plateau: ["高原日照", "天地开阔", "山地承载"],
  temperate_oceanic: ["海洋温润", "云雨舒缓", "四季温和"], humid_mountain_coast: ["山海相接", "湿润丰沛", "层次舒展"],
  forest_cool_wet: ["林木丰茂", "清凉湿润", "生长绵延"], humid_inland_basin: ["盆地承载", "湿润内敛", "烟火绵密"],
  mediterranean_dry_warm_coast: ["干暖海岸", "日照明朗", "季节舒展"], high_latitude_coast: ["高纬滨海", "清冷辽阔", "风与水相应"],
  inland_water_rich: ["河湖丰沛", "水陆交织", "流动开阔"], dry_continental_steppe: ["干燥大陆", "风土清劲", "边界分明"]
});

function clamp(value, low = 0, high = 1) {
  return Math.max(low, Math.min(high, value));
}

export function modelInterval(need, cityVector) {
  let weightedFit = 0;
  let weightTotal = 0;
  const perElement = {};
  for (const element of ELEMENTS) {
    const cityValue = cityVector[element];
    const range = need.preferred_ranges[element];
    const tier = need.tier_by_element[element];
    let fit;
    if (cityValue < range.low) {
      fit = .88 - .88 * ((range.low - cityValue) / Math.max(range.low, .06)) ** 1.35;
    } else if (cityValue <= range.target) {
      fit = 1 - .12 * Math.min(1, Math.abs(cityValue - range.target) / Math.max(range.target - range.low, range.high - range.target, .03));
    } else if (cityValue <= range.high) {
      fit = 1 - .12 * Math.min(1, Math.abs(cityValue - range.target) / Math.max(range.target - range.low, range.high - range.target, .03));
    } else {
      const excessWeight = ["avoid", "strong_avoid"].includes(tier) ? 1.45 : 1;
      fit = .88 - excessWeight * ((cityValue - range.high) / Math.max(1 - range.high, .10)) ** 1.35;
    }
    fit = clamp(fit);
    const weight = TIER_IMPORTANCE[tier];
    weightedFit += fit * weight;
    weightTotal += weight;
    perElement[element] = { fit, city_value: cityValue, range, tier };
  }
  return { raw: weightedFit / weightTotal, perElement };
}

export function calibrateIndex(raw) {
  const { q05, q50, q95 } = INDEX_ANCHORS;
  let score;
  if (raw <= q05) score = 35 + 10 * raw / Math.max(q05, 1e-9);
  else if (raw <= q50) score = 45 + 25 * (raw - q05) / Math.max(q50 - q05, 1e-9);
  else if (raw <= q95) score = 70 + 22 * (raw - q50) / Math.max(q95 - q50, 1e-9);
  else score = 92 + 4 * (raw - q95) / Math.max(1 - q95, 1e-9);
  return clamp(score, 35, 96);
}

function greatCircle(origin, target) {
  const [lat1, lon1, lat2, lon2] = [origin.lat, origin.lon, target.lat, target.lon].map((value) => value * Math.PI / 180);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const distanceKm = 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  return { distanceKm, bearing };
}

function directionAdjustment(need, origin, target) {
  const { distanceKm, bearing } = greatCircle(origin, target);
  if (distanceKm < 1) return { points: 0, distance_km: distanceKm, bearing_deg: bearing };
  const elementAngles = { wood: 90, fire: 180, metal: 270, water: 0 };
  const tierSignal = { strong_prefer: 1, prefer: .55, neutral: 0, avoid: -.45, strong_avoid: -.9 };
  let numerator = 0;
  let denominator = 0;
  for (const [element, angle] of Object.entries(elementAngles)) {
    const signal = tierSignal[need.tier_by_element[element]];
    numerator += signal * Math.cos((bearing - angle) * Math.PI / 180);
    denominator += Math.abs(signal);
  }
  const gate = clamp((distanceKm - 100) / 400);
  return { points: clamp(numerator / Math.max(denominator, 1) * gate, -1, 1), distance_km: distanceKm, bearing_deg: bearing };
}

function reasons(scored) {
  const best = Object.entries(scored.perElement).sort((left, right) => right[1].fit - left[1].fit);
  const conflict = Object.entries(scored.perElement).sort((left, right) => left[1].fit - right[1].fit)[0];
  return {
    primary: best.slice(0, 2).map(([element]) => element),
    conflict: conflict[1].fit < .82 ? conflict[0] : null,
    short: `${best.slice(0, 2).map(([element]) => ELEMENT_ZH[element]).join("与")}的城市组合更接近你的适宜区间。`
  };
}

export class MatchingEngine {
  constructor(cityRepository, cityProfiles) {
    this.cityRepository = cityRepository;
    this.cityProfiles = cityProfiles;
  }

  rank(need, origin, { directionEnabled = false } = {}) {
    const ranked = this.cityRepository.cities.map((city) => {
      const scored = modelInterval(need, city.vector);
      const baseIndex = calibrateIndex(scored.raw);
      const direction = directionEnabled ? directionAdjustment(need, origin, city) : { points: 0, distance_km: null, bearing_deg: null };
      const profile = this.cityProfiles.get(city.id);
      return {
        city,
        rawScore: scored.raw,
        baseIndex,
        effectiveIndex: baseIndex + direction.points,
        direction,
        reasons: reasons(scored),
        profile
      };
    }).sort((left, right) => right.effectiveIndex - left.effectiveIndex || right.baseIndex - left.baseIndex || left.city.en.localeCompare(right.city.en));

    return ranked.map((item, index) => {
      const previous = ranked[index - 1];
      const next = ranked[index + 1];
      const close = (previous && Math.abs(previous.baseIndex - item.baseIndex) <= 1) || (next && Math.abs(next.baseIndex - item.baseIndex) <= 1);
      return {
        rank: index + 1,
        id: item.city.id,
        zh: item.city.zh,
        en: item.city.en,
        index: Math.round(item.effectiveIndex),
        index_raw: item.effectiveIndex,
        base_index: item.baseIndex,
        tier: item.baseIndex >= 88 ? "top" : item.baseIndex >= 80 ? "strong" : "match",
        very_close: Boolean(close),
        tags: item.profile?.core_tags || PROFILE_FALLBACK_TAGS[item.city.dominantPrototype] || ["自然复合", "五行相映"],
        vector: item.city.vectorPoints,
        dominant_element: item.city.dominantElement,
        dominant_prototype: item.city.dominantPrototype,
        data_confidence: item.city.dataConfidence,
        match_reasons: item.reasons,
        direction_adjustment: item.direction,
        city_profile_status: item.profile ? "reviewed" : "not_yet_published"
      };
    });
  }
}

export { ELEMENT_ZH };
