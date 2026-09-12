# 免费版 MVP 前端接口合同

- 状态：T-007 技术无关规格
- 最后更新：2026-09-12
- 目的：让前端可以开始实现页面和状态，不在浏览器内复制命理、城市或匹配算法

## 1. 总则

- 所有日期时间计算发生在后端确定性层；前端只收集当地输入并展示解析结果。
- 前端不得计算四柱、个人需要、城市向量、契合指数、排序或主辅方案合并。
- 数组五行顺序固定为 `[wood, fire, earth, metal, water]`；接口同时返回键名对象用于校验。
- 所有可展示结果包含版本链和 `result_id`；同一 `request_fingerprint + version_set` 应可重现。
- AI 文案可异步完成，但核心计算结果必须先稳定；AI 超时用模板降级。
- API 示例是传输合同，不限定 REST、RPC、SSE 或具体框架。

## 2. 地点搜索

### 请求

```json
{
  "query": "青岛",
  "locale": "zh-CN",
  "limit": 8
}
```

### 响应

```json
{
  "items": [
    {
      "location_id": "geonames:1797929",
      "city_name_zh": "青岛",
      "city_name_en": "Qingdao",
      "region": "山东",
      "country": "中国",
      "lat": 36.066,
      "lon": 120.369,
      "iana_timezone": "Asia/Shanghai",
      "source_snapshot_version": ""
    }
  ]
}
```

前端必须提交选中对象的 `location_id`，不能提交未解析自由文本。坐标和时区由后端按该 ID 再确认，不能信任客户端篡改值。

## 3. 出生输入

```json
{
  "birth_date_local": "2000-10-09",
  "birth_time": {
    "mode": "shichen",
    "exact_local_time": null,
    "shichen_id": "wei",
    "zi_segment": null,
    "precision": "two_hour"
  },
  "birth_location_id": "geonames:1797929",
  "sex_for_dayun": "female",
  "true_solar_time_enabled": false,
  "direction_adjustment_enabled": false,
  "locale": "zh-CN",
  "client_request_id": "uuid"
}
```

`birth_time.mode`枚举：

- `exact`：必须提供 `HH:mm`；
- `shichen`：必须提供 12 时辰 ID；若为`zi`，必须提供 `late_23`、`early_00`或`unknown`；
- `unknown`：其他时间字段为空，后端进入简化/候选流程。

`sex_for_dayun`是传统排运所需算法参数，只允许`male/female`。接口名不得简化为人格或身份推断。

## 4. 创建推演任务

### 受理响应

```json
{
  "result_id": "uuid",
  "status": "queued",
  "stage": "bazi",
  "poll_after_ms": 800,
  "input_summary": "2000.10.09 · 未时 · 青岛",
  "privacy": {"expires_at": "", "share_contains_birth_data": false}
}
```

`status`枚举：`queued/processing/content_pending/complete/failed`。

`stage`枚举：

- `bazi`：推演五行关键属性；
- `matching`：搜索回应的城市；
- `content`：生成或校验城市文案；
- `complete`。

前端只依据真实 `stage` 切换两段动画，不用假进度条。`content_pending`时可先渲染核心结果和模板文案。

## 5. 完整结果响应

```json
{
  "result_id": "uuid",
  "status": "complete",
  "input_summary": "2000.10.09 · 未时 · 青岛",
  "personal_profile": {
    "type_name": "木水相生型",
    "strength_summary": "木偏强 · 水次之 · 土平衡 · 金较弱",
    "one_line_reading": "木水相承，气质柔韧而流动。",
    "visual_levels": {"wood": 4, "fire": 2, "earth": 3, "metal": 1, "water": 4},
    "confidence": {"level": "medium", "display_hint": "结果对出生时辰较敏感"}
  },
  "desired_city_energy": {
    "title": "更契合你的城市能量",
    "paragraphs": ["", ""],
    "visual_levels": {"wood": 4, "fire": 2, "earth": 3, "metal": 1, "water": 4}
  },
  "ranked_cities": [],
  "flags": [],
  "disclaimer": {
    "short": "契合指数是娱乐型模型指数，不代表概率，也不构成现实决策建议。",
    "method_url": "",
    "privacy_url": ""
  },
  "versions": {}
}
```

`visual_levels`只用于无数字的相对视觉，范围 1–5；它不是向量百分比。真正计算向量可在受保护调试响应中保留，但不得进入普通客户端展示 payload。

## 6. 城市榜单对象

```json
{
  "rank": 1,
  "city_id": "",
  "city_name_zh": "温哥华",
  "city_name_en": "Vancouver",
  "compatibility_index": 91,
  "index_label": "契合指数 91",
  "compatibility_tier": "top",
  "very_close_match": false,
  "core_mood_tags": ["山海相拥", "森林舒展", "开放多元"],
  "thumbnail": {"url": "", "alt_zh": "", "asset_id": ""},
  "detail_status": "ready"
}
```

`ranked_cities`必须至少含 3 项，按最终分数降序且由后端稳定处理同分。客户端不得按标签、图片是否完整或本地语言再次排序。

## 7. 城市详情对象

```json
{
  "city_id": "",
  "city_name_zh": "温哥华",
  "city_name_en": "Vancouver",
  "compatibility_index": 91,
  "core_mood_tags": [],
  "hero_media": {"url": "", "alt_zh": "", "asset_id": "", "attribution": ""},
  "sections": {
    "city_feature": {"title": "城市特色", "body": "", "fact_ids": []},
    "why_match": {"title": "为什么契合", "body": "", "reason_codes": []},
    "felt_effect": {"title": "它会带来的感受", "body": "", "fact_ids": [], "strength_codes": []}
  },
  "content": {
    "mode": "ai_guarded",
    "template_version": "mvp-city-copy-v0.1",
    "status": "ready"
  },
  "confidence": {"bazi": "medium", "city_data": "medium", "ranking_stability": "high"}
}
```

前端不显示城市五行小图，也不把 `fact_ids` / `reason_codes`直接展示；它们用于审计和反馈。

## 8. 版本链

```json
{
  "bazi_engine": "",
  "interpretation_engine": "",
  "personal_need": "personal-need-v0.1-candidate",
  "preferred_exposure": "preferred-exposure-r2-balanced-candidate",
  "city_engine": "city-elements-v0.2.1-scheme-c-candidate",
  "matching_engine": "matching-engine-v0.1-candidate",
  "index_calibration": "matching-index-calibration-v0.1-candidate",
  "dayun_adjustment": "dayun-adjustment-v0.1-candidate",
  "direction_adjustment": "direction-adjustment-v0.1-candidate",
  "city_profile": "city-profile-v0.1",
  "content_template": "mvp-city-copy-v0.1"
}
```

内部仍保存 `base_match_index`、`dayun_effect`、`direction_effect`、个人需要向量、城市向量和主辅方案。免费普通响应只返回呈现所需字段；问题反馈和可授权调试必须能凭 `result_id` 找回完整审计链。

## 9. 当前阶段与方位

- 大运轻修正继续在后端生效，但免费页当前不显示独立“当前阶段”区块；
- 方位默认关闭。只有用户未来明确启用时才将 `direction_adjustment_enabled` 设为 `true`；出生地仍来自必填的标准地点，不另收位置。MVP 不用方位制造跨梯队排名；
- 如响应包含 `dayun_effect`或`direction_effect`，普通前端只用于生成已经批准的轻量说明，不显示内部数值和公式。

## 10. 分享卡请求与响应

请求只需：

```json
{
  "result_id": "uuid",
  "format": "portrait_3_4",
  "locale": "zh-CN"
}
```

响应：

```json
{
  "status": "ready",
  "image_url": "",
  "width": 1080,
  "height": 1440,
  "expires_at": "",
  "contains_birth_data": false,
  "qr_target": "",
  "copy_version": "mvp-share-copy-v0.1",
  "asset_manifest_version": ""
}
```

服务端从已完成结果生成分享卡；客户端不得把隐藏出生字段写入画布。`qr_target`默认指向产品入口，不包含个人结果 token。

## 11. 错误合同

```json
{
  "error": {
    "code": "LOCATION_AMBIGUOUS",
    "message_zh": "请选择更具体的出生城市。",
    "field": "birth_location_id",
    "retryable": true,
    "trace_id": ""
  }
}
```

最小错误码：

- `INVALID_BIRTH_DATE`
- `UNSUPPORTED_DATE_RANGE`
- `TIME_PRECISION_CONFLICT`
- `ZI_BOUNDARY_AMBIGUOUS`
- `LOCATION_NOT_FOUND`
- `LOCATION_AMBIGUOUS`
- `TIMEZONE_UNRESOLVED`
- `BAZI_COMPUTE_FAILED`
- `MATCHING_FAILED`
- `CONTENT_GENERATION_FAILED`
- `SHARE_RENDER_FAILED`
- `RESULT_EXPIRED`

`CONTENT_GENERATION_FAILED`不得使完整推演失败，应触发模板降级。

## 12. 前端状态机

```text
idle
  → collecting_step_1
  → collecting_step_2
  → submitting
  → computing_bazi
  → matching_cities
  → generating_content
  → complete
  → viewing_city | share_preview
```

任一计算阶段可进入`recoverable_error`或`fatal_error`。返回输入页时保留非敏感表单状态；过期结果回到首页并解释原因。

## 13. 非功能要求

- 手机首屏和输入流程可键盘、触摸和屏幕阅读器操作；
- 支持 `prefers-reduced-motion`，不以动画作为唯一进度信号；
- 图片有响应式尺寸、焦点和中文替代文本；
- 不从境外不可用的公共 CDN 动态加载关键字体、Logo、二维码库或核心城市图片；
- 日志与分析事件不含原始出生值；
- 所有用户可见数字和文案在服务端或共享 schema 校验；
- 接口变更采用向后兼容字段新增；破坏性变更必须升级版本。
