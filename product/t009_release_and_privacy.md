# T-009 真实服务、隐私与部署方案

- 状态：实现完成，发布条件待补
- 最后更新：2026-09-15
- 适用范围：山河有应免费娱乐传播版 MVP

## 1. 真实服务编排

浏览器只负责收集输入、展示服务端状态和渲染结果。以下计算全部位于 `service/`：

```text
标准地点 ID
  → 本地民用时间 / IANA 时区解析
  → BaZi Engine（lunar-javascript 1.7.7 封装）
  → Interpretation Engine（三轨解释候选）
  → Personal Need Engine（R2 preferred exposure）
  → City Matching Engine（锁定 100 城）
  → Top 3 + 契合指数 + 完整版本链
  → City Profile 约束下的 AI 文案（可独立失败）
```

前端不保存算法常量，不计算四柱、个人需要、城市向量、契合指数或排序。`?demo=1` 只供明确的本地结构演示；真实模式不会自动或静默切换到 demo。

地点索引从 GeoNames `cities15000` 2026-09-09 快照构建，共 34,135 条。服务端按标准 ID 重新取得 IANA 时区和经纬度，不信任客户端回传的隐藏字段。索引支持中文/英文名称、国家与一级行政区消歧；无结果、失效 ID、DST 缺口和时区解析失败均返回明确错误。

## 2. 失败隔离

- BaZi、解释或匹配失败：整次核心计算失败，用户看到可重试提示；不得返回固定结果。
- AI 文案超时、上游错误、结构校验失败或尚无已发布 City Profile：Top 3、契合指数、五行画像和标签照常展示；详情显示“详细解读暂时不可用，可稍后重试”。
- AI 重试只重做该城市内容，不重新排盘或改变排名。
- 结果过期：返回 `READING_EXPIRED`，引导重新开始；不伪造恢复结果。
- 分享二维码只接受服务端配置的公开入口，不能让请求方注入任意 URL。

## 3. 出生数据流与保留

### 浏览器

- 收集：出生日期、时间/时辰、标准地点 ID、用于排运的性别。
- 当前页内存中保留到用户刷新、关闭页面或重新开始；不写入 Cookie、`localStorage`、`sessionStorage` 或分析事件。
- 不要求账户，不建立长期用户画像。

### 应用服务

- 原始输入仅在一次请求的内存闭包中用于地点解析和计算；不写数据库、文件或应用日志。
- 内存记录只保存派生结果和内部审计链，不保存原始出生输入。
- 派生结果默认保留 15 分钟，之后从进程内存删除；服务重启会提前清除。
- 如部署层保留访问日志，只允许方法、路由模板、状态码、耗时和随机 trace ID；禁止请求体、查询中的出生值、完整 IP 或结果内容。

### AI 内容服务

- 只发送展示级五行类型、主次元素、五档关系、置信度、城市向量、匹配理由及已审核 City Profile 事实。
- 不发送出生日期、时间、地点、性别、四柱或结果 ID。
- Responses API 请求显式设置 `store:false` 与 `background:false`；应用不保存 AI 输入/输出。上游服务自身的数据控制仍以账户设置和服务条款为准，发布前应确认组织的数据保留配置。

### 分享

- 分享卡不含出生资料、四柱、置信度、版本链或结果 ID。
- 二维码只含 `PUBLIC_APP_URL`，不含个人参数或结果 token。

上述实现遵循“明确目的、最小必要、最短必要期限”的产品原则。正式公开前仍应由适用法域的专业人员审核隐私文本；本文件不构成法律意见。

## 4. 首批 City Profile 发布边界

`data/city_profiles_mvp.json` 首批发布 London、Vancouver、Tokyo、Singapore、New York、Barcelona、Shanghai、Kyoto 共 8 城。每条 Profile 保存：

- 核心气质标签；
- 具体地理、气候和城市生活事实；
- 辅助领域标签；
- 来源 URL、发布者、访问日期、许可或使用边界、置信度；
- 媒体状态。

Profile 不含匹配权重，也不修改城市向量、分数或排名。当前事实文本允许摘要和事实性转述；原网页图片没有随数据进入仓库。`facts_reviewed_media_candidate` 表示文字事实已审，并已绑定从零生成的城市意象候选图；生成图不是纪实摄影或事实证据，仍须在公开发布前完成品牌方与适用条款验收。

## 5. AI 内容约束

AI 必须按 JSON Schema 返回三个段落：

1. `feature`：城市特色，只能重组 Profile 中的核验事实；
2. `why`：为什么契合，解释五行组合和匹配理由，不生硬直译；
3. `feeling`：它会带来的感受，把城市气息与用户已有优势连接，不作宿命或成功承诺。

任何无法通过结构校验的输出都视为不可用，不展示半成品。AI 不参与排盘、分数和排序。

## 6. 境内外可访问部署方案

### 当前推荐：香港单区单体发布

- 注册并绑定独立 `.com` 域名；DNS 不依赖只在单一区域稳定的前端脚本服务。
- 在香港区域运行一个容器化 Node 服务，同时提供静态前端、地点检索和计算 API，避免跨域与多服务网络依赖。
- 使用香港负载均衡或反向代理终止 HTTPS；源站只开放服务端口给代理。
- Logo、字体、二维码代码和正式城市图片全部自托管；首屏不依赖 Google Fonts、公共 JS CDN 或境外图片热链。
- AI API 只由香港服务端调用；失败按第 2 节隔离，不能影响核心结果。
- 首发可不启用中国大陆 CDN。香港源站部署不等于保证所有大陆网络都同等低延迟，应在中国移动、联通、电信及海外线路做发布前实测。

### 大陆加速的后续路径

如果后续把服务器或 CDN 节点放在中国大陆，应先完成适用的 ICP 备案等手续；是否还需公安备案、跨境传输评估或其他合规动作，由域名主体、部署位置和实际数据流共同决定。未完成前不要把关键资源切到要求备案的大陆节点。

### 容器与配置

仓库根目录 `Dockerfile` 是单容器发布入口。生产环境至少注入：

```text
PUBLIC_APP_URL=https://你的.com/
OPENAI_API_KEY=服务端密钥
OPENAI_CONTENT_MODEL=经验证的模型 ID
READING_TTL_MINUTES=15
```

生产模式强制 `PUBLIC_APP_URL` 为 HTTPS；密钥不得进入镜像、仓库或浏览器。`/healthz` 暴露地点、城市、Profile 数量及 AI 是否配置，但不返回密钥。

## 7. 发布闸门

代码和本地真实链已经就绪，但公开发布必须同时满足：

- [ ] 确认 `.com` 正式域名并注入 `PUBLIC_APP_URL`；
- [ ] 选择香港云账号/区域并完成 HTTPS、备份、告警和限流；
- [ ] 注入可用 AI 模型与服务端密钥，跑一次真实上游内容验收；
- [x] 整理完整 Logo、简化 icon 与首批 8 城统一尺寸的上线候选图，记录生成方式、哈希和使用边界；
- [ ] 产品方逐张确认 8 城图，并完成压缩衍生、移动裁切、AI 素材披露/商用条款与最终公开构建审核；
- [ ] 在大陆三网与至少一个海外网络完成真机流程和二维码扫描；
- [ ] 完成适用法域的隐私、免责声明和第三方处理者审核；
- [ ] 确认 GeoNames 署名展示位置，并保留 8 城来源台账。

在上述条件补齐前，版本是“真实链路发布候选”，不是可公开上线版本。

## 8. 可重复验证

```text
cd service
pnpm test

cd ../app
pnpm test

docker build -t shanhe-youying:t009 .
docker run --rm -p 4173:4173 \
  -e PUBLIC_APP_URL=https://example.com/ \
  shanhe-youying:t009
```

浏览器回归基准为 390 × 844：中文地点查询、标准地点选择、完整计算、Top 3、无 AI 时的局部降级、分享卡和真实二维码均须通过。

## 9. 主要来源

- GeoNames 数据与许可：<https://www.geonames.org/export/>、<https://www.geonames.org/export/web-services.html>
- OpenAI Responses API：<https://developers.openai.com/api/reference/cli/resources/responses/methods/create>
- OpenAI API 数据控制：<https://developers.openai.com/api/docs/guides/your-data>
- 阿里云 ICP 备案要求：<https://www.alibabacloud.com/help/en/icp-filing/basic-icp-service/product-overview/icp-filing-requirements-for-a-regular-website>
- 阿里云 ECS 区域（含中国香港）：<https://www.alibabacloud.com/help/en/ecs/user-guide/regions-and-zones>
- 阿里云 CDN 加速区域：<https://www.alibabacloud.com/help/en/cdn/user-guide/change-the-accelerated-region>
- 中国《个人信息保护法》：<https://www.npc.gov.cn/npc/c2/c30834/202108/t20210820_313088.html>
- 香港个人资料私隐专员公署《私隐条例概览》：<https://www.pcpd.org.hk/english/data_privacy_law/ordinance_at_a_Glance/ordinance.html>
