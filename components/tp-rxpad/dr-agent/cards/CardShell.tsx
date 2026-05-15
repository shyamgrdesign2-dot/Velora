"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { CopyIcon } from "./CopyIcon"
import { ActionableTooltip } from "./ActionableTooltip"
import { TPMedicalIcon } from "@/components/tp-ui"
import { Copy, ArrowDown2, ArrowUp2, InfoCircle } from "iconsax-reactjs"

/** Small info icon with hover tooltip showing data sources */
export function SourceInfoIcon({ sources }: { sources: string[] }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="relative ml-[4px] flex-shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsHovered((v) => !v)}
    >
      <button
        type="button"
        className="flex h-[20px] w-[20px] items-center justify-center rounded-full text-tp-violet-400 transition-colors hover:text-tp-violet-600 hover:bg-tp-violet-50"
        aria-label="Data sources"
      >
        <InfoCircle size={14} variant="Bold" />
      </button>

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute right-0 top-full z-[100] mt-[4px] min-w-[160px] max-w-[220px] rounded-[8px] border border-tp-slate-100/80 bg-white/95 px-[10px] py-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-md">
          <p className="mb-[4px] text-[12px] font-semibold tracking-wider text-tp-slate-400">Sources</p>
          <div className="flex flex-col gap-[3px]">
            {sources.map((src, i) => (
              <div key={i} className="flex items-center gap-[5px]">
                <div className="h-[5px] w-[5px] flex-shrink-0 rounded-full bg-tp-violet-400" />
                <span className="text-[14px] leading-[1.4] text-tp-slate-600">{src}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface CardShellProps {
  icon: React.ReactNode
  iconBg?: string               // Deprecated: always uses TP blue-50
  title: string
  date?: string
  tpIconName?: string
  badge?: { label: string; color: string; bg: string }
  copyAll?: () => void
  copyAllTooltip?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
  actions?: React.ReactNode
  sidebarLink?: React.ReactNode
  /** Extra content rendered between badge and collapse chevron (e.g. donut icon) */
  headerExtra?: React.ReactNode
  /** Data source label(s) for provenance tooltip — shown as info icon when no donut chart */
  dataSources?: string[]
  /** When set, the card header sticks at this CSS value while the body
   *  scrolls. Pass a token like `"var(--velora-card-sticky-top, 60px)"`
   *  so the host (chat-scroll) can establish the offset from a single
   *  source of truth. Off by default — most surfaces don't sticky. */
  stickyHeaderTop?: string
  children: React.ReactNode
}

export function CardShell({
  icon,
  title,
  date,
  tpIconName,
  badge,
  copyAll,
  copyAllTooltip,
  collapsible = true,
  defaultCollapsed = false,
  actions,
  sidebarLink,
  headerExtra,
  dataSources,
  stickyHeaderTop,
  children,
}: CardShellProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [copyHovered, setCopyHovered] = useState(false)

  return (
    <div
      className={cn(
        "w-full rounded-[14px] bg-white",
        // overflow-hidden bounds the sticky header to the card's box,
        // which means the sticky title can't extend its "stuck" range
        // past the card. When stickyHeaderTop is set we want the
        // opposite: the sticky range should extend to the nearest
        // scrolling ancestor (chat-scroll) so the header stays pinned
        // at the page top throughout. Drop overflow-hidden in that
        // mode; rounded-t on the header below handles the visual.
        stickyHeaderTop ? "overflow-visible" : "overflow-hidden",
      )}
      style={{
        border: "1px solid transparent",
        backgroundImage: "linear-gradient(white, white), linear-gradient(180deg, rgba(75,74,213,0.18) 0%, rgba(75,74,213,0.04) 25%, rgba(23,23,37,0.02) 50%, rgba(75,74,213,0.04) 75%, rgba(75,74,213,0.18) 100%)",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
      }}
    >
      {/* Header — bleeds into the body via a soft violet → white
          gradient. No hairline stroke between header and body; the
          gradient itself carries the transition so the card reads as
          one piece instead of two stacked rectangles.

          Layout:
            • Wide (CardShell ≥ 480px): icon · title-stack · copy ·
              badge · headerExtra · chevron — all on one line.
            • Narrow (< 480px): headerExtra wraps to its own row
              below the title row. Uses CSS container queries so
              the wrap is driven by THIS card's width, not the
              viewport (cards can be narrow in wide windows when
              the chat panel is sized down).

          Optional sticky behaviour: when `stickyHeaderTop` is set
          the header element sticks at that offset while the body
          scrolls. The brief card opts in so the title + filter
          row stay visible while the doctor scrolls through the
          per-specialty visit timelines. */}
      <div
        className={cn(
          "card-shell-header flex flex-wrap items-center gap-x-[10px] gap-y-[5px] px-3 pt-[5px] pb-[7px]",
          // When sticky, the header needs its own rounded top corners
          // so it doesn't paint over the card's rounded corners (we
          // dropped overflow-hidden on the parent to free the sticky
          // range). z-[31] takes the header ABOVE the homepage
          // navbar (z-30) so when pinned at viewport y=0, the title
          // visually replaces the navbar instead of hiding behind it.
          stickyHeaderTop && "rounded-t-[13px] z-[31] backdrop-blur",
        )}
        style={{
          // Sticky mode lays a near-opaque white wash UNDER the
          // violet tint so when the title is pinned at viewport y=0
          // and overlaps the area the navbar used to occupy, no
          // navbar pixels bleed through. Non-sticky mode just uses
          // the soft violet wash — same look as the Recent-trends
          // card.
          background: stickyHeaderTop
            ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.96) 100%), linear-gradient(180deg, rgba(75,74,213,0.07) 0%, rgba(75,74,213,0.02) 60%, transparent 100%)"
            : "linear-gradient(180deg, rgba(75,74,213,0.07) 0%, rgba(75,74,213,0.02) 60%, transparent 100%)",
          containerType: "inline-size",
          position: stickyHeaderTop ? "sticky" : undefined,
          top: stickyHeaderTop,
        }}
      >
        {/* Icon — always TP blue. Bumped from 26 → 34 so it carries
            visual weight against the larger title block. */}
        <div
          className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[9px]"
          style={{ background: "var(--tp-blue-50, rgba(75, 74, 213, 0.08))" }}
        >
          {tpIconName ? (
            <TPMedicalIcon name={tpIconName} variant="bulk" size={19} color="var(--tp-blue-500, #4B4AD5)" />
          ) : (
            <span style={{ color: "var(--tp-blue-500, #4B4AD5)", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
          )}
        </div>

        {/* Title + Date.
         *   Title can truncate on very narrow surfaces (mobile rxpad) but the
         *   subtitle stays fully visible — the patient line and the data scope
         *   description need to be readable. */}
        <div className="flex min-w-0 flex-1 flex-col text-tp-slate-800">
          <span className="group/title relative max-w-full text-[14px] font-semibold leading-[1.4] truncate">
            {title}
            {/* Instant tooltip on truncated title */}
            <span className="pointer-events-none absolute bottom-full left-0 mb-1 hidden whitespace-nowrap rounded-[4px] bg-tp-slate-800 px-2 py-1 text-[10px] font-normal text-white shadow-md group-hover/title:block z-50">
              {title}
            </span>
          </span>
          {date && (
            <span className="mt-[5px] text-[12px] font-normal text-tp-slate-400 leading-[1.45]">
              {date}
            </span>
          )}
        </div>

        {/* Copy All — horizontally aligned with primary heading text */}
        {copyAll && (
          <div className="flex-shrink-0">
            {copyAllTooltip ? (
              <ActionableTooltip label={copyAllTooltip} onAction={() => copyAll()}>
                <span
                  className={cn("cursor-pointer transition-colors", copyHovered ? "text-tp-blue-600" : "text-tp-blue-500")}
                  onMouseEnter={() => setCopyHovered(true)}
                  onMouseLeave={() => setCopyHovered(false)}
                >
                  <Copy size={14} variant={copyHovered ? "Bulk" : "Linear"} />
                </span>
              </ActionableTooltip>
            ) : (
              <CopyIcon size={14} onClick={() => copyAll()} />
            )}
          </div>
        )}

        {/* Badge — truncated with tooltip if too long */}
        {badge && (
          <span
            className="group/badge relative max-w-[100px] truncate rounded-[4px] px-[6px] py-[3px] text-[12px] font-semibold leading-[1.2]"
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.label}
            <span className="pointer-events-none absolute bottom-full right-0 mb-1 hidden whitespace-nowrap rounded-[4px] bg-tp-slate-800 px-2 py-1 text-[10px] font-normal text-white shadow-md group-hover/badge:block z-50">
              {badge.label}
            </span>
          </span>
        )}

        {/* Header Extra (e.g. filters / data-completeness donut).
            On a narrow card it wraps to its own row via the @container
            query in the inline <style> below — `basis-full` keeps it
            on a fresh line; at ≥480px container width `basis-auto`
            flips it back inline next to the chevron. */}
        {headerExtra && (
          <div className="card-shell-header-extra ml-[4px] min-w-0 flex-shrink-0">
            {headerExtra}
          </div>
        )}

        {/* Collapse toggle — line icon, no stroke bg */}
        {collapsible && (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="card-shell-header-chevron flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[6px] bg-tp-slate-100 text-tp-slate-600 transition-colors hover:bg-tp-slate-200"
          >
            {collapsed ? <ArrowDown2 size={14} variant="Linear" /> : <ArrowUp2 size={14} variant="Linear" />}
          </button>
        )}

        {/* @container query — when the CardShell header narrows below
            480px the headerExtra wraps onto its own row. Without this
            block, all items stay on a single crunched line. */}
        <style>{`
          .card-shell-header { container-type: inline-size; }
          .card-shell-header-extra { flex-basis: 100%; order: 99; margin-left: 0; }
          @container (min-width: 480px) {
            .card-shell-header-extra { flex-basis: auto; order: 0; margin-left: 4px; }
          }
        `}</style>
      </div>

      {/* Body */}
      {!collapsed && (
        <>
          <div className="px-3 py-[10px]">
            {children}
          </div>

          {/* Actions row — single-line horizontal scroll */}
          {actions && (
            <div className="overflow-x-auto px-3 pt-[2px] pb-[10px]">
              <div className="flex gap-1 whitespace-nowrap">
                {actions}
              </div>
            </div>
          )}

          {/* Sidebar link (below actions, with bottom gradient) */}
          {sidebarLink && (
            <div
              className="px-3 py-[8px]"
              style={{
                borderTop: "0.5px solid var(--tp-slate-50, #F8FAFC)",
                background: "linear-gradient(180deg, #FFFFFF 0%, rgba(75,74,213,0.04) 100%)",
              }}
            >
              {sidebarLink}
            </div>
          )}
        </>
      )}
    </div>
  )
}
