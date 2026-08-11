import { describe, expect, it } from "vitest";
import { compare, defaultConfig, simulate } from "../src/domain/simulation";

describe("deterministic simulation", () => {
  it("starts without resilience mechanisms", () => {
    const config = defaultConfig();
    expect(config.scaling).toBe("none");
    expect(config.controls).toMatchObject({
      cache: false,
      retries: 0,
      jitter: false,
      circuitBreaker: false,
      rateLimit: 1000,
      idempotency: false,
    });
  });

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
    config.scenario = "dos";
    config.controls.rateLimit = 1000;
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
    config.scenario = "normal";
    config.controls.rateLimit = 10;
    const result = simulate(config);
    expect(result.metrics.limited).toBeGreaterThan(0);
    expect(result.metrics.completed).toBe(100);
  });

  it("supports one thousand accepted requests per second", () => {
    const config = defaultConfig();
    config.scenario = "dos";
    config.controls.rateLimit = 1000;
    const result = simulate(config);
    expect(result.metrics.offered).toBe(7940);
    expect(result.metrics.completed).toBe(7940);
    expect(result.traces.length).toBeLessThanOrEqual(24);
  });

  it("compares the same seed and traffic inputs", () => {
    const config = defaultConfig();
    config.scenario = "cyber";
    config.scaling = "horizontal";
    config.controls.cache = false;
    const result = compare(config);
    expect(result.baseline.config.seed).toBe(result.current.config.seed);
    expect(result.baseline.metrics.offered).toBe(
      result.current.metrics.offered,
    );
    expect(result.current.config.scaling).toBe(result.baseline.config.scaling);
  });

  it("derives failures from demand relative to capacity", () => {
    const constrained = defaultConfig();
    constrained.scenario = "cyber";
    constrained.scaling = "none";
    constrained.controls.rateLimit = 1000;
    const scaled = structuredClone(constrained);
    scaled.scaling = "horizontal";
    const constrainedResult = simulate(constrained);
    const scaledResult = simulate(scaled);
    expect(constrainedResult.metrics.errorRate).toBeGreaterThan(
      scaledResult.metrics.errorRate,
    );
    expect(
      scaledResult.resources.find((item) => item.service === "order")
        ?.instances,
    ).toBeGreaterThan(1);
  });

  it("models vertical scaling as one instance with double allocation", () => {
    const config = defaultConfig();
    config.scenario = "cyber";
    config.scaling = "vertical";
    const order = simulate(config).resources.find(
      (item) => item.service === "order",
    );
    expect(order).toMatchObject({ instances: 1, allocation: "2x" });
  });

  it("caps horizontal scaling at the selected instance maximum", () => {
    const config = defaultConfig();
    config.scenario = "dos";
    config.scaling = "horizontal";
    config.maxInstances = 2;
    config.controls.rateLimit = 1000;
    const result = simulate(config);
    expect(result.resources.every((item) => item.instances <= 2)).toBe(true);
    expect(result.resources.some((item) => item.state === "saturated")).toBe(
      true,
    );
  });
});
