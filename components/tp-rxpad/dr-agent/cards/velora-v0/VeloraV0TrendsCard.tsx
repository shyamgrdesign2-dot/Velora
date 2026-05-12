"use client"

import React from "react"
import { Chart21 } from "iconsax-reactjs"
import { FlagArrow } from "../../shared/FlagArrow"
import { CardShell } from "../CardShell"
import { SectionSummaryBar } from "../SectionSummaryBar"
import { GuidelineChip } from "./VeloraStack"
import { InfoTip } from "./highlight"
import type { VeloraV0Trend, VeloraV0TrendsData } from "../../types"

/**
 * Trends sub-intent card — surfaces the top-N most cross-team-relevant trends
 * for the patient as inline sparklines. Each row carries:
 *   · the metric name + an info tooltip naming the cited body
 *   · current value with FlagArrow tone
 *   · a small SVG sparkline with a dashed target line
 *   · a one-line "why picked" sentence tying back to Stack 1 of the MDT brief
 *
 * Selection rule (data-driven, no LLM authoring):
 *   1. Start with metrics flagged abnormal in the most recent MDT brief.
 *   2. Rank by cross-specialty relevance — labs that appear in ≥2 specialty
 *      sections out-rank single-specialty labs.
 *   3. Cap at N (default 3). The reasoning per row is generated from the
 *      selector trace, not free text.
 */

function formatPatientLine(name: string, meta: string) {
  const trimmed = meta.split("·")[0]?.trim() ?? meta
  return `${name} (${trimmed})`
}

/** Inline SVG sparkline — values map to a polyline, target draws a dashed line. */
function Sparkline({ trend, width = 320, height = 60 }: { trend: VeloraV0Trend; width?: number; height?: number }) {
  const { values, threshold, tone } = trend
  if (values.length === 0) return null
  const lo = Math.min(...values, ...(threshold !== undefined ? [threshold] : []))
  const hi = Math.max(...values, ...(threshold !== undefined ? [threshold] : []))
  const range = hi - lo || 1
  const padX = 6
  const padY = 8
  const innerW = width - padX * 2
  const innerH = height - padY * 2
  const coords = values.map((v, i) => {
    const x = padX + (innerW * i) / Math.max(values.length - 1, 1)
    const y = padY + innerH - ((v - lo) / range) * innerH
    return { x, y, v }
  })
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ")
  const targetY = threshold !== undefined ? padY + innerH - ((threshold - lo) / range) * innerH : null
  const stroke = tone === "alert" ? "#DC2626" : tone === "warn" ? "#D97706" : "#10B981"
  const fillBase = tone === "alert" ? "rgba(220,38,38,0.08)" : tone === "warn" ? "rgba(217,119,6,0.08)" : "rgba(16,185,129,0.08)"
  const areaPath =
    `M ${coords[0].x},${padY + innerH} ` +
    coords.map((c) => `L ${c.x},${c.y}`).join(" ") +
    ` L ${coords[coords.length - 1].x},${padY + innerH} Z`

  return (
    <svg width={width} height={height} className="block">
      {/* Soft area under the line for visual weight */}
      <path d={areaPath} fill={fillBase} />
      {/* Target / threshold line */}
      {targetY !== null && (
        <line
          x1={padX}
          x2={width - padX}
          y1={targetY}
          y2={targetY}
          stroke="#94A3B8"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
      )}
      {/* Trend line */}
      <polyline points={polyline} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {/* Data points */}
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 3 : 2.2} fill={stroke} />
      ))}
      {/* Latest-value label above the last point */}
      <text
        x={coords[coords.length - 1].x - 3}
        y={Math.max(coords[coords.length - 1].y - 6, 10)}
        textAnchor="end"
        fontSize="10"
        fontWeight="600"
        fill={stroke}
      >
        {trend.currentValue}
      </text>
    </svg>
  )
}

function TrendRow({ trend }: { trend: VeloraV0Trend }) {
  const valueClass =
    trend.tone === "alert"
      ? "text-tp-error-600"
      : trend.tone === "warn"
        ? "text-tp-warning-700"
        : "text-emerald-600"
  return (
    <div className="flex flex-col gap-[6px] rounded-[8px] border border-tp-slate-100 bg-white px-[10px] py-[8px]">
      {/* Heading row: label + InfoTip (target) | value with FlagArrow | guideline chip */}
      <div className="flex items-baseline justify-between gap-[8px]">
        <span className="flex items-center gap-[5px] text-[14px] font-semibold text-tp-slate-900">
          <span>{trend.label}</span>
          <span className="text-tp-slate-400">·</span>
          <span className="text-[12px] font-normal text-tp-slate-500">{trend.unit}</span>
          {trend.thresholdLabel && <InfoTip text={trend.thresholdLabel} />}
        </span>
        <span className={`inline-flex items-baseline gap-[3px] text-[15px] font-semibold ${valueClass}`}>
          {(trend.tone === "alert" || trend.tone === "warn") && <FlagArrow flag="high" />}
          <span>{trend.currentValue}</span>
        </span>
      </div>

      {/* Sparkline */}
      <div className="w-full">
        <Sparkline trend={trend} />
      </div>

      {/* Axis label row — short dates under the spark, plus the trajectory summary */}
      <div className="flex items-center justify-between gap-[8px] text-[11px] text-tp-slate-500">
        <span>{trend.dates[0]} → {trend.dates[trend.dates.length - 1]}</span>
        {trend.trajectory && <span className="italic">{trend.trajectory}</span>}
      </div>

      {/* Why-picked + guideline chip */}
      <div className="flex items-start justify-between gap-[8px] border-t border-tp-slate-100 pt-[5px]">
        <p className="text-[12px] leading-[1.5] text-tp-slate-600">
          <span className="font-semibold text-tp-slate-700">Why picked: </span>
          {trend.whyPicked}
        </p>
        <GuidelineChip {...trend.guideline} />
      </div>
    </div>
  )
}

export function VeloraV0TrendsCard({ data }: { data: VeloraV0TrendsData }) {
  const patientLine = formatPatientLine(data.patientName, data.patientMeta)
  return (
    <CardShell
      icon={<Chart21 size={15} variant="Bulk" />}
      title="Trends"
      date={`Top ${data.trends.length} cross-team trends · ${patientLine}`}
      dataSources={[
        "Measurement (last 24 months)",
        "Reference range registry",
        "MDT brief Stack 1 (flagged values)",
      ]}
    >
      <div className="flex flex-col gap-[10px]">
        <p className="text-[14px] leading-[1.5] text-tp-slate-600">
          {data.selectionReason}
        </p>

        <SectionSummaryBar label="Selected metrics" icon="medical-report" />

        <div className="flex flex-col gap-[8px]">
          {data.trends.map((t, i) => (
            <TrendRow key={i} trend={t} />
          ))}
        </div>

        <p className="rounded-[8px] bg-tp-violet-50/70 px-[10px] py-[7px] text-[13px] leading-[1.5] text-tp-violet-700">
          <span className="font-semibold">Defence: </span>
          Velora picks <em>which</em> metrics to chart based on Stack 1 flags + cross-team relevance.
          Targets and tone colour come from the cited guideline body — not the LLM.
        </p>
      </div>
    </CardShell>
  )
}
