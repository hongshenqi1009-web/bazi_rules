import lunarPackage from "lunar-javascript";
import { ServiceError } from "./errors.mjs";
import { resolveBirthWallInput, resolveWallTime, zonedParts } from "./time.mjs";

const { Solar } = lunarPackage;
const STEM_ELEMENT = Object.freeze({ 甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water" });
const BRANCH_ELEMENT = Object.freeze({ 子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire", 午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water" });

function eightChar(parts) {
  const value = Solar.fromYmdHms(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second || 0).getLunar().getEightChar();
  value.setSect(1);
  return value;
}

function solarParts(solar) {
  return {
    year: solar.getYear(), month: solar.getMonth(), day: solar.getDay(),
    hour: solar.getHour(), minute: solar.getMinute(), second: solar.getSecond()
  };
}

function dayunSignal(ganZhi) {
  const signal = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  if (!ganZhi) return signal;
  signal[STEM_ELEMENT[ganZhi[0]]] += 1;
  signal[BRANCH_ELEMENT[ganZhi[1]]] += 1;
  const mean = Object.values(signal).reduce((sum, value) => sum + value, 0) / 5;
  return Object.fromEntries(Object.entries(signal).map(([element, value]) => [element, value - mean]));
}

function calculateYun(eight, sex, nowYear) {
  const gender = sex === "male" ? 1 : sex === "female" ? 0 : null;
  if (gender === null) throw new ServiceError("INVALID_SEX", "请选择用于传统排运规则的性别口径。", { status: 422 });
  const yun = eight.getYun(gender, 1);
  const startSolar = yun.getStartSolar();
  const periods = yun.getDaYun(12).map((period) => ({
    index: period.getIndex(),
    gan_zhi: period.getGanZhi(),
    start_year: period.getStartYear(),
    end_year: period.getEndYear(),
    start_age: period.getStartAge(),
    end_age: period.getEndAge()
  }));
  const current = periods.find((period) => period.start_year <= nowYear && nowYear <= period.end_year) || periods.at(-1);
  return {
    direction: yun.isForward() ? "forward" : "backward",
    start_offset: {
      years: yun.getStartYear(), months: yun.getStartMonth(), days: yun.getStartDay(), hours: yun.getStartHour()
    },
    start_local_civil: solarParts(startSolar),
    current_period: current,
    adjustment_signal: dayunSignal(current?.gan_zhi)
  };
}

export function calculateBazi(request, location, { now = new Date() } = {}) {
  if (request.true_solar_time_enabled === true) {
    throw new ServiceError("TRUE_SOLAR_TIME_NOT_ENABLED", "免费版暂未启用真太阳时高级选项。", { status: 422 });
  }
  const wall = resolveBirthWallInput(request.birth_date_local, request.birth_time);
  const resolved = resolveWallTime(wall, location.timezone, {
    fold: Number.isInteger(request.birth_time?.fold) ? request.birth_time.fold : null,
    allowAmbiguousDefault: wall.precision !== "minute"
  });
  const beijing = zonedParts(resolved.instantMs, "Asia/Shanghai");
  const localEight = eightChar(wall);
  const beijingEight = eightChar(beijing);
  const pillars = {
    year: beijingEight.getYear(),
    month: beijingEight.getMonth(),
    day: localEight.getDay(),
    time: wall.uncertain ? null : localEight.getTime()
  };
  let alternatePillars = null;
  if (wall.ziSegmentUncertain) {
    const lateWall = { ...wall, hour: 23, ziSegmentUncertain: false };
    const lateResolved = resolveWallTime(lateWall, location.timezone, { allowAmbiguousDefault: true });
    const lateBeijingEight = eightChar(zonedParts(lateResolved.instantMs, "Asia/Shanghai"));
    const lateLocalEight = eightChar(lateWall);
    alternatePillars = {
      year: lateBeijingEight.getYear(), month: lateBeijingEight.getMonth(), day: lateLocalEight.getDay(), time: lateLocalEight.getTime()
    };
  }
  const dayun = calculateYun(beijingEight, request.sex_for_dayun, now.getUTCFullYear());
  return {
    pillars,
    alternate_pillars: alternatePillars,
    four_pillars_text: [pillars.year, pillars.month, pillars.day, pillars.time || "时柱未知"].join(" "),
    local_civil_time: wall,
    resolved_instant: resolved,
    calendar_basis: {
      year_month: "solar-term instant evaluated in Asia/Shanghai",
      day_time: "birth-place local civil time",
      day_boundary: "23:00 zi-initial change",
      true_solar_time: false
    },
    dayun,
    versions: {
      bazi_engine: "lunar-javascript-wrapper-v0.1",
      calendar_library: "lunar-javascript@1.7.7",
      calendar_commit: "4c45a59f79b856125516f31aefa8295035c16afd",
      day_boundary: "day-boundary-23h-v1",
      dayun: "dayun-discrete-shichen-v1"
    }
  };
}
