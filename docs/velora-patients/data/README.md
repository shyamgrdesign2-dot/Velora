# Patient OMOP archives · stored source data

The six ZIP files in this directory are the raw OMOP CDM v5.4 exports that
power every patient mock in the Velora demo. Each archive contains the
standard 6-8 CSV files emitted by the source ETL (`person`,
`observation_period`, `visit_occurrence`, `condition_occurrence`,
`drug_exposure`, `measurement`, `observation`, and `note` where available).

| File | Person ID | Anonymised name | Sex · Age | OMOP scenario |
|---|---|---|---|---|
| `P1-lakshmi-iyer-1093717054960.zip` | 1093717054960 | Lakshmi Iyer | F · 76 | Breast Ca stage IA pre-op work-up; CAD + CKD + OSA backdrop |
| `P2-suresh-patel-843373981236.zip` | 843373981236 | Suresh Patel | M · 60 | Colon Ca T3N2b + lung mets + 12-specialty polypharmacy |
| `P3-asha-krishnan-375391871728.zip` | 375391871728 | Asha Krishnan | F · 57 | HTN + post-Achilles repair + recurrent viral fevers (narrow team footprint) |
| `P4-meera-joshi-241381057447.zip` | 241381057447 | Meera Joshi | F · 58 | CAD + CVA + DM + Hypothyroid + NAFLD + MDR UTI |
| `P5-anita-desai-714696991886.zip` | 714696991886 | Anita Desai | F · 64 | Severe hypertriglyceridaemia + recurrent pancreatitis + asthma |
| `P6-arjun-verma-319033560465.zip` | 319033560465 | Arjun Verma | M · 14 | **IPD + OPD** · Wilson's disease + acute HAV · 3-day admission + 5 OPD f/u |

## Why these files live here

1. **Reproducibility.** Anyone running the project can re-derive the mocks by re-parsing these archives (`python3 scripts/parse_omop_patient.py <unzipped-dir>`).
2. **Drift detection.** When the data team re-exports a patient, dropping the new archive here and comparing against the previous version reveals exactly what changed. The cross-verification record lives in [`CROSS-VERIFICATION.md`](../CROSS-VERIFICATION.md).
3. **Single source of truth.** All Velora documentation references these archives directly — no copies floating around the user's desktop.

## File-naming convention

`P{position-in-catalogue}-{anonymised-name-kebab}-{person_id}.zip`

- **Position-in-catalogue** comes from `RX_CONTEXT_OPTIONS` ordering (Lakshmi at 1, Suresh at 2, etc.).
- **Anonymised name** is the display name shown in the UI (not the source PID).
- **person_id** is the OMOP canonical identifier — guarantees uniqueness regardless of display-name choices.

## What's in each archive

Every archive contains, at minimum:

| File | Purpose |
|---|---|
| `person_N.csv` | Demographics (gender, DOB, primary provider, care site) |
| `observation_period_N.csv` | Active care window |
| `visit_occurrence_N.csv` | Every visit (`visit_concept_id` 9201 = Inpatient, 9202 = Outpatient) |
| `condition_occurrence_N.csv` | Diagnoses, surgical history, allergies, family/social history |
| `drug_exposure_N.csv` | Every prescription with full sig |
| `measurement_N.csv` | Vitals (type 44818701) + labs (type 44818702) where ingested |
| `observation_N.csv` | Symptoms, examination, investigations advised, follow-up dates, advice |
| `note_N.csv` | (P6 only so far) Discharge-summary narrative content |

## Working with the archives

```bash
# Inspect one patient's data inventory
mkdir /tmp/inspect && unzip -q docs/velora-patients/data/P4-meera-joshi-241381057447.zip -d /tmp/inspect
python3 scripts/parse_omop_patient.py /tmp/inspect

# Re-run cross-verification across all six
# (script lives in scripts/ — see CROSS-VERIFICATION.md for the latest run)
```

## When you re-export

If the data team re-exports any patient with richer or corrected data:

1. Drop the new ZIP here under the same canonical filename (overwrite the previous).
2. Run the cross-verification script.
3. Update the mocks in `lib/velora/v0-replies.ts` for any data that changed materially.
4. Append the change-set summary to `CROSS-VERIFICATION.md` so future contributors can trace what changed and when.
