import { DEMO_META, DEMO_RESULT } from "../data/demo-fixture.js";

export const READING_STAGES = Object.freeze(["bazi", "matching", "content", "complete"]);

function wait(duration, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, duration);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Reading cancelled", "AbortError"));
    }, { once: true });
  });
}

export class DemoReadingService {
  constructor({ durations = [850, 1200, 650] } = {}) {
    this.durations = durations;
  }

  async createReading(request, { onStage, signal } = {}) {
    const stages = ["bazi", "matching", "content"];
    for (let index = 0; index < stages.length; index += 1) {
      onStage?.(stages[index]);
      await wait(this.durations[index], signal);
    }
    onStage?.("complete");
    return structuredClone({
      ...DEMO_RESULT,
      requestMeta: {
        isDemo: DEMO_META.isDemo,
        fixtureVersion: DEMO_META.version,
        acceptedRequestShape: Object.keys(request).sort()
      }
    });
  }
}

// Production adapter: replace this instance with an implementation of the same
// createReading(request, { onStage, signal }) contract. UI code must not import
// BaZi, City or Matching calculations.
export const readingService = new DemoReadingService();
