# Resilient Commerce Lab tasks

## M1 — SDD and foundation

- [x] **T001** (`RCL-SIM-001`–`RCL-DEP-001`) Define specification, architecture, boundaries and verification.
- [x] **T002** (`RCL-I18N-001`, `RCL-DEP-001`) Build the canonical bilingual static application shell.
- [x] **T003** (`RCL-DEP-001`) Add protected PR validation and Pages workflows.

## M2 — Simulation engine

- [x] **T010** (`RCL-SIM-001`, `RCL-TRAFFIC-001`) Implement virtual time, stable events, seeded randomness and traffic.
- [x] **T011** (`RCL-OBS-001`, `RCL-TRACE-001`) Derive metrics and bounded traces from events.

## M3 — Faults and resilience

- [x] **T020** (`RCL-FAIL-001`) Implement supported fault profiles.
- [x] **T021** (`RCL-RES-001`) Implement cache, timeouts, retries, backoff, jitter and circuit breaker.
- [x] **T022** (`RCL-RES-001`) Implement rate limiting, queue backpressure and idempotency.

## M4 — Interactive architecture

- [x] **T030** (`RCL-TRAFFIC-001`, `RCL-FAIL-001`, `RCL-RES-001`) Build simulator controls.
- [x] **T031** (`RCL-PERF-001`, `RCL-A11Y-001`) Build bounded responsive topology and accessible activity equivalent.

## M5 — Customer experience and observability

- [x] **T040** (`RCL-CX-001`) Derive and render customer experience states.
- [x] **T041** (`RCL-OBS-001`, `RCL-TRACE-001`, `RCL-COMP-001`) Build metrics, traces and comparison.
- [x] **T042** (`RCL-PROD-001`) Add production-context content and references.

## M6 — Optional production reference

- [x] **T050** (`RCL-PROD-001`) Record the local reference as excluded from v1 pending separate explicit authorization.

## M7 — UX hardening

- [x] **T060** (`RCL-A11Y-001`, `RCL-I18N-001`, `RCL-PERF-001`) Verify accessibility, locale parity, mobile and performance.

## M8 — Portfolio integration

- [x] **T070** (`RCL-DEP-001`) Add an accurate, consistently styled portfolio entry after deployment status is known.

## M9 — Protected delivery and deployment

- [x] **T080** (`RCL-DEP-001`) Validate, publish through a protected PR, deploy and smoke-test with authorization.
- [x] **T081** (`RCL-DEP-001`) Verify effective ruleset and actual required checks.

## M10 — Request-flow playback

- [x] **T090** (`RCL-PLAY-001`, `RCL-FLOW-001`) Build deterministic bounded playback timeline and partial snapshots.
- [x] **T091** (`RCL-TOPO-001`) Derive visible topology and annotations from controls and faults.
- [x] **T092** (`RCL-PLAY-001`, `RCL-FLOW-001`, `RCL-A11Y-001`) Add Play/Pause/Restart, speed, modes, orbs, legend and reduced-motion equivalent.
- [x] **T093** (`RCL-I18N-001`, `RCL-PERF-001`) Validate locale parity, themes, desktop, 20rem and bounded rendering.

## M11 — Scale, anchored mechanisms and guidance

- [x] **T100** (`RCL-SCALE-001`, `RCL-PERF-001`) Support and test up to 1,000 requests per second without unbounded rendering.
- [x] **T101** (`RCL-TOPO-001`) Render resilience and fault bubbles at their diagram anchors.
- [x] **T102** (`RCL-FLOW-001`, `RCL-A11Y-001`) Stabilize the activity panel at five latest events.
- [x] **T103** (`RCL-HELP-001`, `RCL-I18N-001`) Add localized contextual help for controls and diagram semantics.

## M12 — Categorical limits and recent-flow paint

- [x] **T110** (`RCL-SCALE-001`, `RCL-I18N-001`) Replace the numeric rate limit with localized named presets and explicit values.
- [x] **T111** (`RCL-PLAY-001`) Fix playback to ten virtual seconds at 1× with half-speed orb travel and no speed selector.
- [x] **T112** (`RCL-FLOW-001`, `RCL-PERF-001`, `RCL-A11Y-001`) Add bounded, decaying, non-overwriting outcome paint and a textual equivalent.
- [x] **T113** (`RCL-I18N-001`, `RCL-PERF-001`) Validate locale parity, reduced motion, responsive rendering and bounded DOM output.

## M13 — Scenario-driven capacity

- [x] **T120** (`RCL-TRAFFIC-001`) Replace raw traffic and fault inputs with deterministic business and DoS scenarios.
- [x] **T121** (`RCL-CAP-001`, `RCL-SIM-001`) Derive resource pressure, latency and errors from scenario demand, scaling and resilience controls.
- [x] **T122** (`RCL-RES-001`, `RCL-HELP-001`) Group controls by request order and document formulas with official source links.
- [x] **T123** (`RCL-TOPO-001`, `RCL-FLOW-001`) Keep resource capacity textual, remove recent-paint prose and preserve visual paint.
- [x] **T124** (`RCL-I18N-001`, `RCL-PERF-001`) Validate deterministic scenarios, scaling effects, accessibility and responsive rendering.

## M14 — Playback clarity and bounded scaling

- [x] **T130** (`RCL-PLAY-001`) Fit all half-speed request motion into the complete ten-second playback window.
- [x] **T131** (`RCL-A11Y-001`, `RCL-FLOW-001`) Consolidate playback into one Play/Pause action and a collapsed four-category legend.
- [x] **T132** (`RCL-CX-001`) Add localized, configuration-aware next-step guidance to the customer preview.
- [x] **T133** (`RCL-CAP-001`) Expose horizontal replica caps and a relative capacity footprint.
- [x] **T134** (`RCL-I18N-001`, `RCL-PERF-001`) Validate timing, guidance, accessibility and responsive rendering.

## M15 — Progressive resilience guidance

- [x] **T140** (`RCL-RES-001`) Start with optional resilience mechanisms disabled and a documented unprotected timeout ceiling.
- [x] **T141** (`RCL-FLOW-001`) Reserve representative successful orders so Queue and Worker remain visible in playback.
- [x] **T142** (`RCL-CX-001`) Gate customer preview and next-step guidance on progressive playback evidence.
- [x] **T143** (`RCL-TOPO-001`) Anchor circuit breaker on dependency calls and place the legend directly below the diagram.
- [x] **T144** (`RCL-I18N-001`, `RCL-PERF-001`) Validate defaults, queue visibility, progressive guidance, annotation placement and responsive rendering.
