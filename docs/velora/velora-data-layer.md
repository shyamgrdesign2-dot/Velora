# Velora — data layer reference

> **Scope:** every file under `lib/velora/`. Reply engine, trend registry, follow-up registry, guideline catalogue, sync provider.
> **Read when:** changing a Velora reply, adding a patient mock, adding a guideline body, or wiring a new intent.

`lib/velora/` is **presentation-free**. It owns the data and the
routing logic. UI components consume it through the
`@/lib/velora` barrel — see [velora-architecture.md](./velora-architecture.md)
for the import boundaries.

## File map

```
lib/velora/
├─ index.ts                Public barrel — the stable contract.
├─ v0-replies.ts           Reply engine. The single entry point.
├─ v0-trends.ts            Per-patient available-trend registry.
├─ v0-followups.ts         Inline pivot suggestions per card kind.
├─ guideline-registry.ts   Hospital-signed guideline catalogue + admin selection.
└─ sync-context.tsx        Velora-named alias around the RxPad sync provider.
```

## `v0-replies.ts` — the reply engine

```ts
buildVeloraV0Reply(rawMessage: string): ReplyResult | null
```

The seam where Velora intercepts every chat message before the
legacy RxPad reply engine sees it. `DrAgentPanel`'s
`replyOverride` prop is wired to this function by `app/page.tsx`.
A `null` return means "not a Velora intent — let the legacy path
handle it" (in practice the homepage never falls through).

**Internal sections of the file** (one big handler per intent):

| Section | Triggers | Emits |
|---|---|---|
| **Cross-consultation brief** | `m.includes("cross-consultation brief")` / `"mdt brief"` / variants | `rxOutput: { kind: "velora_v0_mdt_brief", data: { …per-patient } }` |
| **Patient journey** | `m.includes("patient journey")` / `"hospital timeline"` / variants | `rxOutput: { kind: "velora_v0_patient_journey", data: { … } }` |
| **Recent trends — menu** | `"show recent trends"` / `"show recent vital trends"` / `"show recent lab trends"` / `"which trend"` | `rxOutput: { kind: "velora_v0_trend_menu", data: { … } }` |
| **Recent trends — specific** | a patient-specific question that matches `findTrendByQuestion(...)` | `rxOutput: { kind: "velora_v0_trend_detail", data: { … } }` |
| **Recent trends — guardrail** | "Show X trend" where X isn't on file for this patient | `velora_v0_trend_menu` with a `guardrail: { askedFor }` banner |
| **Follow-up resolver** | `findVeloraFollowUp(question)` matches | Card kind specific to the follow-up |

Per-patient mock datasets live as `const` exports inside this
file: P1 Lakshmi, P2 Suresh, P3 Asha, P4 Meera, P5 Anita, P6
Arjun (the IPD case). Each is a fully-populated
`VeloraV0MdtBriefData` + journey + trend profile.

**Reply shape**

```ts
type ReplyResult = {
  text: string                // the bubble headline above the card
  loadingHint?: string        // "Pulling the brief for Lakshmi Iyer…"
  loadingDelayMs?: number     // typing-delay before reveal
  suggestions?: Pivot[]       // inline pivot pills under the card
  rxOutput?: RxAgentOutput    // the structured card payload
}
```

The `suggestions[]` array is built by `buildVeloraSuggestions(parent)`
from `v0-followups.ts` — see below.

---

## `v0-trends.ts` — trend registry

Single source of truth for "what trends does this patient have".

**Key types**

```ts
type TrendId =
  | "bp" | "weight" | "hba1c" | "lipid" | "egfr" | "hemoglobin"
  | "fasting-glucose" | "spo2" | "calcium" | "vitamin-d" | "ft4"

interface TrendDef {
  id: TrendId
  category: "vital" | "lab"
  quickLabel: string          // public-facing chip label
  question: string            // canned tap-question
  rationale: string           // why this trend is offered
  replyText: string           // legacy fallback (when series is empty)
  footer: string              // source / citation footer
  unit?: string
  series?: TrendSeriesPoint[]
  targetLine?: string
  citation?: { body: string; year?: string; section?: string }
}

interface PatientTrendProfile {
  patientId: string
  patientName: string
  scopeReason: string         // "based on hypertension, CKD, IHD…"
  trends: TrendDef[]
}
```

**Public helpers**

```ts
resolvePatientTrends(message: string): PatientTrendProfile
// Picks the right profile from ALL_PATIENT_TRENDS based on the
// patient name embedded in the message.

findTrendByQuestion(profile, message): TrendDef | undefined
// Matches a specific-trend question to a registry entry.

filterTrendsByCategory(profile, category): TrendDef[]
// "show recent VITAL trends" / "show recent LAB trends" filter.

detectTrendCategory(message): "vital" | "lab" | null
```

**Adding a new trend type**

1. Extend the `TrendId` union.
2. Add a `trendFoo()` factory function (same shape as existing
   `trendBP`, `trendHbA1c`).
3. Append the result to the relevant `PatientTrendProfile.trends`
   arrays in `ALL_PATIENT_TRENDS`.

---

## `v0-followups.ts` — inline pivot suggestions

Drives the pivot-pill row under each card. Without this layer
the doctor lands on a card and has nowhere to go next; with it
every card shows the next 2-3 logical questions.

**Key shapes**

```ts
type VeloraParentIntent =
  | "brief" | "journey" | "trends" | "specific-trend"

interface VeloraFollowUp {
  parent: VeloraParentIntent
  category: VeloraFollowUpCategory
  label: string
  question: string            // canned message that fires when tapped
}

getVeloraFollowUps(parent): VeloraFollowUp[]
findVeloraFollowUp(question): VeloraFollowUp | undefined
parentIntentForCardKind(kind): VeloraParentIntent | null
```

**Adding a follow-up**

Append to the `ALL_FOLLOWUPS[]` array. Tag the parent intent it
shows up under. The reply engine looks it up via
`findVeloraFollowUp(question)` when it sees the question come
back through the chat surface.

---

## `guideline-registry.ts` — hospital-signed guidelines

Two roles:

1. **Catalogue** — `GUIDELINE_CATALOGUE[specialty]` returns the
   list of guideline bodies the hospital can sign for that
   specialty (e.g. Cardiology: AHA/ACC HTN, ESC HF, NICE NG185).
2. **Admin selection** — `loadGuidelineSelection()` /
   `saveGuidelineSelection()` persist the doctor-admin's
   per-specialty subset to `localStorage["velora-v0-guideline-settings"]`.
   The `<GuidelineSettingsSidebar />` writes through these.

**Key API**

```ts
isBodySigned(bodyName: string | undefined, selection): boolean
// True if the body matches any selected guideline (tolerant
// name match via normaliseBody()).
```

The brief card (Stack 2 — currently retired) and the trend
detail (citation footer) consult `isBodySigned` to decide
whether to surface a guideline-anchored panel.

---

## `sync-context.tsx`

A 20-line file that re-exports the RxPad sync provider under
Velora-named aliases:

```ts
export { VeloraSyncProvider }     // = RxPadSyncProvider, no other change
export const useVeloraSync = useRxPadSync
export type VeloraCopyPayload = RxPadCopyPayload
export type VeloraSignal = RxPadSignal
```

Lets `app/page.tsx` say `<VeloraSyncProvider>` without leaking
the RxPad name into the standalone surface. Pure aliasing — no
behaviour added.

---

## Internal helpers (not in barrel)

These are intentionally kept inside `v0-trends.ts` /
`v0-followups.ts` and consumed only by their own file or by
`v0-replies.ts`:

- `ALL_PATIENT_TRENDS: PatientTrendProfile[]` — the per-patient table.
- `ALL_FOLLOWUPS: VeloraFollowUp[]` — the flat follow-up list.
- `buildVeloraSuggestions(parent)` — used by `v0-replies` to build the suggestion array.
- `VELORA_PARENT_INTENTS`, `veloraParentLabel`, `veloraParentMessage` — utility tables used by sub-features that still aren't shipped.

If they need to be consumed cross-feature, promote them to the
barrel — don't import them directly.

## Related docs

- [velora-cards-catalog.md](./velora-cards-catalog.md) — how each kind renders.
- [velora-architecture.md](./velora-architecture.md) — import boundaries.
- [`../velora-v0-recent-trends.md`](../velora-v0-recent-trends.md) — trend rationale (which trend, why, for which condition profile).
- [`../velora-patients/README.md`](../velora-patients/README.md) — the six per-patient OMOP mock files.
