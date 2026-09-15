function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function splitLine(text, limit = 18) {
  const characters = [...text];
  const lines = [];
  while (characters.length) lines.push(characters.splice(0, limit).join(""));
  return lines.slice(0, 3);
}

export function buildShareCardSvg(result) {
  const [first, second, third] = result.rankedCities;
  const lines = splitLine(first.shareLine);
  const lineMarkup = lines.map((line, index) => (
    `<text x="540" y="${840 + index * 52}" text-anchor="middle" class="share-copy">${escapeXml(line)}</text>`
  )).join("");

  const fallbackQrModules = Array.from({ length: 81 }, (_, index) => {
    const x = index % 9;
    const y = Math.floor(index / 9);
    const filled = ((x * 7 + y * 11 + index) % 5) < 2 || (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
    return filled ? `<rect x="${486 + x * 12}" y="${1162 + y * 12}" width="9" height="9" rx="1" />` : "";
  }).join("");
  const qrMarkup = result.share?.qr_data_url
    ? `<image href="${escapeXml(result.share.qr_data_url)}" x="446" y="1122" width="188" height="188" />`
    : `<g fill="#d8c18b">${fallbackQrModules}</g>`;
  const qrLabel = result.share?.qr_data_url ? "扫码开启你的城市探索" : "开发占位 · 公开构建前接入真实入口";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">
  <defs>
    <radialGradient id="glow" cx="50%" cy="36%" r="70%">
      <stop offset="0" stop-color="#315f4d" stop-opacity="0.86" />
      <stop offset="0.55" stop-color="#0d241d" stop-opacity="0.72" />
      <stop offset="1" stop-color="#050a08" />
    </radialGradient>
    <style>
      .serif { font-family: "Noto Serif SC", "Songti SC", serif; fill: #e9e5d8; }
      .sans { font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif; fill: #b8b7ad; }
      .share-copy { font-family: "Noto Serif SC", "Songti SC", serif; fill: #e9e5d8; font-size: 34px; letter-spacing: 2px; }
    </style>
  </defs>
  <rect width="1080" height="1440" fill="url(#glow)" />
  <circle cx="540" cy="440" r="292" fill="none" stroke="#b9985a" stroke-opacity="0.36" stroke-width="2" />
  <circle cx="540" cy="440" r="238" fill="none" stroke="#d8c18b" stroke-opacity="0.18" />
  <path d="M300 485 Q430 320 540 410 T780 360" fill="none" stroke="#d8c18b" stroke-opacity="0.52" stroke-width="3" />
  <path d="M320 540 Q470 390 620 520 T780 430" fill="none" stroke="#628f95" stroke-opacity="0.56" stroke-width="6" />
  <text x="540" y="104" text-anchor="middle" class="serif" font-size="28" letter-spacing="6">山河有应</text>
  <text x="540" y="172" text-anchor="middle" class="serif" font-size="40">你的城市能量，回应在这座城里</text>
  <text x="540" y="402" text-anchor="middle" class="serif" font-size="82" letter-spacing="8">${escapeXml(first.zh)}</text>
  <text x="540" y="470" text-anchor="middle" class="sans" font-size="28" letter-spacing="5">${escapeXml(first.en.toUpperCase())}</text>
  <rect x="388" y="526" width="304" height="62" rx="31" fill="#081310" fill-opacity="0.7" stroke="#b9985a" />
  <text x="540" y="568" text-anchor="middle" class="serif" font-size="28">契合指数 ${first.index}</text>
  ${lineMarkup}
  <line x1="190" y1="1032" x2="890" y2="1032" stroke="#b9985a" stroke-opacity="0.3" />
  <text x="210" y="1094" class="sans" font-size="25">Top 2 · ${escapeXml(second.en)} — 契合指数 ${second.index}</text>
  <text x="210" y="1138" class="sans" font-size="25">Top 3 · ${escapeXml(third.en)} — 契合指数 ${third.index}</text>
  <circle cx="540" cy="1216" r="92" fill="#050a08" fill-opacity="0.82" stroke="#b9985a" stroke-width="3" />
  <circle cx="540" cy="1216" r="104" fill="none" stroke="#d8c18b" stroke-opacity="0.18" />
  ${qrMarkup}
  <text x="540" y="1360" text-anchor="middle" class="serif" font-size="26" letter-spacing="5">${qrLabel}</text>
</svg>`;
}

export function downloadShareCard(result) {
  const svg = buildShareCardSvg(result);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `山河有应-${result.rankedCities[0].zh}-分享卡.svg`;
  anchor.click();
  URL.revokeObjectURL(url);
}
