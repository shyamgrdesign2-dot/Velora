# What is the cross-consultation brief?

> A plain-English explanation. Aimed at clinicians, product managers, clinical advisors, and anyone who needs to understand the *what* and *why* of this feature before diving into the *how*.
>
> For the developer-facing schema, see [CROSS-CONSULTATION-BRIEF-ARCHETYPE.md](./CROSS-CONSULTATION-BRIEF-ARCHETYPE.md).
> For per-patient data walkthroughs, see [P1…P5*.md](./README.md).

---

## 1 · The 30-second version

A clinician opens a complex patient's record cold. Maybe they've never seen this patient. Maybe the patient has been seen by 12 specialty teams across 13 months. Maybe one of those teams started a chemo regimen and another started a steroid burst and a third gave an opioid, none of them aware of each other.

**The cross-consultation brief is the one screen that answers, in 30 seconds:**

```
  Who is this patient?
  Who has been involved, and what is each team thinking?
  What demands my attention?
  How do I know I can trust this synthesis?
```

It's not a chart review. It's not a problem list. It's not a referral letter. It's a **synthesis** — pulled from the hospital's structured data (OMOP CDM v5.4), surfaced in the chat surface a clinician already uses, with every claim attributable to a specific visit and provider.

---

## 2 · The problem this solves

In a tertiary-care hospital, a single complex patient routinely sees 8–15 specialty teams over a year. Each team writes a note in their own template, in their own EHR module, using their own shorthand. The aggregate "what is going on with this patient" lives nowhere — it has to be reconstructed by every new clinician who opens the file.

**The cost of this reconstruction is paid in:**

- **Time.** A Cardiologist seeing a new patient typically spends 6–9 minutes reading prior notes before they can form an impression. Most of that is spent flipping between specialty modules.
- **Errors of omission.** Patient is on tramadol from Ortho, gabapentin from Neuro, duloxetine from Pain Specialist, and now you're about to add a TCA. Nobody coordinated. The new clinician doesn't see the stack because no view aggregates it.
- **Errors of duplication.** Two specialists prescribe the same drug class without knowing. Patient ends up on triple anti-HTN or double PPI.
- **Surveillance gaps.** Oncology saw the patient 6 months ago, recommended CEA every 3 months. The follow-up never happened. Nobody flagged it because nobody is watching the calendar across teams.
- **Defensive over-investigation.** When the clinician can't get a quick high-confidence picture, they order labs and imaging they don't need — adding cost, time, and risk.

**The brief addresses all five.** The doctor's first 30 seconds with a complex patient now answer the four orientation questions; the next 5 minutes can be spent on judgment instead of data archaeology.

---

## 3 · A real-time scenario

> **The setting:** A Cardiology OPD. 10:42 AM, Tuesday.
> **The clinician:** Dr Sharma, Consultant Cardiologist, has 14 patients on her queue today.
> **The patient:** Mr Suresh Patel, 60M. Referred by Internal Medicine for new-onset chest discomfort. She's never seen him before.

### What happens without the brief

Dr Sharma opens the file. She sees a long list of past consultations — Oncology, Onco-surgery, Neurosurgery, Diabetology, Pulmonology, Neurology, Rheumatology, Pain Specialist, Gastroenterology, Internal Medicine. She clicks Oncology first because the word stands out. She reads three notes, learns the patient has colon Ca + lung metastasis. She clicks Pain Specialist next, sees Morphine. She thinks "wait, why morphine for a Cardio referral?" She clicks Pulmonology, sees IV antibiotics from a week ago. She thinks "wait, why is this OPD-coded?"

**Eight minutes in, she still hasn't formed an impression. Three patients are now waiting behind him.** She decides to act on what she has, miss the gabapentin double-dose entirely, prescribe an NSAID for the chest discomfort, and asks the patient to come back next week.

### What happens with the brief

She clicks **Suresh Patel** in her queue. The Velora chat surface opens straight to his cross-consultation brief.

#### The first 5 seconds — the header

```
  Cross-consultation brief
  Mr Suresh Patel (M, 60)

  12 specialties touched this patient in the last 13 months.
```

She knows: this is a heavy multi-team case.

#### The next 10 seconds — Section 1 · Medical history

```
  [Primary problem]      Carcinoma · Hepatic flexure of colon · T3N2b · Mod diff
                         adenocarcinoma | Lung metastasis most likely

  [Co-morbidities]       T2DM | Hypertension | Hypothyroidism | Iron-deficiency
                         anaemia | Diabetic neuropathy | Seronegative arthritis |
                         MID CBD stricture

  [Surgical history]     Robotic-assisted Right Hemicolectomy (30 Sep 2024) |
                         S/P 6 cycles adjuvant chemotherapy

  [Allergies & safety]   No known drug allergy (verified ×6) | No known food
                         allergy (verified ×7)
```

She knows: colon cancer survivor with documented lung metastasis. Seven co-morbidities. Right hemicolectomy 18 months ago. **No known drug allergy, explicitly verified across 6 separate visits.** Family history clear.

If she hovers the ⓘ on "Primary problem", she sees: *"Six consultations across Oncology + Onco-surgery + Internal Medicine record the colon-Ca diagnosis with consistent staging (T3N2b stage IIIB). Lung-metastasis was first flagged on the 30 Sep 2025 Oncology review."*

She didn't have to take that on faith.

#### The next 20 seconds — Section 2 · Specialty consultations

Each specialty has a compact card:

```
  Oncology              8 May → 30 Sep '25 · 12 visits · Dr Pankaj Shah / Dr Mithun Shah · ⓘ
    Findings   Post-op surveillance for T3N2b stage IIIB colon Ca | multi-visit pattern
    Plan       Monthly cadence held May-Sep 2025 | last contact 30 Sep 2025

    ⚠ OPEN LOOPS ON THIS SPECIALTY
       • Oncology surveillance overdue · last contact 30 Sep 2025 · 6+ months gap · NCCN §SURV-2
       • CEA last ordered 4 Apr 2025 · no result on file
       • PET-CT ordered · no result — critical given lung mets flagged later
```

She knows: this patient should have had CEA + PET-CT 3 months ago. Nobody booked them. Surveillance has lapsed.

She scrolls down. Pain Specialist:

```
  Pain Specialist       5 May '26 · 1 visit · Dr Milan Mehta · ⓘ
    Findings   LBP + bilateral LL heaviness | post-op GB perforation (operated 19/04/26)
    Plan       Post-surgical pain control | Morphine 10 mg PO short-course (5 May, ≤7 days)

    ⚠ OPEN LOOPS ON THIS SPECIALTY
       • Opioid on neuropathic stack (SNRI + TCA + gabapentinoid) — Beers Criteria 2023
```

She knows: morphine was a short-course for post-op pain after a recent GB perforation surgery. **Already closed.** Not chronic opioid use. And the Beers Criteria flag has already been logged — somebody is watching for it.

She also notes the GB perforation surgery on 19 April — six weeks ago. That wasn't in any of the records she'd seen before.

#### The next 5 seconds — Section 3 · Where they collide

```
  ⚠ Where they collide · 4 detector fires

  [coordination-gap]   Oncology surveillance overdue — 6+ months
                       NCCN Colon Ca v.2.2024 §SURV-1, SURV-2

  [DDI flag]           Morphine added to neuropathic stack
                       Beers Criteria 2023 · sedative + opioid in ≥60y

  [DDI flag]           Gabapentin double-dose across Neuro + Neurosurgery
                       NICE CG173

  [coordination-gap]   IV-grade pulmonology care coded as OPD · 7-9 May 2026
                       BTS CAP severity grading
```

She knows: these four flags are not her primary problem, but they're already on someone else's plate. She doesn't have to chase them.

### What she does next

She glances at the synthesis panel (NCCN colon-cancer surveillance) and clicks into Cardiology's lens. **45 seconds total since she opened the file.** She has a complete clinical picture, knows where the gaps are, knows what's already being tracked, and can spend her actual consultation time on Mr Patel — not on his paperwork.

She makes three decisions in 8 minutes:
1. The new chest discomfort is most likely related to the recent acute pulmonary event (May 7–9). She orders a focused workup.
2. She asks Mr Patel about Oncology surveillance directly — turns out he doesn't know it's overdue. She writes an in-clinic referral.
3. She does NOT prescribe an NSAID. The brief told her he's on Aspirin (implied by IHD background later) plus the polypharmacy stack — NSAID would compound bleeding risk.

**Three downstream errors prevented. ~15 minutes saved. One overdue cancer surveillance loop closed.**

---

## 4 · Two stacks — the AI line in the sand

The card is two stacks of content, separated by a strict, non-negotiable rule about where AI is allowed to operate.

```
  ┌────────────────────────────────────────────────────────────────┐
  │  STACK 1 · Cross-consultation brief                            │
  │     Verbatim from OMOP · NO AI authorship                      │
  │                                                                │
  │   ▸ Patient header                                             │
  │   ▸ Medical history (Co-morbidities · Surgical history ·       │
  │     Allergies & safety · Active medications · Family/Social)   │
  │   ▸ Per-specialty visit cards                                  │
  │       (Doctor's Diagnosis · Medications · Advice · Follow Up)  │
  └────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────┐
  │  STACK 2 · Clinical synthesis                                  │
  │     AI applied — bounded, citable, never authorial             │
  │                                                                │
  │   ▸ Where they collide (DDI flags · Coordination gaps)         │
  │   ▸ Guideline-anchored panels                                  │
  │     (ESC · ADA · KDIGO · NICE · NCCN · Beers · WHO · AASM)     │
  │   ▸ Pending MDT items                                          │
  └────────────────────────────────────────────────────────────────┘
```

### Stack 1 — what the doctor wrote, verbatim. NO AI.

Stack 1 is the entire Cross-consultation brief card itself.

**The rule:** zero AI authorship. Every visible value, every chip, every visit summary, every drug name, every date is **row-attributable to a specific OMOP CDM v5.4 row** from the hospital's structured data. The clinician is reading their own colleagues' work — never an AI paraphrase of it.

The only place AI shows up in Stack 1 is **intent routing**: when the doctor types *"Show cross-consultation brief for Lakshmi"*, the agent recognises the intent and pulls Lakshmi's brief. After that hand-off, the data layer takes over — no LLM call sits between OMOP and the card.

What Stack 1 contains:

| Block | OMOP source | What it shows |
|---|---|---|
| Patient header | `person` | name · gender · age |
| Medical history → Co-morbidities | `condition_occurrence` (chronic conditions, `condition_status_source_value` populated) | active diagnoses with their (Active) / (Confirmed) status |
| Medical history → Surgical history | `condition_occurrence` (surgical concepts) + `observation.surgical_history_text` | past procedures with dates |
| Medical history → Allergies & safety | `condition_occurrence` (allergy concepts, including explicit-negative) | "No known drug allergy", verified across N visits |
| Medical history → Active medications | `drug_exposure` filtered by `start_date + days_supply` window | only drugs still inside their prescribed period |
| Medical history → Family / Social | `observation.family_history_text` + `observation.social_history_text` | as the doctor wrote it |
| Per-specialty visit card | `visit_occurrence` + `condition_occurrence` + `drug_exposure` + `observation` joined on `visit_occurrence_id` | Diagnosis · Medications (inline pipe list) · Advice · Follow Up Notes — exactly as recorded in the visit |

What Stack 1 does NOT contain:

- No cross-specialty synthesis
- No guideline interpretation
- No DDI commentary
- No "the AI thinks this means…"

If a field is empty in the EMR, the chip reads *"No data from patient record"* — explicitly, never silently.

### Stack 2 — the clinical synthesis. AI applied, but bounded.

Stack 2 is the second card on the surface, titled **Clinical synthesis · Cross-team interpretation**.

**Stack 2's agenda:** the doctor has read the verbatim picture in Stack 1; now they need help connecting dots **across specialties** — drug interactions, surveillance lapses, guideline-anchored interpretations they wouldn't notice from a single-card read. Stack 2 is the only place Velora applies guidance, and **the guidance is always anchored to a hospital-signed published guideline**.

**What AI is allowed to do in Stack 2:**

1. **Pick which guideline panels apply.** Given the patient's conditions + drugs + age, AI selects from the hospital's signed panel library (NCCN · NICE · ESC · ADA · KDIGO · Beers · WHO HEARTS · AASM). AI does NOT author the panels; the panel content (rules, thresholds, target ranges) is verbatim from the cited guideline body.
2. **Rank the detector fires.** When multiple rules fire (e.g. four DDI flags), AI orders them by clinical severity within the cited guideline's framework.
3. **Compose the collision narrative.** A collision title like *"Aromatase inhibitor + multi-team Rx — bone-protective regimen needs cross-coverage"* is AI-composed; the rule it cites and the bullet content underneath stay verbatim from the source data.

**What AI is NOT allowed to do in Stack 2:**

- Author a new clinical recommendation (panels come from published bodies, not the LLM)
- Decide what is "dangerous" outside a cited rule
- Hallucinate patient values, lab numbers, or doses
- Issue a diagnosis the EMR doesn't carry
- Adjust drug doses

**What Stack 2 contains:**

| Block | Driver | Example |
|---|---|---|
| **Where they collide** | Rule-based detectors + AI severity ranking | DDI: Naproxen × Apixaban (Lexicomp class rule LX-0042). Coordination gap: Oncology surveillance overdue 6 months (NCCN Colon Ca v.2.2024 §SURV-2). |
| **Guideline-anchored panels** | AI panel-selection + signed guideline content | "Hormonal therapy + bone-protective bundle" panel rendering Letrozole · Denosumab · Calcium + Vit D coverage with ASCO / NCCN target rows. |
| **Pending MDT items** | Cross-stack analysis | "Cardiology to release Echo report before surgical date booking." |

Every panel + every flag carries a **citation chip** naming the body + year of the signed rule. The doctor sees not just *"this is a flag"* but *"this is a flag because NCCN says…"*.

### The product-team-ready summary

If you have 60 seconds to explain it:

> Velora's Cross-consultation brief is a **two-stack** experience.
>
> **Stack 1 — the brief card itself — is a verbatim mirror of what the doctor's colleagues actually wrote in the EMR.** Every drug, date, and diagnosis is row-attributable to OMOP CDM data; no AI authors a single value. AI's only role here is recognising the doctor's intent and pulling up the right patient.
>
> **Stack 2 — the clinical synthesis card — is where AI helps.** It picks which published guideline panels apply to this patient (from the hospital's signed library: NCCN, NICE, ESC, ADA, KDIGO, Beers, WHO HEARTS, AASM), ranks the rule fires by severity, and composes a one-line title over each. **The clinical content of each panel comes from the published guideline, not from the LLM.** AI is a librarian, not an author.
>
> This is what lets Velora promise the doctor: every line you read in Stack 1 is your colleagues' words; every recommendation in Stack 2 cites a signed rule. There is never a third category — "the AI's opinion" — anywhere on the surface.

---

## 5 · The trust contract — the no-data-loss principle

The single rule that governs every claim on the card:

> Every visible statement is row-attributable to a specific OMOP consultation (Stack 1) **or** to a cited published guideline (Stack 2), and anything the brief chose **not** to surface is disclosed.

In other words: **Stack 1 traces to data; Stack 2 traces to rules. Nothing on the screen traces to "the AI's judgement".**

In practice:

| Type of claim | How it's grounded |
|---|---|
| "Carcinoma · Hepatic flexure · T3N2b" | 6 condition_occurrence rows across 6 visits, listed by doctor + date in the tooltip |
| "Robotic Hemicolectomy (30 Sep 2024)" | 6 historical-context rows, surgical event predates window — flagged in tooltip |
| "Morphine added 5 May 2026" | 1 drug_exposure row, full sig in the deep-dive |
| "Oncology surveillance overdue" | Computed from `MAX(visit_date WHERE specialty=Oncology)` vs. NCCN §SURV-2 cadence rule |
| "No known drug allergy" | 6 explicit-negative condition_occurrence rows — surfaced as a positive ✓ to make the absence read as data |
| "Investigations advised but no result" | observation.investigation_text row exists; no corresponding measurement row matches — surfaced as open loop |

**What we do NOT do:**

- Invent values to fill blanks
- Round soft inferences as hard claims
- Hide data we have but didn't show
- Synthesise narratives the clinician can't trace back to an OMOP row

If the data isn't there, the brief **says so explicitly** in an open-loops block — never silently.

---

## 6 · Architecture at a glance

```
  ┌─────────────────────────┐
  │  Hospital source systems │     Pm-Casemanager · Pm-PatientMaster · Pm-Vital
  │  (MySQL + MongoDB)      │     Pm-medicalHistory · Pm-Patient-Docs · Pm-IPD ·
  └────────────┬────────────┘     Pm-Growth-Chart  ·  Pm-User-Master
               │
               │  ETL · transform · standardise
               ▼
  ┌─────────────────────────┐     person · visit_occurrence · condition_occurrence ·
  │  OMOP CDM v5.4 target   │     drug_exposure · measurement · observation · note
  │  (PostgreSQL)           │     · provider · care_site · location
  └────────────┬────────────┘
               │
               │  Velora rule + synthesis engine
               ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  Cross-consultation brief data model                                │
  │  ─────────────────────────────────────────────────────────────      │
  │   • patient header     ← person + observation overflow              │
  │   • medical history    ← grouped condition_occurrence with sources  │
  │   • specialty cards    ← grouped visits + drugs + observations      │
  │   • coordination flags ← class-based detectors over the join        │
  │   • guideline panels   ← rules over conditions + drugs + labs       │
  └────────────┬────────────────────────────────────────────────────────┘
               │
               │  Chat surface — single React card component
               ▼
  ┌─────────────────────────┐
  │  Clinician's screen     │     Velora chat panel inside the existing
  │                         │     EMR workflow — no new login, no new app
  └─────────────────────────┘
```

The principle: **standardised input → rule-based synthesis → single-screen output, with every layer auditable**.

Three properties of this architecture:

- **Hospital-agnostic** — any HMIS that can land in OMOP CDM v5.4 can power Velora. No vendor lock-in.
- **Rule-anchored** — every collision flag cites a published clinical guideline. Velora does not "decide" what is dangerous; it applies decided rules.
- **Trust-traceable** — every visible row in the UI maps to an OMOP row. The deep-dive page documents exactly which rule fired and from which inputs.

---

## 7 · How the clinician's day changes

| Without the brief | With the brief |
|---|---|
| Opens unfamiliar patient → spends 6–9 min reading prior notes | Opens unfamiliar patient → 30s orientation, 5 min of judgment |
| Reads each specialty's notes in isolation | Sees the cross-specialty story in one screen |
| Has to remember the polypharmacy list themselves | DDI + duplication flags surface automatically |
| Discovers missed follow-ups only by accident | Surveillance gaps surface as open loops with cited rules |
| Prescribes defensively when info is missing | Sees explicitly what's missing — orders only what's needed |
| Re-orders labs because the prior result is hard to find | Labs surfaced in context; missing labs flagged as gaps |

**The brief does not replace the clinician's judgment.** It removes the data-archaeology tax so the clinician's judgment has a fair chance to engage with the actual clinical problem.

---

## 8 · How it works for different patient profiles

The brief adapts. Five real OMOP-backed patients in the live demo illustrate the spread:

| # | Patient | Profile | What the brief surfaces |
|---|---|---|---|
| P1 | Lakshmi Iyer (F · 76) | Breast Ca stage IA + cardiac + OSA + CKD · 17-day pre-op burst | 5 specialty cards racing toward surgery; cardiac + airway + renal clearance chains incomplete |
| P2 | Suresh Patel (M · 60) | Colon Ca T3N2b + lung mets + 12-specialty polypharmacy | Surveillance overdue + 3 DDI / coordination flags + Pain Specialist closure |
| P3 | Asha Krishnan (F · 57) | HTN + post-Achilles + recurrent viral fevers · narrow footprint | A **deliberately sparse** card — one chronic anchor, allergy gap dominates |
| P4 | Meera Joshi (F · 58) | CAD + prior CVA + DM stack · DAPT for 12+ months | Secondary-prevention regimen flagged for de-escalation; glimepiride double-dose; T3+T4 cross-specialty combo |
| P5 | Anita Desai (F · 64) | Severe hyperTG + recurrent pancreatitis + 15 specialties | The headline lab value (TG 2898) lives in narrative not measurement; fibrate-gap is the highest-priority intervention |

**The same card shape handles all five.** The mock data is per-patient; the rendering logic is not. That's the test of whether the design is right.

---

## 9 · What's NOT in V0 (honest limitations)

The brief is V0. It has known boundaries:

- **Labs are partial.** Lab results live in OMOP `measurement` (type 44818702). Not every patient has every lab ingested. When a lab is missing, the brief shows it as an open loop — never silently absent.
- **Provider → specialty lookup is manual today.** The OMOP `provider` table is not always exported alongside the patient slice. For demo patients we resolved manually; for production, the data team will own the lookup.
- **IPD slice is patchy.** Some patients have surgical history referenced in free-text symptom notes but no corresponding inpatient `visit_occurrence` row. Flagged in the open loops.
- **Examination text uses custom delimiters** (`|~~|` and `//~//`). Currently rendered as a blob; a parser is on the V1 list.
- **No multilingual support yet.** Card content + tooltip text are English-only.
- **No clinician customisation yet.** Every specialty user sees the same brief. Specialty-aware filtering ("show me only the cardio-relevant cross-team signal") is V1+.
- **Deep-dive page** for the brief is documentation-grade — useful for reviewers, not yet polished for end-clinicians.

These are not show-stoppers. They are explicit. The brief is designed to be *honest about its boundaries* rather than to pretend completeness.

---

## 10 · Related documents

- [README.md](./README.md) — index of all 5 patient docs + cross-cutting data-quality flags
- [CROSS-CONSULTATION-BRIEF-ARCHETYPE.md](./CROSS-CONSULTATION-BRIEF-ARCHETYPE.md) — developer-facing schema + ASCII wireframes + how-to-add-a-patient
- [P1-lakshmi-iyer-1093717054960.md](./P1-lakshmi-iyer-1093717054960.md) — F · 76 · breast Ca pre-op
- [P2-suresh-patel-843373981236.md](./P2-suresh-patel-843373981236.md) — M · 60 · colon Ca + lung mets (LIVE demo)
- [P3-asha-krishnan-375391871728.md](./P3-asha-krishnan-375391871728.md) — F · 57 · minimal-data case
- [P4-meera-joshi-241381057447.md](./P4-meera-joshi-241381057447.md) — F · 58 · CAD + CVA + DM
- [P5-anita-desai-714696991886.md](./P5-anita-desai-714696991886.md) — F · 64 · hyperTG + pancreatitis
- [P6-arjun-verma-319033560465.md](./P6-arjun-verma-319033560465.md) — M · 14 · Wilson's + acute HAV · IPD + OPD

---

*Living document. When the brief's design or the underlying data architecture changes, this file changes too. The card is the source of truth; this doc explains it.*
