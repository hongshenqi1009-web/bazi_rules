# 山河有应 MVP 应用

这是 T-009 的真实链路发布候选。当前已打通：

`首页 → 两步输入 → 真实状态驱动推演 → 五行结果 → Top 3 → 城市详情 → 分享预览/下载`

## 当前数据边界

- 默认模式连接`service/`，使用真实标准地点、服务端四柱与解释、R2 个人需要、锁定 100 城和真实匹配排序；
- 浏览器端没有 BaZi、City 或 Matching 算法，不会在接口失败时切换样板；
- 只有显式打开`/?demo=1`时才加载`src/data/demo-fixture.js`，页面会显示结构演示标记；
- 首批 8 城拥有已审核 City Profile；无 Profile 或 AI 服务失败时，核心结果保留、详情明确显示暂不可用；
- 已接入正式 Logo SVG 和首批 8 城从零生成的城市意象候选图；它们可用于受控发布候选构建，但公开发布前仍需产品方逐张确认、裁切压缩和适用条款复核；
- 分享卡二维码使用服务端注入的公开入口，不含出生资料或本次结果参数。

## 本地运行

需要 Node.js 20 或更高版本与 pnpm：

```text
cd service
pnpm install --frozen-lockfile
pnpm start
```

打开`http://127.0.0.1:4173`。显式结构演示入口为`http://127.0.0.1:4173/?demo=1`。

## 测试

```text
cd service
pnpm test

cd ../app
pnpm test
```

服务测试覆盖时区/DST、四柱、23:00 换日、子时双候选、AI 输入脱敏与失败隔离、地点搜索、8 城来源边界和真实全链。前端测试覆盖输入合同、Top 3 顺序和分享卡出生数据隔离。

## 生产配置

复制`service/.env.example`中的字段到部署平台的密钥/环境变量设置。正式生产固定使用`DEPLOYMENT_CHANNEL=production`与`PUBLIC_APP_URL=https://mydestinycity.com/`；受控预发布使用`staging`通道与`https://staging.mydestinycity.com/`。AI 内容还需服务端`OPENAI_API_KEY`和`OPENAI_CONTENT_MODEL`。不要把`.env`提交到仓库。

完整数据流、失败隔离、隐私政策、容器入口和香港部署方案见`product/t009_release_and_privacy.md`。

## 目录

- `index.html`：应用入口；
- `privacy.html`：提交前所链接的出生数据与分享隐私说明；
- `styles.css`：Design System token 和移动端组件；
- `src/app.js`：页面状态机与交互；
- `src/data/demo-fixture.js`：只供显式 demo 模式使用的结构样板；
- `src/domain/validators.js`：输入与请求合同；
- `src/domain/share-card.js`：隐私安全的 SVG 分享预览与真实二维码；
- `src/services/reading-service.js`：默认真实 API 适配器及显式 demo 适配器；
- `tests/`：零依赖 Node 测试。
