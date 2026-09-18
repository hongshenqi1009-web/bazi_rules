import { connect } from "node:tls";

const origin = "https://mydestinycity.com";
const host = "mydestinycity.com";
const checks = [];

async function check(name, action) {
  try {
    const detail = await action();
    checks.push({ name, status: "pass", detail });
    console.log(`PASS ${name}: ${detail}`);
  } catch (error) {
    checks.push({ name, status: "fail", detail: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function dns(name, type) {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  expect(response.ok, `DoH HTTP ${response.status}`);
  const payload = await response.json();
  expect(payload.Status === 0 && payload.Answer?.length, `DNS status ${payload.Status}; no ${type} answer`);
  return payload.Answer.map((record) => record.data).join(", ");
}

async function certificate(name) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: name, port: 443, servername: name, timeout: 10_000 }, () => {
      const peer = socket.getPeerCertificate();
      const valid = socket.authorized;
      const reason = socket.authorizationError;
      socket.end();
      if (!valid) reject(new Error(`TLS unauthorized: ${reason}`));
      else resolve(`${peer.subjectaltname}; expires ${peer.valid_to}`);
    });
    socket.once("timeout", () => socket.destroy(new Error("TLS timeout")));
    socket.once("error", reject);
  });
}

async function get(url, redirect = "manual") {
  return fetch(url, { redirect, signal: AbortSignal.timeout(15_000) });
}

await check("root DNS A", () => dns(host, "A"));
await check("www DNS", () => dns(`www.${host}`, "CNAME"));
await check("root TLS", () => certificate(host));
await check("www TLS", () => certificate(`www.${host}`));
await check("HTTP to HTTPS", async () => {
  const response = await get(`http://${host}/privacy.html?release=1`);
  const location = response.headers.get("location");
  expect([301, 302, 307, 308].includes(response.status), `HTTP ${response.status}`);
  expect(location === `${origin}/privacy.html?release=1`, `Location ${location}`);
  return `HTTP ${response.status} → ${location}`;
});
await check("www to root 308", async () => {
  const response = await get(`https://www.${host}/privacy.html?release=1`);
  const location = response.headers.get("location");
  expect(response.status === 308, `HTTP ${response.status}`);
  expect(location === `${origin}/privacy.html?release=1`, `Location ${location}`);
  return location;
});
await check("root canonical and Open Graph", async () => {
  const response = await get(`${origin}/`);
  expect(response.status === 200, `HTTP ${response.status}`);
  const html = await response.text();
  expect(html.includes(`<link rel="canonical" href="${origin}/"`), "canonical mismatch");
  expect(html.includes(`property="og:url" content="${origin}/"`), "og:url mismatch");
  expect(html.includes(`property="og:image" content="${origin}/assets/brand/og-city.jpg"`), "og:image mismatch");
  expect(!html.includes("localhost") && !html.includes("staging.mydestinycity.com"), "temporary URL in production HTML");
  return `HTTP 200; canonical and OG = ${origin}/`;
});
await check("health and data counts", async () => {
  const response = await get(`${origin}/healthz`);
  expect(response.status === 200, `HTTP ${response.status}`);
  const payload = await response.json();
  expect(payload.status === "ok" && payload.cities === 100 && payload.city_profiles === 8, JSON.stringify(payload));
  return `locations ${payload.locations}, cities ${payload.cities}, profiles ${payload.city_profiles}, AI configured ${payload.ai_content_configured}`;
});
await check("OG and city image MIME", async () => {
  for (const [path, mime] of [["/assets/brand/og-city.jpg", "image/jpeg"], ["/assets/cities/derived/london-detail.webp", "image/webp"]]) {
    const response = await get(`${origin}${path}`);
    expect(response.status === 200, `${path}: HTTP ${response.status}`);
    expect(response.headers.get("content-type")?.startsWith(mime), `${path}: MIME ${response.headers.get("content-type")}`);
  }
  return "OG JPEG and WebP derivative returned correct MIME";
});
await check("production QR only", async () => {
  const valid = await get(`${origin}/api/share/qr.svg?url=${encodeURIComponent(`${origin}/`)}`);
  expect(valid.status === 200 && valid.headers.get("content-type")?.includes("image/svg+xml"), `valid QR HTTP ${valid.status}`);
  const invalid = await get(`${origin}/api/share/qr.svg?url=${encodeURIComponent("https://temporary.example/")}`);
  expect(invalid.status === 422, `temporary URL was accepted: HTTP ${invalid.status}`);
  return "official entry accepted; temporary entry rejected";
});

if (process.argv.includes("--full-chain")) {
  await check("synthetic complete user chain", async () => {
    const placeResponse = await get(`${origin}/api/locations?q=${encodeURIComponent("青岛")}&limit=8`);
    expect(placeResponse.status === 200, `location HTTP ${placeResponse.status}`);
    const place = (await placeResponse.json()).items.find((item) => item.standard_id === "geonames:1797929");
    expect(place?.iana_timezone === "Asia/Shanghai", "standard Qingdao location missing");
    const createdResponse = await fetch(`${origin}/api/readings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birth_date_local: "2000-10-09",
        birth_time: { mode: "exact", exact_local_time: "14:20", precision: "minute" },
        birth_location_id: place.standard_id,
        sex_for_dayun: "female",
        true_solar_time_enabled: false,
        direction_adjustment_enabled: false,
        locale: "zh-CN"
      }),
      signal: AbortSignal.timeout(15_000)
    });
    expect(createdResponse.status === 202, `reading create HTTP ${createdResponse.status}`);
    const created = await createdResponse.json();
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const response = await get(`${origin}/api/readings/${created.result_id}`);
      expect(response.status === 200, `reading poll HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.status === "failed") throw new Error(payload.error?.code || "core calculation failed");
      if (payload.status === "complete") {
        expect(payload.source === "t009-real-chain-v0.1", `source ${payload.source}`);
        expect(payload.ranked_cities?.length === 3, "Top 3 missing");
        expect(payload.privacy?.birth_input_persisted === false, "birth persistence flag invalid");
        expect(payload.share?.landing_url === `${origin}/`, "share landing URL mismatch");
        expect(!JSON.stringify(payload).includes("2000-10-09"), "birth date leaked in result");
        return `Top 3 ${payload.ranked_cities.map((city) => city.city_name_en).join(", ")}; versions ${payload.versions?.bazi_engine}/${payload.versions?.city_engine}`;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("reading did not complete within 60 seconds");
  });
}

console.log(JSON.stringify({ checked_at: new Date().toISOString(), checks }, null, 2));
if (checks.some((item) => item.status === "fail")) process.exitCode = 1;
