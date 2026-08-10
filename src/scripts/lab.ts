import {
  compare,
  defaultConfig,
  type SimulationResult,
} from "../domain/simulation";

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

function render(result: SimulationResult, baseline: SimulationResult): void {
  const m = result.metrics;
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

function run(): void {
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
  const results = compare(config);
  render(results.current, results.baseline);
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  run();
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
run();
