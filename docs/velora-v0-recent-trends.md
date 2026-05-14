# Velora v0 · Recent Trends — canned-message logic

Status: design doc accompanying `lib/velora/v0-trends.ts`.
Maintainer: surface design owner.
Audience: clinical lead / product reviewer auditing why a particular
trend chip exists for a particular patient.

## Welcome-card split — vital vs lab

The V0 welcome screen exposes two trend entry points, not one:

  • **Recent vital trends** — bedside measurements (BP, weight, SpO₂).
  • **Recent lab trends** — anything drawn / cultured / processed
    downstream (HbA1c, eGFR, lipid, Hb, calcium, vitamin D, troponin,
    fasting glucose, wound culture, …).

Each `TrendDef` in `lib/velora/v0-trends.ts` carries a `category:
"vital" | "lab"` field. The reply handler reads the doctor's message
through `detectTrendCategory(message)` and filters the per-patient
trend list to just that category before rendering the menu chips. A
specific trend question ("Show HbA1c trend") matches its own
canonical TrendDef regardless of which menu the doctor came from —
but the *pivot* suggestions under the reply stay in the matched
trend's category so the menu stays coherent.

When in doubt, a trend is classified as `lab` — that's how doctors
naturally search for downstream parameters.

---

## Why this doc exists

The "Recent trends" intent (the third and last V0 intent, replacing
the retired "Active meds & safety" and "Why flagged today") does not
show a static list of trends. The chips a doctor sees after tapping
the intent are **filtered per-patient**, and the filter is **not AI-
generated**. It is a deterministic mapping driven by:

1. **The patient's problem list** — what conditions are on the
   medical-history record. Hypertension surfaces BP; T2DM surfaces
   HbA1c and fasting glucose; CKD surfaces eGFR; oncology on
   Denosumab surfaces calcium + vitamin D; post-op cases surface
   wound culture; cardiac admissions surface troponin.
2. **The specialty context** — which specialties the patient touched.
   An oncology patient also seen by cardiology gets cardio's relevant
   surveillance trends; a plastic-surgery patient does not.
3. **The hospital-signed guideline panels** — only trends with a
   citable rule in one of the signed bodies (ADA · WHO HEARTS · NICE
   · KDIGO · ESC) get a chip. This is what lets every reply ship
   with a citation footer instead of a vague "based on standard of
   care" line.

If a trend has no underlying series for this patient (one reading
isn't a trend), the chip is **hidden**. If the doctor types a free-
text question that asks for an unavailable trend, the guardrail
fires: a polite "this trend isn't on file" message that re-surfaces
the available list as canned chips, so the doctor never lands on a
dead end.

---

## Logic rules — by trend

Each rule below is the condition under which the chip becomes
visible. The rules combine; a patient on Denosumab and CKD sees
both calcium and eGFR.

| Trend            | Visible when …                                                                                                       | Guideline anchor      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Blood pressure   | HTN OR CKD OR IHD OR T2DM OR post-op OR recent IPD admission                                                         | WHO HEARTS 2023       |
| Weight           | ≥ 2 readings on file (always offered for chronic-care patients)                                                      | —                     |
| HbA1c            | T2DM / prediabetes on the problem list                                                                               | ADA 2024              |
| Fasting glucose  | T2DM AND HbA1c measured < twice in the window (gives finer-grained read between draws)                               | ADA 2024              |
| Lipid panel      | Dyslipidaemia OR IHD OR T2DM OR documented CVD risk                                                                  | NICE NG181            |
| eGFR             | CKD on the problem list OR patient on a renally-cleared/nephrotoxic drug (apixaban · metformin · NSAID)              | KDIGO 2024            |
| Calcium          | Patient on Denosumab / bisphosphonates OR CKD-MBD                                                                    | (Denosumab label)     |
| Vitamin D        | Same trigger as calcium · osteopenia / osteoporosis                                                                  | —                     |
| Hemoglobin       | Oncology (anemia surveillance) OR post-op (blood-loss recovery) OR on anticoagulation                                | WHO anemia thresholds |
| SpO₂             | Severe OSA OR COPD OR post-op respiratory risk OR recent cardiac admission                                           | WHO                   |
| Troponin         | Recent IPD cardiac admission OR ACS workup inside the surveillance window                                            | ESC 2023              |
| Wound culture    | Post-op plastic surgery / orthopaedics with active follow-up                                                         | —                     |

---

## Patient-by-patient evidence

### Lakshmi Iyer (76F)

Problem list: Right breast cancer on Letrozole + Denosumab + Ca/Vit D
· IHD · HTN · Dyslipidaemia · CKD G3a · Severe OSA.

Visible trends:
- **BP** — HTN + IHD + CKD all carry an action threshold.
- **eGFR** — CKD G3a is on the problem list; Letrozole and several
  comorbid meds are renally-cleared. KDIGO staging is the live
  alarm.
- **Calcium + Vitamin D** — Denosumab. Pre-dose hypocalcaemia
  surveillance is the standard of care.
- **Hemoglobin** — oncology treatment-related anemia surveillance.
- **Lipid** — dyslipidaemia + IHD on the problem list.
- **SpO₂** — severe OSA on file. Overnight readings flagged when
  available.
- **Weight** — chronic-care patient with serial readings.

Trends NOT visible: HbA1c (not diabetic), troponin (no cardiac
admission inside the surveillance window), wound culture (no
active surgical site), fasting glucose (not diabetic).

### Mr Suresh Patel (60M)

Problem list: T2DM · HTN · IHD with significant CVD risk.

Visible trends: HbA1c · fasting glucose · BP · lipid · eGFR ·
weight. Diabetic case with vascular risk — full metabolic +
cardio + renal monitoring shown. No oncology / surgical chips.

### Asha Krishnan (57F)

Problem list: post-op tendoachilles repair (plastic surgery +
orthopaedics) · HTN.

Visible trends: BP · wound culture (serial swabs since the repair)
· hemoglobin (post-op nadir + recovery) · weight. No metabolic
chips — not diabetic, no dyslipidaemia on the problem list.

### Meera Joshi

Multi-specialty workup over 13 months. Visible trends scoped to
the dominant cardio + metabolic + renal signals her panel
touched (BP · HbA1c · lipid · eGFR · Hb · weight).

### Anita Desai

Long-window multi-specialty coverage with G3a CKD and T2DM.
Visible trends: BP · HbA1c · lipid · eGFR · weight.

### Arjun Verma

Recent IPD cardiac admission with OPD follow-ups.
Visible trends: BP · troponin (still inside the post-MI
surveillance window) · lipid · Hb (anti-platelet bleed risk) ·
weight.

---

## Reply shape

For each canned chip the reply is text-only in V0. Future
revisions will plug a chart card behind each chip:

```
Trend: <name>
Series: <timestamp → value> × N rows
Annotation: <threshold / target line from the signed guideline>
Citation footer: <Source + guideline body + year>
```

The pre-canned reply text lives next to the chip definition in
`v0-trends.ts` so the chat-time path is a single registry lookup —
no LLM call, no synthesised numbers.

---

## Guardrail

If a doctor types a trend question that doesn't match any of the
patient's visible chips, the reply is:

> Sorry — that trend isn't on file for **{Patient}**. Trends Velora
> can pull for this patient:
>
>   {Chip 1} · {Chip 2} · {Chip 3} · …
>
> Tap a chip below to view one.

The suggestion list re-surfaces every visible chip so the doctor
can land on a real trend in one tap. The guardrail never says
"AI couldn't find it" — it says "the data isn't there".

---

## Audit hook

`lib/velora/v0-trends.ts` exports `ALL_PATIENT_TRENDS` so a test
or a future audit page can iterate every (patient, trend) pair and
print the rationale string. This is the surface a clinical reviewer
should sign off before V0 ships externally.
