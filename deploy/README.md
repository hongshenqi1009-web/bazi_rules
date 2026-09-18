# `mydestinycity.com` 香港部署与 DNS 清单

- 正式品牌：山河有应
- 正式主域名：`https://mydestinycity.com/`
- 唯一 canonical host：`mydestinycity.com`
- `www`策略：`https://www.mydestinycity.com/*`以 HTTP 308 永久跳转到`https://mydestinycity.com/*`，保留路径和查询参数
- 受控预发布：`https://staging.mydestinycity.com/`，必须启用访问控制；上线前二维码配置切回正式主域名
- 需所有者执行的控制台步骤及 DNS 精确字段：[`OWNER_ACTION_REQUIRED.md`](OWNER_ACTION_REQUIRED.md)。2026-09-18 的公网核验发现域名仍为 NXDOMAIN / 注册局 RDAP 404，先核对域名订单，再部署。

## 1. DNS 要求

在域名 DNS 控制台配置：

| 名称 | 类型 | 目标 | TTL | 说明 |
|---|---|---|---:|---|
| `@` | `A` | 生产香港入口实际公网 IPv4 | `600` | 根域名生产入口 |
| `www` | `CNAME` | `mydestinycity.com.` | `600` | 最终由 Caddy 308 到根域名 |
| `staging` | `A` | 独立 staging 香港入口实际公网 IPv4 | `600` | 受控测试入口 |

公网 IPv4 必须从云实例/负载均衡控制台复制，当前尚未取得，不能填虚构值。若实际有 IPv6，再单独添加正确的 AAAA；默认不加。DNS challenge/CAA 仅在确定证书方案后添加。

注意：

- 根域名不能使用普通 CNAME，除非 DNS 服务商明确支持 ALIAS/ANAME/CNAME flattening；
- TTL 先设 600 秒（兼容阿里云免费 DNS 最小值），稳定 24–48 小时后可调到 3600 秒；
- 删除与新入口冲突的旧 A/AAAA/CNAME 记录，尤其避免无效 AAAA 导致部分网络访问失败；
- TLS 证书必须同时覆盖`mydestinycity.com`和`www.mydestinycity.com`；staging 使用独立证书；
- 建议开启 DNSSEC，但应在权威 DNS 稳定后操作并核对 DS 记录；
- DNS 只负责解析，不等同于 HTTPS 或跳转。跳转由`deploy/Caddyfile`与应用防线共同完成。

## 2. 香港环境拓扑

最小生产拓扑：

`DNS → 香港公网入口/Caddy:443 → app:4173`

现有 production 和 staging Compose 都绑定宿主机 80/443；若两环境同时存在，应部署在**独立香港实例**或改用经审查的统一反向代理。不能在同一实例原样同时启动并称为环境隔离。

- 只向公网开放 80/443；4173 仅容器网络可见；
- Caddy 自动申请与续期证书，将 HTTP 升级为 HTTPS，并把`www`永久跳转到根域名；
- Node 服务保留第二层 canonical 检查，并在生产响应发送 HSTS；
- 静态前端、地点检索、计算 API、城市图片与二维码同源，避免关键跨域依赖；
- AI 密钥只通过服务端环境变量注入，不进入镜像、浏览器或 Git。

生产启动：

```text
cd deploy
docker compose -f docker-compose.production.yml up -d --build
```

部署环境必须提供：

```text
OPENAI_API_KEY=...
OPENAI_CONTENT_MODEL=...
```

`PUBLIC_APP_URL`已在生产 Compose 固定为`https://mydestinycity.com/`；代码也会再次校验。二维码由这一值生成，不读取浏览器 Host，也不携带出生资料或结果 token。

## 3. 受控 staging

若正式入口尚未开放，先将`staging` DNS 指向测试服务器，并配置：

```text
STAGING_USER=reviewer
STAGING_PASSWORD_HASH=<Caddy 支持的密码哈希>
OPENAI_API_KEY=...
OPENAI_CONTENT_MODEL=...
```

再运行：

```text
cd deploy
docker compose -f docker-compose.staging.yml up -d --build
```

staging 二维码将指向`https://staging.mydestinycity.com/`。正式上线前必须改用 production Compose 并重新验证二维码目标为`https://mydestinycity.com/`。不要把临时云厂商 URL、IP 地址或本机地址写进前端、分享卡或生产环境变量。

## 4. 网站元信息

`app/index.html`已设置：

- canonical：`https://mydestinycity.com/`；
- Open Graph 的站点名、标题、说明、正式 URL 和预览图；
- Twitter/X large image card；
- 中文品牌名“山河有应”；
- SVG favicon；
- 页面主品牌不使用“My Destiny City”。

当前 OG 图为 1200 × 630、自托管的上海城市意象 JPEG 衍生图 `app/assets/brand/og-city.jpg`。部署后仍须用微信、iMessage、X/Facebook 调试器验证缓存、裁切和可公开抓取；这不改变 canonical 或二维码目标。

## 5. 上线验收

部署后逐项验证：

1. `http://mydestinycity.com/*` → `https://mydestinycity.com/*`；
2. `https://www.mydestinycity.com/*` → 308 到根域名并保留路径/查询；
3. 证书域名、有效期、自动续期和完整链正常；
4. 首页 canonical、OG URL 均为正式主域名；
5. 分享二维码扫码后只到正式主域名；
6. `/healthz`正常，4173 不直接暴露公网；
7. 中国移动/联通/电信及至少一个海外网络完成真机流程；
8. 发布前清除 staging 分享卡和二维码缓存，避免旧入口继续传播。

自动核验：在有公网连接的部署/验收终端执行 `node deploy/verify-production.mjs --full-chain`。它会逐项输出 PASS/FAIL；本地配置测试不能替代公网结果。生产 AI 可在已注入密钥的容器中执行 `docker compose -f deploy/docker-compose.production.yml exec app node service/scripts/smoke-ai.mjs`，逐城记录真实输出和 token。无密钥时脚本会明确退出，不制造成功结果。
