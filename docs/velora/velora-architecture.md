# Velora — file architecture + boundaries

> **Scope:** every file Velora owns or extends, where it lives, and what's allowed to import what.
> **Read when:** adding a Velora file (where does it go?), refactoring a Velora boundary, or auditing the surface for production-readiness.

## File tree

```
Zyvelor/
├─ app/
│  ├─ page.tsx                 Velora homepage. Auth gate + DrAgentPanel.
│  ├─ layout.tsx               Loads Inter / Mulish / Playfair Display fonts.
│  ├─ globals.css              Global reset + TP theme variables.
│  └─ dr-agent-design-system/  Internal tour (NOT shipped to users).
│
├─ components/
│  ├─ velora/                  Velora-only chrome.
│  │  ├─ index.ts                 Public barrel.
│  │  ├─ LoginScreen.tsx          Sign-in card + animated backdrop + auth handler.
│  │  └─ AnimatedGrid.tsx         SVG comet-pulse grid (the geometric backdrop).
│  │
│  └─ tp-rxpad/dr-agent/       Shared chat panel (not Velora-only).
│     ├─ DrAgentPanel.tsx          The chat panel used by Velora + embedded EMR.
│     ├─ shell/
│     │  ├─ AgentHeader.tsx        Top navbar — 42px standalone, 52px embedded.
│     │  ├─ PatientSelector.tsx    Patient-pick bottom sheet.
│     │  └─ GuidelineSettingsSidebar.tsx   Admin signed-library editor.
│     ├─ chat/
│     │  ├─ ChatThread.tsx         Message list.
│     │  ├─ ChatInput.tsx          Input + trust marker row.
│     │  ├─ ChatBubble.tsx         Single message wrapper.
│     │  └─ WelcomeScreen.tsx      Empty-state canned-actions grid.
│     └─ cards/
│        ├─ CardShell.tsx          Shared rounded card with sticky-aware header.
│        ├─ SectionSummaryBar.tsx  Sticky-capable section bar (Medical history, …).
│        ├─ CardRenderer.tsx       Dispatch table — kind → card component.
│        └─ velora-v0/
│           ├─ VeloraStack.tsx
│           ├─ VeloraV0MdtBriefCard.tsx       Intent 1.
│           ├─ VeloraV0PatientJourneyCard.tsx Intent 2.
│           ├─ VeloraV0TrendMenuCard.tsx      Intent 3.
│           ├─ VeloraV0TrendDetailCard.tsx    Intent 4.
│           ├─ visit-sections.tsx             Shared visit-body sections.
│           └─ highlight.tsx                  Clinical-term highlighter + FloatingTooltip.
│
├─ lib/
│  └─ velora/                  Velora-only data layer.
│     ├─ index.ts                 Public barrel.
│     ├─ v0-replies.ts            Reply engine — the seam DrAgentPanel calls.
│     ├─ v0-trends.ts             Trend registry — per-patient available trends.
│     ├─ v0-followups.ts          Inline pivot suggestions per card kind.
│     ├─ guideline-registry.ts    Hospital-signed guideline catalogue + selection.
│     └─ sync-context.tsx         Alias around the RxPad sync provider.
│
└─ docs/
   ├─ velora/                  This folder — architecture / catalogues.
   ├─ velora-patients/         Per-patient OMOP mock walk-throughs.
   └─ velora-v0-recent-trends.md   Trend-registry rationale.
```

## Boundaries — what can import what

```
app/page.tsx
  → components/velora      (LoginScreen, AnimatedGrid)        ✅
  → lib/velora             (buildVeloraV0Reply, sync provider) ✅
  → components/tp-rxpad/dr-agent/DrAgentPanel                  ✅

components/velora/
  → @/components/...       (Velora chrome can pull shared atoms) ✅
  → @/lib/velora           (no, by design — chrome is presentation only) ❌
  → @/lib/...              (general utilities — `cn`, etc.)    ✅

components/tp-rxpad/dr-agent/cards/velora-v0/
  → @/components/tp-rxpad/dr-agent/cards/*  (CardShell, SectionSummaryBar) ✅
  → @/components/tp-rxpad/dr-agent/types     (RxAgentOutput union)         ✅
  → ./highlight, ./visit-sections, sibling cards                           ✅
  → @/lib/velora            (only when the card needs registry data)      ✅

lib/velora/
  → @/components/...       (no — data layer is presentation-free) ❌
  → @/lib/...              (cross-lib helpers OK)                  ✅
  → other lib/velora files (free)                                  ✅
```

ESLint doesn't enforce these in the current Zyvelor build (the
VoiceRx-L `eslint.config.mjs` rule isn't ported); the rules above
are review-time discipline.

## Public APIs

The two barrels are the **only** stable contract:

```ts
// Chrome
import { LoginScreen, AnimatedGrid } from "@/components/velora"

// Data
import {
  buildVeloraV0Reply,        // reply engine entry
  VeloraSyncProvider,
  useVeloraSync,
  resolvePatientTrends,
  findTrendByQuestion,
  getVeloraFollowUps,
  GUIDELINE_CATALOGUE,
  loadGuidelineSelection,
  saveGuidelineSelection,
  isBodySigned,
} from "@/lib/velora"
```

Anything inside `lib/velora/v0-replies.ts` / `v0-trends.ts` /
etc. that isn't re-exported by the barrel is **internal**. The
file shape can change without notice; cross-feature imports
should go through `@/lib/velora` only.

## Adding a Velora file

| Kind | Where it goes |
|---|---|
| Chrome (login, header chrome, marketing surface) | `components/velora/` + add to its barrel |
| New V0 card (intent 5+) | `components/tp-rxpad/dr-agent/cards/velora-v0/` + register in `CardRenderer.tsx` + add type to the `RxAgentOutput` union |
| New canned-question intent | extend `lib/velora/v0-replies.ts` |
| New trend type | extend `lib/velora/v0-trends.ts` |
| New patient mock | append to `lib/velora/v0-replies.ts` + write a P-doc under `docs/velora-patients/` |
| New guideline body | extend `lib/velora/guideline-registry.ts` |
| New design-system doc | this folder |

## What's *not* Velora

The whole `components/tp-rxpad/` tree is **shared**. The
`AgentHeader`, `ChatInput`, `CardShell`, etc. are used by the
embedded EMR sidebar AND Velora. When you change them, keep both
modes working — homepage-only behaviour lives behind
`mode === "homepage"` gates.

## What's currently unused but intentionally kept

- `app/dr-agent-design-system/velora-v0/*` — internal deep-dive
  tour for design review. Reachable at `/dr-agent-design-system`
  but not linked from the production homepage.
- `CollideEntryCard`, `CollideTitleEvidenceTip`, the synthesis-panel
  renderer inside `VeloraV0MdtBriefCard.tsx` — the Stack 2
  Clinical-synthesis card was retired but the helper components
  stay in the file so re-introducing the surface doesn't need
  to recreate them.

If you're certain a file is dead, grep the repo for inbound
imports before deleting. The two `index.ts` barrels are the
quickest way to confirm a name is part of the public API.

## Related docs

- [velora-overview.md](./velora-overview.md) — the four intents + Stack doctrine.
- [velora-chrome-catalog.md](./velora-chrome-catalog.md) — every chrome component.
- [velora-cards-catalog.md](./velora-cards-catalog.md) — the V0 card catalogue.
- [velora-data-layer.md](./velora-data-layer.md) — `lib/velora/` reference.
- [velora-design-tokens.md](./velora-design-tokens.md) — sticky cascade, AI palette, navbar tokens.
