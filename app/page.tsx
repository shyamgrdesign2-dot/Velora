"use client"

import { useEffect, useState } from "react"
import { DrAgentPanel } from "@/components/tp-rxpad/dr-agent/DrAgentPanel"
import { LoginScreen } from "@/components/velora/LoginScreen"
import { VeloraSyncProvider } from "@/lib/velora/sync-context"
import { buildVeloraV0Reply } from "@/lib/velora/v0-replies"

// localStorage key for the V0 demo auth flag. Hydration-safe: we
// start with `null` (unknown) and resolve after mount so SSR + client
// don't mismatch. While unknown, render nothing (split-second).
const AUTH_KEY = "velora-v0-authed"

/**
 * Velora — standalone clinical AI chat (production-leaning surface).
 *
 * Two homepage-only chrome changes vs. the embedded sidebar mode:
 *
 *   • The agent's "minimize" collapse tag is hidden — there's nothing
 *     to collapse to in standalone mode.
 *   • The chat-input box at the bottom is hidden too. The doctor never
 *     types here in the demo build; the canned suggestion pills are
 *     the only entry point. The sticky **trust-marker** line below the
 *     input is preserved (kept as a footer).
 *
 * The patient context is surfaced via a floating liquid-glass chip in
 * the top-centre of the agent header (driven by AgentHeader's
 * `patientChipLabel` / `patientChipMeta` / `onPatientChipClick` props
 * that DrAgentPanel passes through when `mode === "homepage"`).
 *
 * A separate documentation-link icon used to live at top-right; it was
 * removed for the demo surface. The /dr-agent-design-system route
 * remains accessible directly.
 */
export default function VeloraHomePage() {
  // Tri-state auth flag — null = pre-hydration (don't render),
  // false = show login, true = show chat. Persisted in localStorage
  // so refresh keeps the doctor signed in across reloads.
  const [authed, setAuthed] = useState<boolean | null>(null)
  useEffect(() => {
    try {
      setAuthed(window.localStorage.getItem(AUTH_KEY) === "1")
    } catch {
      setAuthed(false)
    }
  }, [])

  if (authed === null) {
    // Pre-hydration — render the gradient backdrop so we don't flash
    // a white screen, but no card yet.
    return <div className="h-screen w-screen bg-[#1A1948]" />
  }

  if (!authed) {
    return (
      <LoginScreen
        onAuthenticated={() => {
          try {
            window.localStorage.setItem(AUTH_KEY, "1")
          } catch {
            /* localStorage blocked — proceed in-memory only. */
          }
          setAuthed(true)
        }}
      />
    )
  }

  return (
    <VeloraSyncProvider>
      <style>{`
        /* Hide the agent's "Minimize agent" tag — standalone surface
           has nowhere to collapse to. */
        #dr-agent-panel-root .da-agent-collapse-tag { display: none !important; }

        /* Hide the chat-input box (textarea + patient chip + send +
           voice). The sticky bottom container that holds it stays
           visible because it also carries the trust-marker line. */
        #dr-agent-panel-root .chat-input-border { display: none !important; }
      `}</style>
      <div className="relative flex h-screen w-screen items-stretch justify-center bg-tp-slate-100">
        <div className="h-full w-full">
          <DrAgentPanel
            mode="homepage"
            initialPatientId="lakshmi-iyer"
            onClose={() => {
              /* Standalone product — closing the panel is a no-op. */
            }}
            replyOverride={(message) => buildVeloraV0Reply(message)}
            autoOpenPatientSheetOnMount
            patientSelectorConfirmCtaLabel="Continue"
            trustMarkerText="Anchored to hospital-signed guidelines · Private · Cited · You decide"
          />
        </div>
      </div>
    </VeloraSyncProvider>
  )
}
