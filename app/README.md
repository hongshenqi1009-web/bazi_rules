# 山河有应 MVP 应用

这是 T-008 的移动端纵向切片，不是正式上线版本。当前已打通：

`首页 → 两步输入 → 真实状态驱动推演 → 五行结果 → Top 3 → 城市详情 → 分享预览/下载`

## 当前数据边界

- 页面使用 `t008-demo-fixture-v0.1` 样板结果，界面持续显示“结构演示”；
- 样板城市 ID、时区和五行向量来自仓库锁定的 `data/cities.csv`；
- 契合指数、个人画像和 City Profile 文案只是用于打通结构的固定样板，未伪装为本次输入的正式计算；
- 浏览器端没有 BaZi、City 或 Matching 算法；正式服务需实现 `reading-service.js` 的异步阶段合同；
- 城市图与 Logo 是代码生成的品牌占位，不是最终授权素材；
- 分享卡可导出 SVG 预览，但二维码明确为不可扫描的结构占位。

## 本地运行

不需要安装依赖：

```powershell
cd app
node dev-server.mjs
```

打开 `http://127.0.0.1:4173`。

## 测试

```powershell
cd app
node --test
```

测试覆盖出生输入口径、子时分段、标准地点请求、推演阶段顺序、Top 3 稳定顺序、分享卡 3:4 尺寸和出生信息隔离。

## 接入正式服务

1. 实现与 `DemoReadingService.createReading(request, { onStage, signal })` 相同的适配器；
2. 使用 `product/frontend_interface_contract.md` 的请求、阶段、结果和错误字段；
3. 替换时保留 Demo adapter 作为 Storybook/离线回归 fixture，不在生产环境展示；
4. 服务端负责排盘、解释、R2 区间、匹配、排序、版本链和受控文案；
5. 前端只渲染，不得根据标签、城市素材或客户端逻辑重新排序。

## 目录

- `index.html`：应用入口；
- `styles.css`：Design System token 和移动端组件；
- `src/app.js`：页面状态机与交互；
- `src/data/demo-fixture.js`：明确标记的样板地点和结果；
- `src/domain/validators.js`：输入与请求合同；
- `src/domain/share-card.js`：隐私安全的 SVG 分享预览；
- `src/services/reading-service.js`：可替换的服务编排适配层；
- `tests/`：零依赖 Node 测试。
