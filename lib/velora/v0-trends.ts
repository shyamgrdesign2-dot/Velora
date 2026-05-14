// ─────────────────────────────────────────────────────────────────────────
// Velora v0 — Recent trends registry (intent ③ "Recent trends")
//
// Replaces the retired "Active meds & safety" and "Why flagged today"
// intents with a single, narrower entry point: vital + lab trends. The
// canned chips shown after "Recent trends" are NOT static — they are
// driven per-patient from a registry that reasons over three inputs:
//
//   1. Patient condition profile (problem list, comorbidities).
//   2. Specialty context (oncology vs ortho vs nephro vs cardio…).
//   3. Hospital-signed clinical guideline bodies relevant to that
//      condition × specialty (ADA · WHO HEARTS · NICE NG56 · KDIGO · ESC).
//
// Doctors only see chips for trends Velora can *actually* answer for
// this patient. Anything outside that list triggers a polite guardrail
// reply that lists what IS available, so the doctor never lands on a
// dead end.
//
// Detailed reasoning per patient lives in
// /docs/velora-v0-recent-trends.md  (kept side-by-side with this file
// so a clinical reviewer can audit why a particular chip exists).
// ─────────────────────────────────────────────────────────────────────────

export type TrendId =
  | "bp"
  | "weight"
  | "hba1c"
  | "lipid"
  | "egfr"
  | "creatinine"
  | "hemoglobin"
  | "fasting_glucose"
  | "troponin"
  | "ldh"
  | "calcium"
  | "vitamin_d"
  | "tsh"
  | "platelet"
  | "wbc"
  | "lft"
  | "spo2"
  | "wound_culture"

/** Coarse category — drives the two split welcome-card entry points:
 *   "Recent vital trends" (vitals subset) vs
 *   "Recent lab trends" (labs subset).
 *
 * Vitals are bedside measurements (BP, weight, SpO₂). Labs are anything
 * drawn / cultured / processed downstream (HbA1c, eGFR, troponin,
 * wound culture, …). When in doubt the trend is classified as "lab" —
 * that's how the doctor will naturally search for it. */
export type TrendCategory = "vital" | "lab"

/** Public-facing label + the question Velora wires to each canned chip. */
export interface TrendDef {
  id: TrendId
  /** Which welcome card surfaces this trend (vital vs lab). */
  category: TrendCategory
  quickLabel: string
  question: string
  /** Why this trend is offered to this patient. Surfaced in the design
   *  doc audit, never in the live chat. */
  rationale: string
  /** Pre-canned reply text (legacy fallback). Used only when the
   *  structured `series` below is empty — the chat surface
   *  prefers the structured `VeloraV0TrendDetailCard` rendering. */
  replyText: string
  /** Source / citation footer for the trust strip. */
  footer: string
  /** Display unit (rendered next to the trend name on the card). */
  unit?: string
  /** Structured series points — drives the trend-detail card. When
   *  populated the trends handler emits the card instead of the
   *  legacy `replyText`. Newest reading first. */
  series?: Array<{
    date: string
    value: string
    flag?: "ok" | "warn" | "alert"
    flagLabel?: string
  }>
  /** One-line target / reference statement surfaced inside the
   *  card (e.g. "Target per WHO HEARTS 2023: < 140/90 mmHg"). */
  targetLine?: string
  /** Structured citation chip rendered in the card footer. */
  citation?: { body: string; year?: string; section?: string }
}

/** One patient's available trends, computed from their condition profile
 *  and the hospital's signed guideline panels. */
export interface PatientTrendProfile {
  patientId: string
  /** Pretty name surfaced inside guardrail replies. */
  patientName: string
  /** Short reason banner shown above the canned chips ("Trends we can
   *  pull for this patient — based on …"). */
  scopeReason: string
  trends: TrendDef[]
}

// ─────────────────────────────────────────────────────────────────────────
// Canonical trend definitions — shared across patients with light overrides
// per patient where the canned reply needs to be patient-specific. The
// `replyText` here is intentionally short ("here's the trend, summarised")
// because the actual numeric series can come from the OMOP layer once the
// chart card lands.
// ─────────────────────────────────────────────────────────────────────────

const trendBP = (note: string): TrendDef => ({
  id: "bp",
  category: "vital",
  quickLabel: "Blood pressure",
  question: "Show blood pressure trend",
  rationale:
    "WHO HEARTS 2023 target <140/90. BP is the most clinically actionable vital across hypertension, CKD, IHD, post-op and diabetes — surfaced whenever any of those conditions is on the problem list.",
  replyText: `Blood pressure trend (most recent → oldest):\n${note}\n\nTarget per WHO HEARTS 2023: < 140/90 mmHg (per current age/comorbidity profile).`,
  footer: "Source: Vital × visit_occurrence · WHO HEARTS 2023",
})

const trendWeight = (note: string): TrendDef => ({
  id: "weight",
  category: "vital",
  quickLabel: "Weight",
  question: "Show weight trend",
  rationale:
    "Weight tracking is universally relevant — drug dosing, oncology cachexia surveillance, post-op recovery, HF status. Always offered when at least two readings are on file.",
  replyText: `Weight trend:\n${note}`,
  footer: "Source: Vital × visit_occurrence",
})

const trendHbA1c = (note: string): TrendDef => ({
  id: "hba1c",
  category: "lab",
  quickLabel: "HbA1c",
  question: "Show HbA1c trend",
  rationale:
    "Offered only when T2DM / prediabetes is on the problem list. Target per ADA 2024 is <7.0% for most adults, <8.0% for older patients with comorbidity.",
  replyText: `HbA1c trend:\n${note}\n\nTarget per ADA 2024: < 7.0 % (relaxed to < 8.0 % for older adults with significant comorbidity).`,
  footer: "Source: Measurement × LOINC 4548-4 · ADA 2024",
})

const trendLipid = (note: string): TrendDef => ({
  id: "lipid",
  category: "lab",
  quickLabel: "Lipid panel",
  question: "Show lipid panel trend",
  rationale:
    "Offered when dyslipidaemia, IHD, T2DM or CVD risk is on the problem list. NICE NG181 sets LDL targets per risk band; the trend shows whether statin therapy is meeting target.",
  replyText: `Lipid panel trend (Total / LDL / HDL / Trig):\n${note}\n\nLDL target per NICE NG181: < 1.8 mmol/L for established CVD; < 2.6 mmol/L otherwise.`,
  footer: "Source: Measurement × lipid LOINC bundle · NICE NG181",
})

const trendEgfr = (note: string): TrendDef => ({
  id: "egfr",
  category: "lab",
  quickLabel: "eGFR",
  question: "Show eGFR trend",
  rationale:
    "Offered when CKD is on the problem list OR when the patient is on a nephrotoxic / renally-cleared drug (apixaban, metformin, NSAID). KDIGO 2024 staging drives the alarm threshold.",
  replyText: `eGFR trend (mL/min/1.73 m²):\n${note}\n\nStaging per KDIGO 2024: G1 ≥ 90 · G2 60-89 · G3a 45-59 · G3b 30-44 · G4 15-29 · G5 < 15.`,
  footer: "Source: Measurement × CKD-EPI eGFR · KDIGO 2024",
})

const trendHb = (note: string): TrendDef => ({
  id: "hemoglobin",
  category: "lab",
  quickLabel: "Hemoglobin",
  question: "Show hemoglobin trend",
  rationale:
    "Offered for oncology patients (treatment-related anemia surveillance), post-op patients (blood-loss recovery) and patients on anticoagulation (bleed risk). WHO defines anemia at < 12 g/dL (women) / < 13 g/dL (men).",
  replyText: `Hemoglobin trend (g/dL):\n${note}`,
  footer: "Source: Measurement × LOINC 718-7 · WHO anemia thresholds",
})

const trendFastingGlucose = (note: string): TrendDef => ({
  id: "fasting_glucose",
  category: "lab",
  quickLabel: "Fasting glucose",
  question: "Show fasting glucose trend",
  rationale:
    "Offered when T2DM / prediabetes is on the problem list AND HbA1c has been measured fewer than twice in the window — fasting glucose gives the doctor a finer-grained read between HbA1c draws.",
  replyText: `Fasting glucose trend (mmol/L):\n${note}\n\nADA 2024 fasting target: 4.4 – 7.2 mmol/L.`,
  footer: "Source: Measurement × LOINC 1558-6 · ADA 2024",
})

const trendCa = (note: string): TrendDef => ({
  id: "calcium",
  category: "lab",
  quickLabel: "Calcium",
  question: "Show serum calcium trend",
  rationale:
    "Offered when the patient is on Denosumab / bisphosphonates (oncology bone-protection regimens) OR has CKD with mineral-bone disease. Hypocalcaemia is a known Denosumab adverse event — surveillance is the standard of care.",
  replyText: `Serum calcium trend (mmol/L):\n${note}\n\nReference range: 2.10 – 2.55 mmol/L. Denosumab patients require pre-dose calcium ≥ 2.10.`,
  footer: "Source: Measurement × LOINC 17861-6",
})

const trendVitD = (note: string): TrendDef => ({
  id: "vitamin_d",
  category: "lab",
  quickLabel: "Vitamin D",
  question: "Show vitamin D trend",
  rationale:
    "Offered alongside calcium for the same Denosumab / bisphosphonate cohort, and for older patients with osteopenia / osteoporosis.",
  replyText: `25-OH Vitamin D trend (ng/mL):\n${note}\n\nDeficient < 20, insufficient 20-30, sufficient ≥ 30.`,
  footer: "Source: Measurement × LOINC 1989-3",
})

const trendWoundCulture = (note: string): TrendDef => ({
  id: "wound_culture",
  category: "lab",
  quickLabel: "Wound culture",
  question: "Show wound culture trend",
  rationale:
    "Offered for post-op plastic-surgery / orthopaedics patients in active follow-up. Tracks growth → no growth across serial swabs so the doctor sees infection clearing.",
  replyText: `Wound culture trend:\n${note}`,
  footer: "Source: Measurement × culture report",
})

const trendSpO2 = (note: string): TrendDef => ({
  id: "spo2",
  category: "vital",
  quickLabel: "SpO₂",
  question: "Show oxygen saturation trend",
  rationale:
    "Offered for patients with severe OSA, COPD, post-op respiratory risk, or recent cardiac admission. Below 92 % at rest warrants escalation per WHO.",
  replyText: `SpO₂ trend (%):\n${note}`,
  footer: "Source: Vital × pulse oximetry",
})

const trendTroponin = (note: string): TrendDef => ({
  id: "troponin",
  category: "lab",
  quickLabel: "Troponin",
  question: "Show troponin trend",
  rationale:
    "Offered for patients with recent IPD cardiac admission or ACS workup, while the index event is still inside the surveillance window.",
  replyText: `Troponin I trend (ng/L):\n${note}\n\nESC 2023 hs-cTnI 99th percentile cut-off varies by sex.`,
  footer: "Source: Measurement × LOINC 49563-0 · ESC 2023",
})

// ─────────────────────────────────────────────────────────────────────────
// Per-patient trend availability.
//
// Reasoning behind each patient's set is written in plain English on the
// `scopeReason` line and (in fuller form) in
//   docs/velora-v0-recent-trends.md
// ─────────────────────────────────────────────────────────────────────────

const LAKSHMI_TRENDS: PatientTrendProfile = {
  patientId: "lakshmi-iyer",
  patientName: "Lakshmi Iyer",
  scopeReason:
    "Right breast cancer on Letrozole + Denosumab + Ca/Vit D · IHD · HTN · CKD G3a · OSA — trends drawn from oncology, cardio, nephro and pulm guidelines.",
  trends: [
    {
      ...trendBP(
        "  12 May '26  138/82\n  29 Apr '26  142/86\n  14 Apr '26  148/90\n  02 Apr '26  152/94\n  18 Mar '26  158/98",
      ),
      unit: "mmHg",
      series: [
        { date: "12 May '26", value: "138/82", flag: "ok", flagLabel: "in target" },
        { date: "29 Apr '26", value: "142/86", flag: "warn", flagLabel: "borderline" },
        { date: "14 Apr '26", value: "148/90", flag: "warn", flagLabel: "above target" },
        { date: "02 Apr '26", value: "152/94", flag: "alert", flagLabel: "out of target" },
        { date: "18 Mar '26", value: "158/98", flag: "alert", flagLabel: "out of target" },
      ],
      targetLine: "Target per WHO HEARTS 2023: < 140/90 mmHg",
      citation: { body: "WHO HEARTS", year: "2023" },
    },
    {
      ...trendEgfr(
        "  12 May '26  48  (G3a)\n  29 Apr '26  46  (G3a)\n  02 Apr '26  44  (G3b)\n  15 Feb '26  47  (G3a)",
      ),
      unit: "mL/min/1.73 m²",
      series: [
        { date: "12 May '26", value: "48", flag: "warn", flagLabel: "G3a" },
        { date: "29 Apr '26", value: "46", flag: "warn", flagLabel: "G3a" },
        { date: "02 Apr '26", value: "44", flag: "alert", flagLabel: "G3b" },
        { date: "15 Feb '26", value: "47", flag: "warn", flagLabel: "G3a" },
      ],
      targetLine: "KDIGO 2024 staging — G1 ≥ 90 · G2 60-89 · G3a 45-59 · G3b 30-44 · G4 15-29 · G5 < 15",
      citation: { body: "KDIGO", year: "2024" },
    },
    {
      ...trendCa(
        "  12 May '26  2.32\n  29 Apr '26  2.30\n  29 Mar '26  2.18\n  28 Feb '26  2.41",
      ),
      unit: "mmol/L",
      series: [
        { date: "12 May '26", value: "2.32", flag: "ok", flagLabel: "in range" },
        { date: "29 Apr '26", value: "2.30", flag: "ok", flagLabel: "in range" },
        { date: "29 Mar '26", value: "2.18", flag: "warn", flagLabel: "borderline low" },
        { date: "28 Feb '26", value: "2.41", flag: "ok", flagLabel: "in range" },
      ],
      targetLine: "Reference 2.10 – 2.55 mmol/L · Denosumab patients require pre-dose Ca ≥ 2.10",
      citation: { body: "Denosumab label / NCCN", year: "2024" },
    },
    {
      ...trendVitD(
        "  12 May '26  28  (insufficient)\n  29 Apr '26  24  (insufficient)\n  15 Feb '26  18  (deficient)",
      ),
      unit: "ng/mL",
      series: [
        { date: "12 May '26", value: "28", flag: "warn", flagLabel: "insufficient" },
        { date: "29 Apr '26", value: "24", flag: "warn", flagLabel: "insufficient" },
        { date: "15 Feb '26", value: "18", flag: "alert", flagLabel: "deficient" },
      ],
      targetLine: "Deficient < 20 · Insufficient 20-30 · Sufficient ≥ 30",
      citation: { body: "Endocrine Society", year: "2024" },
    },
    {
      ...trendHb(
        "  12 May '26  11.4  (mildly low)\n  29 Apr '26  11.1\n  02 Apr '26  10.8\n  15 Feb '26  11.6",
      ),
      unit: "g/dL",
      series: [
        { date: "12 May '26", value: "11.4", flag: "warn", flagLabel: "mildly low" },
        { date: "29 Apr '26", value: "11.1", flag: "warn", flagLabel: "mildly low" },
        { date: "02 Apr '26", value: "10.8", flag: "alert", flagLabel: "moderate anaemia" },
        { date: "15 Feb '26", value: "11.6", flag: "warn", flagLabel: "mildly low" },
      ],
      targetLine: "WHO anaemia threshold — women < 12 g/dL",
      citation: { body: "WHO", year: "anaemia thresholds" },
    },
    {
      ...trendLipid(
        "  12 May '26  TC 4.6 · LDL 2.7 · HDL 1.1 · TG 1.6\n  18 Mar '26  TC 5.1 · LDL 3.0 · HDL 1.0 · TG 1.8",
      ),
      unit: "mmol/L",
      series: [
        { date: "12 May '26", value: "TC 4.6 · LDL 2.7 · HDL 1.1 · TG 1.6", flag: "alert", flagLabel: "LDL above target" },
        { date: "18 Mar '26", value: "TC 5.1 · LDL 3.0 · HDL 1.0 · TG 1.8", flag: "alert", flagLabel: "LDL above target" },
      ],
      targetLine: "LDL target per NICE NG181 — < 1.8 mmol/L for established CVD (Lakshmi has IHD)",
      citation: { body: "NICE", year: "NG181" },
    },
    {
      ...trendSpO2(
        "  12 May '26  94 %\n  29 Apr '26  93 %\n  02 Apr '26  92 % (overnight)\n  15 Feb '26  95 %",
      ),
      unit: "%",
      series: [
        { date: "12 May '26", value: "94 %", flag: "ok", flagLabel: "in range" },
        { date: "29 Apr '26", value: "93 %", flag: "ok", flagLabel: "in range" },
        { date: "02 Apr '26", value: "92 %", flag: "warn", flagLabel: "borderline (overnight)" },
        { date: "15 Feb '26", value: "95 %", flag: "ok", flagLabel: "in range" },
      ],
      targetLine: "≥ 92 % at rest · CPAP titration pending per PSG AHI 31.2",
      citation: { body: "AASM", year: "2023" },
    },
    {
      ...trendWeight(
        "  12 May '26  56.4 kg\n  29 Apr '26  56.8 kg\n  18 Mar '26  57.6 kg",
      ),
      unit: "kg",
      series: [
        { date: "12 May '26", value: "56.4 kg", flag: "ok", flagLabel: "stable" },
        { date: "29 Apr '26", value: "56.8 kg", flag: "ok", flagLabel: "stable" },
        { date: "18 Mar '26", value: "57.6 kg", flag: "ok", flagLabel: "stable" },
      ],
      targetLine: "Cachexia surveillance on hormonal therapy — > 5 % loss in 6 mo prompts review.",
      citation: { body: "NCCN Supportive Care", year: "2024" },
    },
  ],
}

const SURESH_TRENDS: PatientTrendProfile = {
  patientId: "suresh-patel",
  patientName: "Mr Suresh Patel",
  scopeReason:
    "T2DM · HTN · IHD with significant CVD risk — trends drawn from diabetology, cardiology and primary-care HTN bundles.",
  trends: [
    {
      ...trendHbA1c(
        "  06 Apr '26  8.4 %\n  10 Jan '26  8.9 %\n  18 Oct '25  9.1 %\n  22 Jul '25  9.4 %",
      ),
      unit: "%",
      series: [
        { date: "06 Apr '26", value: "8.4 %", flag: "warn", flagLabel: "above target" },
        { date: "10 Jan '26", value: "8.9 %", flag: "alert", flagLabel: "out of target" },
        { date: "18 Oct '25", value: "9.1 %", flag: "alert", flagLabel: "out of target" },
        { date: "22 Jul '25", value: "9.4 %", flag: "alert", flagLabel: "out of target" },
      ],
      targetLine: "ADA 2024 target < 7.0 % · trending down but still above target.",
      citation: { body: "ADA", year: "2024" },
    },
    {
      ...trendFastingGlucose(
        "  06 Apr '26  9.6\n  10 Jan '26  10.4\n  18 Oct '25  11.1\n  22 Jul '25  11.8",
      ),
      unit: "mmol/L",
      series: [
        { date: "06 Apr '26", value: "9.6", flag: "warn", flagLabel: "above target" },
        { date: "10 Jan '26", value: "10.4", flag: "alert", flagLabel: "out of target" },
        { date: "18 Oct '25", value: "11.1", flag: "alert", flagLabel: "out of target" },
        { date: "22 Jul '25", value: "11.8", flag: "alert", flagLabel: "out of target" },
      ],
      targetLine: "ADA 2024 fasting target 4.4 – 7.2 mmol/L.",
      citation: { body: "ADA", year: "2024" },
    },
    {
      ...trendBP(
        "  06 Apr '26  148/92\n  10 Jan '26  144/90\n  18 Oct '25  150/94\n  22 Jul '25  152/96",
      ),
      unit: "mmHg",
      series: [
        { date: "06 Apr '26", value: "148/92", flag: "warn", flagLabel: "above target" },
        { date: "10 Jan '26", value: "144/90", flag: "warn", flagLabel: "above target" },
        { date: "18 Oct '25", value: "150/94", flag: "alert", flagLabel: "out of target" },
        { date: "22 Jul '25", value: "152/96", flag: "alert", flagLabel: "out of target" },
      ],
      targetLine: "WHO HEARTS 2023 < 140/90 mmHg · slow downward trend.",
      citation: { body: "WHO HEARTS", year: "2023" },
    },
    {
      ...trendLipid(
        "  06 Apr '26  TC 5.4 · LDL 3.3 · HDL 1.0 · TG 2.1\n  18 Oct '25  TC 5.8 · LDL 3.7 · HDL 0.9 · TG 2.3",
      ),
      unit: "mmol/L",
      series: [
        { date: "06 Apr '26", value: "TC 5.4 · LDL 3.3 · HDL 1.0 · TG 2.1", flag: "alert", flagLabel: "LDL above target" },
        { date: "18 Oct '25", value: "TC 5.8 · LDL 3.7 · HDL 0.9 · TG 2.3", flag: "alert", flagLabel: "LDL above target" },
      ],
      targetLine: "NICE NG181 LDL < 1.8 mmol/L for established CVD (IHD on record).",
      citation: { body: "NICE", year: "NG181" },
    },
    {
      ...trendEgfr(
        "  06 Apr '26  72\n  10 Jan '26  74\n  18 Oct '25  76",
      ),
      unit: "mL/min/1.73 m²",
      series: [
        { date: "06 Apr '26", value: "72", flag: "ok", flagLabel: "G2" },
        { date: "10 Jan '26", value: "74", flag: "ok", flagLabel: "G2" },
        { date: "18 Oct '25", value: "76", flag: "ok", flagLabel: "G2" },
      ],
      targetLine: "KDIGO 2024 G2 (60-89) — mild decrease, on metformin watch list.",
      citation: { body: "KDIGO", year: "2024" },
    },
    {
      ...trendWeight(
        "  06 Apr '26  84.2 kg\n  10 Jan '26  85.0 kg\n  18 Oct '25  86.4 kg",
      ),
      unit: "kg",
      series: [
        { date: "06 Apr '26", value: "84.2 kg", flag: "ok", flagLabel: "stable" },
        { date: "10 Jan '26", value: "85.0 kg", flag: "ok", flagLabel: "stable" },
        { date: "18 Oct '25", value: "86.4 kg", flag: "ok", flagLabel: "stable" },
      ],
      targetLine: "Slight downward trend on metformin + lifestyle counselling.",
      citation: { body: "AACE", year: "2023" },
    },
  ],
}

const ASHA_TRENDS: PatientTrendProfile = {
  patientId: "asha-krishnan",
  patientName: "Asha Krishnan",
  scopeReason:
    "Post-op tendoachilles repair under plastic surgery + orthopaedics · HTN — trends scoped to post-op surveillance + cardio risk.",
  trends: [
    {
      ...trendBP(
        "  30 Apr '26  132/82\n  14 Apr '26  134/84\n  09 May '25  138/86",
      ),
      unit: "mmHg",
      series: [
        { date: "30 Apr '26", value: "132/82", flag: "ok", flagLabel: "in target" },
        { date: "14 Apr '26", value: "134/84", flag: "ok", flagLabel: "in target" },
        { date: "09 May '25", value: "138/86", flag: "ok", flagLabel: "in target" },
      ],
      targetLine: "WHO HEARTS 2023 < 140/90 mmHg — stable, in target across 12 months.",
      citation: { body: "WHO HEARTS", year: "2023" },
    },
    {
      ...trendWoundCulture(
        "  19 May '25  No growth\n  14 May '25  Scant Staph epidermidis (skin commensal)\n  09 May '25  No growth",
      ),
      series: [
        { date: "19 May '25", value: "No growth", flag: "ok", flagLabel: "sterile" },
        { date: "14 May '25", value: "Scant Staph epidermidis", flag: "warn", flagLabel: "skin commensal" },
        { date: "09 May '25", value: "No growth", flag: "ok", flagLabel: "sterile" },
      ],
      targetLine: "Post-op surveillance — wound healing without significant pathogen growth.",
      citation: { body: "Hospital surgical-site protocol", year: "current" },
    },
    {
      ...trendHb(
        "  19 May '25  12.4\n  14 May '25  12.1\n  09 May '25  11.8 (post-op nadir)",
      ),
      unit: "g/dL",
      series: [
        { date: "19 May '25", value: "12.4", flag: "ok", flagLabel: "in range" },
        { date: "14 May '25", value: "12.1", flag: "ok", flagLabel: "in range" },
        { date: "09 May '25", value: "11.8", flag: "warn", flagLabel: "post-op nadir" },
      ],
      targetLine: "WHO anaemia threshold women < 12 g/dL — post-op recovery confirmed.",
      citation: { body: "WHO", year: "anaemia thresholds" },
    },
    {
      ...trendWeight("  30 Apr '26  58.6 kg\n  09 May '25  56.2 kg"),
      unit: "kg",
      series: [
        { date: "30 Apr '26", value: "58.6 kg", flag: "ok", flagLabel: "stable" },
        { date: "09 May '25", value: "56.2 kg", flag: "ok", flagLabel: "stable" },
      ],
      targetLine: "Routine monitoring — gain over 12 months consistent with recovery.",
      citation: { body: "Internal Medicine standard", year: "current" },
    },
  ],
}

const MEERA_TRENDS: PatientTrendProfile = {
  patientId: "meera-joshi",
  patientName: "Meera Joshi",
  scopeReason:
    "Multi-specialty workup over 13 months — trends scoped to the dominant cardio + metabolic + renal signals her panel touched.",
  trends: [
    {
      ...trendBP("  Most recent: 144/88\n  3 months ago: 148/92\n  6 months ago: 152/94"),
      unit: "mmHg",
      series: [
        { date: "Most recent", value: "144/88", flag: "warn", flagLabel: "above target" },
        { date: "3 months ago", value: "148/92", flag: "warn", flagLabel: "above target" },
        { date: "6 months ago", value: "152/94", flag: "alert", flagLabel: "out of target" },
      ],
      targetLine: "WHO HEARTS 2023 < 140/90 mmHg — improving but not yet in target.",
      citation: { body: "WHO HEARTS", year: "2023" },
    },
    {
      ...trendHbA1c("  Most recent: 7.6 %\n  6 months ago: 8.1 %\n  12 months ago: 8.4 %"),
      unit: "%",
      series: [
        { date: "Most recent", value: "7.6 %", flag: "warn", flagLabel: "above target" },
        { date: "6 months ago", value: "8.1 %", flag: "alert", flagLabel: "out of target" },
        { date: "12 months ago", value: "8.4 %", flag: "alert", flagLabel: "out of target" },
      ],
      targetLine: "ADA 2024 < 7.0 % (relaxed to < 8.0 % in older adults).",
      citation: { body: "ADA", year: "2024" },
    },
    {
      ...trendLipid("  Most recent: TC 5.2 · LDL 3.1 · HDL 1.1 · TG 1.9"),
      unit: "mmol/L",
      series: [
        { date: "Most recent", value: "TC 5.2 · LDL 3.1 · HDL 1.1 · TG 1.9", flag: "alert", flagLabel: "LDL above target" },
      ],
      targetLine: "NICE NG181 LDL < 1.4 mmol/L for secondary CV prevention (CAD + prior CVA on record).",
      citation: { body: "NICE", year: "NG181" },
    },
    {
      ...trendEgfr("  Most recent: 64\n  6 months ago: 68"),
      unit: "mL/min/1.73 m²",
      series: [
        { date: "Most recent", value: "64", flag: "warn", flagLabel: "G2 (low)" },
        { date: "6 months ago", value: "68", flag: "ok", flagLabel: "G2" },
      ],
      targetLine: "KDIGO 2024 G2 — watch for further decline; SGLT2 dose adjustments downstream.",
      citation: { body: "KDIGO", year: "2024" },
    },
    {
      ...trendHb("  Most recent: 12.6\n  6 months ago: 12.2"),
      unit: "g/dL",
      series: [
        { date: "Most recent", value: "12.6", flag: "ok", flagLabel: "in range" },
        { date: "6 months ago", value: "12.2", flag: "ok", flagLabel: "in range" },
      ],
      targetLine: "WHO anaemia threshold women < 12 g/dL — within range despite DAPT.",
      citation: { body: "WHO", year: "anaemia thresholds" },
    },
    {
      ...trendWeight("  Most recent: 68 kg\n  6 months ago: 70 kg"),
      unit: "kg",
      series: [
        { date: "Most recent", value: "68 kg", flag: "ok", flagLabel: "stable" },
        { date: "6 months ago", value: "70 kg", flag: "ok", flagLabel: "stable" },
      ],
      targetLine: "Slight downward trend — review BMI category at next visit.",
      citation: { body: "AACE", year: "2023" },
    },
  ],
}

const ANITA_TRENDS: PatientTrendProfile = {
  patientId: "anita-desai",
  patientName: "Anita Desai",
  scopeReason:
    "Long-window multi-specialty coverage — trends scoped to her metabolic + cardio + renal signals.",
  trends: [
    {
      ...trendBP("  Most recent: 138/84\n  6 months ago: 142/88"),
      unit: "mmHg",
      series: [
        { date: "Most recent", value: "138/84", flag: "ok", flagLabel: "in target" },
        { date: "6 months ago", value: "142/88", flag: "warn", flagLabel: "above target" },
      ],
      targetLine: "WHO HEARTS 2023 < 140/90 mmHg.",
      citation: { body: "WHO HEARTS", year: "2023" },
    },
    {
      ...trendHbA1c("  Most recent: 7.2 %\n  6 months ago: 7.6 %\n  12 months ago: 8.0 %"),
      unit: "%",
      series: [
        { date: "Most recent", value: "7.2 %", flag: "warn", flagLabel: "above target" },
        { date: "6 months ago", value: "7.6 %", flag: "warn", flagLabel: "above target" },
        { date: "12 months ago", value: "8.0 %", flag: "alert", flagLabel: "out of target" },
      ],
      targetLine: "ADA 2024 < 7.0 % — slow trend down on metformin + SGLT2.",
      citation: { body: "ADA", year: "2024" },
    },
    {
      ...trendLipid("  Most recent: TC 4.9 · LDL 2.9 · HDL 1.2 · TG 1.7"),
      unit: "mmol/L",
      series: [
        { date: "Most recent", value: "TC 4.9 · LDL 2.9 · HDL 1.2 · TG 1.7", flag: "warn", flagLabel: "LDL borderline" },
      ],
      targetLine: "NICE NG181 LDL < 2.6 for primary prevention; TG narrative reading of 2898 mg/dL on file outside measurement table — fibrate-gap flagged.",
      citation: { body: "NICE", year: "NG181" },
    },
    {
      ...trendEgfr("  Most recent: 58 (G3a)\n  6 months ago: 62"),
      unit: "mL/min/1.73 m²",
      series: [
        { date: "Most recent", value: "58", flag: "warn", flagLabel: "G3a" },
        { date: "6 months ago", value: "62", flag: "ok", flagLabel: "G2" },
      ],
      targetLine: "KDIGO 2024 — just crossed into G3a (45-59). Drug-dose review indicated.",
      citation: { body: "KDIGO", year: "2024" },
    },
    {
      ...trendWeight("  Most recent: 64 kg\n  6 months ago: 66 kg"),
      unit: "kg",
      series: [
        { date: "Most recent", value: "64 kg", flag: "ok", flagLabel: "stable" },
        { date: "6 months ago", value: "66 kg", flag: "ok", flagLabel: "stable" },
      ],
      targetLine: "Mild downward trend on metabolic-syndrome treatment plan.",
      citation: { body: "AACE", year: "2023" },
    },
  ],
}

const ARJUN_TRENDS: PatientTrendProfile = {
  patientId: "arjun-verma",
  patientName: "Arjun Verma",
  scopeReason:
    "Wilson's disease + acute Hepatitis A · 3-day IPD admission + 5 OPD follow-ups — trends scoped to hepatic recovery surveillance + thyroid stability.",
  trends: [
    {
      ...trendBP("  Most recent: 126/78\n  Admission day: 158/96"),
      unit: "mmHg",
      series: [
        { date: "Most recent", value: "126/78", flag: "ok", flagLabel: "in target" },
        { date: "Admission day", value: "158/96", flag: "alert", flagLabel: "acute-illness peak" },
      ],
      targetLine: "Adolescent normal BP — admission spike resolved with rehydration + treatment of acute hepatitis.",
      citation: { body: "AAP", year: "2017" },
    },
    {
      ...trendTroponin("  Discharge day 4: 24\n  Admission day 1 peak: 1830\n  Admission day 1 baseline: 38"),
      unit: "ng/L",
      series: [
        { date: "Discharge d4", value: "24", flag: "ok", flagLabel: "normalised" },
        { date: "Admission d1 peak", value: "1830", flag: "alert", flagLabel: "elevated (acute illness)" },
        { date: "Admission d1 baseline", value: "38", flag: "ok", flagLabel: "near-normal" },
      ],
      targetLine: "Workup confirmed acute-illness troponin leak from hepatic decompensation, not ACS.",
      citation: { body: "ESC", year: "2023" },
    },
    {
      ...trendLipid("  Most recent: TC 4.4 · LDL 2.4 · HDL 1.1 · TG 1.5"),
      unit: "mmol/L",
      series: [
        { date: "Most recent", value: "TC 4.4 · LDL 2.4 · HDL 1.1 · TG 1.5", flag: "ok", flagLabel: "in range" },
      ],
      targetLine: "Paediatric reference — within range; baseline established for chronic Wilson's follow-up.",
      citation: { body: "AAP", year: "2017" },
    },
    {
      ...trendHb("  Most recent: 13.4\n  Admission day: 14.1"),
      unit: "g/dL",
      series: [
        { date: "Most recent", value: "13.4", flag: "ok", flagLabel: "in range" },
        { date: "Admission day", value: "14.1", flag: "ok", flagLabel: "in range" },
      ],
      targetLine: "Paediatric WHO anaemia threshold < 11.5 g/dL — well above.",
      citation: { body: "WHO", year: "anaemia thresholds" },
    },
    {
      ...trendWeight("  Most recent: 72 kg\n  Admission day: 71 kg"),
      unit: "kg",
      series: [
        { date: "Most recent", value: "72 kg", flag: "ok", flagLabel: "stable" },
        { date: "Admission day", value: "71 kg", flag: "ok", flagLabel: "stable" },
      ],
      targetLine: "Growth-curve monitoring continues at IAP standard cadence.",
      citation: { body: "IAP", year: "2015" },
    },
  ],
}

const REGISTRY: Record<string, PatientTrendProfile> = {
  "lakshmi-iyer": LAKSHMI_TRENDS,
  "suresh-patel": SURESH_TRENDS,
  "asha-krishnan": ASHA_TRENDS,
  "meera-joshi": MEERA_TRENDS,
  "anita-desai": ANITA_TRENDS,
  "arjun-verma": ARJUN_TRENDS,
}

/** Resolve a patient's trend profile from a fuzzy keyword that may appear
 *  in the doctor's free-text question ("Show recent trends for Asha" /
 *  "trends · Lakshmi" / a bare name). Falls back to Lakshmi (the
 *  catalogue's default patient) when nothing matches — same convention
 *  the cross-consultation brief uses. */
export function resolvePatientTrends(message: string): PatientTrendProfile {
  const m = message.toLowerCase()
  if (m.includes("asha") || m.includes("krishnan")) return ASHA_TRENDS
  if (m.includes("suresh") || m.includes("patel")) return SURESH_TRENDS
  if (m.includes("meera") || m.includes("joshi")) return MEERA_TRENDS
  if (m.includes("anita") || m.includes("desai")) return ANITA_TRENDS
  if (m.includes("arjun") || m.includes("verma")) return ARJUN_TRENDS
  return LAKSHMI_TRENDS
}

/** Find a trend by its canned question across every patient. Used when
 *  the doctor taps a canned chip — we look up the specific reply. */
export function findTrendByQuestion(
  patient: PatientTrendProfile,
  question: string,
): TrendDef | undefined {
  const q = question.trim().toLowerCase()
  return patient.trends.find(
    (t) => t.question.toLowerCase() === q || q.includes(t.quickLabel.toLowerCase()),
  )
}

/** Filter a patient's trend list to just one category. Used by the
 *  split "Recent vital trends" / "Recent lab trends" welcome cards so
 *  the menu reply shows only the chips relevant to the doctor's
 *  click. */
export function filterTrendsByCategory(
  profile: PatientTrendProfile,
  category: TrendCategory,
): TrendDef[] {
  return profile.trends.filter((t) => t.category === category)
}

/** Detect which trend category the doctor is asking about from the raw
 *  free-text question. Returns null when the question is ambiguous /
 *  combined — caller falls back to the full list. */
export function detectTrendCategory(message: string): TrendCategory | null {
  const m = message.toLowerCase()
  if (m.includes("vital trend") || m.includes("recent vital")) return "vital"
  if (m.includes("lab trend") || m.includes("lab result trend") || m.includes("recent lab")) return "lab"
  return null
}

/** All registered patients — useful for tests + the design doc audit. */
export const ALL_PATIENT_TRENDS: PatientTrendProfile[] = [
  LAKSHMI_TRENDS,
  SURESH_TRENDS,
  ASHA_TRENDS,
  MEERA_TRENDS,
  ANITA_TRENDS,
  ARJUN_TRENDS,
]
