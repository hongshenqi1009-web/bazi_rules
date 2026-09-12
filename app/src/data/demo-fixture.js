export const DEMO_META = Object.freeze({
  isDemo: true,
  label: "结构演示",
  notice: "当前使用 T-008 样板结果，尚未接入正式命理计算与城市内容服务。",
  version: "t008-demo-fixture-v0.1"
});

export const SHICHEN = Object.freeze([
  { id: "zi", label: "子", range: "23:00–00:59" },
  { id: "chou", label: "丑", range: "01:00–02:59" },
  { id: "yin", label: "寅", range: "03:00–04:59" },
  { id: "mao", label: "卯", range: "05:00–06:59" },
  { id: "chen", label: "辰", range: "07:00–08:59" },
  { id: "si", label: "巳", range: "09:00–10:59" },
  { id: "wu", label: "午", range: "11:00–12:59" },
  { id: "wei", label: "未", range: "13:00–14:59" },
  { id: "shen", label: "申", range: "15:00–16:59" },
  { id: "you", label: "酉", range: "17:00–18:59" },
  { id: "xu", label: "戌", range: "19:00–20:59" },
  { id: "hai", label: "亥", range: "21:00–22:59" }
]);

export const LOCATIONS = Object.freeze([
  { id: "1816670", zh: "北京", en: "Beijing", region: "北京", country: "中国", timezone: "Asia/Shanghai", lat: 39.9075, lon: 116.39723 },
  { id: "1796236", zh: "上海", en: "Shanghai", region: "上海", country: "中国", timezone: "Asia/Shanghai", lat: 31.22222, lon: 121.45806 },
  { id: "1797929", zh: "青岛", en: "Qingdao", region: "山东", country: "中国", timezone: "Asia/Shanghai", lat: 36.06488, lon: 120.38042 },
  { id: "1280737", zh: "拉萨", en: "Lhasa", region: "西藏", country: "中国", timezone: "Asia/Shanghai", lat: 29.65, lon: 91.1 },
  { id: "2643743", zh: "伦敦", en: "London", region: "England", country: "英国", timezone: "Europe/London", lat: 51.50853, lon: -0.12574 },
  { id: "6173331", zh: "温哥华", en: "Vancouver", region: "British Columbia", country: "加拿大", timezone: "America/Vancouver", lat: 49.24966, lon: -123.11934 },
  { id: "1857910", zh: "京都", en: "Kyoto", region: "京都府", country: "日本", timezone: "Asia/Tokyo", lat: 35.02107, lon: 135.75385 },
  { id: "1880252", zh: "新加坡", en: "Singapore", region: "Singapore", country: "新加坡", timezone: "Asia/Singapore", lat: 1.28967, lon: 103.85007 }
]);

export const DEMO_RESULT = Object.freeze({
  resultId: "t008-demo-result",
  source: DEMO_META.version,
  personalProfile: {
    typeName: "木水相生型",
    strengthSummary: "木偏强 · 水次之 · 土平衡 · 金较弱",
    oneLineReading: "木水相承，气质柔韧而流动。",
    visualLevels: { wood: 5, fire: 2, earth: 3, metal: 1, water: 4 },
    confidence: { level: "sample", displayHint: "此页为结构样板，不代表本次输入的正式命理判断。" }
  },
  desiredCityEnergy: {
    paragraphs: [
      "你更容易与水木相承、气息流动的城市产生共振。",
      "这类环境往往更舒展，也更有生长感，像是让人的状态自然展开。",
      "相比之下，过于燥烈、沉重或封闭的城市气息，可能没那么贴合你。"
    ],
    visualLevels: { wood: 5, fire: 1, earth: 2, metal: 2, water: 5 }
  },
  rankedCities: [
    {
      rank: 1,
      id: "6173331",
      zh: "温哥华",
      en: "Vancouver",
      index: 91,
      tier: "top",
      veryClose: false,
      tags: ["山海相拥", "森林舒展", "开放流动"],
      scene: "vancouver",
      vector: [27, 9, 15, 18, 31],
      feature: "这座太平洋沿岸城市以海湾、山地与常绿景观相接，气候湿润，公园与滨水空间深入日常。此段为待事实复核的内容样板。",
      why: "水的流动与木的舒展在这里彼此托举，既回应柔韧生长的需要，也保留适度的金土结构，让整体不是单一能量的堆叠。",
      feeling: "在山海与林木不断打开视野的生活里，你原本细腻、能适应变化的一面，更容易找到从容的展开方式。它不会替你决定方向，却可能让行动与感受之间多一点自然的余地。",
      shareLine: "温哥华以水的流动与木的生长，回应你本就柔韧而向外延展的能量。"
    },
    {
      rank: 2,
      id: "2643743",
      zh: "伦敦",
      en: "London",
      index: 89,
      tier: "top",
      veryClose: false,
      tags: ["河流穿城", "文化丰盈", "公园日常"],
      scene: "london",
      vector: [28, 9, 16, 18, 29],
      feature: "泰晤士河穿过城市，海洋性气候、阴云细雨与大量公园构成温润底色；高密度文化生活又让流动感持续发生。此段为待事实复核的内容样板。",
      why: "木水并行的城市气息，回应你对生长与流动的双重需要；较清晰的城市结构又让这种开放不至于散漫，形成柔软而有边界的平衡。",
      feeling: "当公园、河岸与文化街区交替出现，你擅长感受细节、连接不同事物的能力，可能更自然地被带出来。城市节奏不总轻缓，却为这种敏锐留下了许多可以落脚的层次。",
      shareLine: "伦敦以河流与层叠的文化气息，回应你在变化中仍能持续生长的能量。"
    },
    {
      rank: 3,
      id: "1857910",
      zh: "京都",
      en: "Kyoto",
      index: 87,
      tier: "strong",
      veryClose: false,
      tags: ["山城层叠", "四季细腻", "历史沉静"],
      scene: "kyoto",
      vector: [28, 8, 19, 17, 28],
      feature: "群山环绕的盆地、河流与鲜明四季，让自然变化和城市日常保持细密联系；历史街区与文化空间带来沉静层次。此段为待事实复核的内容样板。",
      why: "木水的柔和流转在山地与河流之间展开，土的承载又让这种流动有了停驻之处，与你需要的舒展和稳定形成较温柔的组合。",
      feeling: "在季节、街巷与山色缓慢转换的节奏中，你本来就有的耐心与感受力，更容易从细节里长出清晰。这里不是催促答案的地方，而像给持续积累留下一段安静空间。",
      shareLine: "京都以山水与四季的细腻层次，回应你柔韧、沉静而持续生长的能量。"
    }
  ],
  disclaimer: "契合指数是娱乐型模型指数，不代表概率，也不构成现实决策建议。",
  versions: {
    baziEngine: "not-connected",
    interpretationEngine: "not-connected",
    personalNeed: "personal-need-v0.1-candidate",
    preferredExposure: "preferred-exposure-r2-balanced-candidate",
    cityEngine: "city-elements-v0.2.1-scheme-c-candidate",
    matchingEngine: "not-connected",
    cityProfile: "t008-demo-profile-v0.1",
    contentTemplate: "mvp-city-copy-v0.1"
  }
});
