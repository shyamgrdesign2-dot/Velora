# Cross-verification log

> Run-by-run record of OMOP data drift across the six patient archives.
>
> Each entry below documents one verification pass: when it ran, what the
> data inventory looked like, and what changed materially since the
> previous run. When the mocks need updating to keep pace, the relevant
> commit hashes are referenced.

> **Why this doc matters in the architecture.** The mocks this log
> verifies drive **Stack 1** of the Cross-consultation surface — the
> verbatim card body that renders OMOP data without any AI authorship.
> Any drift in the source OMOP export is therefore a Stack-1 fidelity
> issue, not a Stack-2 (clinical-synthesis) one. Keeping the mocks
> exactly aligned with the source is what lets us promise the doctor
> that every line in the brief is row-attributable. For the canonical
> Stack 1 / Stack 2 explanation see
> [`WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md`](./WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md) §4.

---

## Pass 2 · 13 May 2026 · all six patients re-exported

The user delivered a fresh round of `Patient 1.zip` through `Patient 6.zip`
to verify that the live mocks reflect the latest source data. Stored as
`docs/velora-patients/data/P{N}-{name}-{personId}.zip`.

### Visible-data inventory (this pass)

| Patient | IPD | OPD | Conditions | Drugs | Measurements | Observations | Notes |
|---|---:|---:|---:|---:|---:|---:|---:|
| P1 · Lakshmi Iyer | 0 | 21 | 67 | 18 | 0 | 118 | 0 |
| P2 · Suresh Patel | 0 | 28 | 109 | 128 | 83 | 193 | 0 |
| P3 · Asha Krishnan | 0 | 59 | 13 | 182 | 18 | 589 | 0 |
| P4 · Meera Joshi | 0 | 40 | 782 | 431 | 222 | **356** | 0 |
| P5 · Anita Desai | 0 | 33 | 184 | 657 | 69 | **284** | 0 |
| P6 · Arjun Verma | **1** | 5 | 32 | 146 | 315 | **94** | 4 |

### Material drift since the prior pass

#### P4 · Meera Joshi — observation table grew from 4 → 356 rows

Prior mock + MD claimed *"`observation` rows only = 4. Symptoms / exam / investigations / advice / follow-up dates — almost nothing here."* That gap is now **closed**:

- 116 `followup_date`
- 70 `symptoms_text`
- 58 `examination_text`
- 46 `advice_text`
- 34 `followup_advice`
- 21 `investigation_text`

**New clinical signal surfaced from the narrative rows:**

- **"Recently treated for UTI under Dr Shivang Sharma"** — UTI episode previously absent from the brief.
- **"Recent UTI · MDR resistant · Treated with Niftran by Dr Shivang Sharma for 1 month"** — multi-drug-resistant infection on 1-month nitrofurantoin course. Clinically significant in a diabetic with renal stones; needs to be reflected in the Co-morbidities / Acute episodes section.
- Multiple "Follow up" + "No cardiac symptoms" notes confirming the stable CAD trajectory.

**Mock action required:**
- Remove the "`observation` rows = 4 · ingestion gap" claim from P4's open loops.
- Add MDR UTI as an Acute episode or as a new entry in Co-morbidities.
- Reasoning text in the data-quality flag at the bottom of P4 MD should be updated.

#### P5 · Anita Desai — observation table grew from 7 → 284 rows

Prior mock + MD claimed *"`observation` rows = 7 · Almost empty"*. That gap is now **closed**:

- 99 `followup_date`
- 75 `symptoms_text`
- 48 `followup_advice`
- 27 `examination_text`
- 24 `advice_text`
- 0 `investigation_text` (still absent)

**New clinical signal surfaced:**

- **TG trajectory captured**: `TRIGLYCERIDE 2898` on 11/03/2026 → `SERUM TRIGLYCERIDE 798` on 17/03/2026. That's a **~73% reduction over 6 days** — strong recovery signal. My current mock says only "TG 2898" without the trajectory.
- **HbA1c 8.50% · fasting 191 mg/dL** + **S. creatinine 0.85** + **random sugar 98 mg/dL** all captured in symptom text (still not in `measurement` rows; lab-pipeline gap unchanged).
- **"H/O OUTSIDE FOOD"** — dietary trigger for recurrent pancreatitis on 13/04/2026. Confirms metabolic-not-gallstone aetiology.

**Mock action required:**
- Remove "observation count = 7 · narrative not ingested" framing.
- Add TG 798 (post-treatment) alongside TG 2898 to demonstrate the recovery trajectory.
- HbA1c 8.5% value can now be cited (was completely absent before).
- Note that the lab-pipeline gap remains real (these values are still in free text, not in `measurement` rows).

#### P6 · Arjun Verma — discharge summary is more complete than the mock claims

The archive carries 4 `note` rows AND **discharge-summary-specific observation rows** that weren't in the earlier export:

| New observation source_value | Count | Maps to discharge-summary section |
|---|---:|---|
| `discharge_exam_abdomen` | 2 | Physical exam · abdomen |
| `discharge_exam_back` | 2 | Physical exam · back |
| `discharge_advice_diet` | 2 | Discharge advice · diet |
| `functional_assessment_bedActivity` | 2 | Functional assessment |
| `functional_assessment_sitting` | 2 | Functional assessment |
| `functional_assessment_standing` | 2 | Functional assessment |
| `functional_assessment_ambulation` | 2 | Functional assessment |
| `functional_assessment_stairClimbing` | 2 | Functional assessment |
| `functional_assessment_bedSoreOnAdmission` | 2 | Functional assessment |

So the discharge summary is captured across `note` (presenting complaints + discharge condition) **and** structured `observation` rows (discharge exam findings + advice + functional assessment).

**Mock action required:**
- Update P6 MD discharge-summary section to acknowledge the observation rows are surfacing functional-assessment + diet-advice + exam content even when `note.note_title` doesn't carry all the standard titles.
- Open loops can be tightened: only `Hospital Course`, `Operative Note`, and `Warning Signs` are truly missing; the diet advice + discharge exam + functional assessment are present (just in `observation` not in `note`).

### Patients with no material drift

- **P1 Lakshmi Iyer** — counts identical to the prior pass.
- **P2 Suresh Patel** — counts identical to the prior pass.
- **P3 Asha Krishnan** — counts identical to the prior pass.

### Patient ID ↔ archive filename mapping (for the record)

| User's zip filename | Canonical filename in `data/` | person_id |
|---|---|---|
| `Patient 1.zip` | `P2-suresh-patel-843373981236.zip` | 843373981236 |
| `Patient 2.zip` | `P1-lakshmi-iyer-1093717054960.zip` | 1093717054960 |
| `Patient 3.zip` | `P3-asha-krishnan-375391871728.zip` | 375391871728 |
| `Patient 4.zip` | `P4-meera-joshi-241381057447.zip` | 241381057447 |
| `Patient 5.zip` | `P5-anita-desai-714696991886.zip` | 714696991886 |
| `Patient 6.zip` | `P6-arjun-verma-319033560465.zip` | 319033560465 |

The user's `Patient N.zip` numbering doesn't match catalogue position; the canonical filenames in `data/` use catalogue position. person_id is the only field that's stable across both naming schemes.
