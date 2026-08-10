export type TrafficPattern = "constant" | "ramp" | "burst" | "flash";
export type CircuitState = "closed" | "open" | "half-open";
export type Outcome = "success" | "error" | "timeout" | "limited";

export interface SimulationConfig {
  seed: number;
  durationMs: number;
  requestsPerSecond: number;
  pattern: TrafficPattern;
  fault: {
    target: "none" | "inventory" | "payment" | "cache" | "worker";
    intensity: number;
  };
  controls: {
    cache: boolean;
    timeoutMs: number;
    retries: number;
    backoffMs: number;
    jitter: boolean;
    circuitBreaker: boolean;
    rateLimit: number;
    idempotency: boolean;
  };
}

export interface TraceSpan {
  service: string;
  startMs: number;
  durationMs: number;
  status: Outcome;
  detail: string;
}

export interface RequestTrace {
  id: string;
  kind: "browse" | "cart" | "order";
  outcome: Outcome;
  durationMs: number;
  spans: TraceSpan[];
}

export interface SimulationMetrics {
  offered: number;
  completed: number;
  throughput: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  dependencyRequests: number;
  cacheHitRatio: number;
  queueDepth: number;
  timeouts: number;
  retries: number;
  limited: number;
  circuitState: CircuitState;
}

export interface SimulationResult {
  config: SimulationConfig;
  metrics: SimulationMetrics;
  traces: RequestTrace[];
  activity: Array<{
    edge: string;
    count: number;
    state: "normal" | "degraded" | "blocked";
  }>;
}

const DEFAULT_CONFIG: SimulationConfig = {
  seed: 42,
  durationMs: 10_000,
  requestsPerSecond: 24,
  pattern: "constant",
  fault: { target: "none", intensity: 0 },
  controls: {
    cache: true,
    timeoutMs: 650,
    retries: 1,
    backoffMs: 90,
    jitter: true,
    circuitBreaker: true,
    rateLimit: 48,
    idempotency: true,
  },
};

export const defaultConfig = (): SimulationConfig =>
  structuredClone(DEFAULT_CONFIG);

class Random {
  constructor(private state: number) {
    this.state = state >>> 0 || 0x9e3779b9;
  }
  next(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 0x1_0000_0000;
  }
}

const percentile = (values: number[], fraction: number): number => {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  return Math.round(
    ordered[Math.max(0, Math.ceil(fraction * ordered.length) - 1)] ?? 0,
  );
};

const trafficMultiplier = (
  pattern: TrafficPattern,
  progress: number,
): number => {
  if (pattern === "ramp") return 0.5 + progress;
  if (pattern === "burst")
    return progress > 0.42 && progress < 0.62 ? 2.6 : 0.65;
  if (pattern === "flash")
    return progress < 0.18 ? 0.45 : progress < 0.72 ? 2.1 : 0.9;
  return 1;
};

const requestKind = (random: Random): RequestTrace["kind"] => {
  const value = random.next();
  return value < 0.58 ? "browse" : value < 0.78 ? "cart" : "order";
};

export function simulate(input: SimulationConfig): SimulationResult {
  const config = structuredClone(input);
  const random = new Random(config.seed);
  const seconds = Math.max(1, Math.round(config.durationMs / 1000));
  const latencies: number[] = [];
  const traces: RequestTrace[] = [];
  let offered = 0;
  let completed = 0;
  let failures = 0;
  let limited = 0;
  let retries = 0;
  let timeouts = 0;
  let dependencyRequests = 0;
  let cacheHits = 0;
  let cacheLookups = 0;
  let queueDepth = 0;
  let consecutiveFailures = 0;
  let circuitState: CircuitState = "closed";
  let circuitOpenedAt = -1;

  for (let second = 0; second < seconds; second += 1) {
    const progress = seconds === 1 ? 0 : second / (seconds - 1);
    const arrivals = Math.round(
      config.requestsPerSecond * trafficMultiplier(config.pattern, progress),
    );
    offered += arrivals;
    const accepted = Math.min(arrivals, Math.max(0, config.controls.rateLimit));
    limited += arrivals - accepted;

    for (let index = 0; index < accepted; index += 1) {
      const id = `req-${second.toString(36)}-${index.toString(36)}`;
      const kind = requestKind(random);
      const spans: TraceSpan[] = [];
      let now = second * 1000;
      const gatewayLatency = 8 + Math.round(random.next() * 8);
      spans.push({
        service: "API Gateway",
        startMs: now,
        durationMs: gatewayLatency,
        status: "success",
        detail: "Accepted",
      });
      now += gatewayLatency;

      if (circuitState === "open" && now - circuitOpenedAt > 1800)
        circuitState = "half-open";
      const dependency =
        kind === "order" ? "Payment Service" : "Inventory Service";
      const target = kind === "order" ? "payment" : "inventory";
      let cacheHit = false;
      if (kind === "browse" && config.controls.cache) {
        cacheLookups += 1;
        cacheHit = config.fault.target !== "cache" && random.next() < 0.68;
        if (cacheHit) cacheHits += 1;
        spans.push({
          service: "Cache",
          startMs: now,
          durationMs: cacheHit ? 4 : 9,
          status: "success",
          detail: cacheHit ? "Hit" : "Miss",
        });
        now += cacheHit ? 4 : 9;
      }

      let outcome: Outcome = "success";
      let attempt = 0;
      if (!cacheHit) {
        const circuitBlocks =
          config.controls.circuitBreaker && circuitState === "open";
        if (circuitBlocks) {
          outcome = "error";
          spans.push({
            service: dependency,
            startMs: now,
            durationMs: 1,
            status: "error",
            detail: "Circuit open",
          });
        } else {
          while (attempt <= config.controls.retries) {
            dependencyRequests += 1;
            const faultActive = config.fault.target === target;
            const intensity = faultActive
              ? Math.min(100, Math.max(0, config.fault.intensity)) / 100
              : 0;
            const latency = Math.round(
              45 + random.next() * 85 + intensity * 850,
            );
            const dependencyFails =
              faultActive && random.next() < intensity * 0.72;
            const timedOut = latency > config.controls.timeoutMs;
            outcome = timedOut
              ? "timeout"
              : dependencyFails
                ? "error"
                : "success";
            spans.push({
              service: dependency,
              startMs: now,
              durationMs: Math.min(latency, config.controls.timeoutMs),
              status: outcome,
              detail: `Attempt ${attempt + 1}`,
            });
            now += Math.min(latency, config.controls.timeoutMs);
            if (outcome === "success") break;
            if (timedOut) timeouts += 1;
            if (attempt >= config.controls.retries) break;
            attempt += 1;
            retries += 1;
            const jitter = config.controls.jitter
              ? Math.round(random.next() * config.controls.backoffMs)
              : 0;
            now += config.controls.backoffMs * 2 ** (attempt - 1) + jitter;
          }
        }
      }

      if (kind === "order" && outcome === "success") {
        const duplicatePenalty = config.controls.idempotency
          ? 0
          : random.next() < 0.08
            ? 1
            : 0;
        queueDepth += 1 + duplicatePenalty;
        spans.push({
          service: "Queue",
          startMs: now,
          durationMs: 6,
          status: "success",
          detail: duplicatePenalty ? "Duplicate enqueued" : "Enqueued",
        });
        now += 6;
      }

      if (config.controls.circuitBreaker) {
        consecutiveFailures =
          outcome === "success" ? 0 : consecutiveFailures + 1;
        if (
          (circuitState === "closed" && consecutiveFailures >= 5) ||
          (circuitState === "half-open" && outcome !== "success")
        ) {
          circuitState = "open";
          circuitOpenedAt = now;
        } else if (circuitState === "half-open" && outcome === "success") {
          circuitState = "closed";
          consecutiveFailures = 0;
        }
      }

      const serviceLatency = 18 + Math.round(random.next() * 20);
      now += serviceLatency;
      const duration = now - second * 1000;
      latencies.push(duration);
      completed += 1;
      if (outcome !== "success") failures += 1;
      if (traces.length < 24 && (index === 0 || outcome !== "success"))
        traces.push({ id, kind, outcome, durationMs: duration, spans });
    }

    const workerCapacity =
      config.fault.target === "worker"
        ? Math.max(1, Math.round(7 * (1 - config.fault.intensity / 120)))
        : 7;
    queueDepth = Math.max(0, queueDepth - workerCapacity);
  }

  const metrics: SimulationMetrics = {
    offered,
    completed,
    throughput: Math.round((completed / seconds) * 10) / 10,
    errorRate:
      completed === 0
        ? 0
        : Math.round(((failures + limited) / offered) * 1000) / 10,
    p50: percentile(latencies, 0.5),
    p95: percentile(latencies, 0.95),
    p99: percentile(latencies, 0.99),
    dependencyRequests,
    cacheHitRatio:
      cacheLookups === 0
        ? 0
        : Math.round((cacheHits / cacheLookups) * 1000) / 10,
    queueDepth,
    timeouts,
    retries,
    limited,
    circuitState,
  };

  const degraded = failures + timeouts > 0;
  return {
    config,
    metrics,
    traces,
    activity: [
      {
        edge: "client-gateway",
        count: offered,
        state: limited ? "degraded" : "normal",
      },
      {
        edge: "gateway-order",
        count: completed,
        state: degraded ? "degraded" : "normal",
      },
      {
        edge: "order-dependency",
        count: dependencyRequests,
        state:
          circuitState === "open"
            ? "blocked"
            : degraded
              ? "degraded"
              : "normal",
      },
      {
        edge: "order-queue",
        count: metrics.queueDepth,
        state: metrics.queueDepth > 20 ? "degraded" : "normal",
      },
    ],
  };
}

export function compare(config: SimulationConfig): {
  baseline: SimulationResult;
  current: SimulationResult;
} {
  const baseline = defaultConfig();
  baseline.seed = config.seed;
  baseline.durationMs = config.durationMs;
  baseline.requestsPerSecond = config.requestsPerSecond;
  baseline.pattern = config.pattern;
  return { baseline: simulate(baseline), current: simulate(config) };
}
