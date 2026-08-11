# Resilient Commerce Lab implementation plan

## Architecture

Astro produces static EN/ES routes. Strict TypeScript domain modules own a virtual clock, seeded PRNG, stable event queue, traffic generation, service/dependency models, resilience state machines, metrics and traces. UI modules consume immutable run results and never invent operational values.

The public topology is Client → API Gateway → Order Service → Inventory and Payment, with Order Service → Cache and Order Service → Queue → Worker. Responsive semantic HTML and SVG present sampled request flow; the customer preview and baseline comparison derive from the same result.

`DerivedTopology` maps existing configuration to visible nodes, edges and annotations. `PlaybackTimeline` maps a bounded deterministic trace sample to visual events. `PlaybackController` translates virtual time to presentation time for play, pause, restart, speed and same-seed continuous replay. None of these modules feeds back into simulation results.

## Model

Events use `(time, sequence)` ordering. A documented seeded generator controls latency, errors and jitter. Traffic is bounded per run. Queue capacity and worker service rate create backpressure. Timeouts race dependencies; retries are bounded and scheduled with exponential backoff plus seeded jitter. Circuit state transitions are explicit. Token-bucket limiting and idempotency records are deterministic.

Metrics aggregate completed events and latency histograms. Traces retain a bounded representative sample. Percentiles use a documented nearest-rank rule. Baseline/current comparison replays identical arrivals and random stream partitions.

The SVG renderer caps concurrent orbs at 12 and uses edge paths for motion. Event kind is encoded by color plus class-specific outline/shape and repeated in an accessible activity log. Reduced motion disables path travel while preserving edge, node and textual state changes.

## Interface and content

The shared warm-neutral palette, Source Serif 4/Inter/JetBrains Mono roles, compact theme disclosure, EN/ES switch and Menu/Menú disclosure are implemented locally. Portfolio/Portafolio is the final navigation destination. The layout is mobile-first at 20rem and uses container queries where panels benefit.

## Verification

Use Vitest for pure deterministic contracts and mechanism state transitions. Run focused tests after each engine milestone. Run formatting, lint, type checking and build at integration milestones. Install/run Playwright only after primary flows stabilize and again before publication. Validate production base paths, two locales, themes, keyboard, reduced motion, desktop and narrow mobile.

## Delivery

Use focused `agent/*` branches, English Conventional Commits, protected pull requests, required validation and squash merges. PRs validate without deployment; Pages deploys only validated `main`. Third-party actions are SHA-pinned with least privilege and explicit concurrency.

The optional local Redis/OpenTelemetry reference is excluded from v1 and from the public-app critical path. It requires separate user authorization plus bounded acceptance criteria before implementation.
