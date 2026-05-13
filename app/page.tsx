"use client"

import Link from "next/link"
import { BookOpen } from "lucide-react"
import { DrAgentPanel } from "@/components/tp-rxpad/dr-agent/DrAgentPanel"
import { VeloraSyncProvider } from "@/lib/velora/sync-context"
import { buildVeloraV0Reply } from "@/lib/velora/v0-replies"

/**
 * Velora — standalone clinical AI chat.
 *
 * Renders the same agent panel that lives inside the EMR sidebar in TatvaPractice,
 * but as the entire product surface — no RxPad, no EMR shell. The panel keeps its
 * sidebar dimensions (450–500px) and is centered against a soft TP slate background.
 *
 * A small documentation entry-point sits outside the panel (top-right) and routes
 * to /dr-agent-design-system, which carries the full agent docs.
 */
export default function VeloraHomePage() {
  return (
    <VeloraSyncProvider>
      {/*
        Velora is a full-screen standalone product, not an embedded sidebar — so the
        "Minimize agent" collapse button in AgentHeader has nothing meaningful to
        collapse to. Hide it here without modifying the shared AgentHeader.
      */}
      <style>{`#dr-agent-panel-root .da-agent-collapse-tag { display: none !important; }`}</style>
      <div className="relative flex h-screen w-screen items-stretch justify-center bg-tp-slate-100">
        {/* Documentation entry point — icon-only, mirrors the panel's collapse-tag style */}
        <Link
          href="/dr-agent-design-system"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Velora documentation"
          title="Documentation"
          className="fixed right-5 top-5 z-40 flex h-[32px] w-[32px] items-center justify-center rounded-[10px] text-tp-slate-600 transition-colors hover:text-tp-slate-900 active:scale-[0.95]"
        >
          <BookOpen className="h-4 w-4" strokeWidth={1.7} />
        </Link>

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
