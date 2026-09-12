import { SHICHEN } from "../data/demo-fixture.js";

const SHICHEN_IDS = new Set(SHICHEN.map((item) => item.id));

export function validateBirthStep(birth) {
  const errors = {};
  if (!birth.date) {
    errors.date = "请选择出生日期";
  } else {
    const date = new Date(`${birth.date}T00:00:00`);
    const year = date.getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(date.getTime()) || year < 1800 || year > 2200 || date > today) {
      errors.date = "请选择 1800 年至今天之间的有效日期";
    }
  }

  if (birth.timeMode === "exact") {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(birth.exactTime || "")) {
      errors.time = "请输入有效的 24 小时时间";
    }
  } else if (birth.timeMode === "shichen") {
    if (!SHICHEN_IDS.has(birth.shichenId)) {
      errors.time = "请选择出生时辰";
    } else if (birth.shichenId === "zi" && !["late_23", "early_00", "unknown"].includes(birth.ziSegment)) {
      errors.ziSegment = "请补充子时所在的时间段";
    }
  } else if (birth.timeMode !== "unknown") {
    errors.time = "请选择出生时辰，或选择不确定";
  }

  return errors;
}

export function validatePlaceStep(input) {
  const errors = {};
  if (!input.location?.id) errors.location = "请从搜索结果中选择出生城市";
  if (!input.sex) errors.sex = "请选择用于传统排运规则的性别口径";
  return errors;
}

export function buildInputSummary(birth, location) {
  const date = birth.date ? birth.date.replaceAll("-", ".") : "日期未填";
  let time = "时辰不确定";
  if (birth.timeMode === "exact") time = birth.exactTime;
  if (birth.timeMode === "shichen") {
    const item = SHICHEN.find((entry) => entry.id === birth.shichenId);
    time = item ? `${item.label}时` : "时辰未选";
    if (birth.shichenId === "zi") {
      if (birth.ziSegment === "late_23") time = "子时 · 23点后";
      if (birth.ziSegment === "early_00") time = "子时 · 凌晨0点后";
      if (birth.ziSegment === "unknown") time = "子时 · 时段不确定";
    }
  }
  return `${date} · ${time} · ${location?.zh || "地点未选"}`;
}

export function createReadingRequest(state) {
  return {
    birth_date_local: state.birth.date,
    birth_time: {
      mode: state.birth.timeMode,
      exact_local_time: state.birth.timeMode === "exact" ? state.birth.exactTime : null,
      shichen_id: state.birth.timeMode === "shichen" ? state.birth.shichenId : null,
      zi_segment: state.birth.shichenId === "zi" ? state.birth.ziSegment : null,
      precision: state.birth.timeMode === "exact" ? "minute" : state.birth.timeMode === "shichen" ? "two_hour" : "unknown"
    },
    birth_location_id: `geonames:${state.location.id}`,
    sex_for_dayun: state.sex,
    true_solar_time_enabled: false,
    direction_adjustment_enabled: false,
    locale: "zh-CN"
  };
}
