"use client"

import React from "react"
import { Notification, Warning2, Diagram } from "iconsax-reactjs"
import { CardShell } from "../CardShell"
import { SectionSummaryBar } from "../SectionSummaryBar"
import { GuidelineChip, SeverityPill } from "./VeloraStack"
import { HighlightLine, shortDate } from "./highlight"
import type { VeloraV0WhyFlaggedData, VeloraV0Flag } from "../../types"

function dotClass(sev: VeloraV0Flag["severity"]) {
  if (sev === "critical") return "bg-tp-error-500"
  if (sev === "warning") return "bg-tp-warning-500"
  return "bg-tp-blue-400"
}

function formatPatientLine(name: string, meta: string) {
  const trimmed = meta.split("·")[0]?.trim() ?? meta
  return `${name} (${trimmed})`
}

/**
 * Why flagged today — Intent ④. Two CardShells:
 *   Card 1 · Why flagged today  → each trigger as a row with severity + detail.
 *   Card 2 · Threshold sources  → each severity classification cited to its body.
 */
export function VeloraV0WhyFlaggedCard({ data }: { data: VeloraV0WhyFlaggedData }) {
  const criticals = data.flags.filter((f) => f.severity === "critical").length
  const warnings = data.flags.filter((f) => f.severity === "warning").length
  const patientLine = formatPatientLine(data.patientName, data.patientMeta)

  if (data.noTriggers) {
    return (
      <CardShell
        icon={<Notification size={15} variant="Bulk" />}
        title="Why flagged today"
        date={patientLine}
      >
        <div className="rounded-[10px] border border-tp-success-200/60 bg-tp-success-50/40 px-[12px] py-[14px] text-center">
          <p className="text-[14px] font-semibold text-tp-success-700">No exceptions today.</p>
          <p className="mt-[2px] text-[12px] text-tp-success-600">Velora checked {data.freshness.toLowerCase()}.</p>
        </div>
      </CardShell>
    )
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {/* Card 1 — Triggers fired */}
      <CardShell
        icon={<Warning2 size={15} variant="Bulk" />}
        title="Why flagged today"
        date={patientLine}
        dataSources={[
          "Visit (admission)",
          "Measurement (critical)",
          "Vital",
          "Drug Exposure count",
          "Appointment",
        ]}
      >
        <div className="flex flex-col gap-[10px]">
          <p className="text-[13px] leading-[1.5] text-tp-slate-600">
            {criticals > 0 && (
              <><strong className="font-semibold text-tp-error-600">{criticals} critical</strong></>
            )}
            {criticals > 0 && warnings > 0 && (
              <span className="mx-[6px] text-tp-slate-200">|</span>
            )}
            {warnings > 0 && (
              <><strong className="font-semibold text-tp-warning-700">{warnings} warning</strong></>
            )}
            {" "}fired since last contact. Severity is set by signed rules, not the LLM.
          </p>

          <SectionSummaryBar label="Triggers fired" icon="emergency" />
          <ul className="flex flex-col">
            {data.flags.map((flag, i) => (
              <li
                key={i}
                className="flex items-start gap-[8px] px-[8px] py-[7px]"
                style={{
                  borderTop: i === 0 ? "none" : "0.5px solid var(--tp-slate-100, #F1F5F9)",
                }}
              >
                <span className={`mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full ${dotClass(flag.severity)}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-[6px]">
                    <SeverityPill severity={flag.severity} />
                    <span className="text-[13px] font-semibold text-tp-slate-900">{flag.title}</span>
                  </div>
                  <p className="mt-[3px] text-[13px] leading-[1.5] text-tp-slate-700">
                    <HighlightLine text={flag.detail} />
                  </p>
                </div>
                <span className="shrink-0 text-[12px] text-tp-slate-400">
                  {flag.source.author}
                  <span className="ml-[4px] text-tp-slate-300">({shortDate(flag.source.date)})</span>
                </span>
              </li>
            ))}
          </ul>

        </div>
      </CardShell>

      {/* Card 2 — Threshold sources (Clinical synthesis for flags) */}
      <CardShell
        icon={<Diagram size={15} variant="Bulk" />}
        title="Threshold sources"
        date={`Severity classification · ${patientLine}`}
        dataSources={["Signed thresholds", "NICE NG56", "Zydus lab refs"]}
      >
        <div className="flex flex-col gap-[8px]">
          <p className="text-[13px] leading-[1.5] text-tp-slate-600">
            Each severity classification points back to its signed threshold or guideline.
            Velora matches; it does not set thresholds.
          </p>

          <ul className="flex flex-col rounded-[8px] border border-tp-slate-100">
            {data.flags
              .filter((f) => f.guideline)
              .map((f, i) => (
                <li
                  key={i}
                  className="flex items-center gap-[8px] px-[10px] py-[6px] text-[13px]"
                  style={{
                    borderTop: i === 0 ? "none" : "0.5px solid var(--tp-slate-100, #F1F5F9)",
                  }}
                >
                  <SeverityPill severity={f.severity} />
                  <span className="flex-1 truncate text-tp-slate-700">{f.title}</span>
                  {f.thresholdNote && <span className="text-[12px] text-tp-slate-400">{f.thresholdNote}</span>}
                  {f.guideline && (
                    <GuidelineChip body={f.guideline.body} year={f.guideline.year} section={f.guideline.section} />
                  )}
                </li>
              ))}
          </ul>

          <p className="rounded-[8px] bg-tp-violet-50/70 px-[10px] py-[7px] text-[12px] leading-[1.5] text-tp-violet-700">
            <span className="font-semibold">Defence: </span>
            Thresholds come from named bodies or your hospital's signed lab reference. Adjusting them requires re-signing, not a model change.
          </p>
        </div>
      </CardShell>
    </div>
  )
}
