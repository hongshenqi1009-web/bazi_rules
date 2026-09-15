import test from "node:test";
import assert from "node:assert/strict";
import { CityContentService } from "../src/content-service.mjs";

test("AI content receives only display-level personal data and verified city facts", async () => {
  let requestBody;
  const service = new CityContentService({
    apiKey: "test-key",
    model: "test-model",
    baseUrl: "https://example.invalid/v1",
    timeoutMs: 500,
    fetchImpl: async (_url, request) => {
      requestBody = JSON.parse(request.body);
      return {
        ok: true,
        json: async () => ({ output_text: JSON.stringify({
          feature: "这是一段只依据白名单事实撰写的城市特色说明，包含清晰的自然地理与城市生活层次。",
          why: "这是一段说明城市五行组合如何与个人需要区间相互呼应的含蓄解释，不改动任何分数。",
          feeling: "这是一段完整而温柔的城市寄语，描述环境怎样让用户已有的耐心、感受力与行动节奏更自然地展开。"
        }) })
      };
    }
  });
  const result = await service.generate(
    { type_name: "木水相生型", primary_element: "wood", secondary_element: "water", tier_by_element: {}, confidence: { level: "medium" } },
    { zh: "测试城", en: "Test City", vector: { wood: 25 }, match_reasons: {} },
    { core_tags: ["河流"], profile_tags: ["Nature"], facts: { geography: ["有一条河"] }, sources: [{ id: "source-1" }] }
  );
  assert.equal(result.status, "ready");
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.background, false);
  assert.doesNotMatch(requestBody.input, /birth|出生日期|2000|四柱/);
  assert.match(requestBody.input, /verified_facts/);
});

test("AI failure is isolated as unavailable content", async () => {
  const service = new CityContentService({ apiKey: "", model: "", baseUrl: "", timeoutMs: 50 });
  const result = await service.generate({}, {}, { facts: {}, sources: [], core_tags: [], profile_tags: [] });
  assert.equal(result.status, "unavailable");
  assert.equal(result.retryable, true);
});
