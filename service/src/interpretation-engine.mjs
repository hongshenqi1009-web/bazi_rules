import { ELEMENTS } from "./repositories/city-repository.mjs";

const ELEMENT_ZH = Object.freeze({ wood: "木", fire: "火", earth: "土", metal: "金", water: "水" });
const STEM_ELEMENT = Object.freeze({ 甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water" });
const BRANCH_HIDDEN = Object.freeze({
  子: [["water", 1]], 丑: [["earth", .6], ["water", .3], ["metal", .1]],
  寅: [["wood", .6], ["fire", .3], ["earth", .1]], 卯: [["wood", 1]],
  辰: [["earth", .6], ["wood", .3], ["water", .1]], 巳: [["fire", .6], ["earth", .3], ["metal", .1]],
  午: [["fire", .7], ["earth", .3]], 未: [["earth", .6], ["fire", .3], ["wood", .1]],
  申: [["metal", .6], ["water", .3], ["earth", .1]], 酉: [["metal", 1]],
  戌: [["earth", .6], ["metal", .3], ["fire", .1]], 亥: [["water", .7], ["wood", .3]]
});
const GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
const CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });
const ANCHORS = Object.freeze({ strong_prefer: 1.05, prefer: .72, neutral: .45, avoid: .18, strong_avoid: .07 });
const TIERS = Object.freeze(["strong_prefer", "prefer", "neutral", "avoid", "strong_avoid"]);

function normalizeMap(values) {
  const sum = Object.values(values).reduce((total, value) => total + value, 0);
  return Object.fromEntries(ELEMENTS.map((element) => [element, values[element] / sum]));
}

function inverseLookup(mapping, target) {
  return Object.keys(mapping).find((key) => mapping[key] === target);
}

function chartElementVector(pillars) {
  const totals = Object.fromEntries(ELEMENTS.map((element) => [element, 0]));
  const entries = [pillars.year, pillars.month, pillars.day, pillars.time].filter(Boolean);
  entries.forEach((pillar, index) => {
    totals[STEM_ELEMENT[pillar[0]]] += index === 1 ? 1.25 : 1;
    const branchWeight = index === 1 ? 1.8 : 1;
    for (const [element, share] of BRANCH_HIDDEN[pillar[1]]) totals[element] += branchWeight * share;
  });
  return normalizeMap(totals);
}

function climateMode(monthBranch) {
  if (["亥", "子", "丑"].includes(monthBranch)) return "cold_need_warmth";
  if (["巳", "午", "未"].includes(monthBranch)) return "hot_need_cooling";
  if (["申", "酉", "戌"].includes(monthBranch)) return "dry_need_moisture";
  if (["寅", "卯", "辰"].includes(monthBranch)) return "wet_need_drying";
  return "balanced";
}

const CLIMATE_BOOST = Object.freeze({
  balanced: {}, cold_need_warmth: { fire: .20, wood: .05 }, hot_need_cooling: { water: .20, metal: .05 },
  dry_need_moisture: { water: .15, wood: .10 }, wet_need_drying: { fire: .12, earth: .08 }
});

function roleElements(dayMaster) {
  return {
    self: dayMaster,
    resource: inverseLookup(GENERATES, dayMaster),
    output: GENERATES[dayMaster],
    wealth: CONTROLS[dayMaster],
    control: inverseLookup(CONTROLS, dayMaster)
  };
}

function needOrder(strength, roles) {
  const roleOrder = strength === "strong"
    ? ["output", "wealth", "control", "self", "resource"]
    : strength === "weak"
      ? ["resource", "self", "output", "wealth", "control"]
      : ["output", "resource", "wealth", "self", "control"];
  return roleOrder.map((role) => roles[role]);
}

function visualLevels(vector) {
  const ordered = [...ELEMENTS].sort((left, right) => vector[left] - vector[right]);
  return Object.fromEntries(ELEMENTS.map((element) => [element, ordered.indexOf(element) + 1]));
}

function buildNames(primary, secondary) {
  const linked = GENERATES[primary] === secondary || GENERATES[secondary] === primary;
  return `${ELEMENT_ZH[primary]}${ELEMENT_ZH[secondary]}${linked ? "相生" : "调和"}型`;
}

export function interpretBazi(bazi) {
  const chartVector = chartElementVector(bazi.pillars);
  const dayMaster = STEM_ELEMENT[bazi.pillars.day[0]];
  const roles = roleElements(dayMaster);
  const support = chartVector[roles.self] + chartVector[roles.resource];
  const strength = support >= .52 ? "strong" : support <= .40 ? "weak" : "balanced";
  const climate = climateMode(bazi.pillars.month[1]);
  const initialOrder = needOrder(strength, roles);
  const needRaw = Object.fromEntries(initialOrder.map((element, index) => [element, ANCHORS[TIERS[index]]]));
  for (const [element, boost] of Object.entries(CLIMATE_BOOST[climate])) needRaw[element] += boost;
  for (const element of ELEMENTS) needRaw[element] *= 1 + .22 * (.20 - chartVector[element]);
  const rankedNeed = [...ELEMENTS].sort((left, right) => needRaw[right] - needRaw[left] || ELEMENTS.indexOf(left) - ELEMENTS.indexOf(right));
  const tierByElement = Object.fromEntries(rankedNeed.map((element, index) => [element, TIERS[index]]));
  const anchored = Object.fromEntries(ELEMENTS.map((element) => [element, ANCHORS[tierByElement[element]] + (CLIMATE_BOOST[climate][element] || 0)]));
  const baseNeedVector = normalizeMap(anchored);
  const primary = rankedNeed[0];
  const secondary = rankedNeed[1];
  const chartOrder = [...ELEMENTS].sort((left, right) => chartVector[right] - chartVector[left]);
  const displayParts = [
    `${ELEMENT_ZH[chartOrder[0]]}偏强`, `${ELEMENT_ZH[chartOrder[1]]}次显`,
    `${ELEMENT_ZH[chartOrder[2]]}平衡`, `${ELEMENT_ZH[chartOrder.at(-1)]}较弱`
  ];
  const precisionConfidence = bazi.local_civil_time.precision === "minute" ? .68 : bazi.local_civil_time.precision === "two_hour" ? .60 : .40;
  const borderline = support > .38 && support < .54;
  const confidenceScore = Math.max(.30, precisionConfidence - (borderline ? .08 : 0) - (bazi.alternate_pillars ? .12 : 0));
  const confidenceLevel = confidenceScore >= .64 ? "medium" : confidenceScore >= .5 ? "medium_low" : "low";
  const supportText = strength === "strong" ? "日主支持力量偏足" : strength === "weak" ? "日主支持力量偏弱" : "日主支持力量相对平衡";
  return {
    chart_element_vector: chartVector,
    visual_levels: visualLevels(chartVector),
    day_master: { stem: bazi.pillars.day[0], element: dayMaster, label: `${bazi.pillars.day[0]}${ELEMENT_ZH[dayMaster]}` },
    month_command: bazi.pillars.month[1],
    structure_track: { result: "ordinary_balance_track", note: "MVP 不在证据不足时强判特殊格局。" },
    strength_track: { result: strength, support_ratio: support, note: supportText },
    climate_track: { result: climate, note: "调候只作为需要排序的有限修正，不单独覆盖整体结构。" },
    flow_track: { roles, note: "按生克角色与全局流通生成候选次序，不采用缺什么补什么。" },
    tier_by_element: tierByElement,
    base_need_vector: baseNeedVector,
    primary_element: primary,
    secondary_element: secondary,
    avoid_elements: [rankedNeed[3], rankedNeed[4]],
    type_name: buildNames(primary, secondary),
    strength_summary: displayParts.join(" · "),
    one_line_reading: `${ELEMENT_ZH[chartOrder[0]]}${ELEMENT_ZH[chartOrder[1]]}相映，气息在${ELEMENT_ZH[primary]}与${ELEMENT_ZH[secondary]}之间寻找更舒展的平衡。`,
    confidence: {
      score: confidenceScore,
      level: confidenceLevel,
      display_hint: bazi.local_civil_time.precision === "unknown"
        ? "出生时辰不确定，本结果未使用时柱，适合作为简化娱乐参考。"
        : "喜用判断采用可解释的娱乐产品规则；不同传统口径可能给出辅助结果。"
    },
    auxiliary_interpretation: borderline || bazi.alternate_pillars ? {
      reason: bazi.alternate_pillars ? "子时所在日期段不确定，保留 23 点后候选四柱；主结果按凌晨 0 点后候选展示。" : "日主支持度位于候选阈值附近，旺衰流派可能产生不同次序。",
      alternate_pillars: bazi.alternate_pillars,
      confidence: "low"
    } : null,
    rule_version: "interpretation-multitrack-mvp-v0.1"
  };
}

export { ELEMENT_ZH, TIERS };
