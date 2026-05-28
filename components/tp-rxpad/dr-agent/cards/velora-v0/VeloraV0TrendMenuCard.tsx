"use client"

import React, { useMemo, useState } from "react"
import { Activity, Health, InfoCircle as IconsaxInfo, SearchNormal1 } from "iconsax-reactjs"
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
/**
 * Default-view top-N. When the doctor lands on the menu without
 * searching, we show only this many trends per category — ranked
 * abnormal-first, then by recency — so a patient with twenty labs
 * on file doesn't dump every chart into the chat at once.
 */
const DEFAULT_VISIBLE_PER_CATEGORY = 5

export function VeloraV0TrendMenuCard({
  data,
  onPillTap,
}: {
  data: VeloraV0TrendMenuData
  onPillTap?: (message: string) => void
}) {
  const [search, setSearch] = useState("")
  const trimmed = search.trim().toLowerCase()

  // Filter / rank. When the doctor has typed anything, return every
  // chip whose label substring-matches the query (no top-N cap so
  // they always see what they're looking for). When the search box
  // is empty, fall back to "abnormal first, then most recent, top 5
  // per category" so the default view stays scannable.
  const { vitals, labs } = useMemo(() => {
    let pool = data.chips
    if (trimmed) {
      pool = pool.filter((c) => c.label.toLowerCase().includes(trimmed))
    }
    const ranked = [...pool].sort(rankByAbnormalThenRecent)
    if (!trimmed) {
      const v: typeof pool = []
      const l: typeof pool = []
      for (const c of ranked) {
        if (c.category === "vital" && v.length < DEFAULT_VISIBLE_PER_CATEGORY) v.push(c)
        else if (c.category === "lab" && l.length < DEFAULT_VISIBLE_PER_CATEGORY) l.push(c)
      }
      return { vitals: v, labs: l }
    }
    return {
      vitals: ranked.filter((c) => c.category === "vital"),
      labs: ranked.filter((c) => c.category === "lab"),
    }
  }, [data.chips, trimmed])

  const hasResults = vitals.length > 0 || labs.length > 0
  const totalAvailable = data.chips.length

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

        {/* Search input — filters the trends list by name. Default
            view (empty input) shows top-N abnormal-first per
            category; typing relaxes the cap and substring-matches. */}
        {totalAvailable > 0 && (
          <TrendSearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${totalAvailable} trend${totalAvailable === 1 ? "" : "s"} for ${data.patientName.split(" ")[0]}…`}
          />
        )}

        {/* Vital trends group — only render the heading if we have
            visible chips in this category. */}
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

        {/* No-results state — split between "you typed and nothing
            matched" and "patient has nothing at all". */}
        {!hasResults && totalAvailable > 0 && (
          <p className="rounded-[10px] border border-dashed border-tp-slate-200 bg-tp-slate-50/70 px-[12px] py-[10px] text-center text-[12.5px] italic text-tp-slate-500">
            No trends match <span className="not-italic font-semibold text-tp-slate-700">"{search.trim()}"</span> for {data.patientName}.
          </p>
        )}
        {totalAvailable === 0 && (
          <p className="rounded-[10px] border border-tp-slate-200 bg-tp-slate-50/70 px-[12px] py-[10px] text-[12.5px] italic text-tp-slate-500">
            No vital / lab trends are on file for {data.patientName} right now.
            Open the cross-consultation brief for the verbatim record.
          </p>
        )}

        {/* "Showing N of M" footer — only visible in the default
            (no-search) state when the cap actually trimmed the list,
            so the doctor knows there's more behind the search box. */}
        {!trimmed && hasResults && totalAvailable > vitals.length + labs.length && (
          <p className="text-center text-[11px] text-tp-slate-400">
            Showing {vitals.length + labs.length} of {totalAvailable}.
            Type above to search the rest.
          </p>
        )}
      </div>
    </CardShell>
  )
}

/** Search input matching the rest of the Velora chrome — slate-200
 *  border, slate-300 placeholder, blue focus ring. */
function TrendSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (next: string) => void
  placeholder: string
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-tp-slate-400">
        <SearchNormal1 size={14} variant="Linear" />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-[10px] border border-tp-slate-200 bg-white py-[8px] pl-[32px] pr-[10px] text-[12.5px] text-tp-slate-800 placeholder:text-tp-slate-400 focus:border-tp-blue-500 focus:outline-none focus:ring-2 focus:ring-tp-blue-100"
        aria-label="Search trends"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-[8px] top-1/2 -translate-y-1/2 rounded-[4px] px-[6px] py-[2px] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-tp-slate-400 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-600"
        >
          Clear
        </button>
      )}
    </div>
  )
}

/** Sort comparator: trends with abnormal recent flags float to the
 *  top; among equal-priority trends, the more recently-dated one
 *  comes first. We approximate "recency" with the index of the
 *  series array since the trend registry stores newest-first. */
function rankByAbnormalThenRecent(
  a: VeloraV0TrendMenuData["chips"][number],
  b: VeloraV0TrendMenuData["chips"][number],
): number {
  const aScore = abnormalScore(a)
  const bScore = abnormalScore(b)
  if (aScore !== bScore) return bScore - aScore
  // Tie-breaker: more readings = surface first (proxy for recency).
  return (b.series?.length ?? 0) - (a.series?.length ?? 0)
}

function abnormalScore(chip: VeloraV0TrendMenuData["chips"][number]): number {
  if (!chip.series) return 0
  let score = 0
  for (const p of chip.series) {
    if (p.flag === "alert") score += 3
    else if (p.flag === "warn") score += 1
  }
  return score
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

