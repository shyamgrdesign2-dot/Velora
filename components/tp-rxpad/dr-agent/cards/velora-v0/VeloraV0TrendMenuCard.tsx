"use client"

import React, { useRef, useState } from "react"
import { Activity, Health, InfoCircle as IconsaxInfo } from "iconsax-reactjs"
import { Info } from "lucide-react"
import { CardShell } from "../CardShell"
import { FloatingTooltip } from "./highlight"
import { TrendChartBlock } from "./VeloraV0TrendDetailCard"
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
  const latest = chip.series?.[0]
  const accentLine = chip.category === "vital" ? "#8B5CF6" : "#10B981"
  return (
    <div
      className="rounded-[12px] border bg-white p-[12px]"
      style={{ borderColor: "rgba(103,58,172,0.16)" }}
    >
      {/* Header: trend name (clickable) + latest reading */}
      <button
        type="button"
        onClick={onTap}
        title={chip.rationale}
        className="group/header flex w-full items-start justify-between gap-[8px] text-left"
      >
        <span className="flex flex-col gap-[1px]">
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
        </span>
        {latest && (
          <span className="flex flex-col items-end gap-[1px]">
            <span className="text-[14px] font-semibold leading-none text-tp-slate-700">
              {latest.value}
            </span>
            <span className="text-[10px] uppercase tracking-[0.06em] text-tp-slate-400">
              {latest.date}
            </span>
          </span>
        )}
      </button>

      {/* Chart + optional reference line — only when there's a
          series. No-series chips just show the header with
          rationale tooltip. */}
      {chip.series && chip.series.length > 0 && (
        <div className="mt-[10px]">
          <TrendChartBlock
            series={chip.series}
            unit={chip.unit}
            accentLine={accentLine}
            targetLine={chip.targetLine}
          />
        </div>
      )}
    </div>
  )
}

