"use client"

import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { VeloraSuggestion } from "@/lib/velora/v0-followups"

interface FollowUpSheetProps {
  suggestions: VeloraSuggestion[]
  /** Label of the currently-viewed parent intent (e.g. "MDT brief"). */
  currentIntentLabel: string
  /** Bumping this resets the open/closed state. */
  resetKey?: string | number
  onSelect: (message: string) => void
}

/**
 * FollowUpSheet — slate-gray suggestion tab attached above the chat input.
 *
 * Visual contract:
 *   - Slate-50 background, slate-200 top + side borders, no shadow.
 *   - Sits flush against the input; collapsing leaves a small header strip only.
 *   - Items split into two groups:
 *       · `sub`   → drill into the current parent intent (2 max).
 *       · `pivot` → switch to another parent intent (unasked first, asked last).
 *
 * No category icons inside items — the only chrome is a left-aligned small
 * uppercase label that announces which group an item belongs to, and a
 * chevron on the header to open/close. Items themselves are plain text rows.
 */
export function FollowUpSheet({ suggestions, currentIntentLabel, resetKey, onSelect }: FollowUpSheetProps) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    setOpen(true)
  }, [resetKey])

  if (suggestions.length === 0) return null

  const subs = suggestions.filter((s) => s.kind === "sub")
  const pivots = suggestions.filter((s) => s.kind === "pivot")

  return (
    <div
      className="pointer-events-auto -mb-[1px] overflow-hidden rounded-t-[10px] border border-tp-slate-200 bg-tp-slate-50"
    >
      {/* Tab header — click to toggle. Minimal chrome, slate text only. */}
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-[8px] px-[12px] py-[7px] text-left transition-colors hover:bg-tp-slate-100/60"
      >
        <span className="text-[12px] font-medium text-tp-slate-600">
          Suggestions
          <span className="ml-[6px] text-tp-slate-400">{suggestions.length}</span>
        </span>
        <span className="text-tp-slate-400">
          {open ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} /> : <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />}
        </span>
      </button>

      {open && (
        <div className="border-t border-tp-slate-200/70 px-[10px] py-[8px]">
          {/* Current-intent drill suggestions */}
          {subs.length > 0 && (
            <>
              <p className="mb-[4px] px-[2px] text-[10px] font-semibold uppercase tracking-[0.06em] text-tp-slate-400">
                About {currentIntentLabel}
              </p>
              <ul className="mb-[8px] flex flex-col gap-[2px]">
                {subs.map((s, i) => (
                  <li key={`sub-${i}`}>
                    <button
                      type="button"
                      onClick={() => onSelect(s.message)}
                      className="w-full rounded-[6px] px-[10px] py-[6px] text-left text-[13px] text-tp-slate-700 transition-colors hover:bg-white"
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Cross-intent pivots — unasked first */}
          {pivots.length > 0 && (
            <>
              <p className="mb-[4px] px-[2px] text-[10px] font-semibold uppercase tracking-[0.06em] text-tp-slate-400">
                Other intents
              </p>
              <ul className="flex flex-col gap-[2px]">
                {pivots.map((s, i) => (
                  <li key={`pivot-${i}`}>
                    <button
                      type="button"
                      onClick={() => onSelect(s.message)}
                      className="w-full rounded-[6px] px-[10px] py-[6px] text-left text-[13px] text-tp-slate-700 transition-colors hover:bg-white"
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
