import test from "node:test";
import assert from "node:assert/strict";
import { DemoReadingService, READING_STAGES } from "../src/services/reading-service.js";

test("demo orchestration reports real stages in order", async () => {
  const stages = [];
  const service = new DemoReadingService({ durations: [1, 1, 1] });
  const result = await service.createReading({ sample: true }, { onStage: (stage) => stages.push(stage) });
  assert.deepEqual(stages, READING_STAGES);
  assert.equal(result.requestMeta.isDemo, true);
  assert.equal(result.versions.baziEngine, "not-connected");
});

test("fixture top three remain in descending score order", async () => {
  const result = await new DemoReadingService({ durations: [0, 0, 0] }).createReading({});
  assert.equal(result.rankedCities.length, 3);
  assert.deepEqual(result.rankedCities.map((city) => city.index), [91, 89, 87]);
});
