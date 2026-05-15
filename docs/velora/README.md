# Velora — design-system docs index

> **Scope:** every doc that describes how Velora is built — architecture, component catalogue, data layer, design tokens.
> **Audience:** anyone touching Velora code (devs, designers, AI assistants, PMs).
> **Read when:** onboarding to Velora, picking the right component / token before building, or auditing the surface.
> **Companion docs:** [`../velora-patients/README.md`](../velora-patients/README.md) (per-patient OMOP mocks) · [`../velora-v0-recent-trends.md`](../velora-v0-recent-trends.md) (trend registry deep-dive).

Velora is the standalone clinical-AI chat surface — a focused
demo that runs against six OMOP-CDM-backed patient mocks and the
hospital-signed guideline registry.

## Read order

1. **[velora-overview.md](./velora-overview.md)** — start here. What
   Velora is, the Stack 1 / Stack 2 doctrine, the four intent shapes,
   the auth gate, the homepage chrome.
2. **[velora-architecture.md](./velora-architecture.md)** — where each
   file lives, the boundaries between Velora-only code and the shared
   `dr-agent` surface, the import / barrel rules.
3. **[velora-chrome-catalog.md](./velora-chrome-catalog.md)** — every
   chrome component the homepage renders (LoginScreen, AnimatedGrid,
   the standalone-mode AgentHeader navbar, the trust-marker row).
4. **[velora-cards-catalog.md](./velora-cards-catalog.md)** — the four
   V0 cards (Cross-consultation brief, Patient journey, Trend menu,
   Trend detail) + the shared `visit-sections` + `highlight` helpers.
5. **[velora-data-layer.md](./velora-data-layer.md)** — `lib/velora/`
   reference: reply engine, trend registry, follow-up registry,
   guideline catalogue, sync context.
6. **[velora-design-tokens.md](./velora-design-tokens.md)** — the AI
   gradient palette, the navbar height / sticky cascade constants,
   the Playfair Display headline rule, the trust-marker copy contract.

## Quick cheat-sheet

| Looking for… | Path |
|---|---|
| Homepage entry point | `app/page.tsx` |
| Login screen + animated grid | `components/velora/` |
| The four V0 cards | `components/tp-rxpad/dr-agent/cards/velora-v0/` |
| Reply engine + data | `lib/velora/` |
| Public data API | `@/lib/velora` (barrel) |
| Public chrome API | `@/components/velora` (barrel) |
| Per-patient OMOP mocks | `docs/velora-patients/P{1..6}-*.md` |
| Stack 1 / Stack 2 doctrine | `docs/velora-patients/WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md` |
| Trend rationale (which trend, why) | `docs/velora-v0-recent-trends.md` |

## Three rules

1. **One canonical home per concept.** LoginScreen lives in
   `components/velora/`; the V0 cards in
   `components/tp-rxpad/dr-agent/cards/velora-v0/`; the data layer in
   `lib/velora/`. Nothing duplicates.
2. **Public APIs go through barrels.** Import `LoginScreen` from
   `@/components/velora`, not the file path. Import data helpers
   from `@/lib/velora`. The internal file shapes can change; the
   barrel names are the stable contract.
3. **Stack 1 stays verbatim.** Anything rendered as the
   cross-consultation brief is OMOP data, not AI-authored copy.
   Stack 2 (clinical synthesis, currently absent from the live
   surface) is where AI authorship is allowed — bounded to which
   guideline panel applies, never the panel content itself.
