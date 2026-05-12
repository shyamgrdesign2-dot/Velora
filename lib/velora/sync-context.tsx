"use client"

import * as React from "react"
import { RxPadSyncProvider, useRxPadSync } from "@/components/tp-rxpad/rxpad-sync-context"
import type { RxPadCopyPayload, RxPadSignal } from "@/components/tp-rxpad/rxpad-sync-context"

// ─────────────────────────────────────────────────────────────────────────
// Velora OS — sync context aliases.
// Thin Velora-named surface over the shared dr-agent context. Lets the page
// layer use Velora-aligned identifiers without touching the underlying
// Doctor Agent component tree (which keeps its original RxPad-era naming).
// ─────────────────────────────────────────────────────────────────────────

export function VeloraSyncProvider({ children }: { children: React.ReactNode }) {
  return <RxPadSyncProvider>{children}</RxPadSyncProvider>
}

export const useVeloraSync = useRxPadSync
export type VeloraCopyPayload = RxPadCopyPayload
export type VeloraSignal = RxPadSignal
