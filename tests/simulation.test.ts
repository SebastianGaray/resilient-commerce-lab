import { describe, expect, it } from "vitest";
import { compare, defaultConfig, simulate } from "../src/domain/simulation";

describe("deterministic simulation", () => {
  it("replays identical inputs exactly", () => {
    const config = defaultConfig();
    expect(simulate(config)).toEqual(simulate(config));
  });

  it("changes the random stream with the seed", () => {
    const first = defaultConfig();
    const second = defaultConfig();
    second.seed += 1;
    expect(simulate(first).metrics.p95).not.toBe(simulate(second).metrics.p95);
  });

  it("derives retry and timeout counts from dependency attempts", () => {
    const config = defaultConfig();
    config.fault = { target: "payment", intensity: 100 };
    config.controls.timeoutMs = 80;
    config.controls.retries = 2;
    const result = simulate(config);
    expect(result.metrics.timeouts).toBeGreaterThan(0);
    expect(result.metrics.retries).toBeGreaterThan(0);
    expect(result.metrics.dependencyRequests).toBeGreaterThan(
      result.metrics.retries,
    );
  });

  it("bounds accepted work with rate limiting", () => {
    const config = defaultConfig();
    config.requestsPerSecond = 100;
    config.controls.rateLimit = 10;
    const result = simulate(config);
    expect(result.metrics.limited).toBeGreaterThan(0);
    expect(result.metrics.completed).toBe(100);
  });

  it("compares the same seed and traffic inputs", () => {
    const config = defaultConfig();
    config.pattern = "burst";
    config.fault = { target: "inventory", intensity: 70 };
    const result = compare(config);
    expect(result.baseline.config.seed).toBe(result.current.config.seed);
    expect(result.baseline.metrics.offered).toBe(
      result.current.metrics.offered,
    );
    expect(result.current.metrics.errorRate).toBeGreaterThan(
      result.baseline.metrics.errorRate,
    );
  });
});
