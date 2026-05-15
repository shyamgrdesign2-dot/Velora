# Velora canonical patients

Six real OMOP CDM v5.4 exports — one MD per patient documents the cross-consultation brief grounding and the gaps the card chooses NOT to surface (the no-data-loss audit trail).

> Source archives live in [`data/`](./data/) under canonical names. Drift between exports is tracked in [`CROSS-VERIFICATION.md`](./CROSS-VERIFICATION.md).

> **Looking for the Velora design-system / architecture docs?** They live alongside this folder at [`../velora/`](../velora/) — start with [`../velora/README.md`](../velora/README.md). This folder is the patient-data layer only.

---

## The architecture in one paragraph (read this first)

Velora's Cross-consultation surface is **two stacks**, separated by a strict rule about where AI may operate.

- **Stack 1 — the Cross-consultation brief card.** Pure verbatim mirror of OMOP CDM data. Every drug, date, diagnosis, advice line and follow-up note is row-attributable to a specific OMOP row. **No AI authors any value here.** AI's only role in Stack 1 is intent routing — recognising *"Show cross-consultation brief for Asha"* and pulling Asha's record.
- **Stack 2 — the Clinical synthesis card.** AI applied, **bounded**. AI picks which published guideline panels apply (NCCN · NICE · ESC · ADA · KDIGO · Beers · WHO HEARTS · AASM — the hospital's signed library), ranks detector fires by severity, and composes a one-line title over each. **Panel content stays verbatim from the cited guideline.** AI is a librarian, not an author.

Both stacks ship with citation chips. Stack 1 cites OMOP rows; Stack 2 cites published rules. There is no third category called "the AI's opinion" anywhere on the surface.

For the full explanation (audience: clinical lead, product team, regulatory reviewer), see [`WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md`](./WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md) §4.

---

## Roster

| # | Person ID | Display name | Sex · Age | Visits | Provs | Care | OMOP scenario | Doc |
|---|---|---|---|---:|---:|---|---|---|
| P1 | 1093717054960 | **Lakshmi Iyer** | F · 76 | 21 | 15 | OPD | Breast Ca stage IA + CAD + CKD + OSA · 17-day burst | [P1](./P1-lakshmi-iyer-1093717054960.md) |
| P2 | 843373981236 | **Suresh Patel** | M · 60 | 28 | 12 | OPD | Colon Ca T3N2b + lung mets + polypharmacy · 13 mo | [P2](./P2-suresh-patel-843373981236.md) |
| P3 | 375391871728 | **Asha Krishnan** | F · 57 | 59 | 4 | OPD | HTN + post-Achilles repair + intercurrent viral fevers · 12 mo | [P3](./P3-asha-krishnan-375391871728.md) |
| P4 | 241381057447 | **Meera Joshi** | F · 58 | 40 | 11 | OPD | CAD + CVA + DM + Hypothyroid + NAFLD + obesity · 13 mo | [P4](./P4-meera-joshi-241381057447.md) |
| P5 | 714696991886 | **Anita Desai** | F · 64 | 33 | 15 | OPD | DM + HTN + hypertriglyceridaemia + recurrent pancreatitis + asthma · 17 mo | [P5](./P5-anita-desai-714696991886.md) |
| P6 | 319033560465 | **Arjun Verma** | M · 14 | 6 | 2 | **IPD+OPD** | Wilson's + acute HAV · 3-day admission + 5 OPD f/u · **315 labs + 4 notes** | [P6](./P6-arjun-verma-319033560465.md) |

> Display names are anonymised. Person IDs are canonical OMOP `person_id`s. Mobile numbers in the UI are deterministic from the person_id suffix (real format, fabricated digits).

---

## Stack 1 · what the brief card contains (no AI)

The verbatim brief is structured as one Medical-history block + a stack of per-specialty cards.

| Block | OMOP source | Doctor's question it answers |
|---|---|---|
| Medical history → Co-morbidities | `condition_occurrence` (chronic) | What chronic conditions does this patient carry? |
| Medical history → Surgical history | `condition_occurrence` (surgical) + `observation.surgical_history_text` | What procedures have they had? |
| Medical history → Allergies & safety | `condition_occurrence` (allergy concepts, incl. explicit-negative) | Are there allergy verifications on file? |
| Medical history → Active medications | `drug_exposure` filtered by `start_date + days_supply` window | What is the patient *currently* taking? |
| Medical history → Family / Social | `observation.family_history_text` + `observation.social_history_text` | Anything in the family / social context? |
| Per-specialty visit card | `visit_occurrence` + `condition_occurrence` + `drug_exposure` + `observation` joined on `visit_occurrence_id` | What did each doctor write in their note, verbatim? |

Every chip + every visit row carries an ⓘ tooltip with the specific OMOP rows behind it.

## Stack 2 · what the clinical-synthesis card contains (AI applied, bounded)

The synthesis card is split into three block types. AI's authoring scope is documented in [`WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md`](./WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md) §4.

| Block | What AI does | Citation example |
|---|---|---|
| **Where they collide** | Rule-based detectors compute the fire; AI ranks by severity + writes the one-line title | DDI: Naproxen × Apixaban (Lexicomp class rule LX-0042) |
| **Guideline-anchored panels** | AI picks which signed panels apply to this patient; content is verbatim from the cited rule | "Hormonal therapy + bone-protective bundle" — ASCO / NCCN 2024 |
| **Pending MDT items** | Cross-stack gap analysis surfaces the next coordination step | "Cardiology to release Echo report before surgical date booking" |

Every block carries a guideline-citation chip naming the body + year. **No clinical content originates in the LLM** — only the routing, ranking and titling do.

---

## Cross-cutting data-quality flags (relay to data eng)

These apply to every patient unless noted otherwise:

1. **Labs are absent from `measurement` for some patients.** P2 (Suresh) has 0 lab rows; P3-P5 have 18–222 measurements that include vitals only. Confirm `Pm-Patient-Docs.results` ingestion and re-export.
2. **Provider → specialty resolution is not in the export.** OMOP `provider_id` is present but specialty names live in source `tbl_department.dp_name`. Either ship the `provider` table or maintain a lookup. We resolved manually for these 6; it doesn't scale.
3. **IPD slice is patchy.** P2 has a GB-perforation surgery referenced in free text but no inpatient visit_occurrence row. P4 has TL + LSCS + Renal stone surgery as historical context only.
4. **`note` table not in any export.** Private notes, treatment notes, HPI narratives, OT notes, discharge advice — all routed to OMOP `note` per the mapping doc, none ingested here.
5. **Examination text uses custom delimiters** (`|~~|` and `//~//`). Render-time parser TBD.
6. **`drug_exposure.generic_name` is concatenated cruft** (BRAND|GENERIC|count|count). Render-time splitter TBD.
7. **`drug_exposure.days_supply` not yet populated** for legacy mocks. Active-medication filter passes through everything when this field is missing (conservative fallback). Future generator runs will set it from `tbl_dose_duration` so the filter actually scopes to current Rx window.

## Order in the live UI

The Velora chat surface currently routes the six demo patients (P1-P6) by name match in `lib/velora/v0-replies.ts`. Lakshmi Iyer (P1) is the catalogue's default — the unqualified "Show cross-consultation brief" command resolves to her.

## Related docs

- [`WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md`](./WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md) — full plain-English explainer with the Stack 1 / Stack 2 architecture, scenarios, and product-team summary
- [`CLINICAL-SYNTHESIS.md`](./CLINICAL-SYNTHESIS.md) — the dedicated Stack-2 spec: every block (Where they collide · Guideline panels · Pending MDT items), the AI's authoring scope, prompt-template instructions, clinical-significance hierarchy, and worked examples per patient
- [`CROSS-CONSULTATION-BRIEF-ARCHETYPE.md`](./CROSS-CONSULTATION-BRIEF-ARCHETYPE.md) — developer-facing schema + ASCII wireframes
- [`CROSS-VERIFICATION.md`](./CROSS-VERIFICATION.md) — OMOP export drift audit
- [`../velora-v0-recent-trends.md`](../velora-v0-recent-trends.md) — Recent-trends intent (intent ③), how the per-patient trend chips are selected
