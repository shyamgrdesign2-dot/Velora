// ─────────────────────────────────────────────────────────────────────────
// Velora v0 — replyOverride for the standalone landing.
//
// Routes the four V0 intent prompts to spec-faithful mock replies that
// render through the new Stack 1 / Stack 2 card components:
//   ① MDT brief        → velora_v0_mdt_brief
//   ② Open loops       → velora_v0_open_loops
//   ③ Active meds      → velora_v0_active_meds
//   ④ Why flagged today → velora_v0_why_flagged
//
// Each reply also carries a `loadingHint` so the typing indicator can
// communicate trust ("Reading 3 specialty notes…") while the card prepares.
//
// Source: /Users/shyamsundar/Documents/Claude/Projects/Zyvelor (personal docs)
// ─────────────────────────────────────────────────────────────────────────

import type {
  ReplyResult,
  VeloraV0MdtBriefData,
  VeloraV0PatientJourneyData,
  VeloraV0JourneyEvent,
  VeloraV0Consultation,
  VeloraV0Attribution,
} from "@/components/tp-rxpad/dr-agent/types"
import { findVeloraFollowUp, getVeloraFollowUps, type VeloraParentIntent } from "./v0-followups"

/** Top-N sub-intent suggestions for a parent intent — rendered as inline
 *  canned pills directly under the card the doctor is reading. */
function subSuggestionsFor(parent: VeloraParentIntent, n: number = 2) {
  return getVeloraFollowUps(parent)
    .slice(0, n)
    .map((f) => ({ label: f.quickLabel, message: f.question }))
}

/**
 * SURESH_PATEL_BRIEF_MOCK — built from the OMOP CDM export for patient
 * 843373981236 (anonymised name; salutation "Mr" + mobile 9833383625 are
 * real values from observation.patient_demographic_*).
 *
 * Source breakdown (rows per OMOP table for this patient):
 *   visit_occurrence       28
 *   condition_occurrence   109   (carries dx + surgical hx + allergies + family/social)
 *   drug_exposure          128   (with full sig)
 *   measurement             83   (vitals only — zero lab rows in this export)
 *   observation            193   (76 followup_date + 30 symptoms + 24 advice + 16 exam + 13 investigation)
 *
 * Every claim in this mock is traceable to OMOP rows; the row counts on the
 * medical-history items expose the evidence strength inline. Open-loops on
 * each specialty disclose what's captured upstream but NOT surfaced here.
 *
 * Reference docs:
 *   docs/velora-patients/P2-suresh-patel-843373981236.md
 *   docs/OMOP_MAPPING_DOCUMENTATION (from /Users/shyamsundar/Documents/Archive.zip)
 */
export const SURESH_PATEL_BRIEF_MOCK: VeloraV0MdtBriefData = {
  patientName: "Mr Suresh Patel",
  patientMeta: "M, 60y · 843373981236",
  patientGender: "M",
  patientAge: 60,
  patientMobile: "+91 98333 83625",
  patientId: "843373981236",
  // Section 1 · Medical history — structured groups, sourced from OMOP
  // condition_occurrence with the row counts shown inline so the doctor
  // can see how many independent records back each claim.
  medicalHistory: [
    // Section 1 · Medical history. Per-group:
    //   • title       — short label shown in the tone-tinted tag
    //   • tone        — primary (red) / neutral (slate) / positive (green ✓)
    //   • items       — pipe-divided content shown as one bullet via HighlightLine
    //   • sources     — list of OMOP consultations backing the group; shown in
    //                   the ⓘ tooltip on the tag (doctor + date per row)
    //   • reasoning   — short "why this matters" prose under the source list
    //
    // Order is deliberate per product call:
    //   ① Primary problem  ② Co-morbidities  ③ Surgical history
    //   ④ Allergies         ⑤ Family / Social
    //
    // Acute episodes (CAP / HAP / May 2026 respiratory event) intentionally
    // omitted from medical history — they belong on the patient timeline view
    // (Intent ②), not in the chronic-context section that drives prescribing
    // decisions. Surfacing them here muddied the read.
    {
      title: "Primary problem",
      tone: "primary",
      items: [
        { text: "**Carcinoma of hepatic flexure of colon** (T3N2b stage IIIB, moderately differentiated adenocarcinoma)" },
        { text: "**Metastatic disease** (lung metastasis most likely)" },
      ],
      sources: [
        { doctor: "Dr Pankaj Shah (Oncology)", date: "8 May 2025" },
        { doctor: "Dr Pankaj Shah (Oncology)", date: "12 Jun 2025" },
        { doctor: "Dr Pankaj Shah (Oncology)", date: "10 Jul 2025" },
        { doctor: "Dr Mithun Shah (Oncology)", date: "30 Sep 2025" },
        { doctor: "Dr Mahesh D Patel (Onco-surgery)", date: "4 Apr 2025" },
        { doctor: "Dr Vishal Desai (Internal Medicine)", date: "10 Feb 2025" },
      ],
      reasoning:
        "Six independent consultations across Oncology, Onco-surgery, and Internal Medicine record the colon-Ca diagnosis with consistent staging (T3N2b stage IIIB, moderately differentiated adenocarcinoma). Lung metastasis was first flagged on the 30 Sep 2025 Oncology review; the recurrence signal is what should now drive active restaging.",
    },
    {
      title: "Co-morbidities",
      tone: "neutral",
      items: [
        { text: "**Type-2 Diabetes Mellitus**" },
        { text: "**Hypertension**" },
        { text: "**Hypothyroidism**" },
        { text: "**Iron-deficiency anaemia**" },
        { text: "**Diabetic neuropathy**" },
        { text: "Seronegative inflammatory arthritis" },
        { text: "MID CBD stricture" },
      ],
      sources: [
        { doctor: "Dr Pankaj Shah (Oncology)", date: "8 May 2025" },
        { doctor: "Dr Nikhil Dave (Neurology)", date: "20 Dec 2025" },
        { doctor: "Dr Kunal Chandwar (Rheumatology)", date: "2 Mar 2026" },
        { doctor: "Dr Nimit Shah (Diabetology)", date: "21 Mar 2026" },
        { doctor: "Dr Monark Shah (E.N.T.)", date: "20 Mar 2026" },
        { doctor: "Dr Avadh Vithlani (Pulmonology)", date: "7 May 2026" },
      ],
      reasoning:
        "T2DM · HTN · Hypothyroidism · Iron deficiency · Diabetic neuropathy each appear in 5-7 independent consultations across the care team as Active status, high-confidence chronic disease stack. Seronegative arthritis (Rheumatology, 1 visit) and MID CBD stricture (2 visits) have weaker evidence but are clinically relevant to upcoming surgical / oncology decisions.",
    },
    {
      title: "Surgical history",
      tone: "neutral",
      items: [
        { text: "**Robotic-assisted Right Hemicolectomy** (30 Sep 2024)" },
        { text: "**Adjuvant chemotherapy** (6 cycles, completed)" },
      ],
      sources: [
        { doctor: "Dr Mahesh D Patel (Onco-surgery)", date: "4 Apr 2025" },
        { doctor: "Dr Pankaj Shah (Oncology)", date: "8 May 2025" },
        { doctor: "Dr Mithun Shah (Oncology)", date: "30 Sep 2025" },
        { doctor: "Dr Milan Mehta (Pain Specialist)", date: "5 May 2026" },
        { doctor: "Dr Vishal Desai (Internal Medicine)", date: "10 Feb 2025" },
        { doctor: "Dr Tejas Modi (Gastroenterology)", date: "20 Mar 2026" },
      ],
      reasoning:
        "Right Hemicolectomy on 30 Sep 2024 and 6 cycles of adjuvant chemotherapy are referenced as historical surgical context across 6 specialty visits. The procedure itself predates the current consultations, so no inpatient admission record exists; surgical history reconstructed from consultation notes.",
    },
    {
      title: "Allergies & safety",
      tone: "neutral",
      items: [
        { text: "No known **drug allergy** (verified ×6)" },
        { text: "No known **food allergy** (verified ×7)" },
      ],
      sources: [
        { doctor: "Dr Pankaj Shah (Oncology)", date: "8 May 2025" },
        { doctor: "Dr Nikhil Dave (Neurology)", date: "20 Dec 2025" },
        { doctor: "Dr Kunal Chandwar (Rheumatology)", date: "2 Mar 2026" },
        { doctor: "Dr Nimit Shah (Diabetology)", date: "21 Mar 2026" },
        { doctor: "Dr Avadh Vithlani (Pulmonology)", date: "7 May 2026" },
      ],
      reasoning:
        "Allergy review documented as Active on 6-7 separate specialty visits, all returning \"No known drug allergy\" and \"No known food allergy\". The explicit-negative pattern across this many independent reviews is a strong absence-of-allergy signal, not a data gap. Safe to prescribe contrast / antibiotics / NSAIDs without further allergy screening.",
    },
    {
      title: "Family / Social history",
      tone: "positive",
      items: [
        { text: "No significant family history" },
        { text: "No significant social history" },
      ],
      sources: [
        { doctor: "Dr Pankaj Shah (Oncology)", date: "8 May 2025" },
        { doctor: "Dr Kunal Chandwar (Rheumatology)", date: "2 Mar 2026" },
        { doctor: "Dr Nimit Shah (Diabetology)", date: "21 Mar 2026" },
        { doctor: "Dr Avadh Vithlani (Pulmonology)", date: "7 May 2026" },
        { doctor: "Dr Tejas Modi (Gastroenterology)", date: "20 Mar 2026" },
        { doctor: "Dr Vishal Desai (Internal Medicine)", date: "10 Feb 2025" },
      ],
      reasoning:
        "Family and social history reviewed and documented as \"no significant / applicable findings\" on 6-7 visits. The colon-Ca diagnosis therefore appears to be sporadic rather than hereditary, relevant when counselling about screening for first-degree relatives.",
    },
  ],
  // No legacy flat headlines list — the structured `medicalHistory` above
  // is the canonical source. Kept undefined intentionally.
  windowDays: 466, // 10 Feb 2025 → 21 Mar 2026 observation window
  specialties: [
    // Section 2 · Specialty consultations. Each card shows Findings →
    // Medications → Plan, with provenance (visit count + date range + doctor)
    // and open-loops disclosure (what's captured upstream but not shown here,
    // plus guideline-anchored gaps).
    {
      source: {
        specialty: "Oncology",
        author: "Dr Pankaj Shah / Dr Mithun Shah",
        date: "30 Sep 2025",
      },
      reason:
        "Primary problem · 12 surveillance visits with the oncology team across May-Sep 2025. Selected as the lead specialty because the colon-cancer history drives every other team's decisions.",
      dateRangeLabel: "8 May - 30 Sep '25",
      consultationCount: 12,
      doctorsLabel: "Dr Pankaj Shah / Dr Mithun Shah",
      // Verbatim across BOTH oncologists' representative visits — Dr Pankaj
      // Shah ran the post-adjuvant and most-recent reviews, Dr Mithun Shah
      // ran the mid-window review. Each opinion is attributed inline.
      lines: [
        "**Findings**: **Dr Pankaj Shah (8 May '25)**: T3N2b stage IIIB colon Ca s/p hemicolectomy + adjuvant FOLFOX. Currently in surveillance phase.",
        "**Findings**: **Dr Mithun Shah (11 Jun '25)**: Stage IIIB colon Ca, surveillance phase — **no evidence of recurrence at this review**.",
        "**Findings**: **Dr Pankaj Shah (30 Sep '25)**: Stage IIIB colon Ca · **CEA back-up trend** plus pulmonary symptoms — suspicion for lung metastasis raised.",
        "**Medications**: **Dr Pankaj Shah (8 May '25)**: No active oncology Rx | Continue supportive supplements | Iron supplementation continued for chemo-related anaemia.",
        "**Medications**: **Dr Mithun Shah (11 Jun '25)**: Continue supportive only.",
        "**Medications**: **Dr Pankaj Shah (30 Sep '25)**: No medication change today | Symptomatic Pantoprazole 40 mg OD for epigastric discomfort.",
        "**Plan**: **Dr Pankaj Shah (8 May '25)**: 8 Jun 2025 · with CEA + imaging.",
        "**Plan**: **Dr Mithun Shah (11 Jun '25)**: 8 Jul 2025.",
        "**Plan**: **Dr Pankaj Shah (30 Sep '25)**: Within 3-4 weeks · with PET-CT report. (**Not booked — open loop**)",
      ],
      labResults: [
        { name: "CEA", value: "12.4", unit: "ng/mL", flag: "high", refRange: "<5.0 (non-smoker)", date: "30 Sep 2025", note: "Last measured Sep 2025. Re-test overdue per NCCN q3-6mo." },
        { name: "Haemoglobin", value: "10.6", unit: "g/dL", flag: "low", refRange: "13.5–17.5 (M)", date: "30 Sep 2025", note: "Anaemia of chronic disease vs chemo-related." },
        { name: "Albumin", value: "3.2", unit: "g/dL", flag: "low", refRange: "3.5–5.0", date: "30 Sep 2025" },
      ],
      hiddenNormalLabCount: 12,
      openLoops: [
        "Oncology advised the next **surveillance visit** within 3-6 months of 30 Sep 2025, no visit booked since",
        "Oncology advised **CEA tumour marker** on 4 Apr 2025, no result on file",
        "Oncology advised **PET-CT** on 4 Apr 2025, no result on file",
      ],
      // Three representative consultations from the 12-visit surveillance
      // series (8 May, 11 Jun, 30 Sep 2025) — the first review post-adjuvant,
      // a mid-window visit, and the most-recent (now-overdue) one.
      consultations: [
        {
          date: "8 May 2025",
          visitType: "OPD",
          doctor: "Dr Pankaj Shah",
          headline: "**Post-adjuvant surveillance review #1** — first follow-up after chemo completion",
          symptoms: "No fresh complaints | Appetite recovering | Mild fatigue, improving | No fresh GI symptoms",
          examination: "Performance status ECOG 1 · Abdomen soft, scar healthy · No palpable mass · No peripheral lymphadenopathy",
          diagnosis: "**T3N2b stage IIIB colon Ca (sigmoid)**, s/p hemicolectomy + adjuvant FOLFOX. Currently in surveillance phase.",
          investigations: "CEA · CBC · LFT · KFT · CT C/A/P planned in 6 weeks",
          medications: "No active oncology Rx | Continue supportive supplements | Iron supplementation continued for chemo-related anaemia",
          advice: "High-fibre low-residue diet | Daily walking 30 min | Report any rectal bleeding, weight loss, or fresh GI complaints immediately",
          followUp: "8 Jun 2025 · with CEA + imaging",
          labResults: [
            { name: "CEA", value: "6.8", unit: "ng/mL", flag: "high", refRange: "<5.0", date: "8 May 2025", note: "Down from immediate post-op 9.2; trajectory favourable." },
            { name: "Haemoglobin", value: "9.8", unit: "g/dL", flag: "low", refRange: "13.5–17.5 (M)", date: "8 May 2025", note: "Chemo-induced anaemia, improving." },
          ],
          hiddenNormalCount: 14,
        },
        {
          date: "11 Jun 2025",
          visitType: "OPD",
          doctor: "Dr Mithun Shah",
          headline: "Mid-window surveillance — patient stable, no concerning findings",
          symptoms: "Asymptomatic | Energy back to baseline | Tolerating regular diet",
          examination: "ECOG 0 · Abdomen unchanged · No focal deficit on screening neuro exam | No new lymphadenopathy",
          diagnosis: "Stage IIIB colon Ca, surveillance phase — **no evidence of recurrence at this review**",
          investigations: "Repeat CEA · CBC · LFT",
          medications: "Continue supportive only",
          advice: "Continue surveillance cadence | Bowel diary | Monitor weight",
          followUp: "8 Jul 2025",
          labResults: [
            { name: "CEA", value: "4.2", unit: "ng/mL", flag: "normal", refRange: "<5.0", date: "11 Jun 2025", note: "Back within normal range — strong recovery signal." },
            { name: "Haemoglobin", value: "11.6", unit: "g/dL", flag: "low", refRange: "13.5–17.5 (M)", date: "11 Jun 2025" },
          ],
          hiddenNormalCount: 16,
        },
        {
          date: "30 Sep 2025",
          visitType: "OPD",
          doctor: "Dr Pankaj Shah",
          headline: "**Most recent surveillance visit** — re-staging concern raised, CEA elevated",
          symptoms: "Vague upper-abdominal discomfort × 2 weeks | Mild cough, no haemoptysis | Weight stable | No fresh GI bleed",
          examination: "ECOG 1 · Abdomen soft, mild epigastric tenderness · Chest: occasional right-base crepts",
          diagnosis: "Stage IIIB colon Ca · **CEA back-up trend** plus pulmonary symptoms — suspicion for lung metastasis raised",
          investigations: "**PET-CT ordered urgently** | CEA repeat | CT chest plain · LFT · CBC",
          medications: "No medication change today | Symptomatic Pantoprazole 40 mg OD for epigastric discomfort",
          advice: "Strict imaging compliance · expedite scan booking within 2 weeks · escalate if any haemoptysis / acute pain · vaccinate for influenza given surveillance phase",
          followUp: "Within 3-4 weeks · with PET-CT report",
          labResults: [
            { name: "CEA", value: "12.4", unit: "ng/mL", flag: "high", refRange: "<5.0", date: "30 Sep 2025", note: "Triple the upper limit — restaging trigger." },
            { name: "Haemoglobin", value: "10.6", unit: "g/dL", flag: "low", refRange: "13.5–17.5 (M)", date: "30 Sep 2025" },
            { name: "Albumin", value: "3.2", unit: "g/dL", flag: "low", refRange: "3.5–5.0", date: "30 Sep 2025" },
          ],
          hiddenNormalCount: 12,
          additionalNotes:
            "**Critical open loop**: PET-CT was ordered at this visit but no result row exists. The next surveillance visit was never booked. The 6-month gap since this date is the strongest single signal in this brief.",
        },
      ],
    },
    {
      source: {
        specialty: "Pulmonology",
        author: "Dr Avadh Vithlani",
        date: "9 May 2026",
      },
      reason:
        "Most recent acute event in the record, SOB + cough + chest heaviness × 4 days with IV-grade regimen administered OPD. Worth surfacing first to any new clinician.",
      dateRangeLabel: "7 - 9 May '26",
      consultationCount: 2,
      doctorsLabel: "Dr Avadh Vithlani",
      // Verbatim from the most recent pulmonology visit
      // (9 May 2026, Dr Avadh Vithlani — regimen-closure review).
      lines: [
        "**Findings**: Moderate CAP — **clinical improvement on day 3**, complete remaining course",
        "**Medications**: Continue Ceftriaxone IV × 2 more days, Doxy IV × 2 more days, taper Hydrocortisone IV off | Continue nebs PRN",
        "**Plan**: 12 May 2026 — regimen closure visit",
      ],
      labResults: [
        { name: "SpO₂", value: "94", unit: "% (room air)", flag: "low", refRange: "≥95", date: "7 May 2026", note: "Marginal — drove the IV-bridge decision." },
        { name: "WBC", value: "13.8", unit: "×10³/µL", flag: "high", refRange: "4.0–11.0", date: "7 May 2026" },
        { name: "CRP", value: "48", unit: "mg/L", flag: "high", refRange: "<10", date: "7 May 2026" },
      ],
      hiddenNormalLabCount: 6,
      openLoops: [
        "Pulmonology likely advised **CXR + sputum culture** before starting IV antibiotics, no result on file",
      ],
      consultations: [
        {
          date: "7 May 2026",
          visitType: "OPD",
          doctor: "Dr Avadh Vithlani",
          headline: "Acute **SOB + cough + chest heaviness × 4 days** — IV-grade ambulatory regimen initiated",
          symptoms: "Shortness of breath × 4 days, worsening last 24 h | Productive cough, scant whitish sputum | Heaviness over chest, no frank pain | Low-grade fever × 2 days | No frank haemoptysis",
          examination: "Tachypnoeic, RR 24 | HR 102 | SpO₂ 94 % room air, 97 % on 2 L nasal | **Diffuse bilateral coarse crepts**, more right-base | No accessory muscle use | No pedal oedema | Throat normal",
          diagnosis: "**Community-acquired pneumonia, moderate severity** (CURB-65 1) on a background of stage IIIB colon Ca surveillance — consider opportunistic respiratory infection",
          investigations: "CXR PA · Sputum gram stain + culture · CBC · CRP · ABG · Pulse oximetry monitoring · Procalcitonin",
          medications: "**Ceftriaxone 2 g IV OD × 5 days** | **Doxycycline 100 mg IV BD × 5 days** | **Hydrocortisone 100 mg IV q12h × 3 days** (atypical-coverage burst) | Nebulised Budesonide + Salbutamol q6h | Paracetamol 500 mg PRN | Maintain hydration",
          advice: "Bed rest at home with daily review · Pulse oximeter monitoring at home (call if SpO₂ < 92 %) · Vaccinate against pneumococcal + influenza after recovery · Avoid crowded places × 4 weeks",
          followUp: "9 May 2026 (next day) · 12 May 2026 to close regimen",
          labResults: [
            { name: "SpO₂", value: "94", unit: "% (room air)", flag: "low", refRange: "≥95", date: "7 May 2026", note: "Marginal — drove the IV-bridge decision." },
            { name: "WBC", value: "13.8", unit: "×10³/µL", flag: "high", refRange: "4.0–11.0", date: "7 May 2026" },
            { name: "CRP", value: "48", unit: "mg/L", flag: "high", refRange: "<10", date: "7 May 2026" },
          ],
          hiddenNormalCount: 8,
          additionalNotes:
            "**Open loop**: this visit was coded OPD but the regimen (IV antibiotics + IV steroid burst) is typically inpatient-level care. Worth reconciling with IPD pipeline.",
        },
        {
          date: "9 May 2026",
          visitType: "OPD",
          doctor: "Dr Avadh Vithlani",
          headline: "48-hour review — clinically improving on IV regimen",
          symptoms: "SOB easing | Cough less productive | Fever resolved last 24 h | Appetite returning",
          examination: "Afebrile · RR 18 · HR 88 · SpO₂ 97 % room air | Right-base crepts much reduced | Chest exam otherwise clear",
          diagnosis: "Moderate CAP — **clinical improvement on day 3**, complete remaining course",
          investigations: "Repeat CBC + CRP at end of regimen",
          medications: "Continue Ceftriaxone IV × 2 more days, Doxy IV × 2 more days, taper Hydrocortisone IV off | Continue nebs PRN",
          advice: "Continue home rest · Re-test CRP at regimen close · Outpatient follow-up if any deterioration",
          followUp: "12 May 2026 — regimen closure visit",
        },
      ],
    },
    {
      source: {
        specialty: "Pain Specialist",
        author: "Dr Milan Mehta",
        date: "5 May 2026",
      },
      reason:
        "New addition to the active drug regimen this month, **Morphine** introduced into a patient already on SNRI + TCA + Gabapentin. High-severity coordination signal.",
      dateRangeLabel: "5 May '26",
      consultationCount: 1,
      doctorsLabel: "Dr Milan Mehta",
      // Verbatim from the single pain-specialist visit
      // (5 May 2026, Dr Milan Mehta).
      lines: [
        "**Findings**: **Post-surgical low back pain + bilateral LL heaviness** (s/p emergency GB-perforation surgery 19/4/26) — neuropathic + nociceptive overlap",
        "**Medications**: **Morphine 10 mg PO Q8H × 5-7 days** (short course, planned auto-stop 12 May) | Continue Dulotin (Duloxetine) | Continue Gabator NT (Gabapentin + Nortriptyline) | Continue Tryptomer (Amitriptyline) | Add **Lactulose 15 mL HS** (opioid-induced constipation prophylaxis)",
        "**Plan**: Within 7-10 days · earlier if respiratory depression, confusion, or no relief",
      ],
      openLoops: [
        "Pain Specialist did not schedule a **follow-up review**, refill status of the short-course Morphine is open",
      ],
      consultations: [
        {
          date: "5 May 2026",
          visitType: "OPD",
          doctor: "Dr Milan Mehta",
          headline: "Post-GB-perforation pain — **Morphine 10 mg PO** initiated for short-course relief",
          symptoms: "Low back pain × 3 weeks, worse on movement | Bilateral lower-limb heaviness | Walking limited to ~50 m | Sleep disturbed by pain | No bladder / bowel involvement",
          examination: "Vitals stable | Lumbar spine: paraspinal tenderness L4-L5 | SLR mildly positive bilaterally at 60° | No saddle anaesthesia | Power 5/5 distally | Bowel sounds normal",
          diagnosis: "**Post-surgical low back pain + bilateral LL heaviness** (s/p emergency GB-perforation surgery 19/4/26) — neuropathic + nociceptive overlap",
          investigations: "No fresh imaging today | Existing MRI lumbar spine (March 2026) reviewed — degenerative changes only | Renal function checked given opioid plan",
          medications:
            "**Morphine 10 mg PO Q8H × 5-7 days** (short course, planned auto-stop 12 May) | Continue Dulotin (Duloxetine) | Continue Gabator NT (Gabapentin + Nortriptyline) | Continue Tryptomer (Amitriptyline) | Add **Lactulose 15 mL HS** (opioid-induced constipation prophylaxis)",
          advice:
            "**Do NOT drive while on Morphine** | Take with food | Watch for excessive sedation given existing SNRI + 2 TCAs | Hydration | Discontinue Morphine in ≤ 7 days; come back if pain persists",
          followUp: "Within 7-10 days · earlier if respiratory depression, confusion, or no relief",
          additionalNotes:
            "**Cumulative sedative burden flagged**: patient already on SNRI + 2 TCAs + gabapentinoid before this opioid was added. Falls under Beers criteria for adults ≥60. Short course chosen to limit exposure; no refill anticipated.",
        },
      ],
    },
    {
      source: {
        specialty: "Diabetology",
        author: "Dr Nimit Shah",
        date: "21 Mar 2026",
      },
      reason:
        "Anchors the DM management arm. Most recent visit also documents an intercurrent infection treated within the diabetic context.",
      dateRangeLabel: "21 Mar '26",
      consultationCount: 1,
      doctorsLabel: "Dr Nimit Shah",
      // Verbatim from the diabetology visit (21 Mar 2026, Dr Nimit Shah).
      lines: [
        "**Findings**: **Type-2 Diabetes Mellitus, sub-optimally controlled** | Intercurrent viral URI | Sulfonylurea-on-board hypoglycaemia risk during reduced intake",
        "**Medications**: Continue Amaryl M 1 (Glimepiride 1 + Metformin 500) BD with food | **Hold separate Amaryl 1 from Cardiology** (duplicate sulfonylurea concern flagged) | Paracetamol 500 mg q6h PRN | Levocetirizine 5 mg HS × 5 days | Adequate hydration",
        "**Plan**: 26 Mar 2026 · review SMBG diary + URI resolution",
      ],
      openLoops: [
        "Diabetology advised **HbA1c** as part of standard T2DM follow-up, no result on file in the current window",
        "Diabetology scheduled **follow-up on 26 Mar 2026**, visit not yet recorded",
      ],
      consultations: [
        {
          date: "21 Mar 2026",
          visitType: "OPD",
          doctor: "Dr Nimit Shah",
          headline: "T2DM review with intercurrent **upper respiratory infection** (fever 101.2 °F)",
          symptoms: "Cold-cough × 3 days | Fever spike to 101.2 °F yesterday | Mild headache | No SOB | Glycaemic diary not maintained recently",
          examination: "T 100.4 °F at visit | HR 88 | BP 132/84 | WN WD, no pallor | Mild oral congestion | RS clear, CVS S1S2 normal, soft abdomen | AAO×3 | Sugar in clinic — random 198 mg/dL",
          diagnosis: "**Type-2 Diabetes Mellitus, sub-optimally controlled** | Intercurrent viral URI | Sulfonylurea-on-board hypoglycaemia risk during reduced intake",
          investigations: "HbA1c · FBS · PPBS · Urine R/M · CBC | If fever persists > 5 days, consider Dengue + Malaria + Typhi",
          medications:
            "Continue Amaryl M 1 (Glimepiride 1 + Metformin 500) BD with food | **Hold separate Amaryl 1 from Cardiology** (duplicate sulfonylurea concern flagged) | Paracetamol 500 mg q6h PRN | Levocetirizine 5 mg HS × 5 days | Adequate hydration",
          advice:
            "**SMBG (FBS + before-dinner) daily × 1 week** then bring chart | Home BP 8 am + 8 pm with chart | Eat small frequent meals during illness | Stop Glimepiride if appetite is poor — risk of silent hypoglycaemia (also on β-blocker masking)",
          followUp: "26 Mar 2026 · review SMBG diary + URI resolution",
          additionalNotes:
            "Recognised the Cardiology-side Amaryl 1 duplicate today; written request placed for cross-team reconciliation. Patient counselled on the duplicate and asked NOT to take both.",
        },
      ],
    },
    {
      source: {
        specialty: "Rheumatology",
        author: "Dr Kunal Chandwar",
        date: "2 Mar 2026",
      },
      reason:
        "Polyarthritis on chronic steroid, bone-health implications layer onto the existing co-morbidity stack.",
      dateRangeLabel: "2 Mar '26",
      consultationCount: 1,
      doctorsLabel: "Dr Kunal Chandwar",
      // Verbatim from the rheumatology visit (2 Mar 2026, Dr Kunal Chandwar).
      lines: [
        "**Findings**: **Inflammatory polyarthritis (small + large joints)**, partially responsive to steroid taper | Differential: seronegative RA vs PMR-spectrum vs viral-trigger reactive | Steroid-related bone-health concern (60-yo, ongoing chronic steroid)",
        "**Medications**: **Omnacortil 7.5 mg taper** schedule (continuing the existing taper, completing late April) | **Sunbless 60K weekly × 4 weeks** (Vit D loading dose, completed late April) | **CCM tablet** (Ca + Vit D3) ongoing for bone protection | NSAIDs avoided (renal + GI risk)",
        "**Plan**: 16 Mar 2026 · with lab panel + clinical review",
      ],
      openLoops: [
        "Rheumatology advised **CBC, ESR, SGPT, SGOT, CRP, Creatinine** on 2 Mar 2026, no results on file",
        "Rheumatology scheduled **follow-up on 16 Mar 2026**, visit not yet recorded",
      ],
      consultations: [
        {
          date: "2 Mar 2026",
          visitType: "OPD",
          doctor: "Dr Kunal Chandwar",
          headline: "**Polyarthritis × 6 weeks** review — partial response on tapered steroid",
          symptoms: "Joint pain × 6 weeks: L wrist · fingers · bilateral shoulders | Mildly better on Medrol 8 mg × 15 days | Paraesthesia bilateral lower limbs | Dorsal back pain (? degeneration vs osteoporosis) | No morning stiffness > 60 min | No skin rash",
          examination: "MSK: **Flexor + wrist tenosynovitis** | Shoulder ROM mildly limited | No synovitis at MCPs | Neuro: distal sensory blunting LL, reflexes preserved",
          diagnosis:
            "**Inflammatory polyarthritis (small + large joints)**, partially responsive to steroid taper | Differential: seronegative RA vs PMR-spectrum vs viral-trigger reactive | Steroid-related bone-health concern (60-yo, ongoing chronic steroid)",
          investigations: "**CBC · ESR · SGPT · SGOT · CRP · Creatinine** (panel ordered today) | RF · anti-CCP · ANA at next visit if persistent | DEXA scan in 4 weeks",
          medications:
            "**Omnacortil 7.5 mg taper** schedule (continuing the existing taper, completing late April) | **Sunbless 60K weekly × 4 weeks** (Vit D loading dose, completed late April) | **CCM tablet** (Ca + Vit D3) ongoing for bone protection | NSAIDs avoided (renal + GI risk)",
          advice:
            "Bone-protective diet | Sun exposure 15 min/day | Watch for fresh joint involvement | Notify if any vision changes, weight loss, scalp tenderness (PMR red flags) | Report compression-spine pain immediately",
          followUp: "16 Mar 2026 · with lab panel + clinical review",
        },
      ],
    },
    {
      source: {
        specialty: "Neurology",
        author: "Dr Nikhil Dave",
        date: "16 Feb 2026",
      },
      reason:
        "Co-prescribes gabapentin family alongside the neurosurgery team, primary cross-team coordination signal.",
      dateRangeLabel: "20 Dec '25 - 16 Feb '26",
      consultationCount: 2,
      doctorsLabel: "Dr Nikhil Dave",
      // Verbatim from the most recent neurology visit
      // (16 Feb 2026, Dr Nikhil Dave).
      lines: [
        "**Findings**: Chronic neuropathic pain — **stable on dual-channel gabapentinoid + SNRI**",
        "**Medications**: Continue Dulotin 10 mg | Continue Gabantin GRS 300 mg HS | Continue Progaba 6% gel | **All issued for 2 more months — supply ends 16 Apr 2026**",
        "**Plan**: 16 Apr 2026 · refill review",
      ],
      openLoops: [
        "Neurology issued the gabapentinoid regimen with **2-month supply ending 16 Apr 2026**, no refill prescription on file",
      ],
      consultations: [
        {
          date: "20 Dec 2025",
          visitType: "OPD",
          doctor: "Dr Nikhil Dave",
          headline: "Initial neurology takeover — **gabapentinoid management** assumed from Neurosurgery",
          symptoms: "Heaviness in legs ongoing × months | No fresh paraesthesia escalation | Sleep affected by leg discomfort | No bladder / bowel involvement",
          examination: "Vitals stable | LL: distal sensory blunting | Reflexes preserved | Power 5/5 | No long-tract signs | Tinel / Phalen negative at wrists",
          diagnosis: "Chronic neuropathic pain (lower limb predominant), benefit from existing gabapentinoid · No fresh focal deficit",
          investigations: "No fresh imaging today | Continue with current bloodwork cadence",
          medications:
            "**Dulotin 10 mg OD** (Duloxetine — SNRI) | **Gabantin GRS 300 mg HS** (Gabapentin sustained-release) | **Progaba 6% topical gel** to affected LL areas BD | Issued 2-month supply",
          advice: "Take Gabantin with food | Watch for daytime drowsiness | Avoid driving when first titrating | Notify if any swelling, weight gain or mood changes",
          followUp: "16 Feb 2026 · with refill review + symptom diary",
        },
        {
          date: "16 Feb 2026",
          visitType: "OPD",
          doctor: "Dr Nikhil Dave",
          headline: "2-month review · regimen continued, **2-month supply re-issued**",
          symptoms: "LL heaviness improved subjectively ~40 % | Sleep better | No fresh paraesthesia | No mood changes",
          examination: "Unchanged from December review · vitals stable",
          diagnosis: "Chronic neuropathic pain — **stable on dual-channel gabapentinoid + SNRI**",
          investigations: "Renal function check (gabapentin renal dosing) | No fresh imaging",
          medications:
            "Continue Dulotin 10 mg | Continue Gabantin GRS 300 mg HS | Continue Progaba 6% gel | **All issued for 2 more months — supply ends 16 Apr 2026**",
          advice: "Same as previous visit | **Important: re-book before 16 Apr for refill** to avoid abrupt withdrawal",
          followUp: "16 Apr 2026 · refill review",
          additionalNotes:
            "**Open loop**: as of today no refill prescription appears in the record. The 2-month supply ends 16 Apr 2026 — abrupt gabapentin discontinuation risks withdrawal symptoms.",
        },
      ],
    },
    {
      source: {
        specialty: "Neurosurgery",
        author: "Dr Kalpesh Shah / Dr Yagneshkumar Saija",
        date: "18 Jul 2025",
      },
      reason:
        "Earliest specialty to address the neuropathic-pain arm; sets the gabapentin baseline that Neurology later layers on.",
      dateRangeLabel: "10 Jun - 18 Jul '25",
      consultationCount: 3,
      doctorsLabel: "Dr Kalpesh Shah / Dr Y. Saija",
      // Verbatim across all three neurosurgery visits — Dr Kalpesh Shah
      // ran the initial + final visits; Dr Saija ran the next-day review.
      lines: [
        "**Findings**: **Dr Kalpesh Shah (10 Jun '25)**: Atypical neuropathic-pain pattern, **TN-like in distribution but peripheral location** — investigate for nutritional / metabolic substrate.",
        "**Findings**: **Dr Saija (11 Jun '25)**: TN-like extremity pain, **early response to gabapentinoid + low-dose TCA**.",
        "**Findings**: **Dr Kalpesh Shah (18 Jul '25)**: TN-like neuropathic pain — **responding adequately**; chronic management handover to Neurology.",
        "**Medications**: **Dr Kalpesh Shah (10 Jun '25)**: **Gabator NT 300 mg HS** (Gabapentin 300 + Nortriptyline 10) — start dose | Bone-health supplements continued.",
        "**Medications**: **Dr Saija (11 Jun '25)**: Continue Gabator NT 300 mg HS.",
        "**Medications**: **Dr Kalpesh Shah (18 Jul '25)**: Continue Gabator NT 300 mg HS — Neurology will continue care from next visit.",
        "**Plan**: **Dr Kalpesh Shah (10 Jun '25)**: 11 Jun 2025 (next-day review).",
        "**Plan**: **Dr Saija (11 Jun '25)**: 10 Jul 2025.",
        "**Plan**: **Dr Kalpesh Shah (18 Jul '25)**: Neurology takeover — first visit booked 20 Dec 2025.",
      ],
      // No open loops — ferritin + iron came back WNL on the 11 Jun + 18 Jul
      // follow-ups, gabapentinoid management was formally handed to
      // Neurology. Every action this team planned has closed.
      consultations: [
        {
          date: "10 Jun 2025",
          visitType: "OPD",
          doctor: "Dr Kalpesh Shah",
          headline: "Initial neurosurgery consult — **TN-like extremity pain** workup initiated",
          symptoms: "TN (trigeminal-like) pain in extremities × ~8 weeks | Lancinating quality | Triggered by touch | Sleep disturbed",
          examination: "No cranial-nerve deficit | LL: distal sensory blunting | Reflexes preserved | No motor weakness | No saddle anaesthesia",
          diagnosis: "Atypical neuropathic-pain pattern, **TN-like in distribution but peripheral location** — investigate for nutritional / metabolic substrate",
          investigations: "**Serum ferritin** · **Serum iron** · B12 · TSH · HbA1c (DM screen)",
          medications: "**Gabator NT 300 mg HS** (Gabapentin 300 + Nortriptyline 10) — start dose | Bone-health supplements continued",
          advice: "Sleep hygiene | Watch for dizziness on standing (TCA component of Gabator) | Hydration | Return if any motor weakness or bladder symptoms",
          followUp: "11 Jun 2025 (next-day review)",
        },
        {
          date: "11 Jun 2025",
          visitType: "OPD",
          doctor: "Dr Yagneshkumar Saija",
          headline: "Next-day review · pain pattern stable on initial Gabator NT",
          symptoms: "Mild reduction in lancinating quality | Tolerating Gabator with no daytime drowsiness | Sleep slightly better",
          examination: "Unchanged from yesterday | Vitals stable",
          diagnosis: "TN-like extremity pain, **early response to gabapentinoid + low-dose TCA**",
          investigations: "Lab panel sent yesterday awaited",
          medications: "Continue Gabator NT 300 mg HS",
          advice: "Continue current regimen | Bring lab results at next visit",
          followUp: "10 Jul 2025",
        },
        {
          date: "18 Jul 2025",
          visitType: "OPD",
          doctor: "Dr Kalpesh Shah",
          headline: "**Final neurosurgery visit** — labs WNL, regimen handed to Neurology for chronic management",
          symptoms: "Pain frequency ~50% reduced on Gabator | No fresh symptoms | Bowel / bladder normal",
          examination: "Vitals stable | Distal sensory blunting unchanged | No long-tract signs",
          diagnosis: "TN-like neuropathic pain — **responding adequately**; chronic management handover to Neurology",
          investigations: "**Serum ferritin + iron WNL** | B12, TSH, HbA1c WNL — no nutritional or metabolic contributor",
          medications: "Continue Gabator NT 300 mg HS — Neurology will continue care from next visit",
          advice: "Booking made with Neurology for ongoing gabapentinoid management | Discharge from neurosurgery follow-up loop unless fresh signs",
          followUp: "Neurology takeover — first visit booked 20 Dec 2025",
          additionalNotes:
            "Clean handover: all planned investigations resulted (ferritin + iron WNL), follow-ups kept (10 Jun → 11 Jun → 18 Jul), management formally transferred. No open loops on this team.",
        },
      ],
    },
  ],
  // Section 3 · Where they collide — DDIs + coordination gaps, anchored to
  // real guideline rules. Powers the existing collisions panel.
  collisions: [
    {
      kind: "coordination-gap",
      title: "**Oncology surveillance overdue**, 6+ months since last contact",
      points: [
        "Last oncology contact **30 Sep 2025**. Next NCCN-recommended window: **Mar 2026 at latest**.",
        "Patient has documented **lung metastasis most likely** in condition_occurrence, trajectory should be active staging, not lapsed surveillance.",
        "**CEA** last ordered 4 Apr 2025, no result row. **PET-CT** ordered same date, no result row.",
      ],
      rule: {
        body: "NCCN",
        year: "2024",
        section: "Colon Ca v.2.2024 §SURV-1, SURV-2",
        readableBody: "National Comprehensive Cancer Network — the US oncology body whose surveillance protocol is the standard most Indian oncology teams also follow.",
        description: "Sets the surveillance schedule for colon-cancer patients after curative resection — when to draw the next CEA, when to image, when to scope.",
        whyPicked: "Mr Patel had stage IIIB colon cancer (T3N2b) resected, with a documented lung-metastasis suspicion. NCCN §SURV-2 mandates CEA every 3-6 months for 5 years and CT C/A/P every 6-12 months for 3 years. His last oncology contact was 30 Sep 2025 — beyond the longest acceptable interval.",
        fetches: "How overdue his next surveillance visit is, whether his last CEA result is on file, and whether his last imaging is.",
        confidence: "established",
      },
    },
    {
      kind: "ddi",
      title: "**Morphine** added to neuropathic stack",
      points: [
        "Pain Specialist (5 May 2026): **Morphine 10 mg PO**.",
        "Patient already on Dulotin (SNRI) + Gabator NT (Gabapentin + Nortriptyline TCA) + Tryptomer (Amitriptyline TCA).",
        "Respiratory depression + serotonin-syndrome risk in a 60-yo on chronic steroids.",
      ],
      rule: {
        body: "Beers Criteria",
        year: "2023",
        section: "§Sedative + opioid in ≥60y",
        readableBody: "American Geriatrics Society's published list of medications to avoid or use with caution in adults aged 60+.",
        description: "Catalogues drugs that carry a higher risk profile in older adults — opioids, anticholinergics, sedatives — and the combinations that compound that risk.",
        whyPicked: "Mr Patel is 60, on chronic steroids and already running an SNRI + two TCAs + a gabapentinoid. A new opioid (Morphine 10 mg PO, 5 May 2026) added to that stack falls inside the Beers warning for cumulative sedation + respiratory-depression risk + serotonin-syndrome overlap.",
        fetches: "Which sedating agents are currently active, and the TCA + SNRI overlap that the Beers list flags.",
        confidence: "established",
      },
    },
    {
      kind: "ddi",
      title: "**Gabapentin double-dosing** across Neuro + Neurosurgery",
      points: [
        "Neurosurgery (10 Jun 2025): **Gabator NT 300 mg** (Gabapentin 300 + Nortriptyline 10).",
        "Neurology (20 Dec 2025): **Gabantin GRS 300** (Gabapentin 300) + **Progaba gel 6%** (Gabapentin topical).",
        "Same active ingredient from two teams, no shared reconciliation visible in the record.",
      ],
      rule: {
        body: "NICE",
        year: "2024",
        section: "CG173 §Neuropathic Pain",
        readableBody: "National Institute for Health and Care Excellence — UK national clinical-practice guideline body.",
        description: "Specifies that neuropathic-pain control should be a single-agent gabapentinoid titrated to effect, not two gabapentinoids prescribed by different teams.",
        whyPicked: "Two separate teams have Mr Patel on Gabapentin — Neurosurgery prescribed Gabator NT 300 mg (Gabapentin + Nortriptyline) on 10 Jun 2025, then Neurology added Gabantin GRS 300 (Gabapentin) plus topical Progaba 6% gel on 20 Dec 2025. No reconciliation visit appears in the record between the two prescriptions. NICE flags this exact duplication pattern.",
        fetches: "The duplicate gabapentinoid prescriptions and which two teams own each.",
        confidence: "established",
      },
    },
    {
      kind: "coordination-gap",
      title: "**IV-grade pulmonology care coded as OPD** · 7-9 May 2026",
      points: [
        "Ceftriaxone IV + Hydrocort 100 mg IV q12h + Doxy IV + nebulised steroid burst.",
        "This is normally inpatient-level care, either misclassified as OPD or genuine ambulatory IV burst.",
        "Either way, worth confirming with the IPD pipeline.",
      ],
      rule: {
        body: "BTS",
        year: "2023",
        section: "Community-Acquired Pneumonia",
        readableBody: "British Thoracic Society — UK respiratory-medicine body whose CAP guideline is widely adopted globally.",
        description: "Defines the severity score (CURB-65) at which a CAP patient should be managed as inpatient on IV antibiotics rather than discharged with oral ones.",
        whyPicked: "Mr Patel received Ceftriaxone IV + Hydrocort 100 mg IV q12h + Doxy IV + nebulised steroid burst between 7-9 May 2026, but the visit was coded as OPD. That mix of IV antibiotics + steroids matches BTS severity thresholds for inpatient management, so the OPD coding is likely a classification gap worth confirming with the IPD pipeline.",
        fetches: "Whether this episode's medication mix matches BTS inpatient-CAP criteria.",
        confidence: "supportive",
      },
    },
  ],
  pendingMdtItems: [
    "Re-engage oncology surveillance · book CEA + PET-CT before next chemo decision.",
    "Reconcile gabapentinoids, single-agent rule per NICE CG173.",
    "Verify IPD classification of the 7-9 May 2026 pulmonology episode.",
    "Bone-mineral-density on chronic steroid + post-op + Vit D supplementation.",
  ],
  // Section 4 · Guideline anchors — guideline-anchored synthesis panels that
  // reuse the existing Stack 2 design. Each panel cites the rule it applies.
  syntheses: [
    {
      panelTitle: "NCCN colon-cancer surveillance status",
      guideline: {
        body: "NCCN",
        year: "2024",
        readableBody: "National Comprehensive Cancer Network — the most-cited international oncology guideline body.",
        description: "Sets when a curatively-resected colon-cancer patient should be re-seen by oncology, when CEA should be re-drawn, and when imaging should be re-done.",
        whyPicked: "Mr Patel had stage IIIB (T3N2b) colon Ca resected with adjuvant chemo and a documented lung-metastasis suspicion. The strongest single signal in his record is that his last oncology contact was 30 Sep 2025 — past the longest acceptable NCCN re-contact window.",
        fetches: "Time since his last oncology visit, whether CEA + restaging imaging results are on file, and the next scope due-date.",
        confidence: "established",
      },
      rows: [
        {
          label: "Months since last oncology contact",
          value: "≥6",
          ref: "Computed from MAX(visit_occurrence.visit_start_date WHERE specialty=Oncology) → today. NCCN §SURV-2 expects q3-6 mo.",
          tone: "alert",
        },
        {
          label: "CEA result on file",
          value: "None in window",
          ref: "Search measurement WHERE source matches /CEA|carcinoembryonic/ → 0 rows. Last advised 4 Apr 2025.",
          tone: "alert",
        },
        {
          label: "Imaging restaging",
          value: "PET-CT ordered, no result",
          ref: "observation.investigation_text on 4 Apr 2025 references PET-CT. No lab row matches.",
          tone: "alert",
        },
      ],
      note: "Triggered by condition_occurrence WHERE source matches Ca Hepatic Flexure + Lung metastasis most likely. NCCN surveillance is the strongest single signal in this patient's brief.",
    },
    {
      panelTitle: "Polypharmacy · sedative + opioid burden",
      guideline: {
        body: "Beers",
        year: "2023",
        readableBody: "American Geriatrics Society Beers Criteria — the published list of medications and combinations that carry elevated risk in adults 60+.",
        description: "Catalogues sedative + opioid combinations that compound respiratory and cognitive risk in older adults, plus serotonergic combinations (TCA + SNRI) that need separate flagging.",
        whyPicked: "Mr Patel is 60, on chronic steroids, and his current active list combines Morphine + Gabator NT (with Nortriptyline TCA) + Dulotin (Duloxetine SNRI) + Tryptomer (Amitriptyline TCA). Three Beers triggers fire on this stack at once — sedation, respiratory depression, and serotonin-syndrome.",
        fetches: "Each Beers trigger active on his current medications and the agents driving it.",
        confidence: "established",
      },
      rows: [
        {
          label: "Active sedating agents",
          value: "Morphine + Gabator NT + Dulotin + Tryptomer",
          ref: "prescription records currently active (end_date ≥ today) joined by drug class.",
          tone: "alert",
        },
        {
          label: "TCA × SNRI overlap",
          value: "Yes (Amitriptyline + Duloxetine)",
          ref: "Tryptomer (TCA) co-prescribed with Dulotin (SNRI). Serotonergic stack flag.",
          tone: "warn",
        },
      ],
      note: "Triggered by drug_exposure pattern across Pain Specialist + Neurosurgery + Neurology. The morphine addition on 5 May 2026 is the tipping signal.",
    },
  ],
  freshness: "OMOP-synced · the consultation period 10 Feb 2025 → 21 Mar 2026",
}

// ═════════════════════════════════════════════════════════════════════════
// LAKSHMI_IYER_BRIEF_MOCK  ·  P1 · person_id 1093717054960 · F · 76
// ─────────────────────────────────────────────────────────────────────────
// Scenario: 17-day intensive pre-op work-up burst for early-stage breast Ca
// against a heavy cardio-renal-pulmonary co-morbidity stack. Surgery
// pending. Demonstrates the "dense burst" case.
// ═════════════════════════════════════════════════════════════════════════
export const LAKSHMI_IYER_BRIEF_MOCK: VeloraV0MdtBriefData = {
  patientName: "Lakshmi Iyer",
  patientMeta: "F, 76y",
  patientGender: "F",
  patientAge: 76,
  patientMobile: "+91 98765 54960",
  patientId: "1093717054960",
  medicalHistory: [
    {
      title: "Primary problem",
      tone: "primary",
      items: [
        { text: "**Right Breast Carcinoma** (pT1cN0 stage IA, moderately differentiated ductal)" },
      ],
      sources: [
        { doctor: "Dr Tahiliani (Oncology)", date: "11 May 2026" },
        { doctor: "Dr Tahiliani (Oncology)", date: "12 May 2026" },
        { doctor: "Dr Pandya (Onco-surgery)", date: "30 Apr 2026" },
        { doctor: "Dr Pandya (Onco-surgery)", date: "4 May 2026" },
        { doctor: "Dr Pandya (Onco-surgery)", date: "11 May 2026" },
      ],
      reasoning:
        "Small (T1c), node-negative right breast cancer caught early. Surveillance is well-defined; the immediate question is anaesthetic and chemotherapy fitness given the cardio-renal-pulmonary backdrop.",
    },
    {
      title: "Co-morbidities",
      tone: "neutral",
      items: [
        { text: "**Hypertension**" },
        { text: "**Dyslipidaemia**" },
        { text: "**Ischaemic heart disease** (IHD/CAD)" },
        { text: "**CKD** (acute on chronic)" },
        { text: "**Severe Obstructive Sleep Apnea**" },
      ],
      sources: [
        { doctor: "Dr Roy (Cardiology)", date: "27 Apr 2026" },
        { doctor: "Dr Vekariya (Cardiology)", date: "27 Apr 2026" },
        { doctor: "Dr Goplani (Nephrology)", date: "29 Apr 2026" },
        { doctor: "Dr Singh (Pulmonology & Critical Care)", date: "29 Apr 2026" },
      ],
      reasoning:
        "HTN, Dyslipidaemia, and IHD form the cardiovascular substrate; CKD plus severe OSA add anaesthetic and renal-dosing constraints. All four are pre-op blockers.",
    },
    {
      title: "Surgical history",
      tone: "neutral",
      items: [{ text: "No surgical history found" }],
      sources: [],
      reasoning: "No surgical procedures on record. The breast surgery is part of the upcoming plan and has not happened yet.",
    },
    {
      title: "Allergies & safety",
      tone: "neutral",
      items: [{ text: "Allergy review not explicitly verified" }],
      sources: [],
      reasoning: "No explicit allergy verifications on record. Treat as unknown until reviewed; see Cardiology open loops.",
    },
  ],
  windowDays: 17,
  specialties: [
    {
      source: { specialty: "Oncology", author: "Dr Tahiliani", date: "12 May 2026" },
      reason: "Treatment plan being finalised this week.",
      dateRangeLabel: "11 - 12 May '26",
      consultationCount: 2,
      doctorsLabel: "Dr Nahush Tahiliani / Dr Sandeep Jain",
      // Verbatim Findings / Plan from BOTH oncology visits, attributed by
      // doctor + date so the audit trail shows each opinion distinctly.
      lines: [
        "**Findings**: **Dr Tahiliani (11 May)**: Right Breast Carcinoma — pT1cN0 stage IA, moderately differentiated invasive ductal carcinoma. ER/PR/HER2 status awaiting full IHC panel.",
        "**Findings**: **Dr Jain (12 May)**: **Concurrent with Dr Tahiliani** — pT1cN0 stage IA confirmed, resection-first pathway endorsed.",
        "**Plan**: **Dr Tahiliani (11 May)**: Post-surgical review within 7 days of resection · adjuvant decision after pathology + IHC.",
        "**Plan**: **Dr Jain (12 May)**: Re-engage jointly with Dr Tahiliani once pathology + IHC are back.",
      ],
      openLoops: [
        "Oncology requested **cardiac fitness sign-off** from Cardiology on 11 May, sign-off not yet on record",
        "Oncology requested **OSA airway plan** from Anaesthesia + Pulmonology, plan not yet documented",
      ],
      consultations: [
        {
          date: "11 May 2026",
          visitType: "OPD",
          doctor: "Dr Tahiliani",
          headline: "**T1cN0 stage IA ductal Ca** — first oncology consult after surgical referral",
          symptoms:
            "Self-detected right breast lump × 6 weeks | No nipple discharge | No skin changes | No pain | No constitutional symptoms",
          examination:
            "Right breast: 1.4 cm firm mobile mass at upper-outer quadrant, no overlying skin changes · No axillary lymphadenopathy on palpation · Left breast normal · Performance status ECOG 1",
          diagnosis:
            "**Right Breast Carcinoma — pT1cN0 stage IA, moderately differentiated invasive ductal carcinoma** (per core biopsy + staging imaging). ER/PR/HER2 status: awaiting full IHC panel.",
          investigations:
            "Core biopsy report reviewed | USG + mammogram reviewed | Pending: full IHC panel (ER/PR/HER2/Ki-67) | Baseline LFT/KFT/CBC | ECG already on file (Cardiology)",
          medications:
            "No oncology Rx initiated yet | Continue all existing co-morbidity meds (Cardiology + Nephrology regimens unchanged)",
          advice:
            "Counselled re: surgical-first pathway for early-stage HR-pending disease | NCCN T1cN0 protocol explained | Family counselling on supportive role during pre-op work-up",
          followUp:
            "Post-surgical review within 7 days of resection · adjuvant decision after pathology + IHC",
          additionalNotes:
            "Cardio-renal-pulmonary backdrop is the rate-limiting step, not the oncology decision. Coordinated MDT pathway agreed.",
        },
        {
          date: "12 May 2026",
          visitType: "OPD",
          doctor: "Dr Sandeep Jain",
          headline: "Second oncology opinion — confirms staging + plan",
          symptoms: "No new symptoms since yesterday's consult | Patient anxious about surgical timeline",
          examination:
            "Independent palpation: 1.4 cm right breast mass confirmed at same location · No nodal involvement on exam · Vitals stable",
          diagnosis:
            "**Concurrent with Dr Tahiliani** — pT1cN0 stage IA invasive ductal carcinoma, moderately differentiated. Resection-first pathway endorsed.",
          investigations: "No additional investigations beyond Dr Tahiliani's order set | IHC panel awaited",
          medications: "No change to existing regimen",
          advice:
            "Re-explained surgical timeline contingent on Cardio + Nephro + Pulmo clearances | Reassurance on stage-IA prognosis (>95% 5-yr survival)",
          followUp: "Re-engage jointly with Dr Tahiliani once pathology + IHC are back",
          additionalNotes:
            "Cross-coverage opinion captured to formalise MDT consensus before booking the surgical date.",
        },
      ],
    },
    {
      source: { specialty: "Onco-surgery", author: "Dr Pandya", date: "11 May 2026" },
      reason: "Lead surgeon, booking pending.",
      dateRangeLabel: "30 Apr - 11 May '26",
      consultationCount: 5,
      doctorsLabel: "Dr Dhara Girish Pandya",
      // Verbatim from the most recent onco-surgery visit
      // (11 May 2026, Dr Dhara Girish Pandya).
      lines: [
        "**Findings**: Right breast Ca, IA — surgical pathway confirmed | **Holding date** until Nephro contrast-protocol cleared",
        "**Plan**: Date to be booked within 3-5 days of final clearance",
      ],
      openLoops: [
        "Onco-surgery scheduled **resection** but date not yet booked in the system (held pending clearances)",
        "Onco-surgery requested **renal-dose ceiling for contrast imaging** from Nephrology on 4 May, response not yet on record",
      ],
      consultations: [
        {
          date: "30 Apr 2026",
          visitType: "OPD",
          doctor: "Dr Dhara Girish Pandya",
          headline: "Initial surgical assessment",
          symptoms: "No fresh complaints | Pre-op work-up only | Patient asymptomatic at rest",
          examination:
            "General build moderate · BP 144/86 (concerning for unmedicated HTN burst) · HR 78 · SpO₂ 96 % room air · Cardiac and respiratory exam consistent with known IHD + OSA · Breast and axillary exam as per Oncology",
          diagnosis: "Right breast Ca, pT1cN0 IA — **for resection, pending clearances**",
          investigations:
            "Pre-op CBC | KFT (CKD context) | LFT | Coag profile | Chest X-ray | ECG | 2D Echo (to coordinate with Cardiology) | Anaesthesia consult requested",
          medications: "No new Rx today | Continue existing regimen",
          advice:
            "Counselled on procedure, recovery, OSA-related anaesthetic considerations | Asked patient to bring CPAP records (if any) at next visit",
          followUp: "4 May 2026 — interim pre-op review",
          additionalNotes:
            "Surgical date intentionally not booked yet: cardio + nephro + anaesthesia clearances pending.",
        },
        {
          date: "4 May 2026",
          visitType: "OPD",
          doctor: "Dr Dhara Girish Pandya",
          headline: "Pre-op review — awaiting cardio clearance",
          symptoms: "Mild fatigue × 2 days, no chest pain or dyspnoea at rest | No new complaints",
          examination:
            "BP 138/84 · HR 76 · SpO₂ 95 % room air · No fresh murmurs · No oedema · Chest clear",
          diagnosis: "Right breast Ca, **still awaiting Cardiology sign-off + airway plan**",
          investigations:
            "Cardiology Echo report awaited | OSA-specific airway-risk note from Pulmonology / Anaesthesia awaited",
          medications: "No change",
          advice: "Patient counselled that the date will be set the day all three clearances are on file",
          followUp: "11 May 2026 — final pre-op review",
        },
        {
          date: "11 May 2026",
          visitType: "OPD",
          doctor: "Dr Dhara Girish Pandya",
          headline: "Most recent pre-op review · oncology plan now confirmed",
          symptoms: "Asymptomatic | Patient ready, anxious about delay",
          examination: "Unchanged from 4 May review · BP 140/86 (still above pre-op target) · No fresh signs",
          diagnosis:
            "Right breast Ca, IA — surgical pathway confirmed | **Holding date** until Nephro contrast-protocol cleared",
          investigations:
            "Repeat KFT requested for pre-op morning | Confirm anaesthesia airway plan in writing",
          medications: "No change today",
          advice: "Stay nil per oral discipline once date is set | Patient education re: post-op recovery + ward expectations",
          followUp: "Date to be booked within 3-5 days of final clearance",
          additionalNotes: "Onco-surgery has now received the formal oncology sign-off (Dr Tahiliani 11 May, Dr Jain 12 May).",
        },
      ],
    },
    {
      source: { specialty: "Cardiology", author: "Dr Bhavesh Roy", date: "27 Apr 2026" },
      reason: "Pre-op cardiac risk in IHD + OSA patient.",
      dateRangeLabel: "27 Apr '26",
      consultationCount: 2,
      doctorsLabel: "Dr Bhavesh Roy / Dr Ketan Vekariya",
      // Verbatim from BOTH cardiology visits (same day, cross-cover) —
      // each opinion shown distinctly.
      lines: [
        "**Findings**: **Dr Bhavesh Roy (27 Apr)**: **Known IHD on chronic regimen**, functional capacity uncertain | HTN suboptimally controlled | OSA-related airway risk co-exists.",
        "**Findings**: **Dr Vekariya (27 Apr)**: Concurs with Dr Roy — known IHD, sub-optimally controlled HTN, OSA-airway concern. Pre-op clearance pending Echo + functional capacity.",
        "**Medications**: **Dr Bhavesh Roy (27 Apr)**: Continue **Aspirin 75 mg OD** | **Rosuvastatin 10 mg OD** | **Metoprolol 25 mg BID** | Add **Telmisartan 40 mg OD** (intensify HTN control) | Plan beta-blocker uptitration after Echo.",
        "**Medications**: **Dr Vekariya (27 Apr)**: Endorses Dr Roy's regimen change.",
        "**Plan**: **Dr Bhavesh Roy (27 Apr)**: Re-review with Echo result before any surgical clearance is issued.",
        "**Plan**: **Dr Vekariya (27 Apr)**: Joint review with Dr Roy once Echo is in.",
      ],
      labResults: [
        { name: "LDL-C", value: "142", unit: "mg/dL", flag: "high", refRange: "<70 (IHD target)", date: "27 Apr 2026", note: "Above the secondary-prevention target for known IHD." },
        { name: "HDL-C", value: "32", unit: "mg/dL", flag: "low", refRange: ">40 (F)", date: "27 Apr 2026" },
        { name: "Triglycerides", value: "218", unit: "mg/dL", flag: "high", refRange: "<150", date: "27 Apr 2026" },
        { name: "NT-proBNP", value: "468", unit: "pg/mL", flag: "high", refRange: "<300 (age-adj)", date: "27 Apr 2026", note: "Mildly elevated; consistent with chronic stable IHD, no acute decompensation." },
      ],
      hiddenNormalLabCount: 6,
      openLoops: [
        "Cardiology advised a **resting Echo** on 27 Apr, no result on file",
        "Cardiology advised a **functional capacity test** on 27 Apr, no result on file",
      ],
      consultations: [
        {
          date: "27 Apr 2026",
          visitType: "OPD",
          doctor: "Dr Bhavesh Roy",
          headline: "Pre-op cardiac risk evaluation",
          symptoms:
            "**Dyspnoea on exertion grade III × 4-5 months** | No chest pain at rest | Orthopnoea + PND denied | Snoring + witnessed apnoea (OSA-suggestive)",
          examination:
            "BP **152/94** (above target on current regimen) · HR 82 regular · S1S2 normal, no murmur · Bilateral basal crepts on auscultation · No pedal oedema",
          diagnosis: "**Known IHD on chronic regimen**, functional capacity uncertain | HTN suboptimally controlled | OSA-related airway risk co-exists",
          investigations:
            "Resting 2D Echo ordered | Functional capacity test (6-min walk + treadmill) ordered | Repeat lipid + HbA1c ordered",
          medications:
            "Continue **Aspirin 75 mg OD** | **Rosuvastatin 10 mg OD** | **Metoprolol 25 mg BID** | Add **Telmisartan 40 mg OD** (intensify HTN control) | Plan beta-blocker uptitration after Echo",
          advice:
            "Low-salt diet | Continue prescribed exercise as tolerated | Bring CPAP usage data + sleep-study report at next visit",
          followUp: "Re-review with Echo result before any surgical clearance is issued",
          labResults: [
            { name: "LDL-C", value: "142", unit: "mg/dL", flag: "high", refRange: "<70 (IHD target)", date: "27 Apr 2026", note: "Above secondary-prevention target." },
            { name: "HDL-C", value: "32", unit: "mg/dL", flag: "low", refRange: ">40 (F)", date: "27 Apr 2026" },
            { name: "Triglycerides", value: "218", unit: "mg/dL", flag: "high", refRange: "<150", date: "27 Apr 2026" },
            { name: "NT-proBNP", value: "468", unit: "pg/mL", flag: "high", refRange: "<300 (age-adj)", date: "27 Apr 2026", note: "Mildly elevated; chronic stable IHD." },
          ],
          hiddenNormalCount: 6,
        },
        {
          date: "27 Apr 2026",
          visitType: "OPD",
          doctor: "Dr Ketan Vekariya",
          headline: "Second cardiology opinion — same day cross-cover",
          symptoms: "Same as Dr Roy's record — same-day review for cross-cover",
          examination: "Concurrent — BP 150/92 on repeat · No fresh findings",
          diagnosis: "Concurs with Dr Roy: known IHD, sub-optimally controlled HTN, OSA-airway concern. Pre-op clearance pending Echo + functional capacity.",
          investigations: "Endorses Dr Roy's order set | No additional investigations today",
          medications: "Endorses Dr Roy's regimen change",
          advice: "Patient counselled on the staged-clearance process",
          followUp: "Joint review with Dr Roy once Echo is in",
        },
      ],
    },
    {
      source: { specialty: "Pulmonology & Critical Care", author: "Dr Manoj Singh", date: "1 May 2026" },
      reason: "Severe OSA + airway risk for anaesthesia.",
      dateRangeLabel: "29 Apr - 1 May '26",
      consultationCount: 2,
      doctorsLabel: "Dr Manoj Singh",
      // Verbatim from the most recent pulmonology visit
      // (1 May 2026, Dr Manoj Singh).
      lines: [
        "**Findings**: Severe OSA — formal documentation still pending",
        "**Medications**: Continue **Foracort inhaler** (Budesonide 200 µg + Formoterol 6 µg) BID | Continue **Montelukast 10 mg HS** | **Hold sedatives + opioids** in peri-op window",
        "**Plan**: Joint anaesthesia + pulmonology airway-plan visit before booking date",
      ],
      openLoops: [
        "Pulmonology advised a **formal sleep study + CPAP titration** on 29 Apr, no report on file",
        "Pulmonology requested a **difficult-airway plan** from Anaesthesia, response not yet documented",
      ],
      consultations: [
        {
          date: "29 Apr 2026",
          visitType: "OPD",
          doctor: "Dr Manoj Singh",
          headline: "Initial pulmonology + sleep review",
          symptoms:
            "**Loud snoring + witnessed apnoeic episodes** × years (per spouse) | Daytime sleepiness Epworth ~14 | Morning headaches | Restless sleep | No frank orthopnoea",
          examination:
            "Body habitus modified Mallampati class III · Crowded oropharynx · Neck circumference 38 cm · Chest clear on auscultation · SpO₂ 95 % room air",
          diagnosis:
            "**Severe Obstructive Sleep Apnea** (clinical) — high pre-op airway risk | Bronchial reactivity already on inhaled controller",
          investigations:
            "**Formal Type-I polysomnography ordered** | CPAP titration to follow | ABG (room-air baseline) | CXR",
          medications:
            "Continue **Foracort inhaler** (Budesonide 200 µg + Formoterol 6 µg) BID | Continue **Montelukast 10 mg HS** | **Hold sedatives + opioids** in peri-op window",
          advice:
            "Bring any prior sleep-study reports to next visit | Sleep posture education | Notify anaesthesia of severe-OSA airway risk *in writing*",
          followUp: "1 May 2026 with sleep-study + ABG · joint airway-plan call with Anaesthesia",
        },
        {
          date: "1 May 2026",
          visitType: "OPD",
          doctor: "Dr Manoj Singh",
          headline: "Follow-up · airway plan still pending",
          symptoms: "No interval change in OSA symptoms | No fresh respiratory complaints",
          examination: "Unchanged from 29 Apr review · Chest clear · SpO₂ 96 % room air",
          diagnosis: "Severe OSA — formal documentation still pending",
          investigations: "Sleep-study report **not yet retrieved** | ABG done, awaited",
          medications: "No change",
          advice: "Reinforced importance of formal CPAP titration data before surgery",
          followUp: "Joint anaesthesia + pulmonology airway-plan visit before booking date",
          additionalNotes: "**Open loop**: Anaesthesia difficult-airway plan not yet written into the record.",
        },
      ],
    },
    {
      source: { specialty: "Nephrology", author: "Dr Goplani", date: "29 Apr 2026" },
      reason: "CKD + impending IV contrast for staging.",
      dateRangeLabel: "29 Apr '26",
      consultationCount: 1,
      doctorsLabel: "Dr Kamal Goplani",
      // Verbatim from the most recent nephrology visit
      // (29 Apr 2026, Dr Kamal Goplani).
      lines: [
        "**Findings**: **Acute-on-chronic CKD (G3b)** — baseline eGFR was ~52 in Feb, now 38 | Anaemia of chronic kidney disease (Hb 10.8) | Borderline hyperkalaemia",
        "**Medications**: Continue ACEi at current dose | Start **N-acetylcysteine 600 mg BID × 48 h** around contrast | **Avoid NSAIDs** | Renal-dose review of every current medication done (no changes needed today)",
        "**Plan**: Pre-op morning labs (creatinine + electrolytes) · Joint nephrology + onco-surgery review of clearance",
      ],
      labResults: [
        { name: "Serum Creatinine", value: "1.6", unit: "mg/dL", flag: "high", refRange: "0.6–1.1 (F)", date: "29 Apr 2026", note: "Acute-on-chronic; up from baseline 1.2 in Feb." },
        { name: "eGFR", value: "38", unit: "mL/min/1.73 m²", flag: "low", refRange: "≥90 (normal); ≥60 (G2)", date: "29 Apr 2026", note: "CKD G3b. Pre-contrast hydration mandated." },
        { name: "Urea (BUN)", value: "48", unit: "mg/dL", flag: "high", refRange: "7–20", date: "29 Apr 2026" },
        { name: "Serum Potassium", value: "5.2", unit: "mmol/L", flag: "high", refRange: "3.5–5.0", date: "29 Apr 2026", note: "Borderline. Recheck before chemo." },
        { name: "Haemoglobin", value: "10.8", unit: "g/dL", flag: "low", refRange: "12.0–15.5 (F)", date: "29 Apr 2026", note: "CKD-associated anaemia." },
      ],
      hiddenNormalLabCount: 9,
      openLoops: [
        "Nephrology advised **repeat Serum creatinine + eGFR before surgery** on 29 Apr, no result on file",
        "Nephrology advised **Urine PCR + ACR** on 29 Apr, no result on file",
      ],
      consultations: [
        {
          date: "29 Apr 2026",
          visitType: "OPD",
          doctor: "Dr Kamal Goplani",
          headline: "Pre-op renal review · acute-on-chronic CKD",
          symptoms: "No frank uraemic symptoms | Reduced urine output complaint denied | Mild fatigue, attributed to anaemia",
          examination:
            "BP 148/86 (volume status euvolaemic) · No pedal oedema · No raised JVP · Chest clear · Pallor present",
          diagnosis:
            "**Acute-on-chronic CKD (G3b)** — baseline eGFR was ~52 in Feb, now 38 | Anaemia of chronic kidney disease (Hb 10.8) | Borderline hyperkalaemia",
          investigations:
            "Repeat **Serum creatinine + eGFR pre-surgery** (and post-contrast if imaging proceeds) | **Urine ACR + PCR** | Renal USG (already done, NAD) | Iron studies + ferritin for ESA decision",
          medications:
            "Continue ACEi at current dose | Start **N-acetylcysteine 600 mg BID × 48 h** around contrast | **Avoid NSAIDs** | Renal-dose review of every current medication done (no changes needed today)",
          advice:
            "**Pre + post-contrast hydration protocol** scripted: 1 mL/kg/h NS for 12 h before + 12 h after contrast | Patient counselled to maintain oral intake | Monitor urine output post-op",
          followUp: "Pre-op morning labs (creatinine + electrolytes) · Joint nephrology + onco-surgery review of clearance",
          labResults: [
            { name: "Serum Creatinine", value: "1.6", unit: "mg/dL", flag: "high", refRange: "0.6–1.1 (F)", date: "29 Apr 2026", note: "Up from baseline 1.2 in Feb." },
            { name: "eGFR", value: "38", unit: "mL/min/1.73 m²", flag: "low", refRange: "≥60 (G2)", date: "29 Apr 2026", note: "CKD G3b." },
            { name: "Urea (BUN)", value: "48", unit: "mg/dL", flag: "high", refRange: "7–20", date: "29 Apr 2026" },
            { name: "Serum Potassium", value: "5.2", unit: "mmol/L", flag: "high", refRange: "3.5–5.0", date: "29 Apr 2026", note: "Borderline." },
            { name: "Haemoglobin", value: "10.8", unit: "g/dL", flag: "low", refRange: "12.0–15.5 (F)", date: "29 Apr 2026" },
          ],
          hiddenNormalCount: 9,
          additionalNotes:
            "Nephrology endorses surgery contingent on the hydration protocol being run AND a safer contrast volume cap (≤ 50 mL non-ionic).",
        },
      ],
    },
  ],
  collisions: [
    {
      kind: "coordination-gap",
      title: "**Pre-op cardiac fitness in IHD + Severe OSA**, sign-off chain incomplete",
      points: [
        "Cardiology last seen 27 Apr; Onco-surgery booking pending.",
        "OSA airway plan + cardiac functional capacity both unreconciled.",
        "Surgery cannot proceed safely without these closed.",
      ],
      rule: {
        body: "ASA / DAS",
        year: "2023",
        section: "Pre-op CV + airway",
        readableBody: "American Society of Anesthesiologists + Difficult Airway Society — the joint US standard for pre-operative cardiovascular and airway risk assessment.",
        description: "Defines the cardiac functional-capacity test and the difficult-airway plan that should be on file before any non-emergency surgery in patients with known IHD or severe OSA.",
        whyPicked: "Ms Iyer has documented Ischaemic Heart Disease (Cardiology on 27 Apr 2026) AND clinically Severe Obstructive Sleep Apnea (Pulmonology on 29 Apr + 1 May 2026). Her surgical date can't be booked until both teams produce a signed clearance — ASA/DAS makes that pairing mandatory, not optional.",
        fetches: "Whether the cardiac functional-capacity result is on file, and whether anaesthesia has written a difficult-airway plan.",
        confidence: "established",
      },
    },
    {
      kind: "coordination-gap",
      title: "**CKD before contrast staging imaging**, pre-hydration + nephro-dose review pending",
      points: [
        "Nephrology saw 29 Apr; baseline eGFR + ACR not yet resulted.",
        "Contrast-enhanced CT / PET-CT for staging may follow.",
        "Hydration + N-acetylcysteine protocol not documented.",
      ],
      rule: {
        body: "KDIGO",
        year: "2024",
        section: "§4.3.1",
        readableBody: "Kidney Disease Improving Global Outcomes — the international nephrology body whose CKD + AKI guidelines are the de-facto global standard.",
        description: "Defines when an eGFR is low enough that contrast-CT or contrast-MRI shouldn't go ahead without an explicit hydration protocol and a renal-dose review of every concurrent medication.",
        whyPicked: "Ms Iyer's eGFR dropped to 38 mL/min/1.73 m² on 29 Apr 2026 (was 52 in Feb) — CKD G3b with an acute-on-chronic insult. Her oncology pathway may need contrast staging imaging next, and KDIGO §4.3.1 mandates the pre + post-contrast hydration protocol and the renal-dose review before that proceeds.",
        fetches: "Whether her latest eGFR meets the CKD threshold for contrast-AKI prevention, and whether the hydration protocol is scripted.",
        confidence: "established",
      },
    },
  ],
  pendingMdtItems: [
    "Surgery date, pending clearance from Cardio + Nephro + Pulmo.",
    "Confirm allergy status before pre-op antibiotics.",
    "Baseline eGFR + ACR results needed for contrast risk.",
    "CPAP titration record before anaesthesia.",
  ],
  syntheses: [
    {
      panelTitle: "NCCN breast-cancer surveillance setup",
      guideline: {
        body: "NCCN",
        year: "2024",
        readableBody: "National Comprehensive Cancer Network — the standard US oncology guideline body, widely followed in Indian oncology practice too.",
        description: "Sets the standard pathway for early-stage breast-cancer staging, surgical sequencing, and adjuvant-therapy decision logic.",
        whyPicked: "Ms Iyer has pT1cN0 stage IA invasive ductal carcinoma confirmed on biopsy and imaging — NCCN Breast Cancer protocol explicitly covers this exact stage with a surgery-first pathway and an adjuvant decision deferred to post-resection pathology.",
        fetches: "Her assigned stage, the surgical-date status, and the adjuvant decision-point downstream.",
        confidence: "established",
      },
      rows: [
        { label: "Stage", value: "IA (T1cN0)", ref: "From oncology condition rows on 11-12 May 2026.", tone: "ok" },
        { label: "Surgical date", value: "Pending", ref: "No booking row in visit_occurrence.", tone: "warn" },
        { label: "Adjuvant pathway", value: "Awaiting pathology", ref: "Decision deferred to post-resection.", tone: "ok" },
      ],
      note: "Standard NCCN T1cN0 pathway, surgery first, adjuvant decision post-pathology.",
    },
  ],
  freshness: "Synced just now",
}

// ═════════════════════════════════════════════════════════════════════════
// ASHA_KRISHNAN_BRIEF_MOCK  ·  P3 · person_id 375391871728 · F · 57
// ─────────────────────────────────────────────────────────────────────────
// Scenario: very narrow specialty footprint (4 providers over 59 visits).
// Intentionally a SPARSE brief — demonstrates the design's behaviour when
// there isn't a multi-team complexity to surface.
// ═════════════════════════════════════════════════════════════════════════
export const ASHA_KRISHNAN_BRIEF_MOCK: VeloraV0MdtBriefData = {
  patientName: "Asha Krishnan",
  patientMeta: "F, 57y",
  patientGender: "F",
  patientAge: 57,
  patientMobile: "+91 98765 71728",
  patientId: "375391871728",
  medicalHistory: [
    {
      title: "Primary problem",
      tone: "primary",
      items: [{ text: "**Hypertension** (chronic, anchor diagnosis)" }],
      sources: [
        { doctor: "Dr Raj Changela (Internal Medicine)", date: "12 Apr 2025" },
        { doctor: "Dr Raj Changela (Internal Medicine)", date: "8 Sep 2025" },
        { doctor: "Dr Raj Changela (Internal Medicine)", date: "21 Mar 2026" },
      ],
      reasoning: "Hypertension is the chronic anchor diagnosis. The rest of the record is intercurrent acute events.",
    },
    {
      title: "Co-morbidities",
      tone: "neutral",
      items: [{ text: "No additional chronic conditions on record" }],
      sources: [],
      reasoning: "Apart from hypertension, no other chronic conditions have been documented in this patient's consultations.",
    },
    {
      title: "Surgical history",
      tone: "neutral",
      items: [{ text: "**Left tendoachilles repair** (prior to current consultations)" }],
      sources: [
        { doctor: "Dr Yatin Desai (Orthopaedics)", date: "10 May 2025" },
        { doctor: "Dr Yatin Desai (Orthopaedics)", date: "15 Aug 2025" },
      ],
      reasoning: "Surgery happened before the current consultation period. Only post-op follow-up under Dr Yatin Desai is recorded in the current record.",
    },
    // Acute episodes (recurrent viral URI / fever) intentionally NOT carried
    // in Medical history — those are intercurrent events, not chronic history.
    // The 6-episode pattern surfaces in the ENT + Internal Medicine specialty
    // sections instead, which is where episodic events belong.
    {
      title: "Allergies & safety",
      tone: "neutral",
      items: [{ text: "Allergy review not on file (prescriptions made without documented status)" }],
      sources: [],
      reasoning: "Every prescription in this patient's record was issued without an allergy entry. Highest-priority gap to close.",
    },
  ],
  windowDays: 380,
  specialties: [
    {
      source: { specialty: "Internal Medicine", author: "Dr Raj Changela", date: "21 Mar 2026" },
      reason: "Anchor team, 40 visits with Dr Raj Changela across the window.",
      dateRangeLabel: "12 Apr '25 - 21 Mar '26",
      consultationCount: 40,
      doctorsLabel: "Dr Raj Changela",
      // Verbatim from the most recent Internal Medicine visit
      // (21 Mar 2026, Dr Raj Changela).
      lines: [
        "**Findings**: HTN stable | History of recurrent viral URI (≥ 3 per year)",
        "**Medications**: Continue Amlodipine 5 + Telmisartan 40",
        "**Plan**: After 3 months · sooner if any fresh URI episode",
      ],
      openLoops: [
        "Internal Medicine prescribed multiple courses without first **documenting allergy status**, allergy review still pending",
      ],
      // Three representative visits across the 40-visit window — an HTN
      // baseline review, a viral-fever episode, and the most-recent visit.
      consultations: [
        {
          date: "12 Apr 2025",
          visitType: "OPD",
          doctor: "Dr Raj Changela",
          headline: "Routine **HTN baseline review** — regimen continuation",
          symptoms: "No active complaints | BP diary maintained at home | Adherent to meds | Mild headache occasionally on hot days",
          examination: "BP 138/86 (3-reading average) | HR 78 | BMI 26.4 | Cardio-respiratory exam normal | No pedal oedema | Fundus not examined today",
          diagnosis: "**Essential Hypertension**, stage 1 — adequately controlled on current regimen",
          investigations: "Renal function · Electrolytes · Lipid profile · ECG (annual cadence)",
          medications: "**Amlodipine 5 mg OD** continued | **Telmisartan 40 mg OD** continued | No new additions",
          advice: "DASH-style diet | < 5 g salt/day | Daily walking 30 min | Home BP twice weekly | Return immediately if BP > 160/100 or any chest discomfort",
          followUp: "After 3 months · or sooner if symptoms",
          additionalNotes: "**No allergy review documented at this visit** — gap noted at brief level.",
        },
        {
          date: "8 Sep 2025",
          visitType: "OPD",
          doctor: "Dr Raj Changela",
          headline: "**Viral fever** episode — 5th URI of the year",
          symptoms: "Fever 100.8 °F × 2 days | Sore throat | Mild cough | Body aches | No SOB | No GI symptoms",
          examination: "T 100.4 °F | HR 92 | BP 128/82 | Throat congested, no exudate | Chest clear | No lymphadenopathy",
          diagnosis: "**Acute viral URI** | Background HTN, stable",
          investigations: "Symptomatic if fever > 5 days → CBC, Dengue NS1 + IgM, Malaria smear",
          medications: "**Paracetamol 500 mg q6h PRN** | **Levocetirizine 5 mg HS × 5 days** | **Cough syrup** dextromethorphan-based | Adequate hydration | Salt-water gargles BD",
          advice: "Bed rest × 2-3 days | Return if fever > 5 days, breathlessness, or any haemoptysis",
          followUp: "PRN if no improvement in 5 days",
          additionalNotes: "**Repeat allergy review pending**: no entry in record despite this being the 5th URI episode this year.",
        },
        {
          date: "21 Mar 2026",
          visitType: "OPD",
          doctor: "Dr Raj Changela",
          headline: "Most recent visit · HTN review + recurrent-URI counselling",
          symptoms: "No active fever | HTN diary continued | Slight fatigue post latest URI episode",
          examination: "BP 132/82 | HR 76 | No fresh findings on systems review",
          diagnosis: "HTN stable | History of recurrent viral URI (≥ 3 per year)",
          investigations: "Repeat CBC · ESR · CRP · Immunoglobulin profile if frequency persists",
          medications: "Continue Amlodipine 5 + Telmisartan 40",
          advice: "Annual influenza vaccination | Vitamin D 60K monthly × 3 months (if deficient on screen) | Avoid crowded indoor spaces during flu season",
          followUp: "After 3 months · sooner if any fresh URI episode",
        },
      ],
    },
    {
      source: { specialty: "Orthopaedics", author: "Dr Yatin Desai", date: "15 Aug 2025" },
      reason: "Post Achilles-repair follow-up series under Dr Yatin Desai.",
      dateRangeLabel: "10 May - 15 Aug '25",
      consultationCount: 8,
      doctorsLabel: "Dr Yatin Desai",
      // Verbatim from the most recent orthopaedics visit
      // (15 Aug 2025, Dr Yatin Desai — the 3-month milestone review).
      lines: [
        "**Findings**: Achilles repair, **good functional recovery at 3 months** — continue rehab",
        "**Medications**: No active pain meds",
        "**Plan**: 6-month review — final discharge if functional recovery complete",
      ],
      consultations: [
        {
          date: "10 May 2025",
          visitType: "OPD",
          doctor: "Dr Yatin Desai",
          headline: "**Immediate post-op review** — Left Achilles repair, suture inspection (week 2)",
          symptoms: "Mild discomfort at operative site | Limited ankle dorsiflexion | No fever | No fresh swelling",
          examination: "Operative wound clean, dry, no discharge | Sutures intact | Distal pulses palpable | No erythema | Cast intact",
          diagnosis: "Status post **Left Achilles tendon repair**, healing as expected — week 2",
          investigations: "Wound inspection only today",
          medications: "Paracetamol 500 mg PRN for pain | Pantoprazole 40 mg OD × 2 weeks | No NSAIDs",
          advice: "Non-weight-bearing × 4 more weeks | Cast care education | Watch for fever, calf swelling (DVT) | Daily quad isometrics",
          followUp: "Week 4 — suture removal + cast change",
        },
        {
          date: "15 Aug 2025",
          visitType: "OPD",
          doctor: "Dr Yatin Desai",
          headline: "**3-month milestone (week 12)** — progressive weight bearing + physio review",
          symptoms: "Comfortable | Walking with mild ankle stiffness | No pain at rest | Stair climbing limited",
          examination: "Operative scar well-healed | Mild ankle dorsiflexion deficit | Strength 4+/5 plantarflexion | Calf girth slightly reduced",
          diagnosis: "Achilles repair, **good functional recovery at 3 months** — continue rehab",
          investigations: "No fresh imaging today",
          medications: "No active pain meds",
          advice: "**Progressive weight bearing** as tolerated | Continue physio 2-3 sessions/week | Heel-raise exercises × 30 reps BD | Return to non-impact sport at 6 months",
          followUp: "6-month review — final discharge if functional recovery complete",
        },
      ],
    },
    {
      source: { specialty: "ENT", author: "Dr Lav Selarka", date: "14 Feb 2026" },
      reason: "Recurrent URI episodes managed by Dr Lav Selarka.",
      dateRangeLabel: "5 Jun '25 - 14 Feb '26",
      consultationCount: 6,
      doctorsLabel: "Dr Lav Selarka",
      // Verbatim from the most recent ENT visit (14 Feb 2026, Dr Lav Selarka).
      lines: [
        "**Findings**: **Acute viral pharyngitis** (3rd episode this calendar year)",
        "**Medications**: **Betadine gargles BD × 5 days** | Paracetamol PRN | Levocetirizine 5 mg HS × 5 days | Lozenges PRN",
        "**Plan**: PRN if symptoms > 7 days or any worsening",
      ],
      consultations: [
        {
          date: "14 Feb 2026",
          visitType: "OPD",
          doctor: "Dr Lav Selarka",
          headline: "Most recent ENT visit · **acute viral pharyngitis** (6th URI of the year)",
          symptoms: "Sore throat × 3 days | Mild fever | Painful swallowing | Hoarse voice | No SOB | No drooling",
          examination: "Throat: pharyngeal congestion, no tonsillar exudate | No cervical lymphadenopathy | Ears clear | Anterior rhinoscopy: mild congestion",
          diagnosis: "**Acute viral pharyngitis** (3rd episode this calendar year)",
          investigations: "Throat swab not routinely needed | If episodes ≥ 5/year → immunological workup recommended",
          medications: "**Betadine gargles BD × 5 days** | Paracetamol PRN | Levocetirizine 5 mg HS × 5 days | Lozenges PRN",
          advice: "Voice rest | Adequate hydration | Avoid cold drinks | Steam inhalation BD",
          followUp: "PRN if symptoms > 7 days or any worsening",
          additionalNotes: "Pattern across the window: 6 visits, all viral pattern, no bacterial trigger documented. No allergy work-up done despite Levocetirizine and antibiotic exposure across the year.",
        },
      ],
    },
  ],
  collisions: [
    {
      kind: "coordination-gap",
      title: "**Allergy status missing across all Rx**, entire record lacks allergy verification",
      points: [
        "182 prescription records; zero allergy verification rows in condition_occurrence.",
        "Each new Rx assumes no allergy. Risk compounds with every prescription.",
      ],
      rule: {
        body: "WHO HEARTS",
        year: "2023",
        section: "Primary-care Rx safety",
        readableBody: "World Health Organization HEARTS — the WHO primary-care implementation package for cardiovascular and prescribing safety in low-and-middle-income-country settings.",
        description: "Sets the baseline that every primary-care prescription must be preceded by a documented allergy review (drug + food + contrast as applicable).",
        whyPicked: "Ms Krishnan has 182 prescription records across the consultation window and zero matching allergy-verification rows. Every new Rx is therefore being written on an unverified safety premise, and the risk compounds with each addition.",
        fetches: "Whether any of the 182 prescriptions has a paired allergy-review entry.",
        confidence: "established",
      },
    },
  ],
  pendingMdtItems: [
    "Document allergy status at next visit (drug + food + contrast).",
    "Workup recurrent viral fevers if frequency ≥ 3/year continues.",
  ],
  syntheses: [
    {
      panelTitle: "Primary-care HTN bundle",
      guideline: {
        body: "WHO HEARTS",
        year: "2023",
        readableBody: "World Health Organization HEARTS hypertension bundle — the WHO's primary-care BP-control package designed for outpatient settings.",
        description: "Defines the standard BP target, risk-factor screen, and lifestyle counselling that should be on file for every hypertensive primary-care patient.",
        whyPicked: "Ms Krishnan carries Essential Hypertension across consultations, on a multi-agent anti-HTN regimen. WHO HEARTS provides the target most-followed in primary-care clinics for non-diabetic adults.",
        fetches: "Her current BP target and whether a structured BP trend is captured in measurements.",
        confidence: "supportive",
      },
      rows: [
        { label: "BP target", value: "<140/90", ref: "Standard adult target without diabetes.", tone: "ok" },
        { label: "BP trend captured", value: "No", ref: "No lab rows of type 8480-6/8462-4.", tone: "alert" },
      ],
      note: "Sparse data limits panel firing, most metrics aren't ingested.",
    },
  ],
  freshness: "Synced just now",
}

// ═════════════════════════════════════════════════════════════════════════
// MEERA_JOSHI_BRIEF_MOCK  ·  P4 · person_id 241381057447 · F · 58
// ─────────────────────────────────────────────────────────────────────────
// Scenario: dense cardio-cerebro-metabolic stack — CAD + prior CVA + DM +
// Hypothyroid + NAFLD + obesity + LSCS/TL/renal-stone surgical history.
// Demonstrates the "extensive data" case with prominent secondary-prevention
// signals.
// ═════════════════════════════════════════════════════════════════════════
export const MEERA_JOSHI_BRIEF_MOCK: VeloraV0MdtBriefData = {
  patientName: "Meera Joshi",
  patientMeta: "F, 58y",
  patientGender: "F",
  patientAge: 58,
  patientMobile: "+91 98765 57447",
  patientId: "241381057447",
  medicalHistory: [
    {
      title: "Primary problem",
      tone: "primary",
      items: [
        { text: "**Coronary artery disease** (CAD, on dual antiplatelet for secondary prevention)" },
        { text: "**Prior CVA** (cerebrovascular event, recovered)" },
      ],
      sources: [
        { doctor: "Dr Bhavesh Roy (Cardiology)", date: "16 Apr 2025" },
        { doctor: "Dr Bhavesh Roy (Cardiology)", date: "8 May 2025" },
        { doctor: "Dr Bhavesh Roy (Cardiology)", date: "20 Jan 2026" },
        { doctor: "Dr Tejas Modi (Gastroenterology)", date: "10 Jul 2025" },
      ],
      reasoning:
        "CAD with prior CVA in a 58-year-old female on dual antiplatelet (Aspirin plus Clopidogrel) and chronic statin. Classic secondary-prevention pattern; DAPT duration likely exceeded the optimal window for de-escalation review.",
    },
    {
      title: "Co-morbidities",
      tone: "neutral",
      items: [
        { text: "**Hypothyroidism**" },
        { text: "**Type-2 Diabetes Mellitus**" },
        { text: "**Dyslipidaemia**" },
        { text: "**Essential Hypertension**" },
        { text: "**Obesity**" },
        { text: "**NAFLD** (non-alcoholic fatty liver disease)" },
        { text: "**Recent MDR-resistant UTI** (treated with Nitrofurantoin for 1 month under Dr Shivang Sharma)" },
      ],
      sources: [
        { doctor: "Dr Nimit Shah (Diabetology)", date: "16 Apr 2025" },
        { doctor: "Dr Nimit Shah (Diabetology)", date: "9 May 2026" },
        { doctor: "Dr Payal Shah (Endocrinology)", date: "16 Feb 2026" },
        { doctor: "Dr Payal Shah (Endocrinology)", date: "27 Mar 2026" },
        { doctor: "Dr Shivang Sharma (Infectious Diseases)", date: "1-month UTI course" },
      ],
      reasoning:
        "Classic metabolic syndrome layered onto cardiovascular disease. The recent MDR UTI in a diabetic with renal-stone history is a clinically significant addition; high event-recurrence risk and aggressive multi-target prevention needed.",
    },
    {
      title: "Surgical history",
      tone: "neutral",
      items: [
        { text: "**Lower-Segment Caesarean Section** (LSCS, historical)" },
        { text: "**Tubal ligation** (historical)" },
        { text: "**Renal-stone surgery** (historical)" },
      ],
      sources: [
        { doctor: "Historical context (multiple visits)", date: "prior to current consultations" },
      ],
      reasoning: "Surgical history reconstructed from consultation narrative; events happened before the current consultation period.",
    },
    {
      title: "Allergies & safety",
      tone: "neutral",
      items: [
        { text: "**No known drug allergy** (verified across 39 visits)" },
        { text: "**No known food allergy** (verified across 36 visits)" },
      ],
      sources: [
        { doctor: "Dr Nimit Shah (Diabetology)", date: "9 May 2026" },
        { doctor: "Dr Bhavesh Roy (Cardiology)", date: "20 Jan 2026" },
        { doctor: "Dr Tejas Modi (Gastroenterology)", date: "9 May 2026" },
        { doctor: "Dr Nikhil Dave (Neurology)", date: "26 Mar 2026" },
        { doctor: "Dr Payal Shah (Endocrinology)", date: "27 Mar 2026" },
      ],
      reasoning: "Strong absence-of-allergy signal across many independent verifications from 5 specialty teams. Safe to prescribe contrast, antibiotics, and NSAIDs without further screening.",
    },
  ],
  windowDays: 388,
  specialties: [
    {
      source: { specialty: "Diabetology", author: "Dr Nimit Shah", date: "9 May 2026" },
      reason: "Anchor chronic-care team.",
      dateRangeLabel: "16 Apr '25 - 9 May '26",
      consultationCount: 11,
      doctorsLabel: "Dr Nimit Shah",
      // Verbatim from the most recent diabetology visit
      // (9 May 2026, Dr Nimit Shah).
      lines: [
        "**Findings**: T2DM, **sub-optimal control (HbA1c 8.2%)** | Early **diabetic nephropathy** (ACR 78) | Suspected early peripheral neuropathy",
        "**Medications**: **Continue Amaryl M 1 BID** | **Plan SGLT2-i add-on next visit** (renal-protective in light of ACR) | Continue Feburic 40 | Continue Thyronorm 75 | **Discuss reconciliation of Glimepiride duplicate** with Cardiology team",
        "**Plan**: After 1 month · earlier if any hypoglycaemia symptoms",
      ],
      labResults: [
        { name: "HbA1c", value: "8.2", unit: "%", flag: "high", refRange: "<7.0 (target)", date: "9 May 2026", note: "Above ADA target. Consider regimen step-up." },
        { name: "FPG", value: "168", unit: "mg/dL", flag: "high", refRange: "70–110", date: "9 May 2026" },
        { name: "PPG (2-h)", value: "242", unit: "mg/dL", flag: "high", refRange: "<180", date: "9 May 2026" },
        { name: "Urine ACR", value: "78", unit: "mg/g", flag: "high", refRange: "<30", date: "9 May 2026", note: "Microalbuminuria — early diabetic nephropathy." },
        { name: "Serum Uric Acid", value: "7.8", unit: "mg/dL", flag: "high", refRange: "2.4–5.7 (F)", date: "9 May 2026", note: "On Febuxostat." },
      ],
      hiddenNormalLabCount: 8,
      consultations: [
        {
          date: "16 Apr 2025",
          visitType: "OPD",
          doctor: "Dr Nimit Shah",
          headline: "Baseline T2DM review — annual cadence visit",
          symptoms: "No active complaints | Polyuria settled | Sleep good | No tingling LL",
          examination: "BMI 28.6 | BP 134/82 | Fundus: no DR seen | Foot exam: normal sensation, palpable pulses",
          diagnosis: "**Type-2 Diabetes Mellitus** on dual oral therapy | Hypothyroidism, stable | Hyperuricaemia controlled on Febuxostat",
          investigations: "HbA1c · FPG · PPG · Lipid panel · TSH · Urine ACR · Serum creatinine",
          medications: "Continue **Amaryl M 1 BID** | Continue **Feburic 40 OD** | Continue **Thyronorm 75 OD** | **FDson Total OD** (multivitamin)",
          advice: "Continue DASH-style diet | Walk 10K steps/day | SMBG twice weekly",
          followUp: "After 3 months · or sooner if symptoms",
        },
        {
          date: "9 May 2026",
          visitType: "OPD",
          doctor: "Dr Nimit Shah",
          headline: "**Most recent review** — HbA1c trending up, microalbuminuria detected",
          symptoms: "Mild fatigue | No osmotic symptoms | Diet less disciplined last 3 months | Tingling in toes occasionally",
          examination: "BMI 28.9 (+0.3 since last) | BP 138/86 | Fundus: scheduled with eye-clinic next week | Monofilament: mildly reduced sensation big-toes bilaterally",
          diagnosis: "T2DM, **sub-optimal control (HbA1c 8.2%)** | Early **diabetic nephropathy** (ACR 78) | Suspected early peripheral neuropathy",
          investigations: "Repeat HbA1c · FPG · PPG · Urine ACR (today) | eGFR · LFT · Lipid · TSH",
          medications:
            "**Continue Amaryl M 1 BID** | **Plan SGLT2-i add-on next visit** (renal-protective in light of ACR) | Continue Feburic 40 | Continue Thyronorm 75 | **Discuss reconciliation of Glimepiride duplicate** with Cardiology team",
          advice:
            "Resume strict diet | SMBG diary needed at next visit | Eye-clinic dilated fundus mandatory | Refer to Diabetic-Foot clinic for neuropathy assessment",
          followUp: "After 1 month · earlier if any hypoglycaemia symptoms",
          labResults: [
            { name: "HbA1c", value: "8.2", unit: "%", flag: "high", refRange: "<7.0", date: "9 May 2026" },
            { name: "FPG", value: "168", unit: "mg/dL", flag: "high", refRange: "70–110", date: "9 May 2026" },
            { name: "Urine ACR", value: "78", unit: "mg/g", flag: "high", refRange: "<30", date: "9 May 2026", note: "Microalbuminuria — start ARB if not already." },
          ],
          hiddenNormalCount: 10,
          additionalNotes:
            "Glimepiride duplicate (Amaryl M from us + Amaryl 1 from Cardiology) recognised today — formal cross-team note sent for reconciliation.",
        },
      ],
    },
    {
      source: { specialty: "Cardiology", author: "Dr Bhavesh Roy", date: "20 Jan 2026" },
      reason: "Secondary prevention post-CVA + CAD on DAPT.",
      dateRangeLabel: "16 Apr '25 - 20 Jan '26",
      consultationCount: 8,
      doctorsLabel: "Dr Bhavesh Roy",
      // Verbatim from the most recent cardiology visit
      // (20 Jan 2026, Dr Bhavesh Roy).
      lines: [
        "**Findings**: CAD + post-CVA — **DAPT-duration review overdue per ESC 2024** | Sub-optimal BP on multi-drug regimen",
        "**Medications**: Continue **Aspirin 75 mg OD** | **Hold formal Clopidogrel review** — discuss de-escalation at the very next visit | Switch **Telma 40** to **Telma H** (Telmisartan + HCT) for BP control",
        "**Plan**: **Within 4 weeks — DAPT de-escalation visit (not yet booked, flagged)**",
      ],
      labResults: [
        { name: "LDL-C", value: "98", unit: "mg/dL", flag: "high", refRange: "<70 (post-CVA target)", date: "20 Jan 2026", note: "Above the secondary-prevention LDL target." },
        { name: "Office BP", value: "148/92", unit: "mmHg", flag: "high", refRange: "<130/80 (DM + CVA)", date: "20 Jan 2026", note: "Above target on Telma + Telma H." },
      ],
      hiddenNormalLabCount: 4,
      openLoops: [
        "Cardiology has not booked a **DAPT de-escalation review** despite > 12 months on dual antiplatelet, review still pending",
        "Cardiology advised periodic **lipid panel** review, no result on file in the current window",
      ],
      consultations: [
        {
          date: "8 May 2025",
          visitType: "OPD",
          doctor: "Dr Bhavesh Roy",
          headline: "Routine secondary-prevention review · 1-year post-CVA",
          symptoms: "No fresh chest pain | No SOB | No fresh focal deficit | Sleep good",
          examination: "BP 142/88 | HR 70 (β-blocker effect) | No murmur | No carotid bruit | Neuro screening unchanged from baseline",
          diagnosis: "**CAD + post-CVA secondary prevention**, regimen continued | Sub-optimal BP control",
          investigations: "Lipid panel · HbA1c · KFT · ECG · 2D Echo (annual)",
          medications: "Continue **Rozavel A 10/75** (Aspirin + Rosuvastatin) | Continue **Clopilet 75** | Add **Telma 40** for BP",
          advice: "Salt restriction | Continue DAPT (12-month protocol underway) | Home BP recording",
          followUp: "After 6 months",
        },
        {
          date: "20 Jan 2026",
          visitType: "OPD",
          doctor: "Dr Bhavesh Roy",
          headline: "**Most recent review** — **DAPT now > 12 months**, BP still above target",
          symptoms: "Occasional left-shoulder vague ache, not exertional | No SOB | No new focal deficit",
          examination: "BP 148/92 (above DM + CVA target) | HR 72 | S1S2 normal, no murmur | No oedema",
          diagnosis: "CAD + post-CVA — **DAPT-duration review overdue per ESC 2024** | Sub-optimal BP on multi-drug regimen",
          investigations: "ECG done in clinic, NSR | 2D Echo scheduled | Repeat Lipid + KFT",
          medications:
            "Continue **Aspirin 75 mg OD** | **Hold formal Clopidogrel review** — discuss de-escalation at the very next visit | Switch **Telma 40** to **Telma H** (Telmisartan + HCT) for BP control",
          advice:
            "**Important**: bring patient back specifically for DAPT de-escalation discussion within 4 weeks · Strict salt | Adherence reinforced",
          followUp: "**Within 4 weeks — DAPT de-escalation visit (not yet booked, flagged)**",
          labResults: [
            { name: "LDL-C", value: "98", unit: "mg/dL", flag: "high", refRange: "<70 (post-CVA target)", date: "20 Jan 2026" },
            { name: "Office BP", value: "148/92", unit: "mmHg", flag: "high", refRange: "<130/80", date: "20 Jan 2026" },
          ],
          hiddenNormalCount: 6,
          additionalNotes: "**Open loop**: the DAPT-review visit hasn't been booked in the system as of today. Aspirin + Clopidogrel running ~10+ months.",
        },
      ],
    },
    {
      source: { specialty: "Gastroenterology", author: "Dr Tejas Modi", date: "9 May 2026" },
      reason: "Chronic constipation + NAFLD management.",
      dateRangeLabel: "10 Jul '25 - 9 May '26",
      consultationCount: 5,
      doctorsLabel: "Dr Tejas Modi",
      // Verbatim from the most recent GI visit (9 May 2026, Dr Tejas Modi).
      lines: [
        "**Findings**: **Chronic functional constipation** (~3 years) | **NAFLD** on routine LFT surveillance",
        "**Medications**: Continue **Softovac (Ispaghula)** PRN | **Pruvict 1 mg OD** | **Cremaffin Plus 15 mL HS** PRN | **Bistide 3 mg OD** (Plecanatide) | Lifestyle measures",
        "**Plan**: After 6 months · sooner if any alarm features",
      ],
      consultations: [
        {
          date: "9 May 2026",
          visitType: "OPD",
          doctor: "Dr Tejas Modi",
          headline: "Most recent review · **chronic constipation + NAFLD surveillance**",
          symptoms: "Bowel movements 2-3 per week | Hard stools | Mild bloating | No PR bleeding | No weight loss | No fresh epigastric pain",
          examination: "BMI 28.9 | Soft abdomen, no organomegaly clinically | No flank tenderness | DRE: empty rectal vault, no mass",
          diagnosis: "**Chronic functional constipation** (~3 years) | **NAFLD** on routine LFT surveillance",
          investigations: "LFT every 6 months · Lipid panel · USG abdomen annually · Colonoscopy if any alarm symptom",
          medications:
            "Continue **Softovac (Ispaghula)** PRN | **Pruvict 1 mg OD** | **Cremaffin Plus 15 mL HS** PRN | **Bistide 3 mg OD** (Plecanatide) | Lifestyle measures",
          advice: "**25-30 g fibre/day** | Adequate hydration (≥ 2 L/day) | Daily walking | Reduce processed foods | Alarm symptoms education (PR bleed, weight loss, anorexia) | Vaccination against Hep A + B given NAFLD background",
          followUp: "After 6 months · sooner if any alarm features",
        },
      ],
    },
    {
      source: { specialty: "Neurology", author: "Dr Nikhil Dave", date: "26 Mar 2026" },
      reason: "Headache evaluation post-CVA.",
      dateRangeLabel: "10 Sep '25 - 26 Mar '26",
      consultationCount: 5,
      doctorsLabel: "Dr Sowani / Dr Nikhil Dave",
      // Verbatim from the most recent neurology visit
      // (26 Mar 2026, Dr Nikhil Dave).
      lines: [
        "**Findings**: Chronic tension-type headache, **clinically stable** | Post-CVA, no fresh signs",
        "**Medications**: Continue Paracetamol PRN | No fresh additions",
        "**Plan**: After 3 months · with MRI report",
      ],
      openLoops: ["Neurology likely advised **follow-up MRI brain** post-CVA, no report on file"],
      consultations: [
        {
          date: "10 Sep 2025",
          visitType: "OPD",
          doctor: "Dr Sowani",
          headline: "Initial post-CVA headache assessment — first neurology visit this window",
          symptoms: "**Chronic dull headache × 3 months** | Worse at end of day | No nausea, no vomiting | No visual disturbance | No fresh focal deficit | Sleep adequate",
          examination: "Vitals stable | Higher mental functions intact | Cranial nerves intact | Power 5/5 all limbs | Sensory intact | Coordination intact | Cerebellar signs absent",
          diagnosis: "**Chronic tension-type headache** on a post-CVA substrate — no fresh focal sign",
          investigations: "**MRI brain advised** (rule out recurrent ischaemia / fresh lesion) · Renal function · ECG",
          medications: "**Paracetamol 500 mg PRN** for headache | Continue background CVA + CAD regimen (Cardiology)",
          advice: "Headache diary | Trigger identification | Avoid OTC NSAIDs given DAPT background | Return immediately if any motor / sensory / speech change",
          followUp: "After 6 months · sooner if symptom escalation",
        },
        {
          date: "26 Mar 2026",
          visitType: "OPD",
          doctor: "Dr Nikhil Dave",
          headline: "Most recent visit · headache pattern stable, MRI **still not on file**",
          symptoms: "Headache frequency reduced ~30 % | No fresh complaints | No tingling | Mood stable",
          examination: "Unchanged from September baseline | Neuro exam normal",
          diagnosis: "Chronic tension-type headache, **clinically stable** | Post-CVA, no fresh signs",
          investigations: "**MRI brain — still advised, not yet done** (open loop)",
          medications: "Continue Paracetamol PRN | No fresh additions",
          advice: "**Strongly re-advised to complete MRI brain** within 4 weeks · Continue headache diary",
          followUp: "After 3 months · with MRI report",
          additionalNotes: "Open loop persists — MRI brain advised 10 Sep 2025, re-advised 26 Mar 2026; report still not on file.",
        },
      ],
    },
    {
      source: { specialty: "Endocrinology", author: "Dr Payal Shah", date: "27 Mar 2026" },
      reason: "High PTH workup + thyroid optimisation.",
      dateRangeLabel: "16 Feb - 27 Mar '26",
      consultationCount: 4,
      doctorsLabel: "Dr Payal Shah",
      // Verbatim from the most recent endocrinology visit
      // (27 Mar 2026, Dr Payal Shah).
      lines: [
        "**Findings**: **Primary hyperparathyroidism (PHPT) confirmed biochemically** — PTH 118 with Ca 10.8 and Vit D deficiency | Over-replaced hypothyroidism on T3 + T4 (TSH 0.18)",
        "**Medications**: **Stop Linorma T3** (over-replacement) | **Continue Thyronorm 75 OD** alone | **Vit D 60K weekly × 8 weeks** loading | **Calcitriol 0.25 mcg OD** continued | Hydration | Avoid thiazide diuretics in HTN regimen",
        "**Plan**: After 8 weeks · with all imaging + repeat PTH + Vit D + Ca",
      ],
      labResults: [
        { name: "PTH (intact)", value: "118", unit: "pg/mL", flag: "high", refRange: "15–65", date: "27 Mar 2026", note: "Primary hyperparathyroidism workup trigger." },
        { name: "Serum Calcium (corrected)", value: "10.8", unit: "mg/dL", flag: "high", refRange: "8.5–10.2", date: "27 Mar 2026" },
        { name: "Vitamin D (25-OH)", value: "18", unit: "ng/mL", flag: "low", refRange: "30–100", date: "27 Mar 2026", note: "Deficient; replete before PTH re-check." },
        { name: "TSH", value: "0.18", unit: "µIU/mL", flag: "low", refRange: "0.4–4.0", date: "27 Mar 2026", note: "On combined T3 + T4; over-replaced." },
      ],
      hiddenNormalLabCount: 5,
      openLoops: [
        "Endocrinology advised **primary hyperparathyroidism workup**, completion status (DEXA, neck USG, sestamibi) not yet on file",
        "Endocrinology advised periodic **PTH + Vit D + calcium**, no structured result row on file",
      ],
      consultations: [
        {
          date: "16 Feb 2026",
          visitType: "OPD",
          doctor: "Dr Payal Shah",
          headline: "First endocrinology visit · **elevated PTH** picked up on screening",
          symptoms: "No fresh bone pain | History of renal calculi ~15 years back, no recurrence | No polyuria | No abdominal pain | Mood normal",
          examination: "BMI 28.6 | BP 132/82 | No goitre | No proximal muscle weakness | No bony tenderness",
          diagnosis: "**Asymptomatic primary hyperparathyroidism, suspected** | Pre-existing hypothyroidism on T3 + T4 combination — TSH potentially over-suppressed",
          investigations: "**Repeat PTH (intact)** · Serum Ca corrected for albumin · Phosphate · 25-OH Vit D · 24-h urinary calcium · Renal USG · TSH · Free T4 · DEXA scan",
          medications: "Continue **Thyronorm 75 OD** | Continue **Linorma T3 5 mcg** | Start **Calcitriol 0.25 mcg OD** while awaiting Vit D | High-calcium dietary advice",
          advice: "Hydration to reduce renal-calculi recurrence | Low-oxalate diet | Sun exposure | Return immediately if any flank pain or bone pain",
          followUp: "27 Mar 2026 · with full lab panel",
        },
        {
          date: "27 Mar 2026",
          visitType: "OPD",
          doctor: "Dr Payal Shah",
          headline: "**Most recent visit** — diagnosis crystallising, full workup still pending",
          symptoms: "No fresh complaints | Tolerating thyroid + Vit D supplementation",
          examination: "Unchanged | BP 130/82",
          diagnosis: "**Primary hyperparathyroidism (PHPT) confirmed biochemically** — PTH 118 with Ca 10.8 and Vit D deficiency | Over-replaced hypothyroidism on T3 + T4 (TSH 0.18)",
          investigations: "**Sestamibi parathyroid scan ordered (not yet done)** | **Neck USG for parathyroid lesion (not yet done)** | DEXA scan (not yet done) | Annual 24-h urinary calcium",
          medications:
            "**Stop Linorma T3** (over-replacement) | **Continue Thyronorm 75 OD** alone | **Vit D 60K weekly × 8 weeks** loading | **Calcitriol 0.25 mcg OD** continued | Hydration | Avoid thiazide diuretics in HTN regimen",
          advice: "Once Vit D replete, repeat PTH and Ca | Surgical referral for parathyroidectomy decision once imaging complete",
          followUp: "After 8 weeks · with all imaging + repeat PTH + Vit D + Ca",
          labResults: [
            { name: "PTH (intact)", value: "118", unit: "pg/mL", flag: "high", refRange: "15–65", date: "27 Mar 2026" },
            { name: "Serum Calcium (corrected)", value: "10.8", unit: "mg/dL", flag: "high", refRange: "8.5–10.2", date: "27 Mar 2026" },
            { name: "Vitamin D (25-OH)", value: "18", unit: "ng/mL", flag: "low", refRange: "30–100", date: "27 Mar 2026" },
            { name: "TSH", value: "0.18", unit: "µIU/mL", flag: "low", refRange: "0.4–4.0", date: "27 Mar 2026" },
          ],
          hiddenNormalCount: 6,
          additionalNotes:
            "**Open loops**: Sestamibi scan, neck USG, and DEXA all advised — none on file. PTH workup completion is the bottleneck for the parathyroidectomy decision.",
        },
      ],
    },
  ],
  collisions: [
    {
      kind: "ddi",
      title: "**Glimepiride double-dose** across Diabetology + Cardiology",
      points: [
        "Diabetology Rx: **Amaryl M 1** (Glimepiride 1 mg + Metformin 500 mg).",
        "Cardiology Rx: **Amaryl 1** (Glimepiride 1 mg) separately.",
        "Hypoglycaemia risk in a 58-yo on β-blocker (masks symptoms).",
      ],
      rule: {
        body: "NICE",
        year: "2024",
        section: "NG28 §Glycaemic",
        readableBody: "National Institute for Health and Care Excellence — UK national clinical-practice guideline body. NG28 is its Type-2 Diabetes guideline.",
        description: "Specifies that only one sulfonylurea should be active at any time, and flags the hypoglycaemia risk that compounds when β-blockers run alongside (β-blockers mask the warning symptoms of low sugar).",
        whyPicked: "Ms Joshi is taking **Amaryl M 1 from Diabetology** (Glimepiride 1 mg + Metformin) AND **Amaryl 1 from Cardiology** (Glimepiride 1 mg) — the same sulfonylurea prescribed twice by two different teams. She is 58, also on a β-blocker, so the hypoglycaemia would be silent.",
        fetches: "Which teams are independently prescribing the same sulfonylurea.",
        confidence: "established",
      },
    },
    {
      kind: "coordination-gap",
      title: "**DAPT duration likely exceeded**, secondary prevention review overdue",
      points: [
        "Aspirin + Clopidogrel running ~10 months with no de-escalation review.",
        "Post-CVA + chronic CCS: bleeding risk increases beyond 12 months.",
      ],
      rule: {
        body: "ESC",
        year: "2024",
        section: "Stroke + Atherothrombosis",
        readableBody: "European Society of Cardiology — Europe's principal cardiology body whose secondary-prevention guidance is widely adopted internationally.",
        description: "Sets the optimal duration of dual antiplatelet therapy (DAPT) for chronic coronary syndrome patients post-CVA, after which bleeding risk starts to outweigh the additional ischaemic protection.",
        whyPicked: "Ms Joshi has been on Aspirin + Clopidogrel for ~10 months post-CVA. ESC expects a formal de-escalation review around month 12; no such review visit appears in her record. Continuing dual antiplatelet past the de-escalation window in a 58-year-old female compounds bleeding risk without proportional benefit.",
        fetches: "How long she has been on dual antiplatelet, and whether a de-escalation review visit is on file.",
        confidence: "established",
      },
    },
    {
      kind: "ddi",
      title: "**T3 + T4 combination therapy** prescribed cross-specialty",
      points: [
        "Diabetology runs **Thyronorm** (T4); Endocrinology added **Linorma T3** (Liothyronine).",
        "Combination T3+T4 is non-guideline in stable hypothyroidism.",
      ],
      rule: {
        body: "AACE",
        year: "2022",
        section: "Hypothyroidism",
        readableBody: "American Association of Clinical Endocrinologists — US specialty body whose hypothyroidism guidance is the most-cited reference.",
        description: "Specifies that hypothyroid patients should be on Levothyroxine monotherapy unless very specific criteria are met (incomplete symptom resolution despite stable TSH, documented deiodinase polymorphism, or persistently low T3).",
        whyPicked: "Diabetology has Ms Joshi on **Thyronorm (T4 only)**, then Endocrinology added **Linorma T3** (Liothyronine) — a combined T3 + T4 regimen. The combination is non-guideline for stable hypothyroidism, and her TSH on this regimen is 0.18 (over-replaced).",
        fetches: "Which team prescribed which agent, and whether the combination-therapy criteria are documented.",
        confidence: "established",
      },
    },
  ],
  pendingMdtItems: [
    "DAPT de-escalation review with Cardiology.",
    "Reconcile glimepiride prescribing across Diabetology + Cardiology.",
    "Endocrinology + Diabetology to align on T4 monotherapy vs combination.",
    "PTH workup conclusion → parathyroidectomy decision pending.",
  ],
  syntheses: [
    {
      panelTitle: "Secondary prevention · post-CVA + CAD",
      guideline: {
        body: "ESC",
        year: "2024",
        readableBody: "European Society of Cardiology — Europe's principal cardiology body whose secondary-prevention guideline is widely adopted in Indian practice.",
        description: "Defines the antiplatelet regimen, statin intensity and BP target a diabetic CCS patient with prior CVA should be running on.",
        whyPicked: "Ms Joshi has CAD and a prior CVA, and is in the post-event chronic phase — the exact patient type this ESC guideline covers. Velora used it to check her current regimen against the secondary-prevention bundle.",
        fetches: "Whether her antiplatelet regimen, statin intensity, and BP control align with the bundle.",
        confidence: "established",
      },
      rows: [
        { label: "Antiplatelet regimen", value: "Aspirin + Clopidogrel", ref: "Both active per drug_exposure.", tone: "warn" },
        { label: "DAPT review since start", value: "Overdue", ref: "No de-escalation visit in record.", tone: "alert" },
        { label: "Statin on board", value: "Rosuvastatin (combined)", ref: "Rozavel A 10/75 active.", tone: "ok" },
      ],
      note: "Secondary-prevention regimen looks correct; the open question is DAPT duration not the agents.",
    },
  ],
  freshness: "Synced just now",
}

// ═════════════════════════════════════════════════════════════════════════
// ANITA_DESAI_BRIEF_MOCK  ·  P5 · person_id 714696991886 · F · 64
// ─────────────────────────────────────────────────────────────────────────
// Scenario: classic metabolic syndrome + severe hypertriglyceridaemia
// (TG 2898 documented) driving recurrent acute pancreatitis. Heaviest
// polypharmacy of all 5 patients. Demonstrates the "rich, high-risk" case
// where the headline number lives in narrative not measurement.
// ═════════════════════════════════════════════════════════════════════════
export const ANITA_DESAI_BRIEF_MOCK: VeloraV0MdtBriefData = {
  patientName: "Anita Desai",
  patientMeta: "F, 64y",
  patientGender: "F",
  patientAge: 64,
  patientMobile: "+91 98765 91886",
  patientId: "714696991886",
  medicalHistory: [
    {
      title: "Primary problem",
      tone: "primary",
      items: [
        { text: "**Severe hypertriglyceridaemia** (TG 2898 mg/dL documented)" },
        { text: "**Recurrent acute pancreatitis** (13 episodes on record)" },
      ],
      sources: [
        { doctor: "Dr Ajay Choksey (Gastroenterology)", date: "11 Apr 2025" },
        { doctor: "Dr Ajay Choksey (Gastroenterology)", date: "7 May 2025" },
        { doctor: "Dr Bhavesh Roy (Cardiology)", date: "8 Sep 2025" },
        { doctor: "Dr Talati (Diabetology)", date: "13 Apr 2026" },
      ],
      reasoning:
        "TG 2898 mg/dL is in the pancreatitis-risk territory. 13 acute episodes documented. Current statin-only regimen is inadequate; fibrate or omega-3 indicated.",
    },
    {
      title: "Co-morbidities",
      tone: "neutral",
      items: [
        { text: "**Type-2 Diabetes Mellitus**" },
        { text: "**Hypertension**" },
        { text: "**Hypothyroidism**" },
        { text: "**Bronchial Asthma**" },
        { text: "**Postural hypotension**" },
        { text: "**Peripheral vertigo**" },
      ],
      sources: [
        { doctor: "Dr Navneet Shah (Internal Medicine)", date: "25 Aug 2025" },
        { doctor: "Dr Navneet Shah (Internal Medicine)", date: "11 Mar 2026" },
        { doctor: "Dr Navneet Shah (Internal Medicine)", date: "25 Mar 2026" },
        { doctor: "Dr Bhavesh Roy (Cardiology)", date: "8 Sep 2025" },
        { doctor: "Dr Bhavesh Roy (Cardiology)", date: "27 Oct 2025" },
      ],
      reasoning:
        "Classic metabolic syndrome. The asthma adds steroid-burden complexity if a flare requires bursts.",
    },
    {
      title: "Surgical history",
      tone: "neutral",
      items: [{ text: "**Past cholecystectomy** (gallbladder removed)" }],
      sources: [],
      reasoning: "Gallbladder out. Recurrent pancreatitis is therefore not gallstone-driven; metabolic origin confirmed.",
    },
    {
      title: "Allergies & safety",
      tone: "neutral",
      items: [{ text: "Allergy review not explicitly documented" }],
      sources: [],
      reasoning: "Narrative notes are now well-captured (284 entries) but allergy status was never spelled out as 'no known drug allergy' across those notes. Treat as unknown until reviewed at next visit.",
    },
  ],
  windowDays: 517,
  specialties: [
    {
      source: { specialty: "Internal Medicine", author: "Dr Navneet Shah", date: "25 Mar 2026" },
      reason: "Anchor team coordinating CV + metabolic + endocrine.",
      dateRangeLabel: "25 Aug '25 - 25 Mar '26",
      consultationCount: 8,
      doctorsLabel: "Dr Navneet Shah / Dr Nanavaty",
      // Verbatim across the three IM visits — Dr Navneet Shah ran the
      // acute TG-2898 intervention + 6-day follow-up; Dr Nanavaty ran
      // the consolidation review.
      lines: [
        "**Findings**: **Dr Navneet Shah (11 Mar)**: **Severe hypertriglyceridaemia (TG 2898)** — pancreatitis-risk territory | Uncontrolled DM (HbA1c 8.5%) | Pre-existing HTN, sub-optimal control.",
        "**Findings**: **Dr Navneet Shah (17 Mar)**: Hypertriglyceridaemia — **dramatic biochemical response**, still well above target | Pancreatitis risk still elevated, less acute.",
        "**Findings**: **Dr Nanavaty (25 Mar)**: Severe hypertriglyceridaemia, **acute phase resolved**; chronic surveillance phase | DM-II, HTN, dyslipidaemia all sub-optimal.",
        "**Medications**: **Dr Navneet Shah (11 Mar)**: Continue Rozavel EZ 20 | **Plan Fenofibrate add-on next visit** if no contraindication | Continue Valzaar 80 + Amlodac 5 + Inderal LA 20 | Aspirin 75 continued | **Strict diet · zero alcohol · no high-fat foods**.",
        "**Medications**: **Dr Navneet Shah (17 Mar)**: Continue Rozavel EZ 20 | **Add Fenofibrate 145 mg OD** — formal initiation today.",
        "**Medications**: **Dr Nanavaty (25 Mar)**: Continue full regimen | Reinforce dietary discipline.",
        "**Plan**: **Dr Navneet Shah (11 Mar)**: 17 Mar 2026 · repeat TG.",
        "**Plan**: **Dr Navneet Shah (17 Mar)**: 25 Mar 2026 · standard cadence review.",
        "**Plan**: **Dr Nanavaty (25 Mar)**: After 2-3 weeks.",
      ],
      labResults: [
        { name: "Triglycerides", value: "2898", unit: "mg/dL", flag: "critical", refRange: "<150", date: "11 Mar 2026", note: "Pancreatitis-risk territory. Fibrate indicated above 500." },
        { name: "Triglycerides (repeat)", value: "798", unit: "mg/dL", flag: "high", refRange: "<150", date: "17 Mar 2026", note: "Down 73% on therapy in 6 days." },
        { name: "HbA1c", value: "8.5", unit: "%", flag: "high", refRange: "<7.0", date: "11 Mar 2026" },
        { name: "FPG", value: "191", unit: "mg/dL", flag: "high", refRange: "70–110", date: "11 Mar 2026" },
        { name: "LDL-C", value: "112", unit: "mg/dL", flag: "high", refRange: "<70 (DM target)", date: "11 Mar 2026" },
      ],
      hiddenNormalLabCount: 7,
      openLoops: [
        "Internal Medicine advised **repeat TG, HbA1c, fasting sugar, creatinine** on 11 Mar 2026, structured result rows not yet on file",
        "Internal Medicine flagged **fibrate add-on** as a pending decision, no Rx issued yet",
      ],
      consultations: [
        {
          date: "11 Mar 2026",
          visitType: "OPD",
          doctor: "Dr Navneet Shah",
          headline: "**Severe hypertriglyceridaemia TG 2898 mg/dL** — emergency outpatient intervention",
          symptoms: "Vague upper-abdominal discomfort × 4 days | No frank pancreatitis pain at present | Diet very poor recent weeks | No fresh chest pain | Increasing fatigue",
          examination: "BMI 31 | BP 142/92 | HR 86 | Soft abdomen, mild epigastric tenderness | No xanthomas seen | No lipaemia retinalis on screening fundus",
          diagnosis: "**Severe hypertriglyceridaemia (TG 2898)** — pancreatitis-risk territory | Uncontrolled DM (HbA1c 8.5%) | Pre-existing HTN, sub-optimal control",
          investigations: "Lipid panel | HbA1c | FPG | Renal function | LFT | Repeat TG in 1 week | USG abdomen if any escalation",
          medications:
            "**Continue Rozavel EZ 20** (Rosuvastatin 20 + Ezetimibe) | **Plan Fenofibrate add-on next visit** if no contraindication | Continue Valzaar 80 + Amlodac 5 + Inderal LA 20 | Aspirin 75 continued | **Strict diet · zero alcohol · no high-fat foods**",
          advice: "**Patient instructed: any abdominal pain → emergency room same day** | Hydration | Daily walking | Weight reduction goal 2-3 kg over 8 weeks",
          followUp: "17 Mar 2026 · repeat TG",
          labResults: [
            { name: "Triglycerides", value: "2898", unit: "mg/dL", flag: "critical", refRange: "<150", date: "11 Mar 2026", note: "**Critical** — pancreatitis-risk territory." },
            { name: "HbA1c", value: "8.5", unit: "%", flag: "high", refRange: "<7.0", date: "11 Mar 2026" },
            { name: "FPG", value: "191", unit: "mg/dL", flag: "high", refRange: "70–110", date: "11 Mar 2026" },
            { name: "LDL-C", value: "112", unit: "mg/dL", flag: "high", refRange: "<70 (DM target)", date: "11 Mar 2026" },
          ],
          hiddenNormalCount: 6,
        },
        {
          date: "17 Mar 2026",
          visitType: "OPD",
          doctor: "Dr Navneet Shah",
          headline: "**6-day follow-up** — TG down 73% (2898 → 798) on dietary discipline + intensified statin",
          symptoms: "No abdominal pain | No vomiting | Diet adherent | Energy improving",
          examination: "BMI 30.8 (-0.2) | BP 138/86 | Soft abdomen, non-tender",
          diagnosis: "Hypertriglyceridaemia — **dramatic biochemical response**, still well above target | Pancreatitis risk still elevated, less acute",
          investigations: "Repeat TG in 2 weeks",
          medications: "Continue Rozavel EZ 20 | **Add Fenofibrate 145 mg OD** — formal initiation today | Counselled on statin-fibrate combination safety (rare myalgia, monitor CK)",
          advice: "Continue strict diet · zero alcohol · no high-fat | Report any muscle pain immediately (rhabdomyolysis warning)",
          followUp: "25 Mar 2026 · standard cadence review",
          labResults: [
            { name: "Triglycerides", value: "798", unit: "mg/dL", flag: "high", refRange: "<150", date: "17 Mar 2026", note: "Down 73% in 6 days — strong response." },
          ],
          hiddenNormalCount: 4,
        },
        {
          date: "25 Mar 2026",
          visitType: "OPD",
          doctor: "Dr Nanavaty",
          headline: "Most recent IM visit · regimen consolidation",
          symptoms: "Stable | Tolerating fibrate well | No muscle pain | Sleep good",
          examination: "BP 134/84 | No fresh findings",
          diagnosis: "Severe hypertriglyceridaemia, **acute phase resolved**; chronic surveillance phase | DM-II, HTN, dyslipidaemia all sub-optimal",
          investigations: "Repeat TG in 2 weeks | Liver function on fibrate + statin combination | CK if any myalgia",
          medications: "Continue full regimen | Reinforce dietary discipline",
          advice: "Cardiology + Diabetology cross-referrals reinforced",
          followUp: "After 2-3 weeks",
        },
      ],
    },
    {
      source: { specialty: "Gastroenterology", author: "Dr Ajay Choksey", date: "12 Mar 2026" },
      reason: "Recurrent pancreatitis surveillance.",
      dateRangeLabel: "11 Apr '25 - 12 Mar '26",
      consultationCount: 5,
      doctorsLabel: "Dr Ajay Choksey",
      // Verbatim from the most recent GI visit (12 Mar 2026, Dr Ajay Choksey).
      lines: [
        "**Findings**: **Acute pancreatitis (mild, Balthazar A clinically)** — 13th episode | Background severe hypertriglyceridaemia",
        "**Medications**: **NPO × 24 h, then clear liquids** | IV NS 100 mL/h × 24 h (outpatient short bridge) | **Buscopan 10 mg q8h IV** | Tramadol 50 mg IV slow for pain | **Oson O** (Ofloxacin + Ornidazole) for stool symptoms × 5 days | Continue Nexpro 40 | Continue Ganaton 50 | **Bistide 3 mg HS** (Plecanatide for bowel routine, started today)",
        "**Plan**: Within 1 week · USG abdomen if symptoms persist",
      ],
      labResults: [
        { name: "Serum Lipase", value: "412", unit: "U/L", flag: "high", refRange: "0–160", date: "12 Mar 2026", note: "Elevated during the 13th acute pancreatitis episode." },
        { name: "Serum Amylase", value: "286", unit: "U/L", flag: "high", refRange: "30–110", date: "12 Mar 2026" },
        { name: "CRP", value: "62", unit: "mg/L", flag: "high", refRange: "<10", date: "12 Mar 2026" },
      ],
      hiddenNormalLabCount: 8,
      consultations: [
        {
          date: "11 Apr 2025",
          visitType: "OPD",
          doctor: "Dr Ajay Choksey",
          headline: "Baseline post-pancreatitis review (episode 11) · chronic surveillance handover",
          symptoms: "Stable | Mild bloating, intermittent | No active pain | Tolerating low-fat diet",
          examination: "BMI 30.4 | Soft abdomen | No organomegaly | No flank tenderness",
          diagnosis: "**Recurrent acute pancreatitis (metabolic origin, gallbladder out)** | s/p cholecystectomy",
          investigations: "MRCP if any escalation | Annual TG, lipase | LFT",
          medications: "**Nexpro 40 OD** (Esomeprazole) | **Ganaton 50 BID** (Itopride for dyspepsia) | Reinforce zero alcohol, low-fat diet",
          advice: "Pancreatitis precautions | Aggressive TG control with Internal Medicine | Annual GI surveillance",
          followUp: "After 3 months · earlier if any abdominal pain",
        },
        {
          date: "12 Mar 2026",
          visitType: "OPD",
          doctor: "Dr Ajay Choksey",
          headline: "**13th acute pancreatitis episode** — managed outpatient given mild severity",
          symptoms: "Epigastric pain × 18 h, radiating to back | Nausea, no vomiting | Atypical chest pain (radiation, not cardiac) | Watery stool 3 episodes today | Decreased appetite",
          examination: "T 99.2 | HR 92 | BP 134/86 | Tenderness epigastrium, mild guarding | No rebound | Bowel sounds present | No icterus",
          diagnosis: "**Acute pancreatitis (mild, Balthazar A clinically)** — 13th episode | Background severe hypertriglyceridaemia",
          investigations: "**Serum Lipase 412** | **Amylase 286** | **CRP 62** | USG abdomen — no fresh collection | LFT WNL",
          medications:
            "**NPO × 24 h, then clear liquids** | IV NS 100 mL/h × 24 h (outpatient short bridge) | **Buscopan 10 mg q8h IV** | Tramadol 50 mg IV slow for pain | **Oson O** (Ofloxacin + Ornidazole) for stool symptoms × 5 days | Continue Nexpro 40 | Continue Ganaton 50 | **Bistide 3 mg HS** (Plecanatide for bowel routine, started today)",
          advice: "**Strict zero alcohol** | No high-fat foods × 6 weeks | Slow re-introduction of diet | **Any worsening pain, fever, or vomiting → emergency hospital admission**",
          followUp: "Within 1 week · USG abdomen if symptoms persist",
          labResults: [
            { name: "Serum Lipase", value: "412", unit: "U/L", flag: "high", refRange: "0–160", date: "12 Mar 2026" },
            { name: "Serum Amylase", value: "286", unit: "U/L", flag: "high", refRange: "30–110", date: "12 Mar 2026" },
            { name: "CRP", value: "62", unit: "mg/L", flag: "high", refRange: "<10", date: "12 Mar 2026" },
          ],
          hiddenNormalCount: 8,
        },
      ],
    },
    {
      source: { specialty: "Urology", author: "Dr Kamlesh Patel", date: "13 Nov 2025" },
      reason: "Recurrent UTI in diabetic post-menopausal female.",
      dateRangeLabel: "18 Aug - 13 Nov '25",
      consultationCount: 5,
      doctorsLabel: "Dr Kamlesh Patel / Dr Kaustubh Patel",
      // Verbatim from the most recent urology visit
      // (13 Nov 2025, Dr Kaustubh Patel).
      lines: [
        "**Findings**: Voiding dysfunction in DM-II post-menopausal female — **mixed under-active bladder + bladder-neck dysfunction**",
        "**Medications**: Continue **Veltam 0.4 mg HS** (Tamsulosin — bladder-neck relaxation) | **Add Urotone SR 75 mg OD** (Bethanechol — for under-active bladder contraction) | Continue Premarin vaginal | Periodic urine culture",
        "**Plan**: **Urodynamics-anchored review (not yet booked)**",
      ],
      openLoops: [
        "Urology has not booked a **bladder-function review** despite contradictory Tamsulosin + Bethanechol regimen, reconciliation visit still pending",
      ],
      consultations: [
        {
          date: "18 Aug 2025",
          visitType: "OPD",
          doctor: "Dr Kamlesh Patel",
          headline: "Initial urology consult — **recurrent UTI + voiding dysfunction**",
          symptoms: "Frequency, urgency × 3 weeks | Burning micturition intermittent | Poor flow + hesitancy × 6 months | Nocturia 2-3 episodes | Mild urge incontinence",
          examination: "Suprapubic non-tender | DRE: no fresh findings | External genitalia: post-menopausal atrophic changes mild",
          diagnosis: "**Recurrent UTI in a diabetic post-menopausal female** with mixed voiding-dysfunction pattern",
          investigations: "Urine R/M + culture | Renal USG | Post-void residual scan | HbA1c",
          medications: "Empirical **Nitrofurantoin 100 mg BD × 5 days** (pending culture) | **Veltam 0.4 mg HS** (Tamsulosin) | **Premarin** vaginal cream BD",
          advice: "Adequate hydration | Voiding hygiene | Cranberry supplement | Recheck culture before any escalation",
          followUp: "13 Nov 2025 · culture-targeted plan",
        },
        {
          date: "13 Nov 2025",
          visitType: "OPD",
          doctor: "Dr Kaustubh Patel",
          headline: "Most recent visit · **bladder pharmacology contradiction** introduced",
          symptoms: "UTI symptoms resolved on culture-targeted course | Voiding still slow | Urgency persists | Mild stress incontinence on cough",
          examination: "Unchanged | Bladder USG: PVR 80 mL",
          diagnosis: "Voiding dysfunction in DM-II post-menopausal female — **mixed under-active bladder + bladder-neck dysfunction**",
          investigations: "Urodynamics advised (not yet booked) | Repeat urine R/M",
          medications:
            "Continue **Veltam 0.4 mg HS** (Tamsulosin — bladder-neck relaxation) | **Add Urotone SR 75 mg OD** (Bethanechol — for under-active bladder contraction) | Continue Premarin vaginal | Periodic urine culture",
          advice: "Pelvic-floor exercises | Voiding diary | Urodynamics within 4 weeks",
          followUp: "**Urodynamics-anchored review (not yet booked)**",
          additionalNotes:
            "**Open loop**: Tamsulosin (relaxes outflow) and Bethanechol (contracts bladder) are pharmacologically contradictory. The team intended one to address each component but the combination is unusual without urodynamic confirmation.",
        },
      ],
    },
    {
      source: { specialty: "Cardiology", author: "Dr Bhavesh Roy", date: "27 Oct 2025" },
      reason: "HTN regimen + statin management.",
      dateRangeLabel: "8 Sep - 27 Oct '25",
      consultationCount: 3,
      doctorsLabel: "Dr Bhavesh Roy",
      // Verbatim from the most recent cardiology visit
      // (27 Oct 2025, Dr Bhavesh Roy).
      lines: [
        "**Findings**: **β-blocker over-suppression risk** on full anti-HTN regimen | CV risk well controlled overall",
        "**Medications**: **Reduce Inderal LA 20 → Inderal 10 OD** (down-titration) | Continue Valzaar 80, Amlodac 5, Ecospin 75 | Continue Rozavel EZ 20 (statin maximised)",
        "**Plan**: After 4 weeks · with BP diary + ECG",
      ],
      consultations: [
        {
          date: "27 Oct 2025",
          visitType: "OPD",
          doctor: "Dr Bhavesh Roy",
          headline: "Most recent cardiology review · **β-blocker over-suppression** flagged",
          symptoms: "Easy fatigue × 4 weeks | One episode of light-headedness on standing | Sleep good | No chest pain | No SOB",
          examination: "**BP 110/70** (lower than usual; patient admits 2 doses skipped due to fatigue) | HR 58 (bradycardic on Inderal) | S1S2 normal | No murmur | No oedema",
          diagnosis: "**β-blocker over-suppression risk** on full anti-HTN regimen | CV risk well controlled overall",
          investigations: "ECG today (NSR, HR 58) | 2D Echo annual | Repeat lipid panel · TG · LDL",
          medications:
            "**Reduce Inderal LA 20 → Inderal 10 OD** (down-titration) | Continue Valzaar 80, Amlodac 5, Ecospin 75 | Continue Rozavel EZ 20 (statin maximised)",
          advice: "Postural-symptom education | Take meds with food | Record BP twice daily for 2 weeks | Fibrate-decision deferred to Internal Medicine",
          followUp: "After 4 weeks · with BP diary + ECG",
        },
      ],
    },
    {
      source: { specialty: "Diabetology", author: "Dr Talati", date: "13 Apr 2026" },
      reason: "Uncontrolled DM-II with allergic symptoms.",
      dateRangeLabel: "13 Apr '26",
      consultationCount: 1,
      doctorsLabel: "Dr Talati / Dr Rushikesh Shah",
      // Verbatim from the diabetology visit (13 Apr 2026, Dr Talati).
      lines: [
        "**Findings**: **Uncontrolled Type-2 Diabetes Mellitus** — likely insulin requirement | Pruritus probably hyperglycaemic + dry skin (allergic component to be ruled out)",
        "**Medications**: **Start Ryzodeg 100 SC** — pre-breakfast titration | **Eurepa V** (Repaglinide + Voglibose) with meals | **LTK 50** (Losartan) for HTN | **CTD M** (Chlorthalidone + Metoprolol combination) for HTN | Continue **Thyronorm 50 OD** | **Cetirizine 10 mg HS** for pruritus × 7 days | **Emollient** twice daily for dry skin",
        "**Plan**: Within 2-3 weeks · with SMBG diary + repeat labs",
      ],
      openLoops: [
        "Diabetology advised **insulin titration + repeat workup at next visit**, follow-up not yet booked",
      ],
      consultations: [
        {
          date: "13 Apr 2026",
          visitType: "OPD",
          doctor: "Dr Talati",
          headline: "**First diabetology visit** — uncontrolled DM-II + generalised pruritus",
          symptoms: "Polyuria, polydipsia × 6 weeks | **Itching all over body × 3 weeks** | Weight loss 2 kg | Fatigue | No fresh visual symptoms | No tingling LL fresh",
          examination: "BMI 30.6 | BP 138/88 | Fundus: scheduled within 4 weeks | Foot exam: no fresh sensory loss | Skin: no rash, dry skin++",
          diagnosis: "**Uncontrolled Type-2 Diabetes Mellitus** — likely insulin requirement | Pruritus probably hyperglycaemic + dry skin (allergic component to be ruled out)",
          investigations: "HbA1c · FPG · PPG · Urine ACR · eGFR · TSH · Skin allergy panel (if pruritus persists post-control)",
          medications:
            "**Start Ryzodeg 100 SC** — pre-breakfast titration | **Eurepa V** (Repaglinide + Voglibose) with meals | **LTK 50** (Losartan) for HTN | **CTD M** (Chlorthalidone + Metoprolol combination) for HTN | Continue **Thyronorm 50 OD** | **Cetirizine 10 mg HS** for pruritus × 7 days | **Emollient** twice daily for dry skin",
          advice:
            "Insulin injection technique training | SMBG 4 times daily × 1 week then bring chart | Diet diary | **Notify if any hypoglycaemia signs** | Repeat workup at next visit",
          followUp: "Within 2-3 weeks · with SMBG diary + repeat labs",
          additionalNotes:
            "**Cross-team concern**: this regimen adds Losartan (an ARB) to a patient already on Valzaar (another ARB) from Cardiology, AND adds Metoprolol to a patient already on Propranolol from Cardiology. Cross-team reconciliation request placed.",
        },
      ],
    },
  ],
  collisions: [
    {
      kind: "coordination-gap",
      title: "**Severe hypertriglyceridaemia untreated with fibrate**, pancreatitis risk untreated",
      points: [
        "TG 2898 mg/dL documented (in narrative, not lab table).",
        "Only Rosuvastatin + Ezetimibe on board.",
        "Fenofibrate or omega-3 indicated above TG > 500 to reduce pancreatitis recurrence.",
      ],
      rule: {
        body: "NICE",
        year: "2024",
        section: "NG28 §5.4 / AHA 2021",
        readableBody: "Joint NICE (UK) + AHA (American Heart Association) — the standard combined reference for severe hypertriglyceridaemia management in adults.",
        description: "Defines the TG cut-off (typically > 500 mg/dL) above which a fibrate or omega-3 must be added to statin therapy to reduce acute-pancreatitis recurrence, and the safety rules for statin + fibrate combinations.",
        whyPicked: "Ms Desai had a documented TG of **2898 mg/dL** in March 2026 — six times the fibrate-indication threshold — and **13 prior acute-pancreatitis episodes**. Her current regimen has only Rosuvastatin + Ezetimibe; no fibrate or omega-3. NICE/AHA both indicate fibrate add-on at this TG level.",
        fetches: "Her current TG value, whether a fibrate is on board, and her pancreatitis-episode count.",
        confidence: "established",
      },
    },
    {
      kind: "ddi",
      title: "**Triple anti-HTN across specialties**, no reconciliation",
      points: [
        "Cardiology: Valsartan + Amlodipine + Propranolol.",
        "Diabetology added Losartan + Chlorthalidone + Metoprolol (April 2026).",
        "Two ARBs and two β-blockers across specialties → hypotension risk.",
      ],
      rule: {
        body: "ESC/ESH",
        year: "2023",
        readableBody: "European Society of Cardiology + European Society of Hypertension — the joint European hypertension guideline, widely followed in Indian practice.",
        description: "Specifies that anti-hypertensive regimens should use one agent per class (one ARB, one β-blocker), not two ARBs or two β-blockers stacked across specialties.",
        whyPicked: "Cardiology has Ms Desai on Valsartan + Amlodipine + Propranolol. Diabetology then added Losartan + Chlorthalidone + Metoprolol in April 2026 — so she now has TWO ARBs (Valsartan + Losartan) and TWO β-blockers (Propranolol + Metoprolol) live concurrently across two teams. ESC/ESH explicitly warns about this exact stacking.",
        fetches: "Which two teams prescribed which agents, and the duplicated classes.",
        confidence: "established",
      },
    },
    {
      kind: "ddi",
      title: "**Bladder pharmacology contradiction**, Tamsulosin + Bethanechol",
      points: [
        "Both prescribed by the same Urology team.",
        "Tamsulosin relaxes bladder-neck; Bethanechol stimulates bladder contraction.",
        "Opposing actions, verify or de-prescribe.",
      ],
      rule: {
        body: "AUA",
        year: "2020",
        section: "BPH / Voiding dysfunction",
        readableBody: "American Urological Association — US urology body whose voiding-dysfunction guideline is the standard reference.",
        description: "Sets the principle that voiding-dysfunction drugs should be matched to the mechanism (over-active vs under-active bladder), not stacked with opposing actions.",
        whyPicked: "The same Urology team has Ms Desai on **Tamsulosin** (relaxes bladder-neck for under-active outflow) AND **Bethanechol** (stimulates bladder contraction for under-active detrusor). These are opposing mechanisms — usually one or the other, not both — and no reconciliation visit appears in the record.",
        fetches: "Whether both drugs are simultaneously active, and which clinician owns the reconciliation.",
        confidence: "established",
      },
    },
  ],
  pendingMdtItems: [
    "Initiate fibrate (or omega-3) for TG-driven pancreatitis risk.",
    "Reconcile anti-HTN: Cardiology vs Diabetology regimens.",
    "Review bladder Rx contradiction (Tamsulosin + Bethanechol).",
    "Move TG value from narrative into structured measurement.",
  ],
  syntheses: [
    {
      panelTitle: "Hypertriglyceridaemia · pancreatitis-risk panel",
      guideline: {
        body: "AHA",
        year: "2021",
        readableBody: "American Heart Association — US cardiology body whose Hypertriglyceridaemia Scientific Statement is the most-cited reference.",
        description: "Defines the TG values at which pancreatitis risk dominates, the fibrate-add-on threshold, and the statin-fibrate combination safety rules.",
        whyPicked: "Ms Desai's TG history (peak 2898, repeat 798, 13 acute pancreatitis episodes) makes this the single most-relevant published reference for her risk profile.",
        fetches: "Her TG trajectory, fibrate-on-board status, and pancreatitis recurrence count.",
        confidence: "established",
      },
      rows: [
        { label: "Triglyceride", value: "2898 mg/dL", ref: "From Internal Medicine narrative, not in lab table.", tone: "alert" },
        { label: "Fibrate on board", value: "No", ref: "No fenofibrate / gemfibrozil in drug_exposure.", tone: "alert" },
        { label: "Pancreatitis episodes", value: "13", ref: "From consultation records tagged 'H/O ACUTE PANCREATITIS'.", tone: "alert" },
      ],
      note: "Three independent alerts converge on the same gap. Highest-priority intervention for this patient.",
    },
  ],
  freshness: "Synced just now",
}

// ═════════════════════════════════════════════════════════════════════════
// ARJUN_VERMA_BRIEF_MOCK  ·  P6 · person_id 319033560465 · M · 14
// ─────────────────────────────────────────────────────────────────────────
// Scenario: 3-day inpatient admission (24-26 Feb 2026) for decompensated
// Wilson's disease + acute Hepatitis A in a pediatric patient, followed by
// 5 OPD reviews over the next month. FIRST patient in the catalogue with:
//   · a real inpatient visit_occurrence row (visit_concept_id = 9201)
//   · structured OMOP `note` rows (Presenting Complaints + Discharge Condition)
//   · 315 lab measurements (type 44818702) — serial LFT monitoring
// Demonstrates the "IPD + OPD continuum" rendering for the brief.
// ═════════════════════════════════════════════════════════════════════════
export const ARJUN_VERMA_BRIEF_MOCK: VeloraV0MdtBriefData = {
  patientName: "Arjun Verma",
  patientMeta: "M, 14y",
  patientGender: "M",
  patientAge: 14,
  patientMobile: "+91 98765 60465",
  patientId: "319033560465",
  medicalHistory: [
    {
      title: "Primary problem",
      tone: "primary",
      items: [
        { text: "**Wilson's disease** (on chelation therapy, Penicillamine + Zinc)" },
        { text: "**Acute Hepatitis A** (HAV IgM positive, admitted 24 Feb 2026 with jaundice and hepatic decompensation)" },
        { text: "**Decompensated chronic liver disease** (ascites and cholestasis on the IPD admission)" },
      ],
      sources: [
        { doctor: "Dr Ajay Choksey (Gastroenterology, IPD admission)", date: "24 Feb 2026" },
        { doctor: "Dr Ajay Choksey (Gastroenterology, Discharge)", date: "26 Feb 2026" },
        { doctor: "Dr Ajay Choksey (Gastroenterology, OPD follow-up)", date: "3 Mar 2026" },
        { doctor: "Dr Ajay Choksey (Gastroenterology, OPD follow-up)", date: "10 Mar 2026" },
        { doctor: "Dr Sejal Shah (Ophthalmology, KF-ring assessment)", date: "10 Mar 2026" },
        { doctor: "Dr Ajay Choksey (Gastroenterology, OPD follow-up)", date: "25 Mar 2026" },
      ],
      reasoning:
        "13 consultation records tagged HAV IgM POSITIVE across the IPD admission and 5 OPD follow-ups. Wilson's disease is inferred from the Cilamin (Penicillamine) plus Zinfate (Zinc) regimen, the classic chelation-plus-anti-absorption combination. The combination of Wilson's and acute HAV in a 14-year-old is what tipped the patient into hepatic decompensation requiring admission.",
    },
    {
      title: "Co-morbidities",
      tone: "neutral",
      items: [{ text: "**Hypothyroidism** (on Thyroxine 125 mcg once daily)" }],
      sources: [
        { doctor: "Dr Ajay Choksey (Gastroenterology)", date: "24 Feb 2026" },
        { doctor: "Dr Ajay Choksey (Gastroenterology)", date: "3 Mar 2026" },
        { doctor: "Dr Ajay Choksey (Gastroenterology)", date: "10 Mar 2026" },
        { doctor: "Dr Ajay Choksey (Gastroenterology)", date: "25 Mar 2026" },
      ],
      reasoning:
        "13 consultation records tagged HYPOTHYROIDISM as Active. On stable Thyroxine 125 mcg replacement; not the driver of the admission but relevant for chronic-care continuity.",
    },
    {
      title: "Surgical history",
      tone: "neutral",
      items: [{ text: "No surgical history found" }],
      sources: [],
      reasoning: "No surgical procedures recorded for this patient. The Wilson's diagnosis predates current consultations but no past surgery is documented.",
    },
    {
      title: "Allergies & safety",
      tone: "neutral",
      items: [{ text: "Allergy review not explicitly verified (pre-Penicillamine challenge documentation absent)" }],
      sources: [],
      reasoning:
        "Penicillamine carries a non-trivial hypersensitivity and nephrotic-syndrome risk. The absence of a documented allergy review on initiation is a meaningful gap. Flag for the next OPD visit.",
    },
  ],
  windowDays: 29,
  specialties: [
    {
      source: { specialty: "Gastroenterology · IPD admission", author: "Dr Ajay Choksey", date: "24-26 Feb 2026" },
      reason: "The index admission. 3-day stay managed by the hepatology arm of Gastroenterology.",
      dateRangeLabel: "24 - 26 Feb '26 (IPD)",
      consultationCount: 1,
      doctorsLabel: "Dr Ajay Choksey",
      // Verbatim from the IPD admission Rx (24 Feb 2026, Dr Ajay Choksey).
      lines: [
        "**Findings**: **Acute Hepatitis A** (HAV IgM positive) on a background of **Wilson's disease** with **hepatic decompensation** | Mild ascites | Suspected UTI (burning micturition)",
        "**Medications**: **Wysolone 10 mg OD** | **Cilamin 250 mg BID** (Penicillamine) | **Zinfate OD** (Zinc) | **Ursocol 300 BID** (UDCA) | **Hepamerz** sachet TID | **Aldactone 25 OD** (Spironolactone) | **Looz** 15 mL HS (Lactulose) | **Thyrox 125 mcg OD** continued | Cefixime 200 mg BID (empirical for UTI) | IV fluids — DNS @ 75 mL/h",
        "**Plan**: Discharge planned by 26 Feb if LFTs trend down; OPD review on 3 Mar 2026",
      ],
      // Specialty-level abnormal labs from the admission. Latest in-stay reading
      // shown for each parameter. Normal CBC parameters from the same panels
      // are rolled up via hiddenNormalLabCount.
      labResults: [
        { name: "Bilirubin (Total)", value: "8.4", unit: "mg/dL", flag: "high", refRange: "0.2–1.2", date: "24 Feb 2026", note: "Peak admission value — falling on D2." },
        { name: "Bilirubin (Direct)", value: "5.9", unit: "mg/dL", flag: "high", refRange: "0.0–0.3", date: "24 Feb 2026", note: "Cholestatic component on admission." },
        { name: "SGPT (ALT)", value: "612", unit: "U/L", flag: "high", refRange: "5–40", date: "24 Feb 2026", note: "Consistent with acute HAV hepatocyte injury." },
        { name: "SGOT (AST)", value: "498", unit: "U/L", flag: "high", refRange: "5–40", date: "24 Feb 2026" },
        { name: "Alk Phosphatase", value: "286", unit: "U/L", flag: "high", refRange: "40–129", date: "24 Feb 2026", note: "Cholestasis." },
        { name: "GGT", value: "194", unit: "U/L", flag: "high", refRange: "9–48", date: "24 Feb 2026" },
        { name: "Serum Albumin", value: "2.9", unit: "g/dL", flag: "low", refRange: "3.5–5.0", date: "24 Feb 2026", note: "Mild hypoalbuminemia, expected in decompensated CLD." },
        { name: "INR", value: "1.6", unit: "", flag: "high", refRange: "0.8–1.2", date: "24 Feb 2026", note: "Synthetic dysfunction marker." },
      ],
      hiddenNormalLabCount: 18,
      // No open loops from this admission alone — the discharge plan (OPD
      // review 3 Mar 2026 + continued chelation) has been followed through.
      // Active monitoring loops are surfaced on the OPD follow-up card below.
      consultations: [
        {
          date: "24 Feb 2026",
          visitType: "IPD",
          doctor: "Dr Ajay Choksey",
          headline: "**Admitted** with **jaundice**, fever, abdominal pain, decreased oral intake. **HAV IgM positive**, ascites on exam.",
          symptoms:
            "Jaundice × 4 days | Fever (low-grade, intermittent) × 3 days | Right hypochondrial pain | Decreased appetite | Itching over body × 1-1.5 months | Burning micturition × 2 days",
          examination:
            "Icterus +++ | Mild ascites on flank percussion | Hepatomegaly 3 cm below costal margin, tender | No flapping tremor | No KF ring grossly visible (slit-lamp deferred) | Afebrile at admission, HR 96, BP 102/64",
          diagnosis:
            "**Acute Hepatitis A** (HAV IgM positive) on a background of **Wilson's disease** with **hepatic decompensation** | Mild ascites | Suspected UTI (burning micturition)",
          investigations:
            "LFT — daily | CBC, KFT, electrolytes — daily | INR, PT — daily | HAV IgM, IgG | HBsAg, Anti-HCV (rule-out) | USG abdomen | Urine routine + culture | Serum ceruloplasmin (sent, pending) | 24-h urinary copper (planned for post-discharge)",
          medications:
            "**Wysolone 10 mg OD** | **Cilamin 250 mg BID** (Penicillamine) | **Zinfate OD** (Zinc) | **Ursocol 300 BID** (UDCA) | **Hepamerz** sachet TID | **Aldactone 25 OD** (Spironolactone) | **Looz** 15 mL HS (Lactulose) | **Thyrox 125 mcg OD** continued | Cefixime 200 mg BID (empirical for UTI) | IV fluids — DNS @ 75 mL/h",
          advice:
            "Bed rest | Liver-friendly diet, salt restriction | Strict I/O charting | No NSAIDs, no paracetamol > 1.5 g/day | Family briefed re: HAV transmission precautions",
          followUp: "Discharge planned by 26 Feb if LFTs trend down; OPD review on 3 Mar 2026",
          labResults: [
            { name: "Bilirubin (Total)", value: "8.4", unit: "mg/dL", flag: "high", refRange: "0.2–1.2", date: "24 Feb 2026" },
            { name: "SGPT (ALT)", value: "612", unit: "U/L", flag: "high", refRange: "5–40", date: "24 Feb 2026" },
            { name: "SGOT (AST)", value: "498", unit: "U/L", flag: "high", refRange: "5–40", date: "24 Feb 2026" },
            { name: "INR", value: "1.6", unit: "", flag: "high", refRange: "0.8–1.2", date: "24 Feb 2026" },
            { name: "Serum Albumin", value: "2.9", unit: "g/dL", flag: "low", refRange: "3.5–5.0", date: "24 Feb 2026" },
          ],
          hiddenNormalCount: 14,
          additionalNotes:
            "Wilson's disease confirmed on prior records (parent's report) — chelation continued through admission. Family screening status to be addressed at OPD.",
          dischargeSummary: {
            admissionLine:
              "Admitted 24 Feb 2026 · Discharged 26 Feb 2026 · 3 days · Pediatric Ward, Bed 4-B",
            finalDiagnosis:
              "**Acute Hepatitis A** with hepatic decompensation, on a background of **Wilson's disease** (on Penicillamine + Zinc). Mild ascites resolving.",
            presentingComplaints:
              "Jaundice × 4 days, fever × 3 days, abdominal pain, decreased oral intake, itching over body × 1-1.5 months, burning micturition.",
            hospitalCourse:
              "Admitted with cholestatic jaundice and mild ascites. Started on hepatoprotective regimen, Spironolactone for ascites, Lactulose for HE prophylaxis. Wilson's chelation (Cilamin + Zinfate) continued uninterrupted. Empirical Cefixime for UTI symptoms. **LFTs trended down each day** (Bilirubin 8.4 → 6.1 → 4.2 mg/dL; SGPT 612 → 410 → 268 U/L). Ascites clinically resolved by D3. Tolerated full oral diet on D3.",
            dischargeCondition: "**Stable, ambulating, tolerating oral feeds.** No fresh complaints at discharge.",
            dischargeExam:
              "Afebrile · HR 84 · BP 110/72 · No icterus on D3 (clinically faint scleral tinge persists) · No flapping · No ascites on percussion · Soft, non-tender abdomen",
            dischargeAdvice: [
              "Continue **Cilamin 250 mg BID** and **Zinfate OD** indefinitely — do not skip doses",
              "**Wysolone 10 mg** taper as charted, follow exact schedule",
              "Liver-friendly diet, **no paracetamol > 1 g/day**, absolutely no NSAIDs",
              "HAV transmission precautions for household × 2 weeks",
              "Bring all parents + siblings for **family screening** at the next OPD",
            ],
            warningSigns: [
              "**Recurrence of jaundice** or fresh yellow tinge of eyes",
              "**Persistent vomiting** or refusing oral intake",
              "Fever > 100.4°F (38°C) | abdominal swelling | drowsiness or confusion (**possible HE**)",
              "Reduced urine output | bleeding gums | red urine",
            ],
            functionalAssessment:
              "Pediatric functional status restored to baseline by D3. Tolerating school-equivalent activity at discharge. Nutritional intake adequate.",
          },
        },
      ],
    },
    {
      source: { specialty: "Gastroenterology · OPD follow-up series", author: "Dr Ajay Choksey", date: "25 Mar 2026" },
      reason: "Post-discharge surveillance, five reviews over the month after admission.",
      dateRangeLabel: "24 Feb - 25 Mar '26",
      consultationCount: 5,
      doctorsLabel: "Dr Ajay Choksey",
      // Verbatim from the most recent OPD follow-up
      // (25 Mar 2026, Dr Ajay Choksey — the 1-month milestone visit).
      lines: [
        "**Findings**: Acute HAV, **resolved** | Wilson's disease, **stable on chelation** | Hypothyroidism, stable",
        "**Medications**: Cilamin 250 mg BID — **continue indefinitely** | Zinfate OD — continue | Ursocol 300 BID × 4 more weeks | Folimax D3 Forte weekly | Nusam 400 BID | Hepamerz BD | Ostocalcium OD | ProHance LIV | Pregaba 50 PRN | Thyrox 125 mcg OD",
        "**Plan**: 24 Jun 2026 · 3-month interval | sooner if any neuropsychiatric symptoms",
      ],
      // Latest abnormal labs across the 5-visit follow-up window. SGPT and
      // Bilirubin have improved from admission values but are not yet normal.
      labResults: [
        { name: "Bilirubin (Total)", value: "1.8", unit: "mg/dL", flag: "high", refRange: "0.2–1.2", date: "25 Mar 2026", note: "Down from 8.4 on admission. Approaching normal." },
        { name: "SGPT (ALT)", value: "62", unit: "U/L", flag: "high", refRange: "5–40", date: "25 Mar 2026", note: "Down from 612 on admission. Continued resolution expected." },
        { name: "SGOT (AST)", value: "48", unit: "U/L", flag: "high", refRange: "5–40", date: "25 Mar 2026" },
        { name: "Alk Phosphatase", value: "168", unit: "U/L", flag: "high", refRange: "40–129", date: "25 Mar 2026", note: "Cholestasis resolving." },
        { name: "Serum Albumin", value: "3.4", unit: "g/dL", flag: "low", refRange: "3.5–5.0", date: "25 Mar 2026", note: "Borderline. Nutritional support advised." },
      ],
      hiddenNormalLabCount: 11,
      openLoops: [
        "Gastroenterology advised **re-test HAV IgG seroconversion** post-acute, no result on file",
        "Gastroenterology advised periodic **24-h urinary copper** for Penicillamine monitoring, no result on file",
        "Gastroenterology advised **first-degree-relative ATP7B screening**, no family-screening entries on file",
      ],
      consultations: [
        {
          date: "3 Mar 2026",
          visitType: "OPD",
          doctor: "Dr Ajay Choksey",
          headline: "**First post-discharge review** (1-week). Jaundice clinically resolving, LFTs trending down.",
          symptoms: "No fresh complaints | Mild residual itching, less than pre-admission | Appetite returning | No vomiting | Sleep undisturbed",
          examination: "Afebrile · HR 82 · BP 108/68 · Faint icterus only · No ascites · Mild hepatomegaly persists, non-tender · No flapping",
          diagnosis: "Acute HAV, **recovering** | Wilson's disease, continuing on chelation | Hypothyroidism, stable",
          investigations: "Repeat LFT (Bilirubin Total/Direct/Indirect, SGPT, SGOT, ALP, GGT, Albumin) | INR | CBC",
          medications:
            "Cilamin 250 mg BID continued | Zinfate OD continued | **Wysolone 7.5 mg OD** (taper step) | Ursocol 300 BID | Hepamerz BD | Aldactone 25 stopped (ascites resolved) | Lactulose continued PRN | Thyrox 125 mcg continued",
          advice: "Liver-friendly diet, slow reintroduction of normal protein | Continue HAV precautions × 1 more week",
          followUp: "10 Mar 2026 · with repeat LFTs · also slit-lamp KF ring assessment by Ophthalmology",
          labResults: [
            { name: "Bilirubin (Total)", value: "3.6", unit: "mg/dL", flag: "high", refRange: "0.2–1.2", date: "3 Mar 2026" },
            { name: "SGPT (ALT)", value: "228", unit: "U/L", flag: "high", refRange: "5–40", date: "3 Mar 2026" },
            { name: "SGOT (AST)", value: "186", unit: "U/L", flag: "high", refRange: "5–40", date: "3 Mar 2026" },
            { name: "INR", value: "1.3", unit: "", flag: "high", refRange: "0.8–1.2", date: "3 Mar 2026" },
          ],
          hiddenNormalCount: 9,
        },
        {
          date: "10 Mar 2026",
          visitType: "OPD",
          doctor: "Dr Ajay Choksey",
          headline: "**2-week review**. LFTs continuing to improve. Slit-lamp Ophthalmology done same day.",
          symptoms: "Itching resolved | Energy returning | Eating well | Mild fatigue post-exertion",
          examination: "Afebrile · No icterus on close inspection · No hepatomegaly today · Normal abdominal exam",
          diagnosis: "Acute HAV, **near resolution clinically** | Wilson's, on chelation, no extrapyramidal signs",
          investigations: "Repeat LFT | KFT | Urinalysis (Penicillamine monitoring) | Slit-lamp for KF ring (Ophthalmology, same day)",
          medications: "Same regimen | **Wysolone 5 mg OD** (taper step) | Added **Folimax D3 Forte** weekly (nutritional support) | Added **Nusam 400** BID (SAMe)",
          advice: "Re-introduce school in graded manner from next week | Continue chelation strictly",
          followUp: "18 Mar 2026 · with KFT + urine PCR",
          labResults: [
            { name: "Bilirubin (Total)", value: "2.4", unit: "mg/dL", flag: "high", refRange: "0.2–1.2", date: "10 Mar 2026" },
            { name: "SGPT (ALT)", value: "124", unit: "U/L", flag: "high", refRange: "5–40", date: "10 Mar 2026" },
            { name: "SGOT (AST)", value: "98", unit: "U/L", flag: "high", refRange: "5–40", date: "10 Mar 2026" },
          ],
          hiddenNormalCount: 10,
        },
        {
          date: "18 Mar 2026",
          visitType: "OPD",
          doctor: "Dr Ajay Choksey",
          headline: "**3-week review**. Asymptomatic. KFT normal, urine PCR borderline, **24-h copper not done**.",
          symptoms: "No active complaints | School re-started, tolerating",
          examination: "Vitals normal | No icterus | No new neurological signs | Abdomen soft",
          diagnosis: "Acute HAV, resolved clinically | Wilson's, on chelation",
          investigations: "Repeat LFT | KFT | Urinalysis | **24-h urinary copper advised, not done yet**",
          medications: "Continue Cilamin + Zinfate | **Wysolone 2.5 mg OD** (final taper step) | Stop Lactulose | Continue Ursocol",
          advice: "Reminder: 24-h urinary copper collection on weekend | School OK, no contact sports for 4 more weeks | **Family screening: bring parents and 8-year-old sister next visit**",
          followUp: "25 Mar 2026",
          labResults: [
            { name: "Bilirubin (Total)", value: "1.9", unit: "mg/dL", flag: "high", refRange: "0.2–1.2", date: "18 Mar 2026" },
            { name: "SGPT (ALT)", value: "82", unit: "U/L", flag: "high", refRange: "5–40", date: "18 Mar 2026" },
            { name: "Urine PCR", value: "180", unit: "mg/g", flag: "high", refRange: "<150", date: "18 Mar 2026", note: "Penicillamine-related; monitor monthly." },
          ],
          hiddenNormalCount: 12,
          additionalNotes: "Family screening reminder issued. Mother reports she will bring sister at next visit.",
        },
        {
          date: "21 Mar 2026",
          visitType: "OPD",
          doctor: "Dr Ajay Choksey",
          headline: "Interim check — patient reported transient mild headache, **brought forward** by parent.",
          symptoms: "Mild headache × 2 days, intermittent, no nausea or photophobia | No tremor",
          examination: "Vitals normal | Neuro exam normal | No KF ring grossly | No focal deficit",
          diagnosis: "Tension-type headache, **likely non-Wilsonian** | Continue chelation",
          investigations: "No fresh investigations today | Reinforce 24-h copper at next visit",
          medications: "Continued | Added **Pregaba 50 mg HS** PRN for any neuropathic pain element | Stop Wysolone (tapered out)",
          advice: "Adequate hydration | Sleep hygiene | Return immediately if tremor, slurring, behavioural change",
          followUp: "25 Mar 2026 · routine review",
        },
        {
          date: "25 Mar 2026",
          visitType: "OPD",
          doctor: "Dr Ajay Choksey",
          headline: "**1-month milestone**. Clinical recovery complete. LFTs near-normal. Wilson's plan locked in.",
          symptoms: "No active complaints | Headache resolved | Full school attendance | Eating well",
          examination: "All vitals normal | No icterus, no ascites, no hepatomegaly | Neuro exam normal",
          diagnosis: "Acute HAV, **resolved** | Wilson's disease, **stable on chelation** | Hypothyroidism, stable",
          investigations:
            "Repeat LFT | KFT | Urine PCR | **HAV IgG (seroconversion check, advised, not done yet)** | **24-h urinary copper (advised, not done yet)** | Serum ceruloplasmin baseline",
          medications:
            "Cilamin 250 mg BID — **continue indefinitely** | Zinfate OD — continue | Ursocol 300 BID × 4 more weeks | Folimax D3 Forte weekly | Nusam 400 BID | Hepamerz BD | Ostocalcium OD | ProHance LIV | Pregaba 50 PRN | Thyrox 125 mcg OD",
          advice:
            "Quarterly LFT minimum | Annual slit-lamp for KF ring | **Family screening — sibling next month** | No alcohol ever, no hepatotoxic OTC drugs | Re-vaccination not needed (HAV gives lifetime immunity)",
          followUp: "24 Jun 2026 · 3-month interval | sooner if any neuropsychiatric symptoms",
          labResults: [
            { name: "Bilirubin (Total)", value: "1.8", unit: "mg/dL", flag: "high", refRange: "0.2–1.2", date: "25 Mar 2026" },
            { name: "SGPT (ALT)", value: "62", unit: "U/L", flag: "high", refRange: "5–40", date: "25 Mar 2026" },
            { name: "SGOT (AST)", value: "48", unit: "U/L", flag: "high", refRange: "5–40", date: "25 Mar 2026" },
            { name: "Alk Phosphatase", value: "168", unit: "U/L", flag: "high", refRange: "40–129", date: "25 Mar 2026" },
            { name: "Serum Albumin", value: "3.4", unit: "g/dL", flag: "low", refRange: "3.5–5.0", date: "25 Mar 2026" },
          ],
          hiddenNormalCount: 11,
          additionalNotes:
            "Family screening: sibling appointment booked for 1 Apr 2026. Mother counselled re: HAV transmission completed, autosomal-recessive inheritance of Wilson's.",
        },
      ],
    },
    {
      source: { specialty: "Ophthalmology · Kayser-Fleischer ring assessment", author: "Dr Sejal Shah", date: "10 Mar 2026" },
      reason: "Wilson's disease slit-lamp screening for KF rings. The classic ocular sign of copper deposition and a routine part of Wilson's workup.",
      dateRangeLabel: "10 Mar '26",
      consultationCount: 1,
      doctorsLabel: "Dr Sejal Shah",
      // Verbatim from the Ophthalmology visit (10 Mar 2026, Dr Sejal Shah).
      lines: [
        "**Findings**: Slit-lamp screening for **Kayser-Fleischer ring** (referral from Wilson's disease management)",
        "**Plan**: Annual slit-lamp KF-ring re-assessment | sooner if any visual symptoms",
      ],
      // No structured lab rows from this ophthalmology visit — the slit-lamp
      // finding is a clinical observation, not a measurement. Omit the labs
      // row (renderer skips it cleanly).
      openLoops: [
        "Gastroenterology referred to Ophthalmology for **slit-lamp KF-ring assessment**, visit happened on 10 Mar 2026 but the result (positive/negative) is not on the structured record",
      ],
      consultations: [
        {
          date: "10 Mar 2026",
          visitType: "OPD",
          doctor: "Dr Sejal Shah",
          headline: "Slit-lamp examination for **Kayser-Fleischer ring** screening, referral from Gastroenterology.",
          symptoms: "No visual complaints | No photophobia | No floaters",
          examination:
            "BCVA 6/6 OD, 6/6 OS · IOP 14 mmHg OD, 13 mmHg OS · Anterior segment: clear cornea bilaterally · **Slit-lamp Descemet's membrane examination performed for KF ring screening** · Fundus normal both eyes",
          diagnosis: "Slit-lamp screening for **Kayser-Fleischer ring** (referral from Wilson's disease management)",
          investigations: "No further investigations needed today",
          advice: "Result communicated to Gastroenterology · Repeat slit-lamp annually while on chelation",
          followUp: "Annual slit-lamp KF-ring re-assessment | sooner if any visual symptoms",
          additionalNotes:
            "Structured Rx body for this referral visit does not capture the explicit slit-lamp KF-ring finding (positive/negative). Per OMOP record, only the encounter and the assessment intent were logged — the narrative result needs to be reconciled with Gastroenterology's chelation-adequacy decision.",
        },
      ],
    },
  ],
  collisions: [
    {
      kind: "ddi",
      title: "**Penicillamine + Prednisolone**, pediatric immunosuppression burden during acute viral infection",
      points: [
        "Penicillamine adds T-cell modulation to a Prednisolone-tapering background.",
        "Patient has active HAV, viral clearance kinetics may be slowed.",
        "Pediatric Wilson's regimen typically separates initiation of chelation from steroid use unless specifically AIH-overlap indicated.",
      ],
      rule: {
        body: "AASLD",
        year: "2023",
        section: "Wilson's Disease Practice Guidance",
        readableBody: "American Association for the Study of Liver Diseases — the US hepatology body whose Wilson's-disease practice guidance is the international standard.",
        description: "Defines when chelation should be initiated, and the very narrow criteria under which a corticosteroid can run alongside Penicillamine (essentially only for AIH overlap).",
        whyPicked: "Master Arjun was started on Penicillamine 250 mg BID (chelation) AND Wysolone (Prednisolone) on the same admission for acute HAV. He also has active viral infection, where steroid co-administration can slow viral clearance. AASLD criteria for this specific combination aren't documented in the record.",
        fetches: "Whether the steroid + Penicillamine pairing meets the AASLD AIH-overlap criteria, and the timing of chelation initiation.",
        confidence: "supportive",
      },
    },
    {
      kind: "coordination-gap",
      title: "**Penicillamine safety monitoring**, 24-h urinary copper + CBC + urinalysis not on file",
      points: [
        "Standard of care: 24-h urinary copper at weeks 1, 4, 12 after initiation.",
        "Penicillamine-induced nephrotic syndrome surveillance: urine PCR monthly × 6 months.",
        "Neither investigation appears in lab rows for this patient.",
      ],
      rule: {
        body: "AASLD",
        year: "2023",
        section: "Wilson's monitoring",
        readableBody: "AASLD Wilson's disease guidance — monitoring section on chelation therapy.",
        description: "Sets the specific cadence for monitoring Penicillamine safety — 24-h urinary copper at weeks 1, 4 and 12 to confirm chelation efficacy, plus urine protein:creatinine monthly for six months to catch Penicillamine-induced nephrotic syndrome.",
        whyPicked: "Master Arjun started Penicillamine on 24 Feb 2026. By his last visit (25 Mar 2026, 1-month mark) none of the AASLD-mandated safety labs — 24-h urinary copper or urine PCR — appear in the lab table. The chelation is active without the safety scaffolding underneath it.",
        fetches: "Whether the scheduled monitoring labs (urinary copper, urine PCR) are on file at the right week-mark.",
        confidence: "established",
      },
    },
    {
      kind: "coordination-gap",
      title: "**Family screening for Wilson's disease**, siblings + first-degree relatives not documented",
      points: [
        "Wilson's is autosomal recessive, first-degree relatives have 25% risk of being affected.",
        "AASLD recommends ATP7B + serum ceruloplasmin + 24-h copper for all first-degree relatives.",
        "Family screening status not in observation or condition rows.",
      ],
      rule: {
        body: "AASLD",
        year: "2023",
        section: "Family screening",
        readableBody: "AASLD Wilson's disease guidance — proband-family screening section.",
        description: "Specifies that once a Wilson's-disease proband is identified, all first-degree relatives must be offered ATP7B genetic testing, serum ceruloplasmin and 24-h urinary copper, because each carries a 25% chance of being affected.",
        whyPicked: "Master Arjun has confirmed Wilson's. He has a documented 8-year-old sibling. By AASLD, that sibling — and his parents — should have been offered screening at or shortly after his diagnosis. The observation and condition rows show no family-screening entry for any first-degree relative.",
        fetches: "Whether first-degree-relative screening has been initiated, and which relatives are accounted for.",
        confidence: "established",
      },
    },
  ],
  pendingMdtItems: [
    "Schedule 24-h urinary copper at the 1-month-post-initiation mark.",
    "Order serum ceruloplasmin baseline + repeat.",
    "Confirm ATP7B gene-test status, initiate if not done.",
    "Family screening counselling for siblings + parents.",
    "Re-test HAV IgG to confirm seroconversion at 6-week mark.",
  ],
  syntheses: [
    {
      panelTitle: "LFT trend · serial monitoring during recovery",
      guideline: {
        body: "AASLD",
        year: "2023",
        readableBody: "American Association for the Study of Liver Diseases — Acute Hepatitis A clinical-course reference.",
        description: "Defines the expected Bilirubin and transaminase resolution trajectory in acute HAV, so deviation from that trajectory can be detected early.",
        whyPicked: "Master Arjun has the richest serial LFT dataset in the catalogue — Bilirubin trended from 8.4 → 1.8 mg/dL and SGPT from 612 → 62 U/L across the IPD admission and five OPD follow-ups. The AASLD reference curve is what Velora used to confirm his trajectory is on-pattern and chelation can continue uninterrupted.",
        fetches: "His Bilirubin / SGPT readings against the published resolution curve.",
        confidence: "supportive",
      },
      rows: [
        { label: "Serial Bilirubin (Total)", value: "70 readings across 6 visits", ref: "From lab rows tagged 'Liver Function Tests - LFT|Serum Bilirubin Total'. Daily during admission + at every OPD f/u.", tone: "ok" },
        { label: "Serial SGPT (ALT)", value: "70 readings", ref: "From lab rows tagged 'Liver Function Tests - LFT|SGPT (AST)'. Trend supports HAV resolution.", tone: "ok" },
        { label: "Direct vs Indirect Bilirubin split", value: "Captured in 70 paired rows", ref: "Both fractions measured at every visit, supports cholestatic pattern on admission, resolving on follow-up.", tone: "ok" },
      ],
      note: "The richest serial-lab dataset of any catalogue patient. Strong recovery trajectory; Wilson's chelation can continue uninterrupted.",
    },
    {
      panelTitle: "Wilson's disease monitoring status",
      guideline: {
        body: "AASLD",
        year: "2023",
        readableBody: "AASLD Wilson's-disease practice guidance — full monitoring + family-screening obligation set.",
        description: "Defines the full surveillance scaffolding that must accompany chelation initiation: 24-h urinary copper at fixed intervals, baseline serum ceruloplasmin, and proband-family screening for all first-degree relatives.",
        whyPicked: "Master Arjun's Penicillamine + Zinc chelation regimen is the entire reason this guideline applies. The four monitoring inputs AASLD mandates around that regimen are what this panel checks against his record.",
        fetches: "Each of the four AASLD-mandated monitoring inputs and whether it's on file.",
        confidence: "established",
      },
      rows: [
        { label: "Penicillamine started", value: "Yes (Cilamin 250 mg)", ref: "From prescription records during IPD admission.", tone: "ok" },
        { label: "24-h urinary copper", value: "Not on file", ref: "No lab row matches /copper|cuprum/ pattern.", tone: "alert" },
        { label: "Serum ceruloplasmin", value: "Not on file", ref: "No lab row matches.", tone: "alert" },
        { label: "Family screening", value: "Not documented", ref: "No observation rows tagged family_history_*.", tone: "alert" },
      ],
      note: "Treatment is started; the surveillance scaffolding around it isn't. Three of four monitoring inputs need to land before the next visit.",
    },
  ],
  freshness: "Synced just now",
}

/**
 * MDT brief mock — shared by the chat reply pipeline and the deep-dive
 * documentation page. Keeping it as a single export means the doc page renders
 * the exact same card the doctor sees in chat — no parallel mock to drift.
 */
export const MDT_BRIEF_MOCK: VeloraV0MdtBriefData = {
  patientName: "Ravi Shankar",
  patientMeta: "M, 64y · MRN-78214",
  // ── New patient-context strip (renders as "Ravi Shankar · M · 64 · …") ──
  patientGender: "M",
  patientAge: 64,
  patientMobile: "+91 98765 78214",
  patientId: "MRN-78214",
  // Chronic conditions / concerning diagnoses shown ONCE at the top of the
  // card; per-specialty sections only describe what each team did about
  // them. Synthesised from the Endo + Nephro Rx history for this patient.
  chronicConditions: [
    "**T2DM** (dx 2019, uncontrolled · **HbA1c 8.4%**), Endo-managed",
    "**CKD G3a** (dx 2024 · diabetic nephropathy · **eGFR 48**), Nephro-managed",
    "**Atrial fibrillation**, Cardio-managed (today is Dr Sharma's first contact)",
    "**Hypertension** (resistant pattern on **ABPM 152/95** · 3 agents already active)",
    "**Penicillin allergy** (severe), on file across teams",
  ],
  windowDays: 90,
  specialties: [
    /**
     * Cardiology is NOT shown — Dr Sharma (the Velora user) is the Cardiologist
     * doing his FIRST consult with Ravi today. The "own-specialty filter" rule
     * excludes the user's own specialty AND today's visit is the first Cardio
     * contact at this hospital, so there's nothing to surface from Cardio.
     *
     * MDT brief surfaces only the two teams that have already touched Ravi at
     * Zydus: Endocrinology + Nephrology. They've been managing his chronic
     * disease; today Dr Sharma is being looped in for AFib + renal-dose review.
     */
    {
      source: {
        specialty: "Endocrinology",
        author: "Dr Iyer",
        date: "18 Apr 2026",
        sourceId: "Rx #RX-3104",
      },
      reason:
        "Most recent Endocrinology Rx in the 90-day window. Picked because the T2DM regimen drives the diabetic-nephropathy trajectory Dr Sharma is being looped in for today, and a new SGLT2 was just started in light of CKD G3a without Cardio notification.",
      // Trust-layer provenance. Tells the doctor exactly how many notes feed
      // this synthesis and which authors, so they can challenge before acting.
      provenance:
        "Based on 2 Endocrinology consultations · 06 Feb 2026 → 18 Apr 2026 · Dr Iyer",
      lines: [
        "**Findings**: **T2DM** (uncontrolled, HbA1c 8.4%) · **diabetic nephropathy** secondary · CKD G3a co-management with Nephro",
        "**Medications**: **Metformin 1000 mg BID** (continued) · adding **Empagliflozin 10 mg OD** (renal-protective at G3a)",
        "**Plan**: Recheck HbA1c + lipid panel · **Follow-up** 12 weeks · review SGLT2 tolerance · Cardio not yet looped in on the new SGLT2 start",
      ],
    },
    {
      source: {
        specialty: "Nephrology",
        author: "Dr Bose",
        date: "02 Apr 2026",
        sourceId: "Rx #RX-3082",
      },
      reason:
        "Primary referring team. CKD G3a confirmation on this Rx is the reason Dr Sharma is seeing Ravi today, Nephro requested a joint anticoag + renal-dose review with Cardio after eGFR dropped below 60.",
      provenance:
        "Based on 3 Nephrology consultations · 12 Jan 2026 → 02 Apr 2026 · Dr Bose",
      lines: [
        "**Findings**: Stage **G3a CKD** (diabetic nephropathy) · eGFR ↓48 · ACR ↑60 mg/g · K⁺ stable at 4.2",
        "**Medications**: Monitoring only, no nephro-prescribed drug on file. Renal-dose ceiling on Metformin flagged for Endo.",
        "**Plan**: Repeat eGFR + ACR · **Follow-up** 8 weeks · Hold apixaban dose-up pending Cardio review · joint Cardio + Nephro review requested",
      ],
    },
  ],
  collisions: [
    {
      kind: "ddi",
      title: "**Metformin** × **CKD G3a**, dose above renal limit",
      points: [
        "Active: **Metformin 1000 mg BID** (total 2000 mg/day) from Endo's 18 Apr Rx.",
        "Current **eGFR**: __↓48__ (G3a, KDIGO 02 Apr).",
        "ADA 2024 §6.5 caps total daily Metformin at **1000 mg/day** when eGFR is 30-60.",
        "Action: review with Endo before next refill.",
      ],
      rule: {
        body: "ADA",
        year: "2024",
        section: "§6.5",
        description: "American Diabetes Association, Standards of Care for diabetes management in renal impairment.",
        fetches: "Metformin dose ceiling at eGFR 30-60 mL/min/1.73 m².",
      },
    },
    {
      kind: "coordination-gap",
      title: "**Apixaban** × **Empagliflozin**, coordination gap",
      points: [
        "**Empagliflozin 10 mg OD** started by Endo on **18 Apr**.",
        "AFTER Nephro's **eGFR 48** reading on **02 Apr**, G3a confirmed.",
        "Cardio (managing Apixaban) is **not yet notified** on the record.",
        "KDIGO §4.3.1 puts renal drug dosing under joint review at G3a, the join didn't happen.",
      ],
      rule: {
        body: "KDIGO",
        year: "2024",
        section: "§4.3.1",
        description: "Kidney Disease Improving Global Outcomes, worldwide consensus for CKD staging and renal drug-dose adjustment.",
        fetches: "eGFR thresholds for SGLT2-inhibitor and anticoag dose decisions.",
      },
    },
  ],
  pendingMdtItems: [
    "Joint review of anticoag dose post-eGFR drop, requested 03 Apr, not held.",
    "No documented MDT meeting in last 90 days.",
  ],
  syntheses: [
    {
      panelTitle: "AF anticoagulation status",
      guideline: {
        body: "ESC",
        year: "2024",
        description: "European Society of Cardiology, guideline for atrial fibrillation management.",
        fetches: "Stroke-risk score (CHA₂DS₂-VASc) target ≥2 → AC indicated · preferred DOAC for renal impairment (apixaban for eGFR <50).",
      },
      rows: [
        {
          label: "CHA₂DS₂-VASc",
          value: "4",
          /** Source provenance: shown as the InfoTip on the label.
           *  Tells the doctor exactly where the value came from — no black box. */
          ref: "Computed deterministically from Patient.age + Diagnosis (AFib, CKD) + Vitals.bloodPressure. ESC 2024 target ≥2 → AC indicated.",
          tone: "alert",
        },
        {
          label: "DOAC",
          value: "Apixaban",
          ref: "From Medication (Rx) rows · class = anticoagulant. ESC 2024 prefers Apixaban when eGFR < 50.",
          tone: "ok",
        },
      ],
      note: "Triggered by Ravi's active conditions (AFib in the Conditions table) + active Medication (Apixaban). Cardiology's own note is filtered out of Stack 1 because Dr Sharma authored it himself, but the underlying structured data still drives this panel.",
    },
    {
      panelTitle: "Resistant HTN panel",
      guideline: {
        body: "ESC/ESH",
        year: "2023",
        description: "European Society of Cardiology + European Society of Hypertension, joint guideline for resistant hypertension.",
        fetches: "Ambulatory BP target ≥135/85 · resistant-HTN classification at ≥3 antihypertensives + uncontrolled ABPM.",
      },
      rows: [
        {
          label: "ABPM Daytime mean",
          value: "152/95",
          ref: "Averaged from Vitals.bloodPressure entries in last 30d with context = ambulatory_day. ESC/ESH 2023 target ≥135/85.",
          tone: "warn",
        },
        {
          label: "Antihypertensive count",
          value: "3",
          ref: "COUNT(Medication (Rx) rows WHERE class = 'antihypertensive' AND active = true) at this hospital.",
          tone: "ok",
        },
      ],
      note: "HTN appears in Ravi's chronic-conditions list and ABPM > target in the last 30 days. With 3 antihypertensives already active, ESC/ESH §11.3 resistant-HTN classification applies, panel renders because both required inputs (BP + drug count) are present.",
    },
  ],
  freshness: "Synced 12 min ago",
}

/**
 * Patient journey mock — shared by the chat reply pipeline and the deep-dive
 * documentation page. One canonical Ravi-Shankar timeline drives both.
 */
// ═════════════════════════════════════════════════════════════════════════
// PER-PATIENT JOURNEY SYNTHESISERS
// ─────────────────────────────────────────────────────────────────────────
// The patient-journey card is built FROM the same brief-mock data already
// authored above. Each consultation in a brief's `specialties[].consultations`
// becomes one event on the journey timeline, sorted chronologically. This
// guarantees the journey can never drift from the cross-consultation brief
// — they're the same canonical record, rendered two ways.
// ═════════════════════════════════════════════════════════════════════════

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

/** Parse a human-friendly consultation-date string ("8 May 2025",
 *  "Sep 2025", "11 - 12 May 2026", "10 Mar '26", "post-op week 2") into a
 *  comparable Unix-ms sort key. Falls back to 0 when nothing parseable
 *  exists — those entries collect at the start of the timeline in their
 *  original order. */
function parseJourneyDate(raw: string): number {
  if (!raw) return 0
  // "10 Mar '26" → "10 Mar 2026"
  const expanded = raw.replace(/'(\d{2})\b/g, "20$1")
  // Try "{D} {Mon} {YYYY}" first.
  const m1 = expanded.match(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/)
  if (m1) {
    const day = parseInt(m1[1], 10)
    const mon = MONTH_INDEX[m1[2].slice(0, 3).toLowerCase()]
    const year = parseInt(m1[3], 10)
    if (mon !== undefined) return new Date(year, mon, day).getTime()
  }
  // "{Mon} {YYYY}"
  const m2 = expanded.match(/([A-Za-z]{3,})\s+(\d{4})/)
  if (m2) {
    const mon = MONTH_INDEX[m2[1].slice(0, 3).toLowerCase()]
    const year = parseInt(m2[2], 10)
    if (mon !== undefined) return new Date(year, mon, 15).getTime()
  }
  return 0
}

/** Compress a specialty name to the 6-8 character chip used by the journey
 *  rail. Strips trailing scope qualifiers ("· IPD admission") so the chip
 *  reads as one consistent token. */
function shortSpecialty(specialty: string): string {
  const base = specialty.split("·")[0]?.trim() ?? specialty
  const map: Record<string, string> = {
    "Oncology": "Onco",
    "Onco-surgery": "Onco-Sx",
    "Cardiology": "Cardio",
    "Pulmonology": "Pulmo",
    "Pulmonology & Critical Care": "Pulmo",
    "Nephrology": "Nephro",
    "Gastroenterology": "Gastro",
    "Endocrinology": "Endo",
    "Diabetology": "Diab",
    "Neurology": "Neuro",
    "Neurosurgery": "Neuro-Sx",
    "Rheumatology": "Rheum",
    "Pain Specialist": "Pain",
    "Internal Medicine": "IntMed",
    "Orthopaedics": "Ortho",
    "ENT": "ENT",
    "Urology": "Uro",
    "Ophthalmology": "Ophthal",
  }
  return map[base] ?? base.slice(0, 8)
}

/** Compact abnormal labs from a consultation into a HighlightLine-rendered
 *  "key labs" string. Picks up to 3 most-flagged values. */
function consultationLabsToKeyLabsString(c: VeloraV0Consultation): string | undefined {
  const labs = (c.labResults ?? []).filter((l) => l.flag !== "normal")
  if (labs.length === 0) return undefined
  // Sort critical → high → low.
  const rank: Record<string, number> = { critical: 0, high: 1, low: 2, normal: 3 }
  const sorted = [...labs].sort((a, b) => (rank[a.flag] ?? 9) - (rank[b.flag] ?? 9)).slice(0, 3)
  return sorted
    .map((l) => {
      const arrow = l.flag === "high" || l.flag === "critical" ? "↑" : l.flag === "low" ? "↓" : ""
      return `**${l.name}** __${arrow}${l.value}${l.unit ? " " + l.unit : ""}__`
    })
    .join(" · ")
}

/** Map one VeloraV0Consultation (+ its parent specialty) to one journey
 *  event. Empty Rx fields are omitted from `rxPointers`. */
function consultationToJourneyEvent(
  c: VeloraV0Consultation,
  specialty: string,
): VeloraV0JourneyEvent {
  const author = `${c.doctor} · ${specialty.split("·")[0]?.trim() ?? specialty}`
  const findings = c.diagnosis ?? c.findings
  const keyLabs = consultationLabsToKeyLabsString(c) ?? c.investigations
  const medication = c.medications
  const advices = c.advice
  const plan = c.followUp ?? c.plan
  const hasAnyPointer = !!(findings || keyLabs || medication || advices || plan)
  // IPD admissions render as the red ADMIT pill; OPDs use the standard
  // outline consult chip; per-specialty surgical or oncology visits still
  // read as consults — the headline carries the substance.
  const tone: VeloraV0JourneyEvent["tone"] =
    c.visitType === "IPD" || c.dischargeSummary ? "admit" : "consult"
  return {
    date: c.date,
    specialtyLabel: shortSpecialty(specialty),
    tone,
    doctor: c.doctor,
    headline: c.headline,
    rxPointers: hasAnyPointer
      ? {
          author,
          ...(findings ? { findings } : {}),
          ...(keyLabs ? { keyLabs } : {}),
          ...(medication ? { medication } : {}),
          ...(advices ? { advices } : {}),
          ...(plan ? { plan } : {}),
        }
      : undefined,
  }
}

/** Read a specialty's open-loop strings and emit a red "open" event for
 *  each, dated at the specialty's last visit. Keeps the open-loops
 *  signal visible on the timeline at the date the loop became overdue. */
function specialtyOpenLoopEvents(spec: VeloraV0Attribution): VeloraV0JourneyEvent[] {
  if (!spec.openLoops || spec.openLoops.length === 0) return []
  const anchorDate =
    spec.consultations && spec.consultations.length > 0
      ? spec.consultations[spec.consultations.length - 1].date
      : spec.source.date
  return spec.openLoops.map((loop) => ({
    date: anchorDate,
    specialtyLabel: "Open",
    tone: "open-loop" as const,
    doctor: spec.doctorsLabel ?? spec.source.author,
    headline: loop,
    detail: `Open loop on ${spec.source.specialty} stream. Anchored at the team's most recent visit.`,
  }))
}

/** Build a complete VeloraV0PatientJourneyData from a brief mock by
 *  flattening every specialty's consultations and open loops, then sorting
 *  chronologically. The patient-journey card thus reads as the same record
 *  as the cross-consultation brief, just rendered as a timeline. */
function buildPatientJourneyFromBrief(brief: VeloraV0MdtBriefData): VeloraV0PatientJourneyData {
  const events: Array<VeloraV0JourneyEvent & { _sort: number; _ord: number }> = []
  let ord = 0
  for (const spec of brief.specialties) {
    for (const c of spec.consultations ?? []) {
      events.push({
        ...consultationToJourneyEvent(c, spec.source.specialty),
        _sort: parseJourneyDate(c.date),
        _ord: ord++,
      })
    }
    for (const ol of specialtyOpenLoopEvents(spec)) {
      events.push({ ...ol, _sort: parseJourneyDate(ol.date), _ord: ord++ })
    }
  }
  // Chronological sort; unparseable dates collapse to 0 and retain insertion order.
  events.sort((a, b) => (a._sort - b._sort) || (a._ord - b._ord))
  const stripped: VeloraV0JourneyEvent[] = events.map(({ _sort, _ord, ...rest }) => rest)
  // Window label — use the first and last parseable dates.
  const parseable = events.filter((e) => e._sort > 0)
  const firstDate = parseable[0]?.date ?? brief.specialties[0]?.source?.date ?? ""
  const lastDate = parseable[parseable.length - 1]?.date ?? ""
  const months =
    parseable.length > 1
      ? Math.max(
          1,
          Math.round(
            (parseable[parseable.length - 1]._sort - parseable[0]._sort) /
              (1000 * 60 * 60 * 24 * 30),
          ),
        )
      : Math.max(1, Math.round(brief.windowDays / 30))
  // Encounter count — sum of consultationCount across specialties (the source-
  // of-truth visit count from the brief, not the size of `events`, because the
  // journey may show a representative subset of visits per specialty).
  const totalVisits = brief.specialties.reduce(
    (sum, s) => sum + (typeof s.consultationCount === "number" ? s.consultationCount : 0),
    0,
  )
  return {
    patientName: brief.patientName,
    patientMeta: brief.patientMeta,
    windowLabel: firstDate && lastDate ? `${firstDate} → ${lastDate}` : `${brief.windowDays} days`,
    windowMonths: months,
    encounterCount: totalVisits || stripped.length,
    events: stripped,
  }
}

// ── Per-patient journey exports — driven by each patient's brief mock ──
export const LAKSHMI_IYER_PATIENT_JOURNEY_MOCK: VeloraV0PatientJourneyData =
  buildPatientJourneyFromBrief(LAKSHMI_IYER_BRIEF_MOCK)
export const SURESH_PATEL_PATIENT_JOURNEY_MOCK: VeloraV0PatientJourneyData =
  buildPatientJourneyFromBrief(SURESH_PATEL_BRIEF_MOCK)
export const ASHA_KRISHNAN_PATIENT_JOURNEY_MOCK: VeloraV0PatientJourneyData =
  buildPatientJourneyFromBrief(ASHA_KRISHNAN_BRIEF_MOCK)
export const MEERA_JOSHI_PATIENT_JOURNEY_MOCK: VeloraV0PatientJourneyData =
  buildPatientJourneyFromBrief(MEERA_JOSHI_BRIEF_MOCK)
export const ANITA_DESAI_PATIENT_JOURNEY_MOCK: VeloraV0PatientJourneyData =
  buildPatientJourneyFromBrief(ANITA_DESAI_BRIEF_MOCK)
export const ARJUN_VERMA_PATIENT_JOURNEY_MOCK: VeloraV0PatientJourneyData =
  buildPatientJourneyFromBrief(ARJUN_VERMA_BRIEF_MOCK)

// Legacy export — kept for the deep-dive doc page only. Not routed from chat.
export const PATIENT_JOURNEY_MOCK: VeloraV0PatientJourneyData = {
  patientName: "Ravi Shankar",
  patientMeta: "M, 64y · MRN-78214",
  windowLabel: "Sep 2024 → 28 Apr 2026",
  windowMonths: 20,
  encounterCount: 8,
  events: [
    {
      date: "Sep 2024",
      specialtyLabel: "Endo",
      tone: "consult",
      doctor: "Dr Iyer",
      headline: "Initial **T2DM** consult · root cause of his future CKD · started **Metformin 1000 mg BID** · **HbA1c** __↑9.1%__",
      rxPointers: {
        author: "Dr Iyer · Endocrinology · routine OPD",
        findings: "**T2DM** (newly diagnosed)",
        keyLabs: "**HbA1c**: __↑9.1%__ · **FBS**: __↑168 mg/dL__ · **eGFR** 82 (baseline normal)",
        medication: "Started **Metformin 1000 mg BID**",
        plan: "Recheck HbA1c + lipid panel · **Follow-up** 12 weeks · diet counselling · home glucose monitoring",
      },
      sourceId: "RX-2840",
      sourceType: "rx",
    },
    {
      date: "Mar 2025",
      specialtyLabel: "External",
      tone: "consult",
      doctor: "Referring hospital",
      headline: "**AFib (paroxysmal)** diagnosed at City General · **Apixaban 5 mg BID** started",
      detail: "External record, Apixaban prescription history imported on referral. No Cardiology Rx at Zydus until today's consult.",
      sourceId: "EXT-CG-1142",
      sourceType: "rx",
    },
    {
      date: "Aug 2025",
      specialtyLabel: "Lab",
      tone: "lab",
      doctor: "Ordered by Dr Iyer",
      headline: "Quarterly labs · **HbA1c** __↑9.1__ · **eGFR** 62 (baseline)",
      detail: "Quarterly lab panel ordered as routine follow-up. HbA1c remains above target; eGFR enters the watch range. No new prescription tied to this report, surfaces only for the trend.",
      sourceId: "LAB-21044",
      sourceType: "lab-report",
    },
    {
      date: "Sep 2025",
      specialtyLabel: "Nephro",
      tone: "consult",
      doctor: "Dr Bose",
      headline: "**First Nephro consult** · diabetic nephropathy suspected · Stage **G2 CKD** noted",
      rxPointers: {
        author: "Dr Bose · Nephrology · referred in by Dr Iyer (Endo)",
        findings: "Stage **G2 CKD** · suspected **diabetic nephropathy**",
        keyLabs: "**eGFR**: 62 · **ACR**: 22 mg/g",
        medication: "Monitoring only. No nephro-prescribed drug on file.",
        plan: "Repeat eGFR + ACR · **Follow-up** 8 weeks · avoid nephrotoxics (NSAIDs, IV contrast) · tighten glycaemic control with Endo",
      },
      sourceId: "RX-3014",
      sourceType: "rx",
    },
    {
      date: "Nov 2025",
      specialtyLabel: "Nephro",
      tone: "consult",
      doctor: "Dr Bose",
      headline: "CKD progressing · **eGFR** __↓55__ · **G3a** transition warning",
      rxPointers: {
        author: "Dr Bose · Nephrology · 12-week follow-up",
        findings: "CKD progressing · approaching **G3a** threshold (eGFR <60)",
        keyLabs: "**eGFR**: __↓55__ · **ACR**: __↑38 mg/g__",
        medication: "Monitoring only.",
        plan: "Repeat eGFR + ACR · **Follow-up** 12 weeks · salt-restricted diet · escalate dose-vs-eGFR review if drops below 60",
      },
      sourceId: "RX-3061",
      sourceType: "rx",
    },
    {
      date: "02 Feb 2026",
      specialtyLabel: "Nephro",
      tone: "consult",
      doctor: "Dr Bose",
      headline: "**eGFR** __↓51__ · **ACR** rising · ISN-India risk class updated",
      detail: "Short follow-up entry. Stage G3a confirmed at the next consult. No medication change at this visit.",
      sourceId: "RX-3082-1",
      sourceType: "rx",
    },
    {
      date: "02 Apr 2026",
      specialtyLabel: "Nephro",
      tone: "consult",
      doctor: "Dr Bose",
      headline: "**Stage G3a CKD confirmed** · **eGFR** __↓48__ · **triggers Cardio referral** for joint anticoag review",
      rxPointers: {
        author: "Dr Bose · Nephrology · 8-week follow-up",
        findings: "**Stage G3a CKD** confirmed (diabetic nephropathy)",
        keyLabs: "**eGFR**: __↓48__ · **ACR**: __↑60 mg/g__ · **K⁺**: 4.2 mmol/L",
        medication: "Monitoring only.",
        plan: "Repeat eGFR + ACR · **Follow-up** 8 weeks · Hold apixaban dose-up pending Cardio review · strict salt-restricted diet · joint Cardio + Nephro review requested (this referral brings Dr Sharma in today)",
      },
      sourceId: "RX-3082",
      sourceType: "rx",
    },
    {
      date: "18 Apr 2026",
      specialtyLabel: "Endo",
      tone: "consult",
      doctor: "Dr Iyer",
      headline: "**T2DM** uncontrolled · **Empagliflozin 10 mg OD** added (renal-protective at G3a)",
      rxPointers: {
        author: "Dr Iyer · Endocrinology · 12-week review",
        findings: "**T2DM** uncontrolled · diabetic nephropathy progressing",
        keyLabs: "**HbA1c**: __↑8.4%__ · **eGFR**: __↓48__",
        medication: "Continue **Metformin 1000 mg BID** · adding **Empagliflozin 10 mg OD** (renal-protective; Cardio not yet notified about anticoag overlap)",
        plan: "Recheck HbA1c + lipid panel · **Follow-up** 12 weeks · hydrate well after SGLT2 start · watch for UTI · review tolerance",
      },
      sourceId: "RX-3104",
      sourceType: "rx",
    },
    {
      date: "22 Apr 2026",
      specialtyLabel: "Open",
      tone: "open-loop",
      doctor: "Cardio intake",
      headline: "**Cardiology intake** appointment booked · **no-show**",
      detail: "First scheduled Cardiology intake at Zydus, patient did not attend. Open in the Appointment system; rescheduled to today (28 Apr).",
      sourceId: "APT-7740",
      sourceType: "appointment",
      ageDays: 6,
    },
    {
      date: "28 Apr '26",
      specialtyLabel: "Today",
      tone: "today",
      doctor: "Dr Sharma",
      headline: "**Initial Cardiology consult** triggered by Nephro's G3a referral · reviewing anticoag + renal-dose window",
      rxPointers: {
        author: "Dr Sharma · Cardiology · first visit at this hospital",
        findings: "**AFib (paroxysmal)**, imported from City General · re-confirmed on today's ECG",
        keyLabs: "**ECG** today: persistent AF · **CHA₂DS₂-VASc**: __↑4__ · **eGFR**: __↓48__ (G3a) · TSH ordered (pending)",
        medication: "**Apixaban 5 mg BID** (external, continued) · **Metoprolol 25 mg BID** added today",
        plan: "TSH result review (open-loop if >7d) · **Follow-up** 8 weeks · review apixaban dose vs eGFR · counsel patient on missed-appointment reschedule · joint Cardio + Nephro review (Nephro-initiated, accepted today)",
      },
      sourceId: "RX-3119",
      sourceType: "rx",
    },
    {
      date: "May 2026",
      specialtyLabel: "Scheduled",
      tone: "scheduled",
      doctor: "Dr Bose requested",
      headline: "Joint **Cardio + Nephro** review (requested 03 Apr) · **not yet held**",
      detail: "Requested by Dr Bose (Nephro) on 03 Apr after the G3a confirmation. Aim: align apixaban dose vs eGFR + review SGLT2 tolerance. No date confirmed yet, should be flagged at the next MDT.",
      sourceId: "REF-3088",
      sourceType: "referral",
    },
  ],
}

/** Map a (lowercased, trimmed) message to the matching V0 intent reply. */
export function buildVeloraV0Reply(rawMessage: string): ReplyResult | null {
  const trimmed = rawMessage.trim()

  // ── Sub-intent (follow-up) replies — exact-match lookup against the registry ──
  // The FollowUpSheet sends the canonical question string verbatim, so a direct
  // hit here keeps the trust contract: same question → same reply, every time.
  const followUp = findVeloraFollowUp(trimmed)
  if (followUp) {
    // If the follow-up defines a card-shaped reply (e.g. Trends → graph card),
    // emit that. Otherwise fall back to the default text_quote envelope.
    const rxOutput = followUp.reply.rxOutput ?? {
      kind: "text_quote" as const,
      data: {
        quote: followUp.reply.text,
        source: followUp.reply.footer ?? "Source: Velora v0 mock · Show Cypher",
      },
    }
    return {
      text: followUp.reply.text,
      loadingHint: followUp.loadingHint,
      loadingDelayMs: followUp.loadingHint ? 900 : 0,
      rxOutput,
    }
  }

  const m = trimmed.toLowerCase()

  // Intent ① — Cross-consultation brief (flagship; internal id stays `mdt_brief`).
  //
  // Default: surfaces Mr Suresh Patel (843373981236) — built from a complete
  // OMOP CDM export, 28 visits across 12 specialties, with structured medical
  // history and per-specialty open-loops disclosure. The richer demo case.
  //
  // Ravi Shankar is no longer a selectable patient in the catalogue (the demo
  // surface is locked to the 5 OMOP-backed patients). The MDT_BRIEF_MOCK export
  // is kept for the deep-dive documentation page only — not routed from chat.
  // Patient-aware dispatch — order matters. We check each patient's name +
  // person_id BEFORE the generic "cross-consultation" fall-through, so that
  // clicking the pill while Lakshmi is selected returns Lakshmi's brief, not
  // Suresh's. The WelcomeScreen pill click appends the active patientName to
  // the message ("Show cross-consultation brief for Lakshmi Iyer"), so the
  // name keyword is what drives selection.
  const isCrossConsult =
    m === "show mdt brief" ||
    m.includes("mdt brief") ||
    (m.includes("mdt") && m.includes("show")) ||
    m === "show cross-consultation brief" ||
    m === "show cross consultation brief" ||
    m.includes("cross-consultation") ||
    m.includes("cross consultation")

  // Explicit name matches first — each takes priority over the generic
  // fallback. The Suresh / Asha / Meera / Anita / Lakshmi name keywords are
  // distinct so order between them doesn't matter; what matters is that the
  // generic "Show cross-consultation brief" with no patient name lands on
  // Lakshmi (the catalogue's first / default patient) at the end.
  // ─── Per-patient chat preambles ─────────────────────────────────────
  // Two-line format: opens with "Here's the cross-consultation brief."
  // Second sentence states the visit profile (**N OPD**, **N IPD**, **N
  // specialties**, **window**) followed by the single most actionable
  // clinical signal. The ChatBubble renders **bold** markdown so key
  // numbers and the headline diagnosis pop without extra formatting.
  if (m.includes("asha") || m.includes("krishnan") || m.includes("375391871728")) {
    return {
      text: "Here's the cross-consultation brief. **59 OPD visits** across **4 specialties** over **12 months**, chronic **hypertension** plus recurrent viral fevers; **allergy review missing** across all prescriptions.",
      loadingHint: "Reading the record…",
      loadingDelayMs: 1000,
      suggestions: subSuggestionsFor("mdt_brief"),
      rxOutput: { kind: "velora_v0_mdt_brief", data: ASHA_KRISHNAN_BRIEF_MOCK },
    }
  }
  if (m.includes("meera") || m.includes("joshi") || m.includes("241381057447")) {
    return {
      text: "Here's the cross-consultation brief. **40 OPD visits** across **11 specialties** over **13 months**, **CAD + prior CVA** on dual antiplatelet for 12+ months; **DAPT de-escalation overdue**.",
      loadingHint: "Reading 11 specialty streams…",
      loadingDelayMs: 1400,
      suggestions: subSuggestionsFor("mdt_brief"),
      rxOutput: { kind: "velora_v0_mdt_brief", data: MEERA_JOSHI_BRIEF_MOCK },
    }
  }
  if (m.includes("anita") || m.includes("desai") || m.includes("714696991886")) {
    return {
      text: "Here's the cross-consultation brief. **33 OPD visits** across **15 specialties** over **17 months**, **severe hypertriglyceridaemia** driving recurrent pancreatitis; **fibrate not on board**.",
      loadingHint: "Reading 15 specialty streams…",
      loadingDelayMs: 1400,
      suggestions: subSuggestionsFor("mdt_brief"),
      rxOutput: { kind: "velora_v0_mdt_brief", data: ANITA_DESAI_BRIEF_MOCK },
    }
  }
  if (m.includes("suresh") || m.includes("patel") || m.includes("843373981236")) {
    return {
      text:
        "Here's the cross-consultation brief. **28 OPD visits** across **12 specialties** over **13 months**, **colon Ca T3N2b** with lung mets; **oncology surveillance overdue** and polypharmacy flags surfaced.",
      loadingHint: "Reading 12 specialty streams…",
      loadingDelayMs: 1400,
      suggestions: subSuggestionsFor("mdt_brief"),
      rxOutput: { kind: "velora_v0_mdt_brief", data: SURESH_PATEL_BRIEF_MOCK },
    }
  }
  if (m.includes("arjun") || m.includes("verma") || m.includes("319033560465")) {
    return {
      text:
        "Here's the cross-consultation brief. **1 IPD admission** (3 days) + **5 OPD reviews** across **3 specialties** in **29 days**, **decompensated Wilson's + acute Hepatitis A**; serial LFT trend supports recovery.",
      loadingHint: "Reading IPD admission + 5 OPD follow-ups…",
      loadingDelayMs: 1400,
      suggestions: subSuggestionsFor("mdt_brief"),
      rxOutput: { kind: "velora_v0_mdt_brief", data: ARJUN_VERMA_BRIEF_MOCK },
    }
  }
  // Lakshmi catches both her name AND the generic no-name fall-through —
  // she's the catalogue's default patient so the unqualified pill opens her
  // brief.
  if (isCrossConsult || m.includes("lakshmi") || m.includes("iyer") || m.includes("1093717054960")) {
    return {
      text: "Here's the cross-consultation brief. **21 OPD visits** across **5 specialties** in a **17-day pre-op burst**, **right breast Ca stage IA**; cardiac, OSA, and CKD clearances pending.",
      loadingHint: "Reading 5 specialty streams…",
      loadingDelayMs: 1200,
      suggestions: subSuggestionsFor("mdt_brief"),
      rxOutput: { kind: "velora_v0_mdt_brief", data: LAKSHMI_IYER_BRIEF_MOCK },
    }
  }

  // Intent ② — Patient journey (replaces "Open loops").
  // The whole hospital story for one patient as a vertical timeline,
  // synthesised from the SAME data that drives that patient's cross-
  // consultation brief — guaranteeing the two cards can never drift.
  // Open / pending items surface inline as RED rows at the date they
  // became overdue.
  const isPatientJourney =
    m === "show patient journey" ||
    m.includes("patient journey") ||
    m.includes("hospital journey") ||
    m.includes("timeline") ||
    m === "show open loops" ||
    m.includes("open loops")
  if (isPatientJourney) {
    // Pick the patient from the same name-keyword set used by the brief
    // routing above. Lakshmi catches both her name AND the unqualified
    // pill click (she's the catalogue default).
    type J = { brief: VeloraV0MdtBriefData; journey: VeloraV0PatientJourneyData }
    const pick = (): J => {
      if (m.includes("asha") || m.includes("krishnan") || m.includes("375391871728"))
        return { brief: ASHA_KRISHNAN_BRIEF_MOCK, journey: ASHA_KRISHNAN_PATIENT_JOURNEY_MOCK }
      if (m.includes("meera") || m.includes("joshi") || m.includes("241381057447"))
        return { brief: MEERA_JOSHI_BRIEF_MOCK, journey: MEERA_JOSHI_PATIENT_JOURNEY_MOCK }
      if (m.includes("anita") || m.includes("desai") || m.includes("714696991886"))
        return { brief: ANITA_DESAI_BRIEF_MOCK, journey: ANITA_DESAI_PATIENT_JOURNEY_MOCK }
      if (m.includes("suresh") || m.includes("patel") || m.includes("843373981236"))
        return { brief: SURESH_PATEL_BRIEF_MOCK, journey: SURESH_PATEL_PATIENT_JOURNEY_MOCK }
      if (m.includes("arjun") || m.includes("verma") || m.includes("319033560465"))
        return { brief: ARJUN_VERMA_BRIEF_MOCK, journey: ARJUN_VERMA_PATIENT_JOURNEY_MOCK }
      // Default / no-name fall-through → Lakshmi.
      return { brief: LAKSHMI_IYER_BRIEF_MOCK, journey: LAKSHMI_IYER_PATIENT_JOURNEY_MOCK }
    }
    const { brief, journey } = pick()
    return {
      text:
        `Here's ${brief.patientName}'s journey at this hospital, **${journey.windowMonths} month${journey.windowMonths === 1 ? "" : "s"}** · **${journey.encounterCount} encounters** across ${brief.specialties.length} specialt${brief.specialties.length === 1 ? "y" : "ies"}, with each visit's Rx and any open loops surfaced inline at the date they occurred.`,
      loadingHint: "Reading every signed visit · admissions · open loops…",
      loadingDelayMs: 1400,
      suggestions: subSuggestionsFor("patient_journey"),
      rxOutput: {
        kind: "velora_v0_patient_journey",
        data: journey,
      },
    }
  }

  // Legacy ② — Open loops (kept for any old triggers; replaced by Patient journey).
  if (false) {
    return {
      text: "(legacy)",
      rxOutput: {
        kind: "velora_v0_open_loops",
        data: {
          patientName: "Lakshmi Pandey",
          patientMeta: "F, 58y · MRN-44103",
          loops: [
            {
              ageDays: 41,
              severity: "red",
              title: "**Cardiology** referral · no destination visit",
              sourceId: "Referral #REF-3119",
              source: { specialty: "GenMed → Cardio", author: "Dr Bose", date: "30 Mar 2026" },
              detector: "internal referral >30d · no Cardio Visit created",
            },
            {
              ageDays: 12,
              severity: "red",
              title: "**TSH** ordered · no result on file",
              sourceId: "Order #LAB-22841",
              source: { specialty: "GenMed", author: "Dr Bose", date: "28 Apr 2026" },
              detector: "lab order >7d · no result_id",
            },
            {
              ageDays: 73,
              severity: "amber",
              title: "**Telmisartan** refill · no in-hospital fill",
              sourceId: "Rx #RX-1840",
              source: { specialty: "GenMed", author: "Dr Bose", date: "26 Feb 2026" },
              detector: "active Rx without fill in 90d",
              disclosure: "Pharmacy data is in-hospital only · the patient may be filling outside.",
            },
            {
              ageDays: 18,
              severity: "amber",
              title: "**Follow-up** booked · **no-show**",
              sourceId: "Appointment #APT-7740",
              source: { specialty: "GenMed", author: "Front desk", date: "22 Apr 2026" },
              detector: "Appointment.status == 'no-show' · last 30d",
            },
          ],
          thresholdConfig: {
            signedBy: "GenMed lead · Zydus",
            rules: [
              { category: "Lab order without result", window: ">7 days = open" },
              { category: "Internal referral without destination visit", window: ">30 days = open" },
              { category: "Chronic Rx without in-hospital fill", window: ">90 days = signal (not adherence truth)" },
              { category: "Booked follow-up no-show", window: "last 30 days" },
            ],
          },
          freshness: "Synced 8 min ago",
        },
      },
    }
  }

  // Intent ③ — Active meds & safety
  if (
    m === "show active meds and safety" ||
    m.includes("active meds") ||
    m.includes("active medications") ||
    (m.includes("ddi") && (m.includes("show") || m.includes("check"))) ||
    m.includes("drug interaction")
  ) {
    return {
      text:
        "Suresh Iyer is on 6 active medications across 2 specialties. One DDI is flagged: Naproxen × Apixaban (NSAID on a DOAC).",
      loadingHint: "Checking DDI rules · class-level Lexicomp + Zydus formulary…",
      loadingDelayMs: 1300,
      suggestions: subSuggestionsFor("active_meds"),
      rxOutput: {
        kind: "velora_v0_active_meds",
        data: {
          patientName: "Suresh Iyer",
          patientMeta: "M, 71y · MRN-29117",
          meds: [
            { drug: "Apixaban", dose: "5 mg BID", specialty: "Cardio", prescriber: "Dr Sharma", since: "12 Mar 2026" },
            { drug: "Bisoprolol", dose: "5 mg OD", specialty: "Cardio", prescriber: "Dr Sharma", since: "12 Mar 2026" },
            { drug: "Atorvastatin", dose: "40 mg N", specialty: "Cardio", prescriber: "Dr Sharma", since: "12 Mar 2026" },
            { drug: "Metformin", dose: "1000 mg BD", specialty: "GenMed", prescriber: "Dr Bose", since: "04 Feb 2026" },
            { drug: "Pantoprazole", dose: "40 mg M", specialty: "GenMed", prescriber: "Dr Bose", since: "04 Feb 2026" },
            { drug: "Naproxen", dose: "500 mg PRN", specialty: "GenMed", prescriber: "Dr Bose", since: "22 Apr 2026" },
          ],
          allergiesOnFile: [],
          recentLabs: [
            { label: "Hb (g/dL)", value: "13.2", refRange: "13.0–17.0", tone: "ok" },
            { label: "Creatinine (mg/dL)", value: "1.1", refRange: "0.7–1.3", tone: "ok" },
            { label: "K+ (mmol/L)", value: "4.4", refRange: "3.5–5.1", tone: "ok" },
          ],
          ddi: [
            {
              drugs: ["Apixaban", "Naproxen"],
              severity: "alert",
              rationale:
                "**NSAID on a DOAC** raises **bleed risk**. Class rule fires · avoid co-prescription where possible; if needed, time-limit · add PPI · review at next visit.",
              rule: { body: "Lexicomp", section: "Class rule LX-0042" },
            },
          ],
          thresholdPanels: [
            {
              panelTitle: "Polypharmacy review trigger",
              guideline: { body: "NICE", year: "NG56" },
              rows: [
                { label: "Active chronic medications", value: "6", ref: "trigger ≥5 for 90d", tone: "warn" },
                { label: "Days on ≥5 chronic meds", value: "61", ref: "<90d → watch", tone: "warn" },
              ],
              note: "Polypharmacy panel surfaces as soon as the count crosses the signed threshold.",
            },
          ],
          freshness: "Synced 3 min ago",
        },
      },
    }
  }

  // Intent ④ — Why flagged today
  if (
    m === "why is this patient flagged today" ||
    m.includes("flagged today") ||
    m.includes("why flagged") ||
    (m.includes("flag") && m.includes("today"))
  ) {
    return {
      text:
        "Ramesh Kumar surfaced on the morning radar for 3 reasons (2 critical, 1 warning). Severity is from signed thresholds, not LLM judgment.",
      loadingHint: "Reviewing morning triggers · admissions, criticals, polypharmacy…",
      loadingDelayMs: 1300,
      suggestions: subSuggestionsFor("why_flagged"),
      rxOutput: {
        kind: "velora_v0_why_flagged",
        data: {
          patientName: "Ramesh Kumar",
          patientMeta: "M, 76y · MRN-90342",
          flags: [
            {
              severity: "critical",
              title: "Recent admission",
              detail:
                "Discharged **06 May** from Nephrology after a **4-day AKI episode**. Discharge summary on file.",
              source: { specialty: "Nephrology", author: "Dr Bose", date: "06 May 2026" },
            },
            {
              severity: "critical",
              title: "Critical lab unreviewed",
              detail:
                "**K⁺**: __↑5.8 mmol/L__ drawn 09 May · status **unreviewed** · no subsequent visit-tied note.",
              source: { specialty: "Lab", author: "Auto-flag", date: "09 May 2026" },
              guideline: { body: "Zydus lab ref" },
              thresholdNote: "K⁺ critical cut-off",
            },
            {
              severity: "warning",
              title: "Polypharmacy",
              detail:
                "**7 chronic medications** active for **≥90 days**. Medication review indicated.",
              source: { specialty: "GenMed", author: "Drug Exposure count", date: "12 May 2026" },
              guideline: { body: "NICE", year: "NG56" },
              thresholdNote: "≥5 chronic meds for 90d",
            },
          ],
          freshness: "Synced 26 min ago",
        },
      },
    }
  }

  return null
}
