import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serviceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

async function freePort() {
  const server = createServer();
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const port = server.address().port;
  await new Promise((resolveClose) => server.close(resolveClose));
  return port;
}

test("WebP/OG assets have correct MIME and a missing asset returns 404 without crashing service", async () => {
  const port = await freePort();
  const child = spawn(process.execPath, [resolve(serviceRoot, "server.mjs")], {
    cwd: resolve(serviceRoot, ".."),
    env: { ...process.env, NODE_ENV: "test", HOST: "127.0.0.1", PORT: String(port) },
    stdio: "ignore"
  });
  const origin = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`service exited ${child.exitCode}`);
      try {
        const response = await fetch(`${origin}/healthz`);
        if (response.ok) { ready = true; break; }
      } catch { /* startup in progress */ }
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
    assert.equal(ready, true, "service did not start");
    for (const [path, mime] of [["/assets/cities/derived/london-detail.webp", "image/webp"], ["/assets/brand/og-city.jpg", "image/jpeg"]]) {
      const response = await fetch(`${origin}${path}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), mime);
      assert.ok((await response.arrayBuffer()).byteLength > 30_000);
    }
    const missing = await fetch(`${origin}/assets/cities/derived/missing.webp`);
    assert.equal(missing.status, 404);
    assert.equal((await fetch(`${origin}/healthz`)).status, 200);
  } finally {
    child.kill();
  }
});
