"use client"

import React, { useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Hospital } from "lucide-react"
import { AiBrandSparkIcon } from "@/components/doctor-agent/ai-brand"
import { AI_GRADIENT } from "@/components/tp-rxpad/dr-agent/constants"
import { VeloraV0MdtBriefCard } from "@/components/tp-rxpad/dr-agent/cards/velora-v0/VeloraV0MdtBriefCard"
import { MDT_BRIEF_MOCK } from "@/lib/velora/v0-replies"

// ─────────────────────────────────────────────────────────────
// Velora v0 · Intent ① — MDT brief · DEEP DIVE
//
// Layout: card on the LEFT, numbered annotations on the RIGHT.
// Every visible region of the card carries a ❶ badge; the same
// number opens an annotation block with What / Why / Where the
// data comes from (universal, EMR-agnostic) / How it helps the
// doctor. Below the annotated view, deeper tables: Assessment+Plan
// mapping for messy real-world Rx, guideline-picking per specialty,
// permutations, and the non-AI / AI split.
// ─────────────────────────────────────────────────────────────

// ── Small UI helpers ─────────────────────────────────────────

function NumBadge({ n, size = "md" }: { n: number; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-[18px] w-[18px] text-[10px]" : "h-[22px] w-[22px] text-[11px]"
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-tp-violet-600 font-bold text-white shadow-[0_2px_6px_-1px_rgba(75,74,213,0.4)] ${dim}`}
    >
      {n}
    </span>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-tp-slate-100 px-1.5 py-[1px] font-mono text-[11.5px] text-tp-slate-700">{children}</code>
}

/** A side-annotation block — number badge + title + What/Why/Data/Helps. */
function Annotation({
  n,
  title,
  what,
  why,
  data,
  helps,
}: {
  n: number
  title: string
  what: React.ReactNode
  why: React.ReactNode
  data: React.ReactNode
  helps: React.ReactNode
}) {
  return (
    <div id={`anno-${n}`} className="scroll-mt-[120px] rounded-[12px] border border-tp-slate-200 bg-white p-4">
      <div className="mb-2 flex items-start gap-2">
        <NumBadge n={n} />
        <h3 className="mt-[1px] text-[14px] font-bold text-tp-slate-900">{title}</h3>
      </div>
      <dl className="ml-[30px] grid grid-cols-[60px_1fr] gap-x-3 gap-y-[6px] text-[12.5px] leading-[1.55]">
        <dt className="text-[10px] font-bold uppercase tracking-[0.06em] text-tp-slate-400">What</dt>
        <dd className="text-tp-slate-700">{what}</dd>
        <dt className="text-[10px] font-bold uppercase tracking-[0.06em] text-tp-slate-400">Why</dt>
        <dd className="text-tp-slate-700">{why}</dd>
        <dt className="text-[10px] font-bold uppercase tracking-[0.06em] text-emerald-600">Data</dt>
        <dd className="text-tp-slate-700">{data}</dd>
        <dt className="text-[10px] font-bold uppercase tracking-[0.06em] text-tp-violet-600">Helps</dt>
        <dd className="text-tp-slate-700">{helps}</dd>
      </dl>
    </div>
  )
}

/** Each annotation's `anchor` is the value of a `data-mdt-anchor` attribute
 *  on the live card. The deep-dive component looks them up via querySelector
 *  on mount + on resize, so the numbered markers always sit on the right region
 *  even when the card content changes. */
const ANCHORS: Array<{ n: number; anchor: string; placement?: "top-left" | "right-edge" }> = [
  { n: 1, anchor: "card1-header" },
  { n: 2, anchor: "window-line" },
  { n: 3, anchor: "specialty-bar" },
  { n: 4, anchor: "specialty-bar", placement: "right-edge" },
  { n: 5, anchor: "specialty-body" },
  { n: 6, anchor: "card2-header" },
  { n: 7, anchor: "collide" },
  { n: 8, anchor: "synthesis" },
  { n: 9, anchor: "pending" },
]

/** Dynamic numbered marker overlay: looks up data-mdt-anchor elements within
 *  the wrapper ref and pins a badge at each one's top edge. Recomputes on
 *  resize. The placement="right-edge" badge sits at the right of the row
 *  instead of the left (used for the doctor + date trailing slot). */
function CardMarkers({ wrapperRef }: { wrapperRef: React.RefObject<HTMLDivElement | null> }) {
  const [positions, setPositions] = useState<Record<number, { top: number; left?: number; right?: number }>>({})

  useLayoutEffect(() => {
    function compute() {
      const wrapper = wrapperRef.current
      if (!wrapper) return
      const wrapperRect = wrapper.getBoundingClientRect()
      const next: Record<number, { top: number; left?: number; right?: number }> = {}
      for (const { n, anchor, placement } of ANCHORS) {
        const el = wrapper.querySelector(`[data-mdt-anchor="${anchor}"]`) as HTMLElement | null
        if (!el) continue
        const rect = el.getBoundingClientRect()
        const top = rect.top - wrapperRect.top + 4
        if (placement === "right-edge") {
          next[n] = { top, right: wrapperRect.right - rect.right - 6 }
        } else {
          next[n] = { top, left: -10 }
        }
      }
      setPositions(next)
    }
    compute()
    window.addEventListener("resize", compute)
    // Recompute on next animation frames in case fonts / icons load late.
    const t1 = setTimeout(compute, 150)
    const t2 = setTimeout(compute, 600)
    return () => {
      window.removeEventListener("resize", compute)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [wrapperRef])

  return (
    <>
      {ANCHORS.map(({ n }) => {
        const pos = positions[n]
        if (!pos) return null
        return (
          <span key={n} className="pointer-events-none absolute z-10" style={pos}>
            <NumBadge n={n} size="sm" />
          </span>
        )
      })}
    </>
  )
}

/** Render a list of bulleted pointers — used inside Annotation `data` / `helps`
 *  slots so the dense field-mapping text reads as a scannable list, not a wall
 *  of sentences. */
function Pointers({ items }: { items: Array<{ label?: React.ReactNode; body: React.ReactNode }> }) {
  return (
    <ul className="flex flex-col gap-[5px]">
      {items.map((it, i) => (
        <li key={i} className="flex gap-[6px]">
          <span className="mt-[7px] inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-tp-slate-400" />
          <span className="leading-[1.55]">
            {it.label && <strong className="font-semibold text-tp-slate-800">{it.label}</strong>}
            {it.label && " — "}
            {it.body}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Sticky left column: live MDT card wrapped with dynamic numbered markers. */
function LiveCardColumn() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  return (
    <div className="lg:sticky lg:top-[120px] lg:self-start">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-tp-slate-500">
        <span className="rounded-full bg-tp-slate-100 px-2 py-[2px]">Live card</span>
        <span>The exact component the doctor sees in chat.</span>
      </div>
      <div
        ref={wrapperRef}
        className="relative rounded-[14px] border border-tp-slate-200 bg-white p-4 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.15)]"
      >
        <CardMarkers wrapperRef={wrapperRef} />
        <VeloraV0MdtBriefCard data={MDT_BRIEF_MOCK} />
      </div>
      <p className="mt-3 text-[11px] text-tp-slate-500">
        <strong className="text-tp-slate-700">Note —</strong> on lg screens this card is sticky; scroll the annotation panel on the right to walk the card top-to-bottom.
      </p>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────

export function MdtBriefDeepDivePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#FAFAFE]">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-50 border-b border-tp-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/dr-agent-design-system")}
            aria-label="Back to Velora v0 overview"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-tp-slate-200 bg-white text-tp-slate-500 transition-colors hover:bg-tp-slate-50 hover:text-tp-slate-700"
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: AI_GRADIENT }}>
            <AiBrandSparkIcon size={20} className="[filter:brightness(0)_invert(1)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link href="/dr-agent-design-system" className="text-[11px] font-semibold uppercase tracking-wide text-tp-slate-400 hover:text-tp-violet-600">
                Velora v0
              </Link>
              <span className="text-[11px] text-tp-slate-300">/</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-tp-slate-500">Intent ① — Cross-consultation brief</span>
            </div>
            <h1
              className="truncate text-[18px] font-bold leading-tight"
              style={{ background: AI_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
            >
              Cross-consultation brief — Deep dive
            </h1>
            <p className="truncate text-[11px] text-tp-slate-400">
              The actual chat card · every section annotated · data sources, selection rules, and the trust contract.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        {/* ── 0. Intro ── */}
        <section className="mb-8">
          <div className="rounded-[14px] border border-tp-violet-200 bg-gradient-to-br from-tp-violet-50 to-tp-blue-50 p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-tp-violet-600 text-white">
                <Hospital size={14} strokeWidth={2} />
              </span>
              <span className="rounded-full bg-tp-violet-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Intent ①</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Flagship</span>
            </div>
            <h2 className="mb-2 text-[22px] font-bold leading-tight text-tp-slate-900">
              What does each specialty think — and where do they collide?
            </h2>
            <p className="max-w-3xl text-[13.5px] leading-[1.6] text-tp-slate-700">
              MDT brief surfaces the multi-disciplinary picture for one patient as two cards:
              <strong className="text-tp-slate-900"> Card 1 — MDT brief</strong> (verbatim Assessment + Plan per specialty, attributed) and
              <strong className="text-tp-slate-900"> Card 2 — Clinical synthesis</strong> (guideline-anchored interpretation of what those notes mean together).
              Every region below the card carries a numbered badge; the annotation panel on the right explains what's shown, why it's there,
              where the data comes from in any EMR, and how it helps the doctor.
            </p>
          </div>
        </section>

        {/* ── 0. The case briefing — doctor + patient scenario ──
            Grounds every example below in a real, internally-consistent clinical month.
            All four intent cards (MDT brief, Patient journey, Active meds, Why flagged) +
            the Trends sub-card use the SAME Ravi Shankar data — no parallel mocks. */}
        <section className="mb-12">
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tp-violet-600">0. The case briefing</div>
            <h2 className="mt-1 text-[20px] font-bold text-tp-slate-900">The doctor & the patient — one canonical scenario behind every example</h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-[1.55] text-tp-slate-600">
              Every screenshot, mock value and tooltip in this doc comes from the <strong>same patient month</strong>. No invented numbers, no
              parallel mocks. If <em>HbA1c 8.4%</em> shows in MDT brief, the same value shows in Trends; if <em>eGFR 48</em> drives the
              KDIGO panel in Stack 2, the same 48 is the latest reading in the Lab Results sidebar. The scenario below is the source of truth.
            </p>
          </div>

          {/* Doctor + patient identity */}
          <div className="mb-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-[12px] border border-tp-slate-200 bg-white p-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-tp-violet-600">Doctor using Velora</div>
              <p className="text-[15px] font-bold text-tp-slate-900">Dr Sharma</p>
              <p className="text-[13px] text-tp-slate-600">Consultant <strong>Cardiologist</strong> · Zydus General Hospital, Ahmedabad</p>
              <p className="mt-2 text-[12.5px] leading-[1.55] text-tp-slate-600">
                Today is Dr Sharma's <strong>first consult with Ravi at Zydus</strong>. The patient was referred in by Dr Bose (Nephro) after eGFR confirmed G3a, with an external Apixaban Rx already on file from City General Hospital. Velora's MDT brief surfaces Endo (Dr Iyer) + Nephro (Dr Bose) — the two teams that have actually written for Ravi at this hospital.
              </p>
              <p className="mt-2 rounded-[6px] bg-tp-slate-50 px-2 py-1.5 text-[11.5px] leading-[1.5] text-tp-slate-600">
                <strong className="text-tp-slate-800">Specialty lens —</strong> the same patient viewed by a nephrologist would re-rank Stack 1
                (Nephro first, Cardio second) and re-pick the Trends top-3 (eGFR + ACR + K⁺ instead of CHA₂DS₂-VASc + eGFR + ABPM).
                Lens comes from <Code>doctor.specialty</Code> + <Code>hospital.yaml</Code> — not the LLM.
              </p>
            </div>
            <div className="rounded-[12px] border border-tp-slate-200 bg-white p-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-tp-violet-600">Patient</div>
              <p className="text-[15px] font-bold text-tp-slate-900">Ravi Shankar</p>
              <p className="text-[13px] text-tp-slate-600">M, 64y · MRN-78214 · returning patient · this hospital</p>
              <p className="mt-2 text-[12.5px] leading-[1.55] text-tp-slate-600">
                Software professional. <strong>Primary problem: diabetic nephropathy</strong> — long-term <strong>T2DM</strong> (dx 2019) progressed to <strong>Stage G3a CKD</strong> (dx 2024), now under active Nephro management at Zydus. <strong>Paroxysmal AFib</strong> diagnosed externally at City General (2025) — managed on <strong>Apixaban</strong>. <strong>Essential HTN</strong>. Penicillin allergy (severe, anaphylaxis 2020). Today's MDT brief is anchored on the CKD-driven Cardio referral.
              </p>
              <p className="mt-2 rounded-[6px] bg-tp-slate-50 px-2 py-1.5 text-[11.5px] leading-[1.5] text-tp-slate-600">
                <strong className="text-tp-slate-800">Patient type —</strong> Type 1 (returning patient, rich hospital data, doctor has prior context). Velora value: <em>augments memory</em>. First card on welcome: MDT brief.
              </p>
            </div>
          </div>

          {/* The clinical month — visit-by-visit */}
          <h3 className="mb-2 text-[14px] font-semibold text-tp-slate-800">The clinical month at Zydus General</h3>
          <div className="mb-3 overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white">
            <table className="w-full text-[12.5px]">
              <thead className="bg-tp-slate-50">
                <tr>
                  <th className="w-[90px] px-4 py-3 text-left font-semibold text-tp-slate-600">Date</th>
                  <th className="w-[130px] px-4 py-3 text-left font-semibold text-tp-slate-600">Specialty · doctor</th>
                  <th className="w-[160px] px-4 py-3 text-left font-semibold text-tp-slate-600">What was filled in the RxPad</th>
                  <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">Cross-team signal generated</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "02 Apr '26",
                    "Nephrology · Dr Bose",
                    <><strong>Dx:</strong> G3a CKD · <strong>Labs:</strong> eGFR 48, ACR 60, K⁺ 4.2 · <strong>Rx:</strong> none added · <strong>Plan:</strong> hold apixaban dose-up, repeat eGFR + ACR in 8 wks · <strong>Referral:</strong> joint review with Cardio (requested)</>,
                    <>eGFR drop into G3a → triggers <em>drug-dose-window</em> rule for any future anticoag / SGLT2 prescription.</>,
                  ],
                  [
                    "18 Apr '26",
                    "Endocrinology · Dr Iyer",
                    <><strong>Dx:</strong> T2DM uncontrolled · <strong>Labs:</strong> HbA1c 8.4% · <strong>Rx:</strong> Metformin 1000mg BID continued + <strong>Empagliflozin 10mg OD added</strong> · <strong>Plan:</strong> recheck HbA1c at 12 wks · <strong>Lab Investigation:</strong> HbA1c, lipid panel ordered</>,
                    <>SGLT2 start <em>after</em> the eGFR drop with no notification to Cardio → seeds the “Where they collide” coordination-gap detector.</>,
                  ],
                  [
                    "22 Apr '26",
                    "Cardio intake (booked)",
                    <>First Cardiology intake appointment at Zydus booked · <strong>Status: no-show</strong>. Rescheduled to 28 Apr.</>,
                    <>Missed first appointment → surfaces inline in Patient journey as an OPEN-LOOP row (amber, ageDays = 6).</>,
                  ],
                  [
                    "28 Apr '26 (today)",
                    "Cardiology (first visit) · Dr Sharma",
                    <><strong>Initial Cardiology consult</strong> at Zydus · imports external Apixaban Rx from City General · re-confirms AFib (paroxysmal) on today's ECG · <strong>CHA₂DS₂-VASc</strong> = 4 · <strong>TSH</strong> ordered · plan: joint Cardio + Nephro review for renal-dose window.</>,
                    <>This is Dr Sharma's FIRST encounter with Ravi at Zydus — there are no prior Zydus Cardio notes for the MDT brief to surface. The Apixaban that appears across the panels is an externally-prescribed Rx imported on referral.</>,
                  ],
                ].map((row, i) => (
                  <tr key={i} className="border-t border-tp-slate-100 align-top">
                    <td className="px-4 py-3 font-mono text-[11.5px] text-tp-slate-500">{row[0]}</td>
                    <td className="px-4 py-3 font-semibold text-tp-slate-800">{row[1]}</td>
                    <td className="px-4 py-3 text-tp-slate-700">{row[2]}</td>
                    <td className="px-4 py-3 text-tp-slate-600">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* The full data inventory */}
          <h3 className="mb-2 mt-6 text-[14px] font-semibold text-tp-slate-800">What's on file for Ravi (canonical mock data)</h3>
          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-[10px] border border-tp-slate-200 bg-white px-4 py-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-tp-violet-600">Active diagnoses</p>
              <ul className="text-[12.5px] leading-[1.7] text-tp-slate-700">
                <li>· <strong>AFib</strong> (paroxysmal, dx 2024) — Cardiology</li>
                <li>· <strong>T2DM</strong> (uncontrolled, dx 2019) — Endocrinology</li>
                <li>· <strong>Stage G3a CKD</strong> (dx 2024) — Nephrology</li>
                <li>· <strong>Essential HTN</strong> (dx 2018) — General Medicine</li>
              </ul>
            </div>
            <div className="rounded-[10px] border border-tp-slate-200 bg-white px-4 py-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-tp-violet-600">Active medications (5)</p>
              <ul className="text-[12.5px] leading-[1.7] text-tp-slate-700">
                <li>· <strong>Apixaban</strong> 5mg BID — Cardiology (since 12 Mar)</li>
                <li>· <strong>Metoprolol</strong> 25mg BID — Cardiology</li>
                <li>· <strong>Metformin</strong> 1000mg BID — Endocrinology</li>
                <li>· <strong>Empagliflozin</strong> 10mg OD — Endo (started 18 Apr)</li>
                <li>· <strong>Telmisartan</strong> 40mg OD — primary care, chronic (no in-hospital fill in 90d)</li>
              </ul>
            </div>
            <div className="rounded-[10px] border border-tp-slate-200 bg-white px-4 py-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-tp-violet-600">Lab Results (digital — last 24 mo)</p>
              <ul className="text-[12.5px] leading-[1.7] text-tp-slate-700">
                <li>· <strong>HbA1c</strong>: 9.1 → 8.7 → 8.6 → <strong className="text-tp-error-600">8.4</strong> (Aug ’25 → Apr ’26)</li>
                <li>· <strong>eGFR</strong>: 62 → 55 → 51 → <strong className="text-tp-error-600">48</strong> (Aug ’25 → Apr ’26)</li>
                <li>· <strong>ACR</strong>: <strong className="text-tp-error-600">60 mg/g</strong> (Apr ’26)</li>
                <li>· <strong>K⁺</strong>: 4.2 mmol/L · <strong>FBS</strong>: 168</li>
                <li>· <strong>Vit D</strong>: ↓ 18 ng/mL</li>
              </ul>
            </div>
            <div className="rounded-[10px] border border-tp-slate-200 bg-white px-4 py-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-tp-violet-600">Lab Results (documents)</p>
              <ul className="text-[12.5px] leading-[1.7] text-tp-slate-700">
                <li>· <Code>ECG-2026-04-24.pdf</Code> — “persistent AF” (Dr Sharma)</li>
                <li>· <Code>TTE-2026-04-21.pdf</Code> — LVEF 55%, mild LVH</li>
                <li>· <Code>ABPM-2026-03.pdf</Code> — daytime mean 152/95</li>
              </ul>
            </div>
            <div className="rounded-[10px] border border-tp-slate-200 bg-white px-4 py-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-tp-violet-600">Allergies + history</p>
              <ul className="text-[12.5px] leading-[1.7] text-tp-slate-700">
                <li>· <strong className="text-tp-error-600">Penicillin</strong> — severe (anaphylaxis 2020)</li>
                <li>· Appendectomy 2018 · uneventful</li>
                <li>· Father: T2DM (onset 45y)</li>
              </ul>
            </div>
            <div className="rounded-[10px] border border-tp-slate-200 bg-white px-4 py-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-tp-violet-600">Pending / unresolved</p>
              <ul className="text-[12.5px] leading-[1.7] text-tp-slate-700">
                <li>· <strong>TSH</strong> ordered 28 Apr — no result (12d)</li>
                <li>· <strong>Cardio referral</strong> 03 Apr — not yet held (41d)</li>
                <li>· <strong>Follow-up</strong> booked 22 Apr — no-show (18d)</li>
                <li>· <strong>Telmisartan refill</strong> — no in-hospital fill (73d)</li>
              </ul>
            </div>
          </div>

          {/* Why each intent fires for this patient */}
          <h3 className="mb-2 mt-6 text-[14px] font-semibold text-tp-slate-800">How this scenario lights up every intent</h3>
          <div className="overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white">
            <table className="w-full text-[12.5px]">
              <thead className="bg-tp-slate-50">
                <tr>
                  <th className="w-[180px] px-4 py-3 text-left font-semibold text-tp-slate-600">Intent</th>
                  <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">What Ravi's data triggers</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["① MDT brief", <>2 other specialties touched at Zydus in 90d → 2 Stack-1 sections (Endo + Nephro). Cardio is the user's own lens, filtered out. Empagliflozin started after eGFR drop with no Cardio notification → <em>Where they collide</em> coordination-gap fire. Metformin 1000 mg BID at eGFR 48 → <em>Where they collide</em> DDI fire (ADA §6.5).</>],
                  ["② Patient journey", <>Vertical timeline · 20 months · 8 encounters at Zydus + 1 external. Today is Dr Sharma's first Cardio consult — earlier rows are Endo, Nephro, lab reports, and the missed 22 Apr intake. Open / pending items surface inline as RED rows.</>],
                  ["③ Active meds & safety", <>5 active drugs across 4 specialties. <strong>Apixaban + Penicillin allergy</strong> — no class match, no flag. Polypharmacy ≥5 chronic meds for ≥90d → triggers <strong>NICE NG56 review</strong> flag.</>],
                  ["④ Why flagged today", <><strong>Critical eGFR</strong> drop into G3a, <strong>polypharmacy</strong> threshold met, <strong>missed follow-up</strong> in last 30d. No recent admission — but three independent warnings stacked.</>],
                  ["Trends sub-card", <>HbA1c (target &lt;7%, currently 8.4 ↓), eGFR (target ≥60, currently 48 ↓ G3a), ABPM Daytime mean (target ≥135, currently 152 ↑). All three picked deterministically because they appear flagged in Stack 1.</>],
                ].map((row, i) => (
                  <tr key={i} className="border-t border-tp-slate-100 align-top">
                    <td className="px-4 py-3 font-semibold text-tp-slate-800">{row[0]}</td>
                    <td className="px-4 py-3 text-tp-slate-700">{row[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 max-w-3xl rounded-[8px] bg-tp-violet-50/70 px-3 py-2 text-[12.5px] leading-[1.55] text-tp-violet-700">
            <strong>Why one canonical scenario —</strong> every mock value in every card flows from the same patient month. The
            doctor-using-Velora and the patient-being-discussed are both grounded. When the team replaces Ravi with a real EMR
            patient, every intent will read the same fields — nothing is invented for the demo that won't exist for the real visit.
          </p>
        </section>

        {/* ── 1. Side-by-side: card + numbered annotations ── */}
        <section className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* LEFT — annotated live card */}
          <LiveCardColumn />

          {/* RIGHT — annotations */}
          <div className="space-y-3">
            <Annotation
              n={1}
              title="Card header — icon, title, patient line"
              what={<>Icon, the title <Code>MDT brief</Code>, and the patient identifier line <Code>Ravi Shankar (M, 64y)</Code>.</>}
              why="Doctor must confirm the right patient before reading anything below. MRN is intentionally hidden from the title and lives only in the source tooltip — the title stays scannable."
              data={<>Universal patient identity fields: <strong>name</strong>, <strong>sex</strong>, <strong>age</strong>. Present in every EMR (HL7-FHIR <Code>Patient</Code> resource, or equivalent table). MRN comes from <strong>patient identifier</strong>.</>}
              helps="Anchors context in one glance — eliminates the most common charting-error class (acting on the wrong patient)."
            />
            <Annotation
              n={2}
              title="Window summary line"
              what={<><em>“N specialties touched this patient in the last 90 days.”</em></>}
              why={<>Sets cross-team scope in one sentence: is this a 2-team case or 5-team? Also fixes the time window every section below obeys.</>}
              data={<>Distinct <strong>provider specialties</strong> attached to <strong>encounters</strong> that have a <strong>signed clinical note</strong> in the last <strong>N days</strong>. Window is configurable per hospital (default 90).</>}
              helps="Forces the doctor to register the multi-disciplinary scope before drilling in — protects against single-specialty tunnel vision."
            />
            <Annotation
              n={3}
              title="Specialty section bar"
              what={<>Section bar with the specialty name (e.g. <strong>Cardiology</strong>) and the eye-icon tooltip on the right.</>}
              why="One row per specialty involved. The eye-icon answers two audit questions: which note this section came from, and why this note was picked over others."
              data={<>Specialty name comes from <strong>provider role / department</strong> on the encounter. The eye-tooltip is a deterministic selector trace, not LLM prose.</>}
              helps="The doctor can re-derive every row — no claim rests on AI narrative alone."
            />
            <Annotation
              n={4}
              title="Doctor name + signed date"
              what={<>Trailing pair <Code>Dr Sharma · (24 Apr ’26)</Code> shown on every specialty bar.</>}
              why="Attribution. A clinical reviewer needs the author and date to argue the claim."
              data={<><strong>Signed-by</strong> and <strong>signed-at</strong> fields on the note. Short-date utility turns <Code>2026</Code> into <Code>’26</Code> to save header space.</>}
              helps="Tells the doctor how fresh / how stale the take is at a glance — the colour of the date can be used downstream to dim stale notes."
            />
            <Annotation
              n={5}
              title="Specialty body — 5 structured pointers"
              what={
                <Pointers
                  items={[
                    { label: "1 · Findings", body: <>the diagnosis name — what this specialty formally wrote down.</> },
                    { label: "2 · Key labs", body: <>1-3 abnormal lab results uploaded against the latest Rx.</> },
                    { label: "3 · Medical history", body: <>chronic conditions + allergies + relevant prior history that frames this Rx.</> },
                    { label: "4 · Medications", body: <>drugs verbatim from the latest Rx's Medication section.</> },
                    { label: "5 · Plan", body: <>Pipe-divided list of actions — verbatim, no section headings. Only <em>Follow-up</em> keeps its label (it's the date cadence). Lab investigations, advice, and referrals read as plain phrases.</> },
                  ]}
                />
              }
              why={
                <Pointers
                  items={[
                    { body: <>Maps 1-to-1 to the RxPad surfaces — Findings ← Diagnosis · Key labs ← Lab Results · Medical history ← Medical History section · Medications ← Medication (Rx) · Plan ← (Lab Investigation + Surgery + Follow-up + Additional Notes).</> },
                    { body: <>Labels in a lighter slate weight so the eye lands on the values, not the category name.</> },
                    { body: <>Strict bucket discipline — risk scores (CHA₂DS₂-VASc, HAS-BLED) live in <em>Key labs</em>, never in <em>Findings</em>. Allergies + chronic conditions live in <em>Medical history</em>, never echoed inside Findings.</> },
                  ]}
                />
              }
              data={
                <Pointers
                  items={[
                    {
                      label: "Findings ← RxPad Diagnosis section",
                      body: (
                        <>
                          Diagnosis row carries <Code>name</Code>, <Code>since</Code>, <Code>status</Code> (<em>Suspected / Confirmed / Ruled Out</em>), <Code>note</Code>.
                          <br />· Filter to <Code>status = Confirmed</Code>, take the top row, render the <Code>name</Code> only (chronicity / type can come from the <Code>name</Code> string when the doctor wrote it that way, e.g. <em>“AFib (paroxysmal)”</em>).
                          <br />· <strong>No enrichment from Medical History.</strong> No year-of-onset. No AI matching. Just the diagnosis as the doctor wrote it.
                          <br />· Renamed from “Assessment” to “Findings” so the reader knows this is what was <em>written down</em>, not Velora's interpretation.
                        </>
                      ),
                    },
                    {
                      label: "Key labs ← Lab Results sidebar + Medical Records",
                      body: (
                        <>
                          Abnormal results uploaded against this specialty's latest Rx.
                          <br />· Filter to <Code>status = Abnormal / Critical</Code> on the date of the latest visit (or within 30d).
                          <br />· Rank: <em>Critical &gt; Abnormal</em>, then most-recent within tone. Cap at 3.
                          <br />· If the lab is a document (ECG / TTE / X-Ray PDF), read the doctor's quoted note in <Code>Lab Investigation.note</Code> first; OCR fallback only if note is empty.
                          <br />· Reference ranges live in the ⓘ tooltip, never inline. Tone (red / amber) set by the signed reference-range registry, not the LLM.
                        </>
                      ),
                    },
                    {
                      label: "Medical history ← RxPad Medical History (sidebar)",
                      body: (
                        <>
                          Top-3 cross-team relevant chronic conditions + severe allergies, filtered to what matters for the specialty reading the row.
                          <br />· <strong>Chronic conditions</strong>: read from <Code>Medical History → Chronic Conditions</Code>. Format <Code>name + (dx year)</Code>.
                          <br />· <strong>Allergies</strong>: read from <Code>Medical History → Allergies</Code>. Severe / drug-class allergies surface inline; mild allergies are omitted unless the specialty's panel needs them.
                          <br />· <em>Why per-specialty</em>: Endo wants T2DM duration + Penicillin allergy; Nephro wants CKD stage + Penicillin allergy; Cardio wants HTN + AFib + bleeding history. Same RxPad data, different lens.
                        </>
                      ),
                    },
                    {
                      label: "Medications ← RxPad Medication (Rx) section",
                      body: (
                        <>
                          Rows from the latest signed Rx, verbatim.
                          <br />· Columns rendered: <Code>medicine</Code> + <Code>unitPerDose</Code> + <Code>frequency</Code>. Drop <Code>when</Code> / <Code>duration</Code> / <Code>note</Code> to stay one line.
                          <br />· <em>Empty case</em>: deterministic templated sentence <Code>{`"Monitoring only. No <specialty>-prescribed drug on file."`}</Code>.
                        </>
                      ),
                    },
                    {
                      label: "Plan ← pipe-divided action list (no headings)",
                      body: (
                        <>
                          The Plan bullet reads as a list of clinical actions divided by light pipes — no <em>“Lab investigation:”</em> or <em>“Additional notes:”</em> headings echoing inline. Headings would just consume horizontal space; the content speaks for itself.
                          <br />· <strong>Lab Investigation rows</strong>: rendered verbatim (e.g. <em>“Repeat eGFR + ACR”</em>).
                          <br />· <strong>Surgery rows</strong>: rendered verbatim (omitted entirely if empty).
                          <br />· <strong>Follow-up</strong>: only label kept — <code className="font-mono text-[11px]">**Follow-up** &lt;cadence&gt;</code> (e.g. <em>“Follow-up 12 weeks”</em>) — because the cadence reads as a label, not as content.
                          <br />· <strong>Additional notes</strong>: first sentence of the Additional Notes section, verbatim.
                          <br />· <strong>Referral</strong>: when present, appended as a plain phrase (e.g. <em>“joint Cardio + Nephro review requested”</em>).
                          <br />String concatenation only — no LLM authorship. Empty sub-sections are omitted, never rendered as placeholders.
                        </>
                      ),
                    },
                  ]}
                />
              }
              helps={
                <Pointers
                  items={[
                    { body: <>Every cross-team reader gets the same five-pointer take-away regardless of specialty.</> },
                    { body: <>1-to-1 mapping to RxPad sections — no new data capture for the data team.</> },
                    { body: <>When the doctor opens the source ⓘ, the audit trace shows which RxPad row + section + visit the value came from.</> },
                  ]}
                />
              }
            />
            <Annotation
              n={6}
              title="Card 2 header — Clinical synthesis"
              what={<>A second card frame with title <Code>Clinical synthesis</Code> and the intro line stating Velora picks which panels apply, not the claims.</>}
              why="Visual break is intentional. Card 1 is fact (verbatim notes); Card 2 is interpretation (guideline panels). A doctor with 5 seconds reads Card 1 only."
              data={<>This card's Data Sources eye lists exactly the inputs: DDI rule base + cited guideline bodies + note metadata. No hidden joins.</>}
              helps="Tells the doctor the trust contract before they read a single synthesis row — interpretation that doesn't trace to a published body is not allowed."
            />
            <Annotation
              n={7}
              title="“Where they collide” — two detectors"
              what={
                <Pointers
                  items={[
                    { body: <>Warning panel with a flag icon + a count badge. Each detector fire is a card inside it — a coloured kind badge (DDI flag / Coordination gap), the drug-pair title with highlighted tokens, bullet points of evidence, and the cited guideline chip.</> },
                    { body: <>Only renders when at least one detector fires. Hidden completely when both are clean — no empty placeholder.</> },
                  ]}
                />
              }
              why={
                <Pointers
                  items={[
                    { body: <>The most clinically dangerous case in cross-team care: one team's plan invalidated by another team's signal nobody told them about.</> },
                    { body: <>Surfacing the gap <em>before</em> the next prescribing decision is the whole reason the MDT brief exists.</> },
                    { body: <>Each fire renders as its own card so the doctor can scan and decide per-detector — not as one long paragraph.</> },
                  ]}
                />
              }
              data={
                <Pointers
                  items={[
                    {
                      label: "Detector 1 · DDI flag (drug-to-drug + drug-vs-condition)",
                      body: (
                        <>
                          Runs the active <Code>Medication (Rx)</Code> list against the signed DDI rule base (Lexicomp / Zydus formulary) AND against the cited guideline body's dose-vs-condition rules (e.g. ADA Metformin ceiling at eGFR 30-60).
                          <br />· For Ravi this detector fires: <strong>Metformin 1000 mg BID</strong> (= 2000 mg/day) on a patient at <strong>eGFR 48</strong>. ADA 2024 §6.5 caps total daily Metformin at 1000 mg/day in that eGFR band.
                          <br />· Renders 3-4 bullets: what's active, the patient's value that triggered the rule, the guideline's threshold, and the recommended action.
                        </>
                      ),
                    },
                    {
                      label: "Detector 2 · Coordination gap",
                      body: (
                        <>
                          Cross-team signal — a drug started <em>after</em> another specialty's relevant value with no notification edge between them.
                          <br />· Pattern: <Code>DrugExposure.startDate &gt; Measurement.date</Code> AND <Code>NOT EXISTS notification(prescriber → otherSpecialty)</Code>.
                          <br />· For Ravi this fires: <strong>Empagliflozin</strong> started by Endo on 18 Apr, AFTER Nephro's <strong>eGFR 48</strong> on 02 Apr, with no notification edge to Cardio.
                          <br />· Bullets call out the drug pair, the trigger value, the dates, and the missing notification.
                        </>
                      ),
                    },
                    {
                      label: "Rendering rules",
                      body: (
                        <>Each entry is its own card inside the warning panel. The pink-tone <strong>DDI flag</strong> badge means a rule fired with a numeric threshold breach; the amber <strong>Coordination gap</strong> badge means a temporal / notification rule fired. The cited guideline chip is hoverable for the body's full description.</>
                      ),
                    },
                  ]}
                />
              }
              helps={
                <Pointers
                  items={[
                    { body: <>Velora reports — it doesn't propose. The doctor still owns the prescribing call.</> },
                    { body: <>If both detectors are clean, the box is hidden — no false positives, no “all clear” noise.</> },
                  ]}
                />
              }
            />
            <Annotation
              n={8}
              title="Synthesis panels — what they are + per-panel reasoning"
              what={
                <Pointers
                  items={[
                    { body: <>A “synthesis panel” is the standard table a clinical guideline uses to assess one condition (e.g. ESC's panel for AFib anticoagulation: stroke-risk score + drug + dose).</> },
                    { body: <>Velora fills that table with this patient's actual values. <strong>Velora does not invent the panel</strong> — it picks <em>which</em> published panels apply, then projects the patient's data into them.</> },
                    { body: <>One panel per matched theme. Each row: a clinical variable + its current value. Hover the ⓘ on the label for target / reference range + source provenance.</> },
                  ]}
                />
              }
              why={
                <Pointers
                  items={[
                    { body: <>This is the bridge between “verbatim notes” (Stack 1) and a decision (the doctor's). The guideline body is the third voice in the room — neither Velora nor the doctor authors it.</> },
                    { body: <>Showing the body's standard panel filled with real values is what the doctor would do on paper anyway. Velora just does it faster, with citations.</> },
                  ]}
                />
              }
              data={
                <Pointers
                  items={[
                    {
                      label: "What kind of data sits in a synthesis panel",
                      body: (
                        <>
                          Not just labs. Each panel can mix:
                          <br />· <strong>Lab values</strong> (HbA1c, eGFR, K⁺, troponin…)
                          <br />· <strong>Vital measurements</strong> (BP from ABPM, HR, SpO₂…)
                          <br />· <strong>Computed risk scores</strong> (CHA₂DS₂-VASc, HAS-BLED, GFR equations…)
                          <br />· <strong>Active drug class flags</strong> (is there an anticoagulant on board?)
                          <br />· <strong>Threshold checks</strong> (e.g. <em>“is HbA1c &gt; 9%?”</em>)
                          The guideline body declares which of these its panel needs.
                        </>
                      ),
                    },
                    {
                      label: "How AI decides which panels apply (the only AI step)",
                      body: (
                        <>
                          1. Velora reads the <strong>Findings</strong> bullet of every specialty in Stack 1.
                          <br />2. A narrow theme-coding step (one LLM call) maps each Finding to ICD-10 / SNOMED codes (e.g. <em>“AFib (paroxysmal)”</em> → <Code>I48.0</Code>).
                          <br />3. <Code>hospital.yaml</Code> lists which guideline panel each code triggers.
                          <br />4. For each triggered panel, Velora reads the required columns from the RxPad. If all columns have values, the panel renders. If even one column is missing, the panel is hidden — never with a placeholder.
                          <br />The values themselves are never touched by AI.
                        </>
                      ),
                    },
                    {
                      label: "Per-panel reasoning — for Ravi",
                      body: (
                        <>
                          <strong>AF anticoagulation status (ESC 2024).</strong> Triggered because Cardiology's Findings line carries <em>“AFib (paroxysmal)”</em> AND Apixaban appears in Medication. Required columns (CHA₂DS₂-VASc inputs + active anticoag) are all present in Ravi's record → panel renders.
                          <br />
                          <br /><strong>Resistant HTN panel (ESC/ESH 2023).</strong> Triggered because HTN sits in Ravi's chronic conditions AND ABPM daytime mean &gt; target in the last 30 days AND ≥3 antihypertensives are active. All three required inputs present → panel renders.
                          <br />
                          <br />If Ravi were a different patient — say no AFib, no anticoag — the AF panel would simply not trigger. Same rule, different outcome.
                        </>
                      ),
                    },
                  ]}
                />
              }
              helps={
                <Pointers
                  items={[
                    { body: <>Doctor sees the cited body's standard panel with this patient's actual values in seconds.</> },
                    { body: <>If the doctor disagrees with the rendering, they're disagreeing with the body — not with Velora. The chip + ⓘ tooltips trace it back.</> },
                    { body: <>When a required column is missing, the panel simply doesn't render — never silently estimated.</> },
                  ]}
                />
              }
            />
            <Annotation
              n={9}
              title="Pending MDT — unfinished handoffs"
              what="Bulleted list at the foot of Card 2: handoffs that were requested or scheduled but didn't happen."
              why="The operational tail. After fact and interpretation, the reader needs to know what's still open across teams."
              data={<>(a) <strong>Referrals</strong> in the window with no destination <strong>encounter</strong>. (b) <strong>MDT meeting notes</strong> count in the window (zero → the “no documented MDT” line renders).</>}
              helps="Closes the loop on cross-team coordination — Velora surfaces the gap; the doctor decides if it matters."
            />
          </div>
        </section>

        {/* ── 2. Assessment + Plan mapping — the messy-Rx reality ── */}
        <section className="mb-12">
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tp-violet-600">2. Per-pointer mapping</div>
            <h2 className="mt-1 text-[20px] font-bold text-tp-slate-900">Where each pointer comes from in the TP RxPad — direct field reads, no AI</h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-[1.55] text-tp-slate-600">
              Stack 1 is built entirely from the structured rows the doctor already enters in the RxPad — no LLM authorship, no inference where structured data exists.
              Every bullet maps 1-to-1 to a specific RxPad section (or a documented fallback when the section is empty).
            </p>
          </div>
          <div className="overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white">
            <table className="w-full text-[12.5px]">
              <thead className="bg-tp-slate-50">
                <tr>
                  <th className="w-[120px] px-4 py-3 text-left font-semibold text-tp-slate-600">Pointer</th>
                  <th className="w-[200px] px-4 py-3 text-left font-semibold text-tp-slate-600">Primary RxPad source</th>
                  <th className="w-[180px] px-4 py-3 text-left font-semibold text-tp-slate-600">Augmented from</th>
                  <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">Selection rule (deterministic)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "Assessment",
                    <><Code>Diagnosis</Code> section · top row's <Code>name</Code> + <Code>since</Code>.</>,
                    <><Code>Medical History → Chronic Conditions</Code> for the <Code>diagnosedDate</Code> year and chronicity flag.</>,
                    <>Filter <Code>status = Confirmed</Code>; take the latest signed visit in the 90-day window. Format: <Code>{`"<name> (chronicity, dx <year>)"`}</Code>. No AI.</>,
                  ],
                  [
                    "Key labs",
                    <><Code>Lab Results</Code> (sidebar) · digital test values with <Code>status</Code> = Abnormal / Critical.</>,
                    <><Code>Medical Records</Code> documents (ECG, TTE, X-Ray PDFs) — see section 3 for extraction rules. Plus scores parsed from <Code>Medication.note</Code> / <Code>Additional Notes</Code> by deterministic keyword pattern (CHA₂DS₂-VASc, HAS-BLED, GCS).</>,
                    <>Rank Critical &gt; Abnormal &gt; Normal, then most-recent. Filter to test categories owned by this specialty (Hematology + Biochemistry for GenMed, Cardiology category for Cardio, etc.). Cap at 3. No AI.</>,
                  ],
                  [
                    "Active Rx",
                    <><Code>Medication (Rx)</Code> section · rows from this specialty's latest signed visit (<Code>medicine + unitPerDose + frequency</Code>).</>,
                    <><Code>Chronic Conditions.medications</Code> for chronic regimens not in the latest visit.</>,
                    <>Filter to drugs prescribed by this specialty (via the visit's <Code>speciality</Code>). Skip <Code>status = Stopped</Code>. <em>Empty case</em>: render the deterministic sentence <Code>{`"Monitoring only. No <specialty>-prescribed drug on file."`}</Code></>,
                  ],
                  [
                    "Plan",
                    <><Code>Lab Investigation</Code> rows (recheck cadence), <Code>Surgery</Code> rows (if any).</>,
                    <><Code>Follow-up.followUpDate</Code> + <Code>followUpNotes</Code>; <Code>Additional Notes</Code> when relevant to cross-team.</>,
                    <>Concatenate in a fixed order: <Code>{`<headline action from latest note's Plan>`}</Code> · <Code>{`review in <followUpDate-as-relative>`}</Code> · <Code>{`<any cross-team flag from notes>`}</Code>. No AI authorship — string templating only.</>,
                  ],
                ].map((row) => (
                  <tr key={String(row[0])} className="border-t border-tp-slate-100 align-top">
                    <td className="px-4 py-3 font-semibold text-tp-slate-800">{row[0]}</td>
                    <td className="px-4 py-3 text-tp-slate-700">{row[1]}</td>
                    <td className="px-4 py-3 text-tp-slate-700">{row[2]}</td>
                    <td className="px-4 py-3 text-tp-slate-600">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 max-w-3xl rounded-[8px] bg-tp-slate-50 px-3 py-2 text-[12.5px] leading-[1.55] text-tp-slate-600">
            <strong className="text-tp-slate-800">Rule of thumb —</strong> if a structured RxPad row exists, Velora uses it verbatim.
            AI only enters Stack 1 as a narrow fallback (free-text note with no structured Diagnosis row, or PDF lab extraction) — and
            the fallback path is always disclosed in the source tooltip.
          </p>
        </section>

        {/* ── 3. Key labs ranking + document-based extraction ── */}
        <section className="mb-12">
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tp-violet-600">3. Key labs — ranking + document extraction</div>
            <h2 className="mt-1 text-[20px] font-bold text-tp-slate-900">How Velora picks 2-3 labs out of 100, and how it reads ECG / TTE / X-Ray PDFs</h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-[1.55] text-tp-slate-600">
              The RxPad <Code>Lab Results</Code> sidebar can carry hundreds of historical tests. Stack 1 only has room for two or three.
              The ranking rule below is fully deterministic — no AI. For tests that live as documents (ECG strips, TTE reports, X-Ray
              films), Velora reads the doctor's free-text note or extracts the headline from the PDF via OCR.
            </p>
          </div>

          <h3 className="mb-2 text-[14px] font-semibold text-tp-slate-800">Ranking rule for digital labs (Lab Results sidebar)</h3>
          <div className="mb-5 overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white">
            <table className="w-full text-[12.5px]">
              <thead className="bg-tp-slate-50">
                <tr>
                  <th className="w-[40px] px-4 py-3 text-left font-semibold text-tp-slate-600">#</th>
                  <th className="w-[200px] px-4 py-3 text-left font-semibold text-tp-slate-600">Step</th>
                  <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">Detail</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["1", "Filter to specialty-owned categories", <>Each test is tagged with a category (<Code>Hematology</Code>, <Code>Cardiology</Code>, <Code>Thyroid</Code>, etc.). <Code>hospital.yaml</Code> declares which categories each specialty owns. Cardio gets Cardiology + Electrolytes; Endo gets Biochemistry + Thyroid; Nephro gets Renal panel + Electrolytes.</>],
                  ["2", "Filter to recent + flagged", <>Keep only tests where <Code>date</Code> is within the last 90 days AND <Code>status</Code> is <Code>Abnormal</Code> or <Code>Critical</Code>. Normal-range tests are dropped — they don't earn space.</>],
                  ["3", "Rank", <><Code>Critical</Code> first, then <Code>Abnormal</Code>. Within a tone, most-recent first. Latest reading wins when a test repeats.</>],
                  ["4", "Cap at 3", <>Top 3 surfaces in Stack 1. The full timeline is one tap away via the Trends sub-intent.</>],
                  ["5", "Render", <><Code>{`"<testName>: <flag-arrow><value>"`}</Code>. Flag and colour come from the test's <Code>status</Code> field — set by the lab itself, not by Velora.</>],
                ].map(([n, step, detail]) => (
                  <tr key={String(n)} className="border-t border-tp-slate-100 align-top">
                    <td className="px-4 py-3 font-bold text-tp-violet-600">{n}</td>
                    <td className="px-4 py-3 font-semibold text-tp-slate-800">{step}</td>
                    <td className="px-4 py-3 text-tp-slate-700">{detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mb-2 text-[14px] font-semibold text-tp-slate-800">Document-based labs (ECG, TTE, X-Ray, USG)</h3>
          <div className="mb-5 overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white">
            <table className="w-full text-[12.5px]">
              <thead className="bg-tp-slate-50">
                <tr>
                  <th className="w-[180px] px-4 py-3 text-left font-semibold text-tp-slate-600">Source artifact</th>
                  <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">Where Velora reads the value from</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "ECG / TTE / X-Ray PDF (digital film with no structured value)",
                    <>(a) <strong>First-pass — doctor's quoted note</strong>: read the <Code>Lab Investigation.note</Code> field for that visit. If the doctor wrote <em>“ECG: persistent AF”</em> in the note, that's the value, no AI needed. (b) <strong>Second-pass — PDF OCR</strong>: when the note is empty, run OCR over the linked PDF in <Code>Medical Records</Code> and extract the conclusion / impression header. The tooltip flags <em>“Source: OCR of ECG-2026-04-24.pdf”</em> so the doctor can verify the extraction.</>,
                  ],
                  [
                    "Doctor's free-text note in Medication or Additional Notes",
                    <>For scores like <Code>CHA₂DS₂-VASc</Code>, <Code>HAS-BLED</Code>, <Code>GCS</Code>: deterministic regex like <Code>/(CHA₂DS₂-VASc|HAS-BLED|GCS)[:\s]*(\d+)/i</Code> over <Code>Medication.note</Code> / <Code>Additional Notes</Code>. Pure pattern match — no LLM.</>,
                  ],
                  [
                    "Imaging report uploaded as Discharge Summary or Referral Letter",
                    <>Same OCR path. Indexed by <Code>category = Radiology</Code>. The tooltip cites the document ID so the doctor knows which file the extraction came from.</>,
                  ],
                  [
                    "Test ordered but no value yet (Status = Pending)",
                    <>Surface as a <em>pending</em> row with muted styling. Velora does not invent a value.</>,
                  ],
                  [
                    "Multiple results for the same test in the window",
                    <>Show the latest only. The Trends sub-intent surfaces the full series with target line.</>,
                  ],
                ].map((row, i) => (
                  <tr key={i} className="border-t border-tp-slate-100 align-top">
                    <td className="px-4 py-3 font-semibold text-tp-slate-800">{row[0]}</td>
                    <td className="px-4 py-3 text-tp-slate-700">{row[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 max-w-3xl rounded-[8px] bg-tp-violet-50/70 px-3 py-2 text-[12.5px] leading-[1.55] text-tp-violet-700">
            <strong>Where AI sits in this flow —</strong> nowhere for digital labs (filter + rank + render is pure SQL).
            For document-based labs, AI does <em>one</em> narrow job: OCR + pull the conclusion line. It does not author the value,
            interpret it, or pick which file to read. The fallback path is always disclosed in the tooltip.
          </p>
        </section>

        {/* ── 3. Guideline picking per specialty ── */}
        <section className="mb-12">
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tp-violet-600">4. Guideline picking</div>
            <h2 className="mt-1 text-[20px] font-bold text-tp-slate-900">Why <em>this</em> guideline body for <em>this</em> specialty</h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-[1.55] text-tp-slate-600">
              When a theme (e.g. AFib, T2DM, CKD) shows up in Stack 1, the panel in Stack 2 is whatever body the hospital signed for that theme.
              Velora is not choosing the medicine — the hospital admin + clinical lead chose the body once, in <Code>hospital.yaml</Code>;
              Velora just looks up which one wins.
            </p>
          </div>
          <div className="overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white">
            <table className="w-full text-[12.5px]">
              <thead className="bg-tp-slate-50">
                <tr>
                  <th className="w-[130px] px-4 py-3 text-left font-semibold text-tp-slate-600">Specialty</th>
                  <th className="w-[110px] px-4 py-3 text-left font-semibold text-tp-slate-600">Theme detected</th>
                  <th className="w-[160px] px-4 py-3 text-left font-semibold text-tp-slate-600">Body chosen (Zydus pilot)</th>
                  <th className="w-[180px] px-4 py-3 text-left font-semibold text-tp-slate-600">Realistic alternative</th>
                  <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">Why this body owns the panel</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Cardiology", "AFib", "ESC 2024", "ACC/AHA 2023", "India-leaning practice typically follows ESC for rhythm management; ACC/AHA is the US-leaning swap. The hospital picks one; Velora cites it."],
                  ["Cardiology", "Resistant HTN", "ESC/ESH 2023", "WHO HEARTS / ACC/AHA", "ESC/ESH has the cleanest ABPM cut-offs for resistant HTN — picked when in-house cardiology favours device-led monitoring."],
                  ["Endocrinology", "T2DM (glycaemic)", "ADA 2024", "NICE NG28 / RSSDI 2022", "ADA's Standards of Care is the default cited body for HbA1c thresholds and cadence; NICE for UK-leaning sites; RSSDI for India-specific dosing nuances."],
                  ["Endocrinology", "T2DM (CKD overlap)", "KDIGO 2024", "—", "Once eGFR<60, drug dosing decisions move under KDIGO regardless of who picked the glycaemic body. No real alternative."],
                  ["Nephrology", "CKD staging + drug dose", "KDIGO 2024", "ISN-India", "KDIGO is the worldwide consensus for staging and eGFR-based dose adjustment; ISN-India only relevant for transplant-specific signals."],
                  ["General Medicine", "Polypharmacy review", "NICE NG56", "STOPP/START v3", "NICE NG56 is the most cite-able body for ≥5 chronic meds for ≥90 days; STOPP/START is the geriatric alternative."],
                ].map((row, i) => (
                  <tr key={i} className="border-t border-tp-slate-100 align-top">
                    {row.map((cell, j) => (
                      <td key={j} className={j === 0 ? "px-4 py-3 font-semibold text-tp-slate-800" : "px-4 py-3 text-tp-slate-700"}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 max-w-3xl rounded-[8px] bg-tp-violet-50/70 px-3 py-2 text-[12.5px] leading-[1.55] text-tp-violet-700">
            <strong>Defence —</strong> Velora is not arbitrating between bodies. If the hospital wants ACC/AHA for AFib instead of ESC,
            one line changes in <Code>hospital.yaml</Code> and every MDT brief that mentions AFib now cites ACC/AHA. Same Velora codebase.
          </p>
        </section>

        {/* ── 4. Trends sub-intent — top-3 selection ── */}
        <section className="mb-12">
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tp-violet-600">5. Trends sub-intent</div>
            <h2 className="mt-1 text-[20px] font-bold text-tp-slate-900">Why the “Trends” canned pill shows <em>these</em> three charts</h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-[1.55] text-tp-slate-600">
              The canned pill below the MDT card just says <Code>Trends</Code> — generic on purpose. Velora picks the top-N metrics itself.
              Same logic, any patient: <strong>flagged values in Stack 1 first, then ranked by cross-team relevance</strong>. Three is the V0 cap; the
              fourth and below collapse under an expander.
            </p>
          </div>
          <div className="overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white">
            <table className="w-full text-[12.5px]">
              <thead className="bg-tp-slate-50">
                <tr>
                  <th className="w-[40px] px-4 py-3 text-left font-semibold text-tp-slate-600">#</th>
                  <th className="w-[150px] px-4 py-3 text-left font-semibold text-tp-slate-600">Selection step</th>
                  <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">Rule</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["1", "Eligible pool", <>Every <strong>measurement</strong> the patient has in the last 24 months that has a value, a unit, and an entry in the signed reference-range table.</>],
                  ["2", "Filter — Stack 1 flagged", <>Keep only measurements that are <strong>currently abnormal</strong> per the signed reference range (red or amber). These are the labs the MDT brief is already showing as flagged.</>],
                  ["3", "Rank — cross-specialty leverage", <>For each remaining metric, count how many distinct specialty sections it touches in the current MDT brief. Metrics that touch ≥2 specialties (e.g. eGFR touches Cardio + Nephro + Endo) out-rank single-specialty metrics.</>],
                  ["4", "Cap at top-N", <>V0 default <Code>N = 3</Code>. The doctor sees 3 charts; the rest collapse under an expander. The cap lives in <Code>hospital.yaml</Code> as <Code>trends.top_n</Code>.</>],
                  ["5", "Render", <>Each chart cites its own guideline body for the target line (e.g. HbA1c → ADA, eGFR → KDIGO, ABPM → ESC/ESH). The chip is hover-able and explains what fields that body drives.</>],
                ].map(([n, step, rule]) => (
                  <tr key={String(n)} className="border-t border-tp-slate-100 align-top">
                    <td className="px-4 py-3 font-bold text-tp-violet-600">{n}</td>
                    <td className="px-4 py-3 font-semibold text-tp-slate-800">{step}</td>
                    <td className="px-4 py-3 text-tp-slate-700">{rule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 max-w-3xl rounded-[8px] bg-tp-slate-50 px-3 py-2 text-[12.5px] leading-[1.55] text-tp-slate-600">
            <strong className="text-tp-slate-800">Worked example (Ravi Shankar) —</strong> Stack 1 flags <Code>HbA1c 8.4%</Code>,
            <Code> eGFR 48</Code>, <Code>ABPM 152/95</Code>. eGFR touches all three specialty sections; HbA1c touches Endo (and indirectly Nephro via SGLT2 dose);
            ABPM touches Cardio (HTN panel). The three winners are eGFR, HbA1c, ABPM — same rule, no hard-coding.
          </p>
          <p className="mt-3 max-w-3xl rounded-[8px] bg-tp-violet-50/70 px-3 py-2 text-[12.5px] leading-[1.55] text-tp-violet-700">
            <strong>Why this matters —</strong> the canned pill is <em>generic</em> so the doctor doesn't have to spell out which labs they want.
            Velora answers <em>“show what's most worth charting for this patient right now”</em>. Different patient → different top 3, same rule.
          </p>
        </section>

        {/* ── 5. Permutation matrix ── */}
        <section className="mb-12">
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tp-violet-600">6. Permutation matrix</div>
            <h2 className="mt-1 text-[20px] font-bold text-tp-slate-900">What the card does when the data isn't the demo</h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-[1.55] text-tp-slate-600">
              Every scenario below uses the same code path — the renderer doesn't special-case anything. The card adapts to whatever the EMR has.
            </p>
          </div>
          <div className="overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white">
            <table className="w-full text-[12.5px]">
              <thead className="bg-tp-slate-50">
                <tr>
                  <th className="w-[280px] px-4 py-3 text-left font-semibold text-tp-slate-600">Scenario</th>
                  <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">MDT brief behaviour</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["0 specialties — brand-new patient", "Card replaced with: \"No prior records. Begin a fresh history.\" Card 2 hidden. Other intents collapse to verbal-history nudges."],
                  ["1 specialty in last 90 days", "Single specialty section renders. Card 2 hidden (no cross-team synthesis is possible). Footer line: \"Velora will offer cross-team synthesis once a second specialty is involved.\""],
                  ["2–3 specialties", "Default. One section per specialty in recency order. Full Card 2 with whichever themed panels match."],
                  ["4+ specialties touched", "Show the 3 most recent. Inline expander: \"Show N more specialties — last touched X days ago.\" Card 2 ranks panels by clinical priority (anticoag > glycaemic > anti-hypertensives), top 4 visible."],
                  ["Same specialty with 5+ notes in window", "Pick the latest only. The source eye-tooltip carries a `View N earlier notes →` action that opens a per-specialty timeline."],
                  ["Specialty has no SOAP fields", "Fall back to free-text header scan; the tooltip explicitly says `Fallback: free-text header scan`. The card still renders so the doctor isn't blocked."],
                  ["Specialty has 30 active prescriptions on file", "Active meds are NOT rendered in MDT brief — they live in Active meds intent. Plan may mention the headline drug; the full list is one tap away."],
                  ["MDT meeting was held in last 90d", "A `Documented MDT meeting` row appears at the foot of Stack 1 with attendees + date. Card 2 opens with a comparison against the meeting's documented plan."],
                  ["MDT was requested but never held", "Surfaces in Pending MDT as a RED row. Velora doesn't propose dates — it surfaces the gap."],
                  ["Two guideline bodies disagree", "Both panels render side-by-side. Each cites its section. Header chips show both body names (e.g. `ESC 2024` vs `ACC/AHA 2023`)."],
                  ["A panel needs a value the EMR doesn't have", "The entire panel is hidden — not rendered with a `—` placeholder. The omission is logged in the exclusion log (validation contract row 5)."],
                  ["Query returned >200 rows for any panel", "Render with `Showing top 200 of N` — never silently truncate. The trust footer carries the row count."],
                  ["Note text is in a non-English language", "Render verbatim; the source tooltip notes the language. Translation is out of scope for V0."],
                ].map(([scenario, behaviour]) => (
                  <tr key={String(scenario)} className="border-t border-tp-slate-100 align-top">
                    <td className="px-4 py-3 font-medium text-tp-slate-800">{scenario}</td>
                    <td className="px-4 py-3 text-tp-slate-600">{behaviour}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 5. Non-AI vs AI ── */}
        <section className="mb-12">
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tp-violet-600">7. Non-AI vs AI</div>
            <h2 className="mt-1 text-[20px] font-bold text-tp-slate-900">What the LLM is — and isn't — allowed to do</h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-[1.55] text-tp-slate-600">
              The card is mostly deterministic. The LLM has two narrow jobs (theme-coding and selector-trace polish); everything else is structured.
            </p>
          </div>
          <div className="overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white">
            <table className="w-full text-[12.5px]">
              <thead className="bg-tp-slate-50">
                <tr>
                  <th className="w-[40%] px-4 py-3 text-left font-semibold text-tp-slate-600">Step in the card</th>
                  <th className="w-[18%] px-4 py-3 text-left font-semibold text-tp-slate-600">Non-AI / AI</th>
                  <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">Detail</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Specialty list (window query)", "Non-AI", "Pure database query: distinct specialties with signed notes in the window. Same patient + same window → same result, every time."],
                  ["Pick latest Note per specialty", "Non-AI", "ORDER BY signed-date DESC, LIMIT 1. The selector trace is generated from this rule, not authored by the LLM."],
                  ["Read Assessment + Plan (clean SOAP case)", "Non-AI", "Direct structured field read. Verbatim, no rephrasing."],
                  ["Read Assessment + Plan (messy Rx case)", "AI (narrow) + Non-AI", "Header keyword scan is rule-based. If headers don't exist, an LLM call extracts <em>first meaningful sentence</em> tagged as Assessment or Plan. The fallback is shown in the tooltip — never hidden."],
                  ["Detect abnormal values for highlighting", "Non-AI", "Token-level numeric compare against the signed reference-range table. If out of range → wrap in red bold + arrow."],
                  ["Extract themes (AFib, T2DM, CKD) from Assessment", "AI (narrow)", "Disease-coding step: map the Assessment line to ICD-10 / SNOMED. Allowed because Assessment lines carry colloquial wording. Output is a code, not prose."],
                  ["Match themes → guideline panels", "Non-AI", "Lookup in hospital.yaml. Same theme → same panel. The LLM is not in this step."],
                  ["Render panel rows", "Non-AI", "Values come from structured nodes; tone comes from signed thresholds; chips come from the guideline registry. Nothing is LLM-authored."],
                  ["Detect cross-team coordination gap", "Non-AI", "Rule: a drug started after another specialty's relevant signal, with no notification edge. Deterministic."],
                  ["Compose the 'reason this note was picked' sentence", "AI (narrow)", "Selector data is injected from the rule; LLM polishes for grammar only. The data tokens (specialty, drug class, signal) are not invented."],
                  ["Anything else", "—", "Out of scope. The LLM may not author Assessment, Plan, panel values, the defence line, or the headline of a synthesis panel."],
                ].map(([step, kind, detail]) => (
                  <tr key={String(step)} className="border-t border-tp-slate-100 align-top">
                    <td className="px-4 py-3 font-medium text-tp-slate-800">{step}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-[3px] px-[6px] py-[1px] text-[10px] font-bold uppercase tracking-[0.06em] ${
                        kind === "AI (narrow)" ? "bg-tp-violet-100 text-tp-violet-700" :
                        kind === "Non-AI" ? "bg-emerald-100 text-emerald-700" :
                        kind === "AI (narrow) + Non-AI" ? "bg-tp-blue-100 text-tp-blue-700" :
                        "bg-tp-slate-100 text-tp-slate-500"
                      }`}>{kind}</span>
                    </td>
                    <td className="px-4 py-3 text-tp-slate-600">{detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 6. Replication checklist ── */}
        <section className="mb-12">
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tp-violet-600">8. Replication checklist</div>
            <h2 className="mt-1 text-[20px] font-bold text-tp-slate-900">What the tech team needs to wire up against a real EMR</h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-[1.55] text-tp-slate-600">
              The card renders against any EMR that exposes these universal concepts. Nothing in the renderer is patient-specific or hospital-specific.
            </p>
          </div>
          <div className="overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white">
            <table className="w-full text-[12.5px]">
              <thead className="bg-tp-slate-50">
                <tr>
                  <th className="w-[60px] px-4 py-3 text-left font-semibold text-tp-slate-600">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">Required wiring (universal concept)</th>
                  <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">Owner</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["1", <>Patient identity (name · sex · age · identifier), Encounter (date · provider), Provider (name · specialty), Note (signed-by · signed-at · assessment · plan · summary).</>, "Data eng"],
                  ["2", <>Drug exposure (drug · dose · frequency · prescriber · start / stop), Measurement (test · value · unit · date), Referral (from · to · requested · resulted-in).</>, "Data eng"],
                  ["3", <>Signed reference-range table per measurement (drives the abnormal-value highlight).</>, "Clinical lead"],
                  ["4", <>Signed guideline registry: theme code → winning body + section + panel definition (required columns + thresholds + body URL for the chip hover).</>, "Clinical lead"],
                  ["5", <>DDI rule base + cross-team coordination-gap detector (rule patterns).</>, "Data eng + clinical"],
                  ["6", <><Code>hospital.yaml</Code>: per-condition body choice + window-days (default 90).</>, "Hospital admin"],
                  ["7", <>Theme-coding service (Assessment text → ICD-10 / SNOMED). Narrow LLM call; result is a code, not prose.</>, "AI eng"],
                  ["8", <>Free-text header-scan extractor — runs only when SOAP fields are empty. Fallback trace surfaces in the tooltip.</>, "AI eng"],
                ].map(([n, req, owner]) => (
                  <tr key={String(n)} className="border-t border-tp-slate-100 align-top">
                    <td className="px-4 py-3 font-bold text-tp-violet-600">{n}</td>
                    <td className="px-4 py-3 text-tp-slate-700">{req}</td>
                    <td className="px-4 py-3 text-tp-slate-600">{owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-12 border-t border-tp-slate-100 pt-6 pb-8">
          <Link href="/dr-agent-design-system" className="text-[12px] font-semibold text-tp-violet-600 hover:text-tp-violet-700">
            ← Back to Velora v0 overview
          </Link>
          <p className="mt-3 text-[11px] text-tp-slate-400">
            Velora v0 · Intent ① — MDT brief deep dive · © 2026 Zyvelor Labs.
          </p>
        </footer>
      </main>
    </div>
  )
}
