// ─────────────────────────────────────────────────────────────
// Doctor Agent v0 — Shared Type Definitions
// ─────────────────────────────────────────────────────────────

import type { RxPadCopyPayload } from "@/components/tp-rxpad/rxpad-sync-context"

// ═══════════════ CORE ENUMS & LITERALS ═══════════════

export type ConsultPhase =
  | "empty"
  | "symptoms_entered"
  | "dx_accepted"
  | "meds_written"
  | "near_complete"

export type SpecialtyTabId = "gp" | "gynec" | "ophthal" | "obstetric" | "pediatrics"

/** Doctor viewing context — controls summary depth, intro flow, and pill selection */
export type DoctorViewType = "specialist_first_visit" | "treating_physician" | "emergency_oncall"

/** Panel variant — "full" is the complete Dr. Agent, "v0" is the summary-only simplified version */
export type DrAgentVariant = "v0" | "full"

export type RxTabLens =
  | "dr-agent"
  | "past-visits"
  | "vitals"
  | "history"
  | "lab-results"
  | "obstetric"
  | "medical-records"

export type PillTone = "primary" | "info" | "warning" | "danger"

export type IntentCategory =
  | "data_retrieval"
  | "clinical_decision"
  | "action"
  | "comparison"
  | "document_analysis"
  | "clinical_question"
  | "operational"
  | "ambiguous"
  | "follow_up"
  | "out_of_scope"

export type ResponseFormat = "text" | "hybrid" | "card"

export type FlagDirection = "high" | "low" | "critical"

export type SeverityLevel = "critical" | "high" | "moderate" | "low"

export type InsightVariant = "red" | "amber" | "purple" | "teal"

// ═══════════════ PATIENT CONTEXT ═══════════════

export interface RxContextOption {
  id: string
  label: string
  meta: string
  kind: "system" | "patient"
  isToday?: boolean
  gender?: "M" | "F"
  age?: number
}

// ═══════════════ SMART SUMMARY DATA ═══════════════

export interface VitalEntry {
  bp?: string
  pulse?: string
  spo2?: string
  temp?: string
  bmi?: string
  rr?: string
  weight?: string
  height?: string
  bmr?: string
  bsa?: string
  bloodSugar?: string
}

export interface LabFlag {
  name: string
  value: string
  unit?: string
  flag: FlagDirection
  refRange?: string
}

export interface SymptomCollectorData {
  reportedAt: string
  symptoms: Array<{ name: string; duration?: string; severity?: string; notes?: string }>
  medicalHistory?: string[]
  familyHistory?: string[]
  allergies?: string[]
  lifestyle?: string[]
  questionsToDoctor?: string[]
  /** Populated by system from patient records */
  currentMedications?: string[]
  lastVisitSummary?: string
  /** Medicines suggested in last visit (different from currentMedications) */
  suggestedMeds?: string[]
  isNewPatient?: boolean
  /** Patient narrative from SmartSummaryData — used for consistent quick summary across all cards */
  patientNarrative?: string
}

export interface LastVisitData {
  date: string
  vitals?: string
  symptoms: string
  examination: string
  diagnosis: string
  medication: string
  labTestsSuggested: string
  advice?: string
  followUp?: string
  doctorName?: string  // e.g. "Dr. Sheela BR (Paediatrics)" — shown when last visit was with a different doctor
}

export interface GynecData {
  menarche?: string
  cycleLength?: string
  cycleRegularity?: string
  flowDuration?: string
  flowIntensity?: string
  padsPerDay?: string
  painScore?: string
  lmp?: string
  lastPapSmear?: string
  alerts?: string[]
}

export interface OphthalData {
  vaRight?: string
  vaLeft?: string
  nearVaRight?: string
  nearVaLeft?: string
  iop?: string
  slitLamp?: string
  fundus?: string
  lastExamDate?: string
  glassPrescription?: string
  alerts?: string[]
}

export interface ObstetricData {
  gravida?: number
  para?: number
  living?: number
  abortion?: number
  ectopic?: number
  lmp?: string
  edd?: string
  gestationalWeeks?: string
  presentation?: string
  fetalMovement?: string
  oedema?: string
  fundusHeight?: string
  amnioticFluid?: string
  lastExamDate?: string
  ancDue?: string[]
  vaccineStatus?: string[]
  alerts?: string[]
  bpLatest?: string
}

export interface PediatricsData {
  ageDisplay?: string
  heightCm?: number
  heightPercentile?: string
  weightKg?: number
  weightPercentile?: string
  ofcCm?: number
  bmiPercentile?: string
  vaccinesPending?: number
  vaccinesOverdue?: number
  overdueVaccineNames?: string[]
  milestoneNotes?: string[]
  feedingNotes?: string[]
  lastGrowthDate?: string
  alerts?: string[]
}

export interface ConcernTrend {
  label: string
  values: number[]
  labels: string[]
  unit: string
  tone?: "teal" | "red" | "violet" | "amber"
}

export interface SmartSummaryData {
  specialtyTags: string[]
  followUpOverdueDays: number
  patientNarrative?: string
  familyHistory?: string[]
  lifestyleNotes?: string[]
  allergies?: string[]
  chronicConditions?: string[]
  receptionistIntakeNotes?: string[]
  lastVisit?: LastVisitData
  labFlagCount: number
  todayVitals?: VitalEntry
  activeMeds?: string[]
  keyLabs?: LabFlag[]
  dueAlerts?: string[]
  recordAlerts?: string[]
  concernTrend?: ConcernTrend
  symptomCollectorData?: SymptomCollectorData
  gynecData?: GynecData
  ophthalData?: OphthalData
  obstetricData?: ObstetricData
  pediatricsData?: PediatricsData
  // ── SBAR / Provenance / POMR (optional — only populated for complex patients) ──
  sbarSituation?: string
  dataCompleteness?: { emr: number; ai: number; missing: number }
  dataProvenance?: Record<string, { source: "emr" | "ai_extracted" | "not_available"; confidence?: string; extractedFrom?: string }>
  sectionCompleteness?: Array<{ sectionId: string; filled: number; total: number; status?: string }>
  crossProblemFlags?: Array<{ text: string; problems: string[]; severity: string }>
  missingExpectedFields?: Array<{ field: string; reason: string; prompt: string }>
  recommendationTiers?: Array<{ text: string; tier: string; gatedBy: string }>
  pomrProblems?: Array<{
    problem: string
    status: string
    statusColor: string
    completeness: { emr: number; ai: number; missing: number }
    labKeys?: string[]
    vitalKeys?: string[]
    medKeys?: string[]
    missingKeys?: string[]
  }>
}

// ═══════════════ CANNED PILLS ═══════════════

export interface CannedPill {
  id: string
  label: string
  priority: number        // 0-99, lower = higher priority
  layer: 1 | 2 | 3 | 4
  force?: boolean          // Layer 1 safety pills
  cooldownMs?: number
  tone: PillTone
}

// ═══════════════ CARD DATA INTERFACES ═══════════════

export interface LastVisitCardSection {
  tag: string
  icon: string
  items: Array<{ label: string; detail?: string; severity?: string }>
  notes?: string
}

export interface LastVisitCardData {
  visitDate: string
  sections: LastVisitCardSection[]
  copyAllPayload: RxPadCopyPayload
}

export interface LabPanelData {
  panelDate: string
  flagged: LabFlag[]
  hiddenNormalCount: number
  insight?: string
}

export interface VitalTrendSeries {
  label: string
  values: number[]
  dates: string[]
  tone: "ok" | "warn" | "critical"
  threshold?: number
  thresholdLabel?: string
  unit: string
}

export interface LabComparisonRow {
  parameter: string
  prevValue: string
  currValue: string
  prevDate: string
  currDate: string
  delta: string
  direction: "up" | "down" | "stable"
  isFlagged: boolean
}

export interface MedHistoryEntry {
  drug: string
  dosage: string
  date: string
  diagnosis: string
  source: "prescribed" | "uploaded"
}

export interface DDXOption {
  name: string
  bucket: "cant_miss" | "most_likely" | "consider"
  selected?: boolean
}

export interface ProtocolMed {
  name: string
  dosage: string
  timing: string
  duration: string
  notes?: string
}

export interface InvestigationItem {
  name: string
  rationale: string
  selected?: boolean
}

export interface OCRParameter {
  name: string
  value: string
  refRange?: string
  flag?: FlagDirection
  confidence?: "high" | "medium" | "low"
}

export interface OCRSection {
  heading: string
  icon: string
  items: string[]
  copyDestination: string
}

export interface CompletenessSection {
  name: string
  filled: boolean
  count?: number
}

export interface TranslationData {
  sourceLanguage: string
  targetLanguage: string
  sourceText: string
  translatedText: string
}

export interface FollowUpOption {
  label: string
  days: number
  recommended?: boolean
  reason?: string
}

export interface DrugInteractionData {
  drug1: string
  drug2: string
  severity: SeverityLevel
  risk: string
  action: string
}

export interface AllergyConflictData {
  drug: string
  allergen: string
  alternative: string
}

// ═══════════════ VOICE-TO-STRUCTURED-RX ═══════════════

export interface VoiceRxItem {
  name: string
  detail?: string         // e.g., "3 days", "500mg", "1-0-0-1"
}

export interface VoiceRxSection {
  sectionId: string       // "symptoms" | "examination" | "diagnosis" | "medication" | "advice" | "investigation" | "followUp" | "history"
  title: string           // "Symptoms", "Examination", etc.
  tpIconName: string      // TPMedicalIcon name
  items: VoiceRxItem[]    // Structured items matching RxPad table format
}

export interface VoiceStructuredRxData {
  voiceText: string                    // Original transcribed text
  sections: VoiceRxSection[]           // Parsed structured sections
  copyAllPayload: RxPadCopyPayload     // Copy everything to RxPad
}

// ═══════════════ HOMEPAGE CARD DATA (H1–H12) ═══════════════

export type BadgeTone = "warning" | "success" | "info" | "danger"

export interface PatientListItem { name: string; age: number; gender: "M" | "F"; time: string; status: string; statusTone: BadgeTone; patientId?: string }
export interface PatientListCardData { title: string; items: PatientListItem[]; totalCount: number }

export interface FollowUpListItem { name: string; scheduledDate: string; reason: string; isOverdue: boolean; patientId?: string }
export interface FollowUpListCardData { title: string; items: FollowUpListItem[]; overdueCount: number }

export interface RevenueBarDay { label: string; paid: number; due: number; refunded?: number }
export interface RevenueBarCardData {
  title: string
  mode?: "billing" | "deposit"
  totalRevenue: number
  totalPaid: number
  totalDue: number
  totalRefunded: number
  days: RevenueBarDay[]
}

export interface RevenueComparisonCardData {
  title: string
  primaryDateLabel: string
  compareDateLabel: string
  primaryRevenue: number
  compareRevenue: number
  primaryRefunded: number
  compareRefunded: number
  primaryDeposits: number
  compareDeposits: number
  insight: string
}

export interface BulkActionCardData { action: string; messagePreview: string; recipients: string[]; totalCount: number }

export interface DonutSegment { label: string; value: number; color: string }
export interface DonutChartCardData { title: string; segments: DonutSegment[]; total: number; centerLabel: string }

export interface PieChartCardData { title: string; segments: DonutSegment[]; total: number; centerLabel: string }

export interface LineGraphPoint { label: string; value: number }
export interface LineGraphCardData { title: string; points: LineGraphPoint[]; average: number; changePercent: string; changeDirection: "up" | "down" | "stable" }

export interface AnalyticsKPI { metric: string; thisWeek: string; lastWeek: string; delta: string; direction: "up" | "down" | "stable"; isGood: boolean }
export interface AnalyticsTableCardData { title: string; kpis: AnalyticsKPI[]; insight: string }

export interface ConditionBarItem { condition: string; count: number; color: string }
export interface ConditionBarCardData { title: string; items: ConditionBarItem[]; note: string }

export interface HeatmapCell { value: number; intensity: "low" | "medium" | "high" }
export interface HeatmapCardData { title: string; rows: string[]; cols: string[]; cells: HeatmapCell[][] }
export interface DuePatientsCardData {
  title: string
  periodLabel: string
  patientCount: number
  totalDueAmount: number
  asOf: string
  ctaLabel: string
}
export interface ExternalCtaCardData {
  title: string
  description: string
  ctaLabel: string
  ctaUrl: string
  openInNewTab?: boolean
}
export interface FollowUpRatePoint { label: string; rate: number }
export interface FollowUpRateCardData {
  title: string
  currentRate: number
  lastWeekRate: number
  dueToday: number
  overdueToday: number
  completedThisWeek: number
  scheduledThisWeek: number
  trend: FollowUpRatePoint[]
}

// ═══════════════ NEW CARD TYPES ═══════════════

export interface ReferralItem {
  doctorName: string
  doctorPhone: string
  specialty: string
  patientsReferred: number
  topReason: string
}
export interface ReferralCardData {
  title: string
  totalReferrers: number
  totalPatients: number
  items: ReferralItem[]
}

export interface VaccineScheduleItem {
  patientName: string
  patientId?: string
  name: string
  dose: string
  dueDate: string
  status: "given" | "due" | "overdue"
}
export interface VaccinationScheduleCardData {
  title: string
  overdueCount: number
  dueCount: number
  givenCount: number
  vaccines: VaccineScheduleItem[]
}

export interface ClinicalGuidelineCardData {
  title: string
  condition: string
  source: string
  recommendations: string[]
  evidenceLevel: "A" | "B" | "C"
}

export interface TimelineEvent {
  date: string
  type: "visit" | "lab" | "procedure" | "admission"
  summary: string
}
export interface PatientTimelineCardData {
  title: string
  events: TimelineEvent[]
}

export interface RxPreviewCardData {
  patientName: string
  date: string
  diagnoses: string[]
  medications: string[]
  investigations: string[]
  advice: string[]
  followUp: string
}

export interface BillingItem {
  referenceNo: string
  patientName: string
  amount: number
  billedAmount?: number
  paidAmount?: number
  status: "paid_fully" | "due" | "refunded" | "deposited" | "debited"
}
export interface BillingSummaryCardData {
  title: string
  mode: "billing" | "deposit" | "combined"
  items: BillingItem[]
  todayBilledAmount?: number
  todayCollectedAmount?: number
  totalBilledAmount: number
  totalPaidFullyAmount: number
  totalDueAmount: number
  totalRefundedAmount: number
  totalAdvanceReceived: number
  totalAdvanceRefunded: number
  totalAdvanceDebited: number
  footerCtaLabel?: string
  footerCtaAction?: string
  minimal?: boolean
  insight?: string
}

// ═══════════════ VACCINATION DUE/OVERDUE LIST ═══════════════

export interface VaccinationDueItem {
  patientName: string
  patientId?: string
  vaccineName: string
  dose: string
  dueDate: string
  isOverdue: boolean
}
export interface VaccinationDueListCardData {
  title: string
  overdueCount: number
  dueCount: number
  items: VaccinationDueItem[]
}

// ═══════════════ ANC SCHEDULE DUE/OVERDUE LIST ═══════════════

export interface ANCScheduleItem {
  patientName: string
  patientId?: string
  ancItem: string
  dueWeek: string
  gestationalAge: string
  isOverdue: boolean
}
export interface ANCScheduleListCardData {
  title: string
  overdueCount: number
  dueCount: number
  items: ANCScheduleItem[]
}

// ═══════════════ POMR PROBLEM CARD ═══════════════
export interface PomrSourceEntry {
  /** Display label, e.g. "Blood Work — CBC, KFT" or "Rx #4521 — Dr. Mehta" */
  label: string
  /** Date string, e.g. "12 Jan 2026" */
  date?: string
  /** Source type */
  type: "emr" | "uploaded" | "rx"
}
export interface PomrProblemCardData {
  problem: string
  status: string
  statusColor: string
  completeness: { emr: number; ai: number; missing: number }
  labs: Array<{ name: string; value: string; unit?: string; flag?: FlagDirection; provenance?: "emr" | "ai_extracted" }>
  meds: string[]
  missingFields: Array<{ field: string; reason: string; prompt: string }>
  /** Source documents for data completeness tooltip */
  sourceEntries?: PomrSourceEntry[]
}

// ═══════════════ SBAR CRITICAL CARD (EMERGENCY VIEW) ═══════════════
export interface SbarCriticalCardData {
  situation: string
  activeProblems: string[]
  criticalFlags: Array<{ label: string; value: string; severity: "critical" | "high" }>
  allergies: string[]
  keyMeds: string[]
  recentER?: string[]
}

// ═══════════════ GUARDRAIL CARD ═══════════════

export interface GuardrailCardData {
  /** AI-generated message explaining why this can't be answered */
  message: string
  /** Suggested actions the user CAN take */
  suggestions: { label: string; message: string }[]
}

// ═══════════════ MEDICAL HISTORY CARD ═══════════════

export interface MedicalHistoryCardData {
  /** Section-based medical history */
  sections: Array<{
    tag: string
    icon?: string
    items: string[]
  }>
  /** Optional AI insight */
  insight?: string
}

// ═══════════════ VITALS SUMMARY CARD ═══════════════

export interface VitalsSummaryCardData {
  /** Title (e.g. "Today's Vitals") */
  title: string
  /** Recorded timestamp */
  recordedAt: string
  /** Vital parameter rows */
  rows: Array<{
    /** Short abbreviated label, e.g. "BP", "HR", "SpO₂" */
    shortLabel: string
    /** Full label for accessibility, e.g. "Blood Pressure" */
    label: string
    value: string
    unit: string
    flag?: "normal" | "high" | "low" | "critical"
  }>
  /** Optional AI insight */
  insight?: string
}

// ═══════════════ RX AGENT OUTPUT (DISCRIMINATED UNION) ═══════════════

export type RxAgentOutput =
  | { kind: "patient_summary"; data: SmartSummaryData; hideNarrative?: boolean }
  | { kind: "patient_narrative"; data: SmartSummaryData }
  | { kind: "sbar_critical"; data: SbarCriticalCardData }
  | { kind: "sbar_overview"; data: SmartSummaryData }
  | { kind: "last_visit"; data: LastVisitCardData }
  | { kind: "lab_panel"; data: LabPanelData }
  | { kind: "vitals_trend_bar"; data: { title: string; series: VitalTrendSeries[] } }
  | { kind: "vitals_trend_line"; data: { title: string; series: VitalTrendSeries[] } }
  | { kind: "lab_trend"; data: { title: string; series: VitalTrendSeries[]; parameterName: string } }
  | { kind: "lab_comparison"; data: { rows: LabComparisonRow[]; insight: string } }
  | { kind: "med_history"; data: { entries: MedHistoryEntry[]; insight: string } }
  | { kind: "ddx"; data: { context: string; options: DDXOption[] } }
  | { kind: "protocol_meds"; data: { diagnosis: string; meds: ProtocolMed[]; safetyCheck: string; copyPayload: RxPadCopyPayload } }
  | { kind: "investigation_bundle"; data: { title: string; items: InvestigationItem[]; copyPayload: RxPadCopyPayload } }
  | { kind: "follow_up"; data: { context: string; options: FollowUpOption[] } }
  | { kind: "ocr_pathology"; data: { title: string; category: string; parameters: OCRParameter[]; normalCount: number; insight: string } }
  | { kind: "ocr_extraction"; data: { title: string; category: string; sections: OCRSection[]; insight: string } }
  | { kind: "translation"; data: TranslationData & { copyPayload: RxPadCopyPayload } }
  | { kind: "completeness"; data: { sections: CompletenessSection[]; emptyCount: number } }
  | { kind: "drug_interaction"; data: DrugInteractionData }
  | { kind: "allergy_conflict"; data: AllergyConflictData }
  | { kind: "follow_up_question"; data: { question: string; options: string[]; multiSelect: boolean } }
  | { kind: "symptom_collector"; data: SymptomCollectorData }
  | { kind: "obstetric_summary"; data: ObstetricData }
  | { kind: "gynec_summary"; data: GynecData }
  | { kind: "pediatric_summary"; data: PediatricsData }
  | { kind: "ophthal_summary"; data: OphthalData }
  | { kind: "text_fact"; data: { value: string; context: string; source: string } }
  | { kind: "text_alert"; data: { message: string; severity: SeverityLevel } }
  | { kind: "text_list"; data: { items: string[] } }
  | { kind: "advice_bundle"; data: { title: string; items: string[]; shareMessage: string; copyPayload: RxPadCopyPayload } }
  | { kind: "voice_structured_rx"; data: VoiceStructuredRxData }
  // Homepage Operational Cards (H1–H12)
  | { kind: "patient_list"; data: PatientListCardData }
  | { kind: "follow_up_list"; data: FollowUpListCardData }
  | { kind: "revenue_bar"; data: RevenueBarCardData }
  | { kind: "revenue_comparison"; data: RevenueComparisonCardData }
  | { kind: "bulk_action"; data: BulkActionCardData }
  | { kind: "donut_chart"; data: DonutChartCardData }
  | { kind: "pie_chart"; data: PieChartCardData }
  | { kind: "line_graph"; data: LineGraphCardData }
  | { kind: "analytics_table"; data: AnalyticsTableCardData }
  | { kind: "condition_bar"; data: ConditionBarCardData }
  | { kind: "heatmap"; data: HeatmapCardData }
  | { kind: "due_patients"; data: DuePatientsCardData }
  | { kind: "external_cta"; data: ExternalCtaCardData }
  | { kind: "follow_up_rate"; data: FollowUpRateCardData }
  | { kind: "welcome_card"; data: WelcomeCardData }
  // New Card Variants
  | { kind: "referral"; data: ReferralCardData }
  | { kind: "vaccination_schedule"; data: VaccinationScheduleCardData }
  | { kind: "clinical_guideline"; data: ClinicalGuidelineCardData }
  | { kind: "patient_timeline"; data: PatientTimelineCardData }
  | { kind: "rx_preview"; data: RxPreviewCardData }
  | { kind: "billing_summary"; data: BillingSummaryCardData }
  | { kind: "vaccination_due_list"; data: VaccinationDueListCardData }
  | { kind: "anc_schedule_list"; data: ANCScheduleListCardData }
  // Text Variants
  | { kind: "text_step"; data: { steps: string[] } }
  | { kind: "text_quote"; data: { quote: string; source: string } }
  | { kind: "text_comparison"; data: { labelA: string; labelB: string; itemsA: string[]; itemsB: string[] } }
  // POMR Problem Card
  | { kind: "pomr_problem_card"; data: PomrProblemCardData }
  // Patient Search
  | { kind: "patient_search"; data: PatientSearchCardData }
  // Guardrail (out-of-scope)
  | { kind: "guardrail"; data: GuardrailCardData }
  // Vitals Summary (today's vitals table)
  | { kind: "vitals_summary"; data: VitalsSummaryCardData }
  // Medical History (chronic conditions, allergies, family history, etc.)
  | { kind: "medical_history"; data: MedicalHistoryCardData }
  // Velora — compact intro card shown as the first AI message per Velora patient
  | { kind: "velora_brief"; data: VeloraBriefCardData }
  // Velora — Story 1 · extensive care-gap-window assessment (revealed on pill tap)
  | { kind: "care_gap_window"; data: CareGapWindowCardData }
  // Velora — Story 2 · extensive multi-specialist correlation chain (revealed on pill tap)
  | { kind: "clinical_correlation_chain"; data: ClinicalCorrelationChainCardData }
  // Velora — flexible custom card for drill-down replies (checklist / evidence / comparison / trend …)
  | { kind: "velora_scenario_card"; data: VeloraScenarioCardData }
  // ── Velora v0 — four canonical intent cards (Stack 1 / Stack 2 anatomy per spec) ──
  | { kind: "velora_v0_mdt_brief"; data: VeloraV0MdtBriefData }
  | { kind: "velora_v0_open_loops"; data: VeloraV0OpenLoopsData }
  | { kind: "velora_v0_patient_journey"; data: VeloraV0PatientJourneyData }
  | { kind: "velora_v0_active_meds"; data: VeloraV0ActiveMedsData }
  | { kind: "velora_v0_why_flagged"; data: VeloraV0WhyFlaggedData }
  | { kind: "velora_v0_trends"; data: VeloraV0TrendsData }

// ═══════════════ VELORA V0 — STACK 1 / STACK 2 CARD DATA ═══════════════
// Per Velora_V0_Intent_Spec: every answer separates verifiable hospital records
// (Stack 1 · FACT) from guideline-anchored AI synthesis (Stack 2 · SUGGESTED).
// Each Stack-1 line carries author + specialty + date; each Stack-2 panel cites
// its guideline body.

export interface VeloraV0Source {
  specialty: string
  author: string
  date: string
  sourceId?: string
}

export interface VeloraV0Guideline {
  body: string
  year?: string
  section?: string
  /** One short sentence describing the guideline body — surfaced via the
   *  guideline-chip hover tooltip. Example: "European Society of Cardiology
   *  guideline for atrial fibrillation management." */
  description?: string
  /** Which fields this guideline drives in the current panel — also surfaced
   *  in the chip tooltip. Example: "Stroke-risk score, anticoag indication,
   *  preferred DOAC for renal impairment." */
  fetches?: string
}

export interface VeloraV0Attribution {
  source: VeloraV0Source
  /** Verbatim short lines lifted from the source note (max ~3).
   *  Wrap key clinical terms in **double asterisks** to render them bold inline. */
  lines: string[]
  /** Optional cited guideline used by the specialty on their own note — shown
   *  inside the section header trailing slot. */
  citedGuideline?: VeloraV0Guideline
  /** Count of other specialty notes that reference this one — surfaced as a
   *  small caption in the section header. */
  crossRefs?: number
  /** Why Velora picked this specific note out of the EMR — surfaced via the
   *  eye-icon tooltip next to the section heading's date. */
  reason?: string
}

export interface VeloraV0Synthesis {
  panelTitle: string
  guideline: VeloraV0Guideline
  /** Tabular rows: label · value · (optional tone) · (optional ref or note). */
  rows: Array<{
    label: string
    value: string
    ref?: string
    tone?: "ok" | "warn" | "alert"
  }>
  /** Optional one-line synthesis caption. */
  note?: string
}

// ── Intent ① · MDT brief ────────────────────────────────────────────────
export interface VeloraV0MdtBriefData {
  patientName: string
  patientMeta: string
  windowDays: number
  /** Stack 1 — per-specialty attributed notes from EMR. */
  specialties: VeloraV0Attribution[]
  /** Stack 2 — collisions, pending items, guideline-anchored panels.
   *  `collisions` is the new shape (list of detector fires). `collide` is the
   *  legacy single-entry form kept for back-compat with older mocks. */
  collisions?: VeloraV0CollideEntry[]
  collide?: {
    headline: string
    detail: string
    rule: VeloraV0Guideline
  }
  pendingMdtItems?: string[]
  syntheses: VeloraV0Synthesis[]
  freshness: string
}

/** One entry in the "Where they collide" warning panel. Multiple detectors
 *  can fire independently for a single patient — the card renders each as
 *  its own sub-section with a kind badge + drug-pair title + bullet points
 *  + cited guideline chip. */
export interface VeloraV0CollideEntry {
  kind: "ddi" | "coordination-gap"
  /** Short drug-pair / signal-pair headline (HighlightLine supported). */
  title: string
  /** Bullet-style points shown under the title (HighlightLine supported). */
  points: string[]
  /** Cited guideline body governing the rule. */
  rule: VeloraV0Guideline
}

// ── Intent ② · Open loops ───────────────────────────────────────────────
export interface VeloraV0OpenLoop {
  ageDays: number
  severity: "red" | "amber"
  title: string
  sourceId: string
  source: VeloraV0Source
  detector: string
  disclosure?: string
}

export interface VeloraV0OpenLoopsData {
  patientName: string
  patientMeta: string
  loops: VeloraV0OpenLoop[]
  /** Stack 2 — thresholds from signed config (operational, not clinical). */
  thresholdConfig: {
    signedBy: string
    rules: Array<{ category: string; window: string }>
  }
  freshness: string
}

// ── Intent ③ · Active meds & safety ─────────────────────────────────────
export interface VeloraV0ActiveMed {
  drug: string
  dose: string
  specialty: string
  prescriber: string
  since: string
}

export interface VeloraV0DDIFlag {
  drugs: [string, string]
  severity: "alert" | "warn"
  rationale: string
  rule: VeloraV0Guideline
}

export interface VeloraV0ActiveMedsData {
  patientName: string
  patientMeta: string
  meds: VeloraV0ActiveMed[]
  allergiesOnFile: string[]
  recentLabs: Array<{ label: string; value: string; refRange: string; tone?: "ok" | "warn" | "alert" }>
  /** Stack 2 — DDI flags + threshold panels. */
  ddi: VeloraV0DDIFlag[]
  thresholdPanels: VeloraV0Synthesis[]
  freshness: string
}

// ── Intent ④ · Why flagged today ────────────────────────────────────────
export interface VeloraV0Flag {
  severity: "critical" | "warning" | "info"
  title: string
  detail: string
  source: VeloraV0Source
  /** Threshold/guideline that classified this severity (Stack 2 trace). */
  guideline?: VeloraV0Guideline
  /** Short threshold description shown next to the cited body. */
  thresholdNote?: string
}

export interface VeloraV0WhyFlaggedData {
  patientName: string
  patientMeta: string
  flags: VeloraV0Flag[]
  /** When no triggers fire, render the honest empty state. */
  noTriggers?: boolean
  freshness: string
}

// ═══════════════ VELORA V0 — PATIENT JOURNEY (timeline) ═══════════════
//
// Replaces the V0 "Open loops" list-style card. A vertical timeline of every
// signed encounter, admission, MDT meeting, and scheduled item for this
// patient at this hospital — verbatim from the EMR, no AI authoring.
//
// Open / pending items (lab result missing, referral with no destination
// visit, missed follow-up) surface inline as RED markers, so the "open
// loops" idea is preserved as a section of the bigger journey view.

/** Marker tone — drives the circle colour, pill style, and grouping. */
export type VeloraV0EventTone =
  | "consult"    // outline circle, light specialty pill (Nephro / Cardio / Endo / GenMed)
  | "lab"        // outline circle, neutral grey pill (lab result reported)
  | "admit"      // filled red circle, solid red pill ("ADMIT")
  | "mdt"        // filled dark circle, solid dark pill ("MDT")
  | "today"      // filled blue circle, solid blue pill ("TODAY")
  | "scheduled"  // dashed outline, amber pill ("SCHEDULED")
  | "open-loop"  // filled red ring, red pill ("OPEN") — pending items that should have closed

export interface VeloraV0JourneyEvent {
  /** Date label as rendered on the rail (e.g. "Mar 2025", "24 Apr '26"). */
  date: string
  /** Short specialty / event-type label rendered in the pill. */
  specialtyLabel: string
  tone: VeloraV0EventTone
  /** Doctor attributed to this event — rendered on the top bar after the date.
   *  For consult / order events: the prescribing or ordering doctor.
   *  For labs: the doctor who ordered the lab.
   *  For appointments / open loops: the doctor who owns the appointment.
   *  Omitted only when no doctor is attached (very rare). */
  doctor?: string
  /** One-line headline shown next to the pill. */
  headline: string
  /** Optional plain-text longer body shown when the row is expanded.
   *  Used for non-Rx events (lab reports, scheduled items, open loops). */
  detail?: string
  /** Optional structured Rx pointers shown when the row is expanded — mirrors
   *  the MDT brief 5-pointer body so each visit's Rx reads consistently
   *  wherever it appears in Velora. Only fields the visit actually filled
   *  render — empty fields are omitted. */
  rxPointers?: {
    findings?: string
    keyLabs?: string
    medication?: string
    advices?: string
    plan?: string
    /** Author shown in the expanded view (e.g. "Dr Sharma · Cardiology"). */
    author?: string
  }
  /** Stable ID used by the click-to-source contract (e.g. "Note #NOT-3119"). */
  sourceId?: string
  /** Type of the source artifact — drives the badge label
   *  ("Rx ID", "Order ID", "Appointment ID", "Lab Report ID", "Referral ID"). */
  sourceType?: "rx" | "order" | "appointment" | "lab-report" | "referral" | "note"
  /** For open-loop rows: how many days the loop has been open. */
  ageDays?: number
}

export interface VeloraV0PatientJourneyData {
  patientName: string
  patientMeta: string
  /** Display window e.g. "Sep 2024 → Apr 2026". */
  windowLabel: string
  /** Months covered. */
  windowMonths: number
  /** Total encounter count in the window (signed visits + admissions). */
  encounterCount: number
  /** Timeline events, oldest → newest. The renderer reverses or paginates as needed. */
  events: VeloraV0JourneyEvent[]
}

// ═══════════════ VELORA V0 — TRENDS (Trends sub-intent card) ═══════════════
//
// Top-N trends Velora deems most cross-team relevant for this patient.
// Each trend renders as a label · current value · target line · sparkline · why-picked.
// Selection is data-driven: pick the metrics that already appear in the MDT brief
// Stack 1 as abnormal flagged values (HbA1c flagged in Endo, eGFR in Nephro, etc.).

export interface VeloraV0Trend {
  /** Display label, e.g. "HbA1c" or "eGFR". */
  label: string
  /** Unit, e.g. "%" or "mL/min/1.73 m²". */
  unit: string
  /** Latest reading, formatted (e.g. "8.4"). */
  currentValue: string
  /** Time-ordered values for the sparkline (oldest → newest). */
  values: number[]
  /** Short date labels paired 1:1 with `values`. */
  dates: string[]
  /** Target / threshold line, drawn dashed. */
  threshold?: number
  /** Short description of the threshold, e.g. "target <7%" or "G3a <60". */
  thresholdLabel?: string
  /** Visual tone — red / amber / green based on signed reference range. */
  tone: "alert" | "warn" | "ok"
  /** Direction summary line, e.g. "declining ~3.5 / quarter" or "gradual improvement". */
  trajectory?: string
  /** Cited guideline body that owns the target. */
  guideline: VeloraV0Guideline
  /** Why Velora picked this metric out of all the patient's labs / vitals. */
  whyPicked: string
}

export interface VeloraV0TrendsData {
  patientName: string
  patientMeta: string
  trends: VeloraV0Trend[]
  /** One-line preamble explaining the selection rule. */
  selectionReason: string
}

// ═══════════════ VELORA — CARE GAP WINDOW ═══════════════

export type VeloraUrgency = "critical" | "warning" | "info"
export type VeloraGapState = "not_booked" | "not_ordered" | "not_performed"

export interface VeloraCareGap {
  label: string
  state: VeloraGapState
  detectedBy: string
  expectation: string
  rationale: string
}

export interface VeloraSilo {
  label: string
  tone: "blue" | "violet" | "amber" | "slate" | "error"
}

export type VeloraLabFlag = "high" | "low" | "missing" | "normal"
export type VeloraPathwayStatus = "done" | "due" | "overdue" | "pending"

export interface VeloraStructuredMed {
  name: string
  /** e.g. "2.5 mg" */
  dose: string
  /** e.g. "OD", "BID", "TID", "PRN" */
  frequency: string
  /** e.g. "PO", "IV", "SC" */
  route?: string
  /** "ongoing" | "planned Day 60" | "stopped 5 days ago" */
  timing: string
  /** Optional status tag for colouring */
  status?: "ongoing" | "planned" | "stopped" | "prn"
}

export interface VeloraPersona {
  presentation: string
  history: string[]
  labs: Array<{ label: string; value: string; flag?: VeloraLabFlag; unit?: string }>
  /** Structured medication rows (preferred over free-text). */
  meds: VeloraStructuredMed[]
}

// ═══════════════ VELORA — SCENARIO CARD (flexible drill-down) ═══════════════

export type VeloraScenarioSectionTone = "neutral" | "critical" | "warning" | "info" | "success"

export type VeloraScenarioStepState = "done" | "missing" | "overdue" | "due" | "pending" | "info"

/** One block inside a VeloraScenarioCard. Each block renders with a small grey tag heading. */
export type VeloraScenarioSection =
  | {
      kind: "bullets"
      label: string
      items: Array<{
        text: string
        badge?: string
        badgeTone?: VeloraScenarioSectionTone
        meta?: string
      }>
    }
  | {
      kind: "steps"
      label: string
      steps: Array<{
        text: string
        state?: VeloraScenarioStepState
        meta?: string
      }>
    }
  | {
      kind: "key_values"
      label: string
      rows: Array<{ key: string; value: string; emphasize?: boolean }>
    }
  | {
      kind: "table"
      label: string
      /** Column headings — rendered in a slate-50 header row inside a bordered table. */
      columns: [string, string]
      rows: Array<[string, string]>
    }
  | {
      kind: "comparison"
      label: string
      labelA: string
      labelB: string
      itemsA: string[]
      itemsB: string[]
    }
  | {
      kind: "narrative"
      label?: string
      paragraphs: string[]
    }
  | {
      kind: "highlight"
      tone: "critical" | "warning" | "info" | "success"
      label?: string
      text: string
    }

export interface VeloraScenarioAction {
  label: string
  kind: "primary" | "secondary" | "destructive"
  /** Text sent as the follow-up user message when the CTA is clicked. Omit for no-op. */
  message?: string
}

export interface VeloraScenarioCardData {
  /** iconsax icon name — optional. Defaults to Flash. */
  iconName?: string
  title: string
  subtitle?: string
  /** Optional top-right badge — e.g. "Action staged" / "3 items". */
  badge?: { label: string; tone: VeloraScenarioSectionTone }
  /** Optional citation line at the bottom. */
  source?: string
  sections: VeloraScenarioSection[]
  /** In-card CTAs rendered as a button row at the bottom of the card (Confirm / Cancel style). */
  actions?: VeloraScenarioAction[]
}

// ═══════════════ VELORA — BRIEF (intro) CARD ═══════════════

export type VeloraHighlightTone = "neutral" | "blue" | "violet" | "amber" | "error" | "success" | "slate"

export interface VeloraHighlight {
  /** Bolded primary identifier (metric name, action name, lab name). */
  primary: string
  /** Bolded value next to primary (lab value, state like "Not booked"). */
  value?: string
  /** Muted secondary context line — optional. */
  context?: string
  /** Right-aligned neutral-tone tag (department / source / urgency). */
  tag?: { label: string; tone: VeloraHighlightTone }
}

export interface VeloraBriefCardData {
  patientId: "velora-priya" | "velora-rajesh"
  /** Headline — e.g. "Missed window: radiation oncology" */
  headline: string
  /** Short 1-line urgency/significance summary beneath the headline */
  subhead: string
  urgencyBadge: { label: string; tone: "critical" | "warning" | "info" | "neutral" }
  patient: { label: string; summary: string }
  /** Three silos / specialties being bridged. Rendered as compact dotted chips. */
  silos: VeloraSilo[]
  /** One-line framing ("invisible to one, obvious when connected"). */
  siloNote: string
  /** 3-4 structured highlight rows — each a segregated card row with
   *  bold primary + value, muted context, and a department/source tag on the right. */
  highlights: VeloraHighlight[]
  /** Label of the primary pill that reveals the full extensive card. */
  primaryExploreLabel: string
}

export interface VeloraPathwayStep {
  label: string
  status: VeloraPathwayStatus
  meta?: string
}

export interface CareGapWindowCardData {
  patient: { label: string; summary: string }
  title: string
  deadlineIso: string
  deadlineLabel: string
  urgency: VeloraUrgency
  /** Departments / data silos being bridged. Rendered as the hero cross-silo view. */
  silos: VeloraSilo[]
  /** One-line framing, e.g. "Invisible to any one department. Obvious once connected." */
  siloNote: string
  /** Patient persona — presentation, history, key labs, meds. */
  persona: VeloraPersona
  /** Treatment pathway — HMS-recommended steps with completed/due/overdue status. */
  pathway: VeloraPathwayStep[]
  gaps: VeloraCareGap[]
  /** One-paragraph "why this matters clinically" note. */
  clinicalSignificance: string
  rationale: string
  actions: Array<{ label: string; kind: "pill" | "primary" | "secondary" }>
}

// ═══════════════ VELORA — CLINICAL CORRELATION CHAIN ═══════════════

export type VeloraChainSpecialty = "nephrology" | "cardiology" | "internal_med"

export interface VeloraChainLink {
  marker: string
  value: string
  target?: string
  trend?: "up" | "down" | "flat"
  specialty: VeloraChainSpecialty
  note?: string
}

export interface VeloraSpecialistSection {
  specialty: VeloraChainSpecialty
  label: string
  rows: Array<{ label: string; value: string; refRange?: string; flag?: "high" | "low" }>
  note: string
}

export interface VeloraCorrelationFocus {
  /** e.g. "Dialysis adequacy ↔ Cardiac stress" */
  title: string
  axisA: { marker: string; value: string; target?: string; trend?: "up" | "down" | "flat"; specialtyLabel: string }
  axisB: { marker: string; value: string; target?: string; trend?: "up" | "down" | "flat"; specialtyLabel: string }
  /** Plain-language narrative bridging the two axes. */
  narrative: string
}

export interface ClinicalCorrelationChainCardData {
  patient: { label: string; summary: string }
  title: string
  prediction: { label: string; color: "blue" | "amber" | "error" }
  /** Departments / specialties being bridged. Hero cross-silo view. */
  silos: VeloraSilo[]
  /** One-line framing for the silos row. */
  siloNote: string
  /** Patient persona — presentation, history, labs, meds. */
  persona: VeloraPersona
  /** Central correlation hero — the "A ↔ B" pair that makes the chain causal. */
  correlationFocus: VeloraCorrelationFocus
  chain: VeloraChainLink[]
  specialists: VeloraSpecialistSection[]
  /** Predicted outcomes if the chain is not acted upon. */
  predictedOutcomes: string[]
  insight: string
  actions: Array<{ label: string; kind: "pill" | "primary" | "secondary" }>
}

// ═══════════════ PATIENT SEARCH CARD ═══════════════

export interface PatientSearchResult {
  patientId: string
  name: string
  meta: string
  hasAppointmentToday: boolean
}

export interface PatientSearchCardData {
  query: string
  results: PatientSearchResult[]
}

// ═══════════════ WELCOME CARD ═══════════════

export interface WelcomeCardStat { label: string; value: number; color: string; icon?: string; tab?: string }
export interface WelcomeCardQuickAction { label: string; tab?: string }
export interface WelcomeCardData {
  greeting: string
  date: string
  stats: WelcomeCardStat[]
  quickActions?: WelcomeCardQuickAction[]
  contextLine?: string
  tips?: string[]
}

// ═══════════════ PATIENT DOCUMENT (EMR uploads) ═══════════════

export type PatientDocType = "pathology" | "radiology" | "prescription" | "discharge_summary" | "vaccination" | "other"

export interface PatientDocument {
  id: string
  fileName: string
  docType: PatientDocType
  uploadedAt: string        // e.g. "05 Mar'26"
  uploadedBy: string        // e.g. "Dr. Sharma", "Patient", "Apollo Diagnostics"
  pageCount: number
  size: string              // e.g. "340 KB"
}

// ═══════════════ CHAT ATTACHMENT ═══════════════

export interface ChatAttachment {
  type: "pdf" | "image"
  fileName: string
  pageCount?: number
}

// ═══════════════ CHAT MESSAGE ═══════════════

export interface RxAgentChatMessage {
  id: string
  role: "assistant" | "user"
  text: string
  createdAt: string
  rxOutput?: RxAgentOutput
  attachment?: ChatAttachment
  feedbackGiven?: "up" | "down" | null
  /** Inline suggestion chips shown below the message text (e.g. guardrail redirects) */
  suggestions?: Array<{ label: string; message: string }>
}

// ═══════════════ INTENT CLASSIFICATION RESULT ═══════════════

export interface IntentResult {
  category: IntentCategory
  format: ResponseFormat
  confidence: number
}

// ═══════════════ REPLY BUILDER RESULT ═══════════════

export interface ReplyResult {
  text: string
  rxOutput?: RxAgentOutput
  followUpPills?: CannedPill[]
  /** Inline suggestion chips — rendered below message text as horizontal scrollable pills */
  suggestions?: Array<{ label: string; message: string }>
  /** Optional trust-building hint shown in the typing indicator while the reply is being prepared.
   *  Used by replyOverride flows that want a brief loading state (e.g. "Reading 3 specialty notes…"). */
  loadingHint?: string
  /** Delay before the reply commits, in ms. Used together with loadingHint to give the typing
   *  indicator time to communicate what's being retrieved. Defaults to 0 (immediate). */
  loadingDelayMs?: number
}
