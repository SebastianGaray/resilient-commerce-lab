import { describe, expect, it } from "vitest";
import {
  createPlaybackTimeline,
  deriveTopology,
  metricsAt,
} from "../src/domain/playback";
import { defaultConfig, simulate } from "../src/domain/simulation";

describe("derived topology", () => {
  it("adds and removes mechanism nodes from existing controls", () => {
    const config = defaultConfig();
    const enabled = deriveTopology(config, "closed");
    expect(enabled.nodes).toContain("cache");
    expect(enabled.nodes).toContain("limiter");
    config.controls.cache = false;
    config.controls.rateLimit = 1000;
    const disabled = deriveTopology(config, "closed");
    expect(disabled.nodes).not.toContain("cache");
    expect(disabled.nodes).not.toContain("limiter");
    expect(disabled.edges).toContain("client-gateway");
  });

  it("annotates configured faults without editing arbitrary topology", () => {
    const config = defaultConfig();
    config.fault = { target: "worker", intensity: 80 };
    expect(deriveTopology(config, "closed").annotations).toContainEqual({
      target: "worker",
      label: "80% fault",
      state: "fault",
    });
  });
});

describe("playback timeline", () => {
  it("is deterministic and bounded to twelve sampled requests", () => {
    const result = simulate(defaultConfig());
    const first = createPlaybackTimeline(result);
    expect(first).toEqual(createPlaybackTimeline(result));
    expect(first.sampledRequests).toBeLessThanOrEqual(12);
    expect(first.events.length).toBeGreaterThan(0);
    expect(first.events.some((event) => event.edge === "queue-worker")).toBe(
      true,
    );
  });

  it("shows representative rejections at the limiter", () => {
    const config = defaultConfig();
    config.requestsPerSecond = 120;
    config.controls.rateLimit = 20;
    const timeline = createPlaybackTimeline(simulate(config));
    expect(
      timeline.events.some(
        (event) => event.edge === "client-limiter" && event.kind === "limited",
      ),
    ).toBe(true);
  });

  it("returns exact final metrics", () => {
    const metrics = simulate(defaultConfig()).metrics;
    expect(metricsAt(metrics, 1)).toEqual(metrics);
    expect(metricsAt(metrics, 0).completed).toBe(0);
  });
});
