import {
  compare,
  defaultConfig,
  type SimulationConfig,
  type SimulationResult,
} from "../domain/simulation";
import {
  createPlaybackTimeline,
  deriveTopology,
  metricsAt,
  type FlowKind,
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
}

function readConfig(): SimulationConfig {
  const config = defaultConfig();
  config.requestsPerSecond = Number(selected("rate").value);
  config.pattern = selected("pattern").value as typeof config.pattern;
  config.seed = Number(selected("seed").value);
  config.fault.target = selected("fault").value as typeof config.fault.target;
  config.fault.intensity = Number(selected("intensity").value);
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
  const annotations = document.querySelector<HTMLElement>("[data-annotations]");
  if (annotations)
    annotations.innerHTML = topology.annotations
      .map(
        (item) =>
          `<span data-state="${item.state}"><strong>${item.target}</strong> ${item.label}</span>`,
      )
      .join("");
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
      Math.min(1, (virtualMs - event.atMs) / event.durationMs),
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

function renderPlayback(): void {
  document
    .querySelectorAll<SVGPathElement>("[data-edge]")
    .forEach((edge) => edge.classList.remove("active"));
  const active = timeline.events.filter(
    (event) =>
      virtualMs >= event.atMs && virtualMs < event.atMs + event.durationMs,
  );
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
        ? active
        : timeline.events.filter((event) => event.atMs <= virtualMs).slice(-4)
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
  renderTopology();
  renderPlayback();
  if (playing) frameHandle = requestAnimationFrame(tick);
}

function tick(timestamp: number): void {
  if (!playing) return;
  if (previousFrame === 0) previousFrame = timestamp;
  const speed = Number(selected("speed").value);
  virtualMs = Math.min(
    timeline.durationMs,
    virtualMs + (timestamp - previousFrame) * speed,
  );
  previousFrame = timestamp;
  renderPlayback();
  if (virtualMs >= timeline.durationMs) {
    if (selected("mode").value === "continuous") {
      virtualMs = 0;
      previousFrame = timestamp;
    } else {
      playing = false;
      return;
    }
  }
  frameHandle = requestAnimationFrame(tick);
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (virtualMs >= timeline.durationMs) prepare(true);
  else if (!playing) {
    playing = true;
    previousFrame = 0;
    frameHandle = requestAnimationFrame(tick);
  }
});
document.querySelector("[data-pause]")?.addEventListener("click", () => {
  playing = false;
  cancelAnimationFrame(frameHandle);
});
document.querySelector("[data-restart]")?.addEventListener("click", () => {
  playing = false;
  cancelAnimationFrame(frameHandle);
  virtualMs = 0;
  previousFrame = 0;
  renderPlayback();
});
form?.addEventListener("change", (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  if (target.name === "speed") return;
  const loopNote = document.querySelector<HTMLElement>("[data-loop-note]");
  if (target.name === "mode") {
    if (loopNote) loopNote.hidden = target.value !== "continuous";
    return;
  }
  playing = false;
  cancelAnimationFrame(frameHandle);
  prepare(false);
});
selected("rate").addEventListener("input", (event) => {
  const output = document.querySelector("[data-rate-output]");
  if (output)
    output.textContent = (event.currentTarget as HTMLInputElement).value;
});
selected("intensity").addEventListener("input", (event) => {
  const output = document.querySelector("[data-intensity-output]");
  if (output)
    output.textContent = `${(event.currentTarget as HTMLInputElement).value}%`;
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
