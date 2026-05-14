"use client"

import React from "react"
import { Calendar2, Note1 } from "iconsax-reactjs"
import { HighlightLine } from "./highlight"
import { TPMedicalIcon } from "@/components/tp-ui"

/**
 * visit-sections — shared content blocks for any V0 surface that renders
 * an Rx-shaped consultation body (cross-consultation brief VisitCard,
 * patient-journey TimelineRow, future deep-dive panels).
 *
 * Single UI pattern for "Rx content":
 *   • 28px slate-100/70 label bar (icon + section label)
 *   • Either pipe-separated bullet rows OR a single inline pipe-delimited
 *     paragraph, depending on the section.
 *
 * The cross-brief was the first surface to land this pattern; the
 * patient-journey card now imports from here too so the doctor reads
 * the same shape wherever a doctor's note surfaces in the app.
 */

/** Inline section bar — 28px height, slate-100/70 background, icon + label. */
export function VisitSectionBar({
  iconName,
  iconNode,
  label,
}: {
  iconName?: string
  iconNode?: React.ReactNode
  label: string
}) {
  return (
    <div className="mb-[4px] flex h-[28px] w-full min-w-0 shrink-0 items-center gap-1.5 rounded-[4px] bg-tp-slate-100/70 px-2 py-[3px]">
      {iconNode ?? (iconName ? (
        <TPMedicalIcon name={iconName} variant="bulk" size={16} color="var(--tp-slate-500, #64748B)" className="shrink-0" />
      ) : null)}
      <span className="flex min-h-0 min-w-0 flex-1 items-center text-left text-[13px] font-semibold leading-none text-tp-slate-500">
        {label}
      </span>
    </div>
  )
}

/** Render a verbatim OMOP string as bullet items. The data is naturally
 *  pipe-separated (` | `), so we split on the pipe and emit one bullet
 *  per fragment. Single-fragment content renders as one bullet too,
 *  keeping the row format consistent. */
export function VisitBulletList({ text }: { text: string }) {
  const fragments = text
    .split(/\s+\|\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (fragments.length === 0) return null
  return (
    <ul className="space-y-[3px] pl-[6px]">
      {fragments.map((f, i) => (
        <li key={i} className="flex items-start gap-[6px] text-[13.5px] leading-[20px] text-tp-slate-700">
          <span className="mt-[8px] h-[4px] w-[4px] shrink-0 rounded-full bg-tp-slate-400" />
          <span className="min-w-0">
            <HighlightLine text={f} plain />
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Inline pipe-separated renderer for list-style content (Medications,
 *  Vaccinations, Active medications). Keeps the row compact — items flow
 *  across the width with quiet slate-300 dividers between them — instead
 *  of stacking one bullet per item. */
export function VisitInlineList({ text }: { text: string }) {
  const fragments = text
    .split(/\s+\|\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (fragments.length === 0) return null
  return (
    <p className="pl-[6px] text-[13.5px] leading-[1.6] text-tp-slate-700">
      {fragments.map((f, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="mx-[7px] text-tp-slate-300">|</span>}
          <HighlightLine text={f} plain />
        </React.Fragment>
      ))}
    </p>
  )
}

/** One per-section block: icon + label bar + items. `layout="inline"`
 *  renders pipe-separated items in a single flowing paragraph
 *  (Medications, Vaccinations); the default `"bullets"` keeps the
 *  sentence-per-line bullet rhythm (Symptoms, Examination, Diagnosis,
 *  Advice, …). Drops out entirely when the doctor wrote nothing for
 *  that section. */
export function VisitSection({
  iconName,
  iconNode,
  label,
  content,
  layout = "bullets",
}: {
  iconName?: string
  iconNode?: React.ReactNode
  label: string
  content?: string
  layout?: "bullets" | "inline"
}) {
  if (!content || !content.trim()) return null
  return (
    <div className="px-[12px] py-[6px]">
      <VisitSectionBar iconName={iconName} iconNode={iconNode} label={label} />
      {layout === "inline" ? (
        <VisitInlineList text={content} />
      ) : (
        <VisitBulletList text={content} />
      )}
    </div>
  )
}

/**
 * Compose the standard ordered set of section blocks for an Rx body from
 * its constituent fields. Used by both the cross-brief VisitCard and the
 * patient-journey TimelineRow so a single doctor's note reads identically
 * regardless of which surface the doctor lands on.
 *
 * Field → section mapping:
 *   symptoms         → Symptoms (Virus icon)
 *   examination      → Examination
 *   diagnosis        → Diagnosis
 *   medications      → Medications (inline pipes)
 *   labs             → Labs
 *   advice / advices → Advice
 *   followUp         → Follow Up (Calendar2 icon)
 *   investigations   → Investigations
 *   surgery          → Planned surgery
 *   vaccinations     → Vaccinations (inline pipes)
 *   additionalNotes  → Additional Notes (Note1 icon)
 *   plan             → Plan (fallback when followUp etc. are unset)
 */
export interface VisitBodyFields {
  symptoms?: string
  examination?: string
  diagnosis?: string
  medications?: string
  labs?: string
  advice?: string
  followUp?: string
  investigations?: string
  surgery?: string
  vaccinations?: string
  additionalNotes?: string
  plan?: string
}

export function VisitBody({ fields }: { fields: VisitBodyFields }) {
  const f = fields
  const hasAny =
    !!f.symptoms || !!f.examination || !!f.diagnosis || !!f.medications ||
    !!f.labs || !!f.advice || !!f.followUp || !!f.investigations ||
    !!f.surgery || !!f.vaccinations || !!f.additionalNotes || !!f.plan
  return (
    <div className="flex flex-col gap-[2px] py-[4px]">
      <VisitSection iconName="Virus" label="Symptoms" content={f.symptoms} />
      <VisitSection iconName="medical-service" label="Examination" content={f.examination} />
      <VisitSection iconName="Diagnosis" label="Diagnosis" content={f.diagnosis} />
      <VisitSection iconName="Tablets" label="Medications" content={f.medications} layout="inline" />
      <VisitSection iconName="medical book" label="Labs" content={f.labs} />
      <VisitSection iconName="health care" label="Advice" content={f.advice} />
      <VisitSection
        iconNode={<Calendar2 size={16} variant="Bulk" color="var(--tp-slate-500, #64748B)" className="shrink-0" />}
        label="Follow Up"
        content={f.followUp}
      />
      <VisitSection iconName="medical book" label="Investigations" content={f.investigations} />
      <VisitSection iconName="medical-service" label="Planned surgery" content={f.surgery} />
      <VisitSection iconName="medical-record" label="Vaccinations" content={f.vaccinations} layout="inline" />
      <VisitSection iconName="medical-report" label="Plan" content={f.plan} />
      <VisitSection
        iconNode={<Note1 size={16} variant="Bulk" color="var(--tp-slate-500, #64748B)" className="shrink-0" />}
        label="Additional Notes"
        content={f.additionalNotes}
      />
      {!hasAny && (
        <div className="px-[12px] py-[8px]">
          <p className="min-w-0 text-[12.5px] italic text-tp-slate-500">
            No detail recorded for this Rx.
          </p>
        </div>
      )}
    </div>
  )
}
