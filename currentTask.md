# Current task

## Status

Completed and merged into `main` on 2026-08-10.

- Pull request: [#5 — feat: model scenario-driven service capacity](https://github.com/SebastianGaray/resilient-commerce-lab/pull/5)
- Merge commit: `48695a49d499addae02ea70c5f97c52f20685f9c`
- Local branch: `main`, synchronized with `origin/main`

## Delivered scope

- Replaced raw traffic patterns and injected faults with deterministic scenarios:
  low day, normal day, CyberDay sale and denial-of-service attack.
- Kept scenarios limited to defining demand. Errors and latency are calculated from
  demand, service capacity, resilience controls and the selected scaling strategy.
- Added selectable capacity scaling:
  - none: one standard instance;
  - horizontal: automatic scaling from 1 to 8 instances around a 70% utilization target;
  - vertical: one instance with a simplified 2× CPU and memory allocation.
- Added peak simulated CPU, memory, state and instance counts for each service without
  adding infrastructure nodes to the request diagram.
- Preserved recent request paint in the diagram and removed only its prose summary.
- Kept the activity log at a stable height with the five latest events.
- Grouped resilience controls in request order: entry, dependency calls, data access and
  asynchronous work.
- Added localized helpers in English and Spanish explaining every control, the capacity
  formulas, educational assumptions and official references.
- Updated specifications, design notes, README, references and automated tests.

## Capacity model

- Utilization is service demand divided by available per-second capacity.
- Horizontal desired instances use
  `ceil(demand / (per-instance capacity × 0.70))`, bounded from 1 to 8.
- Latency pressure begins above 70% utilization and grows quadratically.
- Overload error probability begins above 85% utilization and is capped at 90%.
- Memory is an educational heuristic based on a service baseline, CPU pressure and worker
  queue pressure.
- Scenario names never force errors. A sufficiently capable configuration can absorb even
  high-demand scenarios without failing.

## Official references

- [Kubernetes Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Kubernetes Vertical Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/)
- [Google SRE: Handling Overload](https://sre.google/sre-book/handling-overload/)
- [Google SRE: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [AWS: Increasing MTBF](https://docs.aws.amazon.com/whitepapers/latest/availability-and-beyond-improving-resilience/increasing-mtbf.html)

## Validation evidence

- Formatting, ESLint, Astro type checking and production build passed.
- 14 unit tests passed.
- 12 Playwright tests passed across desktop, mobile and 320 px viewports in English and Spanish.
- Manual browser inspection passed at desktop and 320 px with no horizontal overflow or
  console warnings/errors.
- Dependency audit reported 0 vulnerabilities.
- GitHub validation, analysis and CodeQL checks passed before merge.

## Follow-up iteration — playback clarity and bounded scaling

Completed locally on branch `agent/playback-guidance-limits`:

- normalize sampled event timing so half-speed orb motion remains visible throughout the
  complete ten-second playback and is not cut off at the end;
- replace separate Play, Pause and Restart buttons with one stateful Play/Pause action;
- collapse the legend by default and consolidate it into four outcome categories;
- add localized, configuration-aware next-step guidance beside the customer preview;
- expose a horizontal per-service maximum of 2, 4 or 8 instances;
- report a relative capacity footprint so the scaling tradeoff is visible without inventing
  cloud prices;
- extend unit and browser coverage for timing, caps, recommendations and responsive behavior.

Validation completed with formatting, lint, type checking, production build, 15 unit tests,
15 Playwright tests across desktop/mobile/320 px and an audit reporting 0 vulnerabilities.
The in-app browser was unavailable for additional manual inspection. `currentTask.md` is
included in this iteration's commit.

## Follow-up iteration — progressive resilience guidance

Completed on branch `agent/progressive-resilience-guidance`:

- keep Queue and Worker, while reserving at least four representative successful orders in
  playback so the asynchronous path is visible;
- start with no optional resilience mechanisms enabled and use 5,000 ms as the documented
  unprotected timeout ceiling;
- hide customer preview and next-step guidance until playback produces evidence;
- propose one missing resilience or capacity action at a time when degradation appears;
- move the compact legend immediately below the diagram and before service capacity;
- anchor circuit breaker on the dependency-call path rather than near Cache;
- extend unit and browser coverage for these behaviors before PR and merge.

Validation completed with formatting, lint, type checking, production build, 16 unit tests,
18 Playwright tests across desktop/mobile/320 px and an audit reporting 0 vulnerabilities.
