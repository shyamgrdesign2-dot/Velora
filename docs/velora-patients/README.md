# Velora canonical patients

Six real OMOP CDM v5.4 exports — one MD per patient documents the cross-consultation brief grounding and the gaps the card chooses NOT to surface (the no-data-loss audit trail).

> Source archives live in [`data/`](./data/) under canonical names. Drift between exports is tracked in [`CROSS-VERIFICATION.md`](./CROSS-VERIFICATION.md).

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

## The card's four movements (same for every patient)

| Movement | Doctor's question | Card section |
|---|---|---|
| ① | Who is this patient? | **Medical history** — Primary problem · Co-morbidities · Surgical history · Allergies · Family/Social, each a tone-tinted tag chip with ⓘ tooltip showing sources + reasoning |
| ② | Who has been involved, and what is each team thinking? | **Specialty consultations** — per-specialty card with rich header (date range · N visits · doctor names + ⓘ) and body (Findings → Medications → Plan; meds row hidden when no ongoing Rx) |
| ③ | What demands attention? | **Where they collide** — DDIs / coordination gaps / overdue surveillance, each guideline-anchored |
| ④ | How do I trust this? | Inline citations via ⓘ tooltips + amber **Open loops** block under each specialty body |

## Cross-cutting data-quality flags (relay to data eng)

These apply to every patient unless noted otherwise:

1. **Labs are absent from `measurement` for some patients.** P2 (Suresh) has 0 lab rows; P3-P5 have 18-222 measurements that include vitals only. Confirm `Pm-Patient-Docs.results` ingestion and re-export.
2. **Provider → specialty resolution is not in the export.** OMOP `provider_id` is present but specialty names live in source `tbl_department.dp_name`. Either ship the `provider` table or maintain a lookup. We resolved manually for these 5; it doesn't scale.
3. **IPD slice is patchy.** P2 has a GB-perforation surgery referenced in free text but no inpatient visit_occurrence row. P4 has TL + LSCS + Renal stone surgery as historical context only.
4. **`note` table not in any export.** Private notes, treatment notes, HPI narratives, OT notes, discharge advice — all routed to OMOP `note` per the mapping doc, none ingested here.
5. **Examination text uses custom delimiters** (`|~~|` and `//~//`). Render-time parser TBD.
6. **`drug_exposure.generic_name` is concatenated cruft** (BRAND|GENERIC|count|count). Render-time splitter TBD.

## Order in the live UI

The Velora chat surface currently renders Suresh Patel (P2) as the default cross-consultation brief. Other patients exist in the patient-selector but their full OMOP-grounded mocks are not yet wired into the chat — that's the next data-pipeline + mock-generation task.
