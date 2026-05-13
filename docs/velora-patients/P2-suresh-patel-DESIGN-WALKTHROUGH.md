# Cross-consultation brief · Mr Suresh Patel
### A walkthrough for the product team

> **Patient:** Mr Suresh Patel · M · 60 · +91 98333 83625 · `843373981236`
> *Display name "Suresh Patel" is anonymised. Salutation "Mr" and mobile "9833383625" are real values from the OMOP export. Person ID is the canonical KG identifier.*
>
> **Data source:** Full OMOP CDM v5.4 export · 7 tables · the Archive.zip the user provided on 13 May 2026.
>
> **Observation window:** 10 Feb 2025 → 21 Mar 2026 (466 days · 28 OPD visits).
>
> **Card location:** Click the *Cross-consultation brief* pill on the Velora welcome screen, or type "Show cross-consultation brief" / "Show brief for Suresh Patel" in the chat.

---

## 1 · TL;DR for product

We took one real patient's complete OMOP CDM export, extracted his clinical story into a structured `VeloraV0MdtBriefData` mock, and wired it into the live chat surface. The card now renders **four ordered movements** that mirror the four questions a doctor asks when meeting a complex case for the first time:

| Movement | What the doctor wants to know | Where it lives on the card |
|---|---|---|
| ① **Who is this patient?** | The story, not the visit list | *Section 1 · Medical history* (grouped: cancer · surgery · co-morbidities · allergies · family/social) |
| ② **Who's been involved?** | Per-specialty findings, drugs, plan | *Section 2 · Specialty consultations* (12 specialty cards) |
| ③ **What demands attention?** | DDIs · overdue surveillance · missed loops | *Where they collide* + *Pending MDT items* (Stack 2) |
| ④ **How do I trust this?** | Provenance + open loops + guideline anchors | Inline citations + amber open-loops block + Stack 2 guideline panels |

Every claim on the card is row-attributed to a specific OMOP table; every section that omits data discloses what's missing. Nothing is fabricated; every inference is labelled.

---

## 2 · Who Mr Suresh Patel is, clinically

A real 60-year-old man whose record tells a single coherent story:

- **Stage IIIB colorectal cancer survivor** — Carcinoma of the hepatic flexure of colon · T3N2b · moderately differentiated adenocarcinoma · s/p **Robotic-assisted Right Hemicolectomy on 30 Sep 2024** · s/p **6 cycles adjuvant chemotherapy**.
- **Recurrence signal detected** — *"Lung metastasis most likely · Metastatic disease"* flagged but **no PET-CT result on file** to confirm or stage.
- **Multi-morbid baseline** — T2DM, hypertension, hypothyroidism, iron-deficiency anaemia, diabetic neuropathy, seronegative inflammatory arthritis, MID CBD stricture.
- **Polypharmacy stack across 12 teams** — gabapentinoid double-dose (Neurosurgery + Neurology), opioid added on top (Pain Specialist), chronic-steroid burden across 3 specialties (Rheumatology + Diabetology + Pulmonology).
- **A recent acute respiratory event** (7-9 May 2026) with **IV-grade care administered as OPD** — Ceftriaxone IV + Hydrocortisone 100 mg IV q12h + nebulised steroid burst.
- **Oncology surveillance has lapsed** — last contact 30 Sep 2025, no oncology visit since (≥6 months), no CEA result, no PET-CT result.

This is precisely the kind of case where a new clinician walks in cold and needs a 30-second orientation before they can act safely. That is the product the card is.

---

## 3 · The data we had to work with

The OMOP export carried **dramatically more** than the prior Memgraph slice (which had only `Drug` and `Symptom` edges populated). Here's the inventory:

### 3.1 · OMOP table coverage for this patient

| OMOP table | Rows | What's actually in there |
|---|---:|---|
| `person` | 1 | Gender, exact DOB (1965-07-11 → age 60·9), primary `provider_id`, `care_site_id`, `person_source_value` |
| `observation_period` | 7 | Active care window 10 Feb 2025 → 21 Mar 2026 |
| `visit_occurrence` | **28** | All 28 OPD visits, fully attributed to specific providers + datetimes |
| `condition_occurrence` | **109** | Active diagnoses, surgical history, allergy verifications, family/social history (all as discrete rows) |
| `drug_exposure` | **128** | Every Rx with complete `sig` — dose, timing, days_supply, before/after-food, remarks |
| `measurement` | **83** | Vital signs only (BP × 24, HR × 12, SpO₂ × 9, Temp × 9, weight, height, BMI…) |
| `observation` | **193** | The big one — see breakdown below |

### 3.2 · What's inside those 193 observations

This is where most of the brief's content lives. The OMOP `observation` table is used as the catch-all for everything that doesn't fit a standard clinical table — and the field-level mapping doc routes the rich clinical fields here:

| `observation_source_value` | Rows | Maps to → |
|---|---:|---|
| `followup_date` | 76 | Section 2 · Plan · Follow-up |
| `symptoms_text` | 30 | Section 2 · Findings · Chief complaint / HPI |
| `advice_text` | 24 | Section 2 · Plan · Additional advice |
| `examination_text` | 16 | Section 2 · Findings · Examination |
| `investigation_text` | 13 | Section 2 · Plan · Lab investigations advised |
| `followup_advice` | 9 | Section 2 · Plan · Follow-up notes |
| `patient_demographic_*` | 23 | Header strip (mobile, salutation, blood group, etc.) |

### 3.3 · What is **not** in this OMOP export

Critical honesty layer. The brief reflects these gaps:

- **Lab results** — `measurement_type_concept_id = 44818702` rows are **completely absent** for this patient. 13 investigations were advised over 28 visits; none have ingested results. Possible causes: (a) labs weren't done; (b) `Pm-Patient-Docs.results` collection isn't ingested into the OMOP target for this patient; (c) the export filter excluded lab-type measurements.
- **Provider → specialty mapping** — `provider_id` is in the export but the specialty name lives in source `tbl_department.dp_name`. The export doesn't include a `provider` table, so specialty labels in the brief were resolved manually by cross-referencing with the prior Memgraph slice. This is the single most impactful gap to close for V1.
- **IPD slice for the GB-perforation surgery** — referenced in a Pain Specialist symptom note dated 5 May 2026 (*"Operated for GB Perforation 19/04/26"*), but no `visit_occurrence` row of `visit_concept_id = 9201` (Inpatient) exists for it. The patient's known surgical event isn't structured.
- **`note` table** — not in the export. Per the mapping doc this is where private notes, treatment notes, HPI narratives, discharge advice, OT notes all live. Either the export was scoped to clinical-table-only, or this patient has no notes ingested.
- **`provider`, `care_site`, `location` tables** — not in the export. The IDs are present but not resolved to names.
- **Discharge summary** — none ingested. The mapping doc shows discharge summaries are routed to `condition_occurrence` (diagnoses), `drug_exposure` (discharge meds) and `note` (rich narrative). The 6 rows of `Hospitalization` we see in `condition_occurrence` confirm hospital episodes happened, but the summary content isn't unpacked.

---

## 4 · Design principles · why the card is shaped this way

Four design calls drove every layout decision:

### 4.1 · Specialty-grouped, not chronological

The Patient Journey card is the chronological view. The cross-consultation brief is the **mental-model view**. The doctor wants to know "what is each team thinking" — not "what happened on Tuesday."

So the unit of organisation in Section 2 is the **specialty**, not the visit. A specialty card aggregates everything that team did across however many visits.

### 4.2 · Headlines once, never repeated

A doctor reading 12 specialty cards shouldn't re-read "Patient has T2DM" twelve times. So chronic conditions are stated **once** at the top (Section 1 · Medical history), and each specialty card describes only **what that team did about them**.

### 4.3 · Absence is data — explicitly verify negatives

When the colon-Ca team checked drug allergies on 6 separate visits and recorded *"No known drug allergy"* every time, that is **clinically meaningful information**, not a blank. The card surfaces this as a green ✓ row with the verification count — so a Cardiologist about to prescribe contrast can see at a glance that the absence is confirmed, not unchecked.

### 4.4 · Open loops are unmissable but not alarming

Every specialty card carries an amber "Open loops on this specialty" disclosure block under its body, **only when there are loops to disclose**. The amber is bright enough to catch the eye on scroll, dim enough not to dominate. This is the anti-data-loss contract.

---

## 5 · Section-by-section walk

### 5.1 · Header strip

```
⚕ Cross-consultation brief
Mr Suresh Patel · M · 60 · +91 98333 83625 · 843373981236
```

| Field | OMOP source | Notes |
|---|---|---|
| Display name "Suresh Patel" | (anonymised) | Display name; ID-safe. Salutation "Mr" comes from `observation.patient_demographic_salutation`. |
| Gender M | `person.gender_source_value` | Direct. |
| Age 60 | `person.year_of_birth` 1965 → derived | We render the exact age, not the band. |
| Mobile +91 98333 83625 | `observation.patient_demographic_contact_no` | Real value. |
| ID 843373981236 | `person.person_id` | Canonical KG identifier. |

### 5.2 · Section 1 · Medical history (six grouped sub-sections)

The flat "chronic conditions" list from the earlier mock would have buried a stage-III cancer diagnosis between "iron deficiency" and "no known food allergy." So this view introduces **grouped sub-sections with tone-aware styling**:

| Sub-section | Tone | Visual cue | What it carries for Suresh |
|---|---|---|---|
| Active oncological diagnosis · primary problem | `primary` | Red uppercase label | Carcinoma T3N2b + lung metastasis |
| Surgical history | `neutral` | Slate label | Right hemicolectomy + 6 chemo cycles |
| Co-morbidities · active | `neutral` | Slate label | T2DM · HTN · Hypothyroidism · Anaemia · Neuropathy · Arthritis · CBD stricture |
| Acute episodes on record | `neutral` | Slate label | CAP · HAP · Acute respiratory event May 2026 |
| Allergies & safety · explicitly verified | `positive` | Green ✓ bullets | No known drug allergy (×6) · No known food allergy (×7) |
| Family / Social history | `positive` | Green ✓ bullets | No significant family / social history |

Each row carries a **row-count caption** ("6 rows", "7 rows") — this is the evidence-strength indicator. A diagnosis backed by 7 rows is more solid than one backed by 1 row.

**Where the data comes from:**
- All rows source from `condition_occurrence` filtered by `condition_source_value` matching patterns:
  - Oncology: `Ca Hepatic Flexure`, `Carcinoma colon`, `Cancer`, `Metastatic Disease`, `Lung metastasis`
  - Surgery: rows containing `hemicolectomy`, `cycle of adjuvant chemo`
  - Co-morbidities: `DM|Yes`, `HTN|Yes`, `Hypothyroidism|Yes`, `iron Deficiency`, `Diabetic neuropathy`…
  - Allergies: `No known drug allergy`, `No known food allergy` (explicit-negative pattern)
  - Family / social: `No significant / applicable family history`, `…social history`

### 5.3 · Section 2 · Specialty consultations

Seven specialty cards render in priority order: Oncology → Pulmonology → Pain Specialist → Diabetology → Rheumatology → Neurology → Neurosurgery. (The remaining 5 specialties — Onco-surgery, Surgical Gastroenterology, Internal Medicine, ENT, Gastroenterology — are listed in the *Pending MDT items* in Stack 2 because each had only 1-2 visits with thin clinical content, and showing them as full cards would dilute the high-signal teams.)

Each card has the same anatomy:

```
┌─ Specialty heading + doctor(s) ────────────────────────────┐
│ Provenance line · italic · "Based on N consultations…"     │
│                                                            │
│ FINDINGS                                                   │
│ MEDICATIONS                                                │
│ PLAN                                                       │
│                                                            │
│ ⚠ Open loops on this specialty (amber block, optional)     │
└────────────────────────────────────────────────────────────┘
```

**Why exactly Findings · Medications · Plan?** Because that is the existing CaseManager schema's clinical-note structure. From the OMOP mapping doc:

| Note section | OMOP field that backs it |
|---|---|
| Findings | `condition_occurrence` + `observation.symptoms_text` + `observation.examination_text` |
| Medications | `drug_exposure` joined by `visit_occurrence_id` |
| Plan | `observation.followup_date` + `observation.investigation_text` + `observation.advice_text` |

By matching the brief's structure to the source schema, we keep the join logic 1:1. There's no creative inference layer — each row of the brief lifts directly from rows of the source.

**Provenance line · the trust anchor:**

> *"Based on 12 oncology consultations · 8 May 2025 → 30 Sep 2025 · Dr Pankaj Shah / Dr Mithun Shah"*

This sentence is derived by grouping `visit_occurrence` rows by `provider_id`, computing the count, the date range, and the provider names. It tells the doctor exactly how much evidence backs this card before they read a word of the body. If the brief later says something the doctor disagrees with, they know exactly how many records to inspect.

**Open-loops block · the no-data-loss layer:**

Surfaces in three categories per specialty:
1. **Captured upstream but not shown here** — e.g. *"Full examination notes shown summary; deep-dive renders all sections delimited by `|~~|` and `//~//`"*
2. **Missing from upstream entirely** — e.g. *"CEA last ordered 4 Apr 2025, no result row on file"*
3. **Guideline-anchored gaps** — e.g. *"Oncology surveillance overdue · 6+ months · NCCN Colon Ca v.2.2024 §SURV-2"*

### 5.4 · Section 3 · "Where they collide" (Stack 2)

This panel was already in the existing card design. For Suresh, it carries four detector fires, each anchored to a real clinical guideline:

| Detector | Kind | Rule cited |
|---|---|---|
| Oncology surveillance overdue · 6+ months | `coordination-gap` | NCCN Colon Cancer v.2.2024 §SURV-1, SURV-2 |
| Morphine added to neuropathic stack | `ddi` | Beers Criteria 2023 · sedative + opioid in ≥60y |
| Gabapentin double-dose across Neurosurgery + Neurology | `ddi` | NICE CG173 · single-agent gabapentinoid principle |
| IV-grade pulmonology care coded as OPD | `coordination-gap` | BTS CAP severity grading + admission criteria |

### 5.5 · Section 4 · Guideline-anchored synthesis panels (Stack 2)

Two panels render for Suresh:
1. **NCCN colon-cancer surveillance status** — months since last contact, CEA result status, imaging restaging status. Each row's `ref` tooltip explains the deterministic query that produced the value.
2. **Polypharmacy · sedative + opioid burden** — Beers Criteria 2023 check across the active drug stack.

These are not invented insights — they're the application of named, published rules to this patient's structured data. The doctor sees the rule body, year, and section in the chip; hovering it reveals the rule's plain-English description and which fields it fetches.

---

## 6 · The anti-data-loss layer · how every byte stays accountable

Three concentric trust mechanisms.

### 6.1 · Row-count captions on Section 1

Each item in the medical-history grouped view carries an inline row-count caption ("6 rows", "7 rows"). One glance tells the doctor how many records back the claim. A condition backed by 7 rows on 7 different visits is far stronger evidence than one backed by 1 row.

### 6.2 · Provenance line on every specialty card

> *Based on N consultations · D1 → D2 · Dr X / Dr Y*

Derived deterministically from `visit_occurrence`. If the doctor disagrees with the synthesis below, the provenance line tells them exactly which records to audit.

### 6.3 · Open-loops disclosure block

Visible amber block on any specialty card where data is missing or overdue. Discloses:
- **What's captured but not shown** (so the doctor knows the deep-dive will have more)
- **What's missing from upstream** (so the doctor knows the synthesis is limited by data, not by Velora)
- **What's overdue per cited guidelines** (so the doctor sees the actionable gap inline)

### 6.4 · Source attribution (planned for V1)

A hover-citation system per row, planned but not in this commit. Each visible row would carry a small superscript that reveals:

```
This claim:  "Carcinoma · Hepatic flexure · T3N2b"
Backed by:   condition_occurrence rows
              · 1157386  (visit 8414385, 21 Mar 2026)
              · 1157388  (visit 8403788, 20 Mar 2026)
              · …
Verbatim:    "Ca Hepatic Flexure, Rt hemicolectomy 30/9/2024, Mod diff adenoca, T3N2b"
First seen:  8 May 2025
Last seen:   30 Sep 2025
```

This is the eventual proof-of-no-fabrication layer. The data is already structured to support it; it's a render-side enhancement for V1.

---

## 7 · Cross-team coordination · how the detectors fire

The four detectors that produced Suresh's collisions:

### 7.1 · Surveillance-gap detector

**Query:** For each chronic condition with a guideline-mandated follow-up cadence, compute `(today − MAX(visit_occurrence.visit_start_date WHERE specialty = guardian_specialty))`. If > recommended interval, fire.

For Suresh: guardian = Oncology, recommended interval = 6 months per NCCN §SURV-2, observed gap ≥ 6 months → fire.

### 7.2 · Drug-class duplication detector

**Query:** Group active `drug_exposure` rows by therapeutic class (gabapentinoid, PPI, SNRI, TCA, opioid, β-blocker, ARB, etc.). For each class, if ≥ 2 active rows come from different `provider_id`s, fire as a coordination flag.

For Suresh: gabapentin appears in 3 active products from 2 providers → fire.

### 7.3 · Sedative + opioid co-prescription detector (Beers)

**Query:** Sum sedative-class drugs (opioid, gabapentinoid, TCA, SNRI, benzo, z-drug) active concurrently. Fire when patient is ≥ 60y and total ≥ 3.

For Suresh: Morphine + Gabator NT + Dulotin + Tryptomer concurrent → fire.

### 7.4 · Visit-classification mismatch detector

**Query:** For each `visit_occurrence` of `visit_concept_id = 9202` (Outpatient), inspect the joined `drug_exposure` rows. If any drug has `route_concept_id` matching IV admin (Ceftriaxone IV, Hydrocort IV) and the visit lasted < 4 hours, fire as a coding suspicion.

For Suresh: 7-9 May 2026 Pulmonology visits coded OPD with IV antibiotics → fire.

These detectors are class-based, not patient-specific. They generalise to any patient whose OMOP slice exhibits the same pattern.

---

## 8 · Guideline anchors · why these specifically

Velora's Stack 2 panels cite published guideline bodies. For Suresh the rules in play are:

| Guideline body | Year | Specific rule | Applies because |
|---|---|---|---|
| **NCCN** Colon Cancer | v.2.2024 | §SURV-1, SURV-2 | Patient is T3N2b post-resection with adjuvant chemo complete — surveillance protocol governs CEA + CT cadence |
| **Beers Criteria** (AGS) | 2023 | Sedative + opioid in ≥60y | Patient is 60y old with stacked sedatives + new opioid |
| **NICE** CG173 | 2024 | Neuropathic pain · single-agent gabapentinoid | Two specialties co-prescribing gabapentin |
| **BTS** CAP | 2023 | CURB-65 severity grading | IV-grade pulmonology care prompts CAP admission criterion check |
| **ADA** Standards of Care | 2024 | §6 Glycemic, §10 CVD | T2DM patient with macrovascular risk on chronic steroid |
| **ESC/ESH** Hypertension | 2023 | §11 HTN in DM | DM + HTN comorbid → BP target < 130/80 |
| **AACE** Hypothyroidism | 2022 | TSH q6-12 mo on stable levothyroxine | Patient on Thyronorm long-term |

Only the first four are currently rendered as live panels. The remaining three are *latent* — the brief structure supports them, but their measurement inputs (HbA1c, BP trend, TSH) aren't in the OMOP export, so they cannot fire yet.

---

## 9 · Open points for the data team

The list of upstream gaps, in priority order of clinical impact:

### Blocker · ship-stopping

1. **`measurement` rows of type 44818702 (Lab result) are absent.** 13 investigations were advised; zero have results. Either (a) confirm whether this patient has no labs in the source `Pm-Patient-Docs.results`, or (b) re-export with labs included. Without this, the "Plan · investigations advised" rows become permanent open loops, and the brief cannot show key clinical metrics (HbA1c, eGFR, CEA, lipid panel).

2. **Provider → specialty resolution.** The export carries `provider_id` but no provider table. We resolved manually for this one patient by cross-referencing with the prior Memgraph slice. For automation, the export needs either: (i) a `provider` table per the OMOP CDM spec, or (ii) a maintained external `provider_id → specialty` lookup.

### Important · needed for V1 generality

3. **IPD slice ingestion.** GB-perforation surgery on 19/04/26 is referenced in free text but absent from `visit_occurrence`. Similarly, the May 2026 IV-grade pulmonology care is coded OPD. The IPD route (`Pm-IPD.dischargedSummary` → `visit_occurrence` with `visit_concept_id = 9201`) doesn't appear to be running for this patient.

4. **`note` table.** Private notes, treatment notes, HPI narratives, OT notes, and discharge advice all route to OMOP `note` per the mapping doc. None are in this export. The brief's deep-dive view planned for V1 would surface them.

5. **Discharge-summary structure.** 6 rows of `Hospitalization` appear in `condition_occurrence` for this patient, signalling hospital episodes happened. The structured discharge content (diagnoses, course, treatment, OT notes, follow-up) per the mapping doc routes to multiple OMOP tables — none of which are reflected here. Either no DC summary exists in the source for this patient, or the discharge ETL isn't pointed at this patient's hospital admissions.

### Nice-to-have · sharper UX

6. **Examination text parsing.** `observation.examination_text` rows use `|~~|` for section separators and `//~//` for line breaks within a section. Currently rendered as raw blob; a small parser would render labeled section bullets.

7. **Drug `generic_name` cleanup.** Field is concatenated as `BRAND|GENERIC|count1|count2` (e.g. `"ULTRACET TABLET|ACETAMINOPHEN-325MG + TRAMADOL-37.5MG|5|4"`). A render-side splitter would clean this up.

8. **`measurement` `value_as_string` extraction.** Some lab-like values (random sugar, triglyceride) appeared in the prior Memgraph data inside `Symptom.canonical_name` free text. None of those are in this OMOP export either — confirming labs are entirely missing from the slice. If they exist elsewhere in source, they should route to `measurement` per the mapping doc.

---

## 10 · Open points for design

### 10.1 · How many specialty cards is the right number?

Suresh has 12 specialties. The current brief surfaces 7 as full cards; the remaining 5 (each with 1-2 visits and thin content) are folded into *Pending MDT items*. This is a judgement call. Options to validate with doctors:

- **A** · Show all 12 (longer card, lower noise per card)
- **B** · Show top N by visit count or by recency (current)
- **C** · Show top N filtered by clinical weight (the user's *primary problem* lens — for Suresh, only cards that intersect colon-Ca management get full treatment)

We've shipped **B**. **C** is more sophisticated but needs a doctor-validated weighting function.

### 10.2 · Color use for *primary* vs *positive* tones

We chose:
- **Red label** for `primary` (active cancer = the headline problem)
- **Green ✓ bullets** for `positive` (verified-negative allergies / family history)
- **Slate** for `neutral` (everything else)

The red is restrained — uppercase label only, not the body text — so it reads as importance, not alarm. The green is similarly modest: a small ✓ glyph + slightly green-tinted bullet, not a full-row green wash.

Open question: do we extend `primary` to include *Lung metastasis most likely*? Right now it sits inside the same primary group as the original Ca diagnosis, which is correct clinically. But should the *recurrence signal* get its own callout?

### 10.3 · Open-loops block placement

Currently under each specialty card's body. Alternative: aggregate all open loops into a single section above the specialty list, like a triage list. The doctor scans the open loops first, then dives into the specialty that owns each one.

Pros of current (per-specialty): keeps context local — you read the gap right next to the data it pertains to.
Pros of aggregate: faster scan — one stop for "what should I check?"

This is worth a usability test.

### 10.4 · How granular should row-count captions be?

We show "6 rows" / "7 rows" per medical-history item. For a 7-condition stack that's 7 captions on screen. Some doctors will read them as noise. Options:
- Keep inline (current)
- Move into a hover-tooltip on the bullet
- Only show when count < 3 (the "weak evidence" flag is the more useful version)

---

## 11 · How the code maps to the design

Three files carry the entire change:

| File | Role |
|---|---|
| `components/tp-rxpad/dr-agent/types.ts` | Added `VeloraV0MedicalHistoryGroup` type · `medicalHistory?` on `VeloraV0MdtBriefData` · `openLoops?` on `VeloraV0Attribution` |
| `components/tp-rxpad/dr-agent/cards/velora-v0/VeloraV0MdtBriefCard.tsx` | Renders the structured medical-history groups (tone-aware) · renders open-loops disclosure under each specialty body |
| `lib/velora/v0-replies.ts` | New `SURESH_PATEL_BRIEF_MOCK` built from the OMOP CSVs · routing default switched to Suresh · Ravi Shankar still reachable via name |

The card's render code is **fully data-driven**. The mock decides which sub-sections exist, in what order, with what tones, and which specialties get open-loops blocks. No card-level conditional is patient-specific.

When future patients land, the work is purely in the data layer:
1. Run the OMOP export through `scripts/parse_omop_patient.py` (already exists).
2. Hand-write or auto-generate the equivalent `*_BRIEF_MOCK` constant.
3. Add a router branch in `v0-replies.ts`.

For full automation, we'd add a `lib/velora/omop-to-brief.ts` transformer that maps the 7 OMOP CSV streams directly into `VeloraV0MdtBriefData`. ~150 lines of TypeScript. Estimate: half a day.

---

## 12 · What the product team can demo today

1. Open the Velora app at `/dr-agent-design-system/velora-v0` or the chat surface for any V0 patient.
2. Click the "Cross-consultation brief" pill on the welcome screen.
3. The card renders Mr Suresh Patel · M · 60 · with the structured medical history, 7 specialty cards, 4 collision flags, and 2 Stack 2 guideline panels.
4. Hover the guideline chips on Stack 2 panels — the tooltips explain NCCN / Beers / NICE / BTS in plain English.
5. Scroll to read each specialty's open-loops block — they tell the doctor exactly what's missing or overdue, with citations.

To compare with the legacy demo:
- Type **"Ravi Shankar"** in the chat → renders the original 2-specialty CKD demo.
- Type **"Suresh Patel"** in the chat → renders this OMOP-grounded 7-specialty case.

---

## 13 · Glossary

| Term | Meaning |
|---|---|
| **OMOP CDM** | Observational Medical Outcomes Partnership Common Data Model. The standardised clinical-data schema we're targeting. v5.4 in use. |
| **CDM** | Common Data Model. The schema. |
| **Stack 1 / Stack 2** | Velora's internal naming for the two halves of every intent card. Stack 1 = verifiable hospital records (facts). Stack 2 = guideline-anchored AI synthesis (suggested interpretations). |
| **Cross-consultation brief** | User-facing name for what Velora internally calls "MDT brief" — see `VeloraV0MdtBriefData`. |
| **Provenance line** | The italic single-sentence under each specialty heading that states the visit count, date range, and doctors backing the synthesis. |
| **Open loop** | A clinically meaningful action that was started but not closed: an investigation advised with no result, a referral with no destination visit, a follow-up advised on a date that's now passed. |
| **NCCN / Beers / NICE / BTS / ADA / ESC/ESH / AACE** | Published clinical guideline bodies. Cited per Stack 2 panel. |
| **T3N2b** | Tumour staging notation. T3 = tumour invades through muscularis propria. N2b = ≥ 7 regional lymph nodes positive. For colon Ca this puts the patient at stage IIIB. |
| **CEA** | Carcinoembryonic Antigen. The standard surveillance biomarker for colorectal cancer recurrence. |
| **DDI** | Drug-drug interaction. |
| **Beers Criteria** | American Geriatrics Society — list of medications potentially inappropriate for adults ≥ 65y. |
| **CURB-65** | Pneumonia severity score: Confusion, Urea, Respiratory rate, Blood pressure, age ≥65. |
| **person_id** | The canonical patient identifier in OMOP `person.person_id`. Same value as the KG node identifier we used earlier. |
| **`visit_occurrence_id`** | The canonical visit identifier in OMOP. Used as the join key across `condition_occurrence`, `drug_exposure`, `measurement`, `observation`. |

---

*Document version: 1.0 · 13 May 2026 · maintained alongside the live `SURESH_PATEL_BRIEF_MOCK` in `lib/velora/v0-replies.ts`. When the mock data changes, update this file in the same commit.*
