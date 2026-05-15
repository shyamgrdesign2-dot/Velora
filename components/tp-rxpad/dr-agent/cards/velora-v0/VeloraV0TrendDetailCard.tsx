"use client"

import React, { useMemo, useState } from "react"
import { Activity, Health } from "iconsax-reactjs"
import { CardShell } from "../CardShell"
import type { VeloraV0TrendDetailData, VeloraV0TrendSeriesPoint } from "../../types"

/**
 * VeloraV0TrendDetailCard — structured card for one trend.
 *
 * Replaces the prior plain-text trend reply (a multi-line string
 * inside the assistant bubble) with a scannable card:
 *   • Header: icon + trend name + unit + cited body chip
 *   • View toggle: Graph (default) ↔ Table
 *   • Graph view: pure-SVG line chart with tone-coloured stroke,
 *     point dots, value labels above each dot, soft horizontal
 *     reference grid lines, and a dashed target line when the
 *     registry provides a numeric threshold.
 *   • Table view: the original tight `Date · Value · Flag` table.
 *   • Reference line + citation footer below both views.
 *
 * The clinical content (every value in `series[]`) stays verbatim
 * from the patient's OMOP `measurement` / `observation` rows. AI
 * authorship for this card is bounded to picking which trend to
 * surface; nothing inside the card is LLM-authored.
 */
export function VeloraV0TrendDetailCard({ data }: { data: VeloraV0TrendDetailData }) {
  const Icon = data.category === "vital" ? Activity : Health
  const accent =
    data.category === "vital"
      ? { chip: "bg-tp-violet-50 text-tp-violet-700", text: "text-tp-violet-600", line: "#8B5CF6" }
      : { chip: "bg-emerald-50 text-emerald-700", text: "text-emerald-600", line: "#10B981" }
  const [view, setView] = useState<"graph" | "table">("graph")

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
        {/* Category + unit + view toggle */}
        <div className="flex flex-wrap items-center gap-[8px] text-[12px]">
          <span
            className={`inline-flex items-center gap-[4px] rounded-[6px] px-[8px] py-[3px] text-[11px] font-semibold uppercase tracking-[0.05em] ${accent.chip}`}
          >
            <Icon size={12} variant="Bulk" />
            {data.category === "vital" ? "Vital" : "Lab"}
          </span>
          {data.unit && (
            <span className="rounded-[6px] bg-tp-slate-100 px-[7px] py-[3px] text-[11px] font-mono text-tp-slate-600">
              {data.unit}
            </span>
          )}
          <span className="flex-1" />
          {/* Graph / Table toggle — pill switcher. Default Graph; the
              table is one tap away for the audit-style scan. */}
          {data.series.length > 0 && (
            <ViewToggle view={view} onChange={setView} />
          )}
        </div>

        {data.series.length === 0 ? (
          <p className="rounded-[10px] border border-tp-slate-200 bg-tp-slate-50/70 px-[12px] py-[10px] text-[12.5px] italic text-tp-slate-500">
            No readings on file for this trend.
          </p>
        ) : view === "graph" ? (
          <TrendLineChart series={data.series} unit={data.unit} accentLine={accent.line} />
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-tp-slate-200">
            <div className="grid grid-cols-[110px_1fr_auto] items-center gap-[8px] border-b border-tp-slate-100 bg-tp-slate-50/60 px-[12px] py-[6px] text-[10.5px] font-semibold uppercase tracking-[0.05em] text-tp-slate-500">
              <span>Date</span>
              <span>Value</span>
              <span>Flag</span>
            </div>
            <ul className="divide-y divide-tp-slate-100">
              {data.series.map((p, i) => (
                <TrendRow key={i} point={p} isLatest={i === 0} accentText={accent.text} />
              ))}
            </ul>
          </div>
        )}

        {/* Reference / target line */}
        {data.targetLine && (
          <div className="flex items-start gap-[6px] rounded-[8px] bg-tp-slate-50 px-[10px] py-[7px] text-[12px] leading-[1.5] text-tp-slate-600">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-tp-slate-500">
              Reference
            </span>
            <span className="text-tp-slate-300">·</span>
            <span>{data.targetLine}</span>
          </div>
        )}

        {/* Citation footer */}
        {data.citation && (
          <div className="flex items-center gap-[6px] text-[11px] text-tp-slate-500">
            <span className="font-semibold uppercase tracking-[0.06em] text-tp-slate-400">
              Source
            </span>
            <span className="text-tp-slate-300">·</span>
            <span className="font-semibold text-tp-slate-700">{data.citation.body}</span>
            {data.citation.year && (
              <>
                <span className="text-tp-slate-300">·</span>
                <span>{data.citation.year}</span>
              </>
            )}
            {data.citation.section && (
              <>
                <span className="text-tp-slate-300">·</span>
                <span className="italic">{data.citation.section}</span>
              </>
            )}
          </div>
        )}
      </div>
    </CardShell>
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
  if (flag === "alert") return "#EF4444"   // tp-error-500
  if (flag === "warn") return "#F59E0B"    // tp-warning-500
  if (flag === "ok") return "#10B981"      // tp-success-500
  return "#94A3B8"                          // tp-slate-400
}

/**
 * TrendLineChart — pure-SVG line chart for a Velora trend series.
 *
 *   • X-axis: dates (oldest → newest, left → right). The series
 *     comes in newest-first per OMOP convention so we reverse.
 *   • Y-axis: numeric values from `point.value` (combo readings
 *     like "120/80" plot the first number — systolic for BP).
 *     Auto-scaled to the series' own min/max with a 10 % pad so
 *     flat ranges still read as a curve.
 *   • Line: tone-coloured. Dominant flag across the series picks
 *     the line tone (alert > warn > ok > neutral). Each dot is
 *     painted in its own per-point flag colour.
 *   • Labels: value above each dot.
 *   • Grid: three soft slate-100 horizontal dashes at y-axis ticks.
 *   • Edges: bottom + left axis lines.
 *
 * Designed to scale gracefully — uses a fixed 360 × 160 internal
 * viewBox with preserveAspectRatio so it fills the available
 * column width via the wrapping `<div>`.
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
  // Reverse for left-to-right time. Filter to numeric-parseable
  // points; non-numeric reads (rare combo formats) drop out of
  // the chart and stay visible in the table view.
  const numericSeries = useMemo(() => {
    return [...series]
      .reverse()
      .map((p) => ({ ...p, n: parseTrendNumeric(p.value) }))
      .filter((p) => Number.isFinite(p.n))
  }, [series])

  // Dimensions
  const W = 360
  const H = 180
  const PAD_LEFT = 32
  const PAD_RIGHT = 16
  const PAD_TOP = 22       // room for value labels above dots
  const PAD_BOTTOM = 28    // room for x-axis date labels
  const plotW = W - PAD_LEFT - PAD_RIGHT
  const plotH = H - PAD_TOP - PAD_BOTTOM

  // Y range — auto with 10 % padding either side
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

  // Dominant flag → line stroke colour
  const dominant = dominantFlag(series)
  const lineColor = dominant === "alert" ? "#EF4444"
    : dominant === "warn" ? "#F59E0B"
    : dominant === "ok" ? "#10B981"
    : accentLine

  // Path data
  const linePath = numericSeries
    .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.n).toFixed(1)}`)
    .join(" ")

  // Y-axis tick rows (3 mid lines)
  const yTicks = 3
  const yTickValues = Array.from({ length: yTicks }, (_, k) => yMin + ((k + 1) / (yTicks + 1)) * (yMax - yMin))

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
            {/* Soft area fill under the curve for depth. */}
            <linearGradient id={`trend-area-${dominant}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal reference grid lines (dashed, slate-100) */}
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
              <text
                x={PAD_LEFT - 6}
                y={yAt(v) + 3}
                textAnchor="end"
                fontSize="9"
                fill="#94A3B8"
              >
                {formatTick(v)}
              </text>
            </g>
          ))}

          {/* Bottom + left axis lines */}
          <line x1={PAD_LEFT} y1={H - PAD_BOTTOM} x2={W - PAD_RIGHT} y2={H - PAD_BOTTOM} stroke="#E2E8F0" />
          <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={H - PAD_BOTTOM} stroke="#E2E8F0" />

          {/* Area fill */}
          <path
            d={`${linePath} L${xAt(numericSeries.length - 1).toFixed(1)},${H - PAD_BOTTOM} L${xAt(0).toFixed(1)},${H - PAD_BOTTOM} Z`}
            fill={`url(#trend-area-${dominant})`}
          />

          {/* Line stroke */}
          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots + value labels + x-axis date labels */}
          {numericSeries.map((p, i) => {
            const x = xAt(i)
            const y = yAt(p.n)
            const dot = flagColor(p.flag)
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="3.2" fill="white" stroke={dot} strokeWidth="1.8" />
                <text
                  x={x}
                  y={y - 7}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill={lineColor}
                >
                  {p.value}
                </text>
                <text
                  x={x}
                  y={H - PAD_BOTTOM + 14}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#94A3B8"
                >
                  {shortDate(p.date)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend / unit */}
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

/** Pick the most clinically loud flag across the series — drives
 *  the line stroke tone so the doctor reads the chart's overall
 *  status at a glance. alert > warn > ok > neutral. */
function dominantFlag(series: VeloraV0TrendSeriesPoint[]): "alert" | "warn" | "ok" | "none" {
  if (series.some((p) => p.flag === "alert")) return "alert"
  if (series.some((p) => p.flag === "warn")) return "warn"
  if (series.some((p) => p.flag === "ok")) return "ok"
  return "none"
}

/** Format a numeric y-axis tick — strip trailing zeros, cap to 1
 *  decimal for readability. */
function formatTick(v: number): string {
  if (!Number.isFinite(v)) return ""
  if (Math.abs(v) >= 100) return v.toFixed(0)
  return v.toFixed(1).replace(/\.0$/, "")
}

/** Shrink a verbose date string like "12 May '26" to "12 May" so
 *  the x-axis labels don't collide on narrow widths. */
function shortDate(date: string): string {
  return date.replace(/\s*'\d{2}\s*$/, "").trim()
}

function TrendRow({
  point,
  isLatest,
  accentText,
}: {
  point: VeloraV0TrendSeriesPoint
  isLatest: boolean
  accentText: string
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
          className={`font-semibold ${isLatest ? accentText : "text-tp-slate-800"}`}
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
