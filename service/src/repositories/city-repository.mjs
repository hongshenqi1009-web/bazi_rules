import { readFile } from "node:fs/promises";
import { parseCsv } from "../csv.mjs";

export const ELEMENTS = Object.freeze(["wood", "fire", "earth", "metal", "water"]);

export class CityRepository {
  constructor(rows) {
    this.cities = rows.map((row) => {
      const vector = Object.fromEntries(ELEMENTS.map((element) => [element, Number(row[`${element}_score_raw`]) / 100]));
      const sum = Object.values(vector).reduce((total, value) => total + value, 0);
      if (Math.abs(sum - 1) > 1e-6) throw new Error(`Invalid city vector sum for ${row.city_id}`);
      return Object.freeze({
        id: row.city_id,
        en: row.city_name_en,
        zh: row.city_name_zh,
        country: row.country,
        countryCode: row.country_code,
        region: row.region,
        lat: Number(row.lat),
        lon: Number(row.lon),
        timezone: row.iana_timezone,
        vector,
        vectorPoints: Object.fromEntries(ELEMENTS.map((element) => [element, Number(row[`${element}_score_raw`])])),
        dominantElement: row.dominant_element,
        dominantPrototype: row.dominant_prototype,
        dataConfidence: row.data_confidence,
        mappingVersion: row.mapping_version,
        sourceSnapshotVersion: row.source_snapshot_version
      });
    });
    if (this.cities.length !== 100) throw new Error(`Expected 100 locked cities, got ${this.cities.length}`);
    this.byId = new Map(this.cities.map((city) => [city.id, city]));
  }

  static async fromCsv(path) {
    return new CityRepository(parseCsv(await readFile(path, "utf8")));
  }

  get(id) {
    return this.byId.get(String(id)) || null;
  }

  distributions() {
    return Object.fromEntries(ELEMENTS.map((element) => [
      element,
      this.cities.map((city) => city.vector[element]).sort((left, right) => left - right)
    ]));
  }
}
