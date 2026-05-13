"use client"

import React, { createContext, useContext, useState } from "react"

/**
 * VeloraViewModeContext — global toggle between "detailed" and "concise"
 * rendering for the cross-consultation brief card.
 *
 *   detailed → every doctor's note rendered verbatim, per-visit, no AI
 *              rephrasing. The default for Stack 1 because losing data
 *              via summarisation is unacceptable.
 *   concise  → legacy 2-line-per-pointer reframed summary (kept as
 *              opt-in for a quick at-a-glance read).
 *
 * Lives at the agent-shell level so a single toggle next to the Velora
 * brand tag drives every card on the chat surface.
 */

export type VeloraViewMode = "detailed" | "concise"

interface VeloraViewModeContextValue {
  viewMode: VeloraViewMode
  setViewMode: (mode: VeloraViewMode) => void
  toggleViewMode: () => void
}

const VeloraViewModeContext = createContext<VeloraViewModeContextValue | null>(null)

export function VeloraViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<VeloraViewMode>("detailed")
  const toggleViewMode = () => setViewMode((m) => (m === "detailed" ? "concise" : "detailed"))
  return (
    <VeloraViewModeContext.Provider value={{ viewMode, setViewMode, toggleViewMode }}>
      {children}
    </VeloraViewModeContext.Provider>
  )
}

/** Safe-fallback consumer — returns "detailed" + no-op setters when no
 *  provider is mounted, so cards rendered outside the Velora shell
 *  (e.g. deep-dive doc pages) still work. */
export function useVeloraViewMode(): VeloraViewModeContextValue {
  const ctx = useContext(VeloraViewModeContext)
  if (ctx) return ctx
  return {
    viewMode: "detailed",
    setViewMode: () => {},
    toggleViewMode: () => {},
  }
}
