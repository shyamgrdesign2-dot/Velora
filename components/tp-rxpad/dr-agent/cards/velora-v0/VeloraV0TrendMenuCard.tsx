"use client"

import React from "react"
import { Activity, Health, InfoCircle as IconsaxInfo } from "iconsax-reactjs"
import { CardShell } from "../CardShell"
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

        {/* Scope reason — why these trends were picked for this patient. */}
        <p className="text-[12.5px] leading-[1.5] text-tp-slate-500">
          <span className="font-semibold text-tp-slate-600">Why these trends</span>
          <span className="mx-[6px] text-tp-slate-300">·</span>
          {data.scopeReason}
        </p>

        {/* Vital trends group */}
        {vitals.length > 0 && (
          <TrendChipGroup
            icon={<Activity size={13} variant="Bulk" />}
            label="Bedside vitals"
            chips={vitals}
            onPillTap={onPillTap}
            chipTone="vital"
          />
        )}

        {/* Lab trends group */}
        {labs.length > 0 && (
          <TrendChipGroup
            icon={<Health size={13} variant="Bulk" />}
            label="Lab parameters"
            chips={labs}
            onPillTap={onPillTap}
            chipTone="lab"
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
  chipTone,
}: {
  icon: React.ReactNode
  label: string
  chips: VeloraV0TrendMenuData["chips"]
  onPillTap?: (message: string) => void
  chipTone: "vital" | "lab"
}) {
  // Vital trends inherit the violet inner-content palette (matches the
  // brief card); lab trends use a complementary teal so the doctor can
  // tell the two columns apart at a glance.
  const baseChip =
    chipTone === "vital"
      ? "bg-tp-violet-50 text-tp-violet-700 ring-1 ring-tp-violet-100 hover:bg-tp-violet-100/80"
      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100/70"
  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex items-center gap-[6px] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-tp-slate-500">
        <span className={chipTone === "vital" ? "text-tp-violet-500" : "text-emerald-600"}>
          {icon}
        </span>
        <span>{label}</span>
        <span className="text-tp-slate-300">·</span>
        <span className="font-medium normal-case tracking-normal text-tp-slate-400">
          {chips.length} on file
        </span>
      </div>
      <div className="flex flex-wrap gap-[6px]">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onPillTap?.(chip.question)}
            title={chip.rationale}
            className={`inline-flex items-center gap-[5px] rounded-[8px] px-[10px] py-[5px] text-[12.5px] font-semibold transition-colors ${baseChip}`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
