# Cross-consultation brief · base archetype

> A developer + designer reference. For each section of the card, this document
> answers three questions:
>
>   1. **What goes here?** — the kind of content the section is meant to show
>   2. **Where do we fetch it from?** — the underlying data source
>   3. **How is it formatted?** — the visual / text contract on the rendered card
>
> No patient data, no mock content, no clinical names. Just the structural
> anatomy. When a developer needs to add a new patient or a new intent, this
> is the spec they implement against.

---

## 1 · The four movements

The card answers four questions a clinician asks when opening an unfamiliar
multi-specialty patient:

```
  ① Who is this patient?                  → Movement 1 · Medical history
  ② Who has been involved, and what       → Movement 2 · Specialty
     is each team thinking?                  consultations
  ③ What demands attention?               → Movement 3 · Where they collide
  ④ How do I know I can trust this?       → Movement 4 · Trust contract
                                             (inline tooltips + open loops
                                             + guideline anchors)
```

---

## 2 · Movement 1 · Medical history

A single block at the top of the card. Each sub-section is rendered as a
tone-tinted **tag chip** followed by **one pipe-divided bullet** that lists
every item in that group. The chip's ⓘ icon opens a tooltip listing the
contributing consultations + a "why this matters" sentence.

The card renders exactly five sub-sections, in this order. **Every** patient
gets every sub-section — when there's no data, we show the fallback line so
the doctor knows the absence was checked, not skipped.

### 2.1 Primary problem

| Aspect | Spec |
|---|---|
| **What it shows** | The headline diagnosis (or 2-3) driving every other team's decisions. Active cancer with staging, recurrence signals, the cardiovascular event that anchors secondary prevention, the metabolic syndrome that drives polypharmacy — whatever is the *reason* this case is complex. |
| **Where it's fetched from** | `condition_occurrence` rows where `condition_status_concept_id` resolves to "Active". Picked from the patient's most recent consultations with the team that owns the primary problem (typically Oncology / Cardiology / Hepatology / Endocrinology). Cross-validated against `drug_exposure` class signatures (e.g. Letrozole → ER+ breast Ca) and `observation.symptoms_text` markers (e.g. *"KNOWN CASE OF HTN AND IHD"*). |
| **How it's formatted** | One item per distinct primary problem. Each item is a single string in the shape `**Name** (detail, detail, detail)`. No em-dashes. No pipes inside an item. Items separated by ` | ` when rendered together. Bold for the diagnosis name; parens carry stage, sub-type, current treatment phase, recurrence signal. |
| **Tone** | `primary` → red chip |
| **Fallback when empty** | `**No primary problem identified**` with reasoning explaining that no team is currently driving the case (e.g. routine adult check-ups). |

### 2.2 Co-morbidities

| Aspect | Spec |
|---|---|
| **What it shows** | The chronic conditions on the patient's problem list. Each one is something the doctor needs to remember exists but is not the *reason* for today's visit. |
| **Where it's fetched from** | `condition_occurrence` rows tagged Active where `condition_type_concept_id` resolves to a Medical Problem section (vs Family History / Surgical History). Frequency across visits is used to score evidence strength — conditions that appear in 5+ separate consultations rank above one-off mentions. Cross-checked against the chronic-medication signatures in `drug_exposure`. |
| **How it's formatted** | One item per condition. Format is `**Name**` for bare conditions (no detail needed) or `**Name** (detail)` when severity, sub-type, or treatment context matters (e.g. `**Hypertension** (resistant pattern on 3 agents)`). Multiple conditions show as a single pipe-divided bullet. |
| **Tone** | `neutral` → slate chip |
| **Fallback when empty** | `**No additional chronic conditions on record**` with reasoning noting that no chronic conditions beyond the primary problem are documented. |

### 2.3 Surgical history

| Aspect | Spec |
|---|---|
| **What it shows** | Past procedures relevant to current management. Surgery is its own category because (a) the date matters and (b) future surgical planning has to know what's already been done. |
| **Where it's fetched from** | `condition_occurrence` rows tagged with a Surgical History section, plus narrative parsing of phrases like *"S/P [procedure] on [date]"*, *"Operated for [procedure]"*, *"Post-[procedure]"* inside `observation.symptoms_text` and free-text consultation notes. When the OMOP `note` table has Operative Notes, those override the narrative parse. |
| **How it's formatted** | One item per procedure. Format is `**Procedure name** (date)` when the date is known, `**Procedure name** (historical)` when it's clearly past but undated, `**Procedure name** (date pending)` for booked-but-not-yet-done. |
| **Tone** | `neutral` → slate chip |
| **Fallback when empty** | `**No surgical history found**` — explicit so the absence is visible. Reasoning notes whether the absence is real or reflects an ingestion gap. |

### 2.4 Allergies & safety

| Aspect | Spec |
|---|---|
| **What it shows** | Drug, food, and contrast allergies the patient has tested for or declared. The explicit *absence* of allergies (verified across visits) is treated as data, not a gap. |
| **Where it's fetched from** | `condition_occurrence` rows containing patterns like *"No known [drug/food/contrast] allergy"*, *"Allergic to …"*, *"NKA"*. The count of independent verifications across visits feeds the confidence note (e.g. *"verified across 6 visits"*). |
| **How it's formatted** | Positive verifications: `**No known drug allergy** (verified across N visits)`. Active allergies: `**Allergic to [substance]** (reaction type)`. When no allergy data exists at all: `**Allergy review not on file**` — never silently absent. |
| **Tone** | `positive` → violet chip |
| **Fallback when empty** | `**Allergy review not on file**` (or `**Allergy review not explicitly verified**` when partially documented). Reasoning explains the implication for safe prescribing. |

### 2.5 Family / Social history

| Aspect | Spec |
|---|---|
| **What it shows** | First-degree-relative disease patterns (oncology, cardiac, metabolic), and social-history items that drive risk stratification (smoking, alcohol, occupation, travel). |
| **Where it's fetched from** | `condition_occurrence` rows tagged with a Family History or Social History section (in the source HMIS, these are tagged sections within the medical-history JSON). When the section exists but is empty, the explicit `"No significant family / social history"` rows are surfaced as positive verifications. |
| **How it's formatted** | Per condition / per risk factor: `**Item** (context)`. When empty: `**No significant family history**` and `**No significant social history**` rendered as separate items in one bullet. |
| **Tone** | `positive` → violet chip |
| **Fallback when empty** | `**Family and social history not on file**` — explicit. |

### 2.6 The tag-chip ⓘ tooltip · uniform across all five sub-sections

When the doctor hovers the info icon on any sub-section tag:

```
   SOURCES (N)
     • doctor (specialty) · date
     • doctor (specialty) · date
     • doctor (specialty) · date
     + N more consultations    ← shown when total > 6

   WHY THIS MATTERS
     One short sentence explaining why this group is in the brief.
     Written for the clinician, not the data team.
```

**Source list** is capped at 6 visible rows; overflow renders as `+ N more`.
The sources are the OMOP consultations that contributed evidence to the
group's content.

### 2.7 Visual styling reference

| Tone | Chip background | Chip text | Bullet dot |
|---|---|---|---|
| `primary` | `bg-tp-error-50` | `text-tp-error-700` | `bg-tp-slate-500` |
| `neutral` | `bg-tp-slate-100` | `text-tp-slate-700` | `bg-tp-slate-500` |
| `positive` | `bg-tp-violet-50` | `text-tp-violet-700` | `bg-tp-violet-500` |

Tag chip: `12px` font, semibold, `7px × 3px` padding, `4px` radius. Info
icon: `14px` Bold variant, slate-600 colour, slate-800 on hover.

---

## 3 · Movement 2 · Specialty consultations

One card per active specialty team. Cards render in priority order
(highest-clinical-weight teams first). Every card has the same anatomy:

```
   ┌─ {Specialty}            {date range} · {N} visits · {drs} · ⓘ ─┐
   │                                                                │
   │   [FINDINGS]   {pipe-divided content}                          │
   │   [MEDICATIONS] {pipe-divided ongoing-only content}            │
   │   [PLAN]       {pipe-divided content}                          │
   │                                                                │
   │   ⚠ OPEN LOOPS ON THIS SPECIALTY                              │
   │     • {captured-but-not-shown · missing-upstream · guideline-  │
   │        anchored gap}                                           │
   └────────────────────────────────────────────────────────────────┘
```

### 3.1 Header trailing

| Aspect | Spec |
|---|---|
| **What it shows** | The compact summary of this team's engagement: when they saw the patient (date range), how often (visit count), and who (doctor names). |
| **Where it's fetched from** | `MIN(visit_start_date)` and `MAX(visit_start_date)` grouped by `provider.specialty`. Doctor names from the `provider.name` field, joined for multi-doctor specialties. Visit count from a `COUNT(DISTINCT visit_occurrence_id)`. |
| **How it's formatted** | `{shortStartDate} → {shortEndDate} · {N} visits · {Dr X / Dr Y}`. For single-day engagements, just `{shortDate} · 1 visit · Dr X`. IPD admissions get an `(IPD)` marker appended to the date range: `24 → 26 Feb '26 (IPD)`. |

### 3.2 Findings · the diagnostic + examination signal

| Aspect | Spec |
|---|---|
| **What it shows** | The clinical picture this team has built up over their consultations with the patient. We analyse *all* their consultations together, not just the most recent — what conditions did they diagnose, what did exam reveal, what symptoms were prominent, what investigations have they already interpreted. The output is a single sentence summarising the cross-visit picture. |
| **Where it's fetched from** | Three joined sources: (1) `condition_occurrence` rows where the provider matches and status is Active (their diagnoses); (2) `observation.symptoms_text` rows on their visits (chief complaints, history of present illness); (3) `observation.examination_text` rows on their visits (physical exam findings); (4) when available, `note.note_text` rows of type "Examination Findings" or "History of Present Illness". |
| **How it's formatted** | Single-line pipe-divided summary. Bold for clinical entities (diagnoses, abnormal values, severity grades). Parens carry context. Example shape: `Post-op surveillance for **T3N2b stage IIIB colon Ca** | multi-visit pattern, no fresh complaints | exam no gross focal deficit`. |
| **Fallback** | When the team has no documented findings across their visits, render `Findings: Visits recorded but no diagnostic narrative captured.` |

### 3.3 Medications · ongoing-only

| Aspect | Spec |
|---|---|
| **What it shows** | **Only the medications this team has prescribed that are still active.** Past acute courses that have already ended are not shown — they're noise. Chronic medications and currently-in-progress courses are shown. |
| **Where it's fetched from** | `drug_exposure` rows where provider matches and `drug_exposure_end_date` is in the future OR within the last 7 days (the "just-completed" grace window). For drugs without explicit end dates (chronic regimens), inferred-active using class signatures (e.g. levothyroxine, chronic statins, gabapentinoids) where prescribed within the last 6 months. |
| **How it's formatted** | Single pipe-divided list. Each item: `**Brand name** (generic, dose, frequency)`. Example: `**Cilamin 250 mg** (Penicillamine) | **Wysolone 10 mg** (Prednisolone, tapering) | **Ursocol 300** (UDCA)`. Status modifiers in parens when relevant: *(continued)*, *(newly started)*, *(taper schedule)*, *(refill pending)*. |
| **When the row is hidden entirely** | When there are zero ongoing medications from this team, the **entire row is omitted** from the card. We don't render `Medications: none`. The plan row may note the closure (e.g. *"5-day course completed 12 May 2026"*) but the medications row itself disappears. This keeps the card tight. |

### 3.4 Plan · forward-looking actions

| Aspect | Spec |
|---|---|
| **What it shows** | What this team has scheduled next + what investigations they've advised + what advice they gave the patient. The forward-looking complement to Findings (which is backward-looking). |
| **Where it's fetched from** | `observation` rows joined by visit: rows with `observation_source_value = 'followup_date'` give the next-visit date; `'investigation_text'` rows give labs/imaging advised; `'advice_text'` rows give counselling content; `'followup_advice'` gives additional follow-up notes. When `note.note_title = 'Discharge Advice'` exists (for IPD discharges), that takes precedence. |
| **How it's formatted** | Single pipe-divided list. Format: `Follow-up **{date}** | Investigations advised: {list} | Advice: {short summary} | {surgical-booking or referral note if any}`. Date highlighted in bold so the doctor can see at a glance when this team plans to see the patient again. |
| **Fallback** | When no plan information exists: `Plan: No forward-looking actions on record.` |

### 3.5 Open loops · the no-data-loss disclosure block

A separate amber-tinted block that appears at the bottom of any specialty
card where at least one loop is detected. **Always rendered when applicable
— never collapsed or hidden.**

#### What goes into open loops (the catalogue)

The open-loops block surfaces three categories of finding. Each category
has its own detector logic.

##### Category A · Captured upstream but not surfaced in this card

| Loop | Logic |
|---|---|
| Examination notes truncated | We show one summary line of `observation.examination_text`; the deep-dive view has the full delimited content. Surface the truncation so the doctor knows more is available. |
| Discharge summary partial | When the OMOP `note` table for an IPD admission has fewer than the expected discharge-summary titles (Hospital Course, Operative Note, Discharge Advice, Warning Signs, Discharge Condition), list the missing titles as a loop. |
| Provider notes restricted | Private provider notes (`note_type_concept_id` corresponding to "Private Note") exist but are provider-scoped — list their presence so the doctor knows the deep-dive will have them. |

##### Category B · Missing from upstream entirely

| Loop | Logic |
|---|---|
| Investigation advised, no result | `observation.investigation_text` mentions a test (e.g. "CBC", "CEA", "PET-CT") but no `measurement` row with a matching `measurement_source_value` exists for the same patient within 90 days. The advised investigation is unfulfilled or not ingested. |
| Required monitoring lab missing | For a known active condition, if the standard monitoring panel (HbA1c for T2DM, TSH for hypothyroidism, eGFR for CKD, CEA for colon Ca surveillance) has no `measurement` row within the guideline-recommended interval, flag as missing. |
| Allergy verification absent | If the patient has any `drug_exposure` rows but no `condition_occurrence` row tagged with an Allergy section, the prescription stream is operating without documented allergy review. |
| IPD admission in narrative only | A `Symptom.canonical_name` or `observation.symptoms_text` mentions phrases like "Operated for X on DD/MM/YY" or "admitted at" but no `visit_occurrence` row with `visit_concept_id = 9201` matches. The IPD slice is missing from upstream. |
| Vitals trend absent | The condition needs longitudinal vitals (HTN → BP trend, T2DM → weight + BP) but `measurement` rows for the relevant LOINC are sparse or missing. |
| Family screening obligation unmet | The active diagnosis is a genetic condition (Wilson's, BRCA, familial cardiomyopathy) but no first-degree-relative screening entries exist in `condition_occurrence` Family History rows. |
| Vaccine status not documented | The active regimen is immunosuppressive (steroids, biologics, chemo) but the `observation` rows don't include vaccination status — pneumococcal, varicella, hepatitis. |

##### Category C · Guideline-anchored gaps

| Loop | Logic |
|---|---|
| Surveillance overdue | For a primary problem with a guideline-defined surveillance cadence (NCCN for cancers, ESC for CCS, AAS for AAA), compute `(today − MAX(visit_start_date WHERE specialty = guardian_specialty))`. If this exceeds the cadence threshold, flag as overdue with the cited guideline section. |
| Follow-up advised, not kept | When `observation.followup_date` set a date that has passed without a matching `visit_occurrence` within 14 days of that date, flag the missed follow-up. |
| DAPT duration exceeded | When Aspirin + a P2Y12 inhibitor have been continuously active for >12 months in chronic CCS, flag for de-escalation review per ESC. |
| Combination therapy without sign-off | Non-guideline combinations (e.g. T3+T4 for hypothyroid, double SSRI/SNRI) detected across specialties — flag for reconciliation. |
| Cross-team prescription duplication | Same drug class prescribed by two different specialties without a documented coordination note — flag the duplication and name both prescribers. |
| Cardiac fitness sign-off pending | Pre-operative patient flagged for surgery but no Cardiology clearance documented in the date window between Cardiology last contact and surgery date. |
| Visit overdue per anchor team's recommended cadence | When the anchor specialty (Oncology, Cardiology) recommended a return cadence on their last note but no return visit has happened, surface as a loop. |

#### How open loops are formatted

Each loop is one short sentence, ideally citing the rule that triggered it:

```
   ⚠ OPEN LOOPS ON THIS SPECIALTY
     • Oncology surveillance overdue (last contact 30 Sep 2025; 6+ months gap;
       NCCN Colon Ca v.2.2024 §SURV-2 expects q3-6 mo)
     • CEA tumour marker last ordered 4 Apr 2025; no result on file
     • PET-CT ordered same date; no result captured
```

Block visual: amber background (`bg-tp-warning-50/50`), amber-200 border, a
flag icon header reading "Open loops on this specialty" in uppercase
warning-800 colour. Each bullet uses an amber-500 dot.

---

## 4 · Movement 3 · Where they collide (Stack 2)

A separate card below the specialty cards. Lists every detector fire across
all teams as its own sub-entry. Two kinds:

### 4.1 DDI flags

| Aspect | Spec |
|---|---|
| **What it shows** | Drug-drug interactions detected across the patient's active medication list. Each one has a title naming the drug pair, bullet points explaining the risk, and a cited guideline chip. |
| **Where it's fetched from** | Class-based detectors over the joined `drug_exposure` + `condition_occurrence` + `provider` data. Detectors include sedative + opioid stack (Beers), DAPT duration (ESC), gabapentinoid double-dose (NICE CG173), NSAID-on-DAPT, statin-fibrate, ARB+ACEi, etc. The detector library is class-based, not patient-specific. |
| **How it's formatted** | Card with `DDI flag` red badge, drug-pair title in bold, 3-5 bullet points explaining the chain. Guideline chip on the right names the cited rule. |

### 4.2 Coordination gaps

| Aspect | Spec |
|---|---|
| **What it shows** | Non-DDI coordination failures: overdue surveillance, classification mismatches (IV-grade care coded as OPD), incomplete pre-op clearance chains, missed referral closures. |
| **Where it's fetched from** | Same join as DDIs, but with detectors targeting visit-cadence + visit-classification + multi-team coordination patterns rather than drug pairs. |
| **How it's formatted** | Same card layout as DDIs but with `Coordination gap` amber badge. |

### 4.3 Guideline-anchored synthesis panels

Below the collisions block, a set of structured panels applying named
clinical guidelines to the patient's data:

| Aspect | Spec |
|---|---|
| **What it shows** | A small structured table per relevant guideline. Each row is one guideline-specified metric, the patient's computed value, and a tone marker. |
| **Where it's fetched from** | Computed from `measurement` + `condition_occurrence` + `drug_exposure`. The guideline determines which inputs the panel needs (e.g. NCCN surveillance → time since last oncology contact + CEA result status; Beers Criteria → sedative-class drug count). |
| **How it's formatted** | Section heading with the guideline chip on the right. Body is a 3-5 row mini-table: `Label : Value (tone-coloured)`. Optional `ref` field per row carries the derivation logic in an ⓘ tooltip. |

### 4.4 Pending MDT items

| Aspect | Spec |
|---|---|
| **What it shows** | The "what should the team do next" list. Concrete actionable items rolled up from the open loops + collisions + guideline panels above. |
| **Where it's fetched from** | Synthesised from the union of open loops across all specialties + collision recommendations + guideline-panel alerts. |
| **How it's formatted** | Flat bullet list under an emergency-icon heading. Each item: one short imperative sentence. |

---

## 5 · Movement 4 · Trust contract (cross-cutting)

The "how do I know I can trust this" layer doesn't live in one section — it
threads through every section. Three concentric mechanisms:

### 5.1 Header attribution

Every specialty card states up-front the date range, visit count, and doctors.
The doctor sees the *evidence weight* before they read the synthesis below.

### 5.2 Group source tooltip

Every Medical History tag chip and every Stack 2 panel heading has an ⓘ
that opens a tooltip listing the contributing consultations + the reasoning
for inclusion.

### 5.3 Open loops block

Per-specialty amber block surfacing missing data + overdue actions. Absence
is never silent — when something the doctor would expect to see *isn't*
here, the brief says so explicitly.

---

## 6 · Visual contract summary

### Patient strip (above the body)

```
   {Patient name} (M, age)        ← (M, age) in parens, no mobile, no ID
```

Mobile number and canonical patient ID stay in the PatientSelector bottom
sheet — they don't clutter the card.

### Medical history sub-section bullet

```
   [TAG CHIP ⓘ]
     • **Item name** (detail, detail) | **Item name** (detail) | …
```

- Tag chip: 12px semibold, tone-tinted background + foreground.
- Item bullet: 13.5px slate-700.
- Bold spans for clinical entities (diagnoses, key drugs, abnormal values).
- Pipe dividers between items, rendered as styled vertical bars (slate-200).
- No em-dashes anywhere in item text. Details go in parens with commas.

### Specialty card header

```
   [Specialty]      {date range} · {N} visits · {drs} · ⓘ
```

### Specialty body row

```
   • [FINDINGS]      Pipe-divided content with **bold** for clinical entities.
   • [MEDICATIONS]   (hidden when no ongoing Rx)
   • [PLAN]          Pipe-divided content; follow-up date highlighted bold.
```

Each label is an inline uppercase chip — `Findings`, `Medications`, `Plan`.

### Open loops block

```
   ┌─ ⚠ OPEN LOOPS ON THIS SPECIALTY ────────────────────────────────┐
   │   • {short imperative sentence with cited rule}                  │
   │   • {short imperative sentence}                                  │
   └──────────────────────────────────────────────────────────────────┘
```

---

## 7 · Data flow · OMOP → mock → UI

```
   ┌────────────────────────┐
   │  Source HMIS (MySQL +  │   Pm-Casemanager · Pm-PatientMaster · Pm-Vital
   │  MongoDB)              │   · Pm-medicalHistory · Pm-Patient-Docs ·
   └────────────┬───────────┘   Pm-IPD · Pm-Growth-Chart · Pm-User-Master
                │
                │  ETL
                ▼
   ┌────────────────────────┐   person · visit_occurrence ·
   │  OMOP CDM v5.4         │   condition_occurrence · drug_exposure ·
   │  (PostgreSQL)          │   measurement · observation · note ·
   └────────────┬───────────┘   provider · care_site · location
                │
                │  Velora synthesis engine
                ▼
   ┌────────────────────────┐
   │  VeloraV0MdtBriefData  │   medicalHistory[] · specialties[] ·
   │  shape                 │   collisions[] · syntheses[] ·
   └────────────┬───────────┘   pendingMdtItems[] · freshness
                │
                │  Per-patient mock in lib/velora/v0-replies.ts
                ▼
   ┌────────────────────────┐
   │  Card render           │   VeloraV0MdtBriefCard.tsx — single React
   │  (Stack 1 + Stack 2)   │   component reads any compliant mock
   └────────────────────────┘
```

---

## 8 · How to add a new patient

1. Export the patient's OMOP slice — 8 CSV files (`person`, `observation_period`,
   `visit_occurrence`, `condition_occurrence`, `drug_exposure`, `measurement`,
   `observation`, and `note` if available).
2. Parse with `scripts/parse_omop_patient.py` to inspect the structured data.
3. Write a per-patient walkthrough MD under `docs/velora-patients/P{N}-{name}-{personId}.md`.
4. Add to `RX_CONTEXT_OPTIONS` (`constants.ts`) — anonymised display name,
   meta string, gender, age, and `careType` (`OPD` / `IPD` / `IPD + OPD`).
5. Add a stub to `SMART_SUMMARY_BY_CONTEXT` (`mock-data.ts`).
6. Add the ID to `VELORA_V0_PATIENT_IDS` (`velora-patients.ts`).
7. Write the full `*_BRIEF_MOCK` in `lib/velora/v0-replies.ts` following the
   schema in section 2 above.
8. Add a router branch in `v0-replies.ts` that matches the patient's name.
9. `npx tsc --noEmit` — should produce zero new errors.

---

## 9 · Code locations

| Concern | File |
|---|---|
| Type definitions | `components/tp-rxpad/dr-agent/types.ts` |
| Card render | `components/tp-rxpad/dr-agent/cards/velora-v0/VeloraV0MdtBriefCard.tsx` |
| Pipe + bold rendering primitives | `cards/velora-v0/highlight.tsx` |
| Per-patient mock factory | `lib/velora/v0-replies.ts` |
| Patient catalogue | `components/tp-rxpad/dr-agent/constants.ts` |
| Chat routing | `lib/velora/v0-replies.ts` |
| PatientSelector with IPD chip | `components/tp-rxpad/dr-agent/shell/PatientSelector.tsx` |
| OMOP mapping doc (source schema reference) | `/Users/shyamsundar/Documents/Archive.zip` |

---

*Living document. When the card's schema or the underlying data architecture
changes, this file changes too. The card is the source of truth; this doc
mirrors it.*
