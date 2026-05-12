"use client"

import React from "react"
import { ClipboardClose, Setting2 } from "iconsax-reactjs"
import { CardShell } from "../CardShell"
import { SectionSummaryBar } from "../SectionSummaryBar"
import { HighlightLine, shortDate } from "./highlight"
import type { VeloraV0OpenLoopsData, VeloraV0OpenLoop } from "../../types"

function dotClass(sev: VeloraV0OpenLoop["severity"]) {
  return sev === "red" ? "bg-tp-error-500" : "bg-tp-warning-500"
}

function formatPatientLine(name: string, meta: string) {
  const trimmed = meta.split("·")[0]?.trim() ?? meta
  return `${name} (${trimmed})`
}

/**
 * Open loops — Intent ②. Two CardShells:
 *   Card 1 · Open loops      → each chain as a row inside an "Open chains" section.
 *   Card 2 · Operational      → the signed thresholds (no clinical guideline cited,
 *           thresholds            since open-loop detection is operational).
 */
export function VeloraV0OpenLoopsCard({ data }: { data: VeloraV0OpenLoopsData }) {
  const reds = data.loops.filter((l) => l.severity === "red").length
  const ambers = data.loops.filter((l) => l.severity === "amber").length
  const patientLine = formatPatientLine(data.patientName, data.patientMeta)

  return (
    <div className="flex flex-col gap-[10px]">
      {/* Card 1 — Open chains */}
      <CardShell
        icon={<ClipboardClose size={15} variant="Bulk" />}
        title="Open loops"
        date={patientLine}
        dataSources={[
          "Order (lab)",
          "Referral × Visit",
          "Appointment (no-show)",
          "Drug Exposure × Pharmacy Dispense",
        ]}
      >
        <div className="flex flex-col gap-[10px]">
          <p className="text-[13px] leading-[1.5] text-tp-slate-600">
            <strong className="font-semibold text-tp-slate-800">{data.loops.length} chains</strong>
            {" "}have not closed
            {reds > 0 && (
              <> <span className="mx-[6px] text-tp-slate-200">|</span> <strong className="font-semibold text-tp-error-600">{reds} past threshold</strong></>
            )}
            {ambers > 0 && (
              <> <span className="mx-[6px] text-tp-slate-200">|</span> <strong className="font-semibold text-tp-warning-700">{ambers} approaching</strong></>
            )}
            .
          </p>

          <SectionSummaryBar label="Open chains" icon="medical-record" />
          <ul className="flex flex-col">
            {data.loops.map((loop, i) => (
              <li
                key={i}
                className="flex items-start gap-[8px] px-[8px] py-[6px] text-[13px] leading-[1.45]"
                style={{
                  borderTop: i === 0 ? "none" : "0.5px solid var(--tp-slate-100, #F1F5F9)",
                }}
              >
                <span className={`mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full ${dotClass(loop.severity)}`} />
                <span className="w-[58px] shrink-0 font-mono text-[12px] font-semibold text-tp-slate-700">
                  {loop.ageDays}d
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-tp-slate-800">
                    <HighlightLine text={loop.title} />
                  </div>
                  <p className="mt-[2px] text-[12px] italic text-tp-slate-400">
                    <HighlightLine text={loop.detector} />
                  </p>
                  {loop.disclosure && (
                    <p className="mt-[2px] rounded-[4px] bg-tp-warning-50 px-[6px] py-[2px] text-[12px] text-tp-warning-800">
                      {loop.disclosure}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[12px] text-tp-slate-400">
                  {loop.source.author}
                  <span className="ml-[4px] text-tp-slate-300">({shortDate(loop.source.date)})</span>
                </span>
              </li>
            ))}
          </ul>

        </div>
      </CardShell>

      {/* Card 2 — Operational thresholds */}
      <CardShell
        icon={<Setting2 size={15} variant="Bulk" />}
        title="Operational thresholds"
        date={`Signed config · ${data.thresholdConfig.signedBy}`}
        dataSources={["Hospital operational config (signed)"]}
      >
        <div className="flex flex-col gap-[8px]">
          <p className="text-[13px] leading-[1.5] text-tp-slate-600">
            Open-loop detection is <strong className="font-semibold text-tp-slate-800">operational, not clinical</strong>.
            Thresholds come from the hospital's signed configuration.
          </p>
          <ul className="flex flex-col rounded-[8px] border border-tp-slate-100">
            {data.thresholdConfig.rules.map((r, i) => (
              <li
                key={i}
                className="flex items-center gap-[8px] px-[10px] py-[6px] text-[13px]"
                style={{
                  borderTop: i === 0 ? "none" : "0.5px solid var(--tp-slate-100, #F1F5F9)",
                }}
              >
                <span className="flex-1 text-tp-slate-600">{r.category}</span>
                <span className="font-mono text-[12px] font-semibold text-tp-violet-700">{r.window}</span>
              </li>
            ))}
          </ul>
          <p className="rounded-[8px] bg-tp-slate-50 px-[10px] py-[7px] text-[12px] leading-[1.5] text-tp-slate-600">
            <span className="font-semibold">Defence: </span>
            No clinical guideline cited. Open-loop windows are an operational policy signed by your clinical lead.
          </p>
        </div>
      </CardShell>
    </div>
  )
}
