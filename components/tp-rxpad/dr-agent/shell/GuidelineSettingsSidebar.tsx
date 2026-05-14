"use client"

import React, { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { CloseCircle, TickCircle, Setting2 } from "iconsax-reactjs"
import {
  GUIDELINE_CATALOGUE,
  SPECIALTY_LABELS,
  SPECIALTY_ORDER,
  defaultSelection,
  loadGuidelineSelection,
  saveGuidelineSelection,
  type GuidelineSelection,
  type SpecialtyKey,
} from "@/lib/velora/guideline-registry"

/**
 * GuidelineSettingsSidebar — admin-only slide-in panel.
 *
 * Doctor's view never opens this. A hospital administrator (or the
 * Velora installer during onboarding) uses it to confirm WHICH published
 * clinical guideline bodies are signed for in-policy use at this
 * hospital, per specialty. The agent's Stack-2 (Clinical synthesis)
 * panels are then bounded by the saved selection.
 *
 * Architecture note: this is the "library" half of the librarian/author
 * doctrine (see docs/velora-patients/CROSS-CONSULTATION-BRIEF-ARCHETYPE.md §0).
 * The admin populates the library; AI picks from it; AI never authors
 * what isn't here.
 */
export function GuidelineSettingsSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [selection, setSelection] = useState<GuidelineSelection>({})
  const [savedFlash, setSavedFlash] = useState(false)
  const [activeSpecialty, setActiveSpecialty] = useState<SpecialtyKey>(SPECIALTY_ORDER[0])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Hydrate from localStorage when the panel opens (so the admin sees
  // their last-saved state). Falls back to the V0 default (every
  // guideline marked signed) for a brand-new hospital.
  useEffect(() => {
    if (!open) return
    const loaded = loadGuidelineSelection()
    if (Object.keys(loaded).length === 0) {
      setSelection(defaultSelection())
    } else {
      setSelection(loaded)
    }
  }, [open])

  const totalSigned = useMemo(() => {
    let n = 0
    for (const arr of Object.values(selection)) n += (arr ?? []).length
    return n
  }, [selection])

  if (!mounted || !open) return null

  const toggle = (specialty: SpecialtyKey, guidelineId: string) => {
    setSelection((prev) => {
      const existing = new Set(prev[specialty] ?? [])
      if (existing.has(guidelineId)) existing.delete(guidelineId)
      else existing.add(guidelineId)
      return { ...prev, [specialty]: Array.from(existing) }
    })
  }

  const selectAllForSpecialty = (specialty: SpecialtyKey) => {
    setSelection((prev) => ({
      ...prev,
      [specialty]: GUIDELINE_CATALOGUE[specialty].map((g) => g.id),
    }))
  }

  const clearSpecialty = (specialty: SpecialtyKey) => {
    setSelection((prev) => ({ ...prev, [specialty]: [] }))
  }

  const handleSave = () => {
    saveGuidelineSelection(selection)
    setSavedFlash(true)
    // Notify any open agent surface that the signed library changed,
    // so its synthesis renderer re-filters without waiting for window
    // `focus`. We use the standard `storage` event vocabulary (with a
    // bespoke key) so existing focus listeners pick it up too.
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new StorageEvent("storage", { key: "velora-v0-guideline-settings" }))
      } catch {
        // Old browsers without StorageEvent constructor — fall back to
        // a synthetic Event; the consumer's listener ignores `key`
        // mismatches anyway.
        window.dispatchEvent(new Event("storage"))
      }
    }
    // Brief "Saved" flash, then auto-close. 1 s is short enough that
    // the admin sees the confirmation but doesn't sit waiting for the
    // panel to dismiss.
    setTimeout(() => {
      setSavedFlash(false)
      onClose()
    }, 1000)
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex" aria-modal="true" role="dialog">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/45 transition-opacity" onClick={onClose} />
      {/* Panel — slides in from the right */}
      <div className="relative ml-auto flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-[12px] border-b border-tp-slate-100 px-[20px] py-[16px]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-[6px] text-[11px] font-semibold uppercase tracking-[0.08em] text-tp-violet-600">
              <Setting2 size={13} variant="Bulk" />
              <span>Admin · Hospital Settings</span>
            </div>
            <div className="mt-[3px] text-[18px] font-semibold text-tp-slate-900">
              Guideline Settings
            </div>
            <div className="mt-[2px] text-[12.5px] leading-[1.45] text-tp-slate-500">
              Pick the published clinical guidelines this hospital follows, per specialty.
              Velora's Clinical synthesis panels will be bounded to these signed bodies.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-tp-slate-400 hover:text-tp-slate-700"
            aria-label="Close guideline settings"
          >
            <CloseCircle size={22} variant="Linear" />
          </button>
        </div>

        {/* Body — two-column: specialty list on the left, cards on the right */}
        <div className="flex min-h-0 flex-1">
          {/* Left: specialty list */}
          <nav
            aria-label="Specialty navigator"
            className="w-[180px] shrink-0 overflow-y-auto border-r border-tp-slate-100 bg-tp-slate-50/40 py-[8px]"
          >
            {SPECIALTY_ORDER.map((s) => {
              const count = selection[s]?.length ?? 0
              const total = GUIDELINE_CATALOGUE[s].length
              const isActive = s === activeSpecialty
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActiveSpecialty(s)}
                  className={`flex w-full items-center justify-between gap-[6px] px-[14px] py-[8px] text-left text-[12.5px] transition-colors ${
                    isActive
                      ? "bg-white text-tp-violet-700"
                      : "text-tp-slate-600 hover:bg-white/70 hover:text-tp-slate-900"
                  }`}
                >
                  <span className={`truncate ${isActive ? "font-semibold" : "font-medium"}`}>
                    {SPECIALTY_LABELS[s]}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-[6px] py-[1px] text-[10px] font-semibold ${
                      count === 0
                        ? "bg-tp-slate-100 text-tp-slate-400"
                        : count === total
                          ? "bg-tp-violet-100 text-tp-violet-700"
                          : "bg-tp-blue-50 text-tp-blue-700"
                    }`}
                  >
                    {count}/{total}
                  </span>
                </button>
              )
            })}
          </nav>

          {/* Right: guideline cards for the active specialty */}
          <div className="min-w-0 flex-1 overflow-y-auto px-[20px] py-[16px]">
            <SpecialtyPanel
              specialty={activeSpecialty}
              selected={new Set(selection[activeSpecialty] ?? [])}
              onToggle={(id) => toggle(activeSpecialty, id)}
              onSelectAll={() => selectAllForSpecialty(activeSpecialty)}
              onClear={() => clearSpecialty(activeSpecialty)}
            />
          </div>
        </div>

        {/* Footer — save bar */}
        <div className="flex shrink-0 items-center justify-between gap-[10px] border-t border-tp-slate-100 bg-white px-[20px] py-[12px]">
          <div className="text-[12px] leading-[1.4] text-tp-slate-500">
            <span className="font-semibold text-tp-slate-700">{totalSigned}</span> guidelines signed
            across {SPECIALTY_ORDER.length} specialties.
          </div>
          <div className="flex items-center gap-[8px]">
            {savedFlash && (
              <span className="inline-flex items-center gap-[5px] text-[12px] font-semibold text-tp-violet-700">
                <TickCircle size={14} variant="Bold" />
                Saved
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] px-[12px] py-[7px] text-[12.5px] font-semibold text-tp-slate-600 transition-colors hover:bg-tp-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-[8px] px-[14px] py-[7px] text-[12.5px] font-semibold text-white transition-colors"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #4B4AD5 100%)",
              }}
            >
              Save selection
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function SpecialtyPanel({
  specialty,
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: {
  specialty: SpecialtyKey
  selected: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClear: () => void
}) {
  const guidelines = GUIDELINE_CATALOGUE[specialty]
  const allOn = guidelines.length > 0 && guidelines.every((g) => selected.has(g.id))
  return (
    <div className="flex flex-col gap-[10px]">
      {/* Section header */}
      <div className="flex items-end justify-between gap-[10px]">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-tp-slate-900">
            {SPECIALTY_LABELS[specialty]}
          </div>
          <div className="mt-[2px] text-[11.5px] text-tp-slate-500">
            {guidelines.length} published guideline{guidelines.length === 1 ? "" : "s"} available — pick the ones in policy at this hospital.
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-[8px] text-[11.5px]">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={allOn}
            className="rounded-[6px] px-[8px] py-[3px] font-semibold text-tp-violet-700 transition-colors enabled:hover:bg-tp-violet-50 disabled:cursor-default disabled:text-tp-slate-300"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={selected.size === 0}
            className="rounded-[6px] px-[8px] py-[3px] font-semibold text-tp-slate-600 transition-colors enabled:hover:bg-tp-slate-100 disabled:cursor-default disabled:text-tp-slate-300"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Guideline cards */}
      <div className="grid grid-cols-1 gap-[10px]">
        {guidelines.map((g) => {
          const isOn = selected.has(g.id)
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onToggle(g.id)}
              role="checkbox"
              aria-checked={isOn}
              className={`flex items-start gap-[10px] rounded-[12px] border px-[12px] py-[10px] text-left transition-all ${
                isOn
                  ? "border-tp-violet-300 bg-tp-violet-50/50"
                  : "border-tp-slate-200 bg-white hover:border-tp-slate-300 hover:bg-tp-slate-50/60"
              }`}
            >
              {/* Checkbox visual */}
              <span
                className={`mt-[1px] flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border ${
                  isOn ? "border-tp-violet-500 bg-tp-violet-500" : "border-tp-slate-300 bg-white"
                }`}
                aria-hidden
              >
                {isOn && (
                  <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
                    <path
                      d="M3.5 8.5l3 3 6-7"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-[6px]">
                  <span className="text-[13.5px] font-semibold text-tp-slate-900">{g.title}</span>
                  <span className="shrink-0 rounded-[4px] bg-tp-slate-100 px-[5px] py-[1px] text-[10px] font-semibold uppercase tracking-[0.04em] text-tp-slate-600">
                    {g.body} · {g.year}
                  </span>
                </div>
                <div className="mt-[3px] text-[12.5px] leading-[1.45] text-tp-slate-600">
                  {g.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
