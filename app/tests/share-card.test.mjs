import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_RESULT } from "../src/data/demo-fixture.js";
import { buildShareCardSvg } from "../src/domain/share-card.js";

test("share card contains the ranked cities and no birth data", () => {
  const svg = buildShareCardSvg(DEMO_RESULT);
  assert.match(svg, /温哥华/);
  assert.match(svg, /Top 2 · London/);
  assert.match(svg, /Top 3 · Kyoto/);
  assert.match(svg, /契合指数 91/);
  assert.doesNotMatch(svg, /2000-10-09|青岛|未时|female|四柱/);
});

test("share card uses the agreed 3:4 canvas", () => {
  const svg = buildShareCardSvg(DEMO_RESULT);
  assert.match(svg, /width="1080" height="1440"/);
});
