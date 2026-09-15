import { DEMO_META, SHICHEN } from "./data/demo-fixture.js";
import { buildInputSummary, createReadingRequest, validateBirthStep, validatePlaceStep } from "./domain/validators.js";
import { downloadShareCard } from "./domain/share-card.js";
import { readingService } from "./services/reading-service.js";

const root = document.querySelector("#app");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const state = {
  screen: "home",
  birth: {
    date: "",
    timeMode: null,
    exactTime: "",
    shichenId: null,
    ziSegment: null
  },
  locationQuery: "",
  location: null,
  locationResults: [],
  locationLoading: false,
  locationError: null,
  sex: null,
  errors: {},
  loadingStage: null,
  reading: null,
  selectedCity: null,
  fatalError: null,
  contentRetrying: false
};

let locationSearchTimer = null;
let locationSearchController = null;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function brandMark({ compact = false } = {}) {
  return `
    <span class="brand-lockup ${compact ? "is-compact" : ""}">
      <svg class="brand-symbol" viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="31" fill="none" stroke="currentColor" stroke-width="1" opacity=".72" />
        <path d="M12 44c9-2 13-18 22-18 8 0 10 12 17 12 4 0 6-3 9-6" fill="none" stroke="currentColor" stroke-width="1.4" />
        <path d="M14 49c10-5 18 1 26-3 7-3 11-9 19-7" fill="none" stroke="currentColor" stroke-width="1" opacity=".8" />
        <path d="M20 47 34 28l7 10 6-7 9 13" fill="none" stroke="currentColor" stroke-width="1" opacity=".72" />
        <circle cx="52" cy="19" r="1.8" fill="currentColor" />
        <path d="M47 19h10M52 14v10" stroke="currentColor" stroke-width=".7" opacity=".8" />
      </svg>
      <span class="brand-wordmark">山河有应</span>
    </span>`;
}

function demoBanner() {
  return readingService.isDemo
    ? `<div class="demo-banner" role="note"><span>${DEMO_META.label}</span>${DEMO_META.notice}</div>`
    : "";
}

function pageShell(content, { backAction = null, className = "" } = {}) {
  return `
    <div class="app-shell ${className}">
      ${demoBanner()}
      <header class="app-header">
        ${backAction ? `<button class="icon-button" type="button" data-action="${backAction}" aria-label="返回上一页">←</button>` : "<span></span>"}
        ${brandMark({ compact: true })}
        <span class="header-balance" aria-hidden="true"></span>
      </header>
      <main id="app-main" class="page-main" tabindex="-1">${content}</main>
    </div>`;
}

function cosmosDisc() {
  return `
    <div class="cosmos-disc" aria-hidden="true">
      <span class="orbit orbit-a"></span>
      <span class="orbit orbit-b"></span>
      <span class="orbit orbit-c"></span>
      <span class="map-veil map-a"></span>
      <span class="map-veil map-b"></span>
      <span class="spark spark-a"></span>
      <span class="spark spark-b"></span>
      <span class="spark spark-c"></span>
      <span class="element-glyph glyph-wood">木</span>
      <span class="element-glyph glyph-fire">火</span>
      <span class="element-glyph glyph-earth">土</span>
      <span class="element-glyph glyph-metal">金</span>
      <span class="element-glyph glyph-water">水</span>
      <span class="disc-center">应</span>
    </div>`;
}

function energyDisc(levels, { subtle = false } = {}) {
  const entries = [
    ["wood", "木"],
    ["fire", "火"],
    ["earth", "土"],
    ["metal", "金"],
    ["water", "水"]
  ];
  const summary = entries.map(([key, label]) => `${label}${levels[key]}级`).join("，");
  return `
    <div class="energy-disc ${subtle ? "is-subtle" : ""}" role="img" aria-label="五行相对层级：${summary}">
      <span class="energy-ring ring-one"></span>
      <span class="energy-ring ring-two"></span>
      ${entries.map(([key, label], index) => `
        <span class="energy-node node-${key}" style="--node-angle:${index * 72 - 90}deg; --node-counter:${90 - index * 72}deg; --node-scale:${0.78 + levels[key] * 0.08}; --node-opacity:${0.45 + levels[key] * 0.1}">
          <span>${label}</span>
        </span>`).join("")}
      <span class="energy-core">${subtle ? "城" : "命"}</span>
    </div>`;
}

function renderHome() {
  return `
    <div class="home-screen">
      <div class="home-brand">${brandMark()}</div>
      <section class="hero-copy">
        <p class="eyebrow">出生轨迹 · 山河回应</p>
        <h1>找到与你能量<br />最契合的城市</h1>
        <p class="hero-subtitle">循着你的出生轨迹，寻找命盘所回应的城市。</p>
      </section>
      ${cosmosDisc()}
      <button class="primary-button hero-button" type="button" data-action="start">开始探索<span aria-hidden="true">↗</span></button>
      <button class="text-button disclosure-trigger" type="button" data-action="toggle-disclaimer" aria-expanded="false">了解体验说明</button>
      <div class="home-disclaimer" hidden>
        本体验以传统五行文化与现代城市数据进行娱乐化表达，仅供探索与分享。
      </div>
    </div>`;
}

function stepIndicator(active) {
  return `
    <div class="step-indicator" aria-label="输入进度：第 ${active} 步，共 2 步">
      <span class="${active >= 1 ? "active" : ""}"></span>
      <span class="${active >= 2 ? "active" : ""}"></span>
      <small>0${active} / 02</small>
    </div>`;
}

function fieldError(name) {
  return state.errors[name] ? `<p class="field-error" role="alert">${escapeHtml(state.errors[name])}</p>` : "";
}

function renderBirthStep() {
  const shichenMode = state.birth.timeMode !== "exact";
  const ziSelected = state.birth.timeMode === "shichen" && state.birth.shichenId === "zi";
  return pageShell(`
    ${stepIndicator(1)}
    <section class="form-intro">
      <p class="eyebrow">第一步</p>
      <h1>从出生的时刻开始</h1>
      <p>日期与时辰会帮助我们辨识这段轨迹的起点。</p>
    </section>
    <section class="form-section">
      <label class="field-label" for="birth-date">出生日期</label>
      <input class="date-input" id="birth-date" data-input="birth-date" type="date" min="1800-01-01" max="${new Date().toISOString().slice(0, 10)}" value="${escapeHtml(state.birth.date)}" />
      ${fieldError("date")}
    </section>
    <section class="form-section time-section">
      <div class="field-heading">
        <span class="field-label">出生时辰</span>
        <button class="text-button" type="button" data-action="${shichenMode ? "use-exact-time" : "use-shichen"}">${shichenMode ? "我知道精确时间" : "返回十二时辰"}</button>
      </div>
      ${shichenMode ? renderShichenWheel() : `
        <div class="exact-time-card">
          <label for="exact-time">精确出生时间</label>
          <input id="exact-time" data-input="exact-time" type="time" value="${escapeHtml(state.birth.exactTime)}" />
          <p>使用出生地当时的当地民用时间。</p>
        </div>`}
      ${fieldError("time")}
      ${ziSelected ? renderZiSegment() : ""}
    </section>
    <div class="sticky-action">
      <button class="primary-button" type="button" data-action="birth-next">继续<span aria-hidden="true">→</span></button>
    </div>
  `, { backAction: "back-home", className: "form-page" });
}

function renderShichenWheel() {
  return `
    <div class="shichen-wrap">
      <div class="shichen-wheel" role="group" aria-label="选择十二时辰">
        <span class="wheel-ring"></span>
        <span class="wheel-ring inner"></span>
        <span class="wheel-center">${state.birth.shichenId ? `${SHICHEN.find((item) => item.id === state.birth.shichenId)?.label || ""}时` : "时"}<small>${state.birth.shichenId ? SHICHEN.find((item) => item.id === state.birth.shichenId)?.range : "十二时辰"}</small></span>
        ${SHICHEN.map((item, index) => `
          <button
            class="shichen-node ${state.birth.timeMode === "shichen" && state.birth.shichenId === item.id ? "is-selected" : ""}"
            type="button"
            style="--angle:${index * 30}deg; --counter:${index * -30}deg"
            data-action="select-shichen"
            data-shichen="${item.id}"
            aria-pressed="${state.birth.timeMode === "shichen" && state.birth.shichenId === item.id}">
            <span>${item.label}</span><small>${item.range.slice(0, 5)}</small>
          </button>`).join("")}
      </div>
      <button class="uncertain-button ${state.birth.timeMode === "unknown" ? "is-selected" : ""}" type="button" data-action="time-unknown" aria-pressed="${state.birth.timeMode === "unknown"}">时辰不确定</button>
      <p class="helper-text">会影响时柱及部分五行判断，但仍可生成简化结果。</p>
    </div>`;
}

function renderZiSegment() {
  const items = [
    ["late_23", "23:00–23:59", "晚上 11 点后"],
    ["early_00", "00:00–00:59", "凌晨 0 点后"],
    ["unknown", "不确定", "将保留两种候选理解"]
  ];
  return `
    <fieldset class="zi-segment">
      <legend>子时跨越日界，请再确认</legend>
      ${items.map(([id, title, note]) => `
        <label class="radio-card ${state.birth.ziSegment === id ? "is-selected" : ""}">
          <input type="radio" name="zi-segment" value="${id}" data-input="zi-segment" ${state.birth.ziSegment === id ? "checked" : ""} />
          <span><strong>${title}</strong><small>${note}</small></span>
        </label>`).join("")}
      ${fieldError("ziSegment")}
    </fieldset>`;
}

function locationResultsMarkup() {
  if (!state.locationQuery.trim()) return `<p class="search-hint">支持中英文城市名与海外出生地点；同名地点会显示国家和地区。</p>`;
  if (state.locationLoading) return `<p class="search-hint" role="status">正在查找标准地点…</p>`;
  if (state.locationError) return `<p class="field-error" role="alert">${escapeHtml(state.locationError)}</p>`;
  if (!state.locationResults.length) return `<p class="empty-state">没有找到匹配地点，请检查拼写或换用城市英文名。</p>`;
  return `<div class="location-results" role="listbox" aria-label="地点搜索结果">
    ${state.locationResults.map((location) => `
      <button type="button" role="option" data-action="select-location" data-location="${location.id}" aria-selected="${state.location?.id === location.id}">
        <span><strong>${escapeHtml(location.zh)}</strong><small>${escapeHtml(location.en)}</small></span>
        <span>${escapeHtml([location.region, location.country].filter(Boolean).join(" · "))}</span>
      </button>`).join("")}
  </div>`;
}

function renderPlaceStep() {
  const summary = buildInputSummary(state.birth, state.location);
  return pageShell(`
    ${stepIndicator(2)}
    <section class="form-intro">
      <p class="eyebrow">第二步</p>
      <h1>让地点落入星图</h1>
      <p>选择标准出生城市，我们会在服务端校准时区与经纬度。</p>
    </section>
    <section class="form-section">
      <label class="field-label" for="location-search">出生地点</label>
      <div class="search-field">
        <span aria-hidden="true">⌕</span>
        <input id="location-search" data-input="location-search" type="search" autocomplete="off" placeholder="搜索城市名" value="${escapeHtml(state.locationQuery)}" aria-controls="location-results" />
      </div>
      <div id="location-results">${locationResultsMarkup()}</div>
      <p class="source-note">地点资料：<a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a> · CC BY 4.0</p>
      ${fieldError("location")}
    </section>
    <section class="form-section">
      <div class="field-heading">
        <span class="field-label">性别</span>
        <span class="field-note">仅用于传统大运顺逆计算</span>
      </div>
      <div class="choice-pair" role="group" aria-label="性别，仅用于传统大运顺逆计算">
        <button class="choice-button ${state.sex === "female" ? "is-selected" : ""}" type="button" data-action="select-sex" data-sex="female" aria-pressed="${state.sex === "female"}">女</button>
        <button class="choice-button ${state.sex === "male" ? "is-selected" : ""}" type="button" data-action="select-sex" data-sex="male" aria-pressed="${state.sex === "male"}">男</button>
      </div>
      ${fieldError("sex")}
    </section>
    <section class="input-summary" aria-label="已填信息摘要">
      <span>你的出生轨迹</span>
      <strong>${escapeHtml(summary)}</strong>
    </section>
    <p class="privacy-note">
      出生信息只用于本次推演，不注册、不长期保存；临时结果将在 15 分钟后删除。
      <a href="/privacy.html" target="_blank" rel="noreferrer">查看隐私说明</a>
    </p>
    <div class="sticky-action">
      <button class="primary-button" type="button" data-action="submit-reading">探索你的城市能量<span aria-hidden="true">↗</span></button>
    </div>
  `, { backAction: "back-birth", className: "form-page" });
}

function loadingCopy(stage) {
  const copy = {
    bazi: ["辨识五行流向", "让出生轨迹在圆盘中逐一点亮"],
    matching: ["寻找回应的城市", "山海、气候与城市光点正在汇聚"],
    content: ["收束城市回声", "把匹配结果整理成一段可以阅读的回应"],
    error: ["推演暂时停住了", "你的输入仍被保留，可以再次尝试"]
  };
  return copy[stage] || copy.bazi;
}

function renderLoading() {
  const stage = state.fatalError ? "error" : state.loadingStage || "bazi";
  const [title, subtitle] = loadingCopy(stage);
  const matchingActive = ["matching", "content", "complete"].includes(stage);
  return pageShell(`
    <section class="loading-screen">
      <div class="loading-orb ${matchingActive ? "is-world" : ""}" aria-hidden="true">
        <span class="loading-ring one"></span>
        <span class="loading-ring two"></span>
        <span class="loading-ring three"></span>
        <span class="loading-core">${matchingActive ? "城" : "命"}</span>
        <span class="city-light light-a"></span>
        <span class="city-light light-b"></span>
        <span class="city-light light-c"></span>
      </div>
      <p class="eyebrow">${matchingActive ? "第二段 · 城市搜索" : "第一段 · 五行推演"}</p>
      <h1>${title}</h1>
      <p>${subtitle}</p>
      <div class="stage-rail" aria-label="推演进度">
        <span class="${stage !== "error" ? "active" : ""}">五行</span>
        <i class="${matchingActive ? "active" : ""}"></i>
        <span class="${matchingActive ? "active" : ""}">城市</span>
      </div>
      ${state.fatalError ? `
        <p class="field-error">${escapeHtml(state.fatalError)}</p>
        <button class="secondary-button" type="button" data-action="retry-reading">再试一次</button>` : `
        <p class="loading-note">动画会随实际处理状态持续，不使用虚假百分比。</p>`}
    </section>
  `, { className: "loading-page" });
}

function renderProfile() {
  const profile = state.reading.personalProfile;
  const desired = state.reading.desiredCityEnergy;
  return pageShell(`
    <section class="result-profile">
      <div class="reveal-block" data-reveal="0">
        <p class="eyebrow">你的五行属性</p>
        ${energyDisc(profile.visualLevels)}
        <h1>${profile.typeName}</h1>
        <p class="strength-line">${profile.strengthSummary}</p>
        <p class="reading-line">${profile.oneLineReading}</p>
        <button class="confidence-chip" type="button" data-action="toggle-confidence" aria-expanded="false">结果依据与置信度 <span>＋</span></button>
        <p class="confidence-note" hidden>${profile.confidence.displayHint}</p>
      </div>
      <div class="energy-bridge reveal-block" data-reveal="1" aria-hidden="true">
        <span class="bridge-star"></span><span class="bridge-line"></span><span class="bridge-star end"></span>
      </div>
      <div class="city-energy reveal-block" data-reveal="2">
        <p class="eyebrow">更契合你的城市能量</p>
        ${energyDisc(desired.visualLevels, { subtle: true })}
        <div class="poetic-copy">${desired.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}</div>
        <button class="primary-button" type="button" data-action="show-cities">看看哪些城市回应你<span aria-hidden="true">↓</span></button>
      </div>
    </section>
  `, { backAction: "restart", className: "result-page" });
}

function renderCityCard(city) {
  return `
    <button class="city-card rank-${city.rank}" type="button" data-action="open-city" data-city="${city.id}">
      <span class="city-rank">0${city.rank}</span>
      <span class="scene-art scene-${city.scene}" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="city-card-copy">
        <span class="city-title-row"><strong>${city.zh}</strong><small>${city.en}</small></span>
        <span class="index-pill">契合指数 ${city.index}</span>
        <span class="tag-row">${city.tags.map((tag) => `<em>${tag}</em>`).join("")}</span>
        <span class="card-action">展开城市回应 <span aria-hidden="true">→</span></span>
      </span>
    </button>`;
}

function renderCities() {
  return pageShell(`
    <section class="cities-screen">
      <p class="eyebrow">山河回应</p>
      <h1>与你更契合的城市</h1>
      <p class="section-lead">它们依照同一套组合匹配依次浮现，没有为了故事感改动顺序。</p>
      ${readingService.isDemo ? `<div class="demo-data-note"><strong>样板榜单</strong> 分数与个性化内容尚未接入正式 Matching Engine。</div>` : ""}
      <div class="city-list">${state.reading.rankedCities.map(renderCityCard).join("")}</div>
      <button class="secondary-button share-entry" type="button" data-action="show-share">生成我的城市回应卡<span aria-hidden="true">↗</span></button>
      <p class="legal-note">${state.reading.disclaimer}</p>
    </section>
  `, { backAction: "back-profile", className: "result-page" });
}

function renderCityDetail() {
  const city = state.selectedCity;
  const contentReady = readingService.isDemo || city.contentStatus === "ready";
  return pageShell(`
    <article class="city-detail">
      <header class="city-detail-header">
        <p class="eyebrow">Top ${city.rank} · ${city.en}</p>
        <h1>${city.zh}</h1>
        <div class="detail-meta"><span class="index-pill">契合指数 ${city.index}</span><span class="tag-row">${city.tags.map((tag) => `<em>${tag}</em>`).join("")}</span></div>
      </header>
      <div class="city-hero scene-art scene-${city.scene}" role="img" aria-label="${city.zh}城市图片的品牌占位图">
        <i></i><i></i><i></i><span>城市授权图片待接入</span>
      </div>
      ${readingService.isDemo ? `<div class="content-sample-label">内容样板 · 上线前需逐条事实复核</div>` : ""}
      ${contentReady ? `
        <section class="detail-section"><p class="section-number">01</p><h2>城市特色</h2><p>${escapeHtml(city.feature)}</p></section>
        <section class="detail-section"><p class="section-number">02</p><h2>为什么契合</h2><p>${escapeHtml(city.why)}</p></section>
        <section class="detail-section felt-section"><p class="section-number">03</p><h2>它会带来的感受</h2><p>${escapeHtml(city.feeling)}</p></section>` : `
        <section class="content-unavailable" role="status">
          <h2>详细解读暂时不可用</h2>
          <p>${city.city_profile_status === "not_yet_published" ? "这座城市的正式资料仍在审核中；核心匹配结果不受影响。" : "用户五行、Top 3 与契合指数已经完成真实计算，可以稍后重试城市解读。"}</p>
          ${city.city_profile_status === "reviewed" ? `<button class="secondary-button" type="button" data-action="retry-content" ${state.contentRetrying ? "disabled" : ""}>${state.contentRetrying ? "正在重试…" : "重试详细解读"}</button>` : ""}
        </section>`}
      <div class="detail-actions">
        <button class="secondary-button" type="button" data-action="back-cities">返回榜单</button>
        <button class="primary-button" type="button" data-action="show-share">生成回应卡</button>
      </div>
    </article>
  `, { backAction: "back-cities", className: "detail-page" });
}

function qrImage() {
  const source = state.reading.share?.qr_data_url;
  return source
    ? `<img class="qr-real" src="${escapeHtml(source)}" alt="扫码开启山河有应城市探索" />`
    : `<span class="qr-placeholder" role="img" aria-label="分享入口暂时不可用"></span>`;
}

function renderShare() {
  const [first, second, third] = state.reading.rankedCities;
  return pageShell(`
    <section class="share-screen">
      <p class="eyebrow">分享预览</p>
      <h1>让这座城回应你</h1>
      <p class="section-lead">卡片不会显示出生日期、时辰、地点、性别或四柱。</p>
      <div class="share-card-preview" aria-label="山河有应分享卡预览">
        <div class="share-brand">${brandMark({ compact: true })}</div>
        <p class="share-kicker">你的城市能量，回应在这座城里</p>
        <div class="share-city-art scene-art scene-${first.scene}" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="share-city-title"><h2>${first.zh}</h2><p>${first.en}</p><span>契合指数 ${first.index}</span></div>
        <blockquote>${first.shareLine}</blockquote>
        <div class="share-secondary"><p>Top 2 · ${second.en} — 契合指数 ${second.index}</p><p>Top 3 · ${third.en} — 契合指数 ${third.index}</p></div>
        <div class="share-qr">${qrImage()}<small>扫码开启你的城市探索</small></div>
      </div>
      <p class="qr-warning">二维码指向公开产品入口，不包含出生信息或可还原本次结果的参数。</p>
      <div class="share-actions">
        <button class="secondary-button" type="button" data-action="back-cities">返回榜单</button>
        <button class="primary-button" type="button" data-action="download-share">保存 SVG 预览</button>
      </div>
    </section>
  `, { backAction: "back-cities", className: "share-page" });
}

function render() {
  const views = {
    home: renderHome,
    birth: renderBirthStep,
    place: renderPlaceStep,
    loading: renderLoading,
    profile: renderProfile,
    cities: renderCities,
    detail: renderCityDetail,
    share: renderShare
  };
  root.innerHTML = views[state.screen]();
  document.title = state.screen === "home" ? "山河有应" : `山河有应 · ${document.querySelector("h1")?.textContent || "城市探索"}`;
  if (state.screen === "profile") revealProfile();
}

function revealProfile() {
  const blocks = [...document.querySelectorAll("[data-reveal]")];
  if (prefersReducedMotion.matches) {
    blocks.forEach((block) => block.classList.add("is-visible"));
    return;
  }
  blocks.forEach((block, index) => {
    setTimeout(() => {
      if (state.screen === "profile") block.classList.add("is-visible");
    }, 120 + index * 700);
  });
}

function setScreen(screen) {
  state.screen = screen;
  state.errors = {};
  render();
  window.scrollTo({ top: 0, behavior: prefersReducedMotion.matches ? "auto" : "smooth" });
  requestAnimationFrame(() => document.querySelector("#app-main")?.focus({ preventScroll: true }));
}

async function runLocationSearch(query) {
  locationSearchController?.abort();
  if (!query.trim()) {
    state.locationResults = [];
    state.locationLoading = false;
    state.locationError = null;
    if (state.screen === "place") document.querySelector("#location-results").innerHTML = locationResultsMarkup();
    return;
  }
  const controller = new AbortController();
  locationSearchController = controller;
  state.locationLoading = true;
  state.locationError = null;
  if (state.screen === "place") document.querySelector("#location-results").innerHTML = locationResultsMarkup();
  try {
    const results = await readingService.searchLocations(query, { signal: controller.signal });
    if (controller !== locationSearchController) return;
    state.locationResults = results;
  } catch (error) {
    if (error?.name === "AbortError" || controller !== locationSearchController) return;
    state.locationResults = [];
    state.locationError = error?.userMessage || "地点服务暂时不可用，请稍后重试。";
  } finally {
    if (controller === locationSearchController) {
      state.locationLoading = false;
      if (state.screen === "place") document.querySelector("#location-results").innerHTML = locationResultsMarkup();
    }
  }
}

async function startReading() {
  state.errors = validatePlaceStep(state);
  if (Object.keys(state.errors).length) {
    render();
    return;
  }
  state.fatalError = null;
  state.loadingStage = "bazi";
  setScreen("loading");
  try {
    const request = createReadingRequest(state);
    state.reading = await readingService.createReading(request, {
      onStage(stage) {
        state.loadingStage = stage;
        if (state.screen === "loading") render();
      }
    });
    state.reading.inputSummary = buildInputSummary(state.birth, state.location);
    setScreen("profile");
  } catch (error) {
    state.fatalError = error?.name === "AbortError" ? "推演已取消" : (error?.userMessage || "暂时无法完成推演，请稍后重试。");
    state.loadingStage = "error";
    render();
  }
}

function resetExperience() {
  Object.assign(state, {
    screen: "home",
    birth: { date: "", timeMode: null, exactTime: "", shichenId: null, ziSegment: null },
    locationQuery: "",
    location: null,
    locationResults: [],
    locationLoading: false,
    locationError: null,
    sex: null,
    errors: {},
    loadingStage: null,
    reading: null,
    selectedCity: null,
    fatalError: null,
    contentRetrying: false
  });
  render();
}

root.addEventListener("input", (event) => {
  const input = event.target;
  if (input.dataset.input === "birth-date") state.birth.date = input.value;
  if (input.dataset.input === "exact-time") state.birth.exactTime = input.value;
  if (input.dataset.input === "location-search") {
    state.locationQuery = input.value;
    state.location = null;
    state.locationError = null;
    clearTimeout(locationSearchTimer);
    locationSearchTimer = setTimeout(() => runLocationSearch(state.locationQuery), 220);
  }
});

root.addEventListener("change", (event) => {
  const input = event.target;
  if (input.dataset.input === "zi-segment") {
    state.birth.ziSegment = input.value;
    render();
  }
});

root.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "start") setScreen("birth");
  if (action === "back-home") setScreen("home");
  if (action === "back-birth") setScreen("birth");
  if (action === "back-profile") setScreen("profile");
  if (action === "back-cities") setScreen("cities");
  if (action === "restart") resetExperience();

  if (action === "toggle-disclaimer" || action === "toggle-confidence") {
    const note = target.nextElementSibling;
    note.hidden = !note.hidden;
    target.setAttribute("aria-expanded", String(!note.hidden));
    const symbol = target.querySelector("span");
    if (symbol) symbol.textContent = note.hidden ? "＋" : "−";
  }

  if (action === "use-exact-time") {
    state.birth.timeMode = "exact";
    state.birth.shichenId = null;
    state.birth.ziSegment = null;
    render();
  }
  if (action === "use-shichen") {
    state.birth.timeMode = "shichen";
    render();
  }
  if (action === "select-shichen") {
    state.birth.timeMode = "shichen";
    state.birth.shichenId = target.dataset.shichen;
    if (state.birth.shichenId !== "zi") state.birth.ziSegment = null;
    render();
  }
  if (action === "time-unknown") {
    state.birth.timeMode = "unknown";
    state.birth.shichenId = null;
    state.birth.ziSegment = null;
    render();
  }
  if (action === "birth-next") {
    state.errors = validateBirthStep(state.birth);
    if (Object.keys(state.errors).length) render();
    else setScreen("place");
  }
  if (action === "select-location") {
    state.location = state.locationResults.find((location) => location.id === target.dataset.location) || null;
    state.locationQuery = state.location ? `${state.location.zh} ${state.location.en}` : state.locationQuery;
    render();
  }
  if (action === "select-sex") {
    state.sex = target.dataset.sex;
    render();
  }
  if (action === "submit-reading" || action === "retry-reading") startReading();
  if (action === "show-cities") setScreen("cities");
  if (action === "open-city") {
    state.selectedCity = state.reading.rankedCities.find((city) => city.id === target.dataset.city);
    setScreen("detail");
  }
  if (action === "retry-content" && state.selectedCity && !state.contentRetrying) {
    state.contentRetrying = true;
    render();
    readingService.retryCityContent(state.reading.resultId, state.selectedCity.id)
      .then((updated) => {
        if (!updated) return;
        const index = state.reading.rankedCities.findIndex((city) => city.id === updated.id);
        if (index >= 0) state.reading.rankedCities[index] = updated;
        state.selectedCity = updated;
      })
      .catch(() => {})
      .finally(() => {
        state.contentRetrying = false;
        if (state.screen === "detail") render();
      });
  }
  if (action === "show-share") setScreen("share");
  if (action === "download-share") downloadShareCard(state.reading);
});

render();
