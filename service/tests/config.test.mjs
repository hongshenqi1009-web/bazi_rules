import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.mjs";

test("development defaults to the local preview URL", () => {
  const config = loadConfig({});
  assert.equal(config.publicAppUrl, "http://127.0.0.1:4173/");
  assert.equal(config.readingTtlMs, 15 * 60_000);
});

test("production is pinned to the formal canonical domain", () => {
  assert.throws(() => loadConfig({ NODE_ENV: "production" }), /PUBLIC_APP_URL is required/);
  assert.throws(
    () => loadConfig({ NODE_ENV: "production", PUBLIC_APP_URL: "http://mydestinycity.com" }),
    /must use https/
  );
  assert.equal(
    loadConfig({ NODE_ENV: "production", PUBLIC_APP_URL: "https://mydestinycity.com" }).publicAppUrl,
    "https://mydestinycity.com/"
  );
  assert.throws(
    () => loadConfig({ NODE_ENV: "production", PUBLIC_APP_URL: "https://other.example/" }),
    /production PUBLIC_APP_URL must be/
  );
});

test("controlled staging is pinned to the official staging subdomain", () => {
  assert.equal(
    loadConfig({ NODE_ENV: "production", DEPLOYMENT_CHANNEL: "staging", PUBLIC_APP_URL: "https://staging.mydestinycity.com" }).publicAppUrl,
    "https://staging.mydestinycity.com/"
  );
  assert.throws(
    () => loadConfig({ NODE_ENV: "production", DEPLOYMENT_CHANNEL: "staging", PUBLIC_APP_URL: "https://temporary.example/" }),
    /staging PUBLIC_APP_URL must be/
  );
});
