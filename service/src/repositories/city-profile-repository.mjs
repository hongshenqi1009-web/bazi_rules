import { readFile } from "node:fs/promises";

export class CityProfileRepository {
  constructor(snapshot) {
    this.metadata = {
      schema_version: snapshot.schema_version,
      asset_manifest_version: snapshot.asset_manifest_version,
      reviewed_on: snapshot.reviewed_on,
      score_boundary: snapshot.score_boundary,
      media_policy: snapshot.media_policy
    };
    this.profiles = new Map(snapshot.profiles.map((profile) => [profile.city_id, Object.freeze(profile)]));
  }

  static async fromFile(path) {
    return new CityProfileRepository(JSON.parse(await readFile(path, "utf8")));
  }

  get(id) {
    return this.profiles.get(String(id)) || null;
  }
}
