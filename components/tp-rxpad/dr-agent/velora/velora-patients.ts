import React from "react"
import { Flash, Clock, Stickynote, InfoCircle, Diagram, Activity, Chart, Hospital, ClipboardText } from "iconsax-reactjs"
import type { RxAgentChatMessage } from "../types"
import { VELORA_BRIEF_OUTPUT } from "./velora-scenarios"
import { SURESH_PATEL_BRIEF_MOCK } from "@/lib/velora/v0-replies"

export type VeloraPatientId = "velora-priya" | "velora-rajesh" | "velora-suresh"

export interface VeloraAppointmentRow {
  id: VeloraPatientId
  serial: number
  name: string
  gender: "M" | "F"
  age: number
  contact: string
  visitType: string
  visitTags?: Array<{ text: string; tone: "warning" | "success" | "info" | "danger" }>
  slotTime: string
  slotDate: string
  hasVideo: boolean
  status: "queue"
  dateKey: "today"
  hasSymptoms: boolean
}

export const VELORA_APPOINTMENTS: VeloraAppointmentRow[] = [
  {
    id: "velora-priya",
    serial: 1,
    name: "Priya Reddy",
    gender: "F",
    age: 63,
    contact: "+91-9845012345",
    visitType: "Follow-up",
    visitTags: [{ text: "Post-MRM day 54", tone: "warning" }],
    slotTime: "10:00 am",
    slotDate: "9 Mar'26",
    hasVideo: false,
    status: "queue",
    dateKey: "today",
    hasSymptoms: true,
  },
  {
    id: "velora-rajesh",
    serial: 2,
    name: "Rajesh Iyer",
    gender: "M",
    age: 58,
    contact: "+91-9900123456",
    visitType: "Follow-up",
    visitTags: [{ text: "CKD-5 on CAPD", tone: "info" }],
    slotTime: "10:20 am",
    slotDate: "9 Mar'26",
    hasVideo: true,
    status: "queue",
    dateKey: "today",
    hasSymptoms: true,
  },
  // Suresh Patel — full OMOP CDM export. Clicking this row auto-seeds the
  // chat with his cross-consultation brief card (no welcome screen, straight
  // to the data). Mobile + age + gender are real OMOP values.
  {
    id: "velora-suresh",
    serial: 3,
    name: "Suresh Patel",
    gender: "M",
    age: 60,
    contact: "+91-9833383625",
    visitType: "Follow-up",
    visitTags: [{ text: "Colon Ca · IIIB · Surveillance overdue", tone: "warning" }],
    slotTime: "10:40 am",
    slotDate: "9 Mar'26",
    hasVideo: false,
    status: "queue",
    dateKey: "today",
    hasSymptoms: true,
  },
]

const VELORA_USER_PROMPT: Record<VeloraPatientId, string> = {
  "velora-priya": "Run clinical insight scan for Priya Reddy.",
  "velora-rajesh": "Run clinical insight scan for Rajesh Iyer.",
  "velora-suresh": "Open Mr Suresh Patel's cross-consultation brief.",
}

const VELORA_BRIEF_PREAMBLE: Record<VeloraPatientId, string> = {
  "velora-priya": "Quick brief on Priya: one gap, three silos.",
  "velora-rajesh": "Quick brief on Rajesh: one chain, three specialists.",
  "velora-suresh":
    "Here's the cross-consultation brief. **28 OPD visits** across **12 specialties** over **13 months**, **colon Ca T3N2b** with lung mets; **oncology surveillance overdue** and polypharmacy flags surfaced.",
}

const VELORA_BRIEF_SUGGESTIONS: Record<VeloraPatientId, RxAgentChatMessage["suggestions"]> = {
  "velora-priya": [
    { label: "Show full clinical assessment", message: "Show full clinical assessment" },
    { label: "What's overdue right now?", message: "What's overdue right now?" },
    { label: "Pre-Letrozole checklist", message: "Pre-Letrozole checklist" },
    { label: "Why is the rad-onc window 8 weeks?", message: "Why is the rad-onc window 8 weeks?" },
  ],
  "velora-rajesh": [
    { label: "Show full correlation assessment", message: "Show full correlation assessment" },
    { label: "Show KT/V vs BNP correlation", message: "Show KT/V vs BNP correlation" },
    { label: "Predicted outcomes if untreated", message: "Predicted outcomes if untreated" },
    { label: "What would escalating PD do?", message: "What would escalating PD do?" },
  ],
  "velora-suresh": [
    { label: "Show patient journey", message: "Show patient journey" },
    { label: "Recent trends", message: "Show recent trends" },
    { label: "Cross-consultation brief", message: "Show cross-consultation brief" },
  ],
}

/** Seeded Dr. Agent thread for a Velora patient:
 *  user "run insight scan" → AI preamble + compact brief card + inline suggestion pills.
 *  Further exploration (full assessment + drill-downs) is routed through velora-router's
 *  replyOverride and appended as new turns. */
export function buildVeloraThread(patientId: VeloraPatientId): RxAgentChatMessage[] {
  const now = new Date().toISOString()
  // Suresh Patel — special case. Clicking him in the appointment queue should
  // open straight into his cross-consultation brief card, not a generic
  // welcome scan. The card itself is the brief; no extra pill required.
  if (patientId === "velora-suresh") {
    return [
      {
        id: `velora-user-${patientId}`,
        role: "user",
        text: VELORA_USER_PROMPT[patientId],
        createdAt: now,
      },
      {
        id: `velora-assistant-${patientId}`,
        role: "assistant",
        text: VELORA_BRIEF_PREAMBLE[patientId],
        createdAt: now,
        rxOutput: {
          kind: "velora_v0_mdt_brief",
          data: SURESH_PATEL_BRIEF_MOCK,
        },
        suggestions: VELORA_BRIEF_SUGGESTIONS[patientId],
      },
    ]
  }
  return [
    {
      id: `velora-user-${patientId}`,
      role: "user",
      text: VELORA_USER_PROMPT[patientId],
      createdAt: now,
    },
    {
      id: `velora-assistant-${patientId}`,
      role: "assistant",
      text: VELORA_BRIEF_PREAMBLE[patientId],
      createdAt: now,
      rxOutput: VELORA_BRIEF_OUTPUT[patientId],
      suggestions: VELORA_BRIEF_SUGGESTIONS[patientId],
    },
  ]
}

export function isVeloraPatientId(id: string): id is VeloraPatientId {
  return id === "velora-priya" || id === "velora-rajesh" || id === "velora-suresh"
}

/**
 * Scenario-specific canned cards shown on the WelcomeScreen for a Velora patient.
 * Uses React.createElement (this file is .ts, not .tsx) to instantiate iconsax icons
 * so the shape matches QuickAction in WelcomeScreen.
 */
const ICON_SIZE = 18
const icon = (Cmp: React.ComponentType<{ size?: number; variant?: "Bulk" }>) =>
  React.createElement(Cmp, { size: ICON_SIZE, variant: "Bulk" })

// ── Velora v0 — three canonical V0 intents shown on the welcome screen ──
// Same set is used whether a patient is selected or not (Hospital Overview).
// The previous "Active meds & safety" and "Why flagged today" intents
// were retired in favour of a narrower "Recent trends" entry point.
const VELORA_V0_INTENT_ACTIONS = [
  {
    icon: icon(Hospital),
    title: "Cross-consultation brief",
    subtitle: "What each specialty thinks, and where they collide",
    message: "Show cross-consultation brief",
  },
  {
    icon: icon(ClipboardText),
    title: "Patient journey",
    subtitle: "Hospital timeline · every visit & MDT · open loops surfaced inline",
    message: "Show patient journey",
  },
  {
    icon: icon(Activity),
    title: "Recent trends",
    subtitle: "Vital + lab trends Velora can pull for this patient — BP · HbA1c · eGFR · Lipid · Hb",
    message: "Show recent trends",
  },
]

const VELORA_V0_PATIENT_IDS = new Set([
  "__homepage_common__",
  "lakshmi-iyer",
  "suresh-patel",
  "asha-krishnan",
  "meera-joshi",
  "anita-desai",
  "arjun-verma",
])

export function getVeloraWelcomeActions(patientId: string) {
  // Velora v0 standalone — show the four V0 intent cards for the spec patients
  // and the Hospital Overview common context. Same cards, regardless of selection.
  if (VELORA_V0_PATIENT_IDS.has(patientId)) {
    return VELORA_V0_INTENT_ACTIONS
  }

  if (patientId === "velora-priya") {
    return [
      {
        icon: icon(Flash),
        title: "Run clinical insight scan",
        subtitle: "Start with Velora's quick brief for this patient",
        message: "Run clinical insight scan",
      },
      {
        icon: icon(Clock),
        title: "What's overdue right now?",
        subtitle: "Items past their expected window",
        message: "What's overdue right now?",
      },
      {
        icon: icon(Stickynote),
        title: "Pre-Letrozole checklist",
        subtitle: "Required steps before the Day 60 start",
        message: "Pre-Letrozole checklist",
      },
      {
        icon: icon(InfoCircle),
        title: "Why is the rad-onc window 8 weeks?",
        subtitle: "Guideline behind the critical deadline",
        message: "Why is the rad-onc window 8 weeks?",
      },
    ]
  }
  if (patientId === "velora-rajesh") {
    return [
      {
        icon: icon(Flash),
        title: "Run clinical insight scan",
        subtitle: "Start with Velora's quick brief for this patient",
        message: "Run clinical insight scan",
      },
      {
        icon: icon(Chart),
        title: "Show KT/V vs BNP trend",
        subtitle: "Dialysis adequacy vs cardiac stress overlay",
        message: "Show KT/V vs BNP trend",
      },
      {
        icon: icon(Activity),
        title: "Predicted outcomes if untreated",
        subtitle: "Three events that fit the current trajectory",
        message: "Predicted outcomes if untreated",
      },
      {
        icon: icon(Diagram),
        title: "What would escalating PD do?",
        subtitle: "Expected effect of a PD prescription step-up",
        message: "What would escalating PD do?",
      },
    ]
  }
  return undefined
}
