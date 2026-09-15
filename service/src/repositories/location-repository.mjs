import { readFile } from "node:fs/promises";

const countryZh = new Intl.DisplayNames(["zh-CN"], { type: "region" });
const countryEn = new Intl.DisplayNames(["en"], { type: "region" });

function normalizeQuery(value) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en");
}

function scoreLocation(location, query) {
  const names = location._normalized_names;
  let match = 0;
  for (const name of names) {
    if (name === query) match = Math.max(match, 1_000);
    else if (name.startsWith(query)) match = Math.max(match, 700 - Math.min(100, name.length - query.length));
    else if (query.length >= 2 && name.includes(query)) match = Math.max(match, 430 - Math.min(100, name.length - query.length));
  }
  if (!match) return 0;
  return match + Math.log10(Math.max(1, location.population)) * 18;
}

export class LocationRepository {
  constructor(snapshot) {
    this.metadata = snapshot.metadata;
    this.locations = snapshot.locations.map((location) => ({
      ...location,
      _normalized_names: location.search_names.map(normalizeQuery)
    }));
    this.byId = new Map(this.locations.map((location) => [location.id, location]));
  }

  static async fromFile(path) {
    return new LocationRepository(JSON.parse(await readFile(path, "utf8")));
  }

  search(rawQuery, limit = 8) {
    const query = normalizeQuery(rawQuery || "");
    if (query.length < 1 || query.length > 80) return [];
    return this.locations
      .map((location) => ({ location, score: scoreLocation(location, query) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || right.location.population - left.location.population || left.location.id.localeCompare(right.location.id))
      .slice(0, Math.max(1, Math.min(12, limit)))
      .map(({ location }) => this.toPublic(location));
  }

  get(rawId) {
    const id = String(rawId || "").replace(/^geonames:/, "");
    const location = this.byId.get(id);
    return location ? this.toPublic(location) : null;
  }

  toPublic(location) {
    return {
      id: location.id,
      standard_id: `geonames:${location.id}`,
      city_name: location.name,
      city_name_zh: location.zh || location.name,
      country: countryEn.of(location.country_code) || location.country_code,
      country_zh: countryZh.of(location.country_code) || location.country_code,
      country_code: location.country_code,
      admin_area: location.admin1_name,
      timezone: location.timezone,
      iana_timezone: location.timezone,
      lat: location.lat,
      lon: location.lon,
      source: "GeoNames",
      source_snapshot_version: this.metadata.schema_version
    };
  }
}
