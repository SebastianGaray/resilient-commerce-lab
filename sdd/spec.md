# Resilient Commerce Lab specification

## Problem

Static diagrams do not show request propagation, queue growth, latency and retry amplification, dependency failures, or their customer impact. This demo must make those causal relationships inspectable without presenting simulated output as production evidence.

## Scope and boundaries

Resilient Commerce Lab is a deterministic, browser-only educational simulation. It uses no customer traffic, production telemetry, real payments, authentication, cloud infrastructure or production capacity claims. Kubernetes, Kafka, multi-region replication, arbitrary topology editing and capacity recommendations are outside v1.

The persistent label is **Simulation · Not production telemetry** / **Simulación · No es telemetría de producción**.

## Requirements

- **RCL-SIM-001** Given the same seed, scenario, traffic, failures and controls, the discrete-event model produces the same ordered events, metrics and representative traces.
- **RCL-TRAFFIC-001** Users can configure request rate and constant, ramp, burst and flash-sale patterns with a bounded browse/cart/order mix.
- **RCL-FAIL-001** Users can inject target-specific latency, errors, unavailability, cache outage, payment degradation and worker slowdown with visible intensity and state.
- **RCL-RES-001** Cache, timeout, bounded retries, exponential backoff, deterministic jitter, circuit breaker, rate limiting and idempotency have causal, bounded models and visible trade-offs.
- **RCL-OBS-001** Throughput, p50/p95/p99 latency, error rate, dependency rate, cache hit ratio, queue depth, timeout count, retry count and circuit state derive only from simulation events.
- **RCL-TRACE-001** Representative traces expose request path, timing, status and correlation identifiers without claiming OpenTelemetry compatibility.
- **RCL-CX-001** A labeled customer-experience preview derives normal, delayed, stale, limited, unavailable and payment-failure states from the same simulation result.
- **RCL-COMP-001** Baseline and current runs use identical scenario inputs and seed, differing only in configured faults and controls.
- **RCL-PROD-001** Each major mechanism explains what is simulated, common production use, trade-offs and omitted complexity with authoritative references.
- **RCL-A11Y-001** The experience is semantic, keyboard usable, non-color-dependent, reduced-motion compatible and understandable without animation.
- **RCL-I18N-001** `/en/` and `/es/` have equivalent routes, controls, content, metadata and preserved destinations; `/` redirects to English.
- **RCL-PERF-001** Logical request volume never creates one DOM node per request; rendering is sampled and bounded.
- **RCL-DEP-001** The public application builds statically under `/resilient-commerce-lab/` with no backend, secrets, tracking or paid runtime service.

## Acceptance criteria

Requirements are complete only when implementation, focused tests, browser evidence and documentation agree. The app must work without horizontal page overflow from 20rem upward, keep controls touch-sized, expose all information under reduced motion and clearly distinguish simulated, local-reference and production-context material.
