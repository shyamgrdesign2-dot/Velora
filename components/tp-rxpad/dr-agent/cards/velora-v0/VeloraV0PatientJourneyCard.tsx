"use client"

import React, { useState } from "react"
import { Clock, ArrowDown2 } from "iconsax-reactjs"
import { Stethoscope, Hospital as HospitalIcon } from "lucide-react"
import { CardShell } from "../CardShell"
import { HighlightLine } from "./highlight"
import { VisitBody } from "./visit-sections"
import type { VeloraV0EventTone, VeloraV0JourneyEvent, VeloraV0PatientJourneyData } from "../../types"

/**
 * VeloraV0PatientJourneyCard — vertical timeline of the patient's hospital
 * journey. Each row is one signed encounter / admission / MDT / scheduled
 * item / open loop. Verbatim from the EMR — no AI authoring.
 *
 * Row layout (top-down):
 *   1. Top bar — specialty pill · date · chevron (all top-aligned).
 *   2. Headline (one line; HighlightLine syntax).
 *   3. Expanded view — when `rxPointers` is present, renders the same
 *      5-pointer body as MDT brief Stack 1 (Findings / Key labs / Medication
 *      / Advices / Plan). Otherwise falls back to the free-text `detail`.
 *   4. Source badge — contextual label (Rx ID / Order ID / Appointment ID
 *      / Lab Report ID / Referral ID) + the stable ID itself.
 */

function formatPatientLine(name: string, meta: string) {
  const trimmed = meta.split("·")[0]?.trim() ?? meta
  return `${name} (${trimmed})`
}

// ── Marker styling per tone ──────────────────────────────────────────────
//
// Markers are pure CSS dots — no icons. The specialty PILL on the top bar
// already communicates the event's specialty / type, so the marker only
// needs to communicate *tone* (routine vs admission vs MDT vs today vs
// scheduled vs open). One ring/fill colour per tone, with a subtle halo
// (box-shadow) on the high-emphasis tones (today, admit, open-loop).

interface MarkerStyle {
  /** Outer ring + fill classes (Tailwind). */
  cls: string
  /** Optional CSS box-shadow halo string. */
  glow?: string
  /** Inner dot rendered on filled markers — gives the "target" look. */
  innerDot?: string
}

const TONE_CONFIG: Record<VeloraV0EventTone, MarkerStyle> = {
  consult: {
    cls: "border-tp-slate-300 bg-white",
    innerDot: "bg-tp-slate-300",
  },
  lab: {
    cls: "border-tp-slate-400 bg-white",
    innerDot: "bg-tp-slate-400",
  },
  admit: {
    cls: "border-tp-error-600 bg-tp-error-600",
    glow: "0 0 0 3px rgba(220, 38, 38, 0.12)",
    innerDot: "bg-white/90",
  },
  mdt: {
    cls: "border-tp-slate-900 bg-tp-slate-900",
    innerDot: "bg-white/90",
  },
  today: {
    cls: "border-tp-blue-500 bg-tp-blue-500",
    glow: "0 0 0 4px rgba(75, 74, 213, 0.15)",
    innerDot: "bg-white",
  },
  scheduled: {
    cls: "border-tp-warning-500 border-dashed bg-white",
  },
  "open-loop": {
    cls: "border-tp-error-500 bg-tp-error-500",
    glow: "0 0 0 4px rgba(239, 68, 68, 0.18)",
    innerDot: "bg-white",
  },
}

const PILL_CLASS: Record<VeloraV0EventTone, string> = {
  /** All clinical departments share one violet pill — the doctor name is the
   *  specific identifier; the pill just signals "this is a clinical visit". */
  consult: "bg-tp-violet-50 text-tp-violet-700",
  /** Lab + diagnostic events get a distinct green pill so labs jump out. */
  lab: "bg-emerald-50 text-emerald-700",
  admit: "bg-tp-error-600 text-white",
  mdt: "bg-tp-slate-900 text-white",
  today: "bg-tp-blue-500 text-white",
  scheduled: "bg-tp-warning-100 text-tp-warning-800",
  "open-loop": "bg-tp-error-100 text-tp-error-700",
}

/** Specialty-pill colour — same violet for every clinical department, green
 *  for lab + external (referring hospital / outside record). Special tones
 *  (admit / mdt / today / scheduled / open-loop) keep their distinct colours. */
function specialtyPillClass(label: string, tone: VeloraV0EventTone): string {
  if (tone !== "consult") return PILL_CLASS[tone]
  const k = label.toLowerCase()
  if (k.includes("external") || k.includes("hospital") || k.includes("outside")) {
    return "bg-emerald-50 text-emerald-700"
  }
  return PILL_CLASS.consult
}

/** Pick the source icon for the doctor tag: stethoscope for clinician-attributed
 *  events; hospital for hospital-level events (external referral, admission). */
function pickDoctorIcon(event: VeloraV0JourneyEvent): React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> {
  const doctor = (event.doctor ?? "").toLowerCase()
  const label = event.specialtyLabel.toLowerCase()
  const isHospital =
    event.tone === "admit" ||
    doctor.includes("hospital") ||
    doctor.includes("referring") ||
    label.includes("external") ||
    label.includes("hospital")
  return isHospital ? HospitalIcon : Stethoscope
}

function Marker({ tone }: { tone: VeloraV0EventTone }) {
  const cfg = TONE_CONFIG[tone]
  return (
    <span
      className={`flex h-[14px] w-[14px] items-center justify-center rounded-full border-[1.5px] ${cfg.cls}`}
      style={cfg.glow ? { boxShadow: cfg.glow } : undefined}
      aria-hidden
    >
      {cfg.innerDot && <span className={`h-[4px] w-[4px] rounded-full ${cfg.innerDot}`} />}
    </span>
  )
}

// ── Source badge with contextual label ──────────────────────────────────

const SOURCE_LABEL: Record<NonNullable<VeloraV0JourneyEvent["sourceType"]>, string> = {
  rx: "Rx ID",
  order: "Order ID",
  appointment: "Appointment ID",
  "lab-report": "Lab Report ID",
  referral: "Referral ID",
  note: "Note ID",
}

function SourceBadge({ id, type }: { id: string; type?: VeloraV0JourneyEvent["sourceType"] }) {
  const label = type ? SOURCE_LABEL[type] : "Source"
  return (
    <span className="inline-flex items-center gap-[6px] rounded-[6px] border border-tp-slate-200 bg-white px-[8px] py-[3px] text-[11px] text-tp-slate-600 transition-colors hover:border-tp-violet-200 hover:text-tp-violet-700">
      <span className="font-semibold uppercase tracking-[0.06em] text-[9.5px] text-tp-slate-400">
        {label}
      </span>
      <code className="font-mono text-[10.5px] text-tp-slate-700">{id}</code>
    </span>
  )
}

// ── Structured expand view (mirrors VisitCard in the cross-brief) ────────
//
// One unified UI pattern for "Rx content" across the whole agent surface.
// Each rxPointers field maps to the matching VisitSection (Diagnosis,
// Medications, Advice, Follow Up / Plan, Labs) so a doctor reading the
// patient-journey timeline sees the same shape they read in the
// cross-consultation brief.

function StructuredDetail({ rx }: { rx: NonNullable<VeloraV0JourneyEvent["rxPointers"]> }) {
  return (
    <div className="flex flex-col">
      {rx.author && (
        <p className="px-[12px] pb-[4px] text-[11.5px] font-medium text-tp-slate-500">
          {rx.author}
        </p>
      )}
      <VisitBody
        fields={{
          diagnosis: rx.findings,
          labs: rx.keyLabs,
          medications: rx.medication,
          advice: rx.advices,
          followUp: rx.plan,
        }}
      />
    </div>
  )
}

function TimelineRow({
  event,
  isLast,
  defaultExpanded,
}: {
  event: VeloraV0JourneyEvent
  isLast: boolean
  defaultExpanded?: boolean
}) {
  const [open, setOpen] = useState(!!defaultExpanded)
  const canExpand = !!(event.detail || event.rxPointers)
  return (
    <div className="relative flex gap-[10px]">
      {/* Left rail — line + marker */}
      <div className="relative flex w-[22px] shrink-0 flex-col items-center">
        <Marker tone={event.tone} />
        {!isLast && <span className="mt-[4px] flex-1 w-[1.5px] bg-tp-slate-200" />}
      </div>

      {/* Right column — card-like row with subtle gray bg */}
      <button
        type="button"
        onClick={() => canExpand && setOpen(!open)}
        disabled={!canExpand}
        className={`flex-1 rounded-[10px] border border-tp-slate-100 bg-tp-slate-50/70 px-[12px] py-[9px] text-left transition-colors ${canExpand ? "cursor-pointer hover:border-tp-slate-200 hover:bg-tp-slate-50" : "cursor-default"} ${isLast ? "mb-0" : "mb-[10px]"}`}
      >
        {/* TOP BAR — outer neutral tag [specialty pill + doctor] · date · TODAY · age · chevron */}
        <div className="flex items-center gap-[8px]">
          {event.doctor ? (() => {
            const DoctorIcon = pickDoctorIcon(event)
            return (
              <span className="inline-flex shrink-0 items-center gap-[6px] rounded-[7px] bg-tp-slate-100 py-[2px] pl-[7px] pr-[3px]">
                <span className="inline-flex items-center text-tp-slate-500" aria-hidden>
                  <DoctorIcon size={12} strokeWidth={1.8} />
                </span>
                <span className="truncate text-[12px] font-semibold text-tp-slate-700">
                  {event.doctor}
                </span>
                <span className="text-tp-slate-300" aria-hidden>·</span>
                <span
                  className={`shrink-0 rounded-[4px] px-[6px] py-[1px] text-[10px] font-bold uppercase tracking-[0.06em] ${specialtyPillClass(event.specialtyLabel, event.tone)}`}
                >
                  {event.specialtyLabel}
                </span>
              </span>
            )
          })() : (
            <span
              className={`shrink-0 rounded-[4px] px-[7px] py-[2px] text-[10px] font-bold uppercase tracking-[0.06em] ${specialtyPillClass(event.specialtyLabel, event.tone)}`}
            >
              {event.specialtyLabel}
            </span>
          )}
          <span className="font-mono text-[11.5px] tracking-tight text-tp-slate-500">
            {event.date}
          </span>
          {event.tone === "today" && (
            <span className="rounded-[3px] bg-tp-blue-50 px-[5px] py-[1px] text-[9.5px] font-semibold uppercase tracking-[0.06em] text-tp-blue-700">
              today
            </span>
          )}
          {event.ageDays !== undefined && (
            <span className="rounded-full bg-tp-error-100 px-[7px] py-[1px] text-[10px] font-semibold text-tp-error-700">
              {event.ageDays}d open
            </span>
          )}
          <span className="flex-1" />
          {canExpand && (
            <ArrowDown2
              size={14}
              className={`shrink-0 text-tp-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          )}
        </div>

        {/* HEADLINE — only shown when the row is COLLAPSED, as a quick
            preview. Once expanded, the sectioned body (Diagnosis /
            Medications / Advice / Follow Up / Labs) takes over and the
            inline summary disappears so the doctor reads one canonical
            content shape — the same shape used inside the cross-
            consultation brief's VisitCard. */}
        {!open && (
          <p className="mt-[5px] text-[13.5px] leading-[1.5] text-tp-slate-700">
            <HighlightLine text={event.headline} plain />
          </p>
        )}

        {/* EXPANDED BODY — sectioned VisitBody (same components as the
            cross-brief) when rxPointers is present; plain detail block
            otherwise (lab reports, scheduled items, open loops). */}
        {open && (event.detail || event.rxPointers) && (
          <div className="mt-[8px] overflow-hidden rounded-[8px] border border-tp-slate-100 bg-white">
            {event.rxPointers ? (
              <StructuredDetail rx={event.rxPointers} />
            ) : (
              <p className="px-[12px] py-[10px] text-[12.5px] leading-[1.6] text-tp-slate-600">
                <HighlightLine text={event.detail!} />
              </p>
            )}
            {event.sourceId && (
              <div className="flex items-center px-[12px] pb-[10px]">
                <SourceBadge id={event.sourceId} type={event.sourceType} />
              </div>
            )}
          </div>
        )}
      </button>
    </div>
  )
}

export function VeloraV0PatientJourneyCard({ data }: { data: VeloraV0PatientJourneyData }) {
  const patientLine = formatPatientLine(data.patientName, data.patientMeta)
  return (
    <CardShell
      icon={<Clock size={15} variant="Bulk" />}
      title="Patient journey"
      date={patientLine}
      dataSources={[
        "Visit × Provider (signed visits)",
        "Admission events",
        "Note metadata (MDT)",
        "Lab Result + Medical Records (documents)",
        "Order × Result (open loops)",
        "Appointment (scheduled + missed)",
      ]}
    >
      <div className="flex flex-col gap-[10px]">
        {/* Window header — months covered + encounter count */}
        <div className="flex items-end justify-between gap-[10px]">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tp-slate-400">
              Past
            </span>
            <span className="text-[18px] font-bold leading-tight text-tp-slate-900">
              {data.windowMonths} months · {data.encounterCount} encounters
            </span>
          </div>
          <span className="rounded-full bg-tp-slate-100 px-[10px] py-[3px] font-mono text-[11px] text-tp-slate-600">
            {data.windowLabel}
          </span>
        </div>
        <p className="text-[13px] leading-[1.55] text-tp-slate-600">
          Verbatim from the hospital's records · each row carries a stable ID · click any event with detail to expand.
        </p>

        {/* Timeline */}
        <div className="flex flex-col">
          {data.events.map((event, i) => (
            <TimelineRow
              key={i}
              event={event}
              isLast={i === data.events.length - 1}
              /* Today + open-loop rows default to expanded. */
              defaultExpanded={event.tone === "today" || event.tone === "open-loop"}
            />
          ))}
        </div>

        {/* Defence footer removed — surfaced in the deep-dive doc instead. */}
      </div>
    </CardShell>
  )
}
