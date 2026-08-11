export type TrafficScenario = "low" | "normal" | "cyber" | "dos";
export type ScalingStrategy = "none" | "horizontal" | "vertical";
export type ServiceId =
  "gateway" | "order" | "cache" | "inventory" | "payment" | "worker";

export interface ResourceSnapshot {
  service: ServiceId;
  cpu: number;
  memory: number;
  instances: number;
  capacityPerSecond: number;
  allocation: "standard" | "2x";
  state: "healthy" | "busy" | "saturated";
}

export interface ServicePressure {
  utilization: number;
  errorProbability: number;
  latencyPenaltyMs: number;
}

const scenarioCurves: Record<TrafficScenario, number[]> = {
  low: [10, 11, 9, 12, 10, 11, 9, 10, 12, 10],
  normal: [42, 48, 55, 62, 68, 64, 58, 52, 47, 44],
  cyber: [150, 220, 420, 760, 900, 680, 820, 540, 320, 190],
  dos: [120, 360, 720, 1000, 1000, 1000, 1000, 1000, 920, 820],
};

const requestCost: Record<TrafficScenario, number> = {
  low: 0.9,
  normal: 1,
  cyber: 1.12,
  dos: 1.8,
};

const baseCapacity: Record<ServiceId, number> = {
  gateway: 420,
  order: 260,
  cache: 800,
  inventory: 180,
  payment: 120,
  worker: 20,
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const scenarioArrivals = (
  scenario: TrafficScenario,
  second: number,
  seconds: number,
): number => {
  const curve = scenarioCurves[scenario];
  const index = Math.min(
    curve.length - 1,
    Math.floor((second / Math.max(1, seconds)) * curve.length),
  );
  return curve[index] ?? curve.at(-1) ?? 0;
};

const scale = (
  strategy: ScalingStrategy,
  demand: number,
  perInstance: number,
): { instances: number; multiplier: number } => {
  if (strategy === "vertical") return { instances: 1, multiplier: 2 };
  if (strategy === "horizontal")
    return {
      instances: clamp(Math.ceil(demand / (perInstance * 0.7)), 1, 8),
      multiplier: 1,
    };
  return { instances: 1, multiplier: 1 };
};

export function capacityAt(
  scenario: TrafficScenario,
  strategy: ScalingStrategy,
  accepted: number,
  cacheEnabled: boolean,
  queueDepth: number,
): {
  resources: ResourceSnapshot[];
  pressure: Record<ServiceId, ServicePressure>;
} {
  const cost = requestCost[scenario];
  const browseDemand = accepted * 0.58;
  const demands: Record<ServiceId, number> = {
    gateway: accepted * cost,
    order: accepted * cost,
    cache: cacheEnabled ? browseDemand * 0.35 : 0,
    inventory: accepted * (cacheEnabled ? 0.39 : 0.78) * cost,
    payment: accepted * 0.22 * cost,
    worker: accepted * 0.22 + queueDepth,
  };
  const resources: ResourceSnapshot[] = [];
  const pressure = {} as Record<ServiceId, ServicePressure>;
  (Object.keys(baseCapacity) as ServiceId[]).forEach((service) => {
    const scaled = scale(strategy, demands[service], baseCapacity[service]);
    const capacity =
      baseCapacity[service] * scaled.instances * scaled.multiplier;
    const utilization = capacity === 0 ? 0 : demands[service] / capacity;
    const cpu = Math.round(clamp(utilization * 100, 0, 100));
    const queuePressure =
      service === "worker" ? Math.min(28, queueDepth / 3) : 0;
    const memory = Math.round(clamp(18 + cpu * 0.62 + queuePressure, 0, 100));
    const errorProbability = clamp((utilization - 0.85) / 0.55, 0, 0.9);
    const latencyPenaltyMs = Math.round(
      Math.max(0, utilization - 0.7) ** 2 * 700,
    );
    resources.push({
      service,
      cpu,
      memory,
      instances: scaled.instances,
      capacityPerSecond: Math.round(capacity),
      allocation: scaled.multiplier === 2 ? "2x" : "standard",
      state: cpu >= 95 ? "saturated" : cpu >= 70 ? "busy" : "healthy",
    });
    pressure[service] = { utilization, errorProbability, latencyPenaltyMs };
  });
  return { resources, pressure };
}
