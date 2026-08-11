import { describe, expect, it } from "vitest";
import {
  createPlaybackTimeline,
  deriveTopology,
  metricsAt,
  tracePaintAt,
  type PlaybackTimeline,
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

  it("anchors dependency mechanisms to the order service", () => {
    const config = defaultConfig();
    expect(deriveTopology(config, "closed").annotations).toContainEqual(
      expect.objectContaining({ target: "order", label: "1 retry" }),
    );
  });
});

describe("playback timeline", () => {
  it("is deterministic and bounded to twelve sampled requests", () => {
    const result = simulate(defaultConfig());
    const first = createPlaybackTimeline(result);
    expect(first).toEqual(createPlaybackTimeline(result));
    expect(first.sampledRequests).toBeLessThanOrEqual(12);
    expect(first.durationMs).toBe(10_000);
    expect(first.events.length).toBeGreaterThan(0);
    expect(first.events.some((event) => event.edge === "queue-worker")).toBe(
      true,
    );
  });

  it("keeps overlapping outcomes in separate bounded paint layers", () => {
    const timeline: PlaybackTimeline = {
      durationMs: 10_000,
      sampledRequests: 2,
      events: [
        {
          id: "success",
          requestId: "one",
          atMs: 100,
          durationMs: 300,
          edge: "order-payment",
          reverse: true,
          kind: "success",
          label: "success",
        },
        {
          id: "error",
          requestId: "two",
          atMs: 150,
          durationMs: 300,
          edge: "order-payment",
          reverse: true,
          kind: "error",
          label: "error",
        },
      ],
    };
    const paint = tracePaintAt(timeline, 200);
    expect(paint.map((item) => item.kind)).toEqual(["error", "success"]);
    expect(paint.every((item) => item.intensity > 0)).toBe(true);
    expect(tracePaintAt(timeline, 2300)).toEqual([]);
  });

  it("shows representative rejections at the limiter", () => {
    const config = defaultConfig();
    config.scenario = "cyber";
    config.controls.rateLimit = 50;
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
