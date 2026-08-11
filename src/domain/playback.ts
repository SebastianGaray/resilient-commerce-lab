import type {
  SimulationConfig,
  SimulationMetrics,
  SimulationResult,
  TraceSpan,
} from "./simulation";

export type FlowKind =
  | "request"
  | "success"
  | "wait"
  | "error"
  | "retry"
  | "limited"
  | "cache-hit"
  | "cache-miss";
export type NodeId =
  | "client"
  | "limiter"
  | "gateway"
  | "order"
  | "cache"
  | "inventory"
  | "payment"
  | "queue"
  | "worker";
export type EdgeId =
  | "client-limiter"
  | "limiter-gateway"
  | "client-gateway"
  | "gateway-order"
  | "order-cache"
  | "order-inventory"
  | "order-payment"
  | "order-queue"
  | "queue-worker";

export interface DerivedTopology {
  nodes: NodeId[];
  edges: EdgeId[];
  annotations: Array<{
    target: NodeId | EdgeId;
    label: string;
    state: "enabled" | "open";
  }>;
}

export interface PlaybackEvent {
  id: string;
  requestId: string;
  atMs: number;
  durationMs: number;
  edge: EdgeId;
  reverse: boolean;
  kind: FlowKind;
  label: string;
}

export interface PlaybackTimeline {
  durationMs: number;
  events: PlaybackEvent[];
  sampledRequests: number;
}

export type PaintKind = "success" | "error" | "wait" | "limited";

export interface TracePaint {
  edge: EdgeId;
  kind: PaintKind;
  count: number;
  intensity: number;
}

export const deriveTopology = (
  config: SimulationConfig,
  circuitState: SimulationMetrics["circuitState"],
): DerivedTopology => {
  const nodes: NodeId[] = [
    "client",
    "gateway",
    "order",
    "inventory",
    "payment",
    "queue",
    "worker",
  ];
  const edges: EdgeId[] = [
    "client-gateway",
    "gateway-order",
    "order-inventory",
    "order-payment",
    "order-queue",
    "queue-worker",
  ];
  const annotations: DerivedTopology["annotations"] = [];
  if (config.controls.rateLimit < 1000) {
    nodes.splice(1, 0, "limiter");
    edges.splice(
      edges.indexOf("client-gateway"),
      1,
      "client-limiter",
      "limiter-gateway",
    );
    annotations.push({
      target: "limiter",
      label: `≤ ${config.controls.rateLimit}/s`,
      state: "enabled",
    });
  }
  if (config.controls.cache) {
    nodes.push("cache");
    edges.push("order-cache");
  }
  if (config.controls.retries > 0)
    annotations.push({
      target: "order",
      label: `${config.controls.retries} retry`,
      state: "enabled",
    });
  if (config.controls.circuitBreaker)
    annotations.push({
      target: "order",
      label: circuitState,
      state: circuitState === "open" ? "open" : "enabled",
    });
  if (config.controls.idempotency)
    annotations.push({
      target: "order-queue",
      label: "idempotent",
      state: "enabled",
    });
  return { nodes, edges, annotations };
};

const spanEdge = (span: TraceSpan): EdgeId | undefined => {
  if (span.service === "Cache") return "order-cache";
  if (span.service === "Inventory Service") return "order-inventory";
  if (span.service === "Payment Service") return "order-payment";
  if (span.service === "Queue") return "order-queue";
  return undefined;
};

const spanKind = (span: TraceSpan): FlowKind => {
  if (span.detail === "Hit") return "cache-hit";
  if (span.detail === "Miss") return "cache-miss";
  if (span.status === "timeout" || span.status === "error") return "error";
  if (span.detail.startsWith("Attempt ") && span.detail !== "Attempt 1")
    return "retry";
  return span.durationMs > 350 ? "wait" : "request";
};

export function createPlaybackTimeline(
  result: SimulationResult,
  maxRequests = 12,
): PlaybackTimeline {
  const traces = result.traces.slice(0, maxRequests);
  const events: PlaybackEvent[] = [];
  const spacing = 520;
  traces.forEach((trace, traceIndex) => {
    const base = traceIndex * spacing;
    const requestEdges: EdgeId[] =
      result.config.controls.rateLimit < 1000
        ? ["client-limiter", "limiter-gateway", "gateway-order"]
        : ["client-gateway", "gateway-order"];
    requestEdges.forEach((edge, edgeIndex) =>
      events.push({
        id: `${trace.id}-in-${edgeIndex}`,
        requestId: trace.id,
        atMs: base + edgeIndex * 130,
        durationMs: 360,
        edge,
        reverse: false,
        kind: "request",
        label: `${trace.kind} request`,
      }),
    );
    let cursor = base + requestEdges.length * 130;
    trace.spans.forEach((span, spanIndex) => {
      const edge = spanEdge(span);
      if (!edge) return;
      const kind = spanKind(span);
      events.push({
        id: `${trace.id}-span-${spanIndex}`,
        requestId: trace.id,
        atMs: cursor,
        durationMs: Math.max(260, Math.min(900, span.durationMs * 2)),
        edge,
        reverse: false,
        kind,
        label: `${span.service}: ${span.detail}`,
      });
      if (span.service === "Queue") {
        events.push({
          id: `${trace.id}-worker-${spanIndex}`,
          requestId: trace.id,
          atMs: cursor + 90,
          durationMs: Math.max(300, Math.min(900, span.durationMs * 2)),
          edge: "queue-worker",
          reverse: false,
          kind: span.durationMs > 350 ? "wait" : "request",
          label: "Worker: consume message",
        });
      }
      cursor += Math.max(160, Math.min(600, span.durationMs));
      events.push({
        id: `${trace.id}-return-${spanIndex}`,
        requestId: trace.id,
        atMs: cursor,
        durationMs: 320,
        edge,
        reverse: true,
        kind: span.status === "success" ? "success" : "error",
        label: `${span.service}: ${span.status}`,
      });
      cursor += 120;
    });
    [...requestEdges].reverse().forEach((edge, edgeIndex) =>
      events.push({
        id: `${trace.id}-out-${edgeIndex}`,
        requestId: trace.id,
        atMs: cursor + edgeIndex * 120,
        durationMs: 340,
        edge,
        reverse: true,
        kind:
          trace.outcome === "success"
            ? "success"
            : trace.outcome === "limited"
              ? "limited"
              : "error",
        label: `${trace.kind}: ${trace.outcome}`,
      }),
    );
  });
  if (result.metrics.limited > 0 && result.config.controls.rateLimit < 1000) {
    const limitedCount = Math.min(3, result.metrics.limited);
    for (let index = 0; index < limitedCount; index += 1) {
      events.push({
        id: `limited-${index}`,
        requestId: `limited-${index}`,
        atMs: 220 + index * spacing,
        durationMs: 380,
        edge: "client-limiter",
        reverse: true,
        kind: "limited",
        label: "Rate limiter: rejected",
      });
    }
  }
  return {
    durationMs: 10_000,
    events: events.sort((a, b) => a.atMs - b.atMs || a.id.localeCompare(b.id)),
    sampledRequests: traces.length,
  };
}

const paintKind = (kind: FlowKind): PaintKind | undefined => {
  if (kind === "success" || kind === "cache-hit") return "success";
  if (kind === "error") return "error";
  if (kind === "wait" || kind === "retry" || kind === "cache-miss")
    return "wait";
  if (kind === "limited") return "limited";
  return undefined;
};

export function tracePaintAt(
  timeline: PlaybackTimeline,
  virtualMs: number,
  windowMs = 2000,
): TracePaint[] {
  const aggregates = new Map<string, { count: number; weight: number }>();
  timeline.events.forEach((event) => {
    const kind = paintKind(event.kind);
    const age = virtualMs - event.atMs;
    if (!kind || age < 0 || age > windowMs) return;
    const key = `${event.edge}:${kind}`;
    const current = aggregates.get(key) ?? { count: 0, weight: 0 };
    current.count += 1;
    current.weight += 1 - age / windowMs;
    aggregates.set(key, current);
  });
  return [...aggregates.entries()]
    .map(([key, value]) => {
      const [edge, kind] = key.split(":") as [EdgeId, PaintKind];
      return {
        edge,
        kind,
        count: value.count,
        intensity: Math.min(1, Math.round((value.weight / 3) * 100) / 100),
      };
    })
    .sort(
      (a, b) => a.edge.localeCompare(b.edge) || a.kind.localeCompare(b.kind),
    );
}

export const metricsAt = (
  metrics: SimulationMetrics,
  progress: number,
): SimulationMetrics => {
  const fraction = Math.max(0, Math.min(1, progress));
  const scale = (value: number): number => Math.round(value * fraction);
  if (fraction >= 1) return structuredClone(metrics);
  return {
    ...metrics,
    offered: scale(metrics.offered),
    completed: scale(metrics.completed),
    throughput: Math.round(metrics.throughput * fraction * 10) / 10,
    dependencyRequests: scale(metrics.dependencyRequests),
    queueDepth: scale(metrics.queueDepth),
    timeouts: scale(metrics.timeouts),
    retries: scale(metrics.retries),
    limited: scale(metrics.limited),
    errorRate: Math.round(metrics.errorRate * fraction * 10) / 10,
    cacheHitRatio: fraction === 0 ? 0 : metrics.cacheHitRatio,
  };
};
