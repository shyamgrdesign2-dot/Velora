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

## 4 · What's on the card — the four movements

The card has two stacks of content (the spec calls them *Stack 1* and *Stack 2*), unfolding in four ordered movements:

### Movement ① · Who is this patient?  →  Medical history

A single block at the top of the card. Five tone-tinted tag chips, each one bullet of pipe-divided content:

| Chip | Tone | What it carries |
|---|---|---|
| **Primary problem** | Red | The headline diagnosis driving everything else — active cancer, recurrence signal, primary cardiac event, etc. |
| **Co-morbidities** | Slate | Chronic Active conditions recorded across visits |
| **Surgical history** | Slate | Past procedures with their dates |
| **Allergies & safety** | Green ✓ | Explicit verifications — "No known drug allergy, verified ×6". Absence is data. |
| **Family / Social** | Green ✓ | Anything noted, or explicit "no significant" |

Each chip carries an ⓘ icon — hover reveals the OMOP consultations behind it + a one-sentence "why this matters".

### Movement ② · Who has been involved? → Specialty consultations

One card per active specialty team, in priority order. Each card has:

- A **rich header** showing the date range, visit count, doctors, and an ⓘ.
- A **body** with three labelled rows:
  - `Findings` — diagnosis + examination + symptoms, pipe-divided
  - `Medications` — only **currently ongoing** Rx (the row disappears entirely if nothing is active)
  - `Plan` — follow-up date, investigations advised, advice given
- An optional **amber open-loops block** — what's captured upstream but not shown, what's missing entirely, what's overdue per cited guideline.

### Movement ③ · What demands attention? → Where they collide

A separate card below — Velora's "Stack 2 · Clinical synthesis". Lists every detector fire as its own sub-card:

- **DDI flags** — gabapentinoid double-dose, sedative + opioid stack, NSAID-on-DAPT, etc.
- **Coordination gaps** — overdue surveillance, missed follow-ups, ordered-but-no-result investigations.
- Each fire cites a real published rule (NCCN, Beers, NICE, ESC, ADA, KDIGO, BTS) with the specific section.

### Movement ④ · How do I trust this? → Throughout

Three layers, present at every level of the card:

1. **Header attribution** — every specialty card states up-front *"based on N visits with Dr X and Dr Y between D1 and D2"*. The doctor sees the evidence strength before they read a word of the body.
2. **Inline ⓘ tooltips** — every chip + every section header opens a tooltip with the OMOP source rows + the reasoning.
3. **Open-loops blocks** — amber-tinted callouts that surface what *isn't* shown. Absence is never silent.

---

## 5 · The trust contract — the no-data-loss principle

The single rule that governs every claim on the card:

> Every visible statement is row-attributable to a specific OMOP consultation, and anything the brief chose **not** to surface is disclosed.

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
- [P2-suresh-patel-DESIGN-WALKTHROUGH.md](./P2-suresh-patel-DESIGN-WALKTHROUGH.md) — full product walkthrough of the Suresh case
- [P3-asha-krishnan-375391871728.md](./P3-asha-krishnan-375391871728.md) — F · 57 · minimal-data case
- [P4-meera-joshi-241381057447.md](./P4-meera-joshi-241381057447.md) — F · 58 · CAD + CVA + DM
- [P5-anita-desai-714696991886.md](./P5-anita-desai-714696991886.md) — F · 64 · hyperTG + pancreatitis

---

*Living document. When the brief's design or the underlying data architecture changes, this file changes too. The card is the source of truth; this doc explains it.*
