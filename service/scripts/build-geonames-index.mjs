import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argumentsMap = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...value] = argument.split("=");
  return [key.replace(/^--/, ""), value.join("=")];
}));
const citiesPath = resolve(argumentsMap.cities || "cities15000.txt");
const adminPath = resolve(argumentsMap.admin || "admin1CodesASCII.txt");
const outputPath = resolve(argumentsMap.output || resolve(root, "data", "locations.json"));

const [citiesBuffer, adminText] = await Promise.all([readFile(citiesPath), readFile(adminPath, "utf8")]);
const adminNames = new Map(adminText.split(/\r?\n/).filter(Boolean).map((line) => {
  const [code, name] = line.split("\t");
  return [code, name];
}));

const cjkPattern = /[\u3400-\u9fff]/;
const compact = citiesBuffer.toString("utf8").split(/\r?\n/).filter(Boolean).map((line) => {
  const columns = line.split("\t");
  const aliases = columns[3].split(",").filter(Boolean);
  const zh = aliases.find((name) => cjkPattern.test(name)) || "";
  const searchNames = [...new Set([columns[1], columns[2], zh, ...aliases]
    .map((name) => name.normalize("NFKC").trim())
    .filter((name) => name && name.length <= 80))].slice(0, 48);
  return {
    id: columns[0],
    name: columns[1],
    ascii: columns[2],
    zh,
    search_names: searchNames,
    lat: Number(columns[4]),
    lon: Number(columns[5]),
    country_code: columns[8],
    admin1_code: columns[10],
    admin1_name: adminNames.get(`${columns[8]}.${columns[10]}`) || "",
    population: Number(columns[14]) || 0,
    timezone: columns[17],
    modified_on: columns[18]
  };
});

const snapshot = {
  metadata: {
    schema_version: "geonames-location-index-v0.1",
    source: "GeoNames cities15000 daily dump",
    source_url: "https://download.geonames.org/export/dump/cities15000.zip",
    source_sha256: createHash("sha256").update(citiesBuffer).digest("hex"),
    license: "CC BY 4.0",
    attribution: "GeoNames",
    generated_on: new Date().toISOString().slice(0, 10),
    record_count: compact.length
  },
  locations: compact
};
await writeFile(outputPath, `${JSON.stringify(snapshot)}\n`, "utf8");
console.log(JSON.stringify({ output: outputPath, records: compact.length, source_sha256: snapshot.metadata.source_sha256 }, null, 2));
