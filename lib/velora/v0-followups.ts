// ─────────────────────────────────────────────────────────────────────────
// Velora v0 — Follow-up intent registry
//
// For each parent intent (MDT brief / Open loops / Active meds / Why flagged)
// we expose six follow-up *sub-intents*. These are not random canned messages
// — they are deliberately chosen to model what a clinician would most likely
// reach for next, derived from:
//
//   1. The doctor's original message (which parent intent fired).
//   2. The patient's condition + data available (active meds, recent labs,
//      missed orders, specialty touch points).
//   3. The doctor's specialty (GenMed for V0 pilot).
//   4. The guideline bodies the hospital has signed
//      (ADA 2024 · WHO HEARTS 2023 · NICE NG56 · KDIGO 2024 · ESC 2024 etc.).
//
// Each entry below carries a `rationale` field so the Velora v0 docs can
// surface the reasoning verbatim — there is no "where did this question come
// from?" mystery for the clinical lead reviewing the surface.
// ─────────────────────────────────────────────────────────────────────────

export type VeloraFollowUpCategory =
  | "expand"   // longer / richer version of the parent reply
  | "trend"    // chart across visits
  | "history" // time-ordered records
  | "missing"  // what is not yet ordered / closed
  | "drill"    // zoom into a single specialty / loop / med / flag
  | "compare"  // compare guidelines or values
  | "act"      // action (refer / refill / message)
  | "cohort"   // panel-level context

export type VeloraParentIntent =
  | "mdt_brief"
  | "patient_journey"
  | "active_meds"
  | "why_flagged"

export interface VeloraFollowUp {
  id: string
  parent: VeloraParentIntent
  /** Short label rendered in the suggestion tab (1-3 words). */
  quickLabel: string
  /** The full question — what the doctor "actually" asks; also the routing key. */
  question: string
  category: VeloraFollowUpCategory
  /** Why this question is the right next step — used by docs. */
  rationale: string
  /** Mock reply payload (text-only for V0 surface; cards can be added later). */
  reply: {
    text: string
    /** Optional citation footer for the trust strip. */
    footer?: string
    /** Optional card-shaped reply — when present, the consumer emits this
     *  RxAgentOutput instead of the text_quote envelope. Used for sub-intents
     *  that should render as charts / cards rather than plain text. */
    rxOutput?: import("@/components/tp-rxpad/dr-agent/types").RxAgentOutput
  }
  /** Optional loading hint for the typing indicator. */
  loadingHint?: string
}

// ─────────────────────────────────────────────────────────────────────────
// ① MDT brief — sub-intents
// ─────────────────────────────────────────────────────────────────────────

const MDT_FOLLOWUPS: VeloraFollowUp[] = [
  {
    id: "mdt-expand",
    parent: "mdt_brief",
    quickLabel: "Full notes",
    question: "Expand each specialty's last note",
    category: "expand",
    rationale:
      "The brief shows only headers. A doctor with 30 seconds wants the body — full Cardiology / Endocrinology / Nephrology assessment text. Same source, longer attribution window.",
    reply: {
      text:
        "Expanded notes (verbatim, paginated):\n\n① Cardiology — Dr Sharma, 24 Apr 2026 (Note #NOT-3119)\n   AFib on apixaban 5 mg BID since 12 Mar. CHA₂DS₂-VASc 4. Echo 21 Apr: EF 38%, mild LV hypertrophy. Plan: continue anticoag; review 8 weeks.\n\n② Endocrinology — Dr Iyer, 18 Apr 2026 (Note #NOT-3104)\n   T2DM, HbA1c 8.4%. Metformin 1000 mg BID continued. Empagliflozin 10 mg OD added. Plan: HbA1c recheck 12 weeks; monitor eGFR.\n\n③ Nephrology — Dr Bose, 02 Apr 2026 (Note #NOT-3082)\n   eGFR 48 (G3a CKD). Apixaban dose held at 5 mg BID after cardio discussion. Plan: repeat eGFR + ACR in 8 weeks.",
      footer: "Source: Note × 3 · ACC/AHA 2023 · ADA 2024 · KDIGO 2024 · Synced 12 min ago",
    },
    loadingHint: "Loading the full body of each specialty note…",
  },
  {
    id: "mdt-trends",
    parent: "mdt_brief",
    quickLabel: "Trends",
    /** Generic question — Velora picks the top-N metrics itself based on
     *  Stack 1 flags + cross-team relevance. */
    question: "Show top trends across visits",
    category: "trend",
    rationale:
      "Whichever metrics were flagged abnormal in Stack 1 are the ones the doctor wants to see a direction-of-travel for. Velora picks the top 3 cross-team-relevant labs and charts them with the cited target line. Same selector, different patient → different charts.",
    reply: {
      text:
        "Top 3 cross-team trends for Ravi Shankar — HbA1c (Endo), eGFR (Nephro), ABPM Daytime mean (Cardio/HTN). Each chart cites its target body.",
      footer: "Source: Measurement × 11 · ADA 2024 · KDIGO 2024 · ESC/ESH 2023 · Synced 12 min ago",
      rxOutput: {
        kind: "velora_v0_trends",
        data: {
          patientName: "Ravi Shankar",
          patientMeta: "M, 64y · MRN-78214",
          selectionReason:
            "Velora picked these three because they each appeared as a flagged value in the MDT brief and each is touched by a different specialty — making a direction-of-travel view useful before any cross-team plan change.",
          trends: [
            {
              label: "HbA1c",
              unit: "%",
              currentValue: "8.4",
              values: [9.1, 8.7, 8.6, 8.4],
              dates: ["Aug '25", "Nov '25", "Feb '26", "Apr '26"],
              threshold: 7.0,
              thresholdLabel: "target <7.0 % per ADA 2024 §6.1",
              tone: "alert",
              trajectory: "Gradual improvement · still above target",
              guideline: {
                body: "ADA",
                year: "2024",
                section: "§6.1",
                description: "American Diabetes Association — Standards of Care thresholds for HbA1c.",
                fetches: "HbA1c target + recheck cadence.",
              },
              whyPicked:
                "Flagged in the Endo section of the MDT brief (8.4%, target <7%). Cross-team relevance: SGLT2 dose depends on eGFR.",
            },
            {
              label: "eGFR",
              unit: "mL/min/1.73 m²",
              currentValue: "48",
              values: [62, 55, 51, 48],
              dates: ["Aug '25", "Nov '25", "Feb '26", "Apr '26"],
              threshold: 60,
              thresholdLabel: "G3a threshold ≥60 per KDIGO 2024",
              tone: "alert",
              trajectory: "Declining ~3.5 / quarter · Nephro referred 02 Apr",
              guideline: {
                body: "KDIGO",
                year: "2024",
                description: "Kidney Disease Improving Global Outcomes — staging and drug-dose adjustment in CKD.",
                fetches: "eGFR staging cut-offs and renal-adjusted drug dosing.",
              },
              whyPicked:
                "Flagged in the Nephro section (48, G3a). Touches Cardio (apixaban dose) AND Endo (SGLT2 eligibility) — highest cross-specialty leverage.",
            },
            {
              label: "ABPM Daytime mean",
              unit: "mmHg",
              currentValue: "152/95",
              values: [148, 150, 151, 152],
              dates: ["Aug '25", "Nov '25", "Feb '26", "Apr '26"],
              threshold: 135,
              thresholdLabel: "target ≥135/85 per ESC/ESH 2023",
              tone: "warn",
              trajectory: "Steadily creeping up · 3 antihypertensives active",
              guideline: {
                body: "ESC/ESH",
                year: "2023",
                description: "European Society of Cardiology + Hypertension joint guideline.",
                fetches: "Ambulatory BP target for resistant-HTN classification.",
              },
              whyPicked:
                "Flagged in the Resistant HTN synthesis panel. Cross-team relevance: an antihypertensive escalation interacts with Nephro's drug-dose window.",
            },
          ],
        },
      },
    },
    loadingHint: "Picking the top 3 cross-team trends from flagged Stack 1 values…",
  },
  {
    id: "mdt-missing",
    parent: "mdt_brief",
    quickLabel: "Missing tests",
    question: "What tests are missing per guideline?",
    category: "missing",
    rationale:
      "With T2DM + CKD + AFib, several routine checks are due per signed bodies (UACR, lipid, LFT, INR if cross-checking apixaban). Surfacing what is *not* ordered is the same Velora discipline as Open loops, scoped to this MDT context.",
    reply: {
      text:
        "Expected this quarter but not ordered:\n  • Urine ACR — last 09 Aug '25, due (KDIGO 2024 §3.1)\n  • Lipid panel — last 22 Sep '25, due (ADA 2024 §10.1)\n  • LFT — last 18 Mar '26, due 18 Jun '26 (Zydus formulary baseline)\n\nOrdered and pending:\n  • TSH — open loop, 12 days (separate detector, see Open loops).",
      footer: "Source: Order × Measurement gap detector · KDIGO 2024 · ADA 2024 · Synced 12 min ago",
    },
    loadingHint: "Comparing ordered tests vs guideline cadence…",
  },
  {
    id: "mdt-drill-cardio",
    parent: "mdt_brief",
    quickLabel: "Cardiology note",
    question: "What did Cardiology say at the last visit?",
    category: "drill",
    rationale:
      "Lets the GenMed doctor read Dr Sharma's note in full without leaving the chat — single-specialty drill-in is the most common follow-up to the cross-team summary.",
    reply: {
      text:
        "Cardiology · Dr Sharma · 24 Apr 2026 · Note #NOT-3119\n\nSubjective: occasional palpitations, no syncope. Compliant with apixaban.\nObjective: HR 78 irregular, BP 138/82. Echo 21 Apr: EF 38%, mild LVH, mild mitral regurg.\nAssessment: persistent AFib, HFrEF. CHA₂DS₂-VASc 4, HAS-BLED 2.\nPlan: continue apixaban 5 mg BID, bisoprolol 5 mg OD, atorvastatin 40 mg N. Review in 8 weeks.",
      footer: "Source: Note #NOT-3119 · ACC/AHA 2023 §6.2 · Synced 12 min ago",
    },
    loadingHint: "Loading Cardiology's 24 Apr note in full…",
  },
  {
    id: "mdt-compare-guidelines",
    parent: "mdt_brief",
    quickLabel: "Compare guidelines",
    question: "Compare ESC vs ACC/AHA for this AF profile",
    category: "compare",
    rationale:
      "The hospital may eventually choose between ESC and ACC/AHA per the `hospital.yaml`. The clinical lead will want a side-by-side for the same CHA₂DS₂-VASc score before re-signing.",
    reply: {
      text:
        "CHA₂DS₂-VASc 4 · 64M\n\n  ACC/AHA 2023 §6.2: anticoagulation strongly recommended (Class I)\n  ESC      2024 §5.4: anticoagulation recommended (Class I)\n  Apixaban dose: 5 mg BID — both bodies agree given eGFR 48 and weight ≥60 kg.\n\nDelta: ESC adds explicit \"shared decision making\" language; ACC/AHA is firmer on Class I.\nNo divergence in dose or drug choice for this patient.",
      footer: "Source: ACC/AHA 2023 §6.2 · ESC 2024 §5.4 · Synced 12 min ago",
    },
    loadingHint: "Diffing ACC/AHA 2023 vs ESC 2024 for this CHA₂DS₂-VASc…",
  },
  {
    id: "mdt-pending-handoffs",
    parent: "mdt_brief",
    quickLabel: "Pending handoffs",
    question: "Show unresolved handoffs across all teams",
    category: "missing",
    rationale:
      "Bridges MDT to Open Loops — handoffs that started in a cross-team note but did not close. Reuses the Open loops detectors but filtered to inter-specialty events on this patient.",
    reply: {
      text:
        "Unresolved cross-team items on this patient:\n  • Joint anticoag review requested 03 Apr by Nephro → not held (42 days)\n  • Echo report 21 Apr — read, not yet circulated to Endo (drug safety relevance)\n  • Cardio asked GenMed to re-check fasting glucose at 4 weeks — not ordered (30 days)",
      footer: "Source: Referral × Visit × Order gap detectors · Synced 12 min ago",
    },
    loadingHint: "Scanning inter-team handoffs for unresolved items…",
  },
]

// ─────────────────────────────────────────────────────────────────────────
// ② Open loops — sub-intents
// ─────────────────────────────────────────────────────────────────────────

const OPEN_LOOPS_FOLLOWUPS: VeloraFollowUp[] = [
  {
    id: "loops-red-only",
    parent: "patient_journey",
    quickLabel: "Red only",
    question: "Show only red (past-threshold) loops",
    category: "drill",
    rationale:
      "Two of four chains are past threshold. Filtering helps the doctor act on the urgent items first without parsing the amber rows.",
    reply: {
      text:
        "Past-threshold open loops (2):\n  🔴 41d  Cardiology referral, no destination visit (Referral #REF-3119)\n  🔴 12d  TSH ordered, no result on file (Order #LAB-22841)",
      footer: "Source: Order × Referral · Hospital operational config · Synced 8 min ago",
    },
    loadingHint: "Filtering to chains past the signed threshold…",
  },
  {
    id: "loops-drill-referral",
    parent: "patient_journey",
    quickLabel: "Referral drill",
    question: "Why is the Cardiology referral still open?",
    category: "drill",
    rationale:
      "The 41-day Cardiology referral is the oldest red loop. Drilling shows the referral letter, who it was sent to, and any acknowledgement — which is what's needed to chase it.",
    reply: {
      text:
        "Referral #REF-3119 · Cardiology\n\nCreated 30 Mar 2026 by Dr Bose (GenMed) · routed to Cardiology OPD.\nLetter content: 'CHA₂DS₂-VASc 4 with persistent AFib — please review for rhythm-control candidacy.'\nAcknowledgement: none on record.\nNo Visit row with patient_id × Cardio specialty after 30 Mar.\n\nNext step: ping Cardiology desk to confirm receipt, or re-issue.",
      footer: "Source: Referral × Visit (LEFT JOIN, null check) · Synced 8 min ago",
    },
    loadingHint: "Tracing referral #REF-3119 through the EMR…",
  },
  {
    id: "loops-followup-noshow",
    parent: "patient_journey",
    quickLabel: "Reschedule",
    question: "Reschedule the missed follow-up",
    category: "act",
    rationale:
      "Action-oriented sub-intent — the 18-day no-show is the easiest loop to close. Velora prepares the reschedule payload (date, slot, contact) the doctor can dispatch.",
    reply: {
      text:
        "Reschedule draft prepared for Appointment #APT-7740:\n  Patient: Lakshmi Pandey · F, 58y\n  Original slot: 22 Apr 2026, 11:00 (no-show)\n  Suggested slots: Thu 14 May 16:00 · Fri 15 May 10:30 · Mon 18 May 09:00\n  SMS preview: \"Lakshmi, please reschedule your GenMed follow-up. Reply with one of the slots above.\"\n\nVelora does not auto-send. Open the appointment to confirm.",
      footer: "Source: Appointment × signed clinic config · Synced 8 min ago",
    },
    loadingHint: "Preparing reschedule slots from GenMed availability…",
  },
  {
    id: "loops-refill-context",
    parent: "patient_journey",
    quickLabel: "Refill drill",
    question: "Why is the telmisartan refill flagged?",
    category: "drill",
    rationale:
      "The 73-day fill gap is amber because pharmacy data is in-hospital only — drilling surfaces that disclosure so the doctor knows whether to phone the patient or just chart-check.",
    reply: {
      text:
        "Rx #RX-1840 · Telmisartan 40 mg OD · GenMed (Dr Bose) since 11 Jan 2026.\n\nLast in-hospital fill: 26 Feb 2026 (60 tablets).\nExpected next fill: ~28 Apr 2026. No in-hospital event recorded.\n\nDisclosure: pharmacy data covers in-hospital dispenses only. The patient may have filled outside.\nSuggested next step: confirm verbally; do not infer non-adherence.",
      footer: "Source: Drug Exposure × Pharmacy Dispense (in-hospital only) · Synced 8 min ago",
    },
    loadingHint: "Pulling the dispense history and disclosure note…",
  },
  {
    id: "loops-threshold-history",
    parent: "patient_journey",
    quickLabel: "Threshold history",
    question: "Who signed these thresholds and when?",
    category: "compare",
    rationale:
      "Open-loop windows are operational (not clinical). The clinical lead may want to see who signed off and when — this surfaces governance, not patient detail.",
    reply: {
      text:
        "Signed thresholds — Zydus GenMed operational config:\n\n  • Lab order without result   ·  >7 days   · signed 12 Mar 2026 by Dr V Bose (GenMed lead)\n  • Referral without dest visit ·  >30 days  · signed 12 Mar 2026 by Dr V Bose (GenMed lead)\n  • Chronic Rx without fill    ·  >90 days  · signed 12 Mar 2026 by Dr V Bose (GenMed lead)\n  • No-show window            ·  30 days    · signed 12 Mar 2026 by Dr V Bose (GenMed lead)\n\nThresholds are operational, not clinical. Change requires re-signing.",
      footer: "Source: Hospital operational config (signed) · Synced 8 min ago",
    },
    loadingHint: "Loading the signed threshold history…",
  },
  {
    id: "loops-cohort-compare",
    parent: "patient_journey",
    quickLabel: "Panel compare",
    question: "How does this patient compare to my panel?",
    category: "cohort",
    rationale:
      "Lets the doctor see whether 4 open loops is unusual for this panel — a sanity check that prevents acting in isolation.",
    reply: {
      text:
        "Open-loop comparison · Dr Bose's GenMed panel (138 active patients):\n\n  • Avg open loops per patient: 1.6\n  • This patient: 4 (top 6 % of panel)\n  • Most common category in the panel: lab without result (54 patients touched)\n\nLakshmi is an outlier on absolute count but typical on category mix.",
      footer: "Source: Panel cohort registry · Synced 8 min ago",
    },
    loadingHint: "Comparing this patient against the GenMed panel…",
  },
]

// ─────────────────────────────────────────────────────────────────────────
// ③ Active meds & safety — sub-intents
// ─────────────────────────────────────────────────────────────────────────

const ACTIVE_MEDS_FOLLOWUPS: VeloraFollowUp[] = [
  {
    id: "meds-alternative",
    parent: "active_meds",
    quickLabel: "Alternative",
    question: "Suggest a safer alternative for Naproxen",
    category: "drill",
    rationale:
      "The DDI flag (Naproxen × Apixaban) is the headline. The doctor's next move is replacing the offending drug — Velora surfaces alternatives from the Zydus formulary that don't trigger the class rule.",
    reply: {
      text:
        "Alternatives that do not trigger the NSAID + DOAC class rule:\n\n  • Paracetamol 500 mg–1 g QDS PRN (first-line per Zydus formulary)\n  • Topical diclofenac gel (local analgesia, minimal systemic absorption)\n  • Tramadol 50 mg PRN (caution: serotonergic interactions, review SSRIs)\n\nNot recommended: any oral NSAID while apixaban is active.",
      footer: "Source: Zydus formulary · Lexicomp · Synced 3 min ago",
    },
    loadingHint: "Querying the Zydus formulary for non-NSAID analgesics…",
  },
  {
    id: "meds-history",
    parent: "active_meds",
    quickLabel: "Med history",
    question: "Show full medication history (including stopped)",
    category: "history",
    rationale:
      "Stopped meds often explain why the current list looks the way it does. A timeline of starts + stops (with reasons when available) is a frequent doctor request when reviewing active meds.",
    reply: {
      text:
        "Medication timeline (last 12 months):\n\n  12 Mar 2026  + Apixaban 5 mg BID         · Cardio\n  12 Mar 2026  + Bisoprolol 5 mg OD         · Cardio\n  12 Mar 2026  + Atorvastatin 40 mg N       · Cardio\n  04 Feb 2026  + Metformin 1000 mg BD       · GenMed\n  04 Feb 2026  + Pantoprazole 40 mg M       · GenMed\n  22 Apr 2026  + Naproxen 500 mg PRN        · GenMed\n  08 Oct 2025  – Aspirin 75 mg OD           · Cardio (stopped: switched to DOAC)\n  15 Nov 2025  – Glimepiride 2 mg OD        · Endo  (stopped: hypoglycaemia)",
      footer: "Source: Drug Exposure (active + stopped) · Synced 3 min ago",
    },
    loadingHint: "Loading the 12-month medication timeline…",
  },
  {
    id: "meds-polypharmacy-checklist",
    parent: "active_meds",
    quickLabel: "Polypharmacy review",
    question: "Run the NICE NG56 polypharmacy review checklist",
    category: "expand",
    rationale:
      "The polypharmacy threshold has fired (6 chronic meds, 61 days). NICE NG56 prescribes a specific medication-review checklist. Surfacing it lets the doctor work through it without leaving the chat.",
    reply: {
      text:
        "NICE NG56 medication-review checklist · 6 active chronic meds:\n\n  ☐ Confirm indication for each drug is still active.\n  ☐ Confirm dose appropriate for current eGFR / weight / age.\n  ☐ Check for any drug that has lost its primary indication.\n  ☐ Cross-check anticholinergic burden score (none on this list).\n  ☐ Confirm adherence (pharmacy data is in-hospital only — verify verbally).\n  ☐ Document the review and the next review date.\n\nReady to mark this review as performed?",
      footer: "Source: NICE NG56 medication review · Synced 3 min ago",
    },
    loadingHint: "Loading the NICE NG56 review checklist…",
  },
  {
    id: "meds-compare-rules",
    parent: "active_meds",
    quickLabel: "Compare rules",
    question: "Compare Lexicomp vs Zydus formulary on this DDI",
    category: "compare",
    rationale:
      "Hospitals can pick which DDI rule base wins via the signed config. The doctor may want to confirm both bodies agree before changing the regimen.",
    reply: {
      text:
        "Naproxen × Apixaban\n\n  Lexicomp (class rule LX-0042)        · severity: major     · recommend avoid co-prescription\n  Zydus formulary §3.2                · severity: major     · recommend avoid co-prescription; if needed, time-limit + add PPI\n\nBoth bodies agree. No disagreement to resolve.",
      footer: "Source: Lexicomp · Zydus Formulary §3.2 · Synced 3 min ago",
    },
    loadingHint: "Diffing the two DDI rule bases for this pair…",
  },
  {
    id: "meds-order-monitoring",
    parent: "active_meds",
    quickLabel: "Monitor labs",
    question: "Order monitoring labs before next change",
    category: "act",
    rationale:
      "On a 6-drug regimen with one DDI flag, the prudent next move is a labs order (renal, hepatic, INR if relevant). Velora prepares the order set the doctor can review.",
    reply: {
      text:
        "Suggested order set (Velora does not auto-order):\n\n  ☐ Renal panel — Cr, eGFR, K+ (relevant: apixaban + bisoprolol)\n  ☐ LFT — last 18 Mar, due 18 Jun (relevant: atorvastatin)\n  ☐ Hb + platelet count (relevant: anticoag + NSAID bleed risk)\n  ☐ Faecal occult blood if symptomatic (relevant: NSAID + DOAC)\n\nReview and dispatch from the orders tab.",
      footer: "Source: Drug Exposure × monitoring guideline mapping · Synced 3 min ago",
    },
    loadingHint: "Composing the monitoring order set for this regimen…",
  },
  {
    id: "meds-whatif-new-rx",
    parent: "active_meds",
    quickLabel: "Pre-write check",
    question: "Check interactions with a new Rx I'm about to add",
    category: "act",
    rationale:
      "Lets the doctor type a drug name and see DDI flags before prescribing. Highest-leverage moment per the spec — before the order is placed.",
    reply: {
      text:
        "Type the new drug name in the input below to run a pre-write DDI check.\n\nExample queries Velora is ready to answer:\n  · 'Will ibuprofen interact with the current list?'\n  · 'Is sertraline safe with apixaban?'\n  · 'Run pre-write check on amiodarone 200 mg.'",
      footer: "Source: DDI rule-base + active meds (live) · Synced 3 min ago",
    },
    loadingHint: "Loading the pre-write DDI check…",
  },
]

// ─────────────────────────────────────────────────────────────────────────
// ④ Why flagged today — sub-intents
// ─────────────────────────────────────────────────────────────────────────

const WHY_FLAGGED_FOLLOWUPS: VeloraFollowUp[] = [
  {
    id: "flag-discharge",
    parent: "why_flagged",
    quickLabel: "Discharge summary",
    question: "Show the discharge summary from the recent admission",
    category: "drill",
    rationale:
      "Recent admission is the loudest critical signal. The doctor will want the discharge summary header in chat, not a separate tab.",
    reply: {
      text:
        "Visit #VIS-91204 · Nephrology · 02–06 May 2026\n\nReason: Acute Kidney Injury (Stage 2, KDIGO 2024).\nDay 1 Cr 2.4 (baseline 1.3); Day 4 Cr 1.5; discharge Cr 1.4 stable.\nPlan on discharge:\n  • Hold furosemide 48 h, restart at 20 mg OD.\n  • Repeat U&E at 7 days (overdue: drawn 09 May, see Lab unreviewed).\n  • Outpatient Nephro review in 4 weeks.",
      footer: "Source: Visit #VIS-91204 discharge summary · Synced 26 min ago",
    },
    loadingHint: "Loading the discharge summary header…",
  },
  {
    id: "flag-acknowledge",
    parent: "why_flagged",
    quickLabel: "Acknowledge",
    question: "Acknowledge and clear the K⁺ critical flag",
    category: "act",
    rationale:
      "Critical lab is unreviewed only because no visit-tied note has touched it. A single click should let the doctor mark it reviewed (with a stub note) and remove the flag.",
    reply: {
      text:
        "Lab unreviewed · Measurement #LAB-91440 · K⁺ 5.8 mmol/L · drawn 09 May 2026.\n\nMark reviewed? Velora will record:\n  • acknowledged_by = current doctor\n  • acknowledged_at = now\n  • short note required (≥1 char) for audit\n\nReady to acknowledge?",
      footer: "Source: Measurement × audit log · Synced 26 min ago",
    },
    loadingHint: "Preparing the acknowledgement payload…",
  },
  {
    id: "flag-reassess",
    parent: "why_flagged",
    quickLabel: "Reassessment",
    question: "Schedule a 48-hour reassessment slot",
    category: "act",
    rationale:
      "Post-AKI + K⁺ 5.8 calls for a near-term reassessment. Velora prepares the slot picker scoped to the doctor's clinic.",
    reply: {
      text:
        "Reassessment slots in next 48 h · GenMed · Dr Bose:\n  • Wed 14 May 09:30\n  • Wed 14 May 16:00\n  • Thu 15 May 11:00\n  • Thu 15 May 17:00\n\nPatient SMS draft: \"Mr Kumar, please attend a short GenMed reassessment — Wed/Thu slots above. Reply 1, 2, 3 or 4.\"",
      footer: "Source: GenMed slot config · Synced 26 min ago",
    },
    loadingHint: "Loading next-48h slots from your clinic config…",
  },
  {
    id: "flag-vitals-trend",
    parent: "why_flagged",
    quickLabel: "Vitals trend",
    question: "Show vitals trend since admission",
    category: "trend",
    rationale:
      "Trajectory tells the story that point values can't. BP, HR, and weight since admission help the doctor judge whether to escalate.",
    reply: {
      text:
        "Vitals since admission (02 May → today, 12 May):\n\n  BP (mmHg, WHO HEARTS target <140/90)\n    02 May 158/96   06 May 142/88   09 May 138/82   12 May 138/82\n\n  HR (bpm)\n    02 May 102      06 May 88       09 May 78       12 May 76\n\n  Weight (kg)\n    02 May 81.4    06 May 79.6 ▼   09 May 79.2     12 May 79.0\n\nTrajectory: improving on all three. Within WHO target post-discharge.",
      footer: "Source: Vital × 12 readings · WHO HEARTS 2023 · Synced 26 min ago",
    },
    loadingHint: "Pulling vitals trend since admission…",
  },
  {
    id: "flag-similar-patients",
    parent: "why_flagged",
    quickLabel: "Today's panel",
    question: "Which other panel patients are flagged today?",
    category: "cohort",
    rationale:
      "The morning radar is most useful when the doctor sees their whole panel of flagged patients in one pass. Cohort surface borrows the Panel audit V0.5 logic, scoped to today.",
    reply: {
      text:
        "Today's flagged patients · Dr Bose's GenMed panel (138 active):\n\n  🔴 3 critical flags fired\n     · Ramesh Kumar  (this patient)  · K⁺ unreviewed + recent AKI admission\n     · Mohan Tewari                  · Hb 7.4 g/dL unreviewed\n     · Sita Ghosh                   · 30-day readmission (Cardio)\n\n  🟡 4 warning flags fired\n     · Anita Mehta · HbA1c 10.8 % (above ADA threshold)\n     · Vinod K · BP 158/96 mean (WHO HEARTS)\n     · Geeta Das · 6 chronic meds × 95 d (NICE NG56)\n     · Suresh Iyer · DDI Naproxen + apixaban active",
      footer: "Source: Cohort registry zydus-genmed-2026-04 · Synced 26 min ago",
    },
    loadingHint: "Running the today-only cohort scan over your panel…",
  },
  {
    id: "flag-polypharmacy",
    parent: "why_flagged",
    quickLabel: "Polypharmacy",
    question: "Open the polypharmacy review for this patient",
    category: "expand",
    rationale:
      "The warning flag is polypharmacy (7 chronic meds, ≥90 d) cited to NICE NG56. The corresponding sub-intent in Active meds is the right place to land.",
    reply: {
      text:
        "Switching context to Active meds & safety for the polypharmacy review.\n\nActive list (7 chronic, ≥90 d):\n  Furosemide · Telmisartan · Metformin · Atorvastatin · Pantoprazole · Aspirin · Vit D weekly.\n\nNICE NG56 checklist available under Active meds → \"Run NICE NG56 polypharmacy review\".",
      footer: "Source: Drug Exposure count × NICE NG56 · Synced 26 min ago",
    },
    loadingHint: "Loading the polypharmacy review handoff…",
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────────────────

const FOLLOWUP_INDEX: Record<VeloraParentIntent, VeloraFollowUp[]> = {
  mdt_brief: MDT_FOLLOWUPS,
  patient_journey: OPEN_LOOPS_FOLLOWUPS,
  active_meds: ACTIVE_MEDS_FOLLOWUPS,
  why_flagged: WHY_FLAGGED_FOLLOWUPS,
}

export function getVeloraFollowUps(parent: VeloraParentIntent): VeloraFollowUp[] {
  return FOLLOWUP_INDEX[parent]
}

/** All four V0 parent intents, in the canonical spec order. */
export const VELORA_PARENT_INTENTS: VeloraParentIntent[] = [
  "mdt_brief",
  "patient_journey",
  "active_meds",
  "why_flagged",
]

/** Doctor-facing short label for each parent intent. */
export function veloraParentLabel(parent: VeloraParentIntent): string {
  switch (parent) {
    case "mdt_brief":   return "Cross-consultation brief"
    case "patient_journey":  return "Patient journey"
    case "active_meds": return "Active meds & safety"
    case "why_flagged": return "Why flagged today"
  }
}

/** The message that triggers each parent intent through the reply override. */
export function veloraParentMessage(parent: VeloraParentIntent): string {
  switch (parent) {
    case "mdt_brief":   return "Show cross-consultation brief"
    case "patient_journey":  return "Show patient journey"
    case "active_meds": return "Show active meds and safety"
    case "why_flagged": return "Why is this patient flagged today"
  }
}

/**
 * Suggestion logic used by the chat-input tab:
 *   1. Top 2 sub-intents of the current parent.
 *   2. Pivots to the other parent intents — UNASKED first, asked last.
 *
 * `viewedIntents` is the set of parents the doctor has already seen in this
 * thread (driven by the rxOutput card kinds in the message history).
 */
export interface VeloraSuggestion {
  kind: "sub" | "pivot"
  /** Short label rendered in the tab. */
  label: string
  /** The full message that fires when tapped. */
  message: string
  /** The category badge text (only for sub-intents). */
  category?: VeloraFollowUpCategory
  /** Optional rationale shown only inside the docs page; never in chat. */
  rationale?: string
}

export function buildVeloraSuggestions(
  current: VeloraParentIntent,
  viewedIntents: ReadonlySet<VeloraParentIntent>,
): VeloraSuggestion[] {
  const subs: VeloraSuggestion[] = getVeloraFollowUps(current)
    .slice(0, 2)
    .map((f) => ({
      kind: "sub",
      label: f.quickLabel,
      message: f.question,
      category: f.category,
      rationale: f.rationale,
    }))

  const others = VELORA_PARENT_INTENTS.filter((p) => p !== current)
  const unasked = others.filter((p) => !viewedIntents.has(p))
  const asked = others.filter((p) => viewedIntents.has(p))

  const pivots: VeloraSuggestion[] = [...unasked, ...asked].map((p) => ({
    kind: "pivot",
    label: veloraParentLabel(p),
    message: veloraParentMessage(p),
  }))

  return [...subs, ...pivots]
}

/** Reverse lookup — used by the reply pipeline so a sub-intent question maps back to its mock reply. */
export function findVeloraFollowUp(question: string): VeloraFollowUp | undefined {
  const q = question.trim()
  for (const list of Object.values(FOLLOWUP_INDEX)) {
    const hit = list.find((f) => f.question === q)
    if (hit) return hit
  }
  return undefined
}

/** Map a parent intent's rxOutput kind to the parent enum. */
export function parentIntentForCardKind(kind: string | undefined): VeloraParentIntent | null {
  switch (kind) {
    case "velora_v0_mdt_brief":
      return "mdt_brief"
    case "velora_v0_open_loops":
    case "velora_v0_patient_journey":
      return "patient_journey"
    case "velora_v0_active_meds":
      return "active_meds"
    case "velora_v0_why_flagged":
      return "why_flagged"
    default:
      return null
  }
}
