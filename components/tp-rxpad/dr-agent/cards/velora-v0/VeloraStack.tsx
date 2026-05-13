"use client"

import React, { useRef, useState } from "react"
import { InfoCircle } from "iconsax-reactjs"
import { cn } from "@/lib/utils"
import { FloatingTooltip } from "./highlight"

// ─────────────────────────────────────────────────────────────────────────
// Small Velora v0 helpers used by the four intent cards.
// We no longer label sections "Stack 1" / "Stack 2" — the spec's two-tier
// idea is communicated through the existing SectionSummaryBar primitive plus
// a subtle wrap, not through explicit framework chrome.
// ─────────────────────────────────────────────────────────────────────────

/** Tiny pill used to surface a cited guideline body inline (e.g. "ACC/AHA 2023 §6.2").
 *
 *  Hover opens a four-block tooltip designed to build a doctor's confidence
 *  that the guideline citation is grounded in *their* patient — not a generic
 *  textbook reference. The four blocks are:
 *
 *    ① Guideline    Body + year + section + (when set) the readable
 *                    long-form name so a junior doctor or non-specialist
 *                    doesn't need to look up "AASLD" or "NCCN".
 *    ② What it is   One-line plain-English description of the guideline's
 *                    scope ("NCCN Colon Cancer surveillance guideline").
 *    ③ Why we        The patient-specific trigger — the chart finding that
 *      picked this   activated this guideline (e.g. "Patient on DAPT × 10
 *                    months post-CVA — ESC recommends de-escalation review
 *                    beyond month 12"). This is the trust-building block.
 *    ④ What we       Which fields in the current panel are derived from
 *      show from it  this guideline.
 *
 *  A confidence pill in the header ("Established", "Supportive",
 *  "Exploratory") lets the doctor calibrate trust before they act on the
 *  synthesis. Established = directly maps to a published recommendation;
 *  Supportive = inferred from the guideline's principles; Exploratory =
 *  guidance is partial / consensus-based.
 *
 *  A different shape from the source eye-icon used elsewhere, so the two
 *  don't get confused. */
export function GuidelineChip({
  body,
  year,
  section,
  description,
  fetches,
  whyPicked,
  confidence,
  readableBody,
  size = "sm",
}: {
  body: string
  year?: string
  section?: string
  description?: string
  fetches?: string
  whyPicked?: string
  confidence?: "established" | "supportive" | "exploratory"
  readableBody?: string
  size?: "sm" | "xs"
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const hoverable = !!(description || fetches || whyPicked || readableBody)

  // Confidence-pill style — green for established / blue for supportive /
  // amber for exploratory. Reads as a soft "how confident is Velora" tag,
  // not a clinical urgency signal.
  const confidenceClass =
    confidence === "established"
      ? "bg-tp-success-100 text-tp-success-800"
      : confidence === "supportive"
        ? "bg-tp-blue-100 text-tp-blue-800"
        : confidence === "exploratory"
          ? "bg-tp-warning-100 text-tp-warning-800"
          : ""
  const confidenceLabel =
    confidence === "established"
      ? "Established"
      : confidence === "supportive"
        ? "Supportive"
        : confidence === "exploratory"
          ? "Exploratory"
          : ""

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex items-center gap-[4px]"
      onMouseEnter={() => hoverable && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => hoverable && setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={hoverable ? 0 : -1}
    >
      <span
        className={cn(
          "inline-flex items-center gap-[3px] rounded-[4px] bg-tp-violet-50 px-[5px] py-[1px] font-semibold text-tp-violet-700",
          size === "xs" ? "text-[9px]" : "text-[10px]",
        )}
      >
        <span>{body}</span>
        {year && <span className="text-tp-violet-500">{year}</span>}
        {section && <span className="text-tp-violet-500">{section}</span>}
      </span>
      {hoverable && (
        <span
          aria-label="Why this guideline applies"
          className="inline-flex cursor-pointer items-center text-tp-violet-600 hover:text-tp-violet-800"
        >
          <InfoCircle size={12} variant="Linear" />
        </span>
      )}
      <FloatingTooltip
        open={hoverable && open}
        triggerRef={triggerRef}
        placement="top-right"
        width={320}
        className="rounded-[6px] bg-tp-slate-800 px-[12px] py-[10px] text-left text-[11px] font-normal leading-[1.5] text-white shadow-xl"
      >
        {/* ── Header row · guideline citation + (optional) confidence pill ── */}
        <span className="flex items-start justify-between gap-[8px]">
          <span className="block text-tp-slate-300">
            <span className="font-semibold uppercase tracking-[0.06em] text-tp-slate-400">Guideline</span>
            <br />
            <span className="font-semibold text-white">
              {body}
              {year ? ` · ${year}` : ""}
              {section ? ` · ${section}` : ""}
            </span>
            {readableBody && (
              <>
                <br />
                <span className="text-[10.5px] text-tp-slate-400">{readableBody}</span>
              </>
            )}
          </span>
          {confidence && (
            <span
              className={cn(
                "shrink-0 rounded-[3px] px-[5px] py-[1px] text-[9px] font-bold uppercase tracking-[0.06em]",
                confidenceClass,
              )}
            >
              {confidenceLabel}
            </span>
          )}
        </span>

        {/* ── What this guideline is (plain-English scope) ── */}
        {description && (
          <span className="mt-[8px] block border-t border-tp-slate-700 pt-[8px]">
            <span className="font-semibold uppercase tracking-[0.06em] text-tp-slate-400">
              What this guideline is
            </span>
            <br />
            <span className="text-white">{description}</span>
          </span>
        )}

        {/* ── Why we picked this (patient-specific trigger — the trust block) ── */}
        {whyPicked && (
          <span className="mt-[8px] block border-t border-tp-slate-700 pt-[8px]">
            <span className="font-semibold uppercase tracking-[0.06em] text-tp-violet-300">
              Why it applies to this patient
            </span>
            <br />
            <span className="text-white">{whyPicked}</span>
          </span>
        )}

        {/* ── What we show from it (the field mapping) ── */}
        {fetches && (
          <span className="mt-[8px] block border-t border-tp-slate-700 pt-[8px]">
            <span className="font-semibold uppercase tracking-[0.06em] text-tp-slate-400">
              What we show from it
            </span>
            <br />
            <span className="text-white">{fetches}</span>
          </span>
        )}
      </FloatingTooltip>
    </span>
  )
}

/** Neutral source/ID tag — used for "Note #NOT-3119", "Order #LAB-22841" etc. */
export function SourceTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-[4px] bg-tp-slate-100 px-[5px] py-[1px] font-mono text-[9px] font-medium text-tp-slate-500">
      {label}
    </span>
  )
}

/** Doctor + date pair shown at the right side of a specialty section header. */
export function HeaderTrailing({ doctor, date }: { doctor: string; date: string }) {
  return (
    <span className="flex shrink-0 items-center gap-[5px] text-[11px] font-medium text-tp-slate-500">
      <span>{doctor}</span>
      <span className="text-tp-slate-300">·</span>
      <span className="text-tp-slate-400">({date})</span>
    </span>
  )
}

/** Severity pill used by Why flagged today + Open loops. */
export function SeverityPill({ severity }: { severity: "critical" | "warning" | "info" }) {
  const map = {
    critical: "bg-tp-error-100 text-tp-error-700",
    warning: "bg-tp-warning-100 text-tp-warning-700",
    info: "bg-tp-blue-100 text-tp-blue-700",
  } as const
  const label = severity === "critical" ? "Critical" : severity === "warning" ? "Warning" : "Info"
  return (
    <span
      className={cn(
        "shrink-0 rounded-[3px] px-[5px] py-[1px] text-[9px] font-bold uppercase tracking-[0.06em]",
        map[severity],
      )}
    >
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// VeloraStackContainer — the dual-stack frame from the Velora MDT reference.
//
//   variant="fact"      → solid slate-200 border, white bg, green FACT pill.
//   variant="suggested" → dashed tp-violet-300 border, faint violet bg,
//                          violet SUGGESTED pill.
//
// The header carries a small "STACK n" uppercase caption + title + tag pill.
// Body content (sub-records, synthesis panels) goes inside as children.
// ─────────────────────────────────────────────────────────────────────────

export function VeloraStackContainer({
  stackNumber,
  variant,
  title,
  description,
  defence,
  children,
}: {
  stackNumber: 1 | 2
  variant: "fact" | "suggested"
  title: string
  description?: React.ReactNode
  defence?: string
  children: React.ReactNode
}) {
  const isFact = variant === "fact"
  return (
    <div
      className="rounded-[12px] px-[12px] py-[12px]"
      style={{
        background: isFact ? "white" : "rgba(250, 245, 254, 0.65)",
        border: isFact
          ? "1px solid var(--tp-slate-200, #E2E2EA)"
          : "1.5px dashed var(--tp-violet-300, #C89FE7)",
      }}
    >
      {/* Header: STACK n caption (left, stacked with title) · pill (right) */}
      <div className="mb-[8px] flex items-start justify-between gap-[8px]">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.08em]",
              isFact ? "text-tp-slate-400" : "text-tp-violet-500",
            )}
          >
            Stack {stackNumber}
          </p>
          <p className="mt-[1px] text-[14px] font-bold text-tp-slate-900">{title}</p>
        </div>
        <span
          className={cn(
            "mt-[2px] shrink-0 rounded-full px-[8px] py-[2px] text-[10px] font-bold uppercase tracking-[0.06em]",
            isFact
              ? "border border-tp-success-200 bg-tp-success-50 text-tp-success-700"
              : "border border-tp-violet-200 bg-white text-tp-violet-700",
          )}
        >
          {isFact ? "Fact" : "Suggested"}
        </span>
      </div>

      {description && (
        <div className="mb-[10px] text-[12px] leading-[1.5] text-tp-slate-600">{description}</div>
      )}

      <div className="flex flex-col gap-[8px]">{children}</div>

      {defence && (
        <div
          className={cn(
            "mt-[10px] rounded-[8px] px-[10px] py-[7px] text-[12px] leading-[1.5]",
            isFact ? "bg-tp-slate-50 text-tp-slate-600" : "bg-tp-violet-50/70 text-tp-violet-700",
          )}
        >
          <span className="font-semibold">Defence: </span>
          {defence}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// StackRecord — sub-record inside Stack 1 (or any FACT block).
// Top caption (uppercase tracking-wide), body content, author line.
// No gray bar — section-summary chrome is reserved for top-level headings.
// ─────────────────────────────────────────────────────────────────────────

export function StackRecord({
  caption,
  author,
  children,
}: {
  caption: string
  author?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[8px] border border-tp-slate-100 bg-white px-[10px] py-[8px]">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-tp-slate-400">
        {caption}
      </p>
      <div className="mt-[5px] text-[13px] leading-[1.55] text-tp-slate-700">{children}</div>
      {author && <p className="mt-[5px] text-[12px] text-tp-slate-500">{author}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// SuggestedPanel — sub-record inside Stack 2 (AI interpretation panel).
// Small "✦ AI suggested · BODY" caption · title · body content.
// ─────────────────────────────────────────────────────────────────────────

export function SuggestedPanel({
  body,
  title,
  trailing,
  children,
}: {
  body: string
  title: string
  trailing?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[8px] border border-tp-violet-100 bg-white px-[10px] py-[8px]">
      <p className="flex items-center gap-[5px] text-[10px] font-semibold uppercase tracking-[0.06em] text-tp-violet-500">
        <span aria-hidden>✦</span>
        <span>AI suggested · {body}</span>
      </p>
      <div className="mt-[3px] mb-[6px] flex items-center justify-between gap-[8px]">
        <p className="text-[13px] font-semibold text-tp-slate-900">{title}</p>
        {trailing}
      </div>
      {children}
    </div>
  )
}
