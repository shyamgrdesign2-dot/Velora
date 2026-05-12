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
 * MDT brief mock — shared by the chat reply pipeline and the deep-dive
 * documentation page. Keeping it as a single export means the doc page renders
 * the exact same card the doctor sees in chat — no parallel mock to drift.
 */
export const MDT_BRIEF_MOCK: VeloraV0MdtBriefData = {
  patientName: "Ravi Shankar",
  patientMeta: "M, 64y · MRN-78214",
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
      lines: [
        "**Findings**: **T2DM** (uncontrolled) · **diabetic nephropathy** secondary",
        "**Key labs**: **HbA1c**: __↑8.4%__ · **eGFR**: __↓48__",
        "**Medical history**: **T2DM** (dx 2019) · **CKD G3a** (dx 2024) · **HTN** · **Penicillin allergy** (severe)",
        "**Medications**: **Metformin 1000 mg BID** · adding **Empagliflozin 10 mg OD** (renal-protective at G3a)",
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
      lines: [
        "**Findings**: Stage **G3a CKD** (diabetic nephropathy)",
        "**Key labs**: **eGFR**: __↓48__ · **ACR**: __↑60 mg/g__ · **K⁺**: 4.2 mmol/L",
        "**Medical history**: **CKD G3a** (dx 2024 · primary) · **T2DM** (dx 2019, causative) · **HTN** · **Penicillin allergy**",
        "**Medications**: Monitoring only. No nephro-prescribed drug on file.",
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

  // Intent ① — MDT brief (flagship)
  if (m === "show mdt brief" || m.includes("mdt brief") || (m.includes("mdt") && m.includes("show"))) {
    return {
      text:
        "Here's the MDT brief for Ravi Shankar. Three specialties touched him in the last 90 days, and every cross-specialty bullet is attributed to its author and dated.",
      loadingHint: "Reading 3 specialty notes · attributing every claim…",
      loadingDelayMs: 1400,
      suggestions: subSuggestionsFor("mdt_brief"),
      rxOutput: {
        kind: "velora_v0_mdt_brief",
        data: MDT_BRIEF_MOCK,
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
