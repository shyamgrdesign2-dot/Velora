"use client"

import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock } from "lucide-react"
import { AiBrandSparkIcon } from "@/components/doctor-agent/ai-brand"
import { AI_GRADIENT } from "@/components/tp-rxpad/dr-agent/constants"
import { VeloraV0PatientJourneyCard } from "@/components/tp-rxpad/dr-agent/cards/velora-v0/VeloraV0PatientJourneyCard"
import { PATIENT_JOURNEY_MOCK } from "@/lib/velora/v0-replies"

// ─────────────────────────────────────────────────────────────
// Velora v0 · Intent ② — Patient journey · DEEP DIVE
//
// Same shape as the MDT brief deep-dive: case briefing → live card →
// per-event-type mapping → open-loop detection rules → permutation matrix →
// non-AI / AI split → replication checklist.
// ─────────────────────────────────────────────────────────────

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-tp-slate-100 px-1.5 py-[1px] font-mono text-[11.5px] text-tp-slate-700">{children}</code>
}

export function PatientJourneyDeepDivePage() {
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
              <span className="text-[11px] font-semibold uppercase tracking-wide text-tp-slate-500">Intent ② — Patient journey</span>
            </div>
            <h1
              className="truncate text-[18px] font-bold leading-tight"
              style={{ background: AI_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
            >
              Patient journey — Deep dive
            </h1>
            <p className="truncate text-[11px] text-tp-slate-400">
              Vertical timeline · every signed encounter, admission, MDT, open loop · verbatim from the EMR, no AI authoring.
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
                <Clock size={14} strokeWidth={2} />
              </span>
              <span className="rounded-full bg-tp-violet-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Intent ②</span>
            </div>
            <h2 className="mb-2 text-[22px] font-bold leading-tight text-tp-slate-900">
              What's the patient's whole story at this hospital?
            </h2>
            <p className="max-w-3xl text-[13.5px] leading-[1.6] text-tp-slate-700">
              Patient journey is the vertical timeline of every signed encounter, admission, MDT meeting, and scheduled item for one patient.
              <strong className="text-tp-slate-900"> Open / pending items surface inline as RED rows</strong> at the date they occurred — so the doctor sees what's open in the context of the visit it came from, not as a separate sterile list. Verbatim from the EMR; Velora <em>orders</em> the events, it does not author them.
            </p>
          </div>
        </section>

        {/* ── 1. Live card ── */}
        <section className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="lg:sticky lg:top-[120px] lg:self-start">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-tp-slate-500">
              <span className="rounded-full bg-tp-slate-100 px-2 py-[2px]">Live card</span>
              <span>The exact component the doctor sees in chat.</span>
            </div>
            <div className="relative rounded-[14px] border border-tp-slate-200 bg-white p-4 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.15)]">
              <VeloraV0PatientJourneyCard data={PATIENT_JOURNEY_MOCK} />
            </div>
            <p className="mt-3 text-[11px] text-tp-slate-500">
              <strong className="text-tp-slate-700">Note —</strong> on lg screens this card is sticky; scroll the right column to walk every section.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-[12px] border border-tp-slate-200 bg-white p-4">
              <h3 className="mb-2 text-[14px] font-bold text-tp-slate-900">What you're looking at</h3>
              <ul className="flex flex-col gap-[6px] text-[13px] leading-[1.55] text-tp-slate-700">
                <li>· <strong>Header</strong> — total months covered · total encounter count · date window (e.g. <em>“20 months · 10 encounters · Sep 2024 → 28 Apr 2026”</em>).</li>
                <li>· <strong>Each row</strong> — colored circle marker on the rail + a card-style row with the date · specialty pill · headline · optional expandable detail · stable source ID.</li>
                <li>· <strong>Marker tones</strong> communicate event type at a glance: outline circle (consult / lab) · filled red (admission / open loop) · filled dark (MDT) · filled blue (today) · dashed amber (scheduled).</li>
                <li>· <strong>Headline highlights</strong> — same syntax as MDT brief: <Code>**bold**</Code> for diagnoses / drugs / decisions; <Code>__↑value__</Code> / <Code>__↓value__</Code> for abnormal lab values (red + arrow).</li>
                <li>· <strong>Chevron on the right</strong> — rows with detail expand in place; today + open-loop rows are open by default.</li>
              </ul>
            </div>

            <div className="rounded-[12px] border border-tp-slate-200 bg-white p-4">
              <h3 className="mb-2 text-[14px] font-bold text-tp-slate-900">Why this view (vs the old “Open loops” list)</h3>
              <ul className="flex flex-col gap-[6px] text-[13px] leading-[1.55] text-tp-slate-700">
                <li>· The doctor needs the <em>whole story</em>, not a sterile list of what closed late. A 14-month timeline gives the context that a flat list can't.</li>
                <li>· Open / pending items still appear — but inline at the date they happened, with the same colour discipline. The “open loops” idea survives as RED rows of the timeline.</li>
                <li>· Cross-specialty motion is visible: who saw the patient first, who escalated, where the eGFR drift began, who hasn't been told about a new drug.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── 2. Per-event-type mapping ── */}
        <section className="mb-12">
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tp-violet-600">2. Per-event-type mapping</div>
            <h2 className="mt-1 text-[20px] font-bold text-tp-slate-900">Where each row type comes from — RxPad section + EMR table</h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-[1.55] text-tp-slate-600">
              Every row on the timeline maps 1-to-1 to a row that already exists in the EMR. Velora orders them; it does not invent events.
            </p>
          </div>
          <div className="overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white">
            <table className="w-full text-[12.5px]">
              <thead className="bg-tp-slate-50">
                <tr>
                  <th className="w-[140px] px-4 py-3 text-left font-semibold text-tp-slate-600">Marker / pill</th>
                  <th className="w-[180px] px-4 py-3 text-left font-semibold text-tp-slate-600">EMR source row</th>
                  <th className="w-[200px] px-4 py-3 text-left font-semibold text-tp-slate-600">Headline composed from</th>
                  <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">Selection rule</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "Consult (outline)",
                    <><Code>Visit</Code> + signed <Code>Note</Code></>,
                    <>The first line of <Code>Diagnosis</Code> + the headline drug from <Code>Medication (Rx)</Code> (started / continued).</>,
                    <>One row per signed visit. Specialty pill colour: Nephro red, Cardio violet, Endo emerald.</>,
                  ],
                  [
                    "Lab (outline)",
                    <><Code>Lab Report</Code> with at least one Abnormal / Critical result</>,
                    <>Top 1-2 abnormal test names + values + arrows.</>,
                    <>Skip lab reports that are entirely Normal — they're noise on the timeline.</>,
                  ],
                  [
                    "Admit (filled red)",
                    <><Code>Visit</Code> with <Code>visitType = IPD</Code></>,
                    <>Admission reason from the encounter's chief complaint + length of stay.</>,
                    <>Always shown — admissions are never down-ranked.</>,
                  ],
                  [
                    "MDT (filled dark)",
                    <><Code>Note</Code> with <Code>type = MDT</Code></>,
                    <>Attendee specialty list + agreed decision.</>,
                    <>Counts as one event even if multiple specialties signed the note.</>,
                  ],
                  [
                    "Today (filled blue)",
                    <>The current open <Code>Visit</Code> the doctor is in</>,
                    <>Either the in-progress note (if started) or the <Code>Order</Code> rows added this visit.</>,
                    <>Always pinned at the bottom of the timeline.</>,
                  ],
                  [
                    "Scheduled (dashed amber)",
                    <><Code>Referral</Code> requested but not yet held, future <Code>Appointment</Code></>,
                    <>Specialty + request reason. No values invented for dates that haven't happened.</>,
                    <>Only future / pending items — past missed events become open-loop rows instead.</>,
                  ],
                  [
                    "Open loop (filled red ring)",
                    <>Various detectors — see section 3</>,
                    <>Detector's headline (e.g. <em>“TSH ordered · no result on file”</em>) + the age in days.</>,
                    <>Inserted at the date the loop was opened, not at the date it was detected.</>,
                  ],
                ].map((row, i) => (
                  <tr key={i} className="border-t border-tp-slate-100 align-top">
                    <td className="px-4 py-3 font-semibold text-tp-slate-800">{row[0]}</td>
                    <td className="px-4 py-3 text-tp-slate-700">{row[1]}</td>
                    <td className="px-4 py-3 text-tp-slate-700">{row[2]}</td>
                    <td className="px-4 py-3 text-tp-slate-600">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 3. Open-loop detection rules ── */}
        <section className="mb-12">
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tp-violet-600">3. Open-loop detection</div>
            <h2 className="mt-1 text-[20px] font-bold text-tp-slate-900">Which rules turn an event into a RED open-loop row</h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-[1.55] text-tp-slate-600">
              Four deterministic detectors run independently. Each fires on a SQL-ish pattern over structured EMR rows — no LLM in the loop.
            </p>
          </div>
          <div className="overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white">
            <table className="w-full text-[12.5px]">
              <thead className="bg-tp-slate-50">
                <tr>
                  <th className="w-[200px] px-4 py-3 text-left font-semibold text-tp-slate-600">Detector</th>
                  <th className="w-[300px] px-4 py-3 text-left font-semibold text-tp-slate-600">Rule pattern</th>
                  <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">Disclosure</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "Lab order without result",
                    <><Code>Order</Code> exists for &gt; 7 days · no <Code>Lab Report</Code> tied to its result_id</>,
                    "Red row, ageDays = days since order.",
                  ],
                  [
                    "Internal referral not closed",
                    <><Code>Referral</Code> requested &gt; 30 days · no destination <Code>Visit</Code> in the target specialty</>,
                    "Red row at the request date.",
                  ],
                  [
                    "Booked follow-up no-show",
                    <><Code>Appointment.status = no-show</Code> in the last 30 days</>,
                    "Amber row at the missed date. No reschedule recorded.",
                  ],
                  [
                    "Chronic Rx without in-hospital fill",
                    <><Code>DrugExposure</Code> active &gt; 90 days · no <Code>PharmacyDispense</Code> in-hospital in 90d</>,
                    <>Amber row · disclosure: <em>in-hospital pharmacy only · patient may be filling outside</em>.</>,
                  ],
                ].map((row, i) => (
                  <tr key={i} className="border-t border-tp-slate-100 align-top">
                    <td className="px-4 py-3 font-semibold text-tp-slate-800">{row[0]}</td>
                    <td className="px-4 py-3 text-tp-slate-700">{row[1]}</td>
                    <td className="px-4 py-3 text-tp-slate-600">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 max-w-3xl rounded-[8px] bg-tp-slate-50 px-3 py-2 text-[12.5px] leading-[1.55] text-tp-slate-600">
            <strong className="text-tp-slate-800">Thresholds are signed</strong> — the 7-day / 30-day / 90-day windows live in <Code>hospital.yaml</Code> and were set by the GenMed lead at Zydus. Changing them is one line of config; Velora's detection code is hospital-agnostic.
          </p>
        </section>

        {/* ── 4. Permutation matrix ── */}
        <section className="mb-12">
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tp-violet-600">4. Permutation matrix</div>
            <h2 className="mt-1 text-[20px] font-bold text-tp-slate-900">What the timeline does when the patient's record doesn't look like Ravi's</h2>
          </div>
          <div className="overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white">
            <table className="w-full text-[12.5px]">
              <thead className="bg-tp-slate-50">
                <tr>
                  <th className="w-[300px] px-4 py-3 text-left font-semibold text-tp-slate-600">Scenario</th>
                  <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">Behaviour</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Brand-new patient (0 prior encounters)", "Card replaced with one-line empty state: \"No prior records at this hospital.\""],
                  ["Single specialty has touched the patient (1 encounter)", "Single row + a footer line: \"Timeline grows as visits are signed.\""],
                  ["50+ encounters across years", "Group by quarter, collapse quarters under expanders. Today + open loops always at the top of the collapsed range."],
                  ["Mid-timeline gap > 6 months", "Insert a gray gap line: \"No visits between <date> and <date>.\""],
                  ["MDT meeting was held and signed", "Filled dark row at the MDT date with attendees + agreed decision."],
                  ["Multiple admissions in a year", "Each admission gets its own filled-red row. LOS shown as `5d stay`, `8d stay`."],
                  ["No open loops detected", "No RED rows. Honest empty-state: \"No open loops in the current window.\""],
                  ["Document-only event (PDF imaging report)", "Outline row with `LAB` pill; OCR conclusion in the headline (same path as MDT brief Key labs)."],
                  ["Non-English note", "Render verbatim. Source tooltip notes the language. Translation is out of scope for V0."],
                ].map((row, i) => (
                  <tr key={i} className="border-t border-tp-slate-100 align-top">
                    <td className="px-4 py-3 font-medium text-tp-slate-800">{row[0]}</td>
                    <td className="px-4 py-3 text-tp-slate-600">{row[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 5. Non-AI vs AI ── */}
        <section className="mb-12">
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tp-violet-600">5. Non-AI vs AI</div>
            <h2 className="mt-1 text-[20px] font-bold text-tp-slate-900">Where AI sits in the patient journey card</h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-[1.55] text-tp-slate-600">
              Almost nowhere. The timeline is structured-data engineering; AI only enters for one narrow job (composing the headline string when the EMR has no concise summary line).
            </p>
          </div>
          <div className="overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white">
            <table className="w-full text-[12.5px]">
              <thead className="bg-tp-slate-50">
                <tr>
                  <th className="w-[40%] px-4 py-3 text-left font-semibold text-tp-slate-600">Step</th>
                  <th className="w-[18%] px-4 py-3 text-left font-semibold text-tp-slate-600">Non-AI / AI</th>
                  <th className="px-4 py-3 text-left font-semibold text-tp-slate-600">Detail</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Query the encounter list for the window", "Non-AI", "Pure SQL across Visit + Admission + Note tables."],
                  ["Order events by date", "Non-AI", "ORDER BY date ASC. Deterministic — same patient → same timeline, every time."],
                  ["Pick the tone per event (consult / lab / admit / MDT)", "Non-AI", "Field-level mapping: visitType, note.type, lab.status. No inference."],
                  ["Detect open loops", "Non-AI", "The four detectors above are SQL patterns. No LLM."],
                  ["Compose the headline string when the EMR has no summary", "AI (narrow)", "Templated by rule + light LLM polish for grammar. Data tokens are injected verbatim — names, doses, values are never invented."],
                  ["Compose the expandable detail body", "Non-AI", "Direct field reads from the source row. Verbatim."],
                  ["Anything else", "—", "Out of scope. The LLM may not author dates, values, attendees, or detector triggers."],
                ].map((row, i) => (
                  <tr key={i} className="border-t border-tp-slate-100 align-top">
                    <td className="px-4 py-3 font-medium text-tp-slate-800">{row[0]}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-[3px] px-[6px] py-[1px] text-[10px] font-bold uppercase tracking-[0.06em] ${
                        row[1] === "AI (narrow)" ? "bg-tp-violet-100 text-tp-violet-700" :
                        row[1] === "Non-AI" ? "bg-emerald-100 text-emerald-700" :
                        "bg-tp-slate-100 text-tp-slate-500"
                      }`}>{row[1]}</span>
                    </td>
                    <td className="px-4 py-3 text-tp-slate-600">{row[2]}</td>
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
            Velora v0 · Intent ② — Patient journey deep dive · © 2026 Zyvelor Labs.
          </p>
        </footer>
      </main>
    </div>
  )
}
