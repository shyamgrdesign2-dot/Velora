"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Hospital, Flag, Diagram, ArrowRight2, ArrowSquareDown, ArrowSquareUp, CloseCircle, Calendar, Calendar2, Note1, ArrowDown2 } from "iconsax-reactjs"
import { Info } from "lucide-react"
import { FlagArrow } from "../../shared/FlagArrow"
import { CardShell } from "../CardShell"
import { SectionSummaryBar } from "../SectionSummaryBar"
import { GuidelineChip } from "./VeloraStack"
import { FloatingTooltip, HighlightLine, InfoTip, SourceInfoTip, shortDate } from "./highlight"
import { useVeloraViewMode } from "../../shell/VeloraViewModeContext"
import { TPMedicalIcon } from "@/components/tp-ui"
import { VisitSection } from "./visit-sections"
import type {
  VeloraV0MdtBriefData,
  VeloraV0Attribution,
  VeloraV0MedicalHistoryGroup,
  VeloraV0Synthesis,
  VeloraV0Consultation,
  VeloraV0LabResult,
  VeloraV0DischargeSummary,
} from "../../types"

/**
 * Cross-consultation brief — Intent ① (flagship). Two CardShells:
 *
 *   Card 1 · Cross-consultation brief   chronic-conditions headline +
 *                                       per-specialty Findings / Medications /
 *                                       Plan with a provenance line under each
 *                                       specialty heading.
 *   Card 2 · Clinical synthesis         cross-team interpretation panels.
 *
 * Internal identifiers still say "MDT" (file name, type names, intent key) —
 * the rename is user-visible only. See VeloraV0MdtBriefData JSDoc for why.
 *
 * Stack 2 section headings reuse the default gray SectionSummaryBar (same as
 * Stack 1) so the cards read as a single design family. Reference ranges /
 * targets that used to sit next to each value are now exposed as an InfoTip
 * next to the label; the value itself gets a FlagArrow when abnormal.
 */
function formatPatientLine(name: string, meta: string) {
  const trimmed = meta.split("·")[0]?.trim() ?? meta
  return `${name} (${trimmed})`
}

/**
 * Build the structured patient-context line for the card title strip:
 *
 *   "{name} (M, 60)"
 *
 * Standard medical notation — name with gender + age in parentheses. The
 * mobile number and the canonical patient ID live in the PatientSelector
 * bottom sheet (where the doctor picks the patient); surfacing them again
 * on every card crowds the header without adding clinical signal. Falls
 * back to the legacy `(meta)` parenthesised form when the structured
 * fields aren't supplied.
 */
function formatPatientStrip(data: {
  patientName: string
  patientMeta: string
  patientGender?: "M" | "F"
  patientAge?: string | number
  patientMobile?: string
  patientId?: string
}) {
  const inner: string[] = []
  if (data.patientGender) inner.push(data.patientGender)
  if (data.patientAge !== undefined && data.patientAge !== "") inner.push(String(data.patientAge))
  if (inner.length === 0) return formatPatientLine(data.patientName, data.patientMeta)
  return `${data.patientName} (${inner.join(", ")})`
}

/**
 * Normalise a multi-doctor label so every doctor's first + last name is
 * shown explicitly (no "+N" overflow), middle names stripped.
 *
 *   "Dr Dhara Girish Pandya"                → "Dr Dhara Pandya"
 *   "Dr Pankaj Shah / Dr Mithun Shah"       → "Dr Pankaj Shah / Dr Mithun Shah"
 *   "Dr Nahush Tahiliani / Dr Sandeep Jain" → "Dr Nahush Tahiliani / Dr Sandeep Jain"
 *
 * Doctors are joined with " / " in the input; middle-name trimming keeps
 * each name to two tokens (first + last) so multi-doctor specialties still
 * fit on the header row without collapsing to a "+N" count.
 */
function compactDoctorsLabel(raw: string): string {
  return raw
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => {
      // Tokens past "Dr " — keep first + last only.
      const m = name.match(/^(Dr\.?|Mr|Ms|Mrs)\s+(.+)$/i)
      if (!m) return name
      const tokens = m[2].split(/\s+/).filter(Boolean)
      if (tokens.length <= 2) return name
      // First + last; drop middle tokens.
      return `${m[1]} ${tokens[0]} ${tokens[tokens.length - 1]}`
    })
    .join(" / ")
}

/** Compute the unique doctor count for a specialty record. Falls back to 0
 *  when no per-visit consultations are present. */
function uniqueDoctorCount(rec: VeloraV0Attribution): number {
  const consultations = rec.consultations ?? []
  if (consultations.length === 0) return 0
  const set = new Set(consultations.map((c) => c.doctor.trim()).filter(Boolean))
  return set.size
}

/** Compose the meta caption that lives inside the specialty heading bar,
 *  to the right of the label. Format: "N doctors  ·  N visits  ·  range". */
function specialtyMetaSegments(rec: VeloraV0Attribution): string[] {
  const segments: string[] = []
  const docCount = uniqueDoctorCount(rec)
  if (docCount > 0) segments.push(`${docCount} doctor${docCount === 1 ? "" : "s"}`)
  const visitCount = typeof rec.consultationCount === "number" ? rec.consultationCount : null
  if (visitCount !== null) segments.push(`${visitCount} visit${visitCount === 1 ? "" : "s"}`)
  if (rec.dateRangeLabel) segments.push(rec.dateRangeLabel)
  return segments
}

/**
 * SpecialtyHeading — accordion-style replacement for the old
 * `SectionSummaryBar + SpecialtyContextBanner + open-sidebar-arrow`
 * combo. One clickable bar carries:
 *
 *   icon  ·  Specialty name  ·  N doctors | N visits | date range
 *                                            (sources ⓘ)  (chevron)
 *
 * Clicking the bar toggles the body inline (no sidebar). The trailing
 * slot keeps the source ⓘ as a separate hover target so audit
 * information stays addressable.
 */
function SpecialtyHeading({
  rec,
  expanded,
  onToggle,
}: {
  rec: VeloraV0Attribution
  expanded: boolean
  onToggle: () => void
}) {
  const meta = specialtyMetaSegments(rec)
  return (
    <div className="group/section-header sticky top-0 z-[3] mb-[4px] flex w-full min-w-0 shrink-0 items-center gap-1.5 rounded-[4px] bg-tp-slate-100/70 px-2 py-[5px] shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${rec.source.specialty} section`}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        <TPMedicalIcon
          name="medical-service"
          variant="bulk"
          size={18}
          color="var(--tp-slate-500, #64748B)"
          className="shrink-0"
        />
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-[8px] gap-y-[1px]">
          <span className="text-[14px] font-semibold leading-none text-tp-slate-700">
            {rec.source.specialty}
          </span>
          {meta.length > 0 && (
            <span className="text-[11.5px] leading-[1.35] text-tp-slate-400">
              <span>(</span>
              {meta.map((s, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="mx-[6px] text-tp-slate-300">|</span>}
                  <span>{s}</span>
                </React.Fragment>
              ))}
              <span>)</span>
            </span>
          )}
        </span>
      </button>
      <span className="flex shrink-0 items-center gap-[6px]">
        <SpecialtySectionTooltip rec={rec} />
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? "Collapse section" : "Expand section"}
          className="flex shrink-0 items-center rounded-[4px] p-[2px] text-tp-slate-500 transition-colors hover:bg-tp-slate-200/60 hover:text-tp-slate-700"
        >
          {expanded ? (
            <ArrowSquareUp size={18} variant="Linear" />
          ) : (
            <ArrowSquareDown size={18} variant="Linear" />
          )}
        </button>
      </span>
    </div>
  )
}

/** Small label+content paragraph used by both Rx expansion and the discharge
 *  summary blocks. Keeps the visual style uniform with the main specialty
 *  card body (inline-flow + chip label, no bullet dot). */
function RxRow({ label, content }: { label: string; content: string }) {
  return (
    <p className="text-[12.5px] leading-[1.55] text-tp-slate-700">
      <span className="mr-[6px] inline-flex items-center rounded-[4px] bg-tp-slate-100 px-[5px] py-[1px] align-[1px] text-[10px] font-semibold uppercase tracking-[0.04em] text-tp-slate-600">
        {label}
      </span>
      <HighlightLine text={content} />
    </p>
  )
}

/** Lab-results block inside a consultation expansion. Same policy as the
 *  specialty-card-level renderer (abnormal only by default), but rendered
 *  compactly so multiple visits fit in the sidebar. */
function ConsultationLabsRow({ labs, hiddenNormalCount }: { labs: VeloraV0LabResult[]; hiddenNormalCount?: number }) {
  const visible = sortLabs(labs.filter((l) => l.flag !== "normal"))
  if (visible.length === 0 && !hiddenNormalCount) return null
  return (
    <p className="text-[12.5px] leading-[1.55] text-tp-slate-700">
      <span className="mr-[6px] inline-flex items-center rounded-[4px] bg-tp-slate-100 px-[5px] py-[1px] align-[1px] text-[10px] font-semibold uppercase tracking-[0.04em] text-tp-slate-600">
        Lab results
      </span>
      {visible.map((lab, i) => (
        <React.Fragment key={`${lab.name}-${i}`}>
          {i > 0 && <span className="mx-[6px] text-tp-slate-300">|</span>}
          <LabChip lab={lab} />
        </React.Fragment>
      ))}
      {hiddenNormalCount && hiddenNormalCount > 0 ? (
        <span className="ml-[6px] text-[11.5px] text-tp-slate-500">
          + {hiddenNormalCount} other parameter{hiddenNormalCount === 1 ? "" : "s"} within range
        </span>
      ) : null}
    </p>
  )
}

/** Discharge-summary block — rendered only when an IPD consultation carries
 *  a `dischargeSummary` payload. Structured into the standard 7 sub-blocks
 *  (admission line, final dx, presenting complaints, hospital course,
 *  discharge condition / exam / advice / warning signs / functional). Each
 *  sub-block is omitted when empty. */
function DischargeSummaryBlock({ ds }: { ds: VeloraV0DischargeSummary }) {
  return (
    <div className="mt-[4px] flex flex-col gap-[7px] rounded-[8px] border border-tp-error-200/80 bg-tp-error-50/40 px-[10px] py-[9px]">
      <div className="flex items-center gap-[5px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-tp-error-700">
        <Flag size={11} variant="Bulk" />
        <span>Discharge summary</span>
      </div>
      {ds.admissionLine && (
        <p className="text-[11.5px] leading-[1.5] text-tp-slate-600">{ds.admissionLine}</p>
      )}
      <RxRow label="Final diagnosis" content={ds.finalDiagnosis} />
      {ds.presentingComplaints && <RxRow label="Presenting" content={ds.presentingComplaints} />}
      <RxRow label="Hospital course" content={ds.hospitalCourse} />
      {ds.dischargeCondition && <RxRow label="Condition" content={ds.dischargeCondition} />}
      {ds.dischargeExam && <RxRow label="Exam at discharge" content={ds.dischargeExam} />}
      {ds.dischargeAdvice && ds.dischargeAdvice.length > 0 && (
        <div>
          <span className="mr-[6px] inline-flex items-center rounded-[4px] bg-tp-slate-100 px-[5px] py-[1px] align-[1px] text-[10px] font-semibold uppercase tracking-[0.04em] text-tp-slate-600">
            Advice
          </span>
          <ul className="ml-[2px] mt-[3px] flex flex-col gap-[2px] pl-[8px] text-[12.5px] leading-[1.5] text-tp-slate-700">
            {ds.dischargeAdvice.map((a, i) => (
              <li key={i} className="flex gap-[6px]">
                <span className="mt-[7px] inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-tp-slate-400" />
                <span><HighlightLine text={a} /></span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {ds.warningSigns && ds.warningSigns.length > 0 && (
        <div>
          <span className="mr-[6px] inline-flex items-center rounded-[4px] bg-tp-error-100 px-[5px] py-[1px] align-[1px] text-[10px] font-semibold uppercase tracking-[0.04em] text-tp-error-700">
            Warning signs
          </span>
          <ul className="ml-[2px] mt-[3px] flex flex-col gap-[2px] pl-[8px] text-[12.5px] leading-[1.5] text-tp-slate-700">
            {ds.warningSigns.map((w, i) => (
              <li key={i} className="flex gap-[6px]">
                <span className="mt-[7px] inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-tp-error-400" />
                <span><HighlightLine text={w} /></span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {ds.functionalAssessment && <RxRow label="Functional" content={ds.functionalAssessment} />}
    </div>
  )
}

/** ConsultationExpansion — the body that appears when a sidebar timeline row
 *  is expanded. Renders every Rx field the consultation populated, plus any
 *  labs and (for IPD) the discharge summary. Mirrors the main specialty
 *  card's inline-chip rhythm so the doctor sees one consistent shape. */
function ConsultationExpansion({ consultation }: { consultation: VeloraV0Consultation }) {
  const c = consultation
  // Collect rows in canonical Rx order. Empty fields are skipped.
  const rows: Array<{ label: string; content: string }> = []
  if (c.symptoms) rows.push({ label: "Symptoms", content: c.symptoms })
  if (c.examination) rows.push({ label: "Examination", content: c.examination })
  if (c.diagnosis) rows.push({ label: "Diagnosis", content: c.diagnosis })
  if (c.investigations) rows.push({ label: "Investigations", content: c.investigations })
  if (c.medications) rows.push({ label: "Medications", content: c.medications })
  if (c.advice) rows.push({ label: "Advice", content: c.advice })
  if (c.followUp) rows.push({ label: "Follow-up", content: c.followUp })
  if (c.surgery) rows.push({ label: "Surgery", content: c.surgery })
  if (c.vaccinations) rows.push({ label: "Vaccinations", content: c.vaccinations })
  if (c.additionalNotes) rows.push({ label: "Additional notes", content: c.additionalNotes })
  // Legacy fallbacks — render only if no rich Rx fields populated.
  if (rows.length === 0 && c.findings) rows.push({ label: "Findings", content: c.findings })
  if (rows.length === 0 && c.plan) rows.push({ label: "Plan", content: c.plan })

  const hasLabs = !!(c.labResults && c.labResults.length > 0) || !!c.hiddenNormalCount
  const hasDischarge = !!c.dischargeSummary
  const isEmpty = rows.length === 0 && !hasLabs && !hasDischarge

  return (
    <div className="mb-[6px] ml-[2px] mt-[2px] flex flex-col gap-[6px] rounded-[8px] border border-tp-slate-200 bg-tp-slate-50/60 px-[12px] py-[10px]">
      {rows.map((r, i) => (
        <RxRow key={i} label={r.label} content={r.content} />
      ))}
      {hasLabs && (
        <ConsultationLabsRow labs={c.labResults ?? []} hiddenNormalCount={c.hiddenNormalCount} />
      )}
      {hasDischarge && <DischargeSummaryBlock ds={c.dischargeSummary!} />}
      {isEmpty && (
        <p className="text-[12px] italic leading-[1.5] text-tp-slate-500">
          No further detail captured for this visit.
        </p>
      )}
    </div>
  )
}

/**
 * SpecialtySidebar — slide-in panel showing a specialty's full consultation
 * timeline. Each entry can expand to reveal the full Rx for that visit
 * (findings + medications + plan).
 *
 * Renders through a portal so it floats above the chat surface.
 */
function SpecialtySidebar({
  open,
  rec,
  patientLabel,
  onClose,
  initialExpandedIdx,
}: {
  open: boolean
  rec: VeloraV0Attribution | null
  patientLabel: string
  onClose: () => void
  /** When the sidebar opens via "View other details" on a specific
   *  visit, we auto-expand that visit so the doctor lands directly
   *  on the right consultation rather than the collapsed list. */
  initialExpandedIdx?: number
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!open) setExpandedIdx(null)
    else if (typeof initialExpandedIdx === "number") setExpandedIdx(initialExpandedIdx)
  }, [open, initialExpandedIdx])
  if (!mounted || !open || !rec) return null

  const consultations = rec.consultations ?? []
  const isEmpty = consultations.length === 0
  const subtitleSegments: string[] = []
  if (rec.dateRangeLabel) subtitleSegments.push(rec.dateRangeLabel)
  if (typeof rec.consultationCount === "number") subtitleSegments.push(`${rec.consultationCount} visit${rec.consultationCount === 1 ? "" : "s"}`)
  if (rec.doctorsLabel) subtitleSegments.push(rec.doctorsLabel)

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex" aria-modal="true" role="dialog">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/45 transition-opacity" onClick={onClose} />
      {/* Panel — slides in from the right */}
      <div className="relative ml-auto flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-[12px] border-b border-tp-slate-100 px-[18px] py-[14px]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-[6px] text-[11px] font-semibold uppercase tracking-[0.06em] text-tp-slate-500">
              <Calendar size={12} variant="Bulk" />
              <span>{patientLabel}</span>
            </div>
            <div className="mt-[2px] text-[16px] font-semibold text-tp-slate-900">
              {rec.source.specialty}
            </div>
            {subtitleSegments.length > 0 && (
              <div className="mt-[1px] text-[12px] text-tp-slate-500">{subtitleSegments.join(" · ")}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-tp-slate-400 hover:text-tp-slate-700"
            aria-label="Close timeline"
          >
            <CloseCircle size={22} variant="Linear" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-[18px] py-[14px]">
          {isEmpty ? (
            <div className="rounded-[8px] border border-tp-slate-200 bg-tp-slate-50/70 px-[12px] py-[14px] text-[13px] leading-[1.5] text-tp-slate-600">
              <strong className="font-semibold text-tp-slate-800">No per-consultation detail captured yet.</strong>
              <br />
              The card above shows the aggregate picture for this team. Per-visit
              breakdown (findings · medications prescribed · plan) lands here
              once the data pipeline surfaces it.
            </div>
          ) : (
            <ol className="relative ml-[6px] flex flex-col gap-[4px] border-l border-tp-slate-200 pl-[14px]">
              {consultations.map((c, i) => {
                const isExpanded = expandedIdx === i
                const isIpd = c.visitType === "IPD"
                return (
                  <li key={i} className="relative">
                    {/* Timeline dot — IPD gets red, otherwise slate */}
                    <span
                      className={`absolute -left-[20px] top-[10px] inline-block h-[10px] w-[10px] rounded-full ring-[3px] ring-white ${isIpd ? "bg-tp-error-500" : "bg-tp-slate-400"}`}
                    />
                    <button
                      type="button"
                      onClick={() => setExpandedIdx(isExpanded ? null : i)}
                      className="flex w-full flex-col items-start rounded-[8px] px-[10px] py-[8px] text-left transition-colors hover:bg-tp-slate-50"
                    >
                      <div className="flex w-full items-center gap-[6px]">
                        <span className="text-[12px] font-semibold text-tp-slate-700">{c.date}</span>
                        {isIpd && (
                          <span className="rounded-[3px] bg-tp-error-50 px-[5px] py-[1px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-tp-error-700">
                            IPD
                          </span>
                        )}
                        <span className="text-[11.5px] text-tp-slate-500">· {c.doctor}</span>
                        <span className="ml-auto text-tp-slate-500">
                          {/* Bold variant of ArrowRight2 + larger size gives the
                              chevron a chunkier stroke so the affordance is
                              obvious; slate-500 over slate-400 keeps it visible
                              against the row hover state. */}
                          <ArrowRight2
                            size={16}
                            variant="Bold"
                            style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 150ms ease" }}
                          />
                        </span>
                      </div>
                      <div className="mt-[2px] text-[13px] leading-[1.45] text-tp-slate-800">
                        <HighlightLine text={c.headline} />
                      </div>
                    </button>
                    {isExpanded && (
                      <ConsultationExpansion consultation={c} />
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * GroupSourceTip — info icon used on each medical-history subheading tag.
 *
 * Hover reveals a portal-rendered tooltip with two sections:
 *   · Sources: one row per OMOP consultation that contributed (doctor + date)
 *   · Why this matters: short reasoning sentence explaining *why* this group
 *     is in the medical history at all
 *
 * Replaces the original per-item "N rows" caption pattern with a single
 * group-level audit trail. Same trust contract, far less visual noise.
 */
/**
 * MedicalHistorySubheadingTag — inline tag with hover-anywhere tooltip.
 *
 * Single chip that renders inline with the content that follows it (no
 * separate row / column / bullet dot). The entire chip is the hover trigger,
 * not just the info icon — the user doesn't have to aim at a tiny target.
 *
 * Tone palette:
 *   primary  → red    (the headline diagnosis driving everything else)
 *   neutral  → slate  (co-morbidities, surgical history, generic groups)
 *   positive → violet (allergy verifications + family/social — absence-as-data)
 *
 * Tooltip contents — sources list + reasoning sentence — render through a
 * FloatingTooltip portal so they escape any clipping ancestor.
 */
/**
 * isMedicationActive — single source of truth for "is this drug still
 * being taken by the patient on the date the doctor is viewing the
 * card?".
 *
 * Inputs the function expects on each medical-history item (populated
 * by the OMOP generator from `drug_exposure_start_date` +
 * `days_supply`):
 *
 *   prescribedAt  — ISO date the prescription was issued.
 *   daysSupply    — number of days the prescription covers from that
 *                   date.
 *
 * Decision rule:
 *   • Both fields missing  → assume active (legacy mocks; conservative
 *     fallback so we never hide a drug we just don't have metadata
 *     for).
 *   • Only prescribedAt set → active while `today ≥ prescribedAt`. No
 *     end date means "open-ended" until cancelled.
 *   • Both set             → active iff `prescribedAt ≤ today ≤
 *     prescribedAt + daysSupply`.
 *
 * The `today` argument is injected so test code can pin the date.
 * Production calls pass `new Date()` from the render path.
 */
function isMedicationActive(
  item: { prescribedAt?: string; daysSupply?: number },
  today: Date = new Date(),
): boolean {
  if (!item.prescribedAt) return true
  const start = Date.parse(item.prescribedAt)
  if (Number.isNaN(start)) return true
  const t = today.getTime()
  if (t < start) return false
  if (item.daysSupply === undefined) return true
  const end = start + item.daysSupply * 24 * 60 * 60 * 1000
  return t <= end
}

/** Filter a Medical-history group's items down to the "still active"
 *  subset using the rule above. Applied only when the group is the
 *  Active-medications group; every other group renders unfiltered. */
function filterActiveMedicationItems<T extends { prescribedAt?: string; daysSupply?: number }>(
  items: T[],
  today: Date = new Date(),
): T[] {
  return items.filter((i) => isMedicationActive(i, today))
}

/** Pick a TPMedicalIcon token for a medical-history group chip, based on
 *  the group's title text. Returns null when no sensible icon maps — the
 *  chip then renders without an icon, no failure. */
function iconForHistoryGroup(title: string): string | null {
  const t = title.toLowerCase()
  if (t.includes("co-morbid") || t.includes("comorbid")) return "Diagnosis"
  if (t.includes("primary")) return "Diagnosis"
  if (t.includes("surgical")) return "medical-service"
  if (t.includes("allerg")) return "health care"
  if (t.includes("medication") || t.includes("active med")) return "Tablets"
  if (t.includes("family") || t.includes("social")) return "medical-record"
  if (t.includes("additional")) return "medical-report"
  return null
}

function MedicalHistorySubheadingTag({
  group,
}: {
  group: VeloraV0MedicalHistoryGroup
}) {
  // Tooltip removed — sources + reasoning now consolidate into a single
  // MedicalHistorySectionTooltip on the section heading above, so the
  // body chips stay clean. Tone palette preserved.
  const tone = group.tone ?? "neutral"
  // Inner section chips (Co-morbidities, Surgical history, Allergies,
  // Active medications, Family / Social, Additional history) sit on
  // a soft violet palette so they read as the inner-content accent
  // (parent Medical-history bar stays neutral slate). Only the
  // chief-diagnosis chip (`primary` tone) keeps its red accent.
  const toneClass =
    tone === "primary"
      ? "bg-tp-error-50 text-tp-error-700"
      : "bg-tp-violet-50 text-tp-violet-700"
  const iconName = iconForHistoryGroup(group.title)
  return (
    <span
      className={`mr-[6px] inline-flex shrink-0 items-center gap-[6px] rounded-[5px] px-[8px] py-[3.5px] text-[13px] font-semibold leading-[1.35] ${toneClass}`}
    >
      {iconName && (
        <TPMedicalIcon name={iconName} variant="bulk" size={14} color="currentColor" className="shrink-0 opacity-80" />
      )}
      <span>{group.title}</span>
    </span>
  )
}

/**
 * MedicalHistorySectionTooltip — single ⓘ trigger in the Medical-history
 * SectionSummaryBar's trailing slot. Aggregates Sources + reasoning across
 * every group into one tooltip, so the doctor sees the audit trail once
 * for the whole section instead of one tooltip per chip below.
 */
function MedicalHistorySectionTooltip({
  groups,
}: {
  groups: VeloraV0MedicalHistoryGroup[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const hasAny = groups.some(
    (g) => (g.sources && g.sources.length > 0) || !!g.reasoning,
  )
  if (!hasAny) return null
  return (
    <>
      <span
        ref={ref}
        className="inline-flex cursor-help items-center text-tp-slate-500 hover:text-tp-slate-700"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        aria-label="Sources for medical history"
      >
        <Info size={14} strokeWidth={1.75} />
      </span>
      <FloatingTooltip
        open={open}
        triggerRef={ref}
        placement="top-right"
        width={340}
        className="rounded-[6px] bg-tp-slate-800 px-[12px] py-[10px] text-left text-[11px] font-normal leading-[1.5] text-white shadow-xl"
      >
        <span className="block font-semibold uppercase tracking-[0.06em] text-tp-slate-400">
          Where this comes from
        </span>
        {/* Scrollable source list — every contributing visit is listed in
            full. When the combined block exceeds ~280 px the inner div
            scrolls; the tooltip outer height stays bounded so it never
            grows off-screen. */}
        <span
          className="mt-[6px] block max-h-[280px] overflow-y-auto pr-[4px]"
          style={{ scrollbarColor: "#64748B transparent", scrollbarWidth: "thin" }}
        >
          {groups.map((g, gi) => {
            const sourceCount = g.sources?.length ?? 0
            if (sourceCount === 0 && !g.reasoning) return null
            return (
              <span
                key={gi}
                className={`block ${gi > 0 ? "mt-[8px] border-t border-tp-slate-700 pt-[8px]" : ""}`}
              >
                <span className="block font-semibold text-white">{g.title}</span>
                {sourceCount > 0 && (
                  <span className="mt-[2px] block text-tp-slate-300">
                    {g.sources!.map((s, i) => (
                      <span key={i} className="block">
                        • {s.doctor} · {s.date}
                      </span>
                    ))}
                  </span>
                )}
                {g.reasoning && (
                  <span className="mt-[3px] block italic text-tp-slate-300">
                    {g.reasoning}
                  </span>
                )}
              </span>
            )
          })}
        </span>
      </FloatingTooltip>
    </>
  )
}

/**
 * SpecialtySectionTooltip — info-icon trigger on each specialty's section
 * heading. Lists the visits Velora drew this section's synthesis from
 * (doctor + date for each consultation), plus the team's window-level
 * `reason` sentence when set. Drives the same trust contract as the
 * Medical-history one: every section's data is auditable inline.
 */
function SpecialtySectionTooltip({ rec }: { rec: VeloraV0Attribution }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const consultations = rec.consultations ?? []
  const totalVisits =
    typeof rec.consultationCount === "number" ? rec.consultationCount : consultations.length
  if (consultations.length === 0 && !rec.reason) return null
  // Show ALL contributing visits — never truncate. Long lists scroll
  // inside the tooltip via overflow-y-auto on the inner container.
  const visible = consultations
  const overflow = totalVisits - visible.length
  return (
    <>
      <span
        ref={ref}
        className="inline-flex cursor-help items-center text-tp-slate-500 hover:text-tp-slate-700"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        aria-label={`Sources for ${rec.source.specialty}`}
      >
        <Info size={14} strokeWidth={1.75} />
      </span>
      <FloatingTooltip
        open={open}
        triggerRef={ref}
        placement="top-right"
        width={320}
        className="rounded-[6px] bg-tp-slate-800 px-[12px] py-[10px] text-left text-[11px] font-normal leading-[1.5] text-white shadow-xl"
      >
        <span className="block font-semibold uppercase tracking-[0.06em] text-tp-slate-400">
          Where this comes from
        </span>
        <span className="mt-[2px] block font-semibold text-white">
          {rec.source.specialty} · {totalVisits} visit{totalVisits === 1 ? "" : "s"}
        </span>
        {visible.length > 0 && (
          // Scrollable source list — full list, no truncation. Caps the
          // visual height around 220 px so the tooltip never grows
          // off-screen on a long timeline.
          <span
            className="mt-[6px] block max-h-[220px] overflow-y-auto pr-[4px] text-tp-slate-300"
            style={{ scrollbarColor: "#64748B transparent", scrollbarWidth: "thin" }}
          >
            {visible.map((c, i) => (
              <span key={i} className="block">
                • {c.doctor} · {c.date}
              </span>
            ))}
            {overflow > 0 && (
              <span className="block text-tp-slate-400">
                + {overflow} more visit{overflow === 1 ? "" : "s"} (not detailed yet)
              </span>
            )}
          </span>
        )}
        {rec.reason && (
          <span className="mt-[6px] block border-t border-tp-slate-700 pt-[6px] italic text-tp-slate-300">
            {rec.reason}
          </span>
        )}
      </FloatingTooltip>
    </>
  )
}

/** Sort lab results in display order: critical → high → low → moderate-other,
 *  then newest first by date when dates are present (string comparison is fine
 *  because dates render in fixed short form). */
function sortLabs(labs: VeloraV0LabResult[]): VeloraV0LabResult[] {
  const flagRank: Record<VeloraV0LabResult["flag"], number> = {
    critical: 0,
    high: 1,
    low: 2,
    normal: 3,
  }
  return [...labs].sort((a, b) => {
    const r = flagRank[a.flag] - flagRank[b.flag]
    if (r !== 0) return r
    if (a.date && b.date && a.date !== b.date) return a.date < b.date ? 1 : -1
    return 0
  })
}

/** One lab result chip — name (with optional info tooltip), value with
 *  FlagArrow, unit and optional date suffix. Renders inline so multiple labs
 *  flow as comma-separated chips across the row. */
function LabChip({ lab }: { lab: VeloraV0LabResult }) {
  const isAbnormal = lab.flag !== "normal"
  const valueClass = isAbnormal ? "text-tp-error-600" : "text-tp-slate-700"
  const arrowFlag: "high" | "low" | "critical" | null =
    lab.flag === "high" || lab.flag === "critical" || lab.flag === "low" ? lab.flag : null
  // Compose the tooltip text: refRange + any note. Keep it terse.
  const tipBits: string[] = []
  if (lab.refRange) tipBits.push(`Ref: ${lab.refRange}`)
  if (lab.note) tipBits.push(lab.note)
  const tip = tipBits.join(" · ")
  return (
    <span className="inline-flex items-baseline gap-[3px] whitespace-nowrap">
      <span className="font-medium text-tp-slate-600">{lab.name}</span>
      {tip && <InfoTip text={tip} />}
      <span className="mr-[2px] text-tp-slate-300">:</span>
      <span className={`inline-flex items-baseline gap-[2px] font-semibold ${valueClass}`}>
        {arrowFlag && <FlagArrow flag={arrowFlag} />}
        <span>
          {lab.value}
          {lab.unit ? ` ${lab.unit}` : ""}
        </span>
      </span>
      {lab.date && <span className="ml-[2px] text-[11px] text-tp-slate-400">({shortDate(lab.date)})</span>}
    </span>
  )
}

/** Renders the "Lab results" row inside a specialty card body. Matches the
 *  Findings / Medications / Plan layout (inline label chip + flowing content)
 *  so the four pointers read as one consistent family.
 *
 *  Policy reminder (kept inline so the renderer is self-documenting): we
 *  surface every ABNORMAL lab the specialty's work touches. Normal-range
 *  parameters from the same panel are rolled up via `hiddenNormalCount` and
 *  rendered as "+ N within range" so the doctor knows the panel was complete. */
function LabResultsBlock({
  labs,
  hiddenNormalCount,
}: {
  labs: VeloraV0LabResult[]
  hiddenNormalCount?: number
}) {
  const visible = sortLabs(labs.filter((l) => l.flag !== "normal"))
  if (visible.length === 0 && !hiddenNormalCount) return null
  return (
    <p className="min-w-0">
      <span className="mr-[6px] inline-flex items-center rounded-[4px] bg-tp-slate-100 px-[5px] py-[1px] align-[1px] text-[10.5px] font-semibold uppercase tracking-[0.04em] text-tp-slate-600">
        Lab results
      </span>
      {visible.map((lab, i) => (
        <React.Fragment key={`${lab.name}-${i}`}>
          {i > 0 && <span className="mx-[6px] text-tp-slate-300">|</span>}
          <LabChip lab={lab} />
        </React.Fragment>
      ))}
      {hiddenNormalCount && hiddenNormalCount > 0 ? (
        <span className="ml-[6px] text-[11.5px] text-tp-slate-500">
          + {hiddenNormalCount} other parameter{hiddenNormalCount === 1 ? "" : "s"} within range
        </span>
      ) : null}
    </p>
  )
}

/** Synthesis bullet — Label : value, consistent with the Stack 1 bullets.
 *
 *  Reference ranges / guideline targets are NOT rendered inline. They live on
 *  the row's `ref` field (used as the InfoTip tooltip text) so a doctor who
 *  wants the target can hover the ⓘ next to the label. The visual stays clean;
 *  the FlagArrow + colour already communicate "abnormal per internal range". */
function SynthesisBullet({ row }: { row: VeloraV0Synthesis["rows"][number] }) {
  const valueClass =
    row.tone === "alert"
      ? "text-tp-error-600"
      : row.tone === "warn"
        ? "text-tp-warning-700"
        : "text-tp-slate-900"
  return (
    <li className="flex gap-[6px] text-[14px] leading-[1.55] text-tp-slate-700">
      <span className="mt-[8px] inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-tp-slate-400" />
      <span className="flex flex-wrap items-baseline gap-x-[6px] gap-y-[1px]">
        <span className="flex items-center gap-[4px]">
          <span className="font-medium text-tp-slate-500">{row.label}</span>
          {row.ref && <InfoTip text={row.ref} />}
          <span className="mr-[2px] text-tp-slate-300">:</span>
        </span>
        <span className={`inline-flex items-baseline gap-[3px] font-semibold ${valueClass}`}>
          {(row.tone === "alert" || row.tone === "warn") && <FlagArrow flag="high" />}
          <span>{row.value}</span>
        </span>
      </span>
    </li>
  )
}

/** Visit-major Detailed-view renderer for one specialty.
 *
 *  Renders each consultation as its own self-contained block on a
 *  vertical timeline, so a doctor reading the specialty sees:
 *
 *    Dr Doctor A · 12 May 2026 · [IPD?]
 *      Findings:        {diagnosis verbatim}
 *      Medications:     {drug list verbatim}
 *      Plan
 *        Follow-up:        {date / text}
 *        Investigations:   {text}
 *        Advice:           {text}
 *        Planned surgery:  {text}
 *        Additional notes: {text}
 *
 *    Dr Doctor B · 12 May 2026
 *      Findings: ...
 *      (no medications)
 *      (no plan)
 *
 *  Sub-rows for a visit only render when the doctor actually wrote
 *  that field — empty cells are skipped, not back-filled with blanks.
 *  Each visit block is separated by a hairline divider so the eye reads
 *  the specialty as a chronological list of consultations.
 */
// `VisitSection` (and the related VisitBulletList / VisitInlineList /
// VisitSectionBar helpers) now live in ./visit-sections.tsx so the
// patient-journey card can reuse the exact same shape for any Rx body
// it surfaces. Doctors see one unified pattern for "what the doctor
// wrote inside" regardless of which card the visit appears on.

/** One per-visit card. Header strip shows doctor + specialty pill on the
 *  left and a date pill on the right; the body — full set of VisitSection
 *  blocks (Symptoms · Examination · Diagnosis · Medications · Advice ·
 *  Follow Up · Additional Notes) — is ALWAYS visible. Expand/collapse is
 *  controlled at the specialty level only (per design call), so opening
 *  a specialty automatically reveals every doctor's verbatim Rx inside
 *  it; the user never has to click each visit row individually.
 *
 *  The visit header is sticky inside the scroll container too — it sits
 *  just under the parent specialty heading so the doctor always sees
 *  which visit they are scrolling through. */
function VisitCard({
  consultation: c,
  specialtyLabel,
  onOpenInSidebar,
}: {
  consultation: VeloraV0Consultation
  specialtyLabel: string
  onOpenInSidebar?: () => void
}) {
  const findings = c.diagnosis ?? c.findings
  const hasAnyData =
    !!findings || !!c.medications || !!c.symptoms || !!c.examination ||
    !!c.followUp || !!c.investigations || !!c.advice || !!c.surgery ||
    !!c.vaccinations || !!c.additionalNotes
  return (
    <div
      // Cyclic gradient border — strong violet at top and bottom,
      // faded through the middle. Same trick CardShell uses: a
      // transparent 1-px border filled by a vertical gradient via
      // `background-image` + `background-clip: padding-box, border-box`.
      // The inner fill is plain white (no body wash) — only the
      // header strip below carries violet tint.
      // No box-shadow (system rule: shadows are not used).
      className="rounded-[12px]"
      style={{
        border: "1px solid transparent",
        backgroundImage:
          "linear-gradient(#FFFFFF, #FFFFFF), linear-gradient(180deg, rgba(124,58,237,0.35) 0%, rgba(124,58,237,0.05) 50%, rgba(124,58,237,0.35) 100%)",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
      }}
    >
      {/* Header strip — informational only (no toggle). Doctor (semibold,
          violet to flag clinical attribution) on the left, a highlighted
          violet date pill next to the name. Sticky so it hovers under
          the specialty heading while the user scrolls through this visit's
          body.
          NOTE: the outer wrapper is NOT `overflow-hidden` — sticky
          positioning silently breaks when an ancestor clips overflow, so
          the header would scroll away with the rest of the card. The
          solid violet-50 sticky background ensures content scrolling
          behind it is cleanly masked. */}
      <div className="group/visit sticky top-[38px] z-[2] flex w-full items-center justify-between gap-[8px] rounded-t-[12px] bg-tp-violet-50 px-[12px] py-[8px]">
        <div className="flex min-w-0 flex-wrap items-center gap-x-[8px] gap-y-[3px]">
          <span className="text-[13.5px] font-semibold text-tp-violet-700">{c.doctor}</span>
          {/* Date pill — highlighted violet chip placed right next to the
              doctor's name (instead of floating at the far right). Same-
              tone family as the doctor's name + the card's body gradient,
              just dialled up enough to pop as a clear "visit date" anchor. */}
          <span className="inline-flex shrink-0 items-center gap-[4px] rounded-[6px] bg-tp-violet-100 px-[8px] py-[2px] text-[11px] font-semibold text-tp-violet-700">
            <Calendar2 size={11} variant="Bulk" className="opacity-80" />
            {c.date}
          </span>
          {/* Specialty pill removed — the parent specialty heading
              already names the team, so repeating it on every visit
              row read as visual noise. */}
          {c.visitType === "IPD" && (
            <span className="rounded-[3px] bg-tp-error-50 px-[5px] py-[1px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-tp-error-700">
              IPD
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-[2px] py-[4px]">
        <VisitSection iconName="Virus" label="Symptoms" content={c.symptoms} />
        <VisitSection iconName="medical-service" label="Examination" content={c.examination} />
        <VisitSection iconName="Diagnosis" label="Diagnosis" content={findings} />
        <VisitSection iconName="Tablets" label="Medications" content={c.medications} layout="inline" />
        <VisitSection iconName="health care" label="Advice" content={c.advice} />
        <VisitSection
          iconNode={<Calendar2 size={16} variant="Bulk" color="var(--tp-slate-500, #64748B)" className="shrink-0" />}
          label="Follow Up"
          content={c.followUp}
        />
        <VisitSection iconName="medical book" label="Investigations" content={c.investigations} />
        <VisitSection iconName="medical-service" label="Planned surgery" content={c.surgery} />
        <VisitSection iconName="medical-record" label="Vaccinations" content={c.vaccinations} layout="inline" />
        <VisitSection
          iconNode={<Note1 size={16} variant="Bulk" color="var(--tp-slate-500, #64748B)" className="shrink-0" />}
          label="Follow Up Notes"
          content={c.additionalNotes}
        />
        {/* Empty visit — surface a polite placeholder + sidebar link.
            The header above stays visible so the visit doesn't read as
            missing. */}
        {!hasAnyData && (
          <div className="px-[12px] py-[8px]">
            <p className="min-w-0 text-[12.5px] italic text-tp-slate-500">
              No findings, medications or plan recorded for this Rx.{" "}
              {onOpenInSidebar && (
                <button
                  type="button"
                  onClick={onOpenInSidebar}
                  className="text-tp-violet-600 underline-offset-2 hover:underline focus:outline-none focus:underline"
                >
                  View other details
                </button>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailedSpecialtyBody({
  rec,
  onOpenVisit,
}: {
  rec: VeloraV0Attribution
  /** Open the specialty sidebar with a specific visit auto-expanded.
   *  Powers the "View other details" link on empty visit blocks. */
  onOpenVisit?: (visitIdx: number) => void
}) {
  const consultations = rec.consultations ?? []
  // When there are no per-visit consultations, fall back to a minimal
  // verbatim render from the team-level `lines` array.
  if (consultations.length === 0) {
    return (
      <div className="flex flex-col gap-[8px] pl-[8px] text-[13.5px] leading-[1.55] text-tp-slate-700">
        {rec.lines.map((line, i) => (
          <p key={i} className="min-w-0">
            <HighlightLine text={line} />
          </p>
        ))}
      </div>
    )
  }

  const specialtyLabel = rec.source.specialty.split("·")[0].trim()

  // Vertical timeline rail — soft violet line down the left edge of
  // the visit stack so the consultations read as points along the
  // patient's chronology. Each visit's marker is a violet-500 dot
  // wrapped in a softer violet-100 halo (achieved through a 3px ring)
  // so the marker reads as a "target" against the rail. IPD visits
  // swap the violet palette for red to keep the existing critical
  // signal.
  return (
    <div className="relative pl-[22px]">
      <span
        aria-hidden="true"
        className="absolute left-[8px] top-[14px] bottom-[14px] w-px bg-tp-violet-200"
      />
      <div className="flex flex-col gap-[10px]">
        {consultations.map((c, ci) => (
          <div key={ci} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[18px] top-[16px] inline-block h-[8px] w-[8px] rounded-full ring-[3px] ${c.visitType === "IPD" ? "bg-tp-error-500 ring-tp-error-100" : "bg-tp-violet-500 ring-tp-violet-100"}`}
            />
            <VisitCard
              consultation={c}
              specialtyLabel={specialtyLabel}
              onOpenInSidebar={onOpenVisit ? () => onOpenVisit(ci) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * BriefFilterBar — two multi-select dropdowns that ride along the
 * Cross-consultation brief's CardShell header (right side, before the
 * chevron). Each chip opens a popover with checkbox options so the
 * doctor can pick any subset of specialties / doctors. An empty
 * selection is treated as "all" — same no-op default the row had
 * before the multi-select upgrade.
 *
 * Specialty options come from `data.specialties`; doctor options are
 * the union of consultation doctors, scoped to the selected
 * specialties when any are active.
 */
function BriefFilterBar({
  specialties,
  selectedSpecialties,
  onSpecialtiesChange,
  doctors,
  selectedDoctors,
  onDoctorsChange,
}: {
  specialties: string[]
  selectedSpecialties: Set<string>
  onSpecialtiesChange: (next: Set<string>) => void
  doctors: string[]
  selectedDoctors: Set<string>
  onDoctorsChange: (next: Set<string>) => void
}) {
  const toggle = (set: Set<string>, value: string): Set<string> => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }
  return (
    <div className="flex flex-wrap items-center gap-[6px]">
      <MultiSelectFilter
        label="Specialty"
        allLabel="All specialties"
        pluralLabel="specialties"
        options={specialties}
        selected={selectedSpecialties}
        onToggle={(v) => onSpecialtiesChange(toggle(selectedSpecialties, v))}
        onClear={() => onSpecialtiesChange(new Set())}
      />
      <MultiSelectFilter
        label="Doctor"
        allLabel="All doctors"
        pluralLabel="doctors"
        options={doctors}
        selected={selectedDoctors}
        onToggle={(v) => onDoctorsChange(toggle(selectedDoctors, v))}
        onClear={() => onDoctorsChange(new Set())}
      />
    </div>
  )
}

/**
 * MultiSelectFilter — single multi-select chip with a custom popover.
 *
 * Trigger reads as a quiet primary-blue chip ("Specialty | All
 * specialties ▾" by default, "Specialty | Oncology +2" when a subset
 * is picked). Clicking it opens a card-styled popover anchored under
 * the chip with one row per option. Each row carries a checkbox; the
 * popover stays open while the doctor toggles multiple items, then
 * dismisses on outside click / Escape. An explicit "Clear" row lets
 * the doctor wipe the selection back to the no-op default.
 *
 * Built on plain divs (no <select>) so the popover can show
 * checkboxes — native <select multiple> on macOS / iOS is ugly
 * and breaks the visual language of the rest of the card.
 */
function MultiSelectFilter({
  label,
  allLabel,
  pluralLabel,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string
  allLabel: string
  /** Plural noun rendered in the summary chip when 2+ items selected
   *  (e.g. "specialties", "doctors"). English plurals are irregular
   *  enough that we just take it as a prop instead of deriving. */
  pluralLabel: string
  options: string[]
  selected: Set<string>
  onToggle: (value: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null)
  // Outside-click / Escape close + position calc happen via refs.
  // NOTE on order: options render in source order (specialties: the
  // order specialty cards appear in the brief; doctors: first-seen
  // order). We do NOT reorder selected items to the top — the doctor
  // expects the checkbox they just tapped to STAY where it is so
  // it's still under their cursor for a follow-up toggle.
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  // Position the popover relative to the trigger via fixed coordinates.
  // The popover renders into document.body (portal) so it escapes the
  // CardShell's `overflow-hidden` clipping — same trick the
  // FloatingTooltip helper uses.
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const update = () => {
      const el = triggerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setCoords({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open])
  // Outside-click / Escape close.
  useEffect(() => {
    if (!open) return
    const handlePointer = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        triggerRef.current?.contains(t) ||
        popoverRef.current?.contains(t)
      ) {
        return
      }
      setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handlePointer)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handlePointer)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])
  const handleTriggerClick = () => {
    setOpen((wasOpen) => !wasOpen)
  }
  const count = selected.size
  // Summary chip text:
  //   0     → allLabel  ("All specialties" / "All doctors")
  //   1     → that one item's name
  //   2+    → "N {pluralLabel}"  ("4 specialties" / "3 doctors")
  const valueLabel =
    count === 0
      ? allLabel
      : count === 1
        ? Array.from(selected)[0]
        : `${count} ${pluralLabel}`
  // Native browser tooltip when summarised — gives the doctor the
  // full list on hover without needing a custom popover.
  const titleAttr =
    count > 1
      ? `${label} · ${Array.from(selected).join(", ")}`
      : label
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Filter by ${label.toLowerCase()}`}
        title={titleAttr}
        className="inline-flex cursor-pointer items-center gap-[6px] rounded-[8px] px-[10px] py-[5px] text-[13px] text-tp-blue-700 transition-colors"
        style={{
          background:
            count > 0 ? "rgba(75, 74, 213, 0.14)" : "rgba(75, 74, 213, 0.06)",
        }}
      >
        {/* The "SPECIALTY" / "DOCTOR" pre-label is dropped — the value
            ("All specialties", "All doctors", or the count summary)
            already tells the doctor what this chip filters. Hovering
            reveals the full list when summarised. */}
        <span className="max-w-[160px] truncate font-semibold text-tp-blue-700">
          {valueLabel}
        </span>
        <ArrowDown2
          size={13}
          variant="Linear"
          className={`shrink-0 text-tp-blue-500/70 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && coords &&
        createPortal(
          <div
            ref={popoverRef}
            role="listbox"
            aria-multiselectable
            className="overflow-hidden rounded-[10px] border border-tp-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.10)]"
            style={{
              position: "fixed",
              top: coords.top,
              right: coords.right,
              minWidth: 200,
              maxWidth: 280,
              zIndex: 10000,
            }}
          >
            <div className="flex items-center justify-between gap-[6px] border-b border-tp-slate-100 px-[10px] py-[6px] text-[10.5px] font-semibold uppercase tracking-[0.05em] text-tp-slate-400">
              <span>{label}</span>
              <button
                type="button"
                onClick={onClear}
                disabled={count === 0}
                className="rounded-[4px] px-[6px] py-[2px] text-[10.5px] font-semibold text-tp-blue-600 transition-colors enabled:hover:bg-tp-blue-50 disabled:cursor-default disabled:text-tp-slate-300"
              >
                Clear
              </button>
            </div>
            <div className="max-h-[280px] overflow-y-auto py-[2px]">
              {options.length === 0 ? (
                <div className="px-[12px] py-[10px] text-[12px] italic text-tp-slate-400">
                  No options available
                </div>
              ) : (
                options.map((opt) => {
                  const isOn = selected.has(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      role="option"
                      aria-selected={isOn}
                      onClick={() => onToggle(opt)}
                      className="flex w-full items-center gap-[8px] px-[10px] py-[7px] text-left text-[12.5px] text-tp-slate-700 transition-colors hover:bg-tp-blue-50/60"
                    >
                      <span
                        className={`flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[3px] border ${isOn ? "border-tp-blue-500 bg-tp-blue-500" : "border-tp-slate-300 bg-white"}`}
                        aria-hidden
                      >
                        {isOn && (
                          <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
                            <path
                              d="M3.5 8.5l3 3 6-7"
                              fill="none"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="truncate">{opt}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

export function VeloraV0MdtBriefCard({ data }: { data: VeloraV0MdtBriefData }) {
  const patientLine = formatPatientStrip(data)
  const headlines = data.chronicConditions ?? []
  const hasHeadlines = headlines.length > 0
  // Which specialty (by index) has its sidebar open? -1 means none.
  const [openSidebarIdx, setOpenSidebarIdx] = useState<number>(-1)
  // When the sidebar opens via "View other details" on a specific visit,
  // we auto-expand that visit so the doctor lands directly on the right
  // consultation. -1 means "no auto-expand, just render collapsed list".
  const [sidebarInitialVisitIdx, setSidebarInitialVisitIdx] = useState<number>(-1)
  const openRec = openSidebarIdx >= 0 ? data.specialties[openSidebarIdx] ?? null : null
  // Accordion: every specialty starts COLLAPSED by default — only the
  // medical-history section is expanded on first paint, matching the
  // design call "everything else is one click away". When the doctor
  // opens a specialty, every visit inside is rendered as fully expanded
  // (no per-visit toggle), so opening = full Rx read of every consultation.
  const [expandedSpecialties, setExpandedSpecialties] = useState<Set<number>>(
    () => new Set(),
  )
  const toggleSpecialty = (idx: number) =>
    setExpandedSpecialties((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  // Filter state — empty Set means "all", same no-op default the
  // single-select version used to express as "All specialties" /
  // "All doctors". Multi-select via custom popover (see
  // MultiSelectFilter above) — checking N specialties / doctors
  // narrows the rendered specialty + consultation list to the union.
  const [filterSpecialties, setFilterSpecialties] = useState<Set<string>>(() => new Set())
  const [filterDoctors, setFilterDoctors] = useState<Set<string>>(() => new Set())
  // Available specialty labels for the dropdown (unique, in source order).
  const specialtyOptions = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const rec of data.specialties) {
      const lbl = rec.source.specialty
      if (lbl && !seen.has(lbl)) {
        seen.add(lbl)
        out.push(lbl)
      }
    }
    return out
  }, [data.specialties])
  // Doctor options — when no specialty is selected, list every doctor
  // across every specialty; when one or more specialties are picked,
  // restrict to that team's doctors only.
  const doctorOptions = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    const scope =
      filterSpecialties.size === 0
        ? data.specialties
        : data.specialties.filter((r) => filterSpecialties.has(r.source.specialty))
    for (const rec of scope) {
      for (const c of rec.consultations ?? []) {
        const name = c.doctor?.trim()
        if (name && !seen.has(name)) {
          seen.add(name)
          out.push(name)
        }
      }
    }
    return out
  }, [data.specialties, filterSpecialties])
  // Drop doctor selections that stop being valid when the specialty
  // scope changes (e.g. doctor picked, then specialty filter excludes
  // their team). Without this the chip would silently render zero
  // visits with no obvious reason.
  useEffect(() => {
    if (filterDoctors.size === 0) return
    const valid = new Set(doctorOptions)
    let changed = false
    const next = new Set<string>()
    for (const d of filterDoctors) {
      if (valid.has(d)) next.add(d)
      else changed = true
    }
    if (changed) setFilterDoctors(next)
  }, [doctorOptions, filterDoctors])
  // Filter specialties + consultations for render.
  const filteredSpecialties = useMemo(() => {
    return data.specialties
      .map((rec, originalIdx) => ({ rec, originalIdx }))
      .filter(({ rec }) => {
        if (filterSpecialties.size > 0 && !filterSpecialties.has(rec.source.specialty)) {
          return false
        }
        if (filterDoctors.size > 0) {
          const hasOne = (rec.consultations ?? []).some(
            (c) => c.doctor && filterDoctors.has(c.doctor.trim()),
          )
          if (!hasOne) return false
        }
        return true
      })
      .map(({ rec, originalIdx }) => {
        if (filterDoctors.size === 0) return { rec, originalIdx }
        const scoped: VeloraV0Attribution = {
          ...rec,
          consultations: (rec.consultations ?? []).filter(
            (c) => c.doctor && filterDoctors.has(c.doctor.trim()),
          ),
        }
        return { rec: scoped, originalIdx }
      })
  }, [data.specialties, filterSpecialties, filterDoctors])
  // View-mode read from the agent-shell context. Single icon toggle next
  // to the Velora brand-tag drives every brief card on the surface.
  const { viewMode } = useVeloraViewMode()

  return (
    <div className="flex flex-col gap-[10px]" data-mdt-card="root">
      {/* ── Card 1 · Hospital records grouped by specialty ── */}
      <div data-mdt-anchor="card1-header">
      <CardShell
        icon={<Hospital size={15} variant="Bulk" />}
        title="Cross-consultation brief"
        date={patientLine}
        dataSources={[
          "Visit × Provider",
          "Note metadata",
          "Drug Exposure × Provider",
          "Referral × Visit",
        ]}
        headerExtra={
          <BriefFilterBar
            specialties={specialtyOptions}
            selectedSpecialties={filterSpecialties}
            onSpecialtiesChange={setFilterSpecialties}
            doctors={doctorOptions}
            selectedDoctors={filterDoctors}
            onDoctorsChange={setFilterDoctors}
          />
        }
      >
        {/* Cross-brief body — plain white canvas. The card's own
            CardShell header carries its violet → transparent gradient
            for the top; everything below that stays on a clean
            background so the content doesn't compete with the tint. */}
        <div className="flex flex-col gap-[10px]">
          {/* The view-mode toggle (Detailed ↔ Concise) lives next to the
              Velora brand-tag in the agent header, not inside the card.
              The card just reads `viewMode` from the shell context and
              switches its specialty-body renderer accordingly. */}

          {/* The filter row used to sit here; it now rides the CardShell
              header (right side, before the chevron) via the
              `headerExtra` slot so the doctor can scope specialties /
              doctors without scrolling the body. */}

          {/* ── Section 1 · Medical issues ──────────────────────────────
              Surfaced once at the top so per-specialty sections only describe
              what that team *did* about them, not the diagnosis itself.

              Layout choice: a top-level SectionSummaryBar pill (matching the
              specialty headings below) + bold sub-headings + bulleted items.
              The header line reads as a peer of "Oncology", "Pulmonology"
              etc. — visually anchoring this as a coherent section of the
              same card, not an alien block.

              Row-count captions removed. Each item now exposes its source
              via the ⓘ tooltip, which carries a free-text description of
              the underlying OMOP rows + visits + providers. Same trust
              signal, less inline noise.

              Falls back to the legacy flat `chronicConditions` list (Ravi
              Shankar mock) when `medicalHistory` is not provided. */}
          {data.medicalHistory && data.medicalHistory.length > 0 ? (() => {
            // Filter scope:
            //   · Drop "Primary problem" — the chief diagnosis lives in
            //     each specialty's first-row Findings; keeping it here
            //     duplicated it.
            //
            // Every other group renders — Co-morbidities, Surgical history,
            // Allergies & safety, Family / Social history, Additional
            // history. When a group has only the placeholder row ("No
            // surgical history found", "Allergy review not on file") we
            // still render it so the doctor sees the explicit absence
            // rather than wondering if the section was checked.
            // Drop Primary problem (duplicates each specialty's first-row
            // Diagnosis). Keep every other group, even when items is empty
            // — those render with a "No data from patient record"
            // placeholder so the doctor sees the explicit absence rather
            // than wondering if the section was checked.
            const filteredHistory = data.medicalHistory.filter(
              (g) => g.title !== "Primary problem",
            )
            if (filteredHistory.length === 0) return null
            return (
              <div data-mdt-anchor="medical-history" className="flex flex-col gap-[4px]">
                <SectionSummaryBar
                  label="Medical history"
                  icon="medical-service"
                  trailing={<MedicalHistorySectionTooltip groups={filteredHistory} />}
                />
                <div className="flex flex-col gap-[12px] pl-[2px]">
                  {filteredHistory.map((group, gi) => {
                    // Drug-name casing policy (Active medications +
                    // every other group):
                    //
                    // The strings rendered here come VERBATIM from the
                    // OMOP `drug_source_value` / `condition_source_value`
                    // fields the EMR stored. We do NOT manually uppercase
                    // anything — the hospital's pharmacy module is what
                    // writes "ONCOLET 2.5MG TABLET" in shout-case. Same
                    // policy as the per-visit `medications` row inside
                    // each VisitCard. To title-case for readability we
                    // would need an explicit normalisation layer (drug-
                    // catalogue lookup), which V0 deliberately avoids so
                    // every shown character is auditable back to a
                    // specific OMOP row.
                    //
                    // Active medications: filter to the subset whose
                    // prescribedAt + daysSupply window covers today.
                    // Items that didn't carry those fields (legacy mock
                    // rows) pass through unchanged so we never hide a
                    // drug for lack of metadata.
                    const isActiveMedsGroup = /active medication/i.test(group.title)
                    const renderItems = isActiveMedsGroup
                      ? filterActiveMedicationItems(group.items)
                      : group.items
                    const hasItems = renderItems.length > 0
                    const joinedText = hasItems
                      ? renderItems.map((it) => it.text).join(" | ")
                      : ""
                    return (
                      <p key={gi} className="text-[13.5px] leading-[1.55] text-tp-slate-700">
                        <MedicalHistorySubheadingTag group={group} />
                        {hasItems ? (
                          <HighlightLine text={joinedText} plain />
                        ) : (
                          <span className="italic text-tp-slate-400">
                            {isActiveMedsGroup
                              ? "No medications active in the current prescribed window"
                              : "No data from patient record"}
                          </span>
                        )}
                      </p>
                    )
                  })}
                </div>
              </div>
            )
          })() : hasHeadlines ? (
            <div data-mdt-anchor="headlines" className="flex flex-col gap-[6px] rounded-[10px] border border-tp-slate-200 bg-tp-slate-50/70 px-[10px] py-[9px]">
              <div className="flex items-center gap-[5px] text-[13px] font-semibold text-tp-slate-700">
                <span>Headlines · chronic conditions &amp; concerning diagnoses</span>
                <span className="ml-[4px] rounded-full bg-white px-[6px] py-[1px] text-[10px] font-bold text-tp-slate-600">
                  {headlines.length}
                </span>
              </div>
              <ul className="ml-[2px] flex flex-col gap-[3px] pl-[8px] text-[13.5px] leading-[1.5] text-tp-slate-700">
                {headlines.map((h, i) => (
                  <li key={i} className="flex gap-[6px]">
                    <span className="mt-[8px] inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-tp-slate-500" />
                    <span><HighlightLine text={h} /></span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {filteredSpecialties.map(({ rec, originalIdx }, mapIdx) => {
            const isExpanded = expandedSpecialties.has(originalIdx)
            const idx = originalIdx
            return (
            <div key={originalIdx} className="flex flex-col gap-[4px]" data-mdt-anchor={mapIdx === 0 ? "first-specialty" : undefined}>
              <div data-mdt-anchor={mapIdx === 0 ? "specialty-bar" : undefined}>
                {/* New accordion heading — collapses/expands the body
                    inline (no sidebar opener). Meta (N doctors · N visits
                    · date range) lives inside the heading itself; the
                    source ⓘ stays in the trailing slot so audit info is
                    still one hover away. */}
                <SpecialtyHeading
                  rec={rec}
                  expanded={isExpanded}
                  onToggle={() => toggleSpecialty(originalIdx)}
                />
              </div>
              {/* Body — only renders when this specialty is expanded.
                  Detailed view (default) iterates consultations as
                  visit cards arranged along a vertical timeline; concise
                  view falls back to the grouped-by-label lines render. */}
              {isExpanded && (
              viewMode === "detailed" ? (
                <div data-mdt-anchor={mapIdx === 0 ? "specialty-body" : undefined}>
                  <DetailedSpecialtyBody
                    rec={rec}
                    onOpenVisit={(visitIdx) => {
                      setSidebarInitialVisitIdx(visitIdx)
                      setOpenSidebarIdx(idx)
                    }}
                  />
                  {/* Lab results aggregate row stays in Detailed mode too,
                      after the per-visit blocks, so the team-level
                      abnormal-labs picture sits at the bottom. */}
                  {rec.labResults && rec.labResults.length > 0 && (
                    <div className="mt-[10px] pl-[8px]">
                      <LabResultsBlock
                        labs={rec.labResults}
                        hiddenNormalCount={rec.hiddenNormalLabCount}
                      />
                    </div>
                  )}
                </div>
              ) : (
              <div data-mdt-anchor={mapIdx === 0 ? "specialty-body" : undefined} className="flex flex-col gap-[10px] pl-[8px] text-[14px] leading-[1.55] text-tp-slate-700">
                {/* Group lines by label (Findings / Medications / Plan)
                    and render ONE chip per category with bullet pointers
                    below — when a specialty has notes from multiple
                    doctors, the chip stays a single anchor and each
                    doctor's note reads as a sub-bullet underneath. */}
                {(() => {
                  type Row = { label: string | undefined; content: string }
                  const rows: Row[] = rec.lines.map((line) => {
                    const m = line.match(/^\*\*([^*]+)\*\*:\s*(.*)$/)
                    return { label: m?.[1], content: m?.[2] ?? line }
                  })
                  // Filter out "Medications: No ongoing …" rows entirely.
                  const filtered = rows.filter(
                    (r) => !(r.label && /medications?/i.test(r.label) && /^no ongoing\b/i.test(r.content)),
                  )
                  // Group consecutive rows by label. Unlabelled rows
                  // attach to whichever group they happen to be next to,
                  // so multi-row content under a single label stays
                  // contiguous.
                  type Group = { label: string | undefined; items: string[] }
                  const groups: Group[] = []
                  for (const r of filtered) {
                    const last = groups[groups.length - 1]
                    if (last && last.label === r.label) {
                      last.items.push(r.content)
                    } else {
                      groups.push({ label: r.label, items: [r.content] })
                    }
                  }
                  return groups.map((g, gi) => {
                    // Single-item group → inline-flow paragraph (chip
                    // hugs the content, no bullet dot — keeps short rows
                    // compact). Multi-item group → chip above, bullets
                    // below.
                    if (g.items.length === 1) {
                      return (
                        <p key={gi} className="min-w-0">
                          {g.label && (
                            <span className="mr-[6px] inline-flex items-center rounded-[4px] bg-tp-slate-100 px-[5px] py-[1px] align-[1px] text-[10.5px] font-semibold uppercase tracking-[0.04em] text-tp-slate-600">
                              {g.label}
                            </span>
                          )}
                          <HighlightLine text={g.items[0]} />
                        </p>
                      )
                    }
                    return (
                      <div key={gi} className="flex flex-col gap-[4px]">
                        {g.label && (
                          <span className="inline-flex w-fit items-center rounded-[4px] bg-tp-slate-100 px-[5px] py-[1px] text-[10.5px] font-semibold uppercase tracking-[0.04em] text-tp-slate-600">
                            {g.label}
                          </span>
                        )}
                        <ul className="ml-[2px] flex flex-col gap-[3px] pl-[8px]">
                          {g.items.map((it, ii) => (
                            <li key={ii} className="flex gap-[6px]">
                              <span className="mt-[8px] inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-tp-slate-400" />
                              <span className="min-w-0">
                                <HighlightLine text={it} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })
                })()}
                {/* Lab results — fourth pointer alongside Findings / Medications / Plan.
                    Renders only when the specialty has abnormal labs (or a
                    normal-rollup count) to show. Policy: every abnormal lab
                    in this team's scope, ordered critical → high → low,
                    newest first inside the same flag. */}
                {rec.labResults && rec.labResults.length > 0 && (
                  <LabResultsBlock
                    labs={rec.labResults}
                    hiddenNormalCount={rec.hiddenNormalLabCount}
                  />
                )}
              </div>
              )
              )}
              {/* Open-loops block removed per design call — the Stack 1
                  card now stays strictly within "what the doctor wrote",
                  no inferred-gap commentary. Coordination gaps surface
                  in the separate Clinical synthesis card below. */}
            </div>
            )
          })}
        </div>
      </CardShell>
      </div>

      {/* ── Card 2 · Clinical synthesis ── */}
      <div data-mdt-anchor="card2-header">
      <CardShell
        icon={<Diagram size={15} variant="Bulk" />}
        title="Clinical synthesis"
        date={`Cross-team interpretation · ${patientLine}`}
        dataSources={[
          "DDI rule-base",
          "Guideline panels (ESC · ADA · KDIGO · NICE)",
          "Note metadata",
        ]}
      >
        <div className="flex flex-col gap-[10px]">
          <p className="text-[14px] leading-[1.5] text-tp-slate-600">
            Curated cross-team groupings from <strong className="font-semibold">published guidelines</strong>,
            applied to this patient's data. AI picks <em>which panels apply</em>; it does not author the claims.
          </p>

          {/* "Where they collide" — list of independent detector fires.
              Each entry: kind badge (DDI / Coordination gap), title with drug pair,
              bullet points, cited guideline chip. */}
          {(() => {
            const entries = data.collisions ?? (data.collide ? [{
              kind: "coordination-gap" as const,
              title: data.collide.headline,
              points: [data.collide.detail],
              rule: data.collide.rule,
            }] : [])
            if (entries.length === 0) return null
            return (
              <div data-mdt-anchor="collide" className="flex flex-col gap-[8px] rounded-[10px] border border-tp-warning-200 bg-tp-warning-50/60 px-[10px] py-[9px]">
                <div className="flex items-center gap-[5px] text-[13px] font-semibold text-tp-warning-800">
                  <Flag size={13} variant="Bulk" />
                  <span>Where they collide</span>
                  <span className="ml-[4px] rounded-full bg-white px-[6px] py-[1px] text-[10px] font-bold text-tp-warning-700">
                    {entries.length}
                  </span>
                </div>
                {entries.map((entry, idx) => (
                  <div key={idx} className="rounded-[8px] border border-tp-warning-200/70 bg-white px-[10px] py-[8px]">
                    <div className="mb-[4px] flex items-start justify-between gap-[6px]">
                      <div className="flex flex-1 flex-wrap items-center gap-[6px]">
                        <span
                          className={`shrink-0 rounded-[4px] px-[6px] py-[1px] text-[9.5px] font-bold uppercase tracking-[0.06em] ${
                            entry.kind === "ddi"
                              ? "bg-tp-error-100 text-tp-error-700"
                              : "bg-tp-warning-100 text-tp-warning-800"
                          }`}
                        >
                          {entry.kind === "ddi" ? "DDI flag" : "Coordination gap"}
                        </span>
                        <span className="text-[13.5px] font-medium leading-[1.4] text-tp-slate-800">
                          <HighlightLine text={entry.title} />
                        </span>
                      </div>
                      <GuidelineChip {...entry.rule} />
                    </div>
                    <ul className="ml-[2px] flex flex-col gap-[3px] pl-[8px] text-[13px] leading-[1.5] text-tp-slate-700">
                      {entry.points.map((p, i) => (
                        <li key={i} className="flex gap-[6px]">
                          <span className="mt-[8px] inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-tp-slate-400" />
                          <span><HighlightLine text={p} /></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )
          })()}

          {data.syntheses.map((s, idx) => (
            <div key={idx} className="flex flex-col gap-[4px]" data-mdt-anchor={idx === 0 ? "synthesis" : undefined}>
              <SectionSummaryBar
                label={s.panelTitle}
                icon="medical-report"
                trailing={<GuidelineChip {...s.guideline} />}
              />
              <ul className="flex flex-col gap-[3px] pl-[8px]">
                {s.rows.map((row, i) => (
                  <SynthesisBullet key={i} row={row} />
                ))}
              </ul>
              {/* `s.note` (Why this panel) is intentionally NOT rendered in the live card —
                  the deep-dive doc surfaces per-panel reasoning. Keeps the chat surface clean. */}
            </div>
          ))}

          {data.pendingMdtItems && data.pendingMdtItems.length > 0 && (
            <div data-mdt-anchor="pending" className="flex flex-col gap-[4px]">
              <SectionSummaryBar label="Pending MDT" icon="emergency" />
              <ul className="flex flex-col gap-[3px] pl-[8px] text-[14px] leading-[1.55] text-tp-slate-700">
                {data.pendingMdtItems.map((item, i) => (
                  <li key={i} className="flex gap-[6px]">
                    <span className="mt-[8px] inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-tp-slate-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Defence line removed from the live card — surfaced in the deep-dive doc instead. */}
        </div>
      </CardShell>
      </div>

      {/* Specialty sidebar — slide-in panel showing per-consultation timeline.
          Opens when the doctor clicks the chevron on any specialty header. */}
      <SpecialtySidebar
        open={openSidebarIdx >= 0}
        rec={openRec}
        patientLabel={patientLine}
        initialExpandedIdx={sidebarInitialVisitIdx >= 0 ? sidebarInitialVisitIdx : undefined}
        onClose={() => {
          setOpenSidebarIdx(-1)
          setSidebarInitialVisitIdx(-1)
        }}
      />
    </div>
  )
}
