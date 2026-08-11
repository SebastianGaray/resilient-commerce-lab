import {
  compare,
  defaultConfig,
  type ResourceSnapshot,
  type SimulationConfig,
  type SimulationResult,
} from "../domain/simulation";
import {
  createPlaybackTimeline,
  deriveTopology,
  metricsAt,
  ORB_SPEED,
  tracePaintAt,
  type FlowKind,
  type PaintKind,
  type PlaybackEvent,
  type PlaybackTimeline,
} from "../domain/playback";

const form = document.querySelector<HTMLFormElement>("[data-controls]");
const locale = document.body.dataset.locale === "es" ? "es" : "en";
const text =
  locale === "es"
    ? {
        normal: "La experiencia responde con normalidad.",
        delayed: "El inventario o pago responde con demora.",
        unavailable: "La operación no está disponible temporalmente.",
        limited: "Se limitó la solicitud para proteger capacidad.",
        success: "Correcta",
        error: "Error",
        timeout: "Timeout",
        limitedOutcome: "Limitada",
        request: "solicitud",
        attempts: "solicitudes a dependencias",
        recommendation: "Próximo paso recomendado",
        stableAdvice:
          "La configuración absorbe este escenario. Mantén monitoreo y valida los límites con pruebas de carga.",
        scaleAdvice:
          "Un servicio se saturó con una sola instancia. Activa escalado horizontal y define un máximo acorde al presupuesto.",
        capAdvice:
          "El escalado alcanzó su máximo. Reduce la admisión con rate limiting; aumenta el tope solo tras validar capacidad y presupuesto.",
        errorAdvice:
          "Primero reduce presión con capacidad o rate limiting. Mantén reintentos acotados para no amplificar la carga.",
        limitedAdvice:
          "El rate limit está protegiendo los servicios. Súbelo solo si CPU y memoria conservan margen.",
        latencyAdvice:
          "Identifica el servicio ocupado y agrega capacidad antes de ampliar timeouts.",
        footprint: "Huella de capacidad",
        units: "unidades",
        perService: "máximo por servicio",
      }
    : {
        normal: "The experience responds normally.",
        delayed: "Inventory or payment responds slowly.",
        unavailable: "The operation is temporarily unavailable.",
        limited: "The request was limited to protect capacity.",
        success: "Success",
        error: "Error",
        timeout: "Timeout",
        limitedOutcome: "Limited",
        request: "request",
        attempts: "dependency requests",
        recommendation: "Recommended next move",
        stableAdvice:
          "This configuration absorbs the scenario. Keep monitoring and validate limits with load tests.",
        scaleAdvice:
          "A service saturated on one instance. Enable horizontal scaling and set a budget-aware maximum.",
        capAdvice:
          "Scaling reached its maximum. Reduce admission with rate limiting; raise the cap only after capacity and budget validation.",
        errorAdvice:
          "Reduce pressure with capacity or rate limiting first. Keep retries bounded so they do not amplify load.",
        limitedAdvice:
          "The rate limit is protecting services. Raise it only while CPU and memory retain headroom.",
        latencyAdvice:
          "Identify the busy service and add capacity before widening timeouts.",
        footprint: "Capacity footprint",
        units: "units",
        perService: "maximum per service",
      };

function selected(name: string): HTMLInputElement | HTMLSelectElement {
  const control = form?.elements.namedItem(name);
  if (!(
    control instanceof HTMLInputElement || control instanceof HTMLSelectElement
  ))
    throw new Error(`Missing ${name}`);
  return control;
}

function render(
  result: SimulationResult,
  baseline: SimulationResult,
  liveMetrics = result.metrics,
): void {
  const m = liveMetrics;
  const labels =
    locale === "es"
      ? [
          "Throughput",
          "Latencia p50",
          "Latencia p95",
          "Latencia p99",
          "Tasa de error",
          "Aciertos de caché",
          "Cola",
          "Timeouts",
          "Reintentos",
          "Circuito",
        ]
      : [
          "Throughput",
          "p50 latency",
          "p95 latency",
          "p99 latency",
          "Error rate",
          "Cache hit ratio",
          "Queue depth",
          "Timeouts",
          "Retries",
          "Circuit",
        ];
  const values = [
    `${m.throughput}/s`,
    `${m.p50} ms`,
    `${m.p95} ms`,
    `${m.p99} ms`,
    `${m.errorRate}%`,
    `${m.cacheHitRatio}%`,
    String(m.queueDepth),
    String(m.timeouts),
    String(m.retries),
    m.circuitState,
  ];
  const metrics = document.querySelector<HTMLElement>("[data-metrics]");
  if (metrics)
    metrics.innerHTML = labels
      .map(
        (label, index) =>
          `<article><span>${label}</span><strong>${values[index]}</strong></article>`,
      )
      .join("");

  const activity = document.querySelector<HTMLElement>("[data-activity]");
  if (activity)
    activity.innerHTML = result.activity
      .map(
        (item) =>
          `<li><span>${item.edge}</span><strong>${item.count}</strong><em>${item.state}</em></li>`,
      )
      .join("");

  const customer = document.querySelector<HTMLElement>("[data-customer-state]");
  if (customer) {
    const state =
      m.limited > 0
        ? "limited"
        : m.errorRate > 20
          ? "unavailable"
          : m.p95 > 500
            ? "delayed"
            : "normal";
    customer.dataset.state = state;
    customer.innerHTML = `<span class="status">${state}</span><strong>${state === "normal" ? text.normal : state === "delayed" ? text.delayed : state === "limited" ? text.limited : text.unavailable}</strong><small>${m.completed} ${text.request}${m.completed === 1 ? "" : "s"} · ${m.dependencyRequests} ${text.attempts}</small>`;
  }

  const recommendation = document.querySelector<HTMLElement>(
    "[data-recommendation]",
  );
  if (recommendation) {
    const saturated = result.resources.some(
      (item) => item.service !== "cache" && item.state === "saturated",
    );
    const atHorizontalCap =
      result.config.scaling === "horizontal" &&
      result.resources.some(
        (item) =>
          item.state === "saturated" &&
          item.instances >= result.config.maxInstances,
      );
    const advice =
      m.errorRate > 0
        ? atHorizontalCap
          ? text.capAdvice
          : result.config.scaling === "none" && saturated
            ? text.scaleAdvice
            : text.errorAdvice
        : m.limited > 0
          ? text.limitedAdvice
          : m.p95 > 500
            ? text.latencyAdvice
            : text.stableAdvice;
    recommendation.innerHTML = `<strong>${text.recommendation}</strong><p>${advice}</p>`;
  }

  const comparison = document.querySelector<HTMLElement>("[data-comparison]");
  if (comparison)
    comparison.innerHTML = `<table><thead><tr><th>${locale === "es" ? "Métrica" : "Metric"}</th><th>${locale === "es" ? "Base" : "Baseline"}</th><th>${locale === "es" ? "Actual" : "Current"}</th></tr></thead><tbody><tr><th>p95</th><td>${baseline.metrics.p95} ms</td><td>${m.p95} ms</td></tr><tr><th>${locale === "es" ? "Errores" : "Errors"}</th><td>${baseline.metrics.errorRate}%</td><td>${m.errorRate}%</td></tr><tr><th>${locale === "es" ? "Reintentos" : "Retries"}</th><td>${baseline.metrics.retries}</td><td>${m.retries}</td></tr></tbody></table>`;

  const traces = document.querySelector<HTMLElement>("[data-traces]");
  if (traces)
    traces.innerHTML = result.traces
      .slice(0, 6)
      .map(
        (trace) =>
          `<details class="trace"><summary><code>${trace.id}</code><span>${trace.kind}</span><strong>${trace.durationMs} ms · ${trace.outcome}</strong></summary><ol>${trace.spans.map((span) => `<li><span>${span.service}</span><code>+${span.startMs % 1000} ms / ${span.durationMs} ms</code><em>${span.detail} · ${span.status}</em></li>`).join("")}</ol></details>`,
      )
      .join("");

  renderResources(
    result.resources,
    result.config.scaling,
    result.config.maxInstances,
    result.config.controls.cache,
  );
}

function renderResources(
  resources: ResourceSnapshot[],
  scaling: SimulationConfig["scaling"],
  maxInstances: number,
  cacheEnabled: boolean,
): void {
  const container = document.querySelector<HTMLElement>("[data-resources]");
  if (!container) return;
  const serviceNames: Record<ResourceSnapshot["service"], string> = {
    gateway: "API Gateway",
    order: "Order Service",
    cache: locale === "es" ? "Caché" : "Cache",
    inventory: locale === "es" ? "Inventario" : "Inventory",
    payment: locale === "es" ? "Pagos" : "Payment",
    worker: "Worker",
  };
  const stateNames =
    locale === "es"
      ? { healthy: "saludable", busy: "ocupado", saturated: "saturado" }
      : { healthy: "healthy", busy: "busy", saturated: "saturated" };
  const visibleResources = resources.filter(
    (item) => item.service !== "cache" || cacheEnabled,
  );
  container.innerHTML = visibleResources
    .map((item) => {
      const scaleText =
        scaling === "horizontal"
          ? `${item.instances} ${
              locale === "es"
                ? item.instances === 1
                  ? "instancia"
                  : "instancias"
                : item.instances === 1
                  ? "instance"
                  : "instances"
            }`
          : scaling === "vertical"
            ? `${locale === "es" ? "1 instancia · capacidad 2×" : "1 instance · 2× capacity"}`
            : `${locale === "es" ? "1 instancia" : "1 instance"}`;
      return `<article data-state="${item.state}"><strong>${serviceNames[item.service]}</strong><span>CPU ${item.cpu}% · ${locale === "es" ? "memoria" : "memory"} ${item.memory}%</span><small>${scaleText} · ${stateNames[item.state]}</small></article>`;
    })
    .join("");
  const cost = document.querySelector<HTMLElement>("[data-capacity-cost]");
  if (cost) {
    const units = visibleResources.reduce(
      (total, item) => total + (item.allocation === "2x" ? 2 : item.instances),
      0,
    );
    cost.textContent = `${text.footprint}: ${units} ${text.units}${
      scaling === "horizontal" ? ` · ${maxInstances} ${text.perService}` : ""
    }`;
  }
  const maxControl = document.querySelector<HTMLElement>(
    "[data-horizontal-limit]",
  );
  if (maxControl) maxControl.hidden = scaling !== "horizontal";
}

function readConfig(): SimulationConfig {
  const config = defaultConfig();
  config.scenario = selected("scenario").value as typeof config.scenario;
  config.scaling = selected("scaling").value as typeof config.scaling;
  config.maxInstances = Number(selected("maxInstances").value);
  config.seed = Number(selected("seed").value);
  config.controls.cache = (selected("cache") as HTMLInputElement).checked;
  config.controls.timeoutMs = Number(selected("timeout").value);
  config.controls.retries = Number(selected("retries").value);
  config.controls.jitter = (selected("jitter") as HTMLInputElement).checked;
  config.controls.circuitBreaker = (
    selected("circuit") as HTMLInputElement
  ).checked;
  config.controls.rateLimit = Number(selected("limit").value);
  config.controls.idempotency = (
    selected("idempotency") as HTMLInputElement
  ).checked;
  return config;
}

let results = compare(readConfig());
let timeline: PlaybackTimeline = createPlaybackTimeline(results.current);
let virtualMs = 0;
let playing = false;
let previousFrame = 0;
let frameHandle = 0;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const svgNamespace = "http://www.w3.org/2000/svg";

function updatePlayButton(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-play]");
  if (!button) return;
  button.textContent = playing
    ? (button.dataset.pauseLabel ?? "Pause")
    : (button.dataset.playLabel ?? "Play");
  button.setAttribute("aria-pressed", String(playing));
}

function renderTopology(): void {
  const topology = deriveTopology(
    results.current.config,
    results.current.metrics.circuitState,
  );
  document.querySelectorAll<SVGGElement>("[data-node]").forEach((node) => {
    node.toggleAttribute(
      "hidden",
      !topology.nodes.includes(node.dataset.node as never),
    );
  });
  document.querySelectorAll<SVGPathElement>("[data-edge]").forEach((edge) => {
    edge.toggleAttribute(
      "hidden",
      !topology.edges.includes(edge.dataset.edge as never),
    );
    edge.classList.remove("active");
  });
  const annotations = document.querySelector<SVGGElement>("[data-annotations]");
  if (!annotations) return;
  annotations.replaceChildren();
  const anchors: Record<string, [number, number]> = {
    limiter: [170, 132],
    order: [445, 132],
    "order-inventory": [555, 126],
    "order-payment": [555, 226],
    "order-queue": [470, 250],
    cache: [445, 24],
    inventory: [675, 30],
    payment: [675, 140],
    worker: [695, 250],
  };
  const counts = new Map<string, number>();
  topology.annotations.forEach((item) => {
    const anchor = anchors[item.target];
    if (!anchor) return;
    const stack = counts.get(item.target) ?? 0;
    counts.set(item.target, stack + 1);
    const label = localizeAnnotation(item.label);
    const width = Math.max(78, Math.min(154, label.length * 7 + 20));
    const group = document.createElementNS(svgNamespace, "g");
    group.setAttribute("class", "diagram-badge");
    group.dataset.state = item.state;
    group.setAttribute(
      "transform",
      `translate(${anchor[0] - width / 2} ${anchor[1] - stack * 28})`,
    );
    const rect = document.createElementNS(svgNamespace, "rect");
    rect.setAttribute("width", String(width));
    rect.setAttribute("height", "22");
    rect.setAttribute("rx", "11");
    const labelNode = document.createElementNS(svgNamespace, "text");
    labelNode.setAttribute("x", String(width / 2));
    labelNode.setAttribute("y", "15");
    labelNode.textContent = label;
    group.append(rect, labelNode);
    annotations.append(group);
  });
}

function localizeAnnotation(label: string): string {
  if (label.startsWith("\u2264"))
    return `${locale === "es" ? "LÃ­mite" : "Rate"} ${label}`;
  if (label.endsWith("retry")) {
    const count = label.split(" ")[0];
    return `${locale === "es" ? "Reintentos" : "Retries"}: ${count}`;
  }
  if (["closed", "open", "half-open"].includes(label))
    return `${locale === "es" ? "Circuito" : "Circuit breaker"}: ${label}`;
  if (label === "idempotent")
    return locale === "es" ? "Idempotencia" : "Idempotency";
  return label;
}

function orbShape(kind: FlowKind): SVGElement {
  if (kind === "retry") {
    const shape = document.createElementNS(svgNamespace, "polygon");
    shape.setAttribute("points", "0,-7 7,0 0,7 -7,0");
    return shape;
  }
  if (kind === "error" || kind === "limited") {
    const shape = document.createElementNS(svgNamespace, "rect");
    shape.setAttribute("x", "-6");
    shape.setAttribute("y", "-6");
    shape.setAttribute("width", "12");
    shape.setAttribute("height", "12");
    return shape;
  }
  const shape = document.createElementNS(svgNamespace, "circle");
  shape.setAttribute("r", kind === "cache-miss" ? "7" : "6");
  return shape;
}

function renderOrbs(active: PlaybackEvent[]): void {
  const layer = document.querySelector<SVGGElement>("[data-orbs]");
  if (!layer) return;
  layer.replaceChildren();
  if (reducedMotion.matches) return;
  active.slice(0, 12).forEach((event) => {
    const path = document.querySelector<SVGPathElement>(
      `[data-edge="${event.edge}"]`,
    );
    if (!path || path.hasAttribute("hidden")) return;
    const fraction = Math.max(
      0,
      Math.min(1, (virtualMs - event.atMs) / (event.durationMs / ORB_SPEED)),
    );
    const point = path.getPointAtLength(
      path.getTotalLength() * (event.reverse ? 1 - fraction : fraction),
    );
    const shape = orbShape(event.kind);
    shape.setAttribute("class", `flow-orb flow-${event.kind}`);
    shape.setAttribute("transform", `translate(${point.x} ${point.y})`);
    layer.append(shape);
    path.classList.add("active");
  });
}

function renderTracePaint(): void {
  const layer = document.querySelector<SVGGElement>("[data-trace-paint]");
  if (!layer) return;
  layer.replaceChildren();
  const paint = tracePaintAt(timeline, virtualMs);
  const offsets: Record<PaintKind, number> = {
    success: -5,
    error: -1.5,
    wait: 2,
    limited: 5.5,
  };
  paint.forEach((item) => {
    const source = document.querySelector<SVGPathElement>(
      `[data-edge="${item.edge}"]`,
    );
    const d = source?.getAttribute("d");
    if (!source || !d || source.hasAttribute("hidden")) return;
    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", d);
    path.setAttribute("class", `trace-layer trace-${item.kind}`);
    path.setAttribute("transform", `translate(0 ${offsets[item.kind]})`);
    path.style.setProperty(
      "--trace-opacity",
      String(0.12 + item.intensity * 0.58),
    );
    path.style.setProperty("--trace-width", String(4 + item.intensity * 9));
    layer.append(path);
  });
}

function renderPlayback(): void {
  document
    .querySelectorAll<SVGPathElement>("[data-edge]")
    .forEach((edge) => edge.classList.remove("active"));
  const active = timeline.events.filter(
    (event) =>
      virtualMs >= event.atMs &&
      virtualMs < event.atMs + event.durationMs / ORB_SPEED,
  );
  renderTracePaint();
  renderOrbs(active);
  if (reducedMotion.matches)
    active.forEach((event) =>
      document
        .querySelector<SVGPathElement>(`[data-edge="${event.edge}"]`)
        ?.classList.add("active"),
    );
  const progress =
    timeline.durationMs === 0 ? 1 : virtualMs / timeline.durationMs;
  render(
    results.current,
    results.baseline,
    metricsAt(results.current.metrics, progress),
  );
  const activity = document.querySelector<HTMLElement>("[data-activity]");
  if (activity)
    activity.innerHTML = (
      active.length
        ? active.slice(-5)
        : timeline.events.filter((event) => event.atMs <= virtualMs).slice(-5)
    )
      .map(
        (event) =>
          `<li><span>${event.requestId}</span><strong>${event.label}</strong><em>${event.kind}</em></li>`,
      )
      .join("");
  const time = document.querySelector<HTMLElement>("[data-playback-time]");
  const progressElement = document.querySelector<HTMLProgressElement>(
    "[data-playback-progress]",
  );
  if (time) time.textContent = `${(virtualMs / 1000).toFixed(1)} s`;
  if (progressElement) {
    progressElement.value = Math.round(progress * 100);
    progressElement.textContent = `${Math.round(progress * 100)}%`;
  }
}

function prepare(autoplay: boolean): void {
  results = compare(readConfig());
  timeline = createPlaybackTimeline(results.current);
  virtualMs = 0;
  previousFrame = 0;
  playing = autoplay;
  updatePlayButton();
  renderTopology();
  renderPlayback();
  if (playing) frameHandle = requestAnimationFrame(tick);
}

function tick(timestamp: number): void {
  if (!playing) return;
  if (previousFrame === 0) previousFrame = timestamp;
  virtualMs = Math.min(
    timeline.durationMs,
    virtualMs + (timestamp - previousFrame),
  );
  previousFrame = timestamp;
  renderPlayback();
  if (virtualMs >= timeline.durationMs) {
    if (selected("mode").value === "continuous") {
      virtualMs = 0;
      previousFrame = timestamp;
    } else {
      playing = false;
      updatePlayButton();
      return;
    }
  }
  frameHandle = requestAnimationFrame(tick);
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (playing) {
    playing = false;
    cancelAnimationFrame(frameHandle);
    updatePlayButton();
  } else if (virtualMs >= timeline.durationMs) prepare(true);
  else {
    playing = true;
    previousFrame = 0;
    updatePlayButton();
    frameHandle = requestAnimationFrame(tick);
  }
});
form?.addEventListener("change", (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  const loopNote = document.querySelector<HTMLElement>("[data-loop-note]");
  if (target.name === "mode") {
    if (loopNote) loopNote.hidden = target.value !== "continuous";
    return;
  }
  playing = false;
  cancelAnimationFrame(frameHandle);
  prepare(false);
});
const media = matchMedia("(prefers-color-scheme: dark)");
const applyTheme = (preference: string): void => {
  const valid =
    preference === "light" || preference === "dark" ? preference : "system";
  document.documentElement.dataset.themePreference = valid;
  document.documentElement.dataset.theme =
    valid === "system" ? (media.matches ? "dark" : "light") : valid;
  if (valid === "system") localStorage.removeItem("rcl-theme");
  else localStorage.setItem("rcl-theme", valid);
  document
    .querySelectorAll<HTMLButtonElement>("[data-theme-value]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.themeValue === valid),
      ),
    );
  const current = document.querySelector<HTMLElement>("[data-theme-current]");
  const active = document.querySelector<HTMLButtonElement>(
    `[data-theme-value="${valid}"]`,
  );
  if (current && active) current.textContent = active.textContent;
};
document
  .querySelectorAll<HTMLButtonElement>("[data-theme-value]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      applyTheme(button.dataset.themeValue ?? "system");
      document.querySelector("[data-theme-control]")?.removeAttribute("open");
    }),
  );
media.addEventListener("change", () => {
  if (document.documentElement.dataset.themePreference === "system")
    applyTheme("system");
});
applyTheme(document.documentElement.dataset.themePreference ?? "system");
prepare(false);
