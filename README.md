# Velora — Dr.Agent POC

Velora is a hospital-grade clinical-context surface that lives inside the existing EMR workflow. Its job is to answer four questions for a clinician opening a complex patient cold:

> Who is this patient? · Who has been involved? · What demands my attention? · How do I know I can trust the synthesis?

The repo runs an end-to-end demo against six real OMOP CDM v5.4 patient slices, with every claim row-attributable to source data.

---

## The three live intents

| Intent | What it answers | Card kind |
|---|---|---|
| **Cross-consultation brief** | Everything every specialty team wrote, verbatim. Medical history + per-visit Rx + cross-team synthesis (Stack 2). | `velora_v0_mdt_brief` |
| **Patient journey** | The hospital timeline — every signed encounter, admission, MDT, open loop — in date order. | `velora_v0_patient_journey` |
| **Recent trends** | Per-patient available vital / lab trends, each with a structured card (series · target · citation). Two welcome-card entry points: *Recent vital trends* + *Recent lab trends*. | `velora_v0_trend_menu` · `velora_v0_trend_detail` |

The two-stack architecture (Stack 1 = verbatim OMOP, no AI authorship · Stack 2 = AI-bounded synthesis with cited guidelines) is the single doctrine that runs through every screen. See [`docs/velora-patients/WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md`](./docs/velora-patients/WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md) §4 for the canonical explainer.

---

## Demo cookbook · what to type, what to see

The demo surface ships with **six** canonical patients, all derived from real OMOP exports. The agent recognises the patient by name or person-ID; the unqualified default is Lakshmi Iyer.

| # | Patient | Person ID | What the demo proves |
|---|---|---|---|
| **P1** | Lakshmi Iyer (F · 76) | `1093717054960` | Pre-op breast Ca with multi-specialty clearance chain incomplete. The richest Stack-2 (DDI + coordination gap with ingredient-level overlap). |
| **P2** | Suresh Patel (M · 60) | `843373981236` | Colon Ca T3N2b + lung mets + polypharmacy across 12 specialties. Overdue oncology surveillance is the headline. |
| **P3** | Asha Krishnan (F · 57) | `375391871728` | Deliberately sparse — single-specialty anchor + episodic viral fevers. Tests the "honest absence" surface. |
| **P4** | Meera Joshi (F · 58) | `241381057447` | CAD + prior CVA + dense metabolic stack on long-running DAPT. Cross-team de-prescribing opportunity. |
| **P5** | Anita Desai (F · 64) | `714696991886` | Severe hypertriglyceridaemia + recurrent pancreatitis. Fibrate-gap intervention. |
| **P6** | Arjun Verma (M · 14) | `319033560465` | The only **IPD** case — 3-day admission for Wilson's + acute HAV. The IPD visit renders as a full discharge summary (not OPD-style sections). |

### A typical demo flow

1. **Open the agent** on the homepage. Three welcome cards: *Cross-consultation brief* · *Patient journey* · *Recent vital trends* + *Recent lab trends* (the trends card is split).
2. **Type a free-form question** like *"Show cross-consultation brief for Lakshmi Iyer"*. The agent's preamble is a fully data-driven sentence (no AI text), then the two-stack card stack renders.
3. **Tap a trend chip** on the Recent-trends menu. The reply is a structured `TrendDetailCard` with series + target + citation — not plain text.
4. **Open Guideline Settings** (the labelled `⚙ Guidelines [ADMIN]` chip in the agent header). Pick which published bodies your hospital signs for use. Save. The Clinical-synthesis card re-renders with only signed bodies' panels.
5. **Ask an unavailable question** like *"Show wound-culture trend for Lakshmi"*. The guardrail card surfaces — same UI as the menu, with a banner saying the trend isn't on file and the available chips re-surfaced.

---

## Repo map (only the bits you need to know)

| Path | Purpose |
|---|---|
| `components/tp-rxpad/dr-agent/cards/velora-v0/` | Card renderers for the three live intents + helpers. |
| `components/tp-rxpad/dr-agent/shell/` | Agent shell — header, sidebars (specialty timeline, guideline settings), view-mode context. |
| `lib/velora/v0-replies.ts` | The patient mocks + the reply pipeline that routes free-text intents. |
| `lib/velora/v0-trends.ts` | Per-patient trend registry (which chips fire for which patient + the structured series). |
| `lib/velora/guideline-registry.ts` | The hospital-signed guideline catalogue + the admin's persisted selection. |
| `lib/velora/v0-followups.ts` | Sub-intent + pivot suggestions surfaced as canned pills. |
| `docs/velora-patients/` | Patient-by-patient walkthroughs + the canonical architecture explainer. |
| `docs/velora-v0-recent-trends.md` | Recent-trends-specific design doc — chip selection logic + card shapes. |

---

## The Stack 1 / Stack 2 doctrine (memorise this)

> **Stack 1 — the Cross-consultation brief card.** Verbatim from OMOP. **No AI authorship.** AI only routes the doctor's intent and pulls the right patient.
>
> **Stack 2 — the Clinical synthesis card.** AI applied, **bounded**:
> 1. *Picks* which hospital-signed guideline panels apply (NCCN · NICE · ESC · ADA · KDIGO · Beers · WHO HEARTS · AASM).
> 2. *Ranks* detector fires by severity within the cited rule's framework.
> 3. *Composes* the one-line collision title.
>
> The panel content itself stays verbatim from the cited rule. **AI is a librarian, not an author.** There is no third "AI opinion" category anywhere on the surface.

For the full version see [`docs/velora-patients/WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md`](./docs/velora-patients/WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md) and [`docs/velora-patients/CLINICAL-SYNTHESIS.md`](./docs/velora-patients/CLINICAL-SYNTHESIS.md).
