import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { loadConfig, APP_ROOT, REPO_ROOT } from "./src/config.mjs";
import { CityContentService } from "./src/content-service.mjs";
import { publicError, ServiceError } from "./src/errors.mjs";
import { interpretBazi } from "./src/interpretation-engine.mjs";
import { MatchingEngine } from "./src/matching-engine.mjs";
import { PersonalNeedEngine } from "./src/personal-need-engine.mjs";
import { ReadingStore } from "./src/reading-store.mjs";
import { CityProfileRepository } from "./src/repositories/city-profile-repository.mjs";
import { CityRepository } from "./src/repositories/city-repository.mjs";
import { LocationRepository } from "./src/repositories/location-repository.mjs";

const serviceRoot = fileURLToPath(new URL(".", import.meta.url));
const config = loadConfig();
const [locations, cities, profiles] = await Promise.all([
  LocationRepository.fromFile(resolve(serviceRoot, "data", "locations.json")),
  CityRepository.fromCsv(resolve(REPO_ROOT, "data", "cities.csv")),
  CityProfileRepository.fromFile(resolve(REPO_ROOT, "data", "city_profiles_mvp.json"))
]);
const personalNeed = await PersonalNeedEngine.create(resolve(REPO_ROOT, "data", "preferred_ranges_calibration_results.json"), cities);
const content = new CityContentService({
  apiKey: config.openAiApiKey,
  model: config.openAiModel,
  baseUrl: config.openAiBaseUrl,
  timeoutMs: config.contentTimeoutMs
});
const matching = new MatchingEngine(cities, profiles);
const readings = new ReadingStore({
  locationRepository: locations,
  cityRepository: cities,
  cityProfileRepository: profiles,
  personalNeedEngine: personalNeed,
  matchingEngine: matching,
  contentService: content,
  interpretationEngine: interpretBazi,
  config
});

const mimeTypes = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml; charset=utf-8", ".png": "image/png"
};
const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  ...(config.production ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {})
};

function canonicalRedirect(request, response) {
  if (!config.production || config.deploymentChannel !== "production") return false;
  const host = String(request.headers["x-forwarded-host"] || request.headers.host || "").split(",")[0].trim().toLowerCase().split(":")[0];
  const forwardedProto = String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  if (host !== "www.mydestinycity.com" && !(host === "mydestinycity.com" && forwardedProto && forwardedProto !== "https")) return false;
  const location = new URL(request.url || "/", config.canonicalAppUrl).toString();
  response.writeHead(308, { ...securityHeaders, "Cache-Control": "public, max-age=3600", Location: location });
  response.end();
  return true;
}

function sendJson(response, status, body) {
  response.writeHead(status, { ...securityHeaders, "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32_768) throw new ServiceError("REQUEST_TOO_LARGE", "请求内容过大。", { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new ServiceError("INVALID_JSON", "请求格式无效。", { status: 400 });
  }
}

async function serveStatic(pathname, response) {
  const requested = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  let filePath = resolve(APP_ROOT, requested);
  const fromRoot = relative(APP_ROOT, filePath);
  if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) throw new ServiceError("FORBIDDEN", "Forbidden", { status: 403 });
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) throw new Error("directory");
  } catch {
    filePath = resolve(APP_ROOT, "index.html");
  }
  const isHtml = extname(filePath) === ".html";
  response.writeHead(200, { ...securityHeaders, ...(isHtml ? { Link: `<${config.canonicalAppUrl}>; rel="canonical"` } : {}), "Cache-Control": isHtml ? "no-store" : "public, max-age=300", "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
  createReadStream(filePath).pipe(response);
}

async function handler(request, response) {
  if (canonicalRedirect(request, response)) return;
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  try {
    if (request.method === "GET" && url.pathname === "/healthz") {
      return sendJson(response, 200, { status: "ok", locations: locations.metadata.record_count, cities: cities.cities.length, city_profiles: profiles.profiles.size, ai_content_configured: Boolean(config.openAiApiKey && config.openAiModel) });
    }
    if (request.method === "GET" && url.pathname === "/api/locations") {
      const query = url.searchParams.get("q") || "";
      const items = locations.search(query, Number(url.searchParams.get("limit")) || 8);
      return sendJson(response, 200, { query, items, source: locations.metadata.source, source_snapshot_version: locations.metadata.schema_version });
    }
    if (request.method === "POST" && url.pathname === "/api/readings") {
      return sendJson(response, 202, readings.create(await readJson(request)));
    }
    const readingMatch = /^\/api\/readings\/([0-9a-f-]+)$/.exec(url.pathname);
    if (request.method === "GET" && readingMatch) return sendJson(response, 200, readings.get(readingMatch[1]));
    const retryMatch = /^\/api\/readings\/([0-9a-f-]+)\/cities\/(\d+)\/content\/retry$/.exec(url.pathname);
    if (request.method === "POST" && retryMatch) return sendJson(response, 200, await readings.retryContent(retryMatch[1], retryMatch[2]));
    if (request.method === "GET" && url.pathname === "/api/share/qr.svg") {
      const target = url.searchParams.get("url");
      if (target !== config.publicAppUrl) throw new ServiceError("INVALID_SHARE_URL", "分享入口无效。", { status: 422 });
      const svg = await QRCode.toString(target, { type: "svg", errorCorrectionLevel: "M", margin: 2, color: { dark: "#07100dff", light: "#d7c79dff" } });
      response.writeHead(200, { ...securityHeaders, "Cache-Control": "public, max-age=3600", "Content-Type": "image/svg+xml; charset=utf-8" });
      return response.end(svg);
    }
    if (url.pathname.startsWith("/api/")) throw new ServiceError("NOT_FOUND", "接口不存在。", { status: 404 });
    return serveStatic(url.pathname, response);
  } catch (error) {
    const body = publicError(error);
    return sendJson(response, error instanceof ServiceError ? error.status : 500, { error: body });
  }
}

createServer(handler).listen(config.port, config.host, () => {
  console.log(`山河有应 real-chain MVP running at ${config.publicAppUrl} (listen ${config.host}:${config.port})`);
});
