"use client"

import React from "react"
import { ShieldCross, Diagram, Danger } from "iconsax-reactjs"
import { FlagArrow } from "../../shared/FlagArrow"
import { CardShell } from "../CardShell"
import { SectionSummaryBar } from "../SectionSummaryBar"
import { GuidelineChip } from "./VeloraStack"
import { HighlightLine, InfoTip, shortDate } from "./highlight"
import type { VeloraV0ActiveMedsData, VeloraV0Synthesis } from "../../types"

/** Synthesis row used inside Card 2: label + InfoTip · flag arrow + value. */
function SynthesisRow({
  row,
  alternate,
}: {
  row: VeloraV0Synthesis["rows"][number]
  alternate: boolean
}) {
  const valueClass =
    row.tone === "alert"
      ? "text-tp-error-600"
      : row.tone === "warn"
        ? "text-tp-warning-700"
        : "text-tp-slate-900"
  return (
    <div
      className="flex items-baseline gap-[8px] px-[8px] py-[5px] text-[13px]"
      style={{
        background: alternate ? "var(--tp-slate-50, #F8FAFC)" : "white",
        borderTop: alternate ? "0.5px solid var(--tp-slate-100, #F1F5F9)" : undefined,
      }}
    >
      <span className="flex flex-1 items-center gap-[5px] truncate">
        <span className="truncate font-semibold text-tp-slate-800">
          {row.label}<span className="text-tp-slate-400">:</span>
        </span>
        {row.ref && <InfoTip text={row.ref} />}
      </span>
      <span className={`inline-flex items-baseline gap-[3px] font-semibold ${valueClass}`}>
        {(row.tone === "alert" || row.tone === "warn") && <FlagArrow flag="high" />}
        <span>{row.value}</span>
      </span>
    </div>
  )
}

function formatPatientLine(name: string, meta: string) {
  const trimmed = meta.split("·")[0]?.trim() ?? meta
  return `${name} (${trimmed})`
}

function HeaderTrailing({ author, date }: { author: string; date: string }) {
  return (
    <span className="shrink-0 text-[12px] text-tp-slate-600">
      <span className="font-medium">{author}</span>
      <span className="ml-[4px] text-tp-slate-400">({shortDate(date)})</span>
    </span>
  )
}

/**
 * Active meds & safety — Intent ③. Two CardShells:
 *   Card 1 · Active meds & safety → meds grouped by specialty + allergies + recent labs.
 *   Card 2 · Clinical synthesis    → DDI flags + polypharmacy panel.
 */
export function VeloraV0ActiveMedsCard({ data }: { data: VeloraV0ActiveMedsData }) {
  const ddiCount = data.ddi.length
  const specialties = Array.from(new Set(data.meds.map((m) => m.specialty)))
  const patientLine = formatPatientLine(data.patientName, data.patientMeta)

  const groupAuthor = (specialty: string) =>
    data.meds.find((m) => m.specialty === specialty)?.prescriber ?? ""
  const groupDate = (specialty: string) =>
    data.meds.find((m) => m.specialty === specialty)?.since ?? ""

  return (
    <div className="flex flex-col gap-[10px]">
      {/* Card 1 — Hospital records (meds + allergies + labs) */}
      <CardShell
        icon={<ShieldCross size={15} variant="Bulk" />}
        title="Active meds & safety"
        date={patientLine}
        dataSources={[
          "Drug Exposure (active)",
          "Observation (allergy)",
          "Measurement (last 30d)",
        ]}
      >
        <div className="flex flex-col gap-[10px]">
          <p className="text-[13px] leading-[1.5] text-tp-slate-600">
            <strong className="font-semibold text-tp-slate-800">{data.meds.length} active meds</strong>
            <span className="mx-[6px] text-tp-slate-200">|</span>
            across <strong className="font-semibold text-tp-slate-800">{specialties.length} specialties</strong>
            {ddiCount > 0 && (
              <>
                <span className="mx-[6px] text-tp-slate-200">|</span>
                <strong className="font-semibold text-tp-error-600">{ddiCount} DDI flagged</strong>
              </>
            )}
          </p>

          {specialties.map((specialty) => {
            const subset = data.meds.filter((m) => m.specialty === specialty)
            return (
              <div key={specialty} className="flex flex-col gap-[4px]">
                <SectionSummaryBar
                  label={specialty}
                  icon="Tablets"
                  trailing={<HeaderTrailing author={groupAuthor(specialty)} date={groupDate(specialty)} />}
                />
                <ul className="flex flex-col">
                  {subset.map((m, i) => (
                    <li
                      key={i}
                      className="flex items-baseline gap-[8px] px-[8px] py-[4px] text-[13px] leading-[1.5]"
                      style={{
                        borderTop: i === 0 ? "none" : "0.5px solid var(--tp-slate-100, #F1F5F9)",
                      }}
                    >
                      <span className="font-semibold text-tp-slate-900">{m.drug}</span>
                      <span className="mx-[2px] text-tp-slate-200">|</span>
                      <span className="text-tp-slate-700">{m.dose}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}

          {/* Allergies + Recent labs as two compact sub-sections */}
          <div className="flex flex-col gap-[4px]">
            <SectionSummaryBar label="Allergies" icon="mask" />
            <p className="pl-[8px] text-[12px] italic text-tp-slate-500">
              {data.allergiesOnFile.length === 0
                ? "None recorded. Verify verbally before parenteral therapy."
                : data.allergiesOnFile.join(", ")}
            </p>
          </div>

          <div className="flex flex-col gap-[4px]">
            <SectionSummaryBar
              label="Recent labs"
              icon="Lab"
              trailing={<span className="text-[12px] text-tp-slate-400">last 30 d</span>}
            />
            <ul className="flex flex-col">
              {data.recentLabs.map((l, i) => (
                <li
                  key={i}
                  className="flex items-baseline gap-[8px] px-[8px] py-[4px] text-[13px]"
                  style={{
                    borderTop: i === 0 ? "none" : "0.5px solid var(--tp-slate-100, #F1F5F9)",
                  }}
                >
                  <span className="flex-1 font-semibold text-tp-slate-800">
                    {l.label}<span className="text-tp-slate-400">:</span>
                  </span>
                  <span
                    className={`inline-flex items-baseline gap-[3px] font-semibold ${
                      l.tone === "alert"
                        ? "text-tp-error-600"
                        : l.tone === "warn"
                          ? "text-tp-warning-700"
                          : "text-tp-slate-900"
                    }`}
                  >
                    {(l.tone === "alert" || l.tone === "warn") && <FlagArrow flag="high" />}
                    <span>{l.value}</span>
                  </span>
                  <span className="text-[12px] text-tp-slate-400">{l.refRange}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </CardShell>

      {/* Card 2 — Clinical synthesis */}
      <CardShell
        icon={<Diagram size={15} variant="Bulk" />}
        title="Clinical synthesis"
        date={`Safety + polypharmacy · ${patientLine}`}
        dataSources={["DDI rule-base", "Lexicomp / Zydus formulary", "NICE NG56"]}
      >
        <div className="flex flex-col gap-[10px]">
          <p className="text-[13px] leading-[1.5] text-tp-slate-600">
            DDI rules and threshold colouring applied against named pharmacy and clinical bodies.
            AI picks <em>which panels apply</em>; it does not author the rule.
          </p>

          {data.ddi.map((flag, idx) => (
            <div
              key={idx}
              className="rounded-[10px] border border-tp-error-200 bg-tp-error-50/40 px-[10px] py-[8px]"
            >
              <div className="mb-[3px] flex items-center justify-between gap-[6px]">
                <div className="flex items-center gap-[5px] text-[12px] font-bold text-tp-error-700">
                  <Danger size={12} variant="Bulk" />
                  <span>DDI · {flag.drugs[0]} × {flag.drugs[1]}</span>
                </div>
                <GuidelineChip body={flag.rule.body} year={flag.rule.year} section={flag.rule.section} />
              </div>
              <p className="text-[13px] leading-[1.5] text-tp-slate-700">
                <HighlightLine text={flag.rationale} />
              </p>
            </div>
          ))}

          {data.thresholdPanels.map((s, idx) => (
            <div key={idx} className="flex flex-col gap-[4px]">
              <SectionSummaryBar
                label={s.panelTitle}
                icon="medical-report"
                trailing={<GuidelineChip body={s.guideline.body} year={s.guideline.year} section={s.guideline.section} />}
              />
              <div className="overflow-hidden rounded-[6px] border border-tp-slate-100">
                {s.rows.map((row, i) => (
                  <SynthesisRow key={i} row={row} alternate={i % 2 === 1} />
                ))}
              </div>
            </div>
          ))}

          <p className="rounded-[8px] bg-tp-violet-50/70 px-[10px] py-[7px] text-[12px] leading-[1.5] text-tp-violet-700">
            <span className="font-semibold">Defence: </span>
            DDI severity comes from class-level rule IDs. Threshold colouring comes from the cited guideline.
          </p>
        </div>
      </CardShell>
    </div>
  )
}
