"use client"

import React from "react"
import { Activity, Health } from "iconsax-reactjs"
import { CardShell } from "../CardShell"
import type { VeloraV0TrendDetailData, VeloraV0TrendSeriesPoint } from "../../types"

/**
 * VeloraV0TrendDetailCard — structured card for one trend.
 *
 * Replaces the prior plain-text trend reply (a multi-line string
 * inside the assistant bubble) with a scannable card:
 *   • Header: icon + trend name + unit + cited body chip
 *   • Series: a tight table of (date · value · flag indicator)
 *   • Reference line: target / interpretation thresholds
 *   • Footer: source + guideline citation
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
      ? { chip: "bg-tp-violet-50 text-tp-violet-700", text: "text-tp-violet-600" }
      : { chip: "bg-emerald-50 text-emerald-700", text: "text-emerald-600" }
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
        {/* Category + unit header strip */}
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
          {data.whyOffered && (
            <span className="text-[11.5px] italic text-tp-slate-500">
              {data.whyOffered}
            </span>
          )}
        </div>

        {/* Series table */}
        {data.series.length > 0 ? (
          <div className="overflow-hidden rounded-[10px] border border-tp-slate-200">
            {/* Column header */}
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
        ) : (
          <p className="rounded-[10px] border border-tp-slate-200 bg-tp-slate-50/70 px-[12px] py-[10px] text-[12.5px] italic text-tp-slate-500">
            No readings on file for this trend.
          </p>
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
