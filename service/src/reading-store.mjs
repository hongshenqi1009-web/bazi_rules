import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { calculateBazi } from "./bazi-engine.mjs";
import { publicError, ServiceError } from "./errors.mjs";
import { ELEMENT_ZH } from "./interpretation-engine.mjs";

const ELEMENT_POETRY = Object.freeze({
  wood: "生长与舒展", fire: "明朗与温度", earth: "承载与安定", metal: "清晰与秩序", water: "流动与润泽"
});

function levelsFromMap(vector) {
  const elements = Object.keys(vector).sort((left, right) => vector[left] - vector[right]);
  return Object.fromEntries(elements.map((element, index) => [element, index + 1]));
}

function desiredParagraphs(personal) {
  const primary = ELEMENT_ZH[personal.primary_element];
  const secondary = ELEMENT_ZH[personal.secondary_element];
  const avoid = ELEMENT_ZH[personal.avoid_elements.at(-1)];
  return [
    `你更容易与${primary}${secondary}相承、组合有层次的城市产生共振。`,
    `这类环境让${ELEMENT_POETRY[personal.primary_element]}与${ELEMENT_POETRY[personal.secondary_element]}彼此照应，而不是把某一种能量推到极端。`,
    `相比之下，${avoid}意过量或整体过于单一的城市气息，可能没有那么贴合你。`
  ];
}

function shareLine(city, personal) {
  const firstTag = city.tags[0] || "山河气息";
  return `${city.zh}以${firstTag}与${ELEMENT_ZH[city.dominant_element]}的城市底色，回应你在${ELEMENT_ZH[personal.primary_element]}与${ELEMENT_ZH[personal.secondary_element]}之间自然展开的能量。`;
}

function copyCity(city) {
  return {
    ...city,
    veryClose: city.very_close,
    scene: city.en.toLowerCase().replace(/[^a-z]+/g, "-"),
    shareLine: city.share_line,
    contentStatus: city.content?.status || "unavailable",
    feature: city.content?.feature || "",
    why: city.content?.why || "",
    feeling: city.content?.feeling || ""
  };
}

function contractCity(city) {
  const copied = copyCity(city);
  return {
    rank: copied.rank,
    city_id: copied.id,
    city_name_zh: copied.zh,
    city_name_en: copied.en,
    compatibility_index: copied.index,
    compatibility_tier: copied.tier,
    very_close_match: copied.veryClose,
    core_mood_tags: copied.tags,
    scene: copied.scene,
    city_profile_status: copied.city_profile_status,
    data_confidence: copied.data_confidence,
    match_reason_summary: copied.match_reasons?.short || "",
    content: copied.content || { status: "unavailable", message: "详细解读暂时不可用，可稍后重试。" },
    share_line: copied.shareLine
  };
}

function contractResult(result) {
  return {
    source: result.source,
    input_location: result.inputLocation,
    personal_profile: {
      type_name: result.personalProfile.typeName,
      strength_summary: result.personalProfile.strengthSummary,
      one_line_reading: result.personalProfile.oneLineReading,
      visual_levels: result.personalProfile.visualLevels,
      confidence: {
        level: result.personalProfile.confidence.level,
        score: result.personalProfile.confidence.score,
        display_hint: result.personalProfile.confidence.displayHint
      }
    },
    desired_city_energy: {
      title: "更契合你的城市能量",
      paragraphs: result.desiredCityEnergy.paragraphs,
      visual_levels: result.desiredCityEnergy.visualLevels
    },
    ranked_cities: result.rankedCities.map(contractCity),
    share: result.share,
    privacy: result.privacy,
    disclaimer: {
      short: result.disclaimer,
      method_url: "",
      privacy_url: "/privacy.html"
    },
    confidence: result.technical.confidence,
    versions: {
      bazi_engine: result.versions.baziEngine,
      calendar_library: result.versions.calendarLibrary,
      interpretation_engine: result.versions.interpretationEngine,
      personal_need: result.versions.personalNeed,
      preferred_exposure: result.versions.preferredExposure,
      city_engine: result.versions.cityEngine,
      city_facts: result.versions.cityFacts,
      matching_engine: result.versions.matchingEngine,
      index_calibration: result.versions.indexCalibration,
      dayun_adjustment: result.versions.dayunAdjustment,
      direction_adjustment: result.versions.directionAdjustment,
      city_profile: result.versions.cityProfile,
      content_template: result.versions.contentTemplate
    }
  };
}

export class ReadingStore {
  constructor({ locationRepository, cityRepository, cityProfileRepository, personalNeedEngine, matchingEngine, contentService, interpretationEngine, config }) {
    this.locations = locationRepository;
    this.cities = cityRepository;
    this.profiles = cityProfileRepository;
    this.personalNeedEngine = personalNeedEngine;
    this.matchingEngine = matchingEngine;
    this.contentService = contentService;
    this.interpretationEngine = interpretationEngine;
    this.config = config;
    this.records = new Map();
    this.cleanupTimer = setInterval(() => this.cleanup(), Math.min(config.readingTtlMs, 60_000));
    this.cleanupTimer.unref?.();
  }

  create(request) {
    const id = randomUUID();
    this.records.set(id, { id, status: "queued", stage: "bazi", result: null, error: null, expiresAt: Date.now() + this.config.readingTtlMs });
    queueMicrotask(() => this.run(id, request));
    return { result_id: id, status: "queued", stage: "bazi", poll_after_ms: 260, expires_in_seconds: Math.floor(this.config.readingTtlMs / 1000) };
  }

  async run(id, request) {
    const record = this.records.get(id);
    if (!record) return;
    try {
      record.status = "processing";
      record.stage = "bazi";
      const location = this.locations.get(request.birth_location_id);
      if (!location) throw new ServiceError("LOCATION_NOT_FOUND", "出生地点已失效，请重新搜索并选择。", { status: 422 });
      const bazi = calculateBazi(request, location);
      const interpretation = this.interpretationEngine(bazi);
      const personal = this.personalNeedEngine.calculate(interpretation, bazi);

      record.stage = "matching";
      const ranking = this.matchingEngine.rank(personal, { lat: location.lat, lon: location.lon }, {
        directionEnabled: request.direction_adjustment_enabled === true
      });
      const top = ranking.slice(0, 3).map((city) => ({ ...city, share_line: shareLine(city, personal) }));
      const qrDataUrl = await QRCode.toDataURL(this.config.publicAppUrl, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 256,
        color: { dark: "#07100dff", light: "#d7c79dff" }
      });
      const coreResult = {
        resultId: id,
        source: "t009-real-chain-v0.1",
        inputLocation: {
          id: location.standard_id,
          zh: location.city_name_zh,
          en: location.city_name,
          country: location.country_zh,
          timezone: location.timezone
        },
        personalProfile: {
          typeName: interpretation.type_name,
          strengthSummary: interpretation.strength_summary,
          oneLineReading: interpretation.one_line_reading,
          visualLevels: interpretation.visual_levels,
          confidence: { level: interpretation.confidence.level, score: interpretation.confidence.score, displayHint: interpretation.confidence.display_hint }
        },
        desiredCityEnergy: {
          paragraphs: desiredParagraphs(personal),
          visualLevels: levelsFromMap(personal.current_need_vector)
        },
        rankedCities: top,
        technical: {
          pillars: bazi.pillars,
          day_master: interpretation.day_master,
          structure_track: interpretation.structure_track,
          strength_track: interpretation.strength_track,
          climate_track: interpretation.climate_track,
          tier_by_element: personal.tier_by_element,
          base_need_vector: personal.base_need_vector,
          current_need_vector: personal.current_need_vector,
          preferred_ranges: personal.preferred_ranges,
          dayun: bazi.dayun,
          confidence: interpretation.confidence,
          auxiliary_interpretation: interpretation.auxiliary_interpretation
        },
        share: { landing_url: this.config.publicAppUrl, qr_data_url: qrDataUrl },
        privacy: {
          account_required: false,
          birth_input_persisted: false,
          result_storage: "ephemeral_memory",
          result_ttl_seconds: Math.floor(this.config.readingTtlMs / 1000),
          share_contains_birth_data: false
        },
        disclaimer: "契合指数是娱乐型模型指数，不代表概率，也不构成迁居、职业、财务、医疗或其他现实决策建议。",
        versions: {
          baziEngine: bazi.versions.bazi_engine,
          calendarLibrary: bazi.versions.calendar_library,
          interpretationEngine: interpretation.rule_version,
          personalNeed: personal.rule_version,
          preferredExposure: personal.preferred_exposure_version,
          cityEngine: this.cities.cities[0].mappingVersion,
          cityFacts: this.cities.cities[0].sourceSnapshotVersion,
          matchingEngine: "matching-engine-v0.1-candidate",
          indexCalibration: "matching-index-calibration-v0.1-candidate",
          dayunAdjustment: personal.dayun_adjustment_version,
          directionAdjustment: "direction-adjustment-v0.1-candidate",
          cityProfile: this.profiles.metadata.schema_version,
          contentTemplate: "city-detail-ai-v0.1"
        }
      };
      record.result = coreResult;
      record.stage = "content";
      record.status = "content_pending";
      const contents = await Promise.all(top.map((city) => this.contentService.generate(personal, city, this.profiles.get(city.id))));
      record.result.rankedCities = top.map((city, index) => ({ ...city, content: contents[index] }));
      record.status = "complete";
      record.stage = "complete";
      record.expiresAt = Date.now() + this.config.readingTtlMs;
    } catch (error) {
      record.status = "failed";
      record.stage = "error";
      record.error = publicError(error);
      record.result = null;
      record.expiresAt = Date.now() + this.config.readingTtlMs;
    }
  }

  get(id) {
    const record = this.records.get(id);
    if (!record || record.expiresAt <= Date.now()) {
      this.records.delete(id);
      throw new ServiceError("READING_EXPIRED", "本次临时结果已过期，请重新开始探索。", { status: 404, retryable: false });
    }
    return {
      result_id: record.id,
      status: record.status,
      stage: record.stage,
      ...(record.result ? contractResult(record.result) : {}),
      error: record.error,
      expires_at: new Date(record.expiresAt).toISOString()
    };
  }

  async retryContent(readingId, cityId) {
    const record = this.records.get(readingId);
    if (!record?.result) throw new ServiceError("READING_NOT_READY", "核心结果尚未完成，请稍后再试。", { status: 409, retryable: true });
    const city = record.result.rankedCities.find((item) => item.id === cityId);
    if (!city) throw new ServiceError("CITY_NOT_IN_RESULT", "这座城市不在本次 Top 3 中。", { status: 404 });
    const personal = {
      type_name: record.result.personalProfile.typeName,
      primary_element: record.result.technical.tier_by_element && Object.keys(record.result.technical.tier_by_element).find((key) => record.result.technical.tier_by_element[key] === "strong_prefer"),
      secondary_element: record.result.technical.tier_by_element && Object.keys(record.result.technical.tier_by_element).find((key) => record.result.technical.tier_by_element[key] === "prefer"),
      tier_by_element: record.result.technical.tier_by_element,
      confidence: record.result.technical.confidence
    };
    city.content = await this.contentService.generate(personal, city, this.profiles.get(city.id));
    record.expiresAt = Date.now() + this.config.readingTtlMs;
    return contractCity(city);
  }

  cleanup() {
    const now = Date.now();
    for (const [id, record] of this.records) if (record.expiresAt <= now) this.records.delete(id);
  }
}
