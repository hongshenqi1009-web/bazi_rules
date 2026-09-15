import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.mjs";

test("development defaults to the local preview URL", () => {
  const config = loadConfig({});
  assert.equal(config.publicAppUrl, "http://127.0.0.1:4173/");
  assert.equal(config.readingTtlMs, 15 * 60_000);
});

test("production requires an explicit HTTPS public URL", () => {
  assert.throws(() => loadConfig({ NODE_ENV: "production" }), /PUBLIC_APP_URL is required/);
  assert.throws(
    () => loadConfig({ NODE_ENV: "production", PUBLIC_APP_URL: "http://example.com" }),
    /must use https/
  );
  assert.equal(
    loadConfig({ NODE_ENV: "production", PUBLIC_APP_URL: "https://shanhe.example/path" }).publicAppUrl,
    "https://shanhe.example/path/"
  );
});
