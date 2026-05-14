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
  /** Care-type indicator surfaced as a coloured chip in the PatientSelector
   *  dropdown. Use:
   *    "IPD"       — patient has at least one inpatient visit_occurrence
   *                  (visit_concept_id = 9201) in their OMOP slice. Renders
   *                  as a red chip to flag the admission event.
   *    "IPD + OPD" — patient has BOTH inpatient and outpatient visits.
   *                  Renders as a red chip (the IPD signal is what matters).
   *    "OPD"       — pure outpatient. Default / unlabelled in the UI to
   *                  avoid chip noise on the majority case.
   *  When undefined the field is treated as "OPD" and no chip renders. */
  careType?: "OPD" | "IPD" | "IPD + OPD"
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
  // ── Velora v0 — three live intent cards (Stack 1 brief · Patient journey · Recent trends)
  | { kind: "velora_v0_mdt_brief"; data: VeloraV0MdtBriefData }
  | { kind: "velora_v0_patient_journey"; data: VeloraV0PatientJourneyData }
  | { kind: "velora_v0_trend_menu"; data: VeloraV0TrendMenuData }
  | { kind: "velora_v0_trend_detail"; data: VeloraV0TrendDetailData }

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
  /** *Why* Velora applied this specific guideline to THIS patient. The
   *  patient-specific trigger — the condition / lab value / medication
   *  combination in this patient's chart that activated this guideline.
   *  Surfaced as the "Why we picked this" block in the chip tooltip, so a
   *  doctor reading the chip knows the synthesis is anchored in their
   *  patient's actual data, not a generic citation. Example:
   *  "Patient is on Aspirin + Clopidogrel × 10 months post-CVA — ESC
   *  recommends DAPT de-escalation review beyond month 12." */
  whyPicked?: string
  /** What confidence level Velora attaches to this application. Surfaced as
   *  a small badge in the tooltip header. Helps the doctor calibrate trust
   *  before acting. */
  confidence?: "established" | "supportive" | "exploratory"
  /** Plain-English version of the body name for the layman/junior-doctor
   *  reader. Example: body="NCCN" → readableBody="National Comprehensive
   *  Cancer Network (US oncology guideline body)". Optional — when omitted,
   *  the tooltip just shows `body`. */
  readableBody?: string
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
  /** Trust-layer provenance line shown immediately under the specialty
   *  heading (e.g. "Based on 5 consultations · 30 Apr → 11 May · Dr Pandya").
   *  Tells the doctor exactly how many records this synthesis is grounded
   *  in, so they can challenge or verify before acting. */
  provenance?: string
  /** Anti-data-loss disclosure — surfaced as a small "Open loops on this
   *  specialty" block below the body. Each entry is one short sentence
   *  describing something captured upstream but NOT surfaced in this brief
   *  (e.g. "Investigations advised but no result row · CEA, PET-CT") or a
   *  guideline-anchored gap (e.g. "No oncology contact since 30 Sep 2025
   *  — surveillance overdue per NCCN Colon Ca v.2.2024 §SURV-2"). */
  openLoops?: string[]
  /** Compact label for the specialty heading trailing — describes the date
   *  span of visits with this team. Example: "8 May → 30 Sep '25". When
   *  present, renders in the header trailing INSTEAD of the legacy single
   *  date so the doctor sees the engagement window at a glance. */
  dateRangeLabel?: string
  /** Total consultation count with this team. Renders in the header trailing
   *  alongside the date range (e.g. "12 visits"). */
  consultationCount?: number
  /** Compact doctor-name label for the header trailing. For single-doctor
   *  specialties pass the full name ("Dr Pankaj Shah"); for multi-doctor
   *  use a join or summarised form ("Dr Pankaj Shah / Dr Mithun Shah"). */
  doctorsLabel?: string
  /** Per-consultation timeline shown in the specialty sidebar.
   *
   *  When the user clicks the chevron at the end of a specialty header, a
   *  side panel opens showing every consultation this team has had with the
   *  patient in date order. Each entry expands to reveal the full Rx for
   *  that visit (findings + medications + plan). When this array is missing
   *  or empty, the sidebar renders a "no per-consultation detail captured
   *  yet" empty state — the chevron still opens the panel so the doctor
   *  understands the affordance. */
  consultations?: VeloraV0Consultation[]
  /** Aggregate "lab results that matter for this team" — surfaced inline in
   *  the specialty card alongside Findings / Medications / Plan.
   *
   *  Selection policy (documented in `WHAT-IS-THE-CROSS-CONSULTATION-BRIEF.md`
   *  § Lab results):
   *    1. Default behaviour: every ABNORMAL lab whose interpretation falls
   *       inside this team's clinical scope renders here. ("Abnormal" =
   *       flag !== "normal", classified against the signed reference range.)
   *    2. Latest-value-wins: each parameter appears at most once; if it was
   *       drawn repeatedly the most recent reading is shown.
   *    3. Ordering: critical → high → low → moderate. Inside the same flag,
   *       newest first.
   *    4. Normal-panel rollup: if abnormal results came out of a CBC / KFT /
   *       LFT / lipid panel etc., the in-range parameters from the same panel
   *       are not listed individually — `hiddenNormalLabCount` carries the
   *       roll-up count, rendered as "+ N parameters within range".
   *
   *  When this array is empty the card omits the Lab results row entirely
   *  (no "no labs on file" filler) — the per-consultation expansion in the
   *  sidebar still shows any visit-level labs if they exist. */
  labResults?: VeloraV0LabResult[]
  /** Roll-up of normal-range parameters from the same panels the abnormal
   *  results above came from. Renders as a small caption beneath the labs
   *  list ("+ N parameters within range"). */
  hiddenNormalLabCount?: number
}

/** A single lab parameter result, with abnormality direction.
 *
 *  Surfaced both at the specialty-attribution level (aggregated "what abnormal
 *  labs has this team's work touched") and at the per-consultation level
 *  (what labs were drawn / reported AT this visit).
 *
 *  Policy for which labs surface in the brief:
 *    · Default = show ALL ABNORMAL results (flag !== "normal")
 *    · Normal lab results from the same panel are summarised as
 *      "+N other parameters within range" (rolled up via `hiddenNormalCount`
 *      on the parent panel — not on the LabResult itself).
 *    · Sorting precedence inside a list: critical → high/low → moderate.
 *    · One result per parameter even when repeated across visits; the latest
 *      reading wins. (Trend visualisation is a separate intent card.)
 *
 *  Wrapping a lab as "normal" is still allowed (e.g. a guideline-anchored
 *  panel that wants to confirm an in-range value is intentional) — the
 *  default renderer just filters them out unless `showNormal` is set on
 *  the parent panel. */
export interface VeloraV0LabResult {
  /** Display label, e.g. "HbA1c", "SGPT", "eGFR". */
  name: string
  /** Latest reading, formatted as a string (carries unit-free numeric token). */
  value: string
  /** Display unit, e.g. "%", "U/L", "mL/min/1.73 m²". */
  unit?: string
  /** Direction relative to the signed reference range. */
  flag: "high" | "low" | "critical" | "normal"
  /** Signed reference range / target, e.g. "<7.0", "13.0–17.0", "≥90". */
  refRange?: string
  /** Date the value was drawn — short form ("4 May '26"). */
  date?: string
  /** Optional one-line note explaining why this lab is here (e.g. cited
   *  guideline target, expected trajectory). Surfaces in an InfoTip. */
  note?: string
}

/** A discharge-summary payload attached to an IPD consultation. Renders the
 *  standard 7-block discharge structure in the sidebar expansion. Optional
 *  fields are omitted from the UI when empty. */
export interface VeloraV0DischargeSummary {
  /** "Admitted 12 Mar 2026 · Discharged 15 Mar 2026 · 3 days · Ward 4 / B-12". */
  admissionLine?: string
  /** "Acute Hepatitis A · Wilson's disease (newly confirmed)". */
  finalDiagnosis: string
  /** Free-text presenting complaints at admission. */
  presentingComplaints?: string
  /** Hospital-course narrative (~2-4 short sentences). */
  hospitalCourse: string
  /** "Stable, ambulating, tolerating oral feeds." */
  dischargeCondition?: string
  /** Examination at discharge — short bullet-prose ("Afebrile · HR 84 · BP 110/72 · No icterus"). */
  dischargeExam?: string
  /** Discharge advice (diet, restrictions, monitoring). */
  dischargeAdvice?: string[]
  /** "Recurrence of jaundice, persistent vomiting, fever > 100.4°F …". */
  warningSigns?: string[]
  /** Functional / nutritional assessment at discharge. */
  functionalAssessment?: string
}

/** One visit within a specialty's timeline. Surfaced in the specialty
 *  sidebar (opened by clicking the chevron on the specialty header).
 *
 *  Mirrors the standard Rx structure (the same pointers a doctor fills in
 *  the Rx pad: Symptoms → Examination → Diagnosis → Investigations →
 *  Medications → Advice → Follow-up). When a field is empty, that row
 *  simply doesn't render — no "n/a" filler. */
export interface VeloraV0Consultation {
  /** Display date for the consultation (e.g. "8 May 2025" or "24 Feb 2026"). */
  date: string
  /** Visit type — used for the chip on the timeline marker. "OPD" by default;
   *  "IPD" surfaces a red admission marker for inpatient stays. */
  visitType?: "OPD" | "IPD" | "ER"
  /** The treating doctor for this specific visit (may differ from the
   *  specialty's headline `doctorsLabel` for multi-doctor teams). */
  doctor: string
  /** One-line headline summarising what happened at this consultation —
   *  shown collapsed before the user expands the entry. */
  headline: string

  // ── Rich Rx fields (rendered as inline-labelled rows on expand) ──
  /** Symptoms recorded at this visit. */
  symptoms?: string
  /** Examination findings at this visit. */
  examination?: string
  /** Diagnosis / impression documented at this visit. */
  diagnosis?: string
  /** Investigations advised at this visit (free-text — orders, not results). */
  investigations?: string
  /** Medications prescribed AT this visit (not the cumulative ongoing list
   *  for the specialty). */
  medications?: string
  /** Advice given (diet, activity, monitoring). */
  advice?: string
  /** Follow-up date / instructions. */
  followUp?: string
  /** Surgical / procedural booking made at this visit. */
  surgery?: string
  /** Vaccinations administered or planned. */
  vaccinations?: string
  /** Any other free-text the doctor recorded that doesn't fit the standard
   *  Rx pointers (relevant medical-history additions, social context). */
  additionalNotes?: string
  /** Lab results either drawn at this visit or reported at this visit. The
   *  card renders abnormal results inline; normal-panel rollups are summarised
   *  via `hiddenNormalCount`. */
  labResults?: VeloraV0LabResult[]
  /** Count of normal-range parameters from panels that ran at this visit but
   *  weren't surfaced individually. Renders as "+ N other parameters within
   *  range" beneath the abnormal labs. */
  hiddenNormalCount?: number

  // ── Legacy combined fields — used by older mocks before the rich Rx
  //    fields shipped. Renderer falls back to these when the new fields are
  //    not populated. ──
  /** @deprecated Prefer `symptoms` + `examination` + `diagnosis`. */
  findings?: string
  /** @deprecated Prefer `followUp` + `investigations` + `advice` + `surgery`. */
  plan?: string

  // ── Discharge summary (IPD only) ──
  /** Set on `visitType === "IPD"` admissions. When present, the sidebar
   *  expansion renders the discharge-summary structure in addition to the
   *  Rx pointers above. */
  dischargeSummary?: VeloraV0DischargeSummary
}

/** One sub-section in the structured Section 1 · Medical history view.
 *
 *  `tone` drives the visual emphasis:
 *    primary  — the headline diagnosis (e.g. active cancer). Stronger label.
 *    neutral  — standard list (co-morbidities, surgical history).
 *    positive — explicit-negative verifications ("No known drug allergy").
 *               Rendered with a green ✓ to make the absence read as data,
 *               not a gap.
 *
 *  Each item carries an optional `sourceCount` — the number of OMOP rows
 *  backing the claim. Surfaced as a small caption ("5 rows") so the
 *  doctor can see the evidence strength inline. */
export interface VeloraV0MedicalHistoryGroup {
  title: string
  tone?: "primary" | "neutral" | "positive"
  items: Array<{
    text: string
    /** Legacy field — was rendered inline as "N rows" caption. No longer
     *  shown. Kept for back-compat; prefer group-level `sources` instead. */
    sourceCount?: number
    /** Legacy per-item tooltip text — no longer used by the card. Sources
     *  are now consolidated at the group level. */
    source?: string
    /** ISO date string (YYYY-MM-DD) the prescription / item was issued.
     *  For Active medications this drives the "is it still active" check
     *  along with `daysSupply` below. Omitted → the item is assumed
     *  always-active (back-compat with legacy mocks). */
    prescribedAt?: string
    /** Number of days the prescription covers from `prescribedAt`. Used
     *  by the Active-medications filter: an item is rendered only when
     *  `today` is within [prescribedAt, prescribedAt + daysSupply]. */
    daysSupply?: number
  }>
  /** Group-level source attribution — surfaces in a tooltip on the
   *  subheading info icon. Each entry is one OMOP-grounded consultation that
   *  contributed to this group. The doctor hovers the ⓘ to see exactly which
   *  visits feed the synthesis below it. */
  sources?: Array<{ doctor: string; date: string }>
  /** Group-level reasoning — surfaces beneath the sources list in the same
   *  tooltip. Tells the doctor *why* this group is in the medical history
   *  (e.g. "Six independent recordings confirm T3N2b stage IIIB colon Ca…"). */
  reasoning?: string
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

// ── Intent ① · Cross-consultation brief (a.k.a. "MDT brief" internally) ─
//
// User-facing label is "Cross-consultation brief". Internal identifiers
// (`velora_v0_mdt_brief`, `MDT_BRIEF_MOCK`, file names) intentionally keep
// the older `mdt` token — renaming them would balloon the diff with no
// user impact. Treat the two terms as synonyms for V0.
export interface VeloraV0MdtBriefData {
  patientName: string
  /** Legacy single-line meta. Still rendered as a fallback when the
   *  structured fields below are not supplied. */
  patientMeta: string
  /** Structured patient-context strip. When any of these are present the
   *  card renders a richer line: "{name} · F · 65 · +91 98765 54960 · 1093…".
   *  patientId is the canonical KG `person_id` (string, not numeric). */
  patientGender?: "M" | "F"
  patientAge?: string | number
  patientMobile?: string
  patientId?: string
  /** Top-of-card "Headlines" section: chronic conditions + concerning
   *  diagnoses surfaced once so per-specialty sections only describe what
   *  *that* team did about them. Pulled from drug-signature inference +
   *  free-text symptom strings when `:DIAGNOSED` edges are sparse.
   *  Flat-list legacy form; prefer the structured `medicalHistory` below. */
  chronicConditions?: string[]
  /** Structured "Section 1 · Medical history" — multiple grouped sub-sections
   *  (Active oncology, Co-morbidities, Surgical history, Allergies, Family /
   *  Social, etc.). When present, the card renders the grouped layout
   *  instead of the flat `chronicConditions` list. Designed for richer
   *  cases like Mr Suresh Patel (843373981236) where one flat list would
   *  bury the surgical history and allergy verifications. */
  medicalHistory?: VeloraV0MedicalHistoryGroup[]
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

/** One entry in the "Where they collide" warning panel. Multiple
 *  detectors can fire independently for a single patient — the card
 *  renders each as its own sub-section with a kind badge + headline +
 *  optional rich structure (clinical-concern · specialties involved ·
 *  shared ingredients · pending checklist) + cited guideline chip.
 *
 *  The optional rich fields below were added so a first-time reader
 *  can parse the collision without flipping back to the brief card.
 *  Older mocks that only carry `title` + `points[]` still render
 *  correctly — the renderer falls back to the bullet-only shape. */
export interface VeloraV0CollideEntry {
  kind: "ddi" | "coordination-gap"
  /** Short drug-pair / signal-pair headline (HighlightLine supported). */
  title: string
  /** Evidence trail — answers "WHERE did this conclusion come from?".
   *  Surfaced as a hover tooltip on the title so a sceptical doctor
   *  can trace the headline back to the OMOP rows that triggered it
   *  (e.g. "Pre-op signal comes from Onco-surgery 'Pre Op Profile
   *  Major (Cancer)' orders on 30 Apr + 4 May + the final pre-op
   *  review on 11 May 2026"). Different from `clinicalConcern`
   *  (which states the matter) and `rule.whyPicked` (which explains
   *  why the cited guideline applies). */
  titleEvidence?: string
  /** One-sentence plain-English statement of WHY this matters. Read
   *  first by a new clinician opening the patient cold — sits
   *  immediately under the title, before any structured detail. */
  clinicalConcern?: string
  /** Per-specialty contribution chips. Surfaces which teams are
   *  feeding into this collision and what each one prescribed /
   *  ordered. Renders as a labelled list with one row per specialty. */
  specialtiesInvolved?: Array<{
    /** Specialty name as it appears on the patient's brief
     *  (e.g. "Oncology", "Orthopaedics", "Neurology"). */
    specialty: string
    /** Date the contribution landed (e.g. "12 May 2026"). */
    date?: string
    /** Drugs / orders this specialty added. For combo drugs the
     *  brand carries `(ingredients...)` inline so the doctor sees
     *  what's actually being prescribed. */
    drugs?: string[]
    /** Free-text note about this specialty's piece of the collision
     *  ("Long-term hormonal + bone-protective regimen",
     *  "Post-op pain control"). */
    note?: string
  }>
  /** DDI-only — active ingredients that appear in more than one
   *  prescription across the specialties above. The doctor sees the
   *  ingredient-level overlap that brand names hide (e.g. Gabapentin
   *  inside both Bacgab + Gabapin NT, even though the brands differ). */
  sharedIngredients?: Array<{
    ingredient: string
    /** Where this ingredient shows up — one row per occurrence. */
    appearsIn: Array<{
      brand: string
      specialty: string
    }>
    /** What the cumulative effect is — one sentence, plain English. */
    effect: string
  }>
  /** Coordination-gap only — the pending items that close the chain
   *  (e.g. "Cardiology Echo", "Anaesthesia airway plan",
   *  "Nephro contrast protocol"). */
  pendingItems?: Array<{
    /** Owning specialty / team — surfaces who needs to act. */
    specialty: string
    /** What's pending. */
    action: string
    /** Optional context: when the trigger fired, what value tripped
     *  it (e.g. "27 Apr · Cardiology saw the patient with DOE grade
     *  III × 4-5 months; no Echo result yet"). */
    context?: string
  }>
  /** Bullet-style points shown under the title (HighlightLine supported).
   *  Legacy shape — kept so older mocks that don't carry the rich
   *  fields above still render. New collision entries should prefer
   *  the structured fields. */
  points: string[]
  /** Cited guideline body governing the rule. */
  rule: VeloraV0Guideline
}

// Retired intent payloads (Open loops · Active meds & safety · Why
// flagged today) — these cards were superseded by the three-intent
// surface (Cross-consultation brief · Patient journey · Recent
// trends). The data interfaces are removed; their card components and
// any code paths emitting them have also been pruned.

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

// `VeloraV0Trend` + `VeloraV0TrendsData` (legacy sparkline trend card)
// were retired in favour of the per-trend `VeloraV0TrendDetailData` +
// the menu card `VeloraV0TrendMenuData`. Both new types are defined
// further up alongside the rxOutput union.

// ═══════════════ VELORA V0 — TREND MENU (Recent trends entry card) ═══════════
//
// Card surfaced when the doctor asks "Show recent trends" / "Show recent
// vital trends" / "Show recent lab trends" — OR when the guardrail fires
// because they asked for a trend that's not on file for this patient.
// In both cases we show the patient's AVAILABLE trends as clickable
// chips, grouped vital vs lab, so the doctor lands on a real chart in
// one tap. The text body above can carry the guardrail "sorry…" line
// when applicable.

export interface VeloraV0TrendMenuChip {
  /** Stable id from `lib/velora/v0-trends.ts` (e.g. "bp", "hba1c"). */
  id: string
  /** Public-facing label rendered inside the chip. */
  label: string
  /** "vital" | "lab" — drives the chip's group + tint. */
  category: "vital" | "lab"
  /** Canonical question the chip fires when tapped (matches the
   *  trends handler's per-trend reply lookup). */
  question: string
  /** Tooltip / rationale shown on hover — verbatim from the
   *  registry's `rationale` field. */
  rationale: string
}

export interface VeloraV0TrendMenuData {
  patientName: string
  patientMeta: string
  /** Short one-line scope reason from the registry — e.g.
   *  "Right breast cancer on Letrozole + Denosumab · IHD · HTN ·
   *   CKD G3a · OSA — trends drawn from oncology, cardio, nephro
   *   and pulm guidelines." */
  scopeReason: string
  /** Chips to render, in the registry order. */
  chips: VeloraV0TrendMenuChip[]
  /** When true, the card is the guardrail reply (the doctor asked
   *  for an unavailable trend). The renderer surfaces a small
   *  banner above the chips so the doctor knows what went wrong. */
  guardrail?: { askedFor: string }
}

// ═══════════════ VELORA V0 — TREND DETAIL (single-trend card) ═════════════
//
// Card surfaced when the doctor taps a specific trend chip
// (e.g. "Vitamin D trend"). Replaces the prior plain-text trend reply
// with a structured, scannable card: header · series table · reference
// line · cited guideline footer. The clinical content stays verbatim
// from the OMOP `measurement` / `observation` rows for this patient —
// AI authorship is bounded to picking the trend.

export interface VeloraV0TrendSeriesPoint {
  /** Reading date, in display form ("12 May '26"). */
  date: string
  /** Reading value, in display form. Free-text so combo values fit
   *  ("138/82", "TC 4.6 · LDL 2.7 · HDL 1.1 · TG 1.6", "48 (G3a)"). */
  value: string
  /** Optional flag indicating whether the reading is in / out of
   *  target. Drives the dot colour beside the value. */
  flag?: "ok" | "warn" | "alert"
  /** Optional one-word interpretation rendered next to the value
   *  ("insufficient", "G3a", "high", "low", "severe"). */
  flagLabel?: string
}

export interface VeloraV0TrendDetailData {
  patientName: string
  patientMeta: string
  /** "Blood pressure" / "HbA1c" / "Vitamin D" — sentence-case label. */
  trendName: string
  /** Drives the icon + tint family (vital = violet, lab = emerald). */
  category: "vital" | "lab"
  /** Unit string rendered next to the trend name ("mmHg", "mmol/L",
   *  "ng/mL", "g/dL", "%", "mL/min/1.73 m²"). */
  unit?: string
  /** Series rendered as a structured table, newest first. */
  series: VeloraV0TrendSeriesPoint[]
  /** Reference / target line for the trend
   *  (e.g. "Target per WHO HEARTS 2023: < 140/90 mmHg"). Rendered
   *  beneath the series as a single-line caption. */
  targetLine?: string
  /** Guideline citation footer. */
  citation?: {
    body: string
    year?: string
    section?: string
  }
  /** Optional rationale ("why this trend was offered for this
   *  patient") — surfaces in a small "Why we picked this" caption. */
  whyOffered?: string
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
