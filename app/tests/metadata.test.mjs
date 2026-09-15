import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

test("production metadata uses the formal canonical domain and Chinese brand", async () => {
  const html = await readFile(resolve(appRoot, "index.html"), "utf8");
  assert.match(html, /<link rel="canonical" href="https:\/\/mydestinycity\.com\/"/);
  assert.match(html, /property="og:url" content="https:\/\/mydestinycity\.com\/"/);
  assert.match(html, /property="og:site_name" content="山河有应"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.doesNotMatch(html, /example\.com|127\.0\.0\.1|localhost/);
});
