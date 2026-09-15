# T-009 正式视觉资产清单

- 版本：`visual-assets-t009-v0.1-candidate`
- 生成日期：2026-09-15
- 状态：上线候选；需在最终域名环境完成裁切、压缩、真机与品牌方验收
- 适用：免费娱乐传播版 MVP 的首批 8 城详情页、分享卡预览和品牌标识

## 1. 资产路线

旧效果图只作为 art direction；当前工作区尚未取得旧图原文件，因此 `design/references/` 保留归档位和逐类说明，不把聊天预览截图伪装成已归档源文件。

首批城市主图是依据已经确认的视觉方向从零生成的原创候选图，不使用外部照片、截图或未确认来源素材。它们不是新闻或纪实摄影，页面不得把图像本身当作城市事实证据；地理和城市事实仍只来自 City Profile 的已审核来源。

## 2. 统一交付规格

- 母版：PNG，1536 × 1024，3:2，sRGB；
- 构图：地标和城市识别区保持在中央约 70%，四边留裁切安全区；
- 使用：详情页优先以 3:2 / 4:3 裁切，分享卡可从同一母版生成竖向视窗；
- 品牌：城市约 70%，品牌氛围约 30%；图内不嵌字、不嵌 Logo、不嵌二维码；
- 调性：墨绿、近黑、克制暗金；雾感和碎闪轻量；
- 禁止：复杂星轨、密集小字、夸张金色、虚构地标拼贴、不可能地理、赛博霓虹；
- 叠加：Logo、标题、指数、标签、暗角与无障碍文本由前端统一完成。

## 3. 文件与审计

| 城市 | 文件 | 识别锚点 | SHA-256 |
|---|---|---|---|
| London | `app/assets/cities/london-hero.png` | Thames、Tower Bridge、伦敦天际线 | `a50eae066221cc91dbafefa78366fd935aa05fa3f29b5ae6707595e2c8a9f483` |
| Vancouver | `app/assets/cities/vancouver-hero.png` | Burrard Inlet、downtown、North Shore Mountains | `b389ee3c81d910528ec4fe8d4f8c0ecccaef633cea51e9f92190ab6c673cfc9f` |
| Tokyo | `app/assets/cities/tokyo-hero.png` | Tokyo Tower、城市天际线、湾岸层次 | `66c0b940847952298c8289c328e4eb2fe41331367bb93b55df61fa7ebff2b42d` |
| Singapore | `app/assets/cities/singapore-hero.png` | Marina Bay、Marina Bay Sands、热带绿意 | `52dd9192927c8176fdf459f24dcc88264cc12298b701fc1c20694178bfb091c0` |
| New York | `app/assets/cities/new-york-hero.png` | Brooklyn Bridge、Lower Manhattan、East River | `0bfa2ed08879032beee6503b0df1ad61919ecb2e71c871986ba74cd27ebdbc9f` |
| Barcelona | `app/assets/cities/barcelona-hero.png` | Sagrada Família、Eixample、地中海城市层次 | `b963bdbfeb9784fa76454f65e7ff657c763c5aa46591d587a92d83f9fc3b90dd` |
| Shanghai | `app/assets/cities/shanghai-hero.png` | Huangpu、Bund、Pudong 天际线 | `e1a64f6264ffd6e9aaeb4195a3bcaefe203309afe4e6c79fc7f82154b4a1e13e` |
| Kyoto | `app/assets/cities/kyoto-hero.png` | Yasaka Pagoda、Higashiyama 屋顶与山地 | `f74ec43af63bbba1d0da8c4aa98355df1b2abbf800808a6164e717cfd0e94a9f` |

生成方式：OpenAI 图像生成工具，text-to-image；未提供或引用外部输入图。使用受适用的 OpenAI 条款约束。所有 8 张文件均带生成来源元数据，仍须在公开发布前完成产品方最终品牌、地标与法律检查。

## 4. Logo

- `app/assets/brand/logo-full.svg`：完整横向 Logo；
- `app/assets/brand/logo-symbol.svg`：圆形山水星轨简化 icon；
- 两者由项目既有内联标记按已确认方向整理为可复用 SVG，没有引入外部字体文件或第三方图形素材；
- 透明底，暗金线；中文文字保留系统字体回退，发布时如需跨平台绝对一致，应在确认字体许可后转曲。

## 5. 发布闸门

当前资产可以进入受控发布候选构建，但不把“AI 生成”描述成“授权摄影作品”。正式公开前仍需：

1. 产品方逐张确认城市识别与品牌风格；
2. 验证 390 × 844、430 × 932 和分享卡裁切；
3. 输出经过压缩的 WebP/AVIF 衍生版本并保留 PNG 母版；
4. 复核适用平台的 AI 素材披露与商用条款；
5. 对地标形态存在疑问的图重新生成，不做局部“修成事实”的手工伪造。
