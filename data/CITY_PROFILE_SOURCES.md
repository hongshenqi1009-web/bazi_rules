# City Profile MVP 来源与媒体边界

- 数据文件：`data/city_profiles_mvp.json`
- Profile 版本：`city-profile-mvp-v0.1`
- 首批范围：London、Vancouver、Tokyo、Singapore、New York、Barcelona、Shanghai、Kyoto
- 事实审核日：2026-09-15

## 发布边界

- JSON 中的事实均为对官方政府、气象或公共机构资料的简短事实性转述；没有复制网页长段落。
- 每条事实通过 `source_ids` 指回来源，来源记录含 URL、发布者、访问日、许可或允许用途说明。
- `source_summary_only` 表示只允许依据来源作事实摘要与引用，不把原文、版式、照片、地图或 Logo 打包进产品。
- 原网页中的城市照片、插图和 Logo **不在**本轮授权范围，也未下载或进入仓库。
- GeoNames 地点索引适用 CC BY 4.0；公开页须提供 GeoNames 署名与许可链接。
- City Profile 只约束解释事实，不进入 City Engine 或 Matching Engine 的任何分数。

## 媒体状态

8 城当前统一为 `facts_reviewed_media_missing`。开发环境可以继续显示明确标记的品牌占位图；公开构建前必须用有明确商业使用权、署名要求和裁剪许可的正式城市图片替换，并在资产清单记录来源。

完整逐城来源、事实、许可边界与置信度以 `data/city_profiles_mvp.json` 为准。
