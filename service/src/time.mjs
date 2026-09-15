import { ServiceError } from "./errors.mjs";

const formatterCache = new Map();

function formatter(timeZone) {
  if (!formatterCache.has(timeZone)) {
    try {
      formatterCache.set(timeZone, new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      }));
    } catch {
      throw new ServiceError("INVALID_TIMEZONE", "地点时区暂时不可用，请重新选择地点。", { status: 422 });
    }
  }
  return formatterCache.get(timeZone);
}

export function zonedParts(instantMs, timeZone) {
  return Object.fromEntries(formatter(timeZone).formatToParts(new Date(instantMs))
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, Number(part.value)]));
}

function sameWallMinute(parts, target) {
  return parts.year === target.year && parts.month === target.month && parts.day === target.day
    && parts.hour === target.hour && parts.minute === target.minute;
}

function offsetMinutes(instantMs, timeZone) {
  const parts = zonedParts(instantMs, timeZone);
  const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((representedAsUtc - instantMs) / 60_000);
}

export function resolveWallTime(target, timeZone, { fold = null, allowAmbiguousDefault = false } = {}) {
  const guess = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute, 0);
  const matches = [];
  for (let deltaMinutes = -900; deltaMinutes <= 900; deltaMinutes += 1) {
    const instantMs = guess + deltaMinutes * 60_000;
    if (sameWallMinute(zonedParts(instantMs, timeZone), target)) matches.push(instantMs);
  }
  if (!matches.length) {
    throw new ServiceError("LOCAL_TIME_NONEXISTENT", "这个当地时间处于夏令时跳转空档，请填写跳转后的实际时间。", {
      status: 422,
      details: { time_zone: timeZone, local_time: target }
    });
  }
  const unique = [...new Set(matches)].sort((left, right) => left - right);
  if (unique.length > 1 && fold === null && !allowAmbiguousDefault) {
    throw new ServiceError("LOCAL_TIME_AMBIGUOUS", "这个当地时间因夏令时结束出现两次，请选择较早或较晚的一次。", {
      status: 422,
      details: {
        time_zone: timeZone,
        candidates: unique.map((instantMs, index) => ({
          fold: index,
          utc: new Date(instantMs).toISOString(),
          utc_offset_minutes: offsetMinutes(instantMs, timeZone)
        }))
      }
    });
  }
  const selectedIndex = fold === 1 && unique[1] ? 1 : 0;
  return {
    instantMs: unique[selectedIndex],
    utc: new Date(unique[selectedIndex]).toISOString(),
    utcOffsetMinutes: offsetMinutes(unique[selectedIndex], timeZone),
    ambiguous: unique.length > 1,
    fold: selectedIndex
  };
}

const SHICHEN_HOURS = Object.freeze({
  zi: 23,
  chou: 2,
  yin: 4,
  mao: 6,
  chen: 8,
  si: 10,
  wu: 12,
  wei: 14,
  shen: 16,
  you: 18,
  xu: 20,
  hai: 22
});

export function resolveBirthWallInput(birthDate, birthTime) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate || "")) {
    throw new ServiceError("INVALID_BIRTH_DATE", "请选择有效出生日期。", { status: 422 });
  }
  const [year, month, day] = birthDate.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() + 1 !== month || probe.getUTCDate() !== day || year < 1800 || year > new Date().getUTCFullYear()) {
    throw new ServiceError("INVALID_BIRTH_DATE", "请选择 1800 年至今天之间的有效出生日期。", { status: 422 });
  }
  if (birthTime?.mode === "exact") {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(birthTime.exact_local_time || "");
    if (!match) throw new ServiceError("INVALID_BIRTH_TIME", "请填写有效的精确出生时间。", { status: 422 });
    return { year, month, day, hour: Number(match[1]), minute: Number(match[2]), precision: "minute", uncertain: false };
  }
  if (birthTime?.mode === "shichen") {
    if (!(birthTime.shichen_id in SHICHEN_HOURS)) throw new ServiceError("INVALID_SHICHEN", "请选择有效时辰。", { status: 422 });
    let hour = SHICHEN_HOURS[birthTime.shichen_id];
    if (birthTime.shichen_id === "zi") {
      if (birthTime.zi_segment === "early_00") hour = 0;
      else if (birthTime.zi_segment === "late_23") hour = 23;
      else if (birthTime.zi_segment === "unknown") hour = 0;
      else throw new ServiceError("AMBIGUOUS_ZI_SEGMENT", "请确认子时是在 23 点后还是凌晨 0 点后。", { status: 422 });
    }
    return { year, month, day, hour, minute: 30, precision: "two_hour", uncertain: false, ziSegmentUncertain: birthTime.shichen_id === "zi" && birthTime.zi_segment === "unknown" };
  }
  if (birthTime?.mode === "unknown") {
    return { year, month, day, hour: 12, minute: 0, precision: "unknown", uncertain: true };
  }
  throw new ServiceError("INVALID_BIRTH_TIME", "请选择出生时辰，或选择不确定。", { status: 422 });
}
