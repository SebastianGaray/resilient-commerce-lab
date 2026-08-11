# Resilient Commerce Lab

An interactive deterministic simulation for examining how traffic, dependency degradation and bounded resilience controls affect a commerce request path. The public demo produces simulated metrics and traces; it is not production telemetry or a capacity benchmark.

Public URL after the first validated deployment: <https://sebastiangaray.github.io/resilient-commerce-lab/>

## Features

- Seeded discrete-event results with constant, ramp, burst and flash-sale traffic.
- Fault injection for inventory, payments, cache and asynchronous workers.
- Cache, timeout, retry/backoff/jitter, circuit-breaker, rate-limit and idempotency controls.
- Live topology derived from those controls, with bounded color-coded request-flow playback.
- Traffic up to 1,000 requests per second, named rate-limit presets, anchored mechanism bubbles, stable recent activity and bilingual contextual help.
- Fixed ten-second playback with half-speed orbs and bounded, decaying outcome paint that keeps mixed connection results distinct.
- Metrics, representative traces, baseline comparison and customer-impact preview derived from one run.
- English and Spanish routes, true System/Light/Dark themes, reduced motion and mobile-first layout.

## Quick start

Requires Node.js 22.12 or newer.

```bash
npm ci
npm run dev
```

Use `npm test` for deterministic domain tests and `npm run test:e2e` for browser flows. `npm run build` verifies the production base path.

## Architecture and limitations

Astro emits a static site. Strict TypeScript runs the bounded model in the browser; no backend or runtime service receives visitor data. The model deliberately omits network phases, distributed coordination, durable transactions, autoscaling and production-specific policy selection. See [the specification](sdd/spec.md), [implementation plan](sdd/plan.md), [task evidence](sdd/tasks.md) and [primary references](docs/references.md).

## Development workflow

Development uses focused `agent/*` branches, pull requests, required validation and squash merges into protected `main`. Pages deployment runs only for validated default-branch commits. Do not push directly to `main` or bypass pending checks.

## License

MIT
