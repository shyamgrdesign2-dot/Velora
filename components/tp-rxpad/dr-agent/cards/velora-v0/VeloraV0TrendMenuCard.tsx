"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Activity, InfoCircle as IconsaxInfo, SearchNormal1 } from "iconsax-reactjs"
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
      title={`Recent ${categoryWord(data.chips)}`}
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
            view (empty input) shows top-N abnormal-first; typing
            relaxes the cap and substring-matches. Focusing the
            input opens a dropdown of every trend on file for this
            patient (with abnormal trends pinned to the top) so the
            doctor can quick-pick without typing.
            Placeholder is category-aware: "lab trends" when the
            menu only carries lab chips (Recent-lab-trends intent),
            "vital trends" when only vitals, generic "trends" when
            mixed. Reads as the category the doctor just asked for. */}
        {totalAvailable > 0 && (
          <TrendSearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${categoryWord(data.chips)} for ${data.patientName.split(" ")[0]}…`}
            suggestions={[...data.chips].sort(rankByAbnormalThenRecent)}
          />
        )}

        {/* Result list — vitals first, then labs. No group heading
            (the per-card colour gradient on each trend name is the
            visual anchor; an ALL-CAPS "BEDSIDE VITALS" pill on top
            was reading as filler). */}
        {(vitals.length > 0 || labs.length > 0) && (
          <TrendChipGroup
            chips={[...vitals, ...labs]}
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

/** Search input + focus dropdown.
 *
 *   • Slate-200 border, blue focus ring, search icon on the left,
 *     "Clear" button on the right when populated.
 *   • Focusing the input opens a dropdown of every trend on file
 *     for this patient (sorted abnormal-first by the parent). The
 *     doctor can tap any row to set the search to that label —
 *     filtering the result list below to a single trend without
 *     typing. Outside-click and Escape close the dropdown.
 *   • Each suggestion row shows the trend name (gradient text on
 *     the Velora AI palette) + unit. A subtle "ABNORMAL" tag pins
 *     to the right of rows whose series carries any alert / warn
 *     flag, so the dropdown doubles as a triage shortcut. */
function TrendSearchInput({
  value,
  onChange,
  placeholder,
  suggestions,
}: {
  value: string
  onChange: (next: string) => void
  placeholder: string
  suggestions: VeloraV0TrendMenuData["chips"]
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Outside-click + Escape closes the dropdown.
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={wrapperRef} className="relative">
      <span className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-tp-slate-400">
        <SearchNormal1 size={14} variant="Linear" />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          // Re-open the dropdown if the doctor starts retyping after
          // a previous outside-click closed it.
          if (!open) setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="block w-full rounded-[10px] border border-tp-slate-200 bg-white py-[8px] pl-[32px] pr-[10px] text-[12.5px] text-tp-slate-800 placeholder:text-tp-slate-400 focus:border-tp-blue-500 focus:outline-none focus:ring-2 focus:ring-tp-blue-100"
        aria-label="Search trends"
        aria-expanded={open}
        aria-haspopup="listbox"
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

      {/* Suggestion dropdown */}
      {open && suggestions.length > 0 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-[4px] max-h-[260px] overflow-y-auto rounded-[10px] border border-tp-slate-200 bg-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)]"
        >
          <p className="px-[12px] pt-[10px] pb-[4px] text-[10px] font-semibold uppercase tracking-[0.08em] text-tp-slate-400">
            Trends on file{value.trim() ? ` (filtered)` : ""}
          </p>
          {suggestions
            .filter((c) =>
              value.trim()
                ? c.label.toLowerCase().includes(value.trim().toLowerCase())
                : true,
            )
            .map((c) => {
              const isAbnormal = c.series?.some(
                (p) => p.flag === "alert" || p.flag === "warn",
              )
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  onMouseDown={(e) => {
                    // Prevent input blur from closing before click fires.
                    e.preventDefault()
                  }}
                  onClick={() => {
                    onChange(c.label)
                    setOpen(false)
                  }}
                  className="group/sug flex w-full items-center justify-between gap-[8px] px-[12px] py-[7px] text-left transition-colors hover:bg-tp-slate-50"
                >
                  <span className="flex min-w-0 items-baseline gap-[6px]">
                    <span
                      className="truncate text-[13px] font-semibold"
                      style={{
                        background:
                          "linear-gradient(91deg, #D565EA 3%, #673AAC 67%, #1A1994 130%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {c.label}
                    </span>
                    {c.unit && (
                      <span className="shrink-0 text-[10px] font-mono text-tp-slate-400">
                        {c.unit}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-[6px]">
                    <span className="text-[10px] uppercase tracking-[0.06em] text-tp-slate-400">
                      {c.category === "vital" ? "Vital" : "Lab"}
                    </span>
                    {isAbnormal && (
                      <span className="rounded-[3px] bg-tp-warning-50 px-[5px] py-[1px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-tp-warning-700">
                        Abnormal
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          {suggestions.filter((c) =>
            value.trim()
              ? c.label.toLowerCase().includes(value.trim().toLowerCase())
              : true,
          ).length === 0 && (
            <p className="px-[12px] py-[10px] text-[12px] italic text-tp-slate-500">
              No trends match "{value.trim()}".
            </p>
          )}
        </div>
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
  chips,
  onPillTap,
}: {
  chips: VeloraV0TrendMenuData["chips"]
  onPillTap?: (message: string) => void
}) {
  // Group heading dropped per design call — categories are still
  // sorted (vitals before labs) by the parent's `useMemo`, but the
  // ALL-CAPS "BEDSIDE VITALS · 3 ON FILE" / "LAB PARAMETERS · 5 ON
  // FILE" pill was reading as filler now that each chart card
  // carries its own coloured trend name.
  //
  // Collapse policy: only the FIRST card in the list expands by
  // default; every other card opens collapsed and reveals its chart
  // on tap. Keys are STABLE per chip id (no position suffix) so
  // each card's expansion state is fully independent — expanding
  // one card never re-mounts another, and the doctor's
  // accumulated open/closed choices survive list re-sorts (e.g.
  // when the doctor searches).
  return (
    <div className="flex flex-col gap-[12px]">
      {chips.map((chip, i) => (
        <TrendChartCard
          key={chip.id}
          chip={chip}
          defaultExpanded={i === 0}
          onTap={() => onPillTap?.(chip.question)}
        />
      ))}
    </div>
  )
}

/** Map the chips on file to the placeholder copy fragment used by
 *  the search input. Reads as the category the doctor just asked
 *  for ("lab trends" / "vital trends" / generic "trends"). */
function categoryWord(chips: VeloraV0TrendMenuData["chips"]): string {
  const hasLab = chips.some((c) => c.category === "lab")
  const hasVital = chips.some((c) => c.category === "vital")
  if (hasLab && !hasVital) return "lab trends"
  if (hasVital && !hasLab) return "vital trends"
  return "trends"
}

/** Full trend chart card — used inside the trend menu to show every
 *  available trend as a graph (with table toggle). The card opens
 *  collapsed by default (only the first one in the list expands);
 *  tapping the chevron toggles the chart. Tapping the trend NAME
 *  button fires the canned question to open the full detail card. */
function TrendChartCard({
  chip,
  defaultExpanded = false,
  onTap,
}: {
  chip: VeloraV0TrendMenuData["chips"][number]
  defaultExpanded?: boolean
  onTap?: () => void
}) {
  const accentLine = chip.category === "vital" ? "#8B5CF6" : "#10B981"
  const [expanded, setExpanded] = useState(defaultExpanded)
  const isAbnormal = chip.series?.some(
    (p) => p.flag === "alert" || p.flag === "warn",
  )

  return (
    <div
      className="overflow-hidden rounded-[12px] border bg-white"
      style={{ borderColor: "rgba(103,58,172,0.16)" }}
    >
      {/* Collapsible header row — tapping anywhere in the header
          area toggles the card open / closed. The trend NAME button
          is still a separate inner tap target that fires the canned
          question via `onTap` (so the doctor can pivot to the
          dedicated detail card). */}
      <div className="flex items-center gap-[8px] px-[12px] py-[10px]">
        <button
          type="button"
          onClick={onTap}
          title={chip.rationale}
          className="group/header inline-flex min-w-0 flex-1 items-baseline gap-[6px] text-left"
        >
          <span
            className="truncate text-[14px] font-semibold transition-opacity group-hover/header:opacity-80"
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
            <span className="shrink-0 text-[10.5px] font-mono text-tp-slate-400">
              {chip.unit}
            </span>
          )}
        </button>
        {/* Compact collapsed-state summary: reading-count + abnormal
            tag. Neither the raw value (combo readings like "TC 4.6 ·
            LDL 2.7 · HDL 1.1 · TG 1.6" read as noise upfront) nor
            the date (no actionable signal at a glance) are shown
            here — both live inside the chart / table once the
            card expands. The reading COUNT answers "how much data
            am I getting?" before the doctor commits a tap. */}
        {!expanded && (
          <span className="flex shrink-0 items-center gap-[6px]">
            {chip.series && chip.series.length > 0 && (
              <span className="text-[10px] uppercase tracking-[0.06em] text-tp-slate-400">
                {chip.series.length} reading{chip.series.length === 1 ? "" : "s"}
              </span>
            )}
            {isAbnormal && (
              <span className="rounded-[3px] bg-tp-warning-50 px-[5px] py-[1px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-tp-warning-700">
                Abnormal
              </span>
            )}
          </span>
        )}
        {chip.targetLine && <ReferenceInfoTip targetLine={chip.targetLine} />}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse trend" : "Expand trend"}
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[6px] text-tp-slate-500 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-700"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="transition-transform duration-150"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path
              d="M6 9L12 15L18 9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Chart — only when there's a series AND the card is
          expanded. No-series chips and collapsed cards keep just
          the header. */}
      {expanded && chip.series && chip.series.length > 0 && (
        <div className="border-t border-tp-slate-100 px-[12px] py-[10px]">
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

