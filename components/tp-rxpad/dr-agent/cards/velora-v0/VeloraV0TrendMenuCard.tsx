"use client"

import React from "react"
import { Activity, Health, InfoCircle as IconsaxInfo } from "iconsax-reactjs"
import { CardShell } from "../CardShell"
import { TrendChartBlock, ReferenceInfoTip } from "./VeloraV0TrendDetailCard"
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
    <div className="flex flex-col gap-[10px]">
      <div className="flex items-center gap-[6px] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-tp-slate-500">
        <span className="text-tp-violet-500">{icon}</span>
        <span>{label}</span>
        <span className="text-tp-slate-300">·</span>
        <span className="font-medium normal-case tracking-normal text-tp-slate-400">
          {chips.length} on file
        </span>
      </div>
      {/* Each available trend renders as a full TrendChartBlock
          (graph/table toggle, reference line, the same UI shipped
          by VeloraV0TrendDetailCard). Stacked vertically — one
          card per metric — so the doctor reads every trend without
          extra taps. The trend NAME above each block is the
          tap-target that fires the canned question (so the doctor
          can still pivot to a dedicated detail card when they
          want the full citation footer + data-sources surface). */}
      <div className="flex flex-col gap-[12px]">
        {chips.map((chip) => (
          <TrendChartCard
            key={chip.id}
            chip={chip}
            onTap={() => onPillTap?.(chip.question)}
          />
        ))}
      </div>
    </div>
  )
}

/** Full trend chart card — used inside the trend menu to show every
 *  available trend as a graph (with table toggle) instead of a tiny
 *  sparkline pill. The wrapper is a soft-violet card with the trend
 *  name + latest reading at the top; clicking that header fires the
 *  canned question to open the full detail card. */
function TrendChartCard({
  chip,
  onTap,
}: {
  chip: VeloraV0TrendMenuData["chips"][number]
  onTap?: () => void
}) {
  const accentLine = chip.category === "vital" ? "#8B5CF6" : "#10B981"
  return (
    <div
      className="rounded-[12px] border bg-white p-[12px]"
      style={{ borderColor: "rgba(103,58,172,0.16)" }}
    >
      {/* Header: trend name (clickable) + optional info-icon tooltip
          carrying the reference / target line. The latest reading
          isn't repeated here — it's already on the chart as the
          rightmost data point's value label and on the table view
          as the first row. */}
      <div className="flex items-center gap-[6px]">
        <button
          type="button"
          onClick={onTap}
          title={chip.rationale}
          className="group/header inline-flex items-baseline gap-[6px] text-left"
        >
          <span
            className="text-[14px] font-semibold transition-opacity group-hover/header:opacity-80"
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
          {chip.unit && (
            <span className="text-[10.5px] font-mono text-tp-slate-400">
              {chip.unit}
            </span>
          )}
        </button>
        {chip.targetLine && <ReferenceInfoTip targetLine={chip.targetLine} />}
      </div>

      {/* Chart — only when there's a series. No-series chips just
          show the header with rationale tooltip. */}
      {chip.series && chip.series.length > 0 && (
        <div className="mt-[10px]">
          <TrendChartBlock
            series={chip.series}
            unit={chip.unit}
            accentLine={accentLine}
          />
        </div>
      )}
    </div>
  )
}

