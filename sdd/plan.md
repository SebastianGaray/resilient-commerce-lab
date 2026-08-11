# Resilient Commerce Lab implementation plan

## Architecture

Astro produces static EN/ES routes. Strict TypeScript domain modules own a virtual clock, seeded PRNG, stable event queue, traffic generation, service/dependency models, resilience state machines, metrics and traces. UI modules consume immutable run results and never invent operational values.

The public topology is Client → API Gateway → Order Service → Inventory and Payment, with Order Service → Cache and Order Service → Queue → Worker. Responsive semantic HTML and SVG present sampled request flow; the customer preview and baseline comparison derive from the same result.

`DerivedTopology` maps existing configuration to visible nodes, edges and annotations. `PlaybackTimeline` maps a bounded deterministic trace sample to visual events. `PlaybackController` advances a fixed ten-second virtual clock at real time while rendering orb travel at a fixed half speed, and supports play, pause, restart and same-seed continuous replay. None of these modules feeds back into simulation results.

## Model

Events use `(time, sequence)` ordering. A documented seeded generator controls latency, errors and jitter. Traffic is bounded per run. Queue capacity and worker service rate create backpressure. Timeouts race dependencies; retries are bounded and scheduled with exponential backoff plus seeded jitter. Circuit state transitions are explicit. Token-bucket limiting and idempotency records are deterministic.

`capacity.ts` owns scenario arrival curves, request-cost weights, per-service capacities, CPU/memory estimates and scaling. Horizontal desired replicas use `ceil(demand / (perInstanceCapacity × 0.70))` capped at eight. Vertical scaling keeps one instance and doubles capacity. Error probability grows only above 85% modeled utilization, while a quadratic latency penalty begins above 70%; these are transparent educational heuristics, not capacity recommendations.

Metrics aggregate completed events and latency histograms. Traces retain a bounded representative sample. Percentiles use a documented nearest-rank rule. Baseline/current comparison replays identical arrivals and random stream partitions.

The SVG renderer caps concurrent orbs at 12 and uses edge paths for motion. Event kind is encoded by color plus class-specific outline/shape and repeated in an accessible activity log. Reduced motion disables path travel while preserving edge, node and textual state changes.

The simulator accepts up to 1,000 arrivals and accepted requests per second, but retains only bounded trace and playback samples. SVG mechanism badges use predefined anchor coordinates for each node or edge. Native popovers provide localized section-level glossaries, and the activity region reserves five rows while rendering only the latest five events.

Recent flow paint is derived from timeline events in a sliding two-second virtual window. It aggregates weighted counts into four outcome categories per edge and renders no more than 36 SVG paths. Offset dotted strokes keep mixed outcomes distinct; intensity and width decay as events leave the window.

The controls expose scenario and scaling rather than raw patterns or injected faults. Resilience controls follow request order: entry, dependency calls, data access and asynchronous work. A stable resource grid reports peak CPU, memory, instance count and state without changing diagram topology; recent paint remains visual with activity as its textual equivalent.

## Interface and content

The shared warm-neutral palette, Source Serif 4/Inter/JetBrains Mono roles, compact theme disclosure, EN/ES switch and Menu/Menú disclosure are implemented locally. Portfolio/Portafolio is the final navigation destination. The layout is mobile-first at 20rem and uses container queries where panels benefit.

## Verification

Use Vitest for pure deterministic contracts and mechanism state transitions. Run focused tests after each engine milestone. Run formatting, lint, type checking and build at integration milestones. Install/run Playwright only after primary flows stabilize and again before publication. Validate production base paths, two locales, themes, keyboard, reduced motion, desktop and narrow mobile.

## Delivery

Use focused `agent/*` branches, English Conventional Commits, protected pull requests, required validation and squash merges. PRs validate without deployment; Pages deploys only validated `main`. Third-party actions are SHA-pinned with least privilege and explicit concurrency.

The optional local Redis/OpenTelemetry reference is excluded from v1 and from the public-app critical path. It requires separate user authorization plus bounded acceptance criteria before implementation.
