"use client"

import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Hospital, Flag, Diagram, InfoCircle, ArrowRight2, CloseCircle, Calendar } from "iconsax-reactjs"
import { FlagArrow } from "../../shared/FlagArrow"
import { CardShell } from "../CardShell"
import { SectionSummaryBar } from "../SectionSummaryBar"
import { GuidelineChip } from "./VeloraStack"
import { FloatingTooltip, HighlightLine, InfoTip, SourceInfoTip, shortDate } from "./highlight"
import type { VeloraV0MdtBriefData, VeloraV0Attribution, VeloraV0MedicalHistoryGroup, VeloraV0Synthesis } from "../../types"

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
 * Compact a possibly-multi-doctor label into one-doctor-plus-overflow.
 *
 *   "Dr Tahiliani"                          → "Dr Tahiliani"
 *   "Dr Tahiliani / Dr Sandeep Jain"        → "Dr Tahiliani  +1"
 *   "Dr Sowani / Dr Nikhil Dave / Dr X"     → "Dr Sowani  +2"
 *
 * The trailing has to fit on one row alongside date + visit-count + chevron,
 * so the second / third doctor name is folded into an overflow count. The
 * sidebar (opened by the chevron) shows the full doctor list.
 */
function compactDoctorsLabel(raw: string): string {
  const list = raw.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean)
  if (list.length <= 1) return raw
  return `${list[0]}  +${list.length - 1}`
}

function HeaderTrailing({
  rec,
  onOpenSidebar,
}: {
  rec: VeloraV0Attribution
  onOpenSidebar: () => void
}) {
  // Compact bracketed trailing: ( date | N visits | first doctor +N ) →
  //
  // The parens anchor the metadata visually so the eye reads it as a self-
  // contained tag, leaving the chevron clearly outside as the click target.
  // Lighter slate-300 pipes between segments so the dividers recede and the
  // values carry the eye.
  //
  // Multi-doctor specialty labels are compacted to "Dr First +N" — the full
  // doctor list lives in the sidebar that the chevron opens.
  const hasStructured = rec.dateRangeLabel || rec.doctorsLabel || typeof rec.consultationCount === "number"
  const segments: string[] = []
  if (hasStructured) {
    if (rec.dateRangeLabel) segments.push(rec.dateRangeLabel)
    if (typeof rec.consultationCount === "number") segments.push(`${rec.consultationCount} visit${rec.consultationCount === 1 ? "" : "s"}`)
    if (rec.doctorsLabel) segments.push(compactDoctorsLabel(rec.doctorsLabel))
  } else {
    segments.push(shortDate(rec.source.date))
  }
  return (
    <button
      type="button"
      onClick={onOpenSidebar}
      className="flex shrink-0 items-center gap-[5px] rounded-[4px] px-[6px] py-[2px] text-[12px] text-tp-slate-500 transition-colors hover:bg-tp-slate-100/80 hover:text-tp-slate-700"
      aria-label={`Open ${rec.source.specialty} consultation timeline`}
    >
      <span className="flex items-center">
        <span className="text-tp-slate-300">(</span>
        {segments.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="mx-[6px] text-tp-slate-300">|</span>}
            <span>{s}</span>
          </React.Fragment>
        ))}
        <span className="text-tp-slate-300">)</span>
      </span>
      <ArrowRight2 size={14} variant="Linear" />
    </button>
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
}: {
  open: boolean
  rec: VeloraV0Attribution | null
  patientLabel: string
  onClose: () => void
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!open) setExpandedIdx(null)
  }, [open])
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
                        <span className="ml-auto text-tp-slate-400">
                          <ArrowRight2
                            size={14}
                            variant="Linear"
                            style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 150ms ease" }}
                          />
                        </span>
                      </div>
                      <div className="mt-[2px] text-[13px] leading-[1.45] text-tp-slate-800">
                        <HighlightLine text={c.headline} />
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="mb-[6px] ml-[2px] mt-[2px] flex flex-col gap-[6px] rounded-[8px] border border-tp-slate-200 bg-tp-slate-50/60 px-[12px] py-[10px]">
                        {c.findings && (
                          <p className="text-[12.5px] leading-[1.5] text-tp-slate-700">
                            <span className="mr-[6px] inline-flex items-center rounded-[4px] bg-tp-slate-100 px-[5px] py-[1px] text-[10.5px] font-semibold uppercase tracking-[0.04em] text-tp-slate-600">
                              Findings
                            </span>
                            <HighlightLine text={c.findings} />
                          </p>
                        )}
                        {c.medications && (
                          <p className="text-[12.5px] leading-[1.5] text-tp-slate-700">
                            <span className="mr-[6px] inline-flex items-center rounded-[4px] bg-tp-slate-100 px-[5px] py-[1px] text-[10.5px] font-semibold uppercase tracking-[0.04em] text-tp-slate-600">
                              Medications
                            </span>
                            <HighlightLine text={c.medications} />
                          </p>
                        )}
                        {c.plan && (
                          <p className="text-[12.5px] leading-[1.5] text-tp-slate-700">
                            <span className="mr-[6px] inline-flex items-center rounded-[4px] bg-tp-slate-100 px-[5px] py-[1px] text-[10.5px] font-semibold uppercase tracking-[0.04em] text-tp-slate-600">
                              Plan
                            </span>
                            <HighlightLine text={c.plan} />
                          </p>
                        )}
                        {!c.findings && !c.medications && !c.plan && (
                          <p className="text-[12px] italic leading-[1.5] text-tp-slate-500">
                            No further detail captured for this visit.
                          </p>
                        )}
                      </div>
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
function MedicalHistorySubheadingTag({
  group,
}: {
  group: VeloraV0MedicalHistoryGroup
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const tone = group.tone ?? "neutral"
  const toneClass =
    tone === "primary"
      ? "bg-tp-error-50 text-tp-error-700"
      : tone === "positive"
        ? "bg-tp-violet-50 text-tp-violet-700"
        : "bg-tp-slate-100 text-tp-slate-700"
  const hasTip = (group.sources && group.sources.length > 0) || !!group.reasoning
  // Cap visible source rows so the tooltip doesn't grow unbounded.
  const MAX_VISIBLE = 6
  const visibleSources = group.sources?.slice(0, MAX_VISIBLE) ?? []
  const overflow = (group.sources?.length ?? 0) - visibleSources.length
  return (
    <>
      <span
        ref={ref}
        className={`mr-[6px] inline-flex shrink-0 items-center gap-[5px] rounded-[4px] px-[7px] py-[3px] text-[12px] font-semibold leading-[1.35] ${toneClass} ${hasTip ? "cursor-help" : ""}`}
        onMouseEnter={() => hasTip && setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => hasTip && setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={hasTip ? 0 : -1}
      >
        <span>{group.title}</span>
        {hasTip && <InfoCircle size={16} variant="Linear" />}
      </span>
      {hasTip && (
        <FloatingTooltip
          open={open}
          triggerRef={ref}
          placement="top-center"
          width={320}
          className="rounded-[6px] bg-tp-slate-800 px-[10px] py-[8px] text-left text-[11px] font-normal leading-[1.5] text-white shadow-lg"
        >
          {visibleSources.length > 0 && (
            <span className="block">
              <span className="font-semibold uppercase tracking-[0.06em] text-tp-slate-400">
                Sources ({group.sources?.length ?? 0})
              </span>
              <span className="mt-[4px] block">
                {visibleSources.map((s, i) => (
                  <span key={i} className="block text-tp-slate-100">
                    • {s.doctor} · {s.date}
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="block text-tp-slate-400">
                    + {overflow} more consultation{overflow === 1 ? "" : "s"}
                  </span>
                )}
              </span>
            </span>
          )}
          {group.reasoning && (
            <span className={`block ${visibleSources.length > 0 ? "mt-[6px] border-t border-tp-slate-700 pt-[6px]" : ""}`}>
              <span className="font-semibold uppercase tracking-[0.06em] text-tp-slate-400">Why this matters</span>
              <br />
              <span className="text-white">{group.reasoning}</span>
            </span>
          )}
        </FloatingTooltip>
      )}
    </>
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

export function VeloraV0MdtBriefCard({ data }: { data: VeloraV0MdtBriefData }) {
  const patientLine = formatPatientStrip(data)
  const headlines = data.chronicConditions ?? []
  const hasHeadlines = headlines.length > 0
  // Which specialty (by index) has its sidebar open? -1 means none.
  const [openSidebarIdx, setOpenSidebarIdx] = useState<number>(-1)
  const openRec = openSidebarIdx >= 0 ? data.specialties[openSidebarIdx] ?? null : null

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
      >
        <div className="flex flex-col gap-[10px]">
          {/* Window-line ("N specialties touched the patient in N days")
              removed — the same information now lives in the chat preamble
              above the card. Duplicating it inside the body was noise; the
              card now opens straight into Medical history. */}

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
          {data.medicalHistory && data.medicalHistory.length > 0 ? (
            <div data-mdt-anchor="medical-history" className="flex flex-col gap-[4px]">
              <SectionSummaryBar label="Medical history" icon="medical-service" />
              {/* Each sub-section: tone-aware tag chip + one pipe-divided bullet.
                  The ⓘ on the tag opens a tooltip listing every OMOP consultation
                  feeding the group, plus the reasoning for why it's surfaced.
                  No "N rows" caption clutter; no separate per-item icons. */}
              {/* Each group renders as a single flowing paragraph: the tone-
                  tinted chip sits inline at the start (mr-[6px] gap to the
                  text), the joined item text flows after it and wraps below
                  naturally. No standalone row, no bullet dot — the chip IS
                  the visual anchor. Gap between paragraphs deliberately
                  generous so the four sub-sections read as separate blocks
                  rather than running together. */}
              <div className="flex flex-col gap-[12px] pl-[2px]">
                {data.medicalHistory.map((group, gi) => {
                  // Join items with " | ". HighlightLine renders the pipes
                  // as styled PipeDivider glyphs (slate-200 vertical bar).
                  // Per content style: each item is `**Name** (detail, detail)`
                  // with no em-dashes inside.
                  const joinedText = group.items.map((it) => it.text).join(" | ")
                  return (
                    <p key={gi} className="text-[13.5px] leading-[1.55] text-tp-slate-700">
                      <MedicalHistorySubheadingTag group={group} />
                      <HighlightLine text={joinedText} />
                    </p>
                  )
                })}
              </div>
            </div>
          ) : hasHeadlines ? (
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

          {data.specialties.map((rec, idx) => (
            <div key={idx} className="flex flex-col gap-[4px]" data-mdt-anchor={idx === 0 ? "first-specialty" : undefined}>
              <div data-mdt-anchor={idx === 0 ? "specialty-bar" : undefined}>
                <SectionSummaryBar
                  label={rec.source.specialty}
                  icon="medical-service"
                  trailing={<HeaderTrailing rec={rec} onOpenSidebar={() => setOpenSidebarIdx(idx)} />}
                />
              </div>
              {/* Body — Findings / Medications / Plan as bulleted rows.
                  The "**Label**:" prefix is rendered as a small uppercase chip
                  so Findings / Medications / Plan are unmistakably labels
                  rather than blurry inline text. Medications rows whose
                  payload starts with the literal phrase "No ongoing" are
                  filtered out — when the team has nothing currently active,
                  the row simply doesn't render rather than saying "none".
                  (The provenance paragraph that used to live above this body
                  is gone — its date-range / doctor / count content now lives
                  in the section heading's trailing slot.) */}
              <div data-mdt-anchor={idx === 0 ? "specialty-body" : undefined} className="flex flex-col gap-[10px] pl-[8px] text-[14px] leading-[1.55] text-tp-slate-700">
                {rec.lines.map((line, i) => {
                  const labelMatch = line.match(/^\*\*([^*]+)\*\*:\s*(.*)$/)
                  const label = labelMatch?.[1]
                  const content = labelMatch?.[2] ?? line
                  // Hide a medications row entirely when there's nothing
                  // ongoing.
                  if (label && /medications?/i.test(label) && /^no ongoing\b/i.test(content)) {
                    return null
                  }
                  return (
                    // Inline-flow paragraph: the label chip floats at the
                    // start, content wraps after it. No bullet dot — the chip
                    // is the visual anchor (mirrors the medical-history
                    // section's rendering style).
                    <p key={i} className="min-w-0">
                      {label && (
                        <span className="mr-[6px] inline-flex items-center rounded-[4px] bg-tp-slate-100 px-[5px] py-[1px] align-[1px] text-[10.5px] font-semibold uppercase tracking-[0.04em] text-tp-slate-600">
                          {label}
                        </span>
                      )}
                      <HighlightLine text={content} />
                    </p>
                  )
                })}
              </div>
              {/* Open-loops disclosure — the anti-data-loss layer. Shows
                  what's *captured upstream but not surfaced* in this card,
                  plus guideline-anchored gaps (overdue surveillance, no-result
                  investigations). Rendered as a subtle amber-tinted block so
                  it doesn't dominate the body but is unmissable. */}
              {rec.openLoops && rec.openLoops.length > 0 && (
                <div
                  data-mdt-anchor={idx === 0 ? "specialty-openloops" : undefined}
                  className="ml-[8px] mt-[2px] rounded-[8px] border border-tp-warning-200/70 bg-tp-warning-50/50 px-[8px] py-[6px]"
                >
                  <div className="mb-[2px] flex items-center gap-[4px] text-[11px] font-semibold uppercase tracking-[0.04em] text-tp-warning-800">
                    <Flag size={11} variant="Bulk" />
                    <span>Open loops on this specialty</span>
                  </div>
                  <ul className="ml-[2px] flex flex-col gap-[2px] pl-[6px] text-[12.5px] leading-[1.45] text-tp-slate-700">
                    {rec.openLoops.map((loop, li) => (
                      <li key={li} className="flex gap-[6px]">
                        <span className="mt-[7px] inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-tp-warning-500" />
                        <span><HighlightLine text={loop} /></span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
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
        onClose={() => setOpenSidebarIdx(-1)}
      />
    </div>
  )
}
