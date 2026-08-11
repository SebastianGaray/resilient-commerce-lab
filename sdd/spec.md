# Resilient Commerce Lab specification

## Problem

Static diagrams do not show request propagation, queue growth, latency and retry amplification, dependency failures, or their customer impact. This demo must make those causal relationships inspectable without presenting simulated output as production evidence.

## Scope and boundaries

Resilient Commerce Lab is a deterministic, browser-only educational simulation. It uses no customer traffic, production telemetry, real payments, authentication, cloud infrastructure or production capacity claims. Kubernetes, Kafka, multi-region replication, arbitrary topology editing and capacity recommendations are outside v1.

The persistent label is **Simulation · Not production telemetry** / **Simulación · No es telemetría de producción**.

## Requirements

- **RCL-SIM-001** Given the same seed, traffic scenario, scaling strategy and resilience controls, the model produces the same ordered events, resources, metrics and representative traces.
- **RCL-TRAFFIC-001** Users select deterministic Low day, Normal day, CyberDay sale or denial-of-service demand curves with a bounded browse/cart/order mix.
- **RCL-CAP-001** None, capped automatic horizontal and simplified 2× vertical scaling derive service CPU, memory, instances, latency and overload errors from demand relative to capacity. Horizontal exposes a user-selected maximum and relative capacity footprint.
- **RCL-RES-001** Cache, timeout, bounded retries, exponential backoff, deterministic jitter, circuit breaker, rate limiting and idempotency have causal, bounded models and visible trade-offs.
- **RCL-OBS-001** Throughput, p50/p95/p99 latency, error rate, dependency rate, cache hit ratio, queue depth, timeout count, retry count and circuit state derive only from simulation events.
- **RCL-TRACE-001** Representative traces expose request path, timing, status and correlation identifiers without claiming OpenTelemetry compatibility.
- **RCL-CX-001** A labeled customer-experience preview derives normal, delayed, stale, limited, unavailable and payment-failure states from the same simulation result and presents one configuration-aware next step.
- **RCL-COMP-001** Baseline and current runs use identical scenario, scaling and seed, differing only in resilience controls.
- **RCL-PROD-001** Each major mechanism explains what is simulated, common production use, trade-offs and omitted complexity with authoritative references.
- **RCL-A11Y-001** The experience is semantic, keyboard usable, non-color-dependent, reduced-motion compatible and understandable without animation.
- **RCL-I18N-001** `/en/` and `/es/` have equivalent routes, controls, content, metadata and preserved destinations; `/` redirects to English.
- **RCL-PERF-001** Logical request volume never creates one DOM node per request; rendering is sampled and bounded.
- **RCL-PLAY-001** Play starts or resumes a deterministic ten-second visual replay; Pause freezes it; Restart returns to virtual time zero. Virtual time always advances at 1× while orb travel uses a fixed 0.5× presentation speed. Single mode stops after one run and Continuous repeats the same seeded run with a visible explanation.
- **RCL-TOPO-001** The diagram derives visible nodes, edges and mechanism annotations from existing controls. Capacity remains textual and does not add infrastructure nodes.
- **RCL-FLOW-001** At most 12 simultaneous representative orbs communicate normal requests, successes, waiting/degradation, errors/timeouts, retries, limiting, cache hits and cache misses through color plus shape/border and a textual equivalent.
- **RCL-SCALE-001** Traffic and rate-limit controls accept up to 1,000 requests per second while the simulation and DOM remain bounded.
- **RCL-HELP-001** Contextual help explains every simulator input and the diagram without requiring prior resilience knowledge.
- **RCL-DEP-001** The public application builds statically under `/resilient-commerce-lab/` with no backend, secrets, tracking or paid runtime service.

## Acceptance criteria

Requirements are complete only when implementation, focused tests, browser evidence and documentation agree. The app must work without horizontal page overflow from 20rem upward, keep controls touch-sized, expose all information under reduced motion and clearly distinguish simulated, local-reference and production-context material.

Playback must never change logical results. At completion, displayed metrics equal the full deterministic run. Reduced-motion mode replaces moving orbs with active-edge and event-state updates.

Mechanisms must appear as bubbles anchored over their relevant diagram node or edge. The accessible activity summary keeps a fixed visual height and shows no more than the latest five events so playback never shifts the page vertically.

The single-run playback must use the complete ten-second window without cutting off the final moving request. Play and Pause share one stateful action, and the four-category flow legend is collapsed by default.

Traffic scenarios never force errors. Seeded errors and latency arise only when modeled CPU demand exceeds service capacity after rate limiting, cache effects and selected scaling. Horizontal scaling follows the Kubernetes utilization-ratio form with a 70% target and eight-instance cap; vertical scaling is an explicitly simplified 2× allocation. Help links the official model sources.

Rate limiting uses explicit presets: No limit — 1,000/s, Low — 50/s, Medium — 250/s and High — 500/s. Each edge retains at most four recent outcome layers for a two-second virtual window. Success, error, wait and limited layers use separate offset colors whose opacity and width represent weighted recent frequency; they decay without overwriting one another.
