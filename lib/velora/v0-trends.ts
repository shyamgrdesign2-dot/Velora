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

/** Public-facing label + the question Velora wires to each canned chip. */
export interface TrendDef {
  id: TrendId
  quickLabel: string
  question: string
  /** Why this trend is offered to this patient. Surfaced in the design
   *  doc audit, never in the live chat. */
  rationale: string
  /** Pre-canned reply text. In V0 we render this as text-only; future
   *  versions plug in a chart card here. */
  replyText: string
  /** Source / citation footer for the trust strip. */
  footer: string
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
  quickLabel: "Blood pressure",
  question: "Show blood pressure trend",
  rationale:
    "WHO HEARTS 2023 target <140/90. BP is the most clinically actionable vital across hypertension, CKD, IHD, post-op and diabetes — surfaced whenever any of those conditions is on the problem list.",
  replyText: `Blood pressure trend (most recent → oldest):\n${note}\n\nTarget per WHO HEARTS 2023: < 140/90 mmHg (per current age/comorbidity profile).`,
  footer: "Source: Vital × visit_occurrence · WHO HEARTS 2023",
})

const trendWeight = (note: string): TrendDef => ({
  id: "weight",
  quickLabel: "Weight",
  question: "Show weight trend",
  rationale:
    "Weight tracking is universally relevant — drug dosing, oncology cachexia surveillance, post-op recovery, HF status. Always offered when at least two readings are on file.",
  replyText: `Weight trend:\n${note}`,
  footer: "Source: Vital × visit_occurrence",
})

const trendHbA1c = (note: string): TrendDef => ({
  id: "hba1c",
  quickLabel: "HbA1c",
  question: "Show HbA1c trend",
  rationale:
    "Offered only when T2DM / prediabetes is on the problem list. Target per ADA 2024 is <7.0% for most adults, <8.0% for older patients with comorbidity.",
  replyText: `HbA1c trend:\n${note}\n\nTarget per ADA 2024: < 7.0 % (relaxed to < 8.0 % for older adults with significant comorbidity).`,
  footer: "Source: Measurement × LOINC 4548-4 · ADA 2024",
})

const trendLipid = (note: string): TrendDef => ({
  id: "lipid",
  quickLabel: "Lipid panel",
  question: "Show lipid panel trend",
  rationale:
    "Offered when dyslipidaemia, IHD, T2DM or CVD risk is on the problem list. NICE NG181 sets LDL targets per risk band; the trend shows whether statin therapy is meeting target.",
  replyText: `Lipid panel trend (Total / LDL / HDL / Trig):\n${note}\n\nLDL target per NICE NG181: < 1.8 mmol/L for established CVD; < 2.6 mmol/L otherwise.`,
  footer: "Source: Measurement × lipid LOINC bundle · NICE NG181",
})

const trendEgfr = (note: string): TrendDef => ({
  id: "egfr",
  quickLabel: "eGFR",
  question: "Show eGFR trend",
  rationale:
    "Offered when CKD is on the problem list OR when the patient is on a nephrotoxic / renally-cleared drug (apixaban, metformin, NSAID). KDIGO 2024 staging drives the alarm threshold.",
  replyText: `eGFR trend (mL/min/1.73 m²):\n${note}\n\nStaging per KDIGO 2024: G1 ≥ 90 · G2 60-89 · G3a 45-59 · G3b 30-44 · G4 15-29 · G5 < 15.`,
  footer: "Source: Measurement × CKD-EPI eGFR · KDIGO 2024",
})

const trendHb = (note: string): TrendDef => ({
  id: "hemoglobin",
  quickLabel: "Hemoglobin",
  question: "Show hemoglobin trend",
  rationale:
    "Offered for oncology patients (treatment-related anemia surveillance), post-op patients (blood-loss recovery) and patients on anticoagulation (bleed risk). WHO defines anemia at < 12 g/dL (women) / < 13 g/dL (men).",
  replyText: `Hemoglobin trend (g/dL):\n${note}`,
  footer: "Source: Measurement × LOINC 718-7 · WHO anemia thresholds",
})

const trendFastingGlucose = (note: string): TrendDef => ({
  id: "fasting_glucose",
  quickLabel: "Fasting glucose",
  question: "Show fasting glucose trend",
  rationale:
    "Offered when T2DM / prediabetes is on the problem list AND HbA1c has been measured fewer than twice in the window — fasting glucose gives the doctor a finer-grained read between HbA1c draws.",
  replyText: `Fasting glucose trend (mmol/L):\n${note}\n\nADA 2024 fasting target: 4.4 – 7.2 mmol/L.`,
  footer: "Source: Measurement × LOINC 1558-6 · ADA 2024",
})

const trendCa = (note: string): TrendDef => ({
  id: "calcium",
  quickLabel: "Calcium",
  question: "Show serum calcium trend",
  rationale:
    "Offered when the patient is on Denosumab / bisphosphonates (oncology bone-protection regimens) OR has CKD with mineral-bone disease. Hypocalcaemia is a known Denosumab adverse event — surveillance is the standard of care.",
  replyText: `Serum calcium trend (mmol/L):\n${note}\n\nReference range: 2.10 – 2.55 mmol/L. Denosumab patients require pre-dose calcium ≥ 2.10.`,
  footer: "Source: Measurement × LOINC 17861-6",
})

const trendVitD = (note: string): TrendDef => ({
  id: "vitamin_d",
  quickLabel: "Vitamin D",
  question: "Show vitamin D trend",
  rationale:
    "Offered alongside calcium for the same Denosumab / bisphosphonate cohort, and for older patients with osteopenia / osteoporosis.",
  replyText: `25-OH Vitamin D trend (ng/mL):\n${note}\n\nDeficient < 20, insufficient 20-30, sufficient ≥ 30.`,
  footer: "Source: Measurement × LOINC 1989-3",
})

const trendWoundCulture = (note: string): TrendDef => ({
  id: "wound_culture",
  quickLabel: "Wound culture",
  question: "Show wound culture trend",
  rationale:
    "Offered for post-op plastic-surgery / orthopaedics patients in active follow-up. Tracks growth → no growth across serial swabs so the doctor sees infection clearing.",
  replyText: `Wound culture trend:\n${note}`,
  footer: "Source: Measurement × culture report",
})

const trendSpO2 = (note: string): TrendDef => ({
  id: "spo2",
  quickLabel: "SpO₂",
  question: "Show oxygen saturation trend",
  rationale:
    "Offered for patients with severe OSA, COPD, post-op respiratory risk, or recent cardiac admission. Below 92 % at rest warrants escalation per WHO.",
  replyText: `SpO₂ trend (%):\n${note}`,
  footer: "Source: Vital × pulse oximetry",
})

const trendTroponin = (note: string): TrendDef => ({
  id: "troponin",
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
    trendBP(
      "  12 May '26  138/82\n  29 Apr '26  142/86\n  14 Apr '26  148/90\n  02 Apr '26  152/94\n  18 Mar '26  158/98",
    ),
    trendEgfr(
      "  12 May '26  48  (G3a)\n  29 Apr '26  46  (G3a)\n  02 Apr '26  44  (G3b)\n  15 Feb '26  47  (G3a)",
    ),
    trendCa(
      "  12 May '26  2.32\n  29 Apr '26  2.30\n  29 Mar '26  2.18\n  28 Feb '26  2.41",
    ),
    trendVitD("  12 May '26  28  (insufficient)\n  29 Apr '26  24  (insufficient)\n  15 Feb '26  18  (deficient)"),
    trendHb(
      "  12 May '26  11.4  (mildly low)\n  29 Apr '26  11.1\n  02 Apr '26  10.8\n  15 Feb '26  11.6",
    ),
    trendLipid(
      "  12 May '26  TC 4.6 · LDL 2.7 · HDL 1.1 · TG 1.6\n  18 Mar '26  TC 5.1 · LDL 3.0 · HDL 1.0 · TG 1.8",
    ),
    trendSpO2("  12 May '26  94 %\n  29 Apr '26  93 %\n  02 Apr '26  92 % (overnight)\n  15 Feb '26  95 %"),
    trendWeight("  12 May '26  56.4 kg\n  29 Apr '26  56.8 kg\n  18 Mar '26  57.6 kg"),
  ],
}

const SURESH_TRENDS: PatientTrendProfile = {
  patientId: "suresh-patel",
  patientName: "Mr Suresh Patel",
  scopeReason:
    "T2DM · HTN · IHD with significant CVD risk — trends drawn from diabetology, cardiology and primary-care HTN bundles.",
  trends: [
    trendHbA1c(
      "  06 Apr '26  8.4 %\n  10 Jan '26  8.9 %\n  18 Oct '25  9.1 %\n  22 Jul '25  9.4 %",
    ),
    trendFastingGlucose(
      "  06 Apr '26  9.6\n  10 Jan '26  10.4\n  18 Oct '25  11.1\n  22 Jul '25  11.8",
    ),
    trendBP(
      "  06 Apr '26  148/92\n  10 Jan '26  144/90\n  18 Oct '25  150/94\n  22 Jul '25  152/96",
    ),
    trendLipid(
      "  06 Apr '26  TC 5.4 · LDL 3.3 · HDL 1.0 · TG 2.1\n  18 Oct '25  TC 5.8 · LDL 3.7 · HDL 0.9 · TG 2.3",
    ),
    trendEgfr(
      "  06 Apr '26  72\n  10 Jan '26  74\n  18 Oct '25  76",
    ),
    trendWeight("  06 Apr '26  84.2 kg\n  10 Jan '26  85.0 kg\n  18 Oct '25  86.4 kg"),
  ],
}

const ASHA_TRENDS: PatientTrendProfile = {
  patientId: "asha-krishnan",
  patientName: "Asha Krishnan",
  scopeReason:
    "Post-op tendoachilles repair under plastic surgery + orthopaedics · HTN — trends scoped to post-op surveillance + cardio risk.",
  trends: [
    trendBP(
      "  30 Apr '26  132/82\n  14 Apr '26  134/84\n  09 May '25  138/86",
    ),
    trendWoundCulture(
      "  19 May '25  No growth\n  14 May '25  Scant Staph epidermidis (skin commensal)\n  09 May '25  No growth",
    ),
    trendHb(
      "  19 May '25  12.4\n  14 May '25  12.1\n  09 May '25  11.8 (post-op nadir)",
    ),
    trendWeight("  30 Apr '26  58.6 kg\n  09 May '25  56.2 kg"),
  ],
}

const MEERA_TRENDS: PatientTrendProfile = {
  patientId: "meera-joshi",
  patientName: "Meera Joshi",
  scopeReason:
    "Multi-specialty workup over 13 months — trends scoped to the dominant cardio + metabolic + renal signals her panel touched.",
  trends: [
    trendBP("  Most recent: 144/88\n  3 months ago: 148/92\n  6 months ago: 152/94"),
    trendHbA1c("  Most recent: 7.6 %\n  6 months ago: 8.1 %\n  12 months ago: 8.4 %"),
    trendLipid("  Most recent: TC 5.2 · LDL 3.1 · HDL 1.1 · TG 1.9"),
    trendEgfr("  Most recent: 64\n  6 months ago: 68"),
    trendHb("  Most recent: 12.6\n  6 months ago: 12.2"),
    trendWeight("  Most recent: 68 kg\n  6 months ago: 70 kg"),
  ],
}

const ANITA_TRENDS: PatientTrendProfile = {
  patientId: "anita-desai",
  patientName: "Anita Desai",
  scopeReason:
    "Long-window multi-specialty coverage — trends scoped to her metabolic + cardio + renal signals.",
  trends: [
    trendBP("  Most recent: 138/84\n  6 months ago: 142/88"),
    trendHbA1c("  Most recent: 7.2 %\n  6 months ago: 7.6 %\n  12 months ago: 8.0 %"),
    trendLipid("  Most recent: TC 4.9 · LDL 2.9 · HDL 1.2 · TG 1.7"),
    trendEgfr("  Most recent: 58 (G3a)\n  6 months ago: 62"),
    trendWeight("  Most recent: 64 kg\n  6 months ago: 66 kg"),
  ],
}

const ARJUN_TRENDS: PatientTrendProfile = {
  patientId: "arjun-verma",
  patientName: "Arjun Verma",
  scopeReason:
    "Recent IPD cardiac admission with OPD follow-ups — trends scoped to cardio surveillance + bleed/anemia risk on dual-antiplatelet.",
  trends: [
    trendBP("  Most recent: 126/78\n  Admission day: 158/96"),
    trendTroponin("  Discharge day 4: 24\n  Admission day 1 peak: 1830\n  Admission day 1 baseline: 38"),
    trendLipid("  Most recent: TC 4.4 · LDL 2.4 · HDL 1.1 · TG 1.5"),
    trendHb("  Most recent: 13.4\n  Admission day: 14.1"),
    trendWeight("  Most recent: 72 kg\n  Admission day: 71 kg"),
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

/** All registered patients — useful for tests + the design doc audit. */
export const ALL_PATIENT_TRENDS: PatientTrendProfile[] = [
  LAKSHMI_TRENDS,
  SURESH_TRENDS,
  ASHA_TRENDS,
  MEERA_TRENDS,
  ANITA_TRENDS,
  ARJUN_TRENDS,
]
