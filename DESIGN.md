# Resilient Commerce Lab design contract

The workspace and portfolio `DESIGN.md` files are canonical. This project reuses their warm Light (`#fdf8f8`) and warm-charcoal Dark (`#1b1918`) canvases, slate/warm accent family, Source Serif 4/Inter/JetBrains Mono roles, one-pixel borders, `0.25rem` radius, filled-versus-bordered action hierarchy and two-pixel focus ring with four-pixel offset.

The persistent header order is theme disclosure, EN/ES, repository utility and Menu/Menú. Portfolio/Portafolio is the final menu destination and is not duplicated elsewhere. System is the default theme; Light and Dark persist while System follows live OS changes.

Architecture nodes are bordered surfaces. Edges use labels, line style and state text in addition to color. Warning, failure and success colors are local semantic additions tested in both themes. Animated particles are bounded representative samples, never one per request. Reduced motion removes travel while retaining edge state and counts.

The topology is a projection of simulator state, not a second editor. Cache and limiter nodes appear only when their existing controls require them; faults and resilience mechanisms become annotations. Play runs one deterministic timeline, continuous mode loops that same seeded run, and Pause/Restart preserve a predictable playback contract. A persistent legend maps orb color and shape to requests, responses, waits, failures, retries, rate-limit rejections and cache outcomes.

Operational metrics use monospace values and plain-language labels. Traces use a vertical timing list on narrow screens. The customer preview remains subordinate to the simulator and always carries a simulated label. Panels reflow without horizontal page scroll at the supported 20rem minimum.
