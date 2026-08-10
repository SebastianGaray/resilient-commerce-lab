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

- [ ] **T050** (`RCL-PROD-001`) Define separate bounded scope only if explicitly authorized.

## M7 — UX hardening

- [x] **T060** (`RCL-A11Y-001`, `RCL-I18N-001`, `RCL-PERF-001`) Verify accessibility, locale parity, mobile and performance.

## M8 — Portfolio integration

- [ ] **T070** (`RCL-DEP-001`) Add an accurate, consistently styled portfolio entry after deployment status is known.

## M9 — Protected delivery and deployment

- [ ] **T080** (`RCL-DEP-001`) Validate, publish through a protected PR, deploy and smoke-test with authorization.
- [ ] **T081** (`RCL-DEP-001`) Verify effective ruleset and actual required checks.
