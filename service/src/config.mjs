import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SERVICE_ROOT = fileURLToPath(new URL("..", import.meta.url));
export const REPO_ROOT = resolve(SERVICE_ROOT, "..");
export const APP_ROOT = resolve(REPO_ROOT, "app");

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizedPublicUrl(value, production) {
  if (production && !value) throw new Error("PUBLIC_APP_URL is required in production");
  const candidate = value || "http://127.0.0.1:4173/";
  const url = new URL(candidate);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("PUBLIC_APP_URL must use http or https");
  if (production && url.protocol !== "https:") throw new Error("PUBLIC_APP_URL must use https in production");
  url.hash = "";
  url.search = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.toString();
}

export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === "production";
  return Object.freeze({
    host: env.HOST || "127.0.0.1",
    port: positiveInteger(env.PORT, 4173),
    publicAppUrl: normalizedPublicUrl(env.PUBLIC_APP_URL, production),
    readingTtlMs: positiveInteger(env.READING_TTL_MINUTES, 15) * 60_000,
    contentTimeoutMs: positiveInteger(env.CONTENT_TIMEOUT_MS, 18_000),
    openAiApiKey: env.OPENAI_API_KEY || "",
    openAiModel: env.OPENAI_CONTENT_MODEL || "",
    openAiBaseUrl: (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")
  });
}
