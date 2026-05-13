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

import type { ReplyResult, VeloraV0MdtBriefData, VeloraV0PatientJourneyData } from "@/components/tp-rxpad/dr-agent/types"
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
        { text: "**Carcinoma · Hepatic flexure of colon · T3N2b · Mod diff adenocarcinoma**" },
        { text: "**Lung metastasis** most likely — **Metastatic disease**" },
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
        "Six independent consultations across Oncology + Onco-surgery + Internal Medicine record the colon-Ca diagnosis with consistent staging (T3N2b stage IIIB, moderately differentiated adenocarcinoma). Lung-metastasis was first flagged on the 30 Sep 2025 Oncology review; the recurrence signal is what should now drive active restaging.",
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
        "T2DM · HTN · Hypothyroidism · Iron deficiency · Diabetic neuropathy each appear in 5-7 independent consultations across the care team as Active status — high-confidence chronic disease stack. Seronegative arthritis (Rheumatology, 1 visit) and MID CBD stricture (2 visits) have weaker evidence but are clinically relevant to upcoming surgical / oncology decisions.",
    },
    {
      title: "Surgical history",
      tone: "neutral",
      items: [
        { text: "**Robotic-assisted Right Hemicolectomy** (30 Sep 2024)" },
        { text: "S/P **6 cycles adjuvant chemotherapy**" },
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
        "Right Hemicolectomy on 30 Sep 2024 + 6 cycles of adjuvant chemotherapy are referenced as historical surgical context across 6 specialty visits. The procedure itself predates the OMOP observation window (which opens 10 Feb 2025), so no inpatient visit_occurrence row exists — surgical event reconstructed from condition_occurrence narrative.",
    },
    {
      title: "Allergies & safety",
      tone: "positive",
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
        "Allergy review documented as Active on 6-7 separate specialty visits, all returning \"No known drug allergy\" and \"No known food allergy\". The explicit-negative pattern across this many independent reviews is a strong absence-of-allergy signal — not a data gap. Safe to prescribe contrast / antibiotics / NSAIDs without further allergy screening.",
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
        "Family and social history reviewed and documented as \"no significant / applicable findings\" on 6-7 visits. The colon-Ca diagnosis therefore appears to be sporadic rather than hereditary — relevant when counselling about screening for first-degree relatives.",
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
      dateRangeLabel: "8 May → 30 Sep '25",
      consultationCount: 12,
      doctorsLabel: "Dr Pankaj Shah / Dr Mithun Shah",
      lines: [
        // No Medications line — Oncology stream has nothing ongoing in window;
        // surfacing "none" was noise. The card hides this row automatically.
        "**Findings**: Post-op surveillance for **T3N2b stage IIIB colon Ca** s/p hemicolectomy + adjuvant chemo | multi-visit pattern, no fresh complaints recorded | exam (10/11 Jun) no gross focal deficit",
        "**Plan**: Monthly surveillance cadence held May-Sep 2025 | last contact 30 Sep 2025",
      ],
      openLoops: [
        "**Oncology surveillance overdue** · last contact 30 Sep 2025, no visit since · 6+ months gap · NCCN Colon Ca v.2.2024 §SURV-2 expects q3-6 mo",
        "**CEA tumour marker** last ordered 4 Apr 2025, no result row on file · NCCN §SURV-1 expects q3-6 mo × 5y post-resection",
        "**PET-CT** ordered 4 Apr 2025, no result row — critical given lung metastasis flagged later",
      ],
    },
    {
      source: {
        specialty: "Pulmonology",
        author: "Dr Avadh Vithlani",
        date: "9 May 2026",
      },
      reason:
        "Most recent acute event in the record — SOB + cough + chest heaviness × 4 days with IV-grade regimen administered OPD. Worth surfacing first to any new clinician.",
      dateRangeLabel: "7 → 9 May '26",
      consultationCount: 2,
      doctorsLabel: "Dr Avadh Vithlani",
      lines: [
        // Acute regimen closed; no ongoing meds — row hidden.
        "**Findings**: SOB + Coughing + heaviness of chest × 4 days | exam diffuse bilateral coarse crepitations | SpO₂ **94 % on room air**",
        "**Plan**: Acute antibiotic-steroid bridge (Ceftriaxone IV + Doxy IV + Hydrocort IV + nebs) **completed 12 May 2026** | regimen closed",
      ],
      openLoops: [
        "**IV-grade care coded as OPD** · Ceftriaxone IV + Hydrocort IV + nebs is normally inpatient-level — re-classify or verify",
        "**No CXR or sputum culture** in measurement rows — investigations likely ordered but not ingested",
      ],
    },
    {
      source: {
        specialty: "Pain Specialist",
        author: "Dr Milan Mehta",
        date: "5 May 2026",
      },
      reason:
        "New addition to the active drug regimen this month — **Morphine** introduced into a patient already on SNRI + TCA + Gabapentin. High-severity coordination signal.",
      dateRangeLabel: "5 May '26",
      consultationCount: 1,
      doctorsLabel: "Dr Milan Mehta",
      lines: [
        // No ongoing opioid — row hidden. Closure noted in Plan instead.
        "**Findings**: LBP + bilateral LL heaviness | minimal walking | post-op GB perforation (operated **19/04/26**)",
        "**Plan**: Post-surgical pain control | Morphine 10 mg PO short-course (5 May, ≤ 7 days) **closed** | no refill request on record",
      ],
      openLoops: [
        "**Opioid on neuropathic stack** · already on Dulotin (SNRI) + Gabator NT + Tryptomer (TCA) — respiratory depression + serotonin-syndrome risk · Beers Criteria 2023 §sedative",
        "**No GB-perforation surgical record** in graph (mentioned only in this Pain Specialist symptom note) — IPD slice missing",
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
      lines: [
        // URI regimen completed by early April; no ongoing meds — row hidden.
        "**Findings**: Intercurrent **cold-cough + fever 101.2 °F** | exam WN WD, no pallor, mild oral congestion, RS/CVS clear, soft abdomen, AAO×3",
        "**Plan**: SMBG (FBS + before-dinner) diary × 1 week | Home BP 8 am + 8 pm with chart | review in 1 month (follow-up advised 26 Mar 2026)",
      ],
      openLoops: [
        "**No HbA1c result row** in measurement table — ADA expects q3-6 mo in T2DM",
        "**Steroid burst in a diabetic** without explicit insulin titration plan — glycaemic monitoring intensified via advice but no insulin Rx adjustment recorded",
      ],
    },
    {
      source: {
        specialty: "Rheumatology",
        author: "Dr Kunal Chandwar",
        date: "2 Mar 2026",
      },
      reason:
        "Polyarthritis on chronic steroid — bone-health implications layer onto the existing co-morbidity stack.",
      dateRangeLabel: "2 Mar '26",
      consultationCount: 1,
      doctorsLabel: "Dr Kunal Chandwar",
      lines: [
        "**Findings**: **PolyArthritis × 6 weeks** | L wrist / fingers / bil shoulders — slightly better on Medrol 8 mg 1-0-0 × 15 days | paraesthesia bil LL | dorsal back pain (? degeneration vs osteoporosis) | MSK exam flexor / wrist tenosynovitis",
        "**Medications**: **CCM tablet** (Ca citrate malate + Vit D3) — ongoing bone-protection supplement | Omnacortil 7.5 mg taper and Sunbless 60K weekly course completed late April 2026",
        "**Plan**: Follow-up **16 Mar 2026** | investigations advised — CBC · ESR · SGPT · SGOT · CRP · Creatinine",
      ],
      openLoops: [
        "**All 6 investigations advised → 0 result rows** captured in measurement table",
        "**Steroid burden across teams** · Rheumatology (Omnacortil) + Diabetology (Medrol) + Pulmonology (Hydrocort IV) within a 2-month window — cumulative immunosuppression flag",
      ],
    },
    {
      source: {
        specialty: "Neurology",
        author: "Dr Nikhil Dave",
        date: "16 Feb 2026",
      },
      reason:
        "Co-prescribes gabapentin family alongside the neurosurgery team — primary cross-team coordination signal.",
      dateRangeLabel: "20 Dec '25 → 16 Feb '26",
      consultationCount: 2,
      doctorsLabel: "Dr Nikhil Dave",
      lines: [
        "**Findings**: Heaviness in legs",
        "**Medications**: **Dulotin 10 mg** (Duloxetine) | **Gabantin GRS 300** (Gabapentin) | **Progaba 30 g gel** — all last issued 16 Feb 2026 with 2-month supply (status pending refill confirmation)",
        "**Plan**: Continue dual-channel neuropathic control (oral + topical gabapentin)",
      ],
      openLoops: [
        "**Gabapentin double-dose** with Neurosurgery's Gabator NT (gabapentin + nortriptyline) — same active ingredient from two specialties",
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
      dateRangeLabel: "10 Jun → 18 Jul '25",
      consultationCount: 3,
      doctorsLabel: "Dr Kalpesh Shah / Dr Y. Saija",
      lines: [
        // Last issue was July 2025 — Neurology has since taken over. No
        // ongoing meds from this team — row hidden by the card.
        "**Findings**: TN (trigeminal-like) pain in extremities | exam no gross focal deficit",
        "**Plan**: Follow-up advised **10 Jul 2025** (kept on 11 Jun, then 18 Jul) | investigations — Serum ferritin + iron (WNL on f/u) | gabapentinoid management since taken over by Neurology",
      ],
      openLoops: [
        "**Last contact 18 Jul 2025** — no re-evaluation despite continued gabapentin family co-prescriptions by Neurology team",
      ],
    },
  ],
  // Section 3 · Where they collide — DDIs + coordination gaps, anchored to
  // real guideline rules. Powers the existing collisions panel.
  collisions: [
    {
      kind: "coordination-gap",
      title: "**Oncology surveillance overdue** — 6+ months since last contact",
      points: [
        "Last oncology contact **30 Sep 2025**. Next NCCN-recommended window: **Mar 2026 at latest**.",
        "Patient has documented **lung metastasis most likely** in condition_occurrence — trajectory should be active staging, not lapsed surveillance.",
        "**CEA** last ordered 4 Apr 2025, no result row. **PET-CT** ordered same date, no result row.",
      ],
      rule: {
        body: "NCCN",
        year: "2024",
        section: "Colon Ca v.2.2024 §SURV-1, SURV-2",
        description: "National Comprehensive Cancer Network — Colon Cancer guideline for post-resection surveillance.",
        fetches: "CEA cadence (q3-6 mo × 5y) + CT C/A/P cadence (q6-12 mo × 3y) + colonoscopy at 1y.",
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
        description: "American Geriatrics Society — potentially inappropriate medication list for older adults.",
        fetches: "Cumulative sedative burden score · opioid + benzo/Z-drug avoidance.",
      },
    },
    {
      kind: "ddi",
      title: "**Gabapentin double-dosing** across Neuro + Neurosurgery",
      points: [
        "Neurosurgery (10 Jun 2025): **Gabator NT 300 mg** (Gabapentin 300 + Nortriptyline 10).",
        "Neurology (20 Dec 2025): **Gabantin GRS 300** (Gabapentin 300) + **Progaba gel 6%** (Gabapentin topical).",
        "Same active ingredient from two teams — no shared reconciliation visible in the record.",
      ],
      rule: {
        body: "NICE",
        year: "2024",
        section: "CG173 §Neuropathic Pain",
        description: "National Institute for Health and Care Excellence — neuropathic pain management guideline.",
        fetches: "Single-agent gabapentinoid principle; ceiling dose monitoring.",
      },
    },
    {
      kind: "coordination-gap",
      title: "**IV-grade pulmonology care coded as OPD** · 7-9 May 2026",
      points: [
        "Ceftriaxone IV + Hydrocort 100 mg IV q12h + Doxy IV + nebulised steroid burst.",
        "This is normally inpatient-level care — either misclassified as OPD or genuine ambulatory IV burst.",
        "Either way, worth confirming with the IPD pipeline.",
      ],
      rule: {
        body: "BTS",
        year: "2023",
        section: "Community-Acquired Pneumonia",
        description: "British Thoracic Society — CAP severity grading and admission criteria.",
        fetches: "CURB-65 threshold for IV antibiotics + admission.",
      },
    },
  ],
  pendingMdtItems: [
    "Re-engage oncology surveillance · book CEA + PET-CT before next chemo decision.",
    "Reconcile gabapentinoids — single-agent rule per NICE CG173.",
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
        description: "National Comprehensive Cancer Network — Colon Cancer surveillance after curative resection.",
        fetches: "CEA q3-6 mo × 5y · CT C/A/P q6-12 mo × 3y · colonoscopy at 1y.",
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
          ref: "observation.investigation_text on 4 Apr 2025 references PET-CT. No measurement row matches.",
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
        description: "American Geriatrics Society — potentially inappropriate medications in older adults (≥60y).",
        fetches: "Sedative + opioid combination check · TCA + SNRI overlap.",
      },
      rows: [
        {
          label: "Active sedating agents",
          value: "Morphine + Gabator NT + Dulotin + Tryptomer",
          ref: "drug_exposure rows currently active (end_date ≥ today) joined by drug class.",
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
  freshness: "OMOP-synced · observation window 10 Feb 2025 → 21 Mar 2026",
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
        { text: "**Right Breast Carcinoma · pT1cN0 stage IA** · Mod diff ductal" },
        { text: "Pre-treatment work-up in progress · surgery pending" },
      ],
      sources: [
        { doctor: "Dr Tahiliani (Oncology)", date: "11 May 2026" },
        { doctor: "Dr Tahiliani (Oncology)", date: "12 May 2026" },
        { doctor: "Dr Pandya (Onco-surgery)", date: "30 Apr 2026" },
        { doctor: "Dr Pandya (Onco-surgery)", date: "4 May 2026" },
        { doctor: "Dr Pandya (Onco-surgery)", date: "11 May 2026" },
      ],
      reasoning:
        "Small (T1c), node-negative right breast cancer caught early. Surveillance is well-defined; the immediate question is anaesthetic + chemotherapy fitness given the cardio-renal-pulmonary backdrop.",
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
        "HTN + Dyslipidaemia + IHD form the cardiovascular substrate; CKD + severe OSA add anaesthetic and renal-dosing constraints. All four are pre-op blockers.",
    },
    {
      title: "Allergies & safety",
      tone: "positive",
      items: [{ text: "Allergy review **not explicitly verified** — flagged in open loops" }],
      sources: [],
      reasoning: "No explicit-negative verifications surfaced in the OMOP slice. Treat as unknown until reviewed — see Cardiology open loops.",
    },
  ],
  windowDays: 17,
  specialties: [
    {
      source: { specialty: "Oncology", author: "Dr Tahiliani", date: "12 May 2026" },
      reason: "Treatment plan being finalised this week.",
      dateRangeLabel: "11 → 12 May '26",
      consultationCount: 2,
      doctorsLabel: "Dr Tahiliani / Dr Sandeep Jain",
      lines: [
        "**Findings**: **T1cN0 stage IA** ductal Ca · planning adjuvant pathway",
        "**Plan**: Surgical resection scheduled | adjuvant decisions post-pathology",
      ],
      openLoops: [
        "**Cardiac fitness sign-off** not documented after Cardiology review (27 Apr)",
        "**OSA airway plan** not in record — needed pre-anaesthesia",
      ],
    },
    {
      source: { specialty: "Onco-surgery", author: "Dr Pandya", date: "11 May 2026" },
      reason: "Lead surgeon — booking pending.",
      dateRangeLabel: "30 Apr → 11 May '26",
      consultationCount: 5,
      doctorsLabel: "Dr Dhara Girish Pandya",
      lines: [
        "**Findings**: Pre-op assessment series for R hemicolectomy-equivalent breast resection · surgical clearance pending",
        "**Plan**: Date booking awaiting anaesthesia + cardio + nephro clearances",
      ],
      openLoops: [
        "**Surgery date** not yet entered into the system",
        "**Pre-op renal-dose ceiling** for contrast imaging pending Nephrology",
      ],
    },
    {
      source: { specialty: "Cardiology", author: "Dr Bhavesh Roy", date: "27 Apr 2026" },
      reason: "Pre-op cardiac risk in IHD + OSA patient.",
      dateRangeLabel: "27 Apr '26",
      consultationCount: 2,
      doctorsLabel: "Dr Bhavesh Roy / Dr Ketan Vekariya",
      lines: [
        "**Findings**: Known IHD · DOE grade III × 4-5 months recorded · BP elevated",
        "**Plan**: Echo + functional capacity assessment | re-review pre-surgery",
      ],
      openLoops: [
        "**Echo report** advised but no result row",
        "**ECG / Trop trend** not in measurement table",
      ],
    },
    {
      source: { specialty: "Pulmonology & Critical Care", author: "Dr Manoj Singh", date: "1 May 2026" },
      reason: "Severe OSA + airway risk for anaesthesia.",
      dateRangeLabel: "29 Apr → 1 May '26",
      consultationCount: 2,
      doctorsLabel: "Dr Manoj Singh",
      lines: [
        "**Findings**: Severe Obstructive Sleep Apnea documented · snoring-related breathing disorder",
        "**Medications**: **Foracort inhaler** (Budesonide + Formoterol) — ongoing | **Montelukast 10 mg** nightly",
        "**Plan**: CPAP titration data not in record | difficult-airway plan with anaesthesia pending",
      ],
      openLoops: [
        "**CPAP / sleep study report** not in measurement",
        "**ABG / SpO₂ trend** not captured",
      ],
    },
    {
      source: { specialty: "Nephrology", author: "Dr Goplani", date: "29 Apr 2026" },
      reason: "CKD + impending IV contrast for staging.",
      dateRangeLabel: "29 Apr '26",
      consultationCount: 1,
      doctorsLabel: "Dr Kamal Goplani",
      lines: [
        "**Findings**: Acute-on-chronic CKD · renal protection plan needed for contrast + chemo",
        "**Plan**: Pre + post-contrast hydration protocol | renal-dose review on all current meds",
      ],
      openLoops: [
        "**Serum creatinine / eGFR** — not in measurement table",
        "**Urine PCR / ACR** not in record",
      ],
    },
  ],
  collisions: [
    {
      kind: "coordination-gap",
      title: "**Pre-op cardiac fitness in IHD + Severe OSA** — sign-off chain incomplete",
      points: [
        "Cardiology last seen 27 Apr; Onco-surgery booking pending.",
        "OSA airway plan + cardiac functional capacity both unreconciled.",
        "Surgery cannot proceed safely without these closed.",
      ],
      rule: {
        body: "ASA / DAS",
        year: "2023",
        section: "Pre-op CV + airway",
        description: "American Society of Anesthesiologists + Difficult Airway Society pre-op guidelines.",
        fetches: "Cardiac functional capacity + airway plan in OSA patients.",
      },
    },
    {
      kind: "coordination-gap",
      title: "**CKD before contrast staging imaging** — pre-hydration + nephro-dose review pending",
      points: [
        "Nephrology saw 29 Apr; baseline eGFR + ACR not yet resulted.",
        "Contrast-enhanced CT / PET-CT for staging may follow.",
        "Hydration + N-acetylcysteine protocol not documented.",
      ],
      rule: {
        body: "KDIGO",
        year: "2024",
        section: "§4.3.1",
        description: "Kidney Disease Improving Global Outcomes — contrast-associated AKI prevention.",
        fetches: "eGFR thresholds for contrast administration + hydration protocol.",
      },
    },
  ],
  pendingMdtItems: [
    "Surgery date — pending clearance from Cardio + Nephro + Pulmo.",
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
        description: "National Comprehensive Cancer Network — Breast Cancer staging + adjuvant therapy planning.",
        fetches: "T1cN0 stage IA pathway · adjuvant therapy decision logic.",
      },
      rows: [
        { label: "Stage", value: "IA (T1cN0)", ref: "From oncology condition rows on 11-12 May 2026.", tone: "ok" },
        { label: "Surgical date", value: "Pending", ref: "No booking row in visit_occurrence.", tone: "warn" },
        { label: "Adjuvant pathway", value: "Awaiting pathology", ref: "Decision deferred to post-resection.", tone: "ok" },
      ],
      note: "Standard NCCN T1cN0 pathway — surgery first, adjuvant decision post-pathology.",
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
      items: [{ text: "**Hypertension** — chronic, anchor diagnosis" }],
      sources: [{ doctor: "Internal Medicine", date: "across visits" }],
      reasoning: "HTN is the chronic anchor; the rest of the record is intercurrent acute events.",
    },
    {
      title: "Surgical history",
      tone: "neutral",
      items: [{ text: "**Left tendoachilles repair** (date pre-window)" }],
      sources: [{ doctor: "Orthopaedics", date: "follow-up visits" }],
      reasoning: "Surgery predates the OMOP observation window; only post-op follow-up is recorded.",
    },
    {
      title: "Acute episodes",
      tone: "neutral",
      items: [{ text: "Recurrent **acute viral fever** episodes (×3)" }],
      sources: [{ doctor: "Family Physician / ENT", date: "across visits" }],
      reasoning: "Multiple acute viral episodes over the 12-month window — pattern worth flagging for immune-status / occupational screening.",
    },
    {
      title: "Allergies & safety",
      tone: "positive",
      items: [{ text: "Allergy review **not on file** — prescriptions made without documented allergy status" }],
      sources: [],
      reasoning: "Every Rx in this patient's record was issued without an allergy entry. Highest-priority gap.",
    },
  ],
  windowDays: 380,
  specialties: [
    {
      source: { specialty: "Internal Medicine", author: "Family Physician", date: "across window" },
      reason: "Anchor team — 40+ visits across the window.",
      dateRangeLabel: "Apr '25 → Apr '26",
      consultationCount: 40,
      doctorsLabel: "Family Physician",
      lines: [
        "**Findings**: Chronic HTN management | intercurrent URI / fever episodes",
        "**Plan**: HTN regimen continuation | per-episode acute management",
      ],
      openLoops: [
        "**Allergy status** never recorded — every Rx issued without verification",
        "**BP trend** not in measurement table — vitals not consistently ingested",
      ],
    },
    {
      source: { specialty: "Orthopaedics", author: "Orthopaedist", date: "post-op f/u" },
      reason: "Achilles repair follow-up.",
      dateRangeLabel: "across window",
      consultationCount: 8,
      doctorsLabel: "Orthopaedist",
      lines: [
        "**Findings**: Post-operative left Achilles repair · functional recovery",
        "**Plan**: Physiotherapy continuation | step-down follow-up cadence",
      ],
    },
    {
      source: { specialty: "ENT", author: "ENT consultant", date: "across window" },
      reason: "Recurrent URI episodes.",
      dateRangeLabel: "across window",
      consultationCount: 6,
      doctorsLabel: "ENT consultant",
      lines: [
        "**Findings**: Recurrent viral URI / pharyngitis episodes",
        "**Plan**: Symptomatic per-episode management",
      ],
    },
  ],
  collisions: [
    {
      kind: "coordination-gap",
      title: "**Allergy status missing across all Rx** — entire record lacks allergy verification",
      points: [
        "182 drug_exposure rows; zero allergy verification rows in condition_occurrence.",
        "Each new Rx assumes no allergy. Risk compounds with every prescription.",
      ],
      rule: {
        body: "WHO HEARTS",
        year: "2023",
        section: "Primary-care Rx safety",
        description: "World Health Organization — primary-care medication safety standards.",
        fetches: "Documented allergy review before any Rx.",
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
        description: "World Health Organization — primary-care hypertension management bundle.",
        fetches: "BP target + risk assessment + lifestyle counselling.",
      },
      rows: [
        { label: "BP target", value: "<140/90", ref: "Standard adult target without diabetes.", tone: "ok" },
        { label: "BP trend captured", value: "No", ref: "No measurement rows of type 8480-6/8462-4.", tone: "alert" },
      ],
      note: "Sparse data limits panel firing — most metrics aren't ingested.",
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
        { text: "**Coronary artery disease (CAD)** · on DAPT for secondary prevention" },
        { text: "**Prior CVA** (cerebrovascular event)" },
      ],
      sources: [
        { doctor: "Dr Bhavesh Roy (Cardiology)", date: "16 Apr 2025" },
        { doctor: "Dr Bhavesh Roy (Cardiology)", date: "8 May 2025" },
        { doctor: "Dr Bhavesh Roy (Cardiology)", date: "20 Jan 2026" },
        { doctor: "Dr Tejas Modi (Gastroenterology)", date: "10 Jul 2025" },
      ],
      reasoning:
        "CAD with prior CVA in a 58-y-o female on dual antiplatelet (Aspirin + Clopidogrel) and chronic statin — classic secondary-prevention pattern. DAPT duration likely exceeded the optimal window.",
    },
    {
      title: "Co-morbidities",
      tone: "neutral",
      items: [
        { text: "**Hypothyroidism**" },
        { text: "**Type-2 DM**" },
        { text: "**Dyslipidaemia**" },
        { text: "**Essential HTN**" },
        { text: "**Obesity**" },
        { text: "**NAFLD**" },
      ],
      sources: [
        { doctor: "Dr Nimit Shah (Diabetology)", date: "across window" },
        { doctor: "Dr Payal Shah (Endocrinology)", date: "Feb-Mar 2026" },
      ],
      reasoning:
        "Classic metabolic syndrome layered onto cardiovascular disease. High event-recurrence risk; aggressive multi-target prevention needed.",
    },
    {
      title: "Surgical history",
      tone: "neutral",
      items: [
        { text: "**LSCS** (lower-segment Caesarean) (date pre-window)" },
        { text: "**Tubal ligation**" },
        { text: "**Renal-stone surgery**" },
      ],
      sources: [
        { doctor: "Historical context", date: "pre-window" },
      ],
      reasoning: "Surgical history reconstructed from condition_occurrence narrative — events predate the OMOP observation window.",
    },
    {
      title: "Allergies & safety",
      tone: "positive",
      items: [
        { text: "No known **drug allergy** (verified ×39)" },
        { text: "No known **food allergy** (verified ×36)" },
      ],
      sources: [{ doctor: "Multiple", date: "across visits" }],
      reasoning: "Strong absence-of-allergy signal across many independent verifications.",
    },
  ],
  windowDays: 388,
  specialties: [
    {
      source: { specialty: "Diabetology", author: "Dr Nimit Shah", date: "9 May 2026" },
      reason: "Anchor chronic-care team.",
      dateRangeLabel: "16 Apr '25 → 9 May '26",
      consultationCount: 11,
      doctorsLabel: "Dr Nimit Shah",
      lines: [
        "**Findings**: T2DM on chronic management | hypothyroid stable | recent lipid recheck",
        "**Medications**: **Amaryl M 1** (Glimepiride + Metformin) | **Feburic 40** (Febuxostat) | **Thyronorm 75** | FDson Total",
        "**Plan**: SMBG diary | HbA1c every 3 mo | annual ACR + eGFR",
      ],
    },
    {
      source: { specialty: "Cardiology", author: "Dr Bhavesh Roy", date: "20 Jan 2026" },
      reason: "Secondary prevention post-CVA + CAD on DAPT.",
      dateRangeLabel: "16 Apr '25 → 20 Jan '26",
      consultationCount: 8,
      doctorsLabel: "Dr Bhavesh Roy",
      lines: [
        "**Findings**: Stable on regimen | post-CVA secondary prevention",
        "**Medications**: **Rozavel A 10/75** (Aspirin + Rosuvastatin) | **Clopilet 75** (Clopidogrel) | **Telma 40** (Telmisartan) | **Telma H** (Telmisartan + HCT)",
        "**Plan**: Annual review | DAPT de-escalation review **overdue**",
      ],
      openLoops: [
        "**DAPT duration** >12 months without documented de-escalation review",
        "**Lipid panel result** not in measurement table — only Rx pattern",
      ],
    },
    {
      source: { specialty: "Gastroenterology", author: "Dr Tejas Modi", date: "9 May 2026" },
      reason: "Chronic constipation + NAFLD management.",
      dateRangeLabel: "10 Jul '25 → 9 May '26",
      consultationCount: 5,
      doctorsLabel: "Dr Tejas Modi",
      lines: [
        "**Findings**: Chronic functional constipation pattern · NAFLD surveillance",
        "**Medications**: **Softovac** (Ispaghula) | **Pruvict 1 mg** (Prucalopride) | **Cremaffin Plus** | **Bistide 3 mg** (Plecanatide)",
        "**Plan**: Bowel-routine optimisation | NAFLD-driven LFT surveillance",
      ],
    },
    {
      source: { specialty: "Neurology", author: "Dr Nikhil Dave", date: "26 Mar 2026" },
      reason: "Headache evaluation post-CVA.",
      dateRangeLabel: "10 Sep '25 → 26 Mar '26",
      consultationCount: 5,
      doctorsLabel: "Dr Sowani / Dr Nikhil Dave",
      lines: [
        "**Findings**: Chronic headache pattern post-CVA · no fresh focal deficit",
        "**Plan**: Headache workup ongoing · no acute change",
      ],
      openLoops: ["**MRI brain follow-up** not in record"],
    },
    {
      source: { specialty: "Endocrinology", author: "Dr Payal Shah", date: "27 Mar 2026" },
      reason: "High PTH workup + thyroid optimisation.",
      dateRangeLabel: "16 Feb → 27 Mar '26",
      consultationCount: 4,
      doctorsLabel: "Dr Payal Shah",
      lines: [
        "**Findings**: High PTH on screening · history of renal calculi 15 y back · no fracture",
        "**Medications**: **Thyronorm 75** | **Linorma T3 5 mcg** (Liothyronine)",
        "**Plan**: Primary hyperparathyroidism workup | T3+T4 combination under review",
      ],
      openLoops: [
        "**T3+T4 combination** therapy is non-guideline — sign-off needed",
        "**PTH result** in narrative only, not in measurement table",
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
        description: "National Institute for Health and Care Excellence — Type-2 DM management guideline.",
        fetches: "Single-agent sulfonylurea principle + hypoglycaemia risk in dual-prescribing.",
      },
    },
    {
      kind: "coordination-gap",
      title: "**DAPT duration likely exceeded** — secondary prevention review overdue",
      points: [
        "Aspirin + Clopidogrel running ~10 months with no de-escalation review.",
        "Post-CVA + chronic CCS: bleeding risk increases beyond 12 months.",
      ],
      rule: {
        body: "ESC",
        year: "2024",
        section: "Stroke + Atherothrombosis",
        description: "European Society of Cardiology — Stroke and atherothrombotic disease secondary prevention.",
        fetches: "DAPT duration recommendation in CCS post-CVA.",
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
        description: "American Association of Clinical Endocrinologists — hypothyroidism management.",
        fetches: "Levothyroxine-monotherapy default; combination therapy criteria.",
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
        description: "European Society of Cardiology — Stroke and atherothrombotic disease.",
        fetches: "Antiplatelet duration + statin intensity + BP target in DM.",
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
        { text: "**Severe hypertriglyceridaemia** — TG 2898 mg/dL documented" },
        { text: "**Recurrent acute pancreatitis** — 13 episodes on record" },
      ],
      sources: [
        { doctor: "Dr Ajay Choksey (Gastroenterology)", date: "11 Apr 2025" },
        { doctor: "Dr Ajay Choksey (Gastroenterology)", date: "7 May 2025" },
        { doctor: "Dr Bhavesh Roy (Cardiology)", date: "8 Sep 2025" },
        { doctor: "Dr Talati (Diabetology)", date: "13 Apr 2026" },
      ],
      reasoning:
        "TG 2898 mg/dL is in the pancreatitis-risk territory. 13 acute episodes documented. Current statin-only regimen is inadequate — fibrate or omega-3 indicated.",
    },
    {
      title: "Co-morbidities",
      tone: "neutral",
      items: [
        { text: "**Type-2 DM**" },
        { text: "**Hypertension**" },
        { text: "**Hypothyroidism**" },
        { text: "**Bronchial Asthma**" },
        { text: "Postural hypotension" },
        { text: "Peripheral vertigo" },
      ],
      sources: [
        { doctor: "Dr Navneet Shah (Internal Medicine)", date: "across window" },
        { doctor: "Dr Bhavesh Roy (Cardiology)", date: "Sep-Oct 2025" },
      ],
      reasoning:
        "Classic metabolic syndrome. The asthma adds steroid-burden complexity if a flare requires bursts.",
    },
    {
      title: "Surgical history",
      tone: "neutral",
      items: [{ text: "**Past cholecystectomy**" }],
      sources: [],
      reasoning: "Gallbladder out — recurrent pancreatitis is therefore not gallstone-driven; metabolic origin confirmed.",
    },
    {
      title: "Allergies & safety",
      tone: "positive",
      items: [{ text: "Allergy review **under-recorded** — observation count = 7 across 33 visits" }],
      sources: [],
      reasoning: "Almost no symptom/exam/advice narrative is ingested — same upstream gap as Meera. Flag for data eng.",
    },
  ],
  windowDays: 517,
  specialties: [
    {
      source: { specialty: "Internal Medicine", author: "Dr Navneet Shah", date: "25 Mar 2026" },
      reason: "Anchor team coordinating CV + metabolic + endocrine.",
      dateRangeLabel: "25 Aug '25 → 25 Mar '26",
      consultationCount: 8,
      doctorsLabel: "Dr Navneet Shah / Dr Nanavaty",
      lines: [
        "**Findings**: RBS 220 → 279 on serial visits | **TG 2898 mg/dL** documented in narrative | S.Cr 0.85 (preserved)",
        "**Medications**: **Valzaar 80** (Valsartan) | **Amlodac 5** | **Inderal LA 20** (Propranolol) | **Ecospin 75** | **Rozavel EZ 20** (Rosuvastatin + Ezetimibe)",
        "**Plan**: Lipid-lowering escalation overdue (no fibrate) | aggressive HTN reconciliation needed",
      ],
      openLoops: [
        "**TG 2898 mg/dL** lives in symptom narrative, not measurement — flagged",
        "**HbA1c** not in measurement table",
      ],
    },
    {
      source: { specialty: "Gastroenterology", author: "Dr Ajay Choksey", date: "12 Mar 2026" },
      reason: "Recurrent pancreatitis surveillance.",
      dateRangeLabel: "11 Apr '25 → 12 Mar '26",
      consultationCount: 5,
      doctorsLabel: "Dr Ajay Choksey",
      lines: [
        "**Findings**: Watery stool | nausea | atypical chest pain | recurrent pancreatitis trajectory",
        "**Medications**: **Nexpro 40** (Esomeprazole) | **Ganaton 50** (Itopride) | **Oson O** (Ofloxacin + Ornidazole)",
        "**Plan**: Functional GI workup | chronic PPI + prokinetic",
      ],
    },
    {
      source: { specialty: "Urology", author: "Dr Kamlesh Patel", date: "13 Nov 2025" },
      reason: "Recurrent UTI in diabetic post-menopausal female.",
      dateRangeLabel: "18 Aug → 13 Nov '25",
      consultationCount: 5,
      doctorsLabel: "Dr Kamlesh Patel / Dr Kaustubh Patel",
      lines: [
        "**Findings**: UTI · 15-20 pus cells · poor flow · hesitancy",
        "**Medications**: **Veltam 0.4** (Tamsulosin) | **Urotone SR 75** (Bethanechol) | **Premarin** vaginal cream",
        "**Plan**: Recurrent UTI prophylaxis | bladder-neck dysfunction management",
      ],
      openLoops: [
        "**Tamsulosin + Bethanechol** — bladder pharmacology contradiction within the same stream",
      ],
    },
    {
      source: { specialty: "Cardiology", author: "Dr Bhavesh Roy", date: "27 Oct 2025" },
      reason: "HTN regimen + statin management.",
      dateRangeLabel: "8 Sep → 27 Oct '25",
      consultationCount: 3,
      doctorsLabel: "Dr Bhavesh Roy",
      lines: [
        "**Findings**: Easy fatigue on Propranolol · BP 110/70 after skipping meds (over-suppression risk)",
        "**Medications**: **Valzaar 80** | **Inderal 20** | **Amlodac 5** | **Ecospin 75** | **Rozavel EZ 20**",
        "**Plan**: De-escalation discussion needed | statin maximised — fibrate decision separate",
      ],
    },
    {
      source: { specialty: "Diabetology", author: "Dr Talati", date: "13 Apr 2026" },
      reason: "Uncontrolled DM-II with allergic symptoms.",
      dateRangeLabel: "13 Apr '26",
      consultationCount: 1,
      doctorsLabel: "Dr Talati / Dr Rushikesh Shah",
      lines: [
        "**Findings**: Uncontrolled DM-II | itching all over body (allergic vs hyperglycaemic)",
        "**Medications**: **Ryzodeg 100** (Insulin) | **Eurepa V** (Repaglinide + Voglibose) | **LTK 50** (Losartan) | **CTD M** (Chlorthalidone + Metoprolol) | **Thyronorm 50**",
        "**Plan**: Insulin titration | repeat workup at next visit",
      ],
      openLoops: [
        "**Anti-HTN switch** to Losartan + Chlorthalidone + Metoprolol duplicates Cardiology's regimen",
      ],
    },
  ],
  collisions: [
    {
      kind: "coordination-gap",
      title: "**Severe hypertriglyceridaemia untreated with fibrate** — pancreatitis risk untreated",
      points: [
        "TG 2898 mg/dL documented (in narrative, not lab table).",
        "Only Rosuvastatin + Ezetimibe on board.",
        "Fenofibrate or omega-3 indicated above TG > 500 to reduce pancreatitis recurrence.",
      ],
      rule: {
        body: "NICE",
        year: "2024",
        section: "NG28 §5.4 / AHA 2021",
        description: "NICE + AHA — TG-lowering threshold and fibrate addition in severe hypertriglyceridaemia.",
        fetches: "TG cut-off for fibrate initiation; statin-fibrate combination safety.",
      },
    },
    {
      kind: "ddi",
      title: "**Triple anti-HTN across specialties** — no reconciliation",
      points: [
        "Cardiology: Valsartan + Amlodipine + Propranolol.",
        "Diabetology added Losartan + Chlorthalidone + Metoprolol (April 2026).",
        "Two ARBs and two β-blockers across specialties → hypotension risk.",
      ],
      rule: {
        body: "ESC/ESH",
        year: "2023",
        description: "European Society of Cardiology + Hypertension — joint HTN guideline.",
        fetches: "Single-ARB principle; β-blocker monotherapy choice.",
      },
    },
    {
      kind: "ddi",
      title: "**Bladder pharmacology contradiction** — Tamsulosin + Bethanechol",
      points: [
        "Both prescribed by the same Urology team.",
        "Tamsulosin relaxes bladder-neck; Bethanechol stimulates bladder contraction.",
        "Opposing actions — verify or de-prescribe.",
      ],
      rule: {
        body: "AUA",
        year: "2020",
        section: "BPH / Voiding dysfunction",
        description: "American Urological Association — voiding dysfunction management.",
        fetches: "Single-agent voiding-dysfunction Rx principle.",
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
        description: "American Heart Association — Hypertriglyceridaemia scientific statement.",
        fetches: "TG-lowering thresholds + fibrate decision logic + pancreatitis risk.",
      },
      rows: [
        { label: "Triglyceride", value: "2898 mg/dL", ref: "From Internal Medicine narrative — not in measurement table.", tone: "alert" },
        { label: "Fibrate on board", value: "No", ref: "No fenofibrate / gemfibrozil in drug_exposure.", tone: "alert" },
        { label: "Pancreatitis episodes", value: "13", ref: "From condition_occurrence rows tagged 'H/O ACUTE PANCREATITIS'.", tone: "alert" },
      ],
      note: "Three independent alerts converge on the same gap. Highest-priority intervention for this patient.",
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
    "**T2DM** (dx 2019, uncontrolled · **HbA1c 8.4%**) — Endo-managed",
    "**CKD G3a** (dx 2024 · diabetic nephropathy · **eGFR 48**) — Nephro-managed",
    "**Atrial fibrillation** — Cardio-managed (today is Dr Sharma's first contact)",
    "**Hypertension** (resistant pattern on **ABPM 152/95** · 3 agents already active)",
    "**Penicillin allergy** (severe) — on file across teams",
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
        "Most recent Endocrinology Rx in the 90-day window. Picked because the T2DM regimen drives the diabetic-nephropathy trajectory Dr Sharma is being looped in for today — and a new SGLT2 was just started in light of CKD G3a without Cardio notification.",
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
        "Primary referring team. CKD G3a confirmation on this Rx is the reason Dr Sharma is seeing Ravi today — Nephro requested a joint anticoag + renal-dose review with Cardio after eGFR dropped below 60.",
      provenance:
        "Based on 3 Nephrology consultations · 12 Jan 2026 → 02 Apr 2026 · Dr Bose",
      lines: [
        "**Findings**: Stage **G3a CKD** (diabetic nephropathy) · eGFR ↓48 · ACR ↑60 mg/g · K⁺ stable at 4.2",
        "**Medications**: Monitoring only — no nephro-prescribed drug on file. Renal-dose ceiling on Metformin flagged for Endo.",
        "**Plan**: Repeat eGFR + ACR · **Follow-up** 8 weeks · Hold apixaban dose-up pending Cardio review · joint Cardio + Nephro review requested",
      ],
    },
  ],
  collisions: [
    {
      kind: "ddi",
      title: "**Metformin** × **CKD G3a** — dose above renal limit",
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
        description: "American Diabetes Association — Standards of Care for diabetes management in renal impairment.",
        fetches: "Metformin dose ceiling at eGFR 30-60 mL/min/1.73 m².",
      },
    },
    {
      kind: "coordination-gap",
      title: "**Apixaban** × **Empagliflozin** — coordination gap",
      points: [
        "**Empagliflozin 10 mg OD** started by Endo on **18 Apr**.",
        "AFTER Nephro's **eGFR 48** reading on **02 Apr** — G3a confirmed.",
        "Cardio (managing Apixaban) is **not yet notified** on the record.",
        "KDIGO §4.3.1 puts renal drug dosing under joint review at G3a — the join didn't happen.",
      ],
      rule: {
        body: "KDIGO",
        year: "2024",
        section: "§4.3.1",
        description: "Kidney Disease Improving Global Outcomes — worldwide consensus for CKD staging and renal drug-dose adjustment.",
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
        description: "European Society of Cardiology — guideline for atrial fibrillation management.",
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
      note: "Triggered by Ravi's active conditions (AFib in the Conditions table) + active Medication (Apixaban). Cardiology's own note is filtered out of Stack 1 because Dr Sharma authored it himself — but the underlying structured data still drives this panel.",
    },
    {
      panelTitle: "Resistant HTN panel",
      guideline: {
        body: "ESC/ESH",
        year: "2023",
        description: "European Society of Cardiology + European Society of Hypertension — joint guideline for resistant hypertension.",
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
      note: "HTN appears in Ravi's chronic-conditions list and ABPM > target in the last 30 days. With 3 antihypertensives already active, ESC/ESH §11.3 resistant-HTN classification applies — panel renders because both required inputs (BP + drug count) are present.",
    },
  ],
  freshness: "Synced 12 min ago",
}

/**
 * Patient journey mock — shared by the chat reply pipeline and the deep-dive
 * documentation page. One canonical Ravi-Shankar timeline drives both.
 */
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
      detail: "External record — Apixaban prescription history imported on referral. No Cardiology Rx at Zydus until today's consult.",
      sourceId: "EXT-CG-1142",
      sourceType: "rx",
    },
    {
      date: "Aug 2025",
      specialtyLabel: "Lab",
      tone: "lab",
      doctor: "Ordered by Dr Iyer",
      headline: "Quarterly labs · **HbA1c** __↑9.1__ · **eGFR** 62 (baseline)",
      detail: "Quarterly lab panel ordered as routine follow-up. HbA1c remains above target; eGFR enters the watch range. No new prescription tied to this report — surfaces only for the trend.",
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
      detail: "First scheduled Cardiology intake at Zydus — patient did not attend. Open in the Appointment system; rescheduled to today (28 Apr).",
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
        findings: "**AFib (paroxysmal)** — imported from City General · re-confirmed on today's ECG",
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
      detail: "Requested by Dr Bose (Nephro) on 03 Apr after the G3a confirmation. Aim: align apixaban dose vs eGFR + review SGLT2 tolerance. No date confirmed yet — should be flagged at the next MDT.",
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

  if (isCrossConsult || m.includes("lakshmi") || m.includes("iyer") || m.includes("1093717054960")) {
    if (m.includes("lakshmi") || m.includes("iyer") || m.includes("1093717054960")) {
      return {
        text: "Here's the cross-consultation brief — 5 specialties active in a 17-day pre-op work-up. Cardiac + OSA + CKD clearances pending.",
        loadingHint: "Reading 5 specialty streams…",
        loadingDelayMs: 1200,
        suggestions: subSuggestionsFor("mdt_brief"),
        rxOutput: { kind: "velora_v0_mdt_brief", data: LAKSHMI_IYER_BRIEF_MOCK },
      }
    }
  }
  if (isCrossConsult || m.includes("asha") || m.includes("krishnan") || m.includes("375391871728")) {
    if (m.includes("asha") || m.includes("krishnan") || m.includes("375391871728")) {
      return {
        text: "Here's the cross-consultation brief — narrow specialty footprint (4 teams, 59 visits). Allergy review missing across all prescriptions.",
        loadingHint: "Reading the record…",
        loadingDelayMs: 1000,
        suggestions: subSuggestionsFor("mdt_brief"),
        rxOutput: { kind: "velora_v0_mdt_brief", data: ASHA_KRISHNAN_BRIEF_MOCK },
      }
    }
  }
  if (isCrossConsult || m.includes("meera") || m.includes("joshi") || m.includes("241381057447")) {
    if (m.includes("meera") || m.includes("joshi") || m.includes("241381057447")) {
      return {
        text: "Here's the cross-consultation brief — CAD + prior CVA on DAPT for 12+ months. De-escalation review overdue; glimepiride double-dose flagged.",
        loadingHint: "Reading 11 specialty streams…",
        loadingDelayMs: 1400,
        suggestions: subSuggestionsFor("mdt_brief"),
        rxOutput: { kind: "velora_v0_mdt_brief", data: MEERA_JOSHI_BRIEF_MOCK },
      }
    }
  }
  if (isCrossConsult || m.includes("anita") || m.includes("desai") || m.includes("714696991886")) {
    if (m.includes("anita") || m.includes("desai") || m.includes("714696991886")) {
      return {
        text: "Here's the cross-consultation brief — severe hypertriglyceridaemia driving recurrent pancreatitis. Fibrate not on board; triple anti-HTN cross-specialty.",
        loadingHint: "Reading 15 specialty streams…",
        loadingDelayMs: 1400,
        suggestions: subSuggestionsFor("mdt_brief"),
        rxOutput: { kind: "velora_v0_mdt_brief", data: ANITA_DESAI_BRIEF_MOCK },
      }
    }
  }
  if (isCrossConsult || m.includes("suresh") || m.includes("patel") || m.includes("843373981236")) {
    return {
      text:
        "Here's the cross-consultation brief — 12 specialties touched in the last 13 months. Oncology surveillance gap + polypharmacy flags surfaced.",
      loadingHint: "Reading 12 specialty streams…",
      loadingDelayMs: 1400,
      suggestions: subSuggestionsFor("mdt_brief"),
      rxOutput: {
        kind: "velora_v0_mdt_brief",
        data: SURESH_PATEL_BRIEF_MOCK,
      },
    }
  }

  // Intent ② — Patient journey (replaces "Open loops").
  // The whole hospital story for one patient as a vertical timeline.
  // Open / pending items still surface — they're inline RED rows on the
  // timeline at the date they occurred, not a separate list.
  if (
    m === "show patient journey" ||
    m.includes("patient journey") ||
    m.includes("hospital journey") ||
    m.includes("timeline") ||
    m === "show open loops" ||
    m.includes("open loops")
  ) {
    return {
      text:
        "Here's Ravi Shankar's hospital journey at Zydus — 14 months, 10 encounters, with the open / pending items surfaced inline at the dates they occurred.",
      loadingHint: "Reading every signed visit · admissions · MDT meetings · open loops…",
      loadingDelayMs: 1400,
      suggestions: subSuggestionsFor("patient_journey"),
      rxOutput: {
        kind: "velora_v0_patient_journey",
        data: PATIENT_JOURNEY_MOCK,
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
