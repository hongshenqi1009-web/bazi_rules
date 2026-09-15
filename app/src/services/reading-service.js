import { DEMO_META, DEMO_RESULT, LOCATIONS } from "../data/demo-fixture.js";

export const READING_STAGES = Object.freeze(["bazi", "matching", "content", "complete"]);

function wait(duration, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, duration);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Reading cancelled", "AbortError"));
    }, { once: true });
  });
}

export class DemoReadingService {
  constructor({ durations = [850, 1200, 650] } = {}) {
    this.durations = durations;
    this.isDemo = true;
  }

  async searchLocations(query) {
    const normalized = query.trim().toLowerCase();
    return LOCATIONS.filter((location) => [location.zh, location.en, location.country, location.region]
      .some((value) => value.toLowerCase().includes(normalized))).slice(0, 8);
  }

  async createReading(request, { onStage, signal } = {}) {
    const stages = ["bazi", "matching", "content"];
    for (let index = 0; index < stages.length; index += 1) {
      onStage?.(stages[index]);
      await wait(this.durations[index], signal);
    }
    onStage?.("complete");
    return structuredClone({
      ...DEMO_RESULT,
      requestMeta: {
        isDemo: DEMO_META.isDemo,
        fixtureVersion: DEMO_META.version,
        acceptedRequestShape: Object.keys(request).sort()
      }
    });
  }

  async retryCityContent() {
    return null;
  }
}

export class ReadingServiceError extends Error {
  constructor(message, { code = "SERVICE_ERROR", retryable = true, details = null } = {}) {
    super(message);
    this.name = "ReadingServiceError";
    this.code = code;
    this.retryable = retryable;
    this.details = details;
    this.userMessage = message;
  }
}

async function apiJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
  } catch {
    throw new ReadingServiceError("暂时无法连接推演服务，请检查网络后重试。", { code: "NETWORK_ERROR" });
  }
  let payload = null;
  try { payload = await response.json(); } catch { /* handled below */ }
  if (!response.ok) {
    const error = payload?.error || {};
    throw new ReadingServiceError(error.message || "服务暂时不可用，请稍后重试。", {
      code: error.code || `HTTP_${response.status}`,
      retryable: error.retryable !== false,
      details: error.details || null
    });
  }
  return payload;
}

export class ApiReadingService {
  constructor({ baseUrl = "", pollInterval = 260, maxPolls = 180 } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.pollInterval = pollInterval;
    this.maxPolls = maxPolls;
    this.isDemo = false;
  }

  async searchLocations(query, { signal } = {}) {
    if (!query.trim()) return [];
    const payload = await apiJson(`${this.baseUrl}/api/locations?q=${encodeURIComponent(query)}&limit=8`, { signal });
    return payload.items.map((location) => ({
      id: location.id,
      standardId: location.standard_id,
      zh: location.city_name_zh,
      en: location.city_name,
      region: location.admin_area,
      country: location.country_zh,
      countryCode: location.country_code,
      timezone: location.iana_timezone,
      lat: location.lat,
      lon: location.lon,
      source: location.source
    }));
  }

  async createReading(request, { onStage, signal } = {}) {
    const created = await apiJson(`${this.baseUrl}/api/readings`, { method: "POST", body: JSON.stringify(request), signal });
    let lastStage = null;
    for (let attempt = 0; attempt < this.maxPolls; attempt += 1) {
      if (created.stage !== lastStage) {
        lastStage = created.stage;
        onStage?.(lastStage);
      }
      const current = await apiJson(`${this.baseUrl}/api/readings/${encodeURIComponent(created.result_id)}`, { signal });
      if (current.stage !== lastStage) {
        lastStage = current.stage;
        onStage?.(lastStage);
      }
      if (current.status === "complete") {
        onStage?.("complete");
        return this.normalizeResult(current);
      }
      if (current.status === "failed") {
        const error = current.error || {};
        throw new ReadingServiceError(error.message || "暂时无法完成推演，请稍后重试。", error);
      }
      await wait(this.pollInterval, signal);
    }
    throw new ReadingServiceError("推演等待时间过长，请稍后重试。", { code: "READING_TIMEOUT" });
  }

  normalizeCity(city) {
    return {
      rank: city.rank,
      id: city.city_id,
      zh: city.city_name_zh,
      en: city.city_name_en,
      index: city.compatibility_index,
      tier: city.compatibility_tier,
      veryClose: city.very_close_match,
      tags: city.core_mood_tags,
      scene: city.scene,
      city_profile_status: city.city_profile_status,
      dataConfidence: city.data_confidence,
      contentStatus: city.content?.status || "unavailable",
      feature: city.content?.feature || "",
      why: city.content?.why || "",
      feeling: city.content?.feeling || "",
      shareLine: city.share_line
    };
  }

  normalizeResult(payload) {
    return {
      resultId: payload.result_id,
      source: payload.source,
      inputLocation: payload.input_location,
      personalProfile: {
        typeName: payload.personal_profile.type_name,
        strengthSummary: payload.personal_profile.strength_summary,
        oneLineReading: payload.personal_profile.one_line_reading,
        visualLevels: payload.personal_profile.visual_levels,
        confidence: {
          level: payload.personal_profile.confidence.level,
          score: payload.personal_profile.confidence.score,
          displayHint: payload.personal_profile.confidence.display_hint
        }
      },
      desiredCityEnergy: {
        paragraphs: payload.desired_city_energy.paragraphs,
        visualLevels: payload.desired_city_energy.visual_levels
      },
      rankedCities: payload.ranked_cities.map((city) => this.normalizeCity(city)),
      share: payload.share,
      privacy: payload.privacy,
      disclaimer: payload.disclaimer.short,
      versions: payload.versions
    };
  }

  async retryCityContent(readingId, cityId) {
    const payload = await apiJson(`${this.baseUrl}/api/readings/${encodeURIComponent(readingId)}/cities/${encodeURIComponent(cityId)}/content/retry`, {
      method: "POST",
      body: "{}"
    });
    return this.normalizeCity(payload);
  }
}

const requestedDemo = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1";
export const readingService = requestedDemo ? new DemoReadingService() : new ApiReadingService();
