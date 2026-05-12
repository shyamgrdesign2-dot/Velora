"use client"

import React from "react"
import Link from "next/link"
import { Hospital, ClipboardCheck, ShieldAlert, AlertTriangle, BarChart3, ArrowUpRight, FileSearch } from "lucide-react"

// ─────────────────────────────────────────────────────────────
// Velora v0 — Overview
// Compact landing for the documentation.
//   · What Velora v0 does (hero)
//   · The two stacks (the trust anatomy on every reply)
//   · The validation contract (5 non-negotiables)
//   · The five intents — each links out to its own deep-dive page.
// Deep-dive content for every intent lives at
//   /dr-agent-design-system/velora-v0/<intent-id>
// and renders the actual chat card plus a section-by-section logic spec.
// ─────────────────────────────────────────────────────────────

interface IntentOverviewProps {
  number: string
  flagship?: boolean
  v0Plus?: boolean
  icon: React.ReactNode
  title: string
  doctorQuestion: string
  oneLine: string
  href?: string
}

function IntentOverview({ number, flagship, v0Plus, icon, title, doctorQuestion, oneLine, href }: IntentOverviewProps) {
  const inner = (
    <div className="group relative flex h-full flex-col gap-3 rounded-[14px] border border-tp-slate-200 bg-white p-5 transition hover:border-tp-violet-300 hover:shadow-[0_8px_20px_-12px_rgba(75,74,213,0.25)]">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-tp-violet-50 text-tp-violet-600">
          {icon}
        </span>
        <div className="flex flex-1 items-center gap-2">
          <span className="text-[12px] font-semibold text-tp-slate-400">{number}</span>
          <h3 className="text-[15px] font-bold text-tp-slate-800 group-hover:text-tp-violet-700">{title}</h3>
          {flagship && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
              Flagship
            </span>
          )}
          {v0Plus && (
            <span className="rounded-full bg-tp-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-tp-slate-600">
              V0.5+
            </span>
          )}
        </div>
        {href && (
          <ArrowUpRight className="h-4 w-4 text-tp-slate-300 transition-colors group-hover:text-tp-violet-500" strokeWidth={2} />
        )}
      </div>
      <p className="text-[12px] italic leading-[1.5] text-tp-slate-500">
        “{doctorQuestion}”
      </p>
      <p className="text-[13px] leading-[1.55] text-tp-slate-700">{oneLine}</p>
      {href && (
        <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-tp-violet-600">
          Open the deep dive →
        </span>
      )}
    </div>
  )
  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

export function VeloraV0Section() {
  return (
    <section id="velora-v0" className="space-y-12">
      {/* ── Hero ── */}
      <div className="rounded-[14px] border border-tp-violet-200 bg-gradient-to-br from-tp-violet-50 to-tp-blue-50 p-8">
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-full bg-tp-violet-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Velora v0</span>
          <span className="text-[11px] text-tp-slate-500">Pilot · Zydus General Medicine · 60-day pilot</span>
        </div>
        <h2 className="mb-3 text-[24px] font-bold leading-tight text-tp-slate-900">
          Clinical intelligence for the multi-specialty hospital
        </h2>
        <p className="max-w-3xl text-[14px] leading-[1.6] text-tp-slate-700">
          Velora reads across the hospital's complete data — clinical, billing, lab, pharmacy, imaging — and surfaces what cross-specialty
          attention requires, with every claim cited to a structured record or a published clinical guideline.
        </p>
        <p className="mt-3 text-[13px] italic text-tp-slate-500">A librarian, not a clinician. It cites; it does not interpret.</p>
      </div>

      {/* ── The two stacks ── */}
      <div>
        <h2 className="mb-3 text-[20px] font-bold text-tp-slate-900">The two stacks</h2>
        <p className="mb-5 max-w-3xl text-[13px] leading-[1.6] text-tp-slate-600">
          Every Velora answer renders as two visually-separated stacks. Stack&nbsp;1 is always above Stack&nbsp;2. A doctor with 5 seconds reads only Stack&nbsp;1; a doctor with 15 seconds reads both.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[12px] border border-tp-slate-200 bg-white p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Stack 1</span>
              <h3 className="text-[14px] font-semibold text-tp-slate-800">Hospital records</h3>
              <code className="ml-auto rounded bg-tp-slate-100 px-1.5 py-0.5 text-[10px] text-tp-slate-600">FACT</code>
            </div>
            <p className="text-[13px] leading-[1.5] text-tp-slate-600">
              Verbatim from the hospital's data. Attributed and verifiable. <strong className="text-tp-slate-800">No AI authoring.</strong> Click any line → source.
            </p>
          </div>
          <div className="rounded-[12px] border border-tp-slate-200 bg-white p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-tp-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tp-violet-700">Stack 2</span>
              <h3 className="text-[14px] font-semibold text-tp-slate-800">AI interpretation</h3>
              <code className="ml-auto rounded bg-tp-slate-100 px-1.5 py-0.5 text-[10px] text-tp-slate-600">SUGGESTED</code>
            </div>
            <p className="text-[13px] leading-[1.5] text-tp-slate-600">
              Curated clinical groupings from published guidelines applied to this patient. AI picks <em>which</em> guideline panels apply; AI does <strong className="text-tp-slate-800">not</strong> author clinical claims.
            </p>
          </div>
        </div>
      </div>

      {/* ── Validation contract ── */}
      <div>
        <h2 className="mb-3 text-[20px] font-bold text-tp-slate-900">The validation contract</h2>
        <p className="mb-5 max-w-3xl text-[13px] leading-[1.6] text-tp-slate-600">
          Five non-negotiables required on every answer. <strong className="text-tp-slate-800">Velora may not state a fact it cannot point to.</strong>
        </p>
        <div className="overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-tp-slate-50">
              <tr>
                <th className="w-12 px-4 py-3 text-left font-semibold text-tp-slate-600">#</th>
                <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">Required on every answer</th>
                <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">Why</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["1", "Source per claim — visit / Rx / lab / order ID", "No fact rests on LLM narrative alone"],
                ["2", "Guideline per clinical claim — body + section", "Reproducible reasoning"],
                ["3", "Executed query — Cypher visible on demand", "Audit trail"],
                ["4", "Data freshness — last graph sync time", "The doctor knows how stale it is"],
                ["5", "Exclusion log — what was filtered, why", "No hidden filters"],
              ].map(([n, req, why]) => (
                <tr key={n} className="border-t border-tp-slate-100">
                  <td className="px-4 py-3 font-bold text-tp-violet-600">{n}</td>
                  <td className="px-4 py-3 text-tp-slate-700">{req}</td>
                  <td className="px-4 py-3 text-tp-slate-600">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── The five intents — overview cards, each links to its own deep-dive page ── */}
      <div>
        <h2 className="mb-3 text-[20px] font-bold text-tp-slate-900">The five intents</h2>
        <p className="mb-5 max-w-3xl text-[13px] leading-[1.6] text-tp-slate-600">
          V0 ships four intents end-to-end (Panel audit is a V0.5 surface). Each intent has its own page documenting the exact chat card,
          its section-by-section logic, and the data sources behind every value. Open a card to read the deep dive.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <IntentOverview
            number="①"
            flagship
            icon={<Hospital className="h-5 w-5" strokeWidth={1.8} />}
            title="MDT brief"
            doctorQuestion="What does each specialty think — and where do they collide?"
            oneLine="Cross-team Assessment + Plan per specialty, plus a guideline-anchored synthesis where they meet."
            href="/dr-agent-design-system/velora-v0/mdt-brief"
          />
          <IntentOverview
            number="②"
            icon={<ClipboardCheck className="h-5 w-5" strokeWidth={1.8} />}
            title="Patient journey"
            doctorQuestion="What's the patient's whole story at this hospital?"
            oneLine="Vertical timeline of every signed visit, admission, MDT meeting, and scheduled item — with open loops surfaced inline at the date they occurred."
            href="/dr-agent-design-system/velora-v0/patient-journey"
          />
          <IntentOverview
            number="③"
            icon={<ShieldAlert className="h-5 w-5" strokeWidth={1.8} />}
            title="Active meds & safety"
            doctorQuestion="Before I prescribe — what conflicts?"
            oneLine="Active medications by prescriber, DDI flags, allergies, recent labs, and same-class duplicate-order warnings."
          />
          <IntentOverview
            number="④"
            icon={<AlertTriangle className="h-5 w-5" strokeWidth={1.8} />}
            title="Why flagged today"
            doctorQuestion="Why is this patient on my radar today?"
            oneLine="Today's concrete triggers — recent admission, critical lab, threshold breach, polypharmacy, missed follow-up."
          />
          <IntentOverview
            number="⑤"
            v0Plus
            icon={<BarChart3 className="h-5 w-5" strokeWidth={1.8} />}
            title="Panel audit"
            doctorQuestion="Across my panel, what's slipping?"
            oneLine="Cohort findings against signed definitions (T2DM uncontrolled, polypharmacy, eGFR<60 unreferred). V0.5 surface."
          />
        </div>
      </div>

      {/* ── Sources footer ── */}
      <div className="rounded-[12px] border border-tp-slate-200 bg-tp-slate-50 p-5">
        <div className="flex items-start gap-3">
          <FileSearch className="mt-0.5 h-5 w-5 shrink-0 text-tp-slate-500" />
          <div className="text-[12px] leading-[1.6] text-tp-slate-600">
            <p className="mb-1 font-semibold text-tp-slate-700">Sources for this documentation</p>
            <p>
              Authored from <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">README.md</code>,{" "}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">Velora_V0_Intent_Spec.md</code>, and{" "}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">Velora_V0_Spec.docx</code>.
              Every intent's deep-dive page renders the actual chat card and the signed rule trace behind every section.
            </p>
            <p className="mt-2 italic">© 2026 Zyvelor Labs · zyvelorlabs@tatvacare.in · Internal design package.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
