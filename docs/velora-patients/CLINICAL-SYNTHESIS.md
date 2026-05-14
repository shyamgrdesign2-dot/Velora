# Clinical Synthesis — the Stack-2 spec

> The second card on the cross-consultation surface. The card title in the UI is **"Clinical synthesis · Cross-team interpretation"**.
>
> Audience: clinical lead (signs off the rule set), AI / ML engineer (implements the prompt + dispatch), product (explains the contract externally), and a future regulatory reviewer.
>
> Sibling doc: [`WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md`](./WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md) — the plain-English explainer of the whole surface (Stack 1 + Stack 2).
> Companion doc: [`CROSS-CONSULTATION-BRIEF-ARCHETYPE.md`](./CROSS-CONSULTATION-BRIEF-ARCHETYPE.md) — the developer-facing layout spec for the same surface.

---

## 1 · What Clinical Synthesis is (and what it isn't)

Stack 1 — the *Cross-consultation brief* card above this one — is **recall**. It mirrors every specialty team's note verbatim from OMOP CDM v5.4. No AI authors anything there.

Stack 2 — **this** card — is **connection**. Once the clinician has read what every team wrote, this card helps them spot **cross-team signals** that a single specialty card cannot show on its own:

- *Two specialties prescribed drugs that interact* (DDI).
- *One specialty deferred a follow-up that another specialty was waiting on* (coordination gap).
- *This patient meets the trigger conditions for a published guideline panel* (guideline anchor).
- *A cross-team meeting is pending and Velora can name what needs to happen there* (MDT next-step).

**What this card is NOT:**

- It is **not** an LLM monologue. Every visible bullet cites a published rule.
- It is **not** the place for new clinical opinions. The clinical content of each panel is verbatim from the cited body (NCCN · NICE · ESC · ADA · KDIGO · Beers · WHO HEARTS · AASM).
- It is **not** authored end-to-end by AI. AI's authoring scope is bounded to three operations — see §3.

---

## 2 · Where it sits on the surface

```
   ┌─────────────────────────────────────────────────────────────┐
   │ CARD 1 · Cross-consultation brief         (Stack 1 · no AI) │
   │   Medical history · per-specialty visits · verbatim OMOP    │
   └─────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────────┐
   │ CARD 2 · Clinical synthesis           (Stack 2 · AI bounded)│
   │                                                             │
   │   ⚠ Where they collide       § 4   DDI + coordination gaps  │
   │   📈 Guideline-anchored panels§ 5  ESC · ADA · KDIGO · …    │
   │   📋 Pending MDT items       § 6   cross-team next steps    │
   │                                                             │
   └─────────────────────────────────────────────────────────────┘
```

The two cards are stacked vertically inside one chat turn. Stack 1 always renders first; Stack 2 follows immediately below.

---

## 3 · AI's authoring scope — what it may and may not do

The single architectural rule of this card:

> **AI is a librarian, not an author.**

```
   ┌── AI may ──────────────────────────────┐ ┌── AI may NOT ───────────┐
   │                                        │ │                         │
   │  • Pick which signed-guideline panels  │ │  • Author a new clinical│
   │    apply to THIS patient's data        │ │    recommendation       │
   │                                        │ │                         │
   │  • Rank the rule fires by severity     │ │  • Decide what is       │
   │    within the cited guideline's        │ │    "dangerous" outside  │
   │    framework                           │ │    a cited rule         │
   │                                        │ │                         │
   │  • Compose the one-line collision      │ │  • Hallucinate patient  │
   │    title that names the pair of        │ │    values, lab numbers, │
   │    drugs / signals involved            │ │    or drug doses        │
   │                                        │ │                         │
   │  • Compose the one-line "next step"    │ │  • Issue a diagnosis    │
   │    for a Pending MDT item              │ │    the EMR doesn't carry│
   │                                        │ │                         │
   └────────────────────────────────────────┘ └─────────────────────────┘
```

If something falls outside what AI may do, it must come from one of two static sources:

1. **The patient's OMOP CDM data.** Pulled directly by the rule engine; no LLM in the loop.
2. **The hospital's signed guideline library.** Configured by the admin in the *Guideline Settings* sidebar (`components/tp-rxpad/dr-agent/shell/GuidelineSettingsSidebar.tsx`). Verbatim content per body / year (`lib/velora/guideline-registry.ts`).

---

## 4 · Block ① · "Where they collide"

A list of independent **detector fires**, each one a clinically actionable cross-team signal. Two kinds of fire:

| Kind | What triggers it | Example |
|---|---|---|
| **DDI flag** | A rule in the DDI rule-base (Lexicomp class rule LX-0042, Zydus formulary §3.2, Beers Criteria 2023 §Sedative + opioid, …) matches the patient's currently-active `drug_exposure` set | Naproxen × Apixaban — NSAID on a DOAC, bleed risk; Lexicomp class rule LX-0042 |
| **Coordination gap** | A signed cadence rule (NCCN §SURV-2, NICE NG56 polypharmacy, hospital operational config) finds an interval since `MAX(visit_date, specialty=X)` that exceeds threshold | Oncology surveillance overdue — 6+ months since last contact; NCCN Colon Ca v.2.2024 §SURV-2 |

### 4.1 · The rule shape

A detector is a pure function over Stack-1 data:

```
   detector(omop_patient_slice) → ZeroOrMore< Fire >

   Fire = {
     kind           : "ddi" | "coordination-gap",
     severity       : "alert" | "warn",
     drugs?         : string[],          // for DDI kind
     teams?         : string[],          // for coordination-gap kind
     points         : string[],          // bullet content, verbatim
     rule           : { body, year, section, readableBody },
   }
```

No LLM inside the detector — only data filters + rule lookups. The detector emits a stable object; the UI renders it.

### 4.2 · AI's job on this block

For each emitted Fire, AI:

1. **Decides if it belongs at all.** Same trigger conditions may be in the rule-base AND in the admin's signed library — the latter is the authority. (If the hospital hasn't signed Lexicomp, Lexicomp-only fires are dropped.)
2. **Composes the `title` string** — the one-line human-readable headline. Inputs: the drug pair / signal pair, the severity, and the rule's `readableBody`. Output is bounded to ≤ 80 characters, no clinical claim that isn't already in `points[]`.
3. **Ranks the surviving fires.** Severity first (`alert` > `warn`); within severity, age-of-risk first (a 41-day open referral outranks a 12-day one); within age, the rule's published severity tier.

### 4.3 · The AI instruction template

If you were writing the LLM prompt that produces `title` + ranking, it would look like this:

```
   SYSTEM ──────────────────────────────────────────────────────────
   You are a clinical-context librarian. You write the one-line
   headline for a cross-team safety flag. You do NOT invent
   recommendations, doses, or diagnoses.

   You receive a Fire object. Output ONLY:
     • a `title` string ≤ 80 chars summarising the pair of signals
       involved and the broad concern (e.g. "Naproxen × Apixaban —
       NSAID on a DOAC, bleed risk").
     • a `rankWithinSeverity` integer (0 = most actionable inside
       this severity tier).

   You may use the rule's `readableBody`, the drugs/teams lists,
   and the bullets in `points[]` as your only knowledge inputs.
   You may NOT reference clinical facts outside those inputs.
   You may NOT change `points[]`. You may NOT change `rule`.

   USER ────────────────────────────────────────────────────────────
   Fire JSON:
     { kind, severity, drugs?, teams?, points, rule }
```

The model's allowed output surface is intentionally tiny. Any new clinical statement is out of scope.

### 4.4 · What to show first

Reader's eye path inside the block:

1. **Kind badge** (red for DDI, amber for coordination-gap) — so the doctor knows the *type* before they parse the title.
2. **Title** — what the conflict is, in 80 characters or fewer.
3. **Guideline chip** on the right of the title row — body + year + section. Always present, never omitted.
4. **Bullets** — verbatim from `points[]`. Each one a fact, not an opinion.

Severity colour and ordering are the only visual differentiators — no extra ornament.

---

## 5 · Block ② · Guideline-anchored panels

Cross-team interpretation panels that fire when the patient meets a published trigger. Each panel:

- Lives in the patient's `data.syntheses[]` array.
- Has a `panelTitle`, a `guideline` citation, and a `rows[]` table of `{ label, value, target, tone }`.
- Optionally a `note` (Why this panel) — surfaced only in the deep-dive doc; not in the chat surface.

### 5.1 · Examples (from the V0 patient set)

| Patient | Panel that fires | Trigger | Cited body |
|---|---|---|---|
| Lakshmi Iyer (P1) | Hormonal therapy + bone-protective bundle | Letrozole + Denosumab on the drug list | ASCO / NCCN 2024 |
| Lakshmi Iyer (P1) | Pre-op clearance chain | Multi-specialty pre-op burst | ASA / DAS 2023 |
| Suresh Patel (P2) | NCCN colon-cancer surveillance | Colon Ca stage IIIB + 6+ mo since last Onco visit | NCCN v.2.2024 §SURV-1, SURV-2 |
| Meera Joshi (P4) | Secondary-prevention CV regimen | CAD + prior CVA + DAPT > 12 mo | ACC / AHA 2023 |
| Anita Desai (P5) | Fibrate-gap on hypertriglyceridaemia | TG > 1000 + recurrent pancreatitis | NICE NG181 |

### 5.2 · The rule shape

```
   panelSelector(omop_patient_slice, signed_library) → ZeroOrMore< Panel >

   Panel = {
     panelTitle    : string,             // verbatim from the guideline
     guideline     : { body, year, section, readableBody },
     rows          : Array<{
       label       : string,             // the metric name
       value       : string,             // the patient's value (verbatim
                                         //   from OMOP, NEVER synthesised)
       target?     : string,             // the rule's threshold / target
       tone?       : "ok" | "warn" | "alert",
     }>,
     note?         : string,             // "Why this panel" — for docs only
   }
```

Critical: `rows[].value` MUST come from `measurement` or `observation` or `drug_exposure` in the patient's OMOP slice. If the value isn't on file, the row drops — it does NOT get back-filled by AI.

### 5.3 · AI's job on this block

1. **Pick which panels apply.** Given the patient's diagnoses + drugs + age + recent vitals/labs, AI maps the data against the signed-library trigger conditions. A panel fires when its trigger condition is *satisfied AND its body has been signed by the admin*.
2. **Order the panels.** Roughly: hardest-stop first (panels with `alert` rows), then most-time-sensitive (overdue surveillance, peri-op chains), then chronic-condition trackers.
3. **NOT compose the rows.** Rows come from the rule + the OMOP join. AI never edits `value`, `target`, or `tone`.

### 5.4 · The AI instruction template

```
   SYSTEM ──────────────────────────────────────────────────────────
   You are a clinical-context librarian. You select which published
   guideline panels apply to this patient and rank them. You do NOT
   author or edit any panel's content.

   Inputs:
     • patient_profile  — problem list, active drugs, recent labs,
                          age, specialty touch points
     • signed_panels    — every guideline panel the hospital admin
                          has marked as in-policy
                          (guideline-registry.ts, filtered by
                           saved selection)
     • panel_triggers   — for each signed panel, the boolean trigger
                          condition over patient_profile

   Output JSON array. Each element:
     { panel_id, rank }
   where panel_id is verbatim from signed_panels.

   Rules:
     • Include a panel iff its trigger fires AND it is in signed_panels.
     • Rank by (a) `alert`-row count, then (b) clinical time pressure,
       then (c) the panel's published severity tier.
     • You MUST NOT propose a panel that isn't in signed_panels.
     • You MUST NOT alter panel content. The renderer reads `rows[]`
       directly from the panel definition.

   USER ────────────────────────────────────────────────────────────
   patient_profile: { … }
   signed_panels:   [ … ]
   panel_triggers:  [ … ]
```

The output is tiny: a list of `(panel_id, rank)` pairs. Everything else is data lookup.

### 5.5 · What to show first

Reader's eye path inside a panel:

1. **Panel title** — verbatim from the published guideline.
2. **Guideline chip** on the right of the title — body, year, section.
3. **Rows** — each row is `Label : value (target via ⓘ on the label)`.
   - `alert` rows render with a red flag-arrow + red value.
   - `warn` rows render with an amber flag-arrow + amber value.
   - `ok` rows render in plain slate-700 — they're proof-of-coverage, not call-outs.
4. **Why this panel** — hidden from the chat surface; visible only in the deep-dive doc so the design lead can audit selection logic.

---

## 6 · Block ③ · Pending MDT items

A short bulleted list of **cross-team next steps**. Lives in `data.pendingMdtItems[]`.

Examples (drawn from the V0 mocks):

- *"Cardiology to release Echo report + functional-capacity sign-off before surgical date booking."*
- *"Anaesthesia to write the difficult-airway plan in response to the AHI 31.2 PSG result."*
- *"Pharmacy / Internal Medicine to reconcile the Orthopaedics + Neurology gabapentinoid streams."*
- *"Oncology to brief the patient + family on the Denosumab Q6-monthly cadence and the 1-year follow-up."*

### 6.1 · Where they come from

Each item is the **dependency** between two Stack-1 items that nobody has closed. The dependency is computable from the data:

```
   pendingItem ← cross_specialty_dependency_detector(
     stack1_visit_graph,
     stack1_open_loops,
     signed_handoff_rules,
   )
```

The detector enumerates open referrals, ordered-but-no-result investigations, and surveillance lapses (the Stack-1 open-loop block already lists them) and pairs them with the team responsible for the next step.

### 6.2 · AI's job

Same scope as Block ①:

1. **Compose the one-line next-step sentence** — who needs to do what, by when (if a deadline is implied by a signed cadence rule).
2. **Rank.** Hard deadlines first, then time-since-trigger.
3. **NOT invent** a next step that isn't backed by a Stack-1 open loop OR a signed handoff rule.

### 6.3 · The AI instruction template

```
   SYSTEM ──────────────────────────────────────────────────────────
   You are a clinical-context librarian. You write the one-line
   description of a pending cross-team coordination step. You do
   NOT invent the step itself; you compose the human-readable
   sentence for a step the detector has already emitted.

   Inputs:
     • pending_step    — { from_team, to_team, what, deadline_basis }
     • signed_rules    — the cadence / handoff rules that apply

   Output: a string ≤ 140 chars.

   Rules:
     • Name the responsible team explicitly.
     • Name the action — e.g. "release Echo report",
       "brief patient + family", "reconcile gabapentinoid streams".
     • Include the deadline ONLY if `deadline_basis` is signed.
     • You MUST NOT propose a step that isn't in `pending_step`.

   USER ────────────────────────────────────────────────────────────
   pending_step:  { … }
   signed_rules:  [ … ]
```

---

## 7 · Block ordering — what fires first on the card

When all three blocks have content, they render top → bottom in this order:

1. **"Where they collide"** — the hardest-stop surface. A doctor reading the card pauses here before anything else.
2. **Guideline-anchored panels** — interpretation layer. Read once the safety flags are mentally parked.
3. **Pending MDT items** — next-step list. The doctor's "what do I do next" prompt at the bottom.

Within each block, the per-item ordering is described in the block's section above (§4.2, §5.3, §6.2).

### 7.1 · When a block is empty

The block is **completely hidden** — no empty-state placeholder. Clinical synthesis without flags reads as *"this patient is well-coordinated; nothing to surface"*, which is a positive signal.

The one exception: when the entire card would render with zero blocks, we show the preamble paragraph alone (*"Curated cross-team groupings from published guidelines, applied to this patient's data. AI picks which panels apply; it does not author the claims."*). Even an "empty" Clinical synthesis confirms the contract.

---

## 8 · The clinical-significance hierarchy

When ranking inside any block, AI follows this order:

1. **Imminent harm** — drug interactions with serious-bleed / serious-arrhythmia / serious-sedation potential; metabolic decompensation risk; missed STAT escalation.
2. **Time-sensitive cadence breach** — overdue oncology surveillance, missed perioperative clearance, unreviewed critical labs.
3. **Polypharmacy + de-prescribing opportunities** — NICE NG56 polypharmacy review trigger, Beers high-risk drug detected.
4. **Chronic-condition optimisation** — HbA1c above target, LDL above target, BP above WHO HEARTS target.
5. **Coordination ergonomics** — handoffs that delayed a routine but non-critical step.

This hierarchy is documented in the rule-base, not learned by the LLM. The LLM uses it as input to its ranking step.

---

## 9 · Worked examples (read these to feel the spec land)

### Example A · Lakshmi Iyer (P1) — pre-op breast cancer

Stack-2 fires:

```
  ── Where they collide ──
  ⚠ Coordination gap   Pre-op clearance chain incomplete
                       Cardiology Echo + Anaesthesia airway plan +
                       Nephrology contrast protocol — none on file 4
                       days before surgical date booking.
                       Citation: ASA / DAS 2023 Pre-op CV + airway

  ── Guideline-anchored panels ──
  📈 Hormonal therapy + bone-protective bundle      ASCO / NCCN 2024
     Aromatase inhibitor : Letrozole (Oncolet) 2.5 mg OD
     Anti-resorptive     : Denosumab 60 mg SC every 6 months
     Calcium + Vit D     : Effectol + Shelcal daily
     Follow-up cadence   : 1 year

  📈 Severe OSA · CPAP titration window             AASM 2023 Adult OSA
     AHI                 : 31.2  (severe)
     CPAP scheduled      : advised, not yet booked  ⚠
     Pre-op airway plan  : pending                  ⚠

  ── Pending MDT items ──
  • Cardiology to release Echo report + functional-capacity sign-off
    before surgical date booking.
  • Anaesthesia to write the difficult-airway plan in response to
    the AHI 31.2 PSG result.
  • Nephrology to script the pre + post-contrast hydration protocol
    around any future contrast imaging.
  • Pharmacy / Internal Medicine to reconcile the Orthopaedics +
    Neurology gabapentinoid streams.
  • Oncology to brief the patient + family on the Denosumab
    Q6-monthly cadence and the 1-year follow-up.
```

Reader's eye path:

```
   1.  ⚠ Pre-op clearance chain incomplete       → must close before booking
   2.  📈 Hormonal therapy + bone-protective     → on regimen, cadence intact
   3.  📈 Severe OSA · CPAP titration window     → airway plan pending
   4.  📋 5 cross-team next steps                → actionable list
```

### Example B · Suresh Patel (P2) — colon Ca + lung mets

Stack-2 fires:

```
  ── Where they collide ──
  ⚠ Coordination gap   Oncology surveillance overdue
                       6+ months since last Onco contact;
                       CEA + PET-CT ordered but no result on file.
                       Citation: NCCN Colon Ca v.2.2024 §SURV-2

  ⚠ DDI flag           Morphine added to neuropathic stack
                       SNRI + TCA + gabapentinoid + opioid in ≥60y.
                       Citation: Beers Criteria 2023 §Sedative + opioid

  ⚠ DDI flag           Gabapentin double-dose across Neuro +
                       Neurosurgery — two prescribers, no
                       reconciliation.
                       Citation: NICE CG173

  ⚠ Coordination gap   IV-grade pulmonology care coded as OPD
                       7-9 May 2026 — IV antibiotics + IV fluids in an
                       OPD-coded encounter (data-quality flag, real
                       care was inpatient-grade).
                       Citation: BTS CAP severity grading

  ── Guideline-anchored panels ──
  (none currently signed — Onco-surveillance panel is the surrogate
   above)

  ── Pending MDT items ──
  • Oncology to book CEA + PET-CT before next Onco review.
  • Pain Specialist / Neuro / Neurosurgery to reconcile gabapentinoid
    streams.
  • Pulmonology to reclassify the 7-9 May acute course or back-fill
    the inpatient `visit_occurrence` row.
```

---

## 10 · Failure modes and how the design prevents them

| Failure mode | Why it's prevented |
|---|---|
| AI invents a DDI flag that isn't in any rule body | Detector is a pure function on OMOP × rule-base; LLM cannot emit a Fire that the detector didn't already produce. |
| AI changes the panel content to "make it sound cleaner" | The renderer reads `rows[]` directly from the panel definition; the LLM's allowed output is `(panel_id, rank)` only. |
| AI picks a panel from a body the hospital hasn't signed | The signed-library filter (`loadGuidelineSelection()` keyed by hospital tenant) gates the LLM's panel-selection input. Unsigned bodies are simply not in the candidate set. |
| AI fabricates a patient lab value | `rows[].value` MUST trace to an OMOP `measurement` / `observation` / `drug_exposure` row. If the value isn't on file, the row drops; AI has no path to back-fill. |
| AI surfaces a Pending MDT item that no detector emitted | Pending MDT items render from `data.pendingMdtItems[]` only. AI is the librarian for the wording, not the source. |

---

## 11 · How to add a new guideline panel (developer + clinical lead workflow)

```
   1. Clinical lead picks the published guideline.
        → adds an entry to `lib/velora/guideline-registry.ts`
          (the same registry the Admin sidebar reads)

   2. Clinical lead writes the trigger condition in plain language.
        → engineer translates it to a pure boolean function over
          patient_profile in the panel-selector module

   3. Clinical lead writes the panel content verbatim from the
      guideline: panel_title, rows[] (label · target · tone),
      and the `note` ("Why this panel").
        → the renderer reads this object as-is. No LLM access.

   4. QA: patient mocks that should fire the panel are tagged
      with the patient_id in the panel's test fixture.
        → CI runs the panel-selector against every fixture and
          asserts the panel fires exactly when expected.
```

Same flow for a DDI rule or a coordination cadence rule, swap "panel-selector" for "detector".

---

## 12 · Related artefacts

- `components/tp-rxpad/dr-agent/cards/velora-v0/VeloraV0MdtBriefCard.tsx` — the renderer. Stack 2 starts where the second `CardShell` (title `"Clinical synthesis"`) is mounted.
- `lib/velora/guideline-registry.ts` — the guideline catalogue (the "library").
- `components/tp-rxpad/dr-agent/shell/GuidelineSettingsSidebar.tsx` — the admin tool that gates which bodies are signed at this hospital.
- `lib/velora/v0-replies.ts` → `data.syntheses`, `data.collisions`, `data.pendingMdtItems` — the data fields a Stack-2 panel populates.
- [`WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md`](./WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md) §4 — the canonical Stack 1 vs Stack 2 explainer.
- [`CROSS-CONSULTATION-BRIEF-ARCHETYPE.md`](./CROSS-CONSULTATION-BRIEF-ARCHETYPE.md) §0 — the developer's gut-check for the AI line.

---

*Living document. When the AI's authoring scope changes — or when a new block lands on the synthesis card — this file changes first.*
