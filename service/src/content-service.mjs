const RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["feature", "why", "feeling"],
  properties: {
    feature: { type: "string", minLength: 40, maxLength: 420 },
    why: { type: "string", minLength: 40, maxLength: 420 },
    feeling: { type: "string", minLength: 60, maxLength: 520 }
  }
});

function unavailable(code, retryable = true) {
  return {
    status: "unavailable",
    error_code: code,
    retryable,
    message: "详细解读暂时不可用，可稍后重试。"
  };
}

function extractOutputText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

function validCopy(value) {
  return value && typeof value.feature === "string" && typeof value.why === "string" && typeof value.feeling === "string"
    && value.feature.length <= 420 && value.why.length <= 420 && value.feeling.length <= 520;
}

export class CityContentService {
  constructor({ apiKey, model, baseUrl, timeoutMs, fetchImpl = fetch }) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  sanitizedInput(personal, city, profile) {
    return {
      user_display_profile: {
        type_name: personal.type_name,
        primary_element: personal.primary_element,
        secondary_element: personal.secondary_element,
        tier_by_element: personal.tier_by_element,
        confidence_level: personal.confidence.level
      },
      city: {
        name_zh: city.zh,
        name_en: city.en,
        element_vector_points: city.vector,
        match_reasons: city.match_reasons,
        core_tags: profile.core_tags,
        profile_tags: profile.profile_tags,
        verified_facts: profile.facts,
        allowed_source_ids: profile.sources.map((source) => source.id)
      }
    };
  }

  async generate(personal, city, profile) {
    if (!profile) return unavailable("CITY_PROFILE_NOT_PUBLISHED", false);
    if (!this.apiKey || !this.model) return unavailable("CONTENT_SERVICE_NOT_CONFIGURED");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const safeInput = this.sanitizedInput(personal, city, profile);
      const response = await this.fetchImpl(`${this.baseUrl}/responses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          store: false,
          background: false,
          max_output_tokens: 850,
          instructions: [
            "你是『山河有应』的城市内容编辑。只可使用输入中的 verified_facts、标签、五行向量和匹配理由。",
            "不得补充、猜测或搜索任何城市事实；不得改动契合指数、城市排序、用户五行或命理判断。",
            "输出中文 JSON：城市特色要具体；为什么契合要含蓄解释组合关系；它会带来的感受要写成温柔完整的城市寄语。",
            "避免宿命、成功承诺、迁居建议与『你喜水所以适合』式硬译。轻微冲突可自然带过。"
          ].join("\n"),
          input: JSON.stringify(safeInput),
          text: {
            verbosity: "low",
            format: { type: "json_schema", name: "city_detail", strict: true, schema: RESPONSE_SCHEMA }
          }
        })
      });
      if (!response.ok) return unavailable(`CONTENT_UPSTREAM_${response.status}`);
      const payload = await response.json();
      const text = extractOutputText(payload);
      const parsed = JSON.parse(text);
      if (!validCopy(parsed)) return unavailable("CONTENT_SCHEMA_INVALID");
      return {
        status: "ready",
        ...parsed,
        generated_by: "ai",
        model: this.model,
        prompt_version: "city-detail-ai-v0.1",
        source_profile_version: "city-profile-mvp-v0.2"
      };
    } catch (error) {
      return unavailable(error?.name === "AbortError" ? "CONTENT_TIMEOUT" : "CONTENT_GENERATION_FAILED");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export { unavailable as unavailableContent };
