# City Profile MVP 来源与媒体边界

- 数据文件：`data/city_profiles_mvp.json`
- Profile 版本：`city-profile-mvp-v0.2`
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

8 城当前统一为 `facts_reviewed_media_candidate`。仓库已加入 8 张从零生成的 1536 × 1024 城市意象母版；没有使用来源网页的照片或地图。每张图均记录生成方式、地标、替代文本、裁切焦点和 SHA-256，详见 `design/assets/README.md`。

这些图属于上线候选插图，不是纪实摄影，也不作为 City Profile 事实证据。公开发布前仍须逐张完成产品方城市识别与品牌确认、移动端/分享卡裁切 QA，以及适用平台 AI 素材披露和商用条款复核。任何未确认来源的外部图片仍不得进入公开构建。

完整逐城来源、事实、许可边界与置信度以 `data/city_profiles_mvp.json` 为准。
