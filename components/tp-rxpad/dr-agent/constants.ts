// ─────────────────────────────────────────────────────────────
// Doctor Agent v0 — Constants & Configuration
// ─────────────────────────────────────────────────────────────

import type { RxContextOption, SpecialtyTabId } from "./types"

// ═══════════════ FONT SIZE CONTRACT ═══════════════
// Welcome greet: 18px (text-[18px])   — greeting headline only
// Card headings: 16px (text-[16px])   — CardShell title, AgentHeader, modal h3
// Body text:     14px (text-[14px])   — all content / body text
// Section label: 12px (text-[12px])   — table headers, section sub-labels (not full-width section bars)
// Section summary bar + SectionTag: 14px semibold, 30px row height, 18px TPMedicalIcon — full-width bar or inline chip; default bg bg-tp-slate-100/70 (TP Slate 100 at 70% opacity)
// Tags/badges:   12px (text-[12px])   — CardShell badge, status pills, colored tags (not section headers)
// Chart labels:  10-11px              — axis ticks, donut center labels
// Minimum:       10px                 — nothing below 10px
//
// CASING: Tags and badges use sentence case (first letter capital, rest lowercase).
//         Never use CSS `uppercase` on tags. No ALL-CAPS labels.
// NO responsive font sizing — all fixed px values

// ═══════════════ PATIENT CONTEXT OPTIONS ═══════════════

// ── Velora v0 panel — 5 canonical OMOP-backed patients ──
//
// Every patient in this list has a real OMOP CDM v5.4 export sitting on disk
// (see /Users/shyamsundar/Documents/Archive*.zip and docs/velora-patients/).
// The display name is anonymised; the person_id, gender, age (DOB-derived),
// and mobile (real for Suresh, deterministic-from-suffix for the rest) match
// the underlying records.
//
// No legacy / placeholder patients. The user explicitly scoped the Velora demo
// surface to these five so every interaction is grounded in real data.
//
// Meta string format: each "·"-separated chunk renders as a "|"-divided
// segment in the PatientSelector dropdown — gender · age · mobile · person_id.
//
//   P1  Lakshmi Iyer   F · 76 · breast Ca stage IA + CAD + CKD + OSA
//   P2  Suresh Patel   M · 60 · colon Ca T3N2b + lung mets + polypharmacy  (LIVE brief)
//   P3  Asha Krishnan  F · 57 · HTN + post-Achilles repair + intercurrent viral fevers
//   P4  Meera Joshi    F · 58 · CAD + CVA + DM + Hypothyroid + NAFLD + obesity
//   P5  Anita Desai    F · 64 · DM + HTN + hypertriglyceridaemia + recurrent pancreatitis + asthma
//   P6  Arjun Verma    M · 14 · Wilson's disease + acute HAV · IPD admission + OPD f/u  (IPD demo)
export const RX_CONTEXT_OPTIONS: RxContextOption[] = [
  { id: "lakshmi-iyer",   label: "Lakshmi Iyer",   meta: "F, 76y · +91 98765 54960 · 1093717054960", kind: "patient", isToday: true, gender: "F", age: 76 },
  { id: "suresh-patel",   label: "Suresh Patel",   meta: "M, 60y · +91 98333 83625 · 843373981236", kind: "patient", isToday: true, gender: "M", age: 60 },
  { id: "asha-krishnan",  label: "Asha Krishnan",  meta: "F, 57y · +91 98765 71728 · 375391871728", kind: "patient", isToday: true, gender: "F", age: 57 },
  { id: "meera-joshi",    label: "Meera Joshi",    meta: "F, 58y · +91 98765 57447 · 241381057447", kind: "patient", isToday: true, gender: "F", age: 58 },
  { id: "anita-desai",    label: "Anita Desai",    meta: "F, 64y · +91 98765 91886 · 714696991886", kind: "patient", isToday: true, gender: "F", age: 64 },
  // P6 is the only patient in the catalogue with a real inpatient
  // visit_occurrence (visit_concept_id = 9201) on file. The careType chip
  // surfaces this in the PatientSelector dropdown.
  { id: "arjun-verma",    label: "Arjun Verma",    meta: "M, 14y · +91 98765 60465 · 319033560465", kind: "patient", isToday: true, gender: "M", age: 14, careType: "IPD + OPD" },
]

// Default selection — Lakshmi Iyer is the first patient in the catalogue
// and the default landing when the Velora panel opens without an explicit
// selection. Per product call (her case is the cleanest entry point: a
// recent multi-specialty pre-op work-up that demonstrates every section of
// the brief without overwhelming a first-time viewer).
export const CONTEXT_PATIENT_ID = "lakshmi-iyer"

/** Auto-sent from appointment-row AI icon — must match panel handling for quick snapshot vs full summary */
export const QUICK_CLINICAL_SNAPSHOT_PROMPT = "Quick clinical snapshot"

/**
 * Find RX_CONTEXT_OPTIONS id by patient ID or name.
 * Used when embedding DrAgentPanel in pages that use external patient identifiers.
 */
export function findContextIdByPatientId(patientId: string, patientName?: string): string | undefined {
  // Direct match by id
  const direct = RX_CONTEXT_OPTIONS.find((o) => o.id === patientId)
  if (direct) return direct.id

  // Match by embedded patient ID (PAT0061, etc.) in meta
  const byMeta = RX_CONTEXT_OPTIONS.find((o) => o.meta?.includes(patientId))
  if (byMeta) return byMeta.id

  // Match by name (case-insensitive)
  if (patientName) {
    const lower = patientName.toLowerCase()
    const byName = RX_CONTEXT_OPTIONS.find((o) => o.label.toLowerCase() === lower)
    if (byName) return byName.id
  }

  return undefined
}

// ═══════════════ SPECIALTY CONFIG ═══════════════

export interface SpecialtyVisualConfig {
  id: SpecialtyTabId
  label: string
  headerBg: string
  accentColor: string
  lightBg: string
  iconName: string
}

export const SPECIALTY_TABS: SpecialtyVisualConfig[] = [
  { id: "gp", label: "GP", headerBg: "var(--tp-slate-50)", accentColor: "var(--tp-blue-500)", lightBg: "var(--tp-blue-50)", iconName: "stethoscope" },
  { id: "gynec", label: "Gynec", headerBg: "#FDF2F8", accentColor: "#EC4899", lightBg: "#FDF2F8", iconName: "female" },
  { id: "ophthal", label: "Ophthal", headerBg: "#F0FDFA", accentColor: "#14B8A6", lightBg: "#F0FDFA", iconName: "eye" },
  { id: "obstetric", label: "Obstetric", headerBg: "var(--tp-violet-50)", accentColor: "var(--tp-violet-500)", lightBg: "var(--tp-violet-50)", iconName: "baby" },
  { id: "pediatrics", label: "Pedia", headerBg: "var(--tp-blue-50)", accentColor: "var(--tp-blue-400)", lightBg: "var(--tp-blue-50)", iconName: "baby" },
]

// ═══════════════ VITAL METADATA ═══════════════

export interface VitalMeta {
  key: string
  label: string
  unit: string
  priority: number
  isAbnormal: (val: number) => boolean
  isCritical: (val: number) => boolean
}

export const VITAL_META: VitalMeta[] = [
  {
    key: "bp", label: "BP", unit: "mmHg", priority: 1,
    isAbnormal: (v) => v >= 140 || v <= 90,
    isCritical: (v) => v >= 180 || v <= 70,
  },
  {
    key: "spo2", label: "SpO₂", unit: "%", priority: 2,
    isAbnormal: (v) => v < 95,
    isCritical: (v) => v < 90,
  },
  {
    key: "pulse", label: "Pulse", unit: "bpm", priority: 3,
    isAbnormal: (v) => v > 100 || v < 50,
    isCritical: (v) => v > 130 || v < 40,
  },
  {
    key: "temp", label: "Temp", unit: "°F", priority: 4,
    isAbnormal: (v) => v >= 100.4,
    isCritical: (v) => v >= 103,
  },
  {
    key: "rr", label: "RR", unit: "/min", priority: 5,
    isAbnormal: (v) => v > 20 || v < 12,
    isCritical: (v) => v > 30 || v < 8,
  },
  {
    key: "weight", label: "Weight", unit: "kg", priority: 6,
    isAbnormal: () => false,
    isCritical: () => false,
  },
  {
    key: "height", label: "Height", unit: "cm", priority: 7,
    isAbnormal: () => false,
    isCritical: () => false,
  },
  {
    key: "bmi", label: "BMI", unit: "", priority: 8,
    isAbnormal: (v) => v > 30 || v < 18.5,
    isCritical: (v) => v > 40 || v < 16,
  },
  {
    key: "bloodSugar", label: "Blood Sugar", unit: "mg/dL", priority: 11,
    isAbnormal: (v) => v > 140,
    isCritical: (v) => v > 300,
  },
]

// ═══════════════ SECTION TAG CONFIG ═══════════════

export interface SectionTagConfig {
  id: string
  label: string
  icon: string
  sidebarTab?: string
  copyDestination?: string
}

export const SECTION_TAGS: Record<string, SectionTagConfig> = {
  vitals: { id: "vitals", label: "Today's Vitals", icon: "Heart Rate", sidebarTab: "vitals", copyDestination: "vitals" },
  labs: { id: "labs", label: "Key Labs", icon: "Lab", sidebarTab: "labResults", copyDestination: "labResults" },
  history: { id: "history", label: "Medical History", icon: "clipboard-activity", sidebarTab: "history", copyDestination: "history" },
  lastVisit: { id: "lastVisit", label: "Last Visit", icon: "medical-record", sidebarTab: "pastVisits", copyDestination: "rxpad" },
  symptoms: { id: "symptoms", label: "Symptoms Reported", icon: "thermometer", copyDestination: "rxpad" },
  examination: { id: "examination", label: "Examination", icon: "stethoscope", copyDestination: "rxpad" },
  diagnosis: { id: "diagnosis", label: "Diagnosis", icon: "Diagnosis", copyDestination: "rxpad" },
  medication: { id: "medication", label: "Medication", icon: "pill", sidebarTab: "pastVisits", copyDestination: "rxpad" },
  investigation: { id: "investigation", label: "Lab Investigations", icon: "Lab", copyDestination: "rxpad" },
  advice: { id: "advice", label: "Advice", icon: "clipboard-activity", copyDestination: "rxpad" },
  followUp: { id: "followUp", label: "Follow-up", icon: "medical-record", sidebarTab: "followUp", copyDestination: "followUp" },
  obstetric: { id: "obstetric", label: "Obstetric", icon: "Obstetric", sidebarTab: "obstetric", copyDestination: "obstetric" },
  gynec: { id: "gynec", label: "Gynec", icon: "Gynec", sidebarTab: "gynec", copyDestination: "gynec" },
  growth: { id: "growth", label: "Growth", icon: "Heart Rate Monitor", sidebarTab: "growth", copyDestination: "growth" },
  vaccine: { id: "vaccine", label: "Vaccine", icon: "injection", sidebarTab: "vaccine", copyDestination: "vaccine" },
}

// ═══════════════ AI STYLING ═══════════════

export const AI_GRADIENT = "linear-gradient(91deg, #D565EA 3.04%, #673AAC 66.74%, #1A1994 130.45%)"
export const AI_GRADIENT_SOFT = "linear-gradient(135deg, rgba(213,101,234,0.08) 0%, rgba(103,58,172,0.08) 50%, rgba(26,25,148,0.08) 100%)"
export const AI_GRADIENT_BORDER = "linear-gradient(135deg, rgba(213,101,234,0.3) 0%, rgba(103,58,172,0.3) 50%, rgba(26,25,148,0.3) 100%)"

// ═══════════════ AI ANIMATED GRADIENT (subtle flow for canned message icons) ═══════════════
export const AI_GRADIENT_SOFT_ANIMATED =
  "linear-gradient(135deg, rgba(213,101,234,0.18) 0%, rgba(139,92,246,0.22) 25%, rgba(103,58,172,0.18) 50%, rgba(26,25,148,0.15) 75%, rgba(213,101,234,0.18) 100%)"

// ═══════════════ AI PILL STYLING ═══════════════
export const AI_PILL_BG = "linear-gradient(135deg, rgba(213,101,234,0.08) 0%, rgba(103,58,172,0.08) 50%, rgba(26,25,148,0.08) 100%)"
export const AI_PILL_BG_HOVER = "linear-gradient(135deg, rgba(213,101,234,0.14) 0%, rgba(103,58,172,0.14) 50%, rgba(26,25,148,0.14) 100%)"
export const AI_PILL_BORDER = "1px solid rgba(103,58,172,0.15)"
export const AI_PILL_TEXT_GRADIENT = "linear-gradient(91deg, #D565EA 3.04%, #673AAC 66.74%, #1A1994 130.45%)"

// ═══════════════ CARD SIZING ═══════════════

export const CARD = {
  radius: 12,
  headerIconSize: 26,
  headerIconRadius: 8,
  titleSize: 16,
  bodySize: 14,
  secondarySize: 12,
  tagSize: 13,
  ctaHeight: 30,
  ctaRadius: 10,
  ctaFontSize: 14,
  padding: { x: 12, y: 8 },
} as const

// ═══════════════ PHASE PROMPTS (for prompt chips) ═══════════════

export const PHASE_PROMPTS: Record<string, string[]> = {
  empty: ["Patient's detailed summary", "Last visit", "Abnormal labs", "Reported by patient"],
  symptoms_entered: ["Generate DDX", "Last visit compare", "Vitals review", "Lab focus"],
  dx_accepted: ["Medication plan", "Investigations", "Advice draft", "Follow-up plan"],
  meds_written: ["Refine advice", "Translate advice", "Follow-up plan", "Completeness check"],
  near_complete: ["Final checklist", "Translate advice", "Visit review", "Risk recap"],
}

// ═══════════════ TAB PROMPTS ═══════════════

export const TAB_PROMPTS: Record<string, string[]> = {
  "dr-agent": ["Patient's detailed summary", "Abnormal findings", "Last visit essentials"],
  "past-visits": ["Last visit essentials", "Previous comparison", "Recurrence check"],
  vitals: ["Vitals overview", "Concerning vitals", "Trend if relevant"],
  history: ["Chronic history", "Allergy safety", "Family/lifestyle context"],
  "lab-results": ["Flagged labs", "Latest panel focus", "Follow-up lab suggestion"],
  obstetric: ["Obstetric highlights", "ANC due items", "Pregnancy risk checks"],
  "medical-records": ["Latest document insights", "Abnormal OCR findings", "Older record lookup"],
}

// ═══════════════ SIDEBAR CTA MAP ═══════════════

export const SIDEBAR_CTA_MAP: Record<string, { text: string; tab: string }> = {
  last_visit: { text: "See all past visits →", tab: "pastVisits" },
  vitals_trend_bar: { text: "View full vitals history →", tab: "vitals" },
  vitals_trend_line: { text: "View full vitals history →", tab: "vitals" },
  lab_panel: { text: "View complete lab report →", tab: "labResults" },
  lab_comparison: { text: "View full lab history →", tab: "labResults" },
  ocr_pathology: { text: "View in Medical Records →", tab: "medicalRecords" },
  ocr_extraction: { text: "View in Medical Records →", tab: "medicalRecords" },
  obstetric_summary: { text: "View full obstetric record →", tab: "obstetric" },
  gynec_summary: { text: "View gynec history →", tab: "gynec" },
  pediatric_summary: { text: "View growth chart →", tab: "growth" },
  ophthal_summary: { text: "View full ophthal history →", tab: "ophthal" },
  med_history: { text: "View full medical history →", tab: "history" },
  patient_summary: { text: "View full medical history →", tab: "history" },
}
