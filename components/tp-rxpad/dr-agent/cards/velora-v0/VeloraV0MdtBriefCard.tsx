"use client"

import React, { useRef, useState } from "react"
import { Hospital, Flag, Diagram, InfoCircle } from "iconsax-reactjs"
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

function HeaderTrailing({ rec }: { rec: VeloraV0Attribution }) {
  // Rich trailing: date range + doctors + consultation count + info icon.
  // Consolidates everything the old standalone "Based on N consultations…"
  // provenance paragraph used to say, so the body can start with Findings
  // immediately below the heading.
  //
  // Preference order:
  //   1. New structured fields (dateRangeLabel + doctorsLabel + consultationCount)
  //   2. Legacy single-date trailing (rec.source.date)
  const sourceLine = `${rec.source.specialty} Rx signed ${shortDate(rec.source.date)} by ${rec.source.author}`
  const hasStructured = rec.dateRangeLabel || rec.doctorsLabel || typeof rec.consultationCount === "number"
  if (hasStructured) {
    const segments: string[] = []
    if (rec.dateRangeLabel) segments.push(rec.dateRangeLabel)
    if (typeof rec.consultationCount === "number") segments.push(`${rec.consultationCount} visit${rec.consultationCount === 1 ? "" : "s"}`)
    if (rec.doctorsLabel) segments.push(rec.doctorsLabel)
    return (
      <span className="flex shrink-0 items-center gap-[5px] text-[12px] text-tp-slate-500">
        <span className="text-tp-slate-500">{segments.join(" · ")}</span>
        <SourceInfoTip source={sourceLine} reason={rec.reason} />
      </span>
    )
  }
  return (
    <span className="flex shrink-0 items-center gap-[5px] text-[13px] text-tp-slate-500">
      <span className="text-tp-slate-400">({shortDate(rec.source.date)})</span>
      <SourceInfoTip source={sourceLine} reason={rec.reason} />
    </span>
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
function GroupSourceTip({
  sources,
  reasoning,
}: {
  sources?: Array<{ doctor: string; date: string }>
  reasoning?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  if ((!sources || sources.length === 0) && !reasoning) return null
  // Cap visible source rows so the tooltip doesn't grow unbounded for groups
  // backed by 15+ visits. The +N indicator preserves the count signal.
  const MAX_VISIBLE = 6
  const visibleSources = sources?.slice(0, MAX_VISIBLE) ?? []
  const overflow = (sources?.length ?? 0) - visibleSources.length
  return (
    <>
      <span
        ref={ref}
        className="relative inline-flex shrink-0 cursor-pointer items-center align-middle text-tp-slate-600 hover:text-tp-slate-800"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        aria-label="Source"
      >
        {/* Bold variant + bumped size so the trigger is clearly visible at the
            12px tag font scale. Previous 11px Linear was visually anaemic. */}
        <InfoCircle size={14} variant="Bold" />
      </span>
      <FloatingTooltip
        open={open}
        triggerRef={ref}
        placement="top-center"
        width={300}
        className="rounded-[6px] bg-tp-slate-800 px-[10px] py-[8px] text-left text-[11px] font-normal leading-[1.5] text-white shadow-lg"
      >
        {visibleSources.length > 0 && (
          <span className="block">
            <span className="font-semibold uppercase tracking-[0.06em] text-tp-slate-400">
              Sources ({sources?.length ?? 0})
            </span>
            <span className="mt-[4px] block">
              {visibleSources.map((s, i) => (
                <span key={i} className="block text-tp-slate-100">
                  • {s.doctor} · {s.date}
                </span>
              ))}
              {overflow > 0 && (
                <span className="block text-tp-slate-400">+ {overflow} more consultation{overflow === 1 ? "" : "s"}</span>
              )}
            </span>
          </span>
        )}
        {reasoning && (
          <span className={`block ${visibleSources.length > 0 ? "mt-[6px] border-t border-tp-slate-700 pt-[6px]" : ""}`}>
            <span className="font-semibold uppercase tracking-[0.06em] text-tp-slate-400">Why this matters</span>
            <br />
            <span className="text-white">{reasoning}</span>
          </span>
        )}
      </FloatingTooltip>
    </>
  )
}

/**
 * MedicalHistorySubheadingTag — visual tag for each medical-history group title.
 *
 * Tone-aware pill that mirrors the system's existing chip language:
 *   · primary (red)   — the headline diagnosis driving everything else
 *   · neutral (slate) — co-morbidities, surgical history, etc.
 *   · positive (green) — explicit-negative verifications (allergies / family)
 *
 * Carries a trailing ⓘ that opens the group's source + reasoning tooltip.
 */
function MedicalHistorySubheadingTag({
  group,
}: {
  group: VeloraV0MedicalHistoryGroup
}) {
  const tone = group.tone ?? "neutral"
  // Tone palette:
  //   primary   →  red  (the headline diagnosis driving everything else)
  //   neutral   →  slate (co-morbidities, surgical history, generic groups)
  //   positive  →  violet (allergy verifications + family/social — the
  //                "absence-as-data" groups; visually distinct from clinical
  //                problems so the eye reads them as context not concern)
  const toneClass =
    tone === "primary"
      ? "bg-tp-error-50 text-tp-error-700"
      : tone === "positive"
        ? "bg-tp-violet-50 text-tp-violet-700"
        : "bg-tp-slate-100 text-tp-slate-700"
  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-[4px] px-[7px] py-[3px] text-[12px] font-semibold leading-[1.35] ${toneClass}`}
    >
      <span>{group.title}</span>
      <GroupSourceTip sources={group.sources} reasoning={group.reasoning} />
    </span>
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
          <p data-mdt-anchor="window-line" className="text-[14px] leading-[1.5] text-tp-slate-600">
            <strong className="font-semibold text-tp-slate-800">{data.specialties.length} specialties</strong>
            {" "}touched this patient in the last{" "}
            <strong className="font-semibold text-tp-slate-800">{data.windowDays} days</strong>.
          </p>

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
              <div className="flex flex-col gap-[8px] pl-[2px]">
                {data.medicalHistory.map((group, gi) => {
                  const isPositive = group.tone === "positive"
                  // Join items with " | ". HighlightLine renders the pipes
                  // as styled PipeDivider glyphs (slate-200 vertical bar).
                  // Per content style: each item is `**Name** (detail, detail)`
                  // with no em-dashes anywhere in the items themselves.
                  const joinedText = group.items.map((it) => it.text).join(" | ")
                  return (
                    <div key={gi} className="flex flex-col gap-[2px]">
                      <div>
                        <MedicalHistorySubheadingTag group={group} />
                      </div>
                      <div className="ml-[2px] flex gap-[6px] pl-[8px] text-[13.5px] leading-[1.55] text-tp-slate-700">
                        <span className={`mt-[8px] inline-block h-[3px] w-[3px] shrink-0 rounded-full ${isPositive ? "bg-tp-violet-500" : "bg-tp-slate-500"}`} />
                        <span className="min-w-0 flex-1"><HighlightLine text={joinedText} /></span>
                      </div>
                    </div>
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
                  trailing={<HeaderTrailing rec={rec} />}
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
              <ul data-mdt-anchor={idx === 0 ? "specialty-body" : undefined} className="flex flex-col gap-[4px] pl-[8px] text-[14px] leading-[1.55] text-tp-slate-700">
                {rec.lines.map((line, i) => {
                  const labelMatch = line.match(/^\*\*([^*]+)\*\*:\s*(.*)$/)
                  const label = labelMatch?.[1]
                  const content = labelMatch?.[2] ?? line
                  // Hide a medications row entirely when there's nothing
                  // ongoing — see comment block above.
                  if (label && /medications?/i.test(label) && /^no ongoing\b/i.test(content)) {
                    return null
                  }
                  return (
                    <li key={i} className="flex gap-[6px]">
                      <span className="mt-[8px] inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-tp-slate-400" />
                      {/* Single inline-flow span: the label is an `inline-flex`
                          chip that floats at the start of the content, and the
                          actual text wraps naturally around it. This collapses
                          the previous two-row pattern (chip on row 1, content
                          on row 2 due to flex-wrap) into one continuous block
                          — significant vertical-space savings on narrow widths.
                          Implementation note: a wrapper `<span>` (not flex)
                          lets the chip behave like a leading inline element. */}
                      <span className="min-w-0 flex-1">
                        {label && (
                          <span className="mr-[6px] inline-flex items-center rounded-[4px] bg-tp-slate-100 px-[5px] py-[1px] align-[1px] text-[10.5px] font-semibold uppercase tracking-[0.04em] text-tp-slate-600">
                            {label}
                          </span>
                        )}
                        <HighlightLine text={content} />
                      </span>
                    </li>
                  )
                })}
              </ul>
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
    </div>
  )
}
