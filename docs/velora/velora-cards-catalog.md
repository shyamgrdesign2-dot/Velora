# Velora — V0 cards catalogue

> **Scope:** the four V0 cards Velora renders in the chat thread + the shared helpers (`CardShell`, `SectionSummaryBar`, `visit-sections`, `highlight`).
> **Read when:** changing a card, adding a fifth intent, or auditing a Velora reply.

Every card is registered in
`components/tp-rxpad/dr-agent/cards/CardRenderer.tsx` against a
`kind` discriminator in the `RxAgentOutput` union (see
`components/tp-rxpad/dr-agent/types.ts`). The reply engine in
`lib/velora/v0-replies.ts` emits the right `kind` per intent.

## ① `VeloraV0MdtBriefCard.tsx` — Cross-consultation brief

Intent flagship. Stack 1 — verbatim OMOP data only.

**Props (data)**

```ts
{
  patientName: string
  patientMeta: string                          // "F, 76"
  preamble: string                             // headline sentence
  medicalHistory: VeloraV0MedicalHistoryGroup[]
  specialties: VeloraV0Attribution[]           // the per-specialty list
}
```

**Composition (top → bottom)**

1. **CardShell header** — `position: sticky; top: 0` (`--velora-card-sticky-top`). Title `Cross-consultation brief`, subtitle `{patientName} ({F|M, age})`, chevron, source ⓘ.
2. **Medical history block** — `<SectionSummaryBar sticky />` with the four canonical groups (Co-morbidities · Surgical history · Allergies & safety · Active medications). Each group is `<MedicalHistorySubheadingTag />` + pipe-separated items rendered with `<HighlightLine />`. Pinned at `top: 50` when scrolled into.
3. **Filter band** — sticky-at-50 wrapper with a 1px slate-100 top border. Two `<MultiSelectFilter />` chips (Specialty / Doctor). Sticks at the same lane as the medical-history bar; one replaces the other as the doctor scrolls.
4. **Specialty list** — `filteredSpecialties.map(...)`. Each specialty:
   - `<SpecialtyHeading />` (sticky at `top: 92` via `--velora-specialty-heading-sticky-top` — third lane below the filter).
   - `<DetailedSpecialtyBody />` — vertical violet timeline of `<VisitCard />` rows, one per consultation.

**Visit shape (`VeloraV0Consultation`)**

Each `<VisitCard />` renders sections in canonical Rx order:
*Symptoms · Examination · Diagnosis · Medications · Advice ·
Follow Up · Investigations · Planned surgery · Vaccinations ·
Follow Up Notes*. IPD visits with a `dischargeSummary` payload
swap the OPD sections for the structured `<DischargeSummaryBlock />`
(neutral slate palette; warning-signs subsection keeps a quiet
amber kicker since the intent is genuinely alerting).

**Stack 2 (currently retired)**

The synthesis card that used to live below the brief is removed
from the live output, but `CollideEntryCard`,
`CollideTitleEvidenceTip`, and the synthesis-panel renderer
remain in the file as dead code for easy re-introduction. See
[velora-overview.md](./velora-overview.md) for the doctrine.

---

## ② `VeloraV0PatientJourneyCard.tsx` — Patient journey

Chronological hospital timeline. Stack 1.

Each row is a visit OR an MDT meeting; visits expand inline
via the shared `<VisitBody />` from `visit-sections.tsx` so the
single doctor's note reads identically wherever a doctor lands
on it (brief or journey).

The legacy `<StructuredDetail />` `rx.author` field is omitted
inside each visit body — the parent row already names the doctor.

---

## ③ `VeloraV0TrendMenuCard.tsx` — Recent trends menu

Renders the patient's *available* trends as inline mini-cards.

**Group order:** Bedside vitals → Lab parameters. Group header
is `text-[10.5px] font-semibold uppercase`.

**Mini-card shapes** (chosen automatically per metric):

| Series length | Renders |
|---|---|
| ≥ 2 numeric points | Sparkline (100 × 28 SVG, gradient stroke, last-point dot) + latest value + date |
| 1 point | No sparkline; latest value + "Single reading" hint + date |
| 0 (rare) | Quiet label-only card |

The sparkline auto-scales y to the series' own min/max so flat
ranges (BP 130–140) still read as a curve. Combo values like
`120/80` use the first number (systolic for BP) — the more
clinically scanned half.

Tapping a mini-card fires the canned `chip.question` and lands
the doctor on the trend-detail card.

**Header trailing slot:** "Why these trends" info-tooltip surfacing
the per-patient `scopeReason` from the trend registry.

**Guardrail.** When this card is the *guardrail reply* (the
doctor asked for a trend that isn't on file), a small amber
`<IconsaxInfo>` banner above the mini-cards names what they
asked for and points to the available chips.

---

## ④ `VeloraV0TrendDetailCard.tsx` — Trend detail

Single-metric structured view. Stack 1.

- **Header strip** — `<VITAL|LAB>` chip in the trend's accent
  color + unit pill (`mmHg`, `g/dL`, …).
- **Series table** — `Date · Value · Flag`. Flag dots are
  green / amber / red per `point.flag`.
- **Reference line** — soft slate footnote with the canonical
  target (`Target per WHO HEARTS 2023: < 140/90 mmHg`).
- **Citation footer** — guideline body + year + section pulled
  from the registry.

The verbose "Why this trend was offered" italic paragraph was
removed in `d94c3c8` — the chip + unit + citation already carry
the audit info.

---

## Shared helpers

### `CardShell.tsx`

Common card chrome. Outer is a `rounded-[14px] bg-white` div with
a violet gradient border via background-image + background-clip.
Header has a `stickyHeaderTop?: string` prop — when set, the
header uses `position: sticky` at that CSS offset, with `z-[31]`
(above the navbar) so the title visually replaces the navbar when
pinned. Body padding `px-3 py-[10px]`.

Header layout: icon tile (34 × 34, `tp-blue-50` background) +
title (14 px semibold) + subtitle (12 px, `tp-slate-400`, `mt-[1px]`
under the title) + optional `headerExtra` slot + chevron.

CSS `container-type: inline-size` on the header lets the
`headerExtra` slot wrap to its own row below 480 px via an inline
`@container` query — used by the trend menu's "Why these trends"
trailer.

### `SectionSummaryBar.tsx`

Single-row section heading (icon + label + optional trailing
slot). 30 px tall, `bg-tp-slate-100` (or `bg-tp-violet-50` in
specialty variant). Optional `stickyTop?: string` prop — when
set, uses `position: sticky` at that CSS offset with `z-[3]`. The
brief card wires `stickyTop="var(--velora-specialty-sticky-top, 0px)"`
to the Medical history bar so it pins below the card title.

### `visit-sections.tsx`

Shared section blocks reused across `<VisitCard />` and the
`<VisitBody />` inside the patient journey:

- `<VisitSection />` — icon + label bar + items.
- `<VisitBulletList />` — pipe-split bullets (`Symptoms`, `Examination`, `Diagnosis`).
- `<VisitInlineList />` — pipe-flow paragraph (`Medications`, `Vaccinations`).
- `<VisitBody />` — composes the canonical Rx-section set.

All use `text-[14px] leading-[1.65]` for body, `text-[10px]`
inside tag chips, per the 14/12/10 typography rule.

### `highlight.tsx`

Clinical-term highlighter:

- `<HighlightLine text={...} />` — wraps drug / lab / condition
  terms in tinted spans (drug → violet, lab → blue,
  condition → amber, etc.).
- `<FloatingTooltip />` — portal-rendered tooltip that escapes
  `overflow-hidden` ancestors. Used by `<CollideTitleEvidenceTip />`
  and `<MedicalHistorySectionTooltip />`.

## Adding a fifth card

1. Define the data shape inside `components/tp-rxpad/dr-agent/types.ts`'s `VeloraV0*Data` block and append a `| { kind: "velora_v0_…"; data: … }` to the `RxAgentOutput` union.
2. Write `VeloraV0FooBarCard.tsx` next to the others. Use `<CardShell />` for the chrome.
3. Register the dispatch in `CardRenderer.tsx`.
4. Wire the reply emission in `lib/velora/v0-replies.ts` — match the canned question, attach the right `suggestions[]` from `getVeloraFollowUps(...)`.
5. Add a section to this catalogue.

## Related docs

- [velora-data-layer.md](./velora-data-layer.md) — how replies are built.
- [velora-design-tokens.md](./velora-design-tokens.md) — sticky cascade, AI palette.
- [`../velora-patients/CROSS-CONSULTATION-BRIEF-ARCHETYPE.md`](../velora-patients/CROSS-CONSULTATION-BRIEF-ARCHETYPE.md) — the canonical Stack 1 brief shape.
