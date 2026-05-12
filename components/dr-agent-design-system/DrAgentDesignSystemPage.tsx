"use client"

import React, { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { AiBrandSparkIcon } from "@/components/doctor-agent/ai-brand"
import { AI_GRADIENT } from "@/components/tp-rxpad/dr-agent/constants"

import { DesignTokensSection } from "./sections/DesignTokensSection"
import { CardAnatomySection } from "./sections/CardAnatomySection"
import { CardCatalogSection } from "./sections/CardCatalogSection"
import { ChatShellSection } from "./sections/ChatShellSection"
import { CardRulesSection } from "./sections/CardRulesSection"
import { IntentClassificationSection } from "./sections/IntentClassificationSection"
import { V0SpecSection } from "./sections/V0SpecSection"
import { VeloraV0Section } from "./VeloraV0Section"
import { ExportButton } from "./ExportButton"
import { CATALOG_ENTRIES } from "./catalog-data"

// ─────────────────────────────────────────────────────────────
// Documentation page — switchable view between
//   · Dr. Agent v0  → existing card / chat-shell design system
//   · Velora v0     → clinical-intelligence v0 spec (Zydus pilot)
// ─────────────────────────────────────────────────────────────

type View = "dr-agent-v0" | "velora-v0"

const VIEWS: Array<{ id: View; label: string; sub: string }> = [
  { id: "dr-agent-v0", label: "Dr. Agent v0", sub: "Card & chat shell reference" },
  { id: "velora-v0",   label: "Velora v0",    sub: "Clinical intelligence · Zydus pilot" },
]

const DR_AGENT_NAV_ITEMS = [
  { id: "design-tokens", label: "Design Tokens" },
  { id: "card-anatomy", label: "Card Anatomy" },
  { id: "card-catalog", label: "Card Catalog" },
  { id: "chat-shell", label: "Chat Shell" },
  { id: "intent-classification", label: "Intent Classification" },
  { id: "card-rules", label: "Card Rules" },
  { id: "v0-spec", label: "V0 Mode" },
]

const VELORA_NAV_ITEMS = [
  { id: "velora-v0", label: "Overview" },
]

export function DrAgentDesignSystemPage() {
  const router = useRouter()
  // Default landing view = Velora v0 (the active product line).
  // Dr. Agent v0 remains accessible via the dropdown.
  const [view, setView] = useState<View>("velora-v0")
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [menuOpen])

  const activeView = VIEWS.find((v) => v.id === view) ?? VIEWS[0]
  const navItems = view === "dr-agent-v0" ? DR_AGENT_NAV_ITEMS : VELORA_NAV_ITEMS
  const headerTitle = view === "dr-agent-v0" ? "Dr. Agent Design System" : "Velora v0 — Clinical Intelligence"
  const headerSubtitle =
    view === "dr-agent-v0"
      ? "Complete card & chat shell reference for AI-assisted design generation"
      : "Cross-specialty intelligence layer · cited claims · five intents · Zydus General Medicine pilot"

  return (
    <div className="min-h-screen bg-[#FAFAFE]">
      {/* ── Sticky Header Bar ── */}
      <header className="sticky top-0 z-50 border-b border-tp-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              aria-label="Back to chat"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-tp-slate-200 bg-white text-tp-slate-500 transition-colors hover:bg-tp-slate-50 hover:text-tp-slate-700"
            >
              <ArrowLeft size={16} strokeWidth={2} />
            </button>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: AI_GRADIENT }}
            >
              <AiBrandSparkIcon size={20} className="[filter:brightness(0)_invert(1)]" />
            </div>

            {/* ── Doctor Agent dropdown — switches between Dr. Agent v0 / Velora v0 ── */}
            <div ref={menuRef} className="relative min-w-0">
              <button
                type="button"
                onClick={() => setMenuOpen((s) => !s)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex max-w-full items-center gap-2 rounded-[10px] px-2 py-1 text-left transition-colors hover:bg-tp-slate-100"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-tp-slate-400">
                      Doctor Agent
                    </span>
                    <ChevronDown size={12} strokeWidth={2} className="text-tp-slate-400" />
                  </div>
                  <h1
                    className="truncate text-[18px] font-bold leading-tight"
                    style={{
                      background: AI_GRADIENT,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {headerTitle}
                  </h1>
                  <p className="truncate text-[11px] text-tp-slate-400">{headerSubtitle}</p>
                </div>
              </button>

              {/* Dropdown panel */}
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-[calc(100%+6px)] z-50 w-[260px] rounded-[12px] border border-tp-slate-200 bg-white p-1 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)]"
                >
                  {VIEWS.map((v) => {
                    const active = v.id === view
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setView(v.id)
                          setMenuOpen(false)
                          window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
                        }}
                        className={`flex w-full items-start gap-2 rounded-[8px] px-3 py-2.5 text-left transition-colors ${
                          active ? "bg-tp-violet-50 text-tp-violet-700" : "text-tp-slate-700 hover:bg-tp-slate-50"
                        }`}
                      >
                        <span
                          className={`mt-1 inline-block h-1.5 w-1.5 rounded-full ${
                            active ? "bg-tp-violet-500" : "bg-tp-slate-300"
                          }`}
                          aria-hidden
                        />
                        <span className="flex-1">
                          <span className={`block text-[13px] font-semibold ${active ? "text-tp-violet-700" : "text-tp-slate-800"}`}>
                            {v.label}
                          </span>
                          <span className="block text-[11px] text-tp-slate-500">{v.sub}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {view === "dr-agent-v0" && <ExportButton />}
        </div>

        {/* Section nav — hidden when only a single item (Velora overview is a single page) */}
        {navItems.length > 1 && (
          <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6">
            <nav className="flex gap-1 pb-2">
              {navItems.map((item, i) => (
                <a
                  key={i}
                  href={`#${item.id}`}
                  className="whitespace-nowrap rounded-full px-3 py-[4px] text-[11px] font-medium text-tp-slate-500 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-700"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ── Main Content ── */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {view === "dr-agent-v0" ? (
          <>
            {/* Stats bar */}
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Card Types", value: CATALOG_ENTRIES.length, color: "#3B82F6" },
                { label: "Shell Components", value: 10, color: "#8B5CF6" },
                { label: "Content Primitives", value: 7, color: "#10B981" },
                { label: "Design Tokens", value: "50+", color: "#F59E0B" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[10px] border border-tp-slate-100 bg-white px-4 py-3"
                >
                  <p className="text-[24px] font-bold" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-tp-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>

            <DesignTokensSection />
            <CardAnatomySection />
            <CardCatalogSection entries={CATALOG_ENTRIES} />
            <ChatShellSection />
            <IntentClassificationSection />
            <CardRulesSection />
            <V0SpecSection />

            <footer className="mt-12 border-t border-tp-slate-100 pt-6 pb-8 text-center">
              <p className="text-[11px] text-tp-slate-400">
                Dr. Agent Design System v1.0 · {CATALOG_ENTRIES.length} card types · Generated for AI-assisted design workflows
              </p>
              <p className="mt-1 text-[10px] text-tp-slate-300">
                Use the &ldquo;Export Complete Design System&rdquo; button to download a self-contained .md file for handoff to design tools.
              </p>
            </footer>
          </>
        ) : (
          <VeloraV0Section />
        )}
      </main>
    </div>
  )
}
