"use client"

import React, { useRef, useState } from "react"
import { Activity, Health, InfoCircle as IconsaxInfo } from "iconsax-reactjs"
import { Info } from "lucide-react"
import { CardShell } from "../CardShell"
import { FloatingTooltip } from "./highlight"
import type { VeloraV0TrendMenuData } from "../../types"

/**
 * VeloraV0TrendMenuCard — the "available trends for this patient" menu.
 *
 * Two arrival paths into this card:
 *   1. The doctor opened the Recent-trends intent ("Show recent vital
 *      trends" / "Show recent lab trends" / "Show recent trends").
 *   2. The doctor asked for a specific trend that isn't on file for
 *      this patient — the guardrail fires and renders THIS card with
 *      a small banner naming what they asked for.
 *
 * In both paths the chips are the patient's actual available trends,
 * grouped by category (vital vs lab). The doctor can never land on a
 * dead end: every chip surfaces a real per-patient trend reply.
 */
export function VeloraV0TrendMenuCard({
  data,
  onPillTap,
}: {
  data: VeloraV0TrendMenuData
  onPillTap?: (message: string) => void
}) {
  const vitals = data.chips.filter((c) => c.category === "vital")
  const labs = data.chips.filter((c) => c.category === "lab")
  return (
    <CardShell
      icon={<Activity size={15} variant="Bulk" />}
      title="Recent trends"
      date={`${data.patientName}${data.patientMeta ? ` (${data.patientMeta})` : ""}`}
      dataSources={[
        "OMOP `measurement`",
        "OMOP `observation`",
        "Hospital-signed guideline panels",
      ]}
      headerExtra={<WhyTheseTrendsTip scopeReason={data.scopeReason} />}
    >
      <div className="flex flex-col gap-[10px]">
        {/* Guardrail banner — only when this card surfaces because the
            doctor's specific request didn't match an available trend. */}
        {data.guardrail && (
          <div
            className="flex items-start gap-[8px] rounded-[10px] border border-tp-warning-200/80 bg-tp-warning-50/60 px-[12px] py-[10px]"
            role="status"
          >
            <span className="mt-[1px] shrink-0 text-tp-warning-700" aria-hidden>
              <IconsaxInfo size={14} variant="Bold" />
            </span>
            <p className="text-[12.5px] leading-[1.5] text-tp-warning-800">
              <span className="font-semibold">"{data.guardrail.askedFor}"</span> isn't on
              file for {data.patientName}. Pick a trend below — every chip below
              is something Velora can actually pull from this patient's record.
            </p>
          </div>
        )}

        {/* Vital trends group */}
        {vitals.length > 0 && (
          <TrendChipGroup
            icon={<Activity size={13} variant="Bulk" />}
            label="Bedside vitals"
            chips={vitals}
            onPillTap={onPillTap}
          />
        )}

        {/* Lab trends group */}
        {labs.length > 0 && (
          <TrendChipGroup
            icon={<Health size={13} variant="Bulk" />}
            label="Lab parameters"
            chips={labs}
            onPillTap={onPillTap}
          />
        )}

        {/* Empty patient (no available trends at all). */}
        {data.chips.length === 0 && (
          <p className="rounded-[10px] border border-tp-slate-200 bg-tp-slate-50/70 px-[12px] py-[10px] text-[12.5px] italic text-tp-slate-500">
            No vital / lab trends are on file for {data.patientName} right now.
            Open the cross-consultation brief for the verbatim record.
          </p>
        )}
      </div>
    </CardShell>
  )
}

/** "Why these trends" tooltip — info-icon trigger in the CardShell
 *  header trailing slot. Hover reveals the per-patient scope reason
 *  (problem list + signed-guideline context that drives the chip
 *  selection). Moved out of always-visible inline text per design
 *  call — the chips below are the focus; the reasoning is one hover
 *  away, not on the page by default. */
function WhyTheseTrendsTip({ scopeReason }: { scopeReason: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  return (
    <>
      <span
        ref={ref}
        className="inline-flex cursor-help items-center gap-[4px] rounded-[6px] px-[6px] py-[3px] text-[11px] font-semibold text-tp-violet-700 transition-colors hover:bg-tp-violet-50"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        aria-label="Why these trends were picked for this patient"
      >
        <Info size={12} strokeWidth={2} aria-hidden />
        <span>Why these trends</span>
      </span>
      <FloatingTooltip
        open={open}
        triggerRef={ref}
        placement="top-right"
        width={320}
        className="rounded-[8px] bg-tp-slate-800 px-[12px] py-[9px] text-[11.5px] font-normal leading-[1.5] text-white shadow-xl"
      >
        <span className="block font-semibold uppercase tracking-[0.06em] text-[10px] text-tp-violet-300">
          Why these trends
        </span>
        <span className="mt-[4px] block">{scopeReason}</span>
      </FloatingTooltip>
    </>
  )
}

function TrendChipGroup({
  icon,
  label,
  chips,
  onPillTap,
}: {
  icon: React.ReactNode
  label: string
  chips: VeloraV0TrendMenuData["chips"]
  onPillTap?: (message: string) => void
}) {
  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex items-center gap-[6px] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-tp-slate-500">
        <span className="text-tp-violet-500">{icon}</span>
        <span>{label}</span>
        <span className="text-tp-slate-300">·</span>
        <span className="font-medium normal-case tracking-normal text-tp-slate-400">
          {chips.length} on file
        </span>
      </div>
      {/* Inline mini-card per trend: title + sparkline + latest
          reading. One column on narrow, two columns when the menu
          card has room. Tapping a card fires the same canned
          question the legacy pill used to fire — the doctor lands
          on the full trend-detail card. */}
      <div className="grid grid-cols-1 gap-[8px] min-[420px]:grid-cols-2">
        {chips.map((chip) => (
          <TrendMiniCard
            key={chip.id}
            chip={chip}
            onTap={() => onPillTap?.(chip.question)}
          />
        ))}
      </div>
    </div>
  )
}

/** Mini per-trend card surfaced inside the TrendMenu.
 *
 *   ┌─────────────────────────────────────┐
 *   │ Blood pressure          138/85 mmHg │
 *   │  ▁▂▃▅▇  (sparkline)     12 May '26  │
 *   │  Target per WHO HEARTS …            │
 *   └─────────────────────────────────────┘
 *
 *  Renders three shapes depending on what data is available:
 *    a) ≥ 2 numeric points → sparkline + latest reading
 *    b) 1 point            → no sparkline, just the value + date
 *    c) no series          → falls back to a quiet pill-style card
 *                            with just the label (legacy pill)
 *  All three are clickable; the click handler is the same.
 */
function TrendMiniCard({
  chip,
  onTap,
}: {
  chip: VeloraV0TrendMenuData["chips"][number]
  onTap?: () => void
}) {
  const points = chip.series ?? []
  const numerics = points.map((p) => parseTrendNumeric(p.value))
  const validPairs = points
    .map((p, i) => ({ point: p, n: numerics[i] }))
    .filter((x) => Number.isFinite(x.n))
  const hasNumeric = validPairs.length > 0
  const hasSparkline = validPairs.length >= 2

  // Latest reading — first item in the series (newest first).
  const latest = points[0]

  return (
    <button
      type="button"
      onClick={onTap}
      title={chip.rationale}
      className="velora-trend-mini group/mini flex w-full flex-col gap-[6px] rounded-[12px] px-[12px] py-[10px] text-left transition-all active:scale-[0.99]"
      style={{
        background:
          "linear-gradient(135deg, rgba(213,101,234,0.06) 0%, rgba(103,58,172,0.06) 50%, rgba(26,25,148,0.06) 100%)",
        border: "1px solid rgba(103,58,172,0.18)",
      }}
    >
      {/* Top row: label on the left, latest reading on the right. */}
      <div className="flex w-full items-start justify-between gap-[8px]">
        <span
          className="min-w-0 truncate text-[13px] font-semibold"
          style={{
            background:
              "linear-gradient(91deg, #D565EA 3%, #673AAC 67%, #1A1994 130%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {chip.label}
        </span>
        {latest && (
          <span className="shrink-0 text-right text-[13px] font-semibold leading-none text-tp-slate-700">
            {latest.value}
            {chip.unit && (
              <span className="ml-[3px] text-[10.5px] font-normal text-tp-slate-400">
                {chip.unit}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Middle row: sparkline (if ≥ 2 numeric points) OR a single
          date label (if 1 point). Hidden entirely if no series. */}
      {hasSparkline ? (
        <div className="flex items-center justify-between gap-[10px]">
          <TrendSparkline values={validPairs.map((p) => p.n)} />
          {latest && (
            <span className="shrink-0 text-[10px] uppercase tracking-[0.06em] text-tp-slate-400">
              {latest.date}
            </span>
          )}
        </div>
      ) : latest ? (
        <div className="flex items-center justify-between gap-[8px]">
          <span className="text-[10.5px] uppercase tracking-[0.06em] text-tp-slate-400">
            {hasNumeric ? "Single reading" : "Latest"}
          </span>
          <span className="shrink-0 text-[10px] uppercase tracking-[0.06em] text-tp-slate-400">
            {latest.date}
          </span>
        </div>
      ) : null}

      {/* Bottom row: optional target / reference line. */}
      {chip.targetLine && (
        <p className="text-[10.5px] leading-[1.4] text-tp-slate-500">
          {chip.targetLine}
        </p>
      )}
    </button>
  )
}

/** Pure SVG sparkline. Maps `values` (left → right, oldest → newest)
 *  to a polyline inside a 100 × 28 viewBox; auto-scales y to the
 *  min/max of the series so flat ranges (BP 130-140) still read as
 *  a curve, not a flat line at the bottom of the box. */
function TrendSparkline({ values }: { values: number[] }) {
  // Series came in newest-first; reverse for left-to-right time.
  const v = [...values].reverse()
  const n = v.length
  const W = 100
  const H = 28
  const PAD_Y = 3
  const min = Math.min(...v)
  const max = Math.max(...v)
  const range = max - min || 1
  const points = v
    .map((val, i) => {
      const x = n === 1 ? W / 2 : (i / (n - 1)) * W
      const y = H - PAD_Y - ((val - min) / range) * (H - PAD_Y * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  const lastIdx = n - 1
  const lastX = n === 1 ? W / 2 : (lastIdx / (n - 1)) * W
  const lastY = H - PAD_Y - ((v[lastIdx] - min) / range) * (H - PAD_Y * 2)
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="min-w-0 flex-1"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="velora-trend-spark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#D565EA" />
          <stop offset="60%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke="url(#velora-trend-spark)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r="2.2" fill="#4338CA" />
    </svg>
  )
}

/** Parse a free-text trend value into a number for plotting.
 *  Combo readings ("120/80", "120 / 80 mmHg") use the FIRST number
 *  — for BP that's systolic, which is the more clinically scanned
 *  half. Non-numeric values return NaN and get skipped. */
function parseTrendNumeric(value: string): number {
  if (!value) return NaN
  const match = value.match(/-?\d+(?:\.\d+)?/)
  return match ? parseFloat(match[0]) : NaN
}
