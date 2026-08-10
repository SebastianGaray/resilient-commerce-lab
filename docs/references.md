# References

Primary sources used to bound the simulation model:

- [OpenTelemetry concepts](https://opentelemetry.io/docs/concepts/) — traces, metrics, logs, context and sampling.
- [OpenTelemetry metrics](https://opentelemetry.io/docs/concepts/signals/metrics/) — measurements, aggregation, histograms and cardinality.
- [OpenTelemetry logging specification](https://opentelemetry.io/docs/specs/otel/logs/) — trace/log correlation context.
- [AWS Builders' Library: Timeouts, retries and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) — bounded retries, timeout selection and retry amplification.
- [AWS Well-Architected: idempotent responses](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_prevent_interaction_failure_idempotent.html) — retry-safe mutation tokens.
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/docs/Web/CSS/@media/prefers-reduced-motion) — reducing non-essential motion.
- [MDN: CSS container queries](https://developer.mozilla.org/docs/Web/CSS/CSS_containment/Container_queries) — component-responsive layout.

Values in the simulator are explanatory parameters, not vendor defaults or production recommendations.
