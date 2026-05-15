"use client"

import React, { useMemo, useState } from "react"
import { Activity, Health } from "iconsax-reactjs"
import { CardShell } from "../CardShell"
import type { VeloraV0TrendDetailData, VeloraV0TrendSeriesPoint } from "../../types"

/**
 * VeloraV0TrendDetailCard — structured card for ONE trend.
 *
 *   • Header: icon + trend name + patient name
 *   • Body: Graph (default) ↔ Table toggle. Graph is a pure-SVG
 *     line chart; table is a tight Date · Value · Flag list.
 *     Reference / target line below the body.
 *
 * The legacy "LAB" / "VITAL" chip + unit pill + source citation
 * footer were removed per design call — the graph legend already
 * shows the unit, and the audit trail lives in the per-card data
 * sources tooltip on the CardShell header.
 *
 * The clinical content (every value in `series[]`) stays verbatim
 * from the patient's OMOP `measurement` / `observation` rows. AI
 * authorship is bounded to picking which trend to surface.
 */
export function VeloraV0TrendDetailCard({ data }: { data: VeloraV0TrendDetailData }) {
  const Icon = data.category === "vital" ? Activity : Health
  const accentLine = data.category === "vital" ? "#8B5CF6" : "#10B981"
  return (
    <CardShell
      icon={<Icon size={15} variant="Bulk" />}
      title={`${data.trendName} trend`}
      date={`${data.patientName}${data.patientMeta ? ` · ${data.patientMeta}` : ""}`}
      dataSources={[
        "OMOP `measurement`",
        "OMOP `observation`",
        data.citation
          ? `${data.citation.body}${data.citation.year ? ` · ${data.citation.year}` : ""}`
          : "Hospital-signed guideline",
      ]}
    >
      <div className="flex flex-col gap-[10px]">
        <TrendChartBlock
          series={data.series}
          unit={data.unit}
          accentLine={accentLine}
          targetLine={data.targetLine}
        />
      </div>
    </CardShell>
  )
}

/**
 * TrendChartBlock — reusable chart + toggle + (optional) reference
 * line. Used by VeloraV0TrendDetailCard for the single-trend view
 * and by VeloraV0TrendMenuCard so every available trend in the
 * "Recent vital / lab trends" menu shows the same full chart UI
 * instead of a tiny sparkline.
 *
 * Renders three shapes depending on the data:
 *   • ≥ 2 numeric points → Graph (default) / Table toggle
 *   • 1 point             → Single-reading callout (no toggle)
 *   • 0 points            → "No readings on file" placeholder
 */
export function TrendChartBlock({
  series,
  unit,
  accentLine,
  targetLine,
}: {
  series: VeloraV0TrendSeriesPoint[]
  unit?: string
  accentLine: string
  targetLine?: string
}) {
  const [view, setView] = useState<"graph" | "table">("graph")
  const numericCount = series.reduce(
    (n, p) => (Number.isFinite(parseTrendNumeric(p.value)) ? n + 1 : n),
    0,
  )
  const canChart = numericCount >= 2

  if (series.length === 0) {
    return (
      <p className="rounded-[10px] border border-tp-slate-200 bg-tp-slate-50/70 px-[12px] py-[10px] text-[12.5px] italic text-tp-slate-500">
        No readings on file for this trend.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-[8px]">
      {/* Graph / Table toggle — only when there are enough numeric
          points to draw a chart. Single-reading trends skip the
          toggle (nothing to switch to). */}
      {canChart && (
        <div className="flex items-center justify-end">
          <ViewToggle view={view} onChange={setView} />
        </div>
      )}

      {canChart && view === "graph" ? (
        <TrendLineChart series={series} unit={unit} accentLine={accentLine} />
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-tp-slate-200">
          <div className="grid grid-cols-[110px_1fr_auto] items-center gap-[8px] border-b border-tp-slate-100 bg-tp-slate-50/60 px-[12px] py-[6px] text-[10.5px] font-semibold uppercase tracking-[0.05em] text-tp-slate-500">
            <span>Date</span>
            <span>Value</span>
            <span>Flag</span>
          </div>
          <ul className="divide-y divide-tp-slate-100">
            {series.map((p, i) => (
              <TrendRow key={i} point={p} isLatest={i === 0} accentLineColor={accentLine} />
            ))}
          </ul>
        </div>
      )}

      {/* Reference / target line, when the registry provides one. */}
      {targetLine && (
        <div className="flex items-start gap-[6px] rounded-[8px] bg-tp-slate-50 px-[10px] py-[7px] text-[12px] leading-[1.5] text-tp-slate-600">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-tp-slate-500">
            Reference
          </span>
          <span className="text-tp-slate-300">·</span>
          <span>{targetLine}</span>
        </div>
      )}
    </div>
  )
}

/** Pill-style segmented switcher — Graph | Table. */
function ViewToggle({
  view,
  onChange,
}: {
  view: "graph" | "table"
  onChange: (next: "graph" | "table") => void
}) {
  return (
    <div className="relative inline-flex h-[26px] rounded-[7px] bg-tp-slate-100 p-[2px]">
      <span
        className="pointer-events-none absolute top-[2px] h-[22px] w-[calc(50%-2px)] rounded-[5px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-out"
        style={{ transform: view === "graph" ? "translateX(0px)" : "translateX(100%)" }}
        aria-hidden
      />
      <button
        type="button"
        onClick={() => onChange("graph")}
        className={`relative z-10 flex items-center gap-[4px] rounded-[5px] px-[12px] text-[12px] font-medium transition-colors ${
          view === "graph" ? "text-tp-slate-800" : "text-tp-slate-400"
        }`}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0" aria-hidden>
          <path d="M1 10L4 5L7 7L11 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Graph
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`relative z-10 flex items-center gap-[4px] rounded-[5px] px-[12px] text-[12px] font-medium transition-colors ${
          view === "table" ? "text-tp-slate-800" : "text-tp-slate-400"
        }`}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0" aria-hidden>
          <path d="M2 3h8M2 6h6M2 9h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Table
      </button>
    </div>
  )
}

/** Parse a free-text trend value into a number for plotting.
 *  Combo readings like "120/80" use the FIRST number — for BP
 *  that's systolic, the more clinically scanned half. */
function parseTrendNumeric(value: string): number {
  if (!value) return NaN
  const match = value.match(/-?\d+(?:\.\d+)?/)
  return match ? parseFloat(match[0]) : NaN
}

/** Map a series-point flag to the SVG stroke colour used for
 *  the dot + line segment ending at that point. */
function flagColor(flag?: "ok" | "warn" | "alert"): string {
  if (flag === "alert") return "#EF4444"
  if (flag === "warn") return "#F59E0B"
  if (flag === "ok") return "#10B981"
  return "#94A3B8"
}

/**
 * TrendLineChart — pure-SVG line chart for a Velora trend series.
 *
 *   • X-axis: dates (oldest → newest, left → right).
 *   • Y-axis: numeric values; auto-scaled with 10/18 % pad.
 *   • Line: tone-coloured. Dominant flag across series picks the
 *     stroke tone (alert > warn > ok > neutral). Each dot uses its
 *     own per-point flag colour.
 *   • Labels: value above each dot, short date below the x-axis.
 *   • Grid: 3 soft slate-100 dashed gridlines.
 *
 * Fixed 360 × 180 viewBox; scales to fill the wrapping column.
 */
function TrendLineChart({
  series,
  unit,
  accentLine,
}: {
  series: VeloraV0TrendSeriesPoint[]
  unit?: string
  accentLine: string
}) {
  const numericSeries = useMemo(() => {
    return [...series]
      .reverse()
      .map((p) => ({ ...p, n: parseTrendNumeric(p.value) }))
      .filter((p) => Number.isFinite(p.n))
  }, [series])

  const W = 360
  const H = 180
  const PAD_LEFT = 32
  const PAD_RIGHT = 16
  const PAD_TOP = 22
  const PAD_BOTTOM = 28
  const plotW = W - PAD_LEFT - PAD_RIGHT
  const plotH = H - PAD_TOP - PAD_BOTTOM

  const values = numericSeries.map((p) => p.n)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const range = rawMax - rawMin || Math.abs(rawMax) * 0.1 || 1
  const yMin = rawMin - range * 0.10
  const yMax = rawMax + range * 0.18

  const xAt = (i: number) =>
    numericSeries.length === 1
      ? PAD_LEFT + plotW / 2
      : PAD_LEFT + (i / (numericSeries.length - 1)) * plotW
  const yAt = (v: number) =>
    PAD_TOP + plotH - ((v - yMin) / (yMax - yMin)) * plotH

  const dominant = dominantFlag(series)
  const lineColor = dominant === "alert" ? "#EF4444"
    : dominant === "warn" ? "#F59E0B"
    : dominant === "ok" ? "#10B981"
    : accentLine

  const linePath = numericSeries
    .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.n).toFixed(1)}`)
    .join(" ")

  const yTicks = 3
  const yTickValues = Array.from({ length: yTicks }, (_, k) => yMin + ((k + 1) / (yTicks + 1)) * (yMax - yMin))
  const gradId = useMemo(() => `trend-area-${Math.random().toString(36).slice(2, 8)}`, [])

  return (
    <div className="rounded-[10px] border border-tp-slate-200 bg-white px-[8px] pt-[10px] pb-[8px]">
      <div className="-mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ minWidth: 280, maxWidth: "100%", height: "auto" }}
          role="img"
          aria-label={`Line chart of ${numericSeries.length} readings`}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTickValues.map((v, k) => (
            <g key={k}>
              <line
                x1={PAD_LEFT}
                y1={yAt(v)}
                x2={W - PAD_RIGHT}
                y2={yAt(v)}
                stroke="#F1F5F9"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text x={PAD_LEFT - 6} y={yAt(v) + 3} textAnchor="end" fontSize="9" fill="#94A3B8">
                {formatTick(v)}
              </text>
            </g>
          ))}

          <line x1={PAD_LEFT} y1={H - PAD_BOTTOM} x2={W - PAD_RIGHT} y2={H - PAD_BOTTOM} stroke="#E2E8F0" />
          <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={H - PAD_BOTTOM} stroke="#E2E8F0" />

          <path
            d={`${linePath} L${xAt(numericSeries.length - 1).toFixed(1)},${H - PAD_BOTTOM} L${xAt(0).toFixed(1)},${H - PAD_BOTTOM} Z`}
            fill={`url(#${gradId})`}
          />

          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {numericSeries.map((p, i) => {
            const x = xAt(i)
            const y = yAt(p.n)
            const dot = flagColor(p.flag)
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="3.2" fill="white" stroke={dot} strokeWidth="1.8" />
                <text x={x} y={y - 7} textAnchor="middle" fontSize="10" fontWeight="600" fill={lineColor}>
                  {p.value}
                </text>
                <text x={x} y={H - PAD_BOTTOM + 14} textAnchor="middle" fontSize="10" fill="#94A3B8">
                  {shortDate(p.date)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {unit && (
        <div className="mt-[4px] flex items-center justify-end gap-[6px] px-[2px] text-[10.5px] text-tp-slate-500">
          <span
            className="inline-block h-[2px] w-[14px] rounded-full"
            style={{ background: lineColor }}
            aria-hidden
          />
          <span className="font-mono">{unit}</span>
        </div>
      )}
    </div>
  )
}

function dominantFlag(series: VeloraV0TrendSeriesPoint[]): "alert" | "warn" | "ok" | "none" {
  if (series.some((p) => p.flag === "alert")) return "alert"
  if (series.some((p) => p.flag === "warn")) return "warn"
  if (series.some((p) => p.flag === "ok")) return "ok"
  return "none"
}

function formatTick(v: number): string {
  if (!Number.isFinite(v)) return ""
  if (Math.abs(v) >= 100) return v.toFixed(0)
  return v.toFixed(1).replace(/\.0$/, "")
}

function shortDate(date: string): string {
  return date.replace(/\s*'\d{2}\s*$/, "").trim()
}

function TrendRow({
  point,
  isLatest,
  accentLineColor,
}: {
  point: VeloraV0TrendSeriesPoint
  isLatest: boolean
  accentLineColor: string
}) {
  const dotClass =
    point.flag === "alert"
      ? "bg-tp-error-500"
      : point.flag === "warn"
        ? "bg-tp-warning-500"
        : point.flag === "ok"
          ? "bg-tp-success-500"
          : "bg-tp-slate-300"
  const flagLabelClass =
    point.flag === "alert"
      ? "text-tp-error-700"
      : point.flag === "warn"
        ? "text-tp-warning-700"
        : point.flag === "ok"
          ? "text-tp-success-700"
          : "text-tp-slate-500"
  return (
    <li className="grid grid-cols-[110px_1fr_auto] items-center gap-[8px] px-[12px] py-[7px] text-[13px]">
      <span className="font-mono text-[11.5px] text-tp-slate-500">{point.date}</span>
      <span className="flex items-center gap-[8px]">
        <span className={`inline-block h-[7px] w-[7px] shrink-0 rounded-full ${dotClass}`} aria-hidden />
        <span
          className="font-semibold"
          style={{ color: isLatest ? accentLineColor : "var(--tp-slate-800, #1E293B)" }}
        >
          {point.value}
        </span>
      </span>
      <span className={`text-[11.5px] font-medium ${flagLabelClass}`}>
        {point.flagLabel ?? (point.flag === "alert" ? "out of target" : point.flag === "warn" ? "borderline" : point.flag === "ok" ? "in range" : "—")}
      </span>
    </li>
  )
}
