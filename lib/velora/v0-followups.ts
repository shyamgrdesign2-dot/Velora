// ─────────────────────────────────────────────────────────────────────────
// Velora v0 — Follow-up intent registry
//
// V0 narrows the parent intents to THREE:
//   ① Cross-consultation brief   (mdt_brief)
//   ② Patient journey            (patient_journey)
//   ③ Recent trends              (recent_trends)
//
// The retired "Active meds & safety" and "Why flagged today" intents
// have been removed from the live surface — their card components remain
// in the codebase for type compatibility but no UI path lands on them.
//
// For each parent intent we expose follow-up *sub-intents*. These are
// not random canned messages — they are deliberately chosen to model
// what a clinician would most likely reach for next, derived from:
//
//   1. The doctor's original message (which parent intent fired).
//   2. The patient's condition + data available (active meds, recent
//      labs, missed orders, specialty touch points).
//   3. The doctor's specialty (GenMed for V0 pilot).
//   4. The guideline bodies the hospital has signed
//      (ADA 2024 · WHO HEARTS 2023 · NICE NG56 · KDIGO 2024 · ESC 2024 etc.).
//
// Each entry below carries a `rationale` field so the Velora v0 docs can
// surface the reasoning verbatim — there is no "where did this question
// come from?" mystery for the clinical lead reviewing the surface.
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
  | "recent_trends"

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
// ③ Recent trends — sub-intents
//
// The doctor lands here after clicking "Recent trends" from the welcome
// screen, or via a pivot chip under another intent's card. The sub-intent
// chips listed below are the *parent-level* follow-ups; the *per-patient*
// trend chips (BP, HbA1c, eGFR, …) come from
// lib/velora/v0-trends.ts and are wired into the reply pipeline directly.
// ─────────────────────────────────────────────────────────────────────────

const RECENT_TRENDS_FOLLOWUPS: VeloraFollowUp[] = [
  {
    id: "trends-which",
    parent: "recent_trends",
    quickLabel: "Which trends?",
    question: "Which trends are available for this patient?",
    category: "expand",
    rationale:
      "After landing on Recent trends, the most common follow-up is 'show me the menu'. We re-render the per-patient trend list so the doctor can pick a specific vital / lab.",
    reply: {
      text: "Tap a chip below to view the trend for the selected patient.",
      footer: "Source: Velora trends registry · v0-trends.ts",
    },
    loadingHint: "Loading the per-patient trends menu…",
  },
  {
    id: "trends-rationale",
    parent: "recent_trends",
    quickLabel: "Why these trends?",
    question: "Why these trends and not others?",
    category: "expand",
    rationale:
      "Trust gate. The doctor wants to know the trends list isn't arbitrary — surface the per-patient `scopeReason` so the selection logic is auditable.",
    reply: {
      text:
        "Trends are filtered to those that are clinically actionable for this patient's problem list, scoped to the hospital's signed guideline panels (ADA · WHO HEARTS · NICE · KDIGO · ESC). Trends that have no series for this patient are hidden — Velora will not invent a chart from a single reading.",
      footer: "Source: lib/velora/v0-trends.ts (rationale per trend)",
    },
    loadingHint: "Pulling the trend-selection rationale…",
  },
]
// Re-exported below as the canonical sub-intent list for the Recent
// Trends parent. We KEEP the old V0 prototype sub-intents commented out
// (do not delete the rationale notes) so a future revisit can lift any
// of them back into the active set without re-inventing the wheel.

// ─────────────────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────────────────

const FOLLOWUP_INDEX: Record<VeloraParentIntent, VeloraFollowUp[]> = {
  mdt_brief: MDT_FOLLOWUPS,
  patient_journey: OPEN_LOOPS_FOLLOWUPS,
  recent_trends: RECENT_TRENDS_FOLLOWUPS,
}

export function getVeloraFollowUps(parent: VeloraParentIntent): VeloraFollowUp[] {
  return FOLLOWUP_INDEX[parent]
}

/** All four V0 parent intents, in the canonical spec order. */
export const VELORA_PARENT_INTENTS: VeloraParentIntent[] = [
  "mdt_brief",
  "patient_journey",
  "recent_trends",
]

/** Doctor-facing short label for each parent intent. */
export function veloraParentLabel(parent: VeloraParentIntent): string {
  switch (parent) {
    case "mdt_brief":      return "Cross-consultation brief"
    case "patient_journey":return "Patient journey"
    case "recent_trends":  return "Recent trends"
  }
}

/** The message that triggers each parent intent through the reply override. */
export function veloraParentMessage(parent: VeloraParentIntent): string {
  switch (parent) {
    case "mdt_brief":      return "Show cross-consultation brief"
    case "patient_journey":return "Show patient journey"
    case "recent_trends":  return "Show recent trends"
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
    case "velora_v0_recent_trends":
      return "recent_trends"
    default:
      return null
  }
}
