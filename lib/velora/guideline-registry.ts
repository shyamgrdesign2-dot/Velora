// ─────────────────────────────────────────────────────────────────────────
// Velora v0 — Hospital Guideline Settings registry
//
// What it powers
// ──────────────
// The Admin → Guideline Settings sidebar (see
// components/tp-rxpad/dr-agent/shell/GuidelineSettingsSidebar.tsx).
// A hospital administrator picks, per specialty, which published clinical
// guideline bodies the hospital has SIGNED for clinical use. The agent's
// Stack-2 (Clinical synthesis) panels are then filtered to only fire from
// signed guidelines for the active specialty.
//
// Architecture link
// ──────────────────
// Per the Stack 1 / Stack 2 doctrine
//   (docs/velora-patients/CROSS-CONSULTATION-BRIEF-ARCHETYPE.md §0):
//   • Stack 1 (the brief card) renders verbatim OMOP data; nothing here
//     touches it.
//   • Stack 2 (the synthesis card) carries AI-selected guideline panels.
//     The panel-selection step is BOUNDED to whatever this registry
//     marks as signed for the patient's specialty. AI is a librarian,
//     not an author — this registry IS the library.
//
// V0 scope
// ────────
// The registry below is the SUPERSET — every guideline body Velora can
// support out-of-the-box. The admin's role is to confirm which are
// in-policy at THIS hospital. Defaults below match what the live demo
// already references in the patient mocks; the admin can extend or
// trim per specialty.
// ─────────────────────────────────────────────────────────────────────────

/** Hospital specialty / department tokens. Mirrors the labels used in
 *  per-specialty cards across the cross-consultation brief, so the
 *  admin reads the same vocabulary the clinician sees. */
export type SpecialtyKey =
  | "oncology"
  | "cardiology"
  | "nephrology"
  | "endocrinology"
  | "neurology"
  | "pulmonology"
  | "orthopaedics"
  | "dermatology"
  | "ophthalmology"
  | "ent"
  | "dental"
  | "internal_medicine"
  | "geriatrics"
  | "pain_medicine"
  | "gastroenterology"
  | "obstetrics_gynaecology"
  | "paediatrics"
  | "psychiatry"

/** One published guideline available for hospital-wide signing. */
export interface GuidelineDef {
  id: string
  /** Publishing body — "ESC", "NICE", "NCCN" etc. */
  body: string
  /** Year / version tag — "2024", "v.2.2024", "NG56" etc. */
  year: string
  /** Title rendered as the card headline. */
  title: string
  /** Short subtext: what this guideline governs in plain English. */
  description: string
}

/**
 * Catalogue of published guidelines per specialty.
 *
 * Sources: the bodies cited across Velora's Stack-2 panels in the live
 * patient mocks + the canonical references each speciality lead would
 * expect their hospital to have signed. The list is NOT exhaustive; it
 * is the V0 starter set the admin can extend.
 */
export const GUIDELINE_CATALOGUE: Record<SpecialtyKey, GuidelineDef[]> = {
  oncology: [
    {
      id: "nccn-colon-2024",
      body: "NCCN",
      year: "v.2.2024",
      title: "Colon Cancer",
      description: "Staging, surgery, adjuvant therapy, and post-op surveillance cadence (CEA / imaging).",
    },
    {
      id: "nccn-breast-2024",
      body: "NCCN",
      year: "v.4.2024",
      title: "Breast Cancer",
      description: "Early-stage workup, hormonal-therapy protocols, bone-protective bundle, surveillance.",
    },
    {
      id: "asco-nccn-bone-2024",
      body: "ASCO / NCCN",
      year: "2024",
      title: "Bone-modifying agents in cancer",
      description: "Denosumab + bisphosphonate dosing, calcium/Vit-D coverage, jaw-osteonecrosis prevention.",
    },
    {
      id: "esmo-supportive-2024",
      body: "ESMO",
      year: "2024",
      title: "Supportive care",
      description: "Anti-emetics, neutropenic-fever thresholds, chemo-induced neuropathy management.",
    },
  ],
  cardiology: [
    {
      id: "esc-afib-2024",
      body: "ESC",
      year: "2024",
      title: "Atrial Fibrillation",
      description: "Rate / rhythm control, CHA₂DS₂-VASc, DOAC vs warfarin, ablation criteria.",
    },
    {
      id: "esc-hf-2023",
      body: "ESC",
      year: "2023",
      title: "Heart Failure",
      description: "HFrEF / HFmrEF / HFpEF management, GDMT initiation + titration cadence.",
    },
    {
      id: "acc-aha-htn-2023",
      body: "ACC / AHA",
      year: "2023",
      title: "Hypertension",
      description: "Stage 1/2 thresholds, drug-class sequencing, treatment-resistant HTN workup.",
    },
    {
      id: "who-hearts-2023",
      body: "WHO HEARTS",
      year: "2023",
      title: "Hypertension (low-resource)",
      description: "Target <140/90 mmHg, first-line drug ladder, CV-risk-based intervention.",
    },
    {
      id: "nice-ng181-lipid",
      body: "NICE",
      year: "NG181",
      title: "Lipid modification",
      description: "Statin intensity by CV risk, LDL targets for established CVD vs primary prevention.",
    },
  ],
  nephrology: [
    {
      id: "kdigo-ckd-2024",
      body: "KDIGO",
      year: "2024",
      title: "CKD evaluation & management",
      description: "G1–G5 staging, ACR risk grid, drug-dose adjustment, referral triggers.",
    },
    {
      id: "kdigo-aki-2012",
      body: "KDIGO",
      year: "2012 (refresh 2023)",
      title: "Acute kidney injury",
      description: "AKI staging, nephrotoxic-drug review, fluid + electrolyte management.",
    },
    {
      id: "kdigo-diabetes-ckd-2022",
      body: "KDIGO",
      year: "2022",
      title: "Diabetes in CKD",
      description: "SGLT2i + finerenone use, glycaemic targets adjusted for CKD stage.",
    },
  ],
  endocrinology: [
    {
      id: "ada-2024",
      body: "ADA",
      year: "2024",
      title: "Standards of Care · Diabetes",
      description: "HbA1c targets, first-line metformin + SGLT2i / GLP-1 escalation, complication screening.",
    },
    {
      id: "nice-ng28",
      body: "NICE",
      year: "NG28",
      title: "Type 2 diabetes in adults",
      description: "Stepwise drug ladder, eGFR-aware metformin dosing, HbA1c target individualisation.",
    },
    {
      id: "aace-obesity-2023",
      body: "AACE",
      year: "2023",
      title: "Obesity / metabolic syndrome",
      description: "Pharmacotherapy criteria, GLP-1 use outside diabetes, surgical referral thresholds.",
    },
    {
      id: "ata-hypothyroidism-2014",
      body: "ATA",
      year: "2014 (current)",
      title: "Hypothyroidism",
      description: "Levothyroxine dosing, TSH targets across age + comorbidity bands.",
    },
  ],
  neurology: [
    {
      id: "aha-asa-stroke-2023",
      body: "AHA / ASA",
      year: "2023",
      title: "Stroke prevention & management",
      description: "Acute thrombolysis criteria, secondary-prevention antiplatelet / DOAC.",
    },
    {
      id: "iha-headache-2024",
      body: "IHS",
      year: "ICHD-3",
      title: "Headache disorders",
      description: "Migraine vs tension-type criteria, preventive-therapy thresholds.",
    },
    {
      id: "ilae-epilepsy-2024",
      body: "ILAE",
      year: "2024",
      title: "Epilepsy",
      description: "Seizure-type classification, first-line ASMs, women-of-childbearing-age cautions.",
    },
  ],
  pulmonology: [
    {
      id: "gina-2024",
      body: "GINA",
      year: "2024",
      title: "Asthma",
      description: "Step-wise inhaled-therapy ladder, exacerbation rescue, biologic eligibility.",
    },
    {
      id: "gold-2024",
      body: "GOLD",
      year: "2024",
      title: "COPD",
      description: "ABE assessment, inhaler triple-therapy criteria, exacerbation antibiotics.",
    },
    {
      id: "aasm-osa-2023",
      body: "AASM",
      year: "2023",
      title: "Obstructive sleep apnoea",
      description: "AHI severity bands, CPAP titration, perioperative airway-risk grading.",
    },
    {
      id: "bts-cap-2023",
      body: "BTS",
      year: "2023",
      title: "Community-acquired pneumonia",
      description: "CURB-65, antibiotic-tier selection, IV → PO switch criteria.",
    },
  ],
  orthopaedics: [
    {
      id: "aaos-oa-knee-2021",
      body: "AAOS",
      year: "2021",
      title: "Knee osteoarthritis",
      description: "Non-op ladder, intra-articular therapy criteria, surgical-referral thresholds.",
    },
    {
      id: "nice-cg173-neuropathic-pain",
      body: "NICE",
      year: "CG173",
      title: "Neuropathic pain",
      description: "First-line gabapentinoid / TCA / SNRI, dose escalation + de-escalation.",
    },
  ],
  dermatology: [
    {
      id: "aad-atopic-derm-2024",
      body: "AAD",
      year: "2024",
      title: "Atopic dermatitis",
      description: "Severity grading, topical-steroid potency ladder, systemic therapy eligibility.",
    },
    {
      id: "aad-acne-2024",
      body: "AAD",
      year: "2024",
      title: "Acne vulgaris",
      description: "Mild/moderate/severe stratification, retinoid + isotretinoin protocols.",
    },
  ],
  ophthalmology: [
    {
      id: "aao-amd-2023",
      body: "AAO",
      year: "2023",
      title: "Age-related macular degeneration",
      description: "Dry vs wet staging, anti-VEGF eligibility + injection cadence.",
    },
    {
      id: "aao-glaucoma-2023",
      body: "AAO",
      year: "2023",
      title: "Primary open-angle glaucoma",
      description: "Target IOP by severity, medical-therapy sequencing, surgical thresholds.",
    },
  ],
  ent: [
    {
      id: "aao-hns-otitis-2022",
      body: "AAO-HNS",
      year: "2022",
      title: "Otitis media",
      description: "Acute vs chronic management, antibiotic indications, tympanostomy criteria.",
    },
  ],
  dental: [
    {
      id: "ada-perio-2023",
      body: "ADA",
      year: "2023",
      title: "Periodontal disease",
      description: "Staging + grading, scaling-and-root-planing protocol, antimicrobial adjuncts.",
    },
  ],
  internal_medicine: [
    {
      id: "nice-ng56-polypharmacy",
      body: "NICE",
      year: "NG56",
      title: "Polypharmacy review",
      description: "≥5 chronic meds at 90 days triggers a structured medication review.",
    },
    {
      id: "beers-2023",
      body: "Beers Criteria",
      year: "2023",
      title: "Potentially inappropriate medications in older adults",
      description: "Drugs to avoid / use with caution in adults ≥65; sedative + opioid stacks etc.",
    },
    {
      id: "uspstf-screening-2024",
      body: "USPSTF",
      year: "2024",
      title: "Adult preventive screening",
      description: "Cancer / CV / metabolic screening cadence by age + risk.",
    },
  ],
  geriatrics: [
    {
      id: "beers-2023-geri",
      body: "Beers Criteria",
      year: "2023",
      title: "Inappropriate prescribing in older adults",
      description: "Geriatric-specific cautions; STOPP/START companion list.",
    },
    {
      id: "stopp-start-2023",
      body: "STOPP/START",
      year: "v3 (2023)",
      title: "STOPP / START prescribing criteria",
      description: "Stop-when-inappropriate + start-when-indicated rule pairs for ≥65.",
    },
  ],
  pain_medicine: [
    {
      id: "ans-opioid-2022",
      body: "ANS",
      year: "2022",
      title: "Opioid prescribing for chronic pain",
      description: "Initiation thresholds, MED ceiling, taper schedules, monitoring.",
    },
    {
      id: "iasp-neuropathic-2021",
      body: "IASP",
      year: "2021",
      title: "Neuropathic pain pharmacotherapy",
      description: "First-line agents, combination therapy, refractory referral.",
    },
  ],
  gastroenterology: [
    {
      id: "acg-gerd-2022",
      body: "ACG",
      year: "2022",
      title: "GERD",
      description: "PPI step-up / step-down, alarm symptoms, surgical referral.",
    },
    {
      id: "aasld-hcv-2024",
      body: "AASLD",
      year: "2024",
      title: "Hepatitis C",
      description: "DAA regimen selection by genotype + cirrhosis status.",
    },
  ],
  obstetrics_gynaecology: [
    {
      id: "fogsi-anc-2023",
      body: "FOGSI",
      year: "2023",
      title: "Antenatal care",
      description: "Visit cadence by trimester, screening + supplementation schedule.",
    },
    {
      id: "rcog-pph-2024",
      body: "RCOG",
      year: "2024",
      title: "Postpartum haemorrhage",
      description: "Prevention bundle, escalation ladder, blood-product protocol.",
    },
  ],
  paediatrics: [
    {
      id: "iap-iip-2024",
      body: "IAP",
      year: "2024",
      title: "Immunisation schedule",
      description: "National + IAP-supplemental immunisation cadence 0-18y.",
    },
    {
      id: "iap-growth-2015",
      body: "IAP",
      year: "2015",
      title: "Growth monitoring",
      description: "Indian growth charts, anthropometric thresholds, undernutrition flags.",
    },
  ],
  psychiatry: [
    {
      id: "nice-ng222-depression",
      body: "NICE",
      year: "NG222",
      title: "Depression in adults",
      description: "Stepped-care model, SSRI / SNRI first-line, talking-therapy thresholds.",
    },
  ],
}

/** Pretty-name lookup for the UI. Keys mirror `SpecialtyKey`. */
export const SPECIALTY_LABELS: Record<SpecialtyKey, string> = {
  oncology: "Oncology",
  cardiology: "Cardiology",
  nephrology: "Nephrology",
  endocrinology: "Endocrinology",
  neurology: "Neurology",
  pulmonology: "Pulmonology",
  orthopaedics: "Orthopaedics",
  dermatology: "Dermatology",
  ophthalmology: "Ophthalmology",
  ent: "E.N.T.",
  dental: "Dental",
  internal_medicine: "Internal Medicine",
  geriatrics: "Geriatrics",
  pain_medicine: "Pain Medicine",
  gastroenterology: "Gastroenterology",
  obstetrics_gynaecology: "Obstetrics & Gynaecology",
  paediatrics: "Paediatrics",
  psychiatry: "Psychiatry",
}

/** Order in which the admin sees specialties — broadly aligned with the
 *  most-touched specialties in the V0 demo patient set, then alpha. */
export const SPECIALTY_ORDER: SpecialtyKey[] = [
  "internal_medicine",
  "cardiology",
  "endocrinology",
  "nephrology",
  "oncology",
  "pulmonology",
  "neurology",
  "orthopaedics",
  "pain_medicine",
  "gastroenterology",
  "geriatrics",
  "dermatology",
  "ophthalmology",
  "ent",
  "dental",
  "obstetrics_gynaecology",
  "paediatrics",
  "psychiatry",
]

// ─────────────────────────────────────────────────────────────────────────
// Persistence (V0: localStorage; future: server-side per hospital tenant)
// ─────────────────────────────────────────────────────────────────────────

/** Saved selection: per specialty, the set of guideline IDs the hospital
 *  has signed for clinical use. Empty selection = inherit the V0 default
 *  (every guideline in the catalogue for that specialty). */
export type GuidelineSelection = Partial<Record<SpecialtyKey, string[]>>

const STORAGE_KEY = "velora-v0-guideline-settings"

/** Read the saved selection. SSR-safe — returns {} on the server. */
export function loadGuidelineSelection(): GuidelineSelection {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as GuidelineSelection) : {}
  } catch {
    return {}
  }
}

/** Persist the selection. SSR-safe — no-op on the server. */
export function saveGuidelineSelection(selection: GuidelineSelection): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection))
  } catch {
    // Quota / private-browsing: silently fail. Future: surface a toast.
  }
}

/** Default selection — every guideline in the catalogue marked as
 *  signed. Lets a brand-new hospital start with the full library
 *  active; the admin can prune from there. */
export function defaultSelection(): GuidelineSelection {
  const out: GuidelineSelection = {}
  for (const key of SPECIALTY_ORDER) {
    out[key] = GUIDELINE_CATALOGUE[key].map((g) => g.id)
  }
  return out
}
