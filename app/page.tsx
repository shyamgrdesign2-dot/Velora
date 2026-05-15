"use client"

import { DrAgentPanel } from "@/components/tp-rxpad/dr-agent/DrAgentPanel"
import { VeloraSyncProvider } from "@/lib/velora/sync-context"
import { buildVeloraV0Reply } from "@/lib/velora/v0-replies"

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
            trustMarkerText="ADA · WHO HTN · NICE NG56 · Private, cited, you decide"
          />
        </div>
      </div>
    </VeloraSyncProvider>
  )
}
