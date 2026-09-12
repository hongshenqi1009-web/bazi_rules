# City Profile MVP 字段标准

- 状态：T-007 可实施规格；尚未批量填充 100 城
- 最后更新：2026-09-12
- 版本建议：`city-profile-v0.1`

## 1. 角色与边界

City Profile 是稳定的城市事实与内容素材层，负责让五行相近的城市在解释上真正不同。它不参与 City Engine 自然向量生成，也不改变 Matching Engine 核心契合分。

允许用途：

- 生成城市特色、为什么契合和城市感受；
- 选出 2–3 个核心气质标签；
- 在用户明确选择现实偏好时，对同一契合梯队作轻量二次排序；
- 选择经过授权的城市主图。

禁止用途：

- 因“金融城市”给金加分、因“科技城市”给火或木加分；
- 用主观印象替代自然事实或匹配结果；
- 跨越 Matching Engine 的 `very_close_match` 梯队改变主排序；
- 让 AI 补造缺失的河流、气候、城市生活或标签证据。

## 2. 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `city_id` | string | 是 | 与 `data/cities.csv` 一致的稳定 ID |
| `city_name_zh` | string | 是 | 中文显示名 |
| `city_name_en` | string | 是 | 英文显示名 |
| `country` | string | 是 | 国家/地区 |
| `region` | string | 是 | 一级行政区或产品地区 |
| `profile_version` | string | 是 | 内容版本 |
| `review_status` | enum | 是 | `draft/reviewed/published` |
| `last_reviewed_at` | date | 是 | 最近事实复核日期 |
| `core_mood_tags` | array | 是 | 2–3 个受控气质标签 |
| `geography` | object | 是 | 代表性自然地理 |
| `climate` | object | 是 | 面向用户的气候事实 |
| `urban_life` | object | 是 | 城市生活与节奏 |
| `auxiliary_tags` | array | 否 | 文化等辅助标签 |
| `hero_media` | object | 是 | 城市主图及许可 |
| `content_fallbacks` | object | 是 | AI 不可用时的已审模板 |
| `source_snapshot_version` | string | 是 | 本批事实快照版本 |

## 3. 事实条目统一结构

每条对外可用事实必须是独立对象：

```json
{
  "fact_id": "london-geo-thames-001",
  "claim_zh": "泰晤士河穿过伦敦核心城区。",
  "category": "geography.river",
  "source": {
    "name": "",
    "url": "",
    "publisher": "",
    "accessed_at": "YYYY-MM-DD",
    "period": "",
    "license": ""
  },
  "confidence": "high",
  "allowed_uses": ["city_feature", "match_reason", "share_copy"],
  "notes": ""
}
```

`claim_zh`必须是可直接核验的最小事实，不把“浪漫”“治愈”“有灵气”等解释性词汇写入事实。AI 只能使用 `allowed_uses` 包含当前用途的条目。

## 4. 自然地理与气候

### `geography`

- `water_bodies`：河流、湖泊、海湾、海岸；
- `terrain`：高原、盆地、平原、丘陵、山脉；
- `vegetation_landscape`：森林、湿地、城市绿地等已验证特征；
- `signature_landforms`：最具辨识度的 1–3 个地貌；
- `facts`：上述统一事实条目。

### `climate`

- `climate_summary_zh`：40–80 字，不使用绝对化语言；
- `climate_type`：受控分类，可多选；
- `seasonality`：四季、雨季/旱季、昼夜或海洋性变化；缺数据时为 `unknown`；
- `felt_experience_tags`：如`湿润`、`清凉`、`日照充足`，必须能回指事实；
- `facts`：数据源、时期、单位与结论。

City Profile 可引用 `data/cities.csv` 的稳定自然事实，但若生成“季节性”结论，必须另有支持月度或季节分布的数据，不能从年平均值臆测。

## 5. 城市生活

`urban_life`包含：

- `public_space`：代表性公园、滨水空间、步行街区等；
- `pace_tags`：`舒缓/均衡/活跃/高密度`等受控描述，必须注明依据类型；
- `openness_connectivity`：城市连接、国际流动或公共空间开放感的事实依据；
- `neighbourhood_character`：最多 3 条具体街区/城市肌理事实；
- `facts`：来源与许可。

生活节奏和开放程度容易混入主观判断，默认置信度不高于 Medium；除非有清楚、可比较的来源，否则只用于文案，不参与同梯队排序。

## 6. 辅助标签

首版受控标签：

`Culture`、`Art`、`Academic`、`Finance`、`Technology`、`Food`、`History`、`Architecture`、`Nature`、`Outdoor`、`Innovation`、`Lifestyle`、`Industry`、`Fashion`。

每个标签结构：

```json
{
  "id": "Academic",
  "label_zh": "学术",
  "strength": "high",
  "confidence": "high",
  "evidence_fact_ids": ["city-academic-001"],
  "use_for_explanation": true,
  "use_for_tie_breaker": false
}
```

首版默认所有标签都可用于解释；只有 `confidence=high`、有至少一条合格证据、且用户明确选择相关兴趣时，才可设置 `use_for_tie_breaker=true`。即使启用，也只能在后端已标记的同一梯队内排序。

## 7. 核心气质标签

每城选 2–3 个标签用于收起卡和分享卡。它们是对事实组合的编辑性摘要，不是五行分数。建议受控词库按三组组合：

- 自然感：`滨水流动`、`山海相拥`、`森林舒展`、`高原澄明`、`旷野干爽`、`四季分明`；
- 城市感：`文化丰盈`、`学术沉静`、`开放多元`、`节奏明快`、`历史层叠`、`创意活跃`；
- 生活感：`松弛宜行`、`公园日常`、`夜色丰盛`、`户外亲近`、`街区细腻`。

规则：至少一个标签来自自然/地理；不能三个全是经济或流行文化；同一批 100 城需检查高频词，避免所有城市都变成“开放多元”。

## 8. 城市媒体

```json
{
  "asset_id": "",
  "type": "photo",
  "source_url": "",
  "creator": "",
  "license": "",
  "attribution": "",
  "landmark_names": [],
  "city_verified": true,
  "focal_point": {"x": 0.5, "y": 0.45},
  "alt_zh": "",
  "safe_for_share": true
}
```

城市详情优先使用真实、有地标辨识度的授权照片。不得把无法确认城市的泛景或 AI 虚构地标当作真实城市主图。素材缺失时使用明确的品牌化占位图，不借用相似城市照片。

## 9. AI 输入白名单

AI 每次只接收：

- 已发布的 City Profile 事实和标签；
- 用户侧的展示级五行结构、优势语义和置信度提示；
- 城市五维向量、局部匹配原因、主要冲突和指数；
- 文案段落、长度、语气、禁用词和允许实体列表；
- 内容模板版本。

不向文案模型发送不需要展示的完整出生信息、四柱细节或其他城市未选中的事实。输出后校验：数字、城市名、地理实体、禁用词、承诺性语句、长度和事实引用。

## 10. 最小发布闸门

一座城市只有满足以下条件，才可进入有完整详情的 MVP：

- ID、双语名、国家/地区与主图确认；
- 至少 2 条自然地理事实、2 条气候/环境事实、2 条城市生活或辅助事实；
- 2–3 个核心气质标签；
- 三段降级文案均已人工检查；
- 主图许可和署名字段完整；
- 不存在把主观氛围写成客观事实的条目。

未达到闸门的城市仍可参与匹配，但详情使用简化版并标记内容待补；不得让内容缺失反向改变排名。

## 11. 首批内容生产建议

先为 8 个差异明显且已有审计关注的城市建立样板：Beijing、Shanghai、London、Vancouver、Singapore、Riyadh、Lhasa、Kyoto。通过事实复核、文案差异和媒体许可流程后，再批量扩展到 100 城；本文件本轮不填充城市事实。
