"use client"

import React, { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { InfoCircle } from "iconsax-reactjs"
import { FlagArrow } from "../../shared/FlagArrow"

/** Shorten "24 Apr 2026" → "24 Apr '26"; passes other inputs through. */
export function shortDate(date: string): string {
  return date.replace(/\b(20)(\d{2})\b/, "'$2")
}

/**
 * Inline highlight renderer for V0 card lines.
 *
 * Conventions:
 *   **text**         → bold neutral (tp-slate-900)
 *   __text__         → bold abnormal (tp-error-600), no direction
 *   __↑text__        → bold abnormal + up FlagArrow (high)
 *   __↓text__        → bold abnormal + down FlagArrow (low)
 *   "  ·  "          → rendered as a light "|" divider (tp-slate-200)
 *
 * Examples:
 *   "**AFib** on **apixaban 5 mg BID**  ·  anticoag continued."
 *   "**T2DM**  ·  __↑HbA1c 8.4%__"
 *   "__↓eGFR 48__  ·  Stage **G3a CKD**."
 */
type Run =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "alert"; value: string; direction?: "up" | "down" }

const HIGHLIGHT_PATTERN = /(\*\*[^*]+\*\*|__[^_]+__)/g

function tokenise(input: string): Run[] {
  const out: Run[] = []
  let lastIdx = 0
  for (const match of input.matchAll(HIGHLIGHT_PATTERN)) {
    const idx = match.index ?? 0
    if (idx > lastIdx) out.push({ kind: "text", value: input.slice(lastIdx, idx) })
    const raw = match[0]
    if (raw.startsWith("**")) {
      out.push({ kind: "bold", value: raw.slice(2, -2) })
    } else {
      let value = raw.slice(2, -2)
      let direction: Run extends { kind: "alert" } ? "up" | "down" | undefined : never = undefined as any
      if (value.startsWith("↑")) {
        direction = "up" as any
        value = value.slice(1).trim()
      } else if (value.startsWith("↓")) {
        direction = "down" as any
        value = value.slice(1).trim()
      }
      out.push({ kind: "alert", value, direction: direction as "up" | "down" | undefined })
    }
    lastIdx = idx + raw.length
  }
  if (lastIdx < input.length) out.push({ kind: "text", value: input.slice(lastIdx) })
  return out
}

function PipeDivider() {
  // Lighter divider — slate-100 keeps the pipe legible but recedes visually
  // so the items it separates carry the eye instead of the glyph.
  return <span className="mx-[7px] text-tp-slate-100">|</span>
}

function PlainRun({ text }: { text: string }) {
  const segs = text.split(" · ")
  return (
    <>
      {segs.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <PipeDivider />}
          {s}
        </React.Fragment>
      ))}
    </>
  )
}

export function HighlightLine({ text }: { text: string }) {
  return (
    <>
      {tokenise(text).map((run, i) => {
        if (run.kind === "bold") {
          return (
            <strong key={i} className="font-semibold text-tp-slate-900">
              {run.value}
            </strong>
          )
        }
        if (run.kind === "alert") {
          return (
            <span key={i} className="inline-flex items-baseline gap-[2px] font-semibold text-tp-error-600">
              {run.direction === "up" && <FlagArrow flag="high" />}
              {run.direction === "down" && <FlagArrow flag="low" />}
              <span>{run.value}</span>
            </span>
          )
        }
        return <PlainRun key={i} text={run.value} />
      })}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// FloatingTooltip — portal-rendered, fixed-positioned tooltip.
//
// Renders into <body> so the tooltip escapes any ancestor with
// `overflow: hidden` (the CardShell wraps cards in a rounded overflow-hidden
// container, which used to clip the tooltips). Position is computed from the
// trigger's bounding rect on open / scroll / resize.
// ─────────────────────────────────────────────────────────────────────────

export function FloatingTooltip({
  open,
  triggerRef,
  placement = "top-center",
  children,
  className = "",
  width,
}: {
  open: boolean
  triggerRef: React.RefObject<HTMLElement | null>
  /** "top-center" anchors to the trigger's horizontal centre; "top-right" pins
   *  the tooltip's right edge to the trigger's right edge (wide tooltips). */
  placement?: "top-center" | "top-right"
  children: React.ReactNode
  className?: string
  /** Optional fixed width (px). */
  width?: number
}) {
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left?: number; right?: number } | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || typeof window === "undefined") return
    const update = () => {
      const el = triggerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (placement === "top-right") {
        setCoords({ top: rect.top, right: window.innerWidth - rect.right })
      } else {
        setCoords({ top: rect.top, left: rect.left + rect.width / 2 })
      }
    }
    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open, placement, triggerRef])

  if (!open || !mounted || !coords) return null

  const style: React.CSSProperties =
    placement === "top-right"
      ? { position: "fixed", top: coords.top - 6, right: coords.right, transform: "translateY(-100%)" }
      : { position: "fixed", top: coords.top - 6, left: coords.left, transform: "translate(-50%, -100%)" }
  if (width) style.width = width

  return createPortal(
    <span role="tooltip" className={`pointer-events-none z-[9999] ${className}`} style={style}>
      {children}
    </span>,
    document.body,
  )
}

/**
 * InfoTip — tiny info icon with a hover tooltip carrying a reference range,
 * target, or note. Rendered next to the LABEL so values stay clean.
 */
export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  return (
    <>
      <span
        ref={ref}
        className="relative inline-flex shrink-0 cursor-pointer align-middle text-tp-slate-500 hover:text-tp-slate-700"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
      >
        <InfoCircle size={12} variant="Linear" />
      </span>
      <FloatingTooltip
        open={open}
        triggerRef={ref}
        placement="top-center"
        width={text.length > 50 ? 280 : undefined}
        className={`rounded-[6px] bg-tp-slate-800 px-[10px] py-[7px] text-[11px] font-normal leading-[1.5] text-white shadow-lg ${text.length > 50 ? "" : "whitespace-nowrap"}`}
      >
        {text}
      </FloatingTooltip>
    </>
  )
}

/**
 * SourceInfoTip — info-style icon used in the section heading's trailing slot.
 *
 * Communicates the *defence* per section: where the data was pulled from, and
 * why this specific artifact was picked out of the EMR. Replaces the implicit
 * "trust me, it's the latest note" assumption with an auditable trace.
 */
export function SourceInfoTip({ source, reason }: { source: string; reason?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  return (
    <>
      <span
        ref={ref}
        className="relative inline-flex shrink-0 cursor-pointer items-center align-middle text-tp-slate-600 hover:text-tp-slate-800"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        aria-label="Source"
      >
        <InfoCircle size={14} variant="Linear" />
      </span>
      <FloatingTooltip
        open={open}
        triggerRef={ref}
        placement="top-right"
        width={260}
        className="rounded-[6px] bg-tp-slate-800 px-[10px] py-[8px] text-left text-[11px] font-normal leading-[1.5] text-white shadow-lg"
      >
        <span className="block text-tp-slate-300">
          <span className="font-semibold uppercase tracking-[0.06em] text-tp-slate-400">Source</span>
          <br />
          <span className="text-white">{source}</span>
        </span>
        {reason && (
          <span className="mt-[6px] block border-t border-tp-slate-700 pt-[6px] text-tp-slate-300">
            <span className="font-semibold uppercase tracking-[0.06em] text-tp-slate-400">Why picked</span>
            <br />
            <span className="text-white">{reason}</span>
          </span>
        )}
      </FloatingTooltip>
    </>
  )
}
