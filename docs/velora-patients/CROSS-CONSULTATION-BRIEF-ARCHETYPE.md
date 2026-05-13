# Cross-consultation brief · base archetype

> Developer + designer reference. Skim the wireframe to see how the card is
> laid out; click any labeled element to jump to its spec. Specs use
> emoji-tagged rows so you can scan for **what · where · how · tone · fallback**
> without reading prose.

---

## 1 · The whole card at a glance

Every labeled element below is a link to its spec table further down.

```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║   ⚕  Cross-consultation brief                                            ║
║   ▸  Patient name (M, 60)                              ← § 2  Header     ║
║                                                                          ║
║   ────────────────────────────────────────────────────────────────────   ║
║                                                                          ║
║   ┌─  Medical history  ─────────────────────────────────────────  § 3 ─┐ ║
║   │                                                                   │ ║
║   │   🔴 Primary problem  ⓘ                                § 3.1     │ ║
║   │      Item (detail, detail) | Item (detail, detail)               │ ║
║   │                                                                   │ ║
║   │   ⚫ Co-morbidities  ⓘ                                  § 3.2     │ ║
║   │      Item | Item | Item                                          │ ║
║   │                                                                   │ ║
║   │   ⚫ Surgical history  ⓘ                                § 3.3     │ ║
║   │      Item (date) | Item                                          │ ║
║   │                                                                   │ ║
║   │   🟣 Allergies & safety  ⓘ                              § 3.4     │ ║
║   │      Item (verified) | Item (verified)                           │ ║
║   │                                                                   │ ║
║   │   🟣 Family / Social  ⓘ                                 § 3.5     │ ║
║   │      Item | Item                                                  │ ║
║   │                                                                   │ ║
║   └───────────────────────────────────────────────────────────────────┘ ║
║                                                                          ║
║   ┌─  Specialty consultations  (one card per team)  ─────────  § 4 ────┐ ║
║   │                                                                   │ ║
║   │   ⚕ {Specialty}                  (date | visits | drs)  →   § 4.1 │ ║
║   │   ──────────────────────────────────────────────────────         │ ║
║   │     🩺 FINDINGS     Pipe-divided content              § 4.2      │ ║
║   │     💊 MEDICATIONS  Ongoing only · hides when empty   § 4.3      │ ║
║   │     📅 PLAN         Follow-up + investigations        § 4.4      │ ║
║   │                                                                   │ ║
║   │     ┌─  🚩 Open loops on this specialty  ──────────────  § 4.5 ─┐ │ ║
║   │     │   • Captured upstream but not shown                       │ │ ║
║   │     │   • Missing from upstream entirely                        │ │ ║
║   │     │   • Guideline-anchored gap                                │ │ ║
║   │     └────────────────────────────────────────────────────────────┘ │ ║
║   │                                                                   │ ║
║   │     ↗  Chevron opens the sidebar  →                       § 4.6   │ ║
║   │                                                                   │ ║
║   └───────────────────────────────────────────────────────────────────┘ ║
║                                                                          ║
║   ┌─  Where they collide  (Stack 2)  ─────────────────────────  § 5 ──┐ ║
║   │     ⚠ DDI flag                       § 5.1                       │ ║
║   │     ⚠ Coordination gap               § 5.2                       │ ║
║   │     📈 Guideline-anchored panels     § 5.3                       │ ║
║   │     📋 Pending MDT items             § 5.4                       │ ║
║   └───────────────────────────────────────────────────────────────────┘ ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

Jump to:

- §&nbsp;2&nbsp;·&nbsp;[Header strip](#2--header-strip) ▸ name · gender · age
- §&nbsp;3&nbsp;·&nbsp;[Medical history](#3--medical-history)
  - 3.1&nbsp;·&nbsp;[Primary problem](#31--primary-problem-)&nbsp;🔴
  - 3.2&nbsp;·&nbsp;[Co-morbidities](#32--co-morbidities-)&nbsp;⚫
  - 3.3&nbsp;·&nbsp;[Surgical history](#33--surgical-history-)&nbsp;⚫
  - 3.4&nbsp;·&nbsp;[Allergies & safety](#34--allergies--safety-)&nbsp;🟣
  - 3.5&nbsp;·&nbsp;[Family / Social history](#35--family--social-history-)&nbsp;🟣
- §&nbsp;4&nbsp;·&nbsp;[Specialty consultations](#4--specialty-consultations)
  - 4.1&nbsp;·&nbsp;[Header trailing](#41--header-trailing)
  - 4.2&nbsp;·&nbsp;[Findings](#42--findings-)&nbsp;🩺
  - 4.3&nbsp;·&nbsp;[Medications](#43--medications-)&nbsp;💊
  - 4.4&nbsp;·&nbsp;[Plan](#44--plan-)&nbsp;📅
  - 4.5&nbsp;·&nbsp;[Open loops](#45--open-loops-)&nbsp;🚩
  - 4.6&nbsp;·&nbsp;[Sidebar](#46--specialty-sidebar)
- §&nbsp;5&nbsp;·&nbsp;[Where they collide (Stack 2)](#5--where-they-collide-stack-2)
- §&nbsp;6&nbsp;·&nbsp;[Trust contract](#6--trust-contract)
- §&nbsp;7&nbsp;·&nbsp;[Data flow](#7--data-flow)
- §&nbsp;8&nbsp;·&nbsp;[Adding a new patient](#8--adding-a-new-patient)

---

## 2 · Header strip

The compact identity line directly under the card title.

```
   {Patient name}  ({gender}, {age})
```

| Row | Spec |
|---|---|
| 🎯&nbsp;**What** | Patient identity in one line. |
| 📦&nbsp;**Where from** | `person.gender_source_value` &nbsp;·&nbsp; age derived from `person.birth_datetime` &nbsp;·&nbsp; display name from your anonymisation layer. |
| 🎨&nbsp;**Format** | `Name (M, 60)` — gender + age in parens, standard medical notation. |
| 🚫&nbsp;**NOT here** | Mobile + person ID. Those live in the PatientSelector bottom sheet, surfacing them again on every card crowds the header. |

[↑ back to wireframe](#1--the-whole-card-at-a-glance)

---

## 3 · Medical history

A single block at the top of the card. Five tone-tinted **inline tag chips**.
Each chip is followed on the same paragraph by a pipe-divided list of items.
The entire chip is the hover trigger — hovering opens a tooltip with the
contributing consultations and a "why this matters" sentence.

> [!IMPORTANT]
> **Every patient renders every sub-section.** When the data is empty, the
> fallback line surfaces explicitly so the doctor sees the absence was
> checked, not skipped. Silent omission breaks the trust contract.

### 3.1 · Primary problem 🔴

| Row | Spec |
|---|---|
| 🎯&nbsp;**What** | The headline diagnosis(es) driving every other team's decisions. Active cancer with staging, the cardiovascular event anchoring secondary prevention, the metabolic syndrome driving polypharmacy — the *reason* this case is complex. |
| 📦&nbsp;**Where from** | `condition_occurrence` rows where status resolves to **Active**, cross-validated against `drug_exposure` class signatures (e.g. Letrozole → ER+ breast Ca) and free-text `observation.symptoms_text` markers. |
| 🎨&nbsp;**Format** | One item per distinct primary problem. Pattern: `**Name** (detail, detail, detail)`. No em-dashes. No pipes inside an item. Bold for the diagnosis; parens carry stage, sub-type, current treatment phase. |
| 🎨&nbsp;**Tone** | 🔴 Red chip — `bg-tp-error-50 text-tp-error-700` |
| 🪂&nbsp;**Fallback** | `**No primary problem identified**` with a reasoning sentence noting that no team is currently driving the case. |
| 💡&nbsp;**Example** | `**Wilson's disease** (on chelation therapy, Penicillamine + Zinc) \| **Acute Hepatitis A** (HAV IgM positive, admitted 24 Feb 2026)` |

[↑ back to wireframe](#1--the-whole-card-at-a-glance)

### 3.2 · Co-morbidities ⚫

| Row | Spec |
|---|---|
| 🎯&nbsp;**What** | Chronic conditions on the patient's problem list. Each one is something the doctor needs to remember exists but is not the reason for today's visit. |
| 📦&nbsp;**Where from** | `condition_occurrence` Active rows of Medical-Problem section. Frequency across visits scores evidence strength — conditions in 5+ consultations rank above one-off mentions. Cross-checked against chronic-medication signatures. |
| 🎨&nbsp;**Format** | One item per condition. `**Name**` for bare conditions; `**Name** (detail)` when severity, sub-type or treatment context matters. Pipe-divided in a single bullet. |
| 🎨&nbsp;**Tone** | ⚫ Slate chip — `bg-tp-slate-100 text-tp-slate-700` |
| 🪂&nbsp;**Fallback** | `**No additional chronic conditions on record**` |
| 💡&nbsp;**Example** | `**Hypertension** \| **Dyslipidaemia** \| **Ischaemic heart disease** (IHD/CAD) \| **CKD** (acute on chronic)` |

[↑ back to wireframe](#1--the-whole-card-at-a-glance)

### 3.3 · Surgical history ⚫

| Row | Spec |
|---|---|
| 🎯&nbsp;**What** | Past procedures relevant to current management. Surgery is its own category because the date matters and future surgical planning has to know what's already been done. |
| 📦&nbsp;**Where from** | `condition_occurrence` rows tagged with a Surgical-History section, plus narrative parsing of phrases like *"S/P [procedure] on [date]"*, *"Operated for [procedure]"* inside `observation.symptoms_text`. When OMOP `note.note_title = Operative Note` exists, that takes precedence. |
| 🎨&nbsp;**Format** | One item per procedure. `**Procedure name** (date)` when date known · `**Procedure name** (historical)` when undated · `**Procedure name** (date pending)` for booked-but-not-done. |
| 🎨&nbsp;**Tone** | ⚫ Slate chip |
| 🪂&nbsp;**Fallback** | `**No surgical history found**` — explicit so the absence is visible. |
| 💡&nbsp;**Example** | `**Robotic-assisted Right Hemicolectomy** (30 Sep 2024) \| **Adjuvant chemotherapy** (6 cycles, completed)` |

[↑ back to wireframe](#1--the-whole-card-at-a-glance)

### 3.4 · Allergies & safety 🟣

| Row | Spec |
|---|---|
| 🎯&nbsp;**What** | Drug, food, contrast allergies the patient has tested for or declared. **The explicit *absence* of allergies** (verified across visits) is treated as data, not a gap. |
| 📦&nbsp;**Where from** | `condition_occurrence` rows containing patterns like *"No known [drug/food/contrast] allergy"*, *"Allergic to …"*, *"NKA"*. Verification count across visits feeds the "(verified ×N)" annotation. |
| 🎨&nbsp;**Format** | Positive verifications: `**No known drug allergy** (verified across N visits)`. Active allergies: `**Allergic to [substance]** (reaction type)`. When nothing on file: `**Allergy review not on file**` — never silently absent. |
| 🎨&nbsp;**Tone** | 🟣 Violet chip — `bg-tp-violet-50 text-tp-violet-700` |
| 🪂&nbsp;**Fallback** | `**Allergy review not on file**` with reasoning explaining the implication for safe prescribing. |
| 💡&nbsp;**Example** | `**No known drug allergy** (verified across 6 visits) \| **No known food allergy** (verified across 7 visits)` |

[↑ back to wireframe](#1--the-whole-card-at-a-glance)

### 3.5 · Family / Social history 🟣

| Row | Spec |
|---|---|
| 🎯&nbsp;**What** | First-degree-relative disease patterns (oncology, cardiac, metabolic) and social-history items that drive risk stratification (smoking, alcohol, occupation, travel). |
| 📦&nbsp;**Where from** | `condition_occurrence` rows tagged with a Family-History or Social-History section. Empty explicit-negative rows surface as positive verifications. |
| 🎨&nbsp;**Format** | Per condition / risk factor: `**Item** (context)`. When empty: `**No significant family history**` and `**No significant social history**` rendered together. |
| 🎨&nbsp;**Tone** | 🟣 Violet chip |
| 🪂&nbsp;**Fallback** | `**Family and social history not on file**` — explicit. |
| 💡&nbsp;**Example** | `No significant family history \| No significant social history` |

[↑ back to wireframe](#1--the-whole-card-at-a-glance)

### 3.6 · Tag tooltip · uniform across all five sub-sections

Hover the ⓘ icon (or anywhere on the chip) to open a portal-rendered
tooltip with two stacked blocks:

```
   SOURCES (N)
     • doctor (specialty) · date
     • doctor (specialty) · date
     • ... (capped at 6; "+ N more" appears for overflow)

   WHY THIS MATTERS
     One short sentence explaining why this group is in the brief.
```

The source list is the OMOP consultations that contributed evidence; the
reasoning is written for the clinician, not the data team.

---

## 4 · Specialty consultations

One card per active specialty team. Cards render in priority order
(highest-clinical-weight teams first). Anatomy:

```
   ⚕ {Specialty}                          (date | visits | drs) →
   ─────────────────────────────────────────────────────────────
     [FINDINGS]      Pipe-divided content
     [MEDICATIONS]   Pipe-divided ongoing-only content
     [PLAN]          Pipe-divided content

     ┌─ ⚠ OPEN LOOPS ON THIS SPECIALTY ───────────────────────┐
     │   • Loop one                                            │
     │   • Loop two                                            │
     └─────────────────────────────────────────────────────────┘
```

### 4.1 · Header trailing

| Row | Spec |
|---|---|
| 🎯&nbsp;**What** | Compact summary of this team's engagement: when (date range), how often (visit count), and who (lead doctor). The `→` chevron is the affordance to open the per-consultation sidebar. |
| 📦&nbsp;**Where from** | `MIN/MAX(visit_start_date)` grouped by `provider.specialty` · doctor names from `provider.provider_name` joined for multi-doctor specialties · visit count from `COUNT(DISTINCT visit_occurrence_id)`. |
| 🎨&nbsp;**Format** | `(date_range \| N visits \| Dr First) →` · Multi-doctor compacted to `Dr First +N`. Parens anchor the metadata visually; lighter `\|` pipes separate the value chunks. |
| 🎯&nbsp;**Special markers** | IPD admissions get an `(IPD)` suffix in the date range: `24 → 26 Feb '26 (IPD)`. |
| 💡&nbsp;**Example** | `(8 May → 30 Sep '25 \| 12 visits \| Dr Pankaj Shah +1) →` |

[↑ back to wireframe](#1--the-whole-card-at-a-glance)

### 4.2 · Findings 🩺

| Row | Spec |
|---|---|
| 🎯&nbsp;**What** | The clinical picture this team has built up across **all** their consultations with the patient — what they've diagnosed, what exam revealed, what symptoms were prominent. We analyse the cross-visit picture, not just the most recent note. |
| 📦&nbsp;**Where from** | Four joined sources, all for visits where `provider.specialty = this card`: ① `condition_occurrence` Active diagnoses · ② `observation.symptoms_text` (HPI) · ③ `observation.examination_text` (exam findings) · ④ when available, `note.note_text` of type *Examination Findings* or *History of Present Illness*. |
| 🎨&nbsp;**Format** | Single-line pipe-divided summary. Bold for clinical entities (diagnoses, abnormal values, severity grades). Parens for context. The label `Findings` renders as an inline uppercase chip at the start. |
| 🪂&nbsp;**Fallback** | `Findings: Visits recorded but no diagnostic narrative captured.` |
| 💡&nbsp;**Example** | `[FINDINGS]  Post-op surveillance for **T3N2b stage IIIB colon Ca** \| multi-visit pattern, no fresh complaints \| exam no gross focal deficit` |

[↑ back to wireframe](#1--the-whole-card-at-a-glance)

### 4.3 · Medications 💊

| Row | Spec |
|---|---|
| 🎯&nbsp;**What** | **Only ongoing** medications from this team. Past acute courses that have ended are noise — they're not surfaced. Chronic regimens and currently-in-progress courses are. |
| 📦&nbsp;**Where from** | `drug_exposure` rows where the provider matches the specialty AND `drug_exposure_end_date ≥ today` (or within a 7-day grace for "just-completed"). For chronic drugs without explicit end dates, class signatures (levothyroxine, gabapentinoids, statins) infer ongoing when prescribed within last 6 months. |
| 🎨&nbsp;**Format** | Single pipe-divided list. Per item: `**Brand name** (generic, dose, frequency)`. Status modifiers in parens when relevant: *(continued)*, *(newly started)*, *(taper schedule)*, *(refill pending)*. |
| 🚫&nbsp;**Hide rule** | When the team has zero ongoing meds, **the entire row is omitted**. We don't render `Medications: none`. The Plan row may note closure (e.g. *"5-day course completed 12 May"*). Tight card. |
| 💡&nbsp;**Example** | `[MEDICATIONS]  **Cilamin 250 mg** (Penicillamine) \| **Wysolone 10 mg** (Prednisolone, tapering) \| **Ursocol 300** (UDCA)` |

[↑ back to wireframe](#1--the-whole-card-at-a-glance)

### 4.4 · Plan 📅

| Row | Spec |
|---|---|
| 🎯&nbsp;**What** | Forward-looking actions: what this team has scheduled next, what investigations they've advised, what counselling they gave the patient. The complement to Findings (which is backward-looking). |
| 📦&nbsp;**Where from** | `observation` rows joined by visit: `'followup_date'` gives the next-visit date · `'investigation_text'` gives labs/imaging advised · `'advice_text'` gives counselling content · `'followup_advice'` gives additional notes. For IPD discharges, `note.note_title = 'Discharge Advice'` takes precedence. |
| 🎨&nbsp;**Format** | Single pipe-divided list. Pattern: `Follow-up **{date}** \| Investigations advised: {list} \| Advice: {short} \| {referrals or bookings}`. Follow-up date bolded so the doctor sees at a glance when this team plans to see the patient again. |
| 🪂&nbsp;**Fallback** | `Plan: No forward-looking actions on record.` |
| 💡&nbsp;**Example** | `[PLAN]  Follow-up **26 Mar 2026** \| Investigations: CBC, ESR, CRP, Creatinine \| Advice: SMBG diary × 1 week, Home BP 8 am + 8 pm \| review in 1 month` |

[↑ back to wireframe](#1--the-whole-card-at-a-glance)

### 4.5 · Open loops 🚩

Amber-tinted block under each specialty body. **Always rendered when at
least one loop is detected** — never collapsed, never hidden. Three
categories of finding, each with its own detector logic.

> [!CAUTION]
> Open loops are the no-data-loss disclosure layer. Anything captured
> upstream that the brief chose not to surface, plus anything missing
> from upstream, plus anything overdue per a cited guideline.

#### Category A · Captured upstream but not surfaced

| Loop | Detector logic |
|---|---|
| **Examination notes truncated** | We show one summary line of `observation.examination_text`; the deep-dive has the full delimited content. Surface the truncation so the doctor knows more is available. |
| **Discharge summary partial** | For an IPD admission, when the OMOP `note` table has fewer than the expected discharge-summary titles (Hospital Course, Operative Note, Discharge Advice, Warning Signs, Discharge Condition), list the missing titles. |
| **Provider notes restricted** | Private provider notes exist but are provider-scoped. List their presence so the doctor knows the deep-dive will have them. |

#### Category B · Missing from upstream entirely

| Loop | Detector logic |
|---|---|
| **Investigation advised, no result** | `observation.investigation_text` mentions a test (CBC, CEA, PET-CT…) but no `measurement` row with a matching `measurement_source_value` exists for the same patient within 90 days. |
| **Required monitoring lab missing** | For a known active condition, if the standard monitoring panel (HbA1c → T2DM, TSH → hypothyroid, eGFR → CKD, CEA → colon-Ca surveillance) has no `measurement` row within the guideline interval, flag. |
| **Allergy verification absent** | If the patient has any `drug_exposure` rows but no `condition_occurrence` row tagged with an Allergy section, the prescription stream is operating without documented allergy review. |
| **IPD admission in narrative only** | `observation.symptoms_text` mentions phrases like *"Operated for X on DD/MM/YY"* or *"admitted at"* but no `visit_occurrence` row with `visit_concept_id = 9201` matches. |
| **Vitals trend absent** | Condition needs longitudinal vitals (HTN → BP, T2DM → weight + BP) but `measurement` rows for the relevant LOINC are sparse or missing. |
| **Family screening obligation unmet** | Active diagnosis is a genetic condition (Wilson's, BRCA, familial cardiomyopathy) but no first-degree-relative screening entries exist in `condition_occurrence` Family History rows. |
| **Vaccine status not documented** | Active regimen is immunosuppressive (steroids, biologics, chemo) but `observation` rows don't include vaccination status (pneumococcal, varicella, hepatitis). |

#### Category C · Guideline-anchored gaps

| Loop | Detector logic |
|---|---|
| **Surveillance overdue** | For a primary problem with a guideline-defined cadence (NCCN for cancers, ESC for CCS, AAS for AAA), compute `today − MAX(visit_start_date WHERE specialty = guardian_specialty)`. If > cadence threshold, flag with cited section. |
| **Follow-up advised, not kept** | When `observation.followup_date` set a date that has passed without a matching `visit_occurrence` within 14 days, flag the missed follow-up. |
| **DAPT duration exceeded** | When Aspirin + a P2Y12 inhibitor have been continuously active for >12 months in chronic CCS, flag for de-escalation review per ESC. |
| **Combination therapy without sign-off** | Non-guideline combinations (T3+T4 for hypothyroid, double SSRI/SNRI) detected across specialties — flag for reconciliation. |
| **Cross-team prescription duplication** | Same drug class prescribed by two specialties without a documented coordination note — flag and name both prescribers. |
| **Cardiac fitness sign-off pending** | Pre-op patient flagged for surgery but no Cardiology clearance documented in the window between last Cardiology contact and surgery date. |
| **Visit overdue per anchor team's cadence** | When the anchor specialty recommended a return cadence on their last note but no return visit has happened, flag as a loop. |

Each loop renders as one short sentence with the cited guideline section
where applicable:

```
   🚩 OPEN LOOPS ON THIS SPECIALTY
     • Oncology surveillance overdue (last contact 30 Sep 2025; 6+ months gap;
       NCCN Colon Ca v.2.2024 §SURV-2 expects q3-6 mo)
     • CEA tumour marker last ordered 4 Apr 2025; no result on file
     • PET-CT ordered same date; no result captured
```

[↑ back to wireframe](#1--the-whole-card-at-a-glance)

### 4.6 · Specialty sidebar

Click the `→` chevron on any specialty header to open a slide-in panel
from the right. Contents:

| Element | Spec |
|---|---|
| **Header** | Specialty name + patient identity + close button. |
| **Timeline** | Vertical list of consultations with date markers. IPD visits get a red dot + `IPD` badge; OPD slate. |
| **Collapsed entry** | `{date} · {OPD/IPD badge} · {doctor} · one-line headline` |
| **Expanded entry** | Findings + Medications + Plan for that specific visit, rendered with inline-chip labels matching the main card's body style. |
| 🪂&nbsp;**Empty state** | When `consultations[]` is missing or empty: a friendly *"no per-consultation detail captured yet"* note. The chevron's affordance is still discoverable, just honest about the data state. |

[↑ back to wireframe](#1--the-whole-card-at-a-glance)

---

## 5 · Where they collide  (Stack 2)

A separate card below the specialty cards. Each detector fire is its own
sub-entry. The Stack 2 card houses everything that needs cross-team
attention.

### 5.1 · DDI flag ⚠

| Row | Spec |
|---|---|
| 🎯&nbsp;**What** | Drug-drug interactions detected across the patient's active medication list. |
| 📦&nbsp;**Where from** | Class-based detectors over the joined `drug_exposure` + `condition_occurrence` + `provider` data. Library includes sedative + opioid stack (Beers), DAPT duration (ESC), gabapentinoid double-dose (NICE CG173), NSAID-on-DAPT, statin-fibrate, ARB+ACEi, T3+T4 combination, etc. |
| 🎨&nbsp;**Format** | Card with red **DDI flag** badge · drug-pair title in bold · 3-5 bullet points explaining the chain · cited guideline chip on the right. |

### 5.2 · Coordination gap ⚠

| Row | Spec |
|---|---|
| 🎯&nbsp;**What** | Non-DDI coordination failures: overdue surveillance, classification mismatches (IV-grade care coded OPD), incomplete pre-op clearance chains, missed referral closures. |
| 📦&nbsp;**Where from** | Same join as DDIs but with detectors targeting visit-cadence + visit-classification + multi-team coordination patterns rather than drug pairs. |
| 🎨&nbsp;**Format** | Same card layout as DDI but with amber **Coordination gap** badge. |

### 5.3 · Guideline-anchored synthesis panels 📈

| Row | Spec |
|---|---|
| 🎯&nbsp;**What** | Structured tables applying named clinical guidelines to the patient's data. One row per guideline-specified metric, the patient's computed value, and a tone marker. |
| 📦&nbsp;**Where from** | Computed from `measurement` + `condition_occurrence` + `drug_exposure`. The guideline determines which inputs the panel needs (NCCN surveillance → months since last oncology + CEA result; Beers Criteria → sedative-class drug count). |
| 🎨&nbsp;**Format** | Section heading with guideline chip on the right · body is a 3-5 row mini-table: `Label : Value (tone)` · optional `ref` field per row carries the derivation logic in a tooltip. |

### 5.4 · Pending MDT items 📋

| Row | Spec |
|---|---|
| 🎯&nbsp;**What** | The "what should the team do next" list. Concrete actionable items rolled up from open loops + collisions + guideline-panel alerts. |
| 📦&nbsp;**Where from** | Synthesised from the union of open loops across all specialties + collision recommendations + guideline-panel alerts. |
| 🎨&nbsp;**Format** | Flat bullet list under an emergency-icon heading. Each item: one short imperative sentence. |

[↑ back to wireframe](#1--the-whole-card-at-a-glance)

---

## 6 · Trust contract

Three concentric mechanisms thread through every section.

| Mechanism | What it does | Where |
|---|---|---|
| **Header attribution** | Every specialty card states up-front the date range, visit count, doctors. The doctor sees evidence weight before reading synthesis. | § 4.1 |
| **Group source tooltip** | Every Medical-history tag chip has an ⓘ that opens a tooltip listing contributing consultations + the reasoning sentence. | § 3.6 |
| **Open loops block** | Per-specialty amber block surfacing missing data + overdue actions. Absence is never silent. | § 4.5 |

> [!NOTE]
> Together: every visible claim is row-attributable, every group surfaces
> evidence count + reasoning, and every gap is explicit. No hidden state.

---

## 7 · Data flow

```
   ┌────────────────────────┐
   │  Source HMIS           │   Pm-Casemanager · Pm-PatientMaster · Pm-Vital
   │  (MySQL + MongoDB)     │   Pm-medicalHistory · Pm-Patient-Docs ·
   └────────────┬───────────┘   Pm-IPD · Pm-Growth-Chart · Pm-User-Master
                │  ETL
                ▼
   ┌────────────────────────┐   person · visit_occurrence ·
   │  OMOP CDM v5.4         │   condition_occurrence · drug_exposure ·
   │  (PostgreSQL)          │   measurement · observation · note ·
   └────────────┬───────────┘   provider · care_site · location
                │  Velora synthesis engine
                ▼
   ┌────────────────────────┐
   │  VeloraV0MdtBriefData  │   medicalHistory[] · specialties[] ·
   │  shape                 │   collisions[] · syntheses[] ·
   └────────────┬───────────┘   pendingMdtItems[] · freshness
                │  Per-patient mock in lib/velora/v0-replies.ts
                ▼
   ┌────────────────────────┐
   │  Card render           │   VeloraV0MdtBriefCard.tsx
   │  (Stack 1 + Stack 2)   │
   └────────────────────────┘
```

---

## 8 · Adding a new patient

1. Export the patient's OMOP slice — 8 CSV files (`person`, `observation_period`, `visit_occurrence`, `condition_occurrence`, `drug_exposure`, `measurement`, `observation`, and `note` if available).
2. Parse with `scripts/parse_omop_patient.py` to inspect.
3. Write a per-patient walkthrough at `docs/velora-patients/P{N}-{name}-{personId}.md`.
4. Add to `RX_CONTEXT_OPTIONS` (`constants.ts`) — anonymised display name, meta string, gender, age, and `careType` (`OPD` / `IPD` / `IPD + OPD`).
5. Add a stub to `SMART_SUMMARY_BY_CONTEXT` (`mock-data.ts`).
6. Add the ID to `VELORA_V0_PATIENT_IDS` (`velora-patients.ts`).
7. Write the full `*_BRIEF_MOCK` in `lib/velora/v0-replies.ts` following the schema above.
8. Add a router branch in `v0-replies.ts` matching the patient's name.
9. `npx tsc --noEmit` — should produce zero new errors.

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
| Patient archives (raw OMOP) | `docs/velora-patients/data/P{N}-*.zip` |
| Provider lookup | `docs/velora-patients/data/provider.csv` |

---

*Living document. When the card's schema or the underlying data architecture
changes, this file changes too. The card is the source of truth; this doc
mirrors it.*
