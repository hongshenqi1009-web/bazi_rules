# 山河有应 T-009 服务

这个 Node 服务把 T-008 移动端页面连接到真实的确定性计算、解释、R2 个人需要、100 城匹配、首批 City Profile、AI 城市文案和分享二维码。

## 边界

- 所有命理和匹配计算都在服务端；浏览器只渲染返回值。
- 真实请求失败不会回退 demo。
- 原始出生输入不落盘；派生结果在进程内存保留 15 分钟。
- AI 不接收出生日期、时间、地点、性别或四柱，失败不会影响核心结果。
- `service/data/locations.json`由 GeoNames `cities15000`生成，适用 CC BY 4.0。

## 本地启动

```text
pnpm install --frozen-lockfile
pnpm start
```

默认同时提供`http://127.0.0.1:4173/`页面和同源 API。环境变量见`.env.example`；本服务不会自动读取本地`.env`，应由开发环境或部署平台注入。正式生产只接受`https://mydestinycity.com/`，受控 staging 只接受`https://staging.mydestinycity.com/`；HTTPS、DNS 和`www`跳转见`deploy/README.md`。

## API

- `GET /healthz`
- `GET /api/locations?q=伦敦&limit=8`
- `POST /api/readings`
- `GET /api/readings/:result_id`
- `POST /api/readings/:result_id/cities/:city_id/content/retry`
- `GET /api/share/qr.svg?url=<configured-public-url>`

传输字段以`product/frontend_interface_contract.md`为准。

## 重建地点索引

使用经过来源核验的 GeoNames `cities15000.txt`与`admin1CodesASCII.txt`：

```text
pnpm build:locations -- --cities=<path> --admin=<path> --output=data/locations.json
```

生成结果保存源文件 SHA-256、生成日期、记录数、来源和许可。不要用在线地点服务在每次输入时传出用户出生地点。

## 测试

```text
pnpm test
```

生产部署、隐私数据流和发布闸门见`product/t009_release_and_privacy.md`。
