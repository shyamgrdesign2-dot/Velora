"use client"

import React, { useState, useRef, useEffect } from "react"
import { Setting2, More, Logout, MessageEdit, Clock, Profile } from "iconsax-reactjs"
import { cn } from "@/lib/utils"
import type { DoctorViewType, DrAgentVariant, SpecialtyTabId } from "../types"
import { GuidelineSettingsSidebar } from "./GuidelineSettingsSidebar"

// -----------------------------------------------------------------
// Specialty → Auto-switch patient mapping
// -----------------------------------------------------------------

const SPECIALTY_PATIENT_MAP: Record<SpecialtyTabId, string> = {
  gp: "__patient__",         // Shyam GR
  gynec: "apt-lakshmi",      // Lakshmi K
  ophthal: "apt-anjali",     // Anjali Patel
  obstetric: "apt-priya",    // Priya Rao
  pediatrics: "apt-arjun",   // Arjun S
}

const SPECIALTY_OPTIONS: { id: SpecialtyTabId; label: string }[] = [
  { id: "gp", label: "GP" },
  { id: "gynec", label: "Gynec" },
  { id: "ophthal", label: "Ophthal" },
  { id: "obstetric", label: "Obstetric" },
  { id: "pediatrics", label: "Pediatrics" },
]

// -----------------------------------------------------------------
// Doctor View Type options (controls summary depth per doctor context)
// -----------------------------------------------------------------

const DOCTOR_VIEW_OPTIONS: { id: DoctorViewType; label: string; shortLabel: string }[] = [
  { id: "specialist_first_visit", label: "Specialist", shortLabel: "Specialist" },
  { id: "treating_physician", label: "Treating Doctor", shortLabel: "Treating" },
  { id: "emergency_oncall", label: "Emergency", shortLabel: "Emergency" },
]

// -----------------------------------------------------------------
// Intake Mode options
// -----------------------------------------------------------------

export type IntakeMode = "with_intake" | "without_intake"

const INTAKE_OPTIONS: { id: IntakeMode; label: string }[] = [
  { id: "with_intake", label: "With previous intake" },
  { id: "without_intake", label: "Without previous intake" },
]

// -----------------------------------------------------------------
// AgentHeader — Clean, minimal header with unified dropdown
// -----------------------------------------------------------------

interface AgentHeaderProps {
  availableSpecialties: SpecialtyTabId[]
  activeSpecialty: SpecialtyTabId
  onSpecialtyChange: (tab: SpecialtyTabId) => void
  onPatientChange: (id: string) => void
  selectedPatientId: string
  onClose: () => void
  className?: string
  /** Doctor view type — controls summary depth and pill selection */
  doctorViewType?: DoctorViewType
  onDoctorViewChange?: (type: DoctorViewType) => void
  /** Show doctor view selector (only for patients with POMR/SBAR data) */
  showDoctorViewSelector?: boolean
  /** Intake mode — with or without pre-visit intake */
  intakeMode?: IntakeMode
  onIntakeModeChange?: (mode: IntakeMode) => void
  /** Panel variant — V0 shows simplified header */
  variant?: DrAgentVariant
  /** Override brand tag title (defaults to "Dr. Agent") */
  brandTitle?: string
  /** When set, renders a floating liquid-glass patient-context chip in
   *  the centre of the header. Used by the standalone Velora homepage
   *  to surface the patient name (previously shown inside the chat
   *  input chip). Tapping it fires `onPatientChipClick`. */
  patientChipLabel?: string
  patientChipMeta?: string
  onPatientChipClick?: () => void
}

export function AgentHeader({
  activeSpecialty,
  onSpecialtyChange,
  onPatientChange,
  onClose,
  className,
  doctorViewType,
  onDoctorViewChange,
  showDoctorViewSelector,
  intakeMode = "with_intake",
  onIntakeModeChange,
  variant = "full",
  brandTitle,
  patientChipLabel,
  patientChipMeta,
  onPatientChipClick,
}: AgentHeaderProps) {
  const isV0 = variant === "v0"
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  // Admin → Guideline Settings sidebar. Triggered by the gear icon next
  // to the minimize button. V0: the trigger is always rendered (the
  // demo audience IS the admin). Future: gate behind a role check.
  const [guidelineSettingsOpen, setGuidelineSettingsOpen] = useState(false)
  // Homepage navbar — profile + kebab dropdowns (standalone surface only).
  const [profileOpen, setProfileOpen] = useState(false)
  const [kebabOpen, setKebabOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const kebabRef = useRef<HTMLDivElement>(null)

  // Standalone (homepage) mode is detected via the presence of the
  // patient chip props — the embedded sidebar mode never passes these.
  // When true, the floating tag set is replaced by a full-width sticky
  // header navbar with profile + kebab affordances on the right.
  const homepageMode = !!patientChipLabel || !!onPatientChipClick

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [dropdownOpen])

  // Close profile/kebab menus on outside click
  useEffect(() => {
    if (!profileOpen && !kebabOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (profileOpen && profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false)
      }
      if (kebabOpen && kebabRef.current && !kebabRef.current.contains(target)) {
        setKebabOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [profileOpen, kebabOpen])

  const activeSpecLabel = SPECIALTY_OPTIONS.find((o) => o.id === activeSpecialty)?.label ?? "GP"
  const activeDoctorLabel = DOCTOR_VIEW_OPTIONS.find((o) => o.id === doctorViewType)?.shortLabel
  const activeIntakeLabel = intakeMode === "with_intake" ? "Intake" : "No intake"

  // Build compact badge text for the dropdown trigger
  const badgeParts: string[] = [activeSpecLabel]
  if (showDoctorViewSelector && activeDoctorLabel) {
    badgeParts.push(activeDoctorLabel)
  }

  function handleSpecialtySelect(id: SpecialtyTabId) {
    onSpecialtyChange(id)
    const patientId = SPECIALTY_PATIENT_MAP[id]
    if (patientId) {
      onPatientChange(patientId)
    }
  }

  // Navbar height differs between modes: the homepage standalone surface
  // uses a taller full-width bar (60px) so the profile + kebab + brand
  // chip read as a real product header. The embedded sidebar keeps the
  // 52px transparent strip so it sits flush against the host EMR chrome.
  const headerHeight = homepageMode ? 60 : 52
  // Patient chip top offset — below the navbar with a small breathing
  // gap. In the legacy floating mode it sits inside the header strip.
  const patientChipTop = homepageMode ? headerHeight + 10 : 10

  return (
    <div className={cn("relative z-20", className)}>
      {/* Header — homepage mode renders a full-width sticky navbar with
          a soft white/glass fill; embedded mode keeps the transparent
          floating-tags strip so it sits flush against the host EMR. */}
      <div
        className={cn(
          "relative flex items-center justify-between",
          homepageMode
            ? "sticky top-0 z-30 w-full px-[20px]"
            : "px-[14px]",
        )}
        style={{
          height: headerHeight,
          background: homepageMode
            ? "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.88) 100%)"
            : "transparent",
          backdropFilter: homepageMode ? "blur(14px) saturate(140%)" : undefined,
          WebkitBackdropFilter: homepageMode ? "blur(14px) saturate(140%)" : undefined,
          borderBottom: homepageMode ? "1px solid rgba(15,23,42,0.06)" : undefined,
          boxShadow: homepageMode ? "0 1px 0 rgba(15,23,42,0.02), 0 6px 16px -10px rgba(15,23,42,0.08)" : undefined,
        }}
      >
        {/* Left: Dr. Agent brand tag — floating liquid-glass card with 10px radius */}
        <div className="pointer-events-auto relative z-10 flex items-center gap-[6px]">
          <span className="da-agent-brand-tag relative flex items-center gap-[7px] rounded-[10px] py-[5px] pl-[6px] pr-[8px]">
            <span
              className="relative inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden"
              aria-hidden
              style={{ borderRadius: 7 }}
            >
              {/* Dr. Agent sparkle — same asset used in chat bubble for consistency */}
              <img
                src="/icons/dr-agent/agent-bg.svg"
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <img
                src="/icons/dr-agent/agent-spark.svg"
                alt=""
                draggable={false}
                className="relative z-10"
                width={13}
                height={13}
              />
            </span>
            <span
              className="text-[13.5px] font-semibold leading-none text-tp-slate-700"
              style={{ letterSpacing: "0.1px" }}
            >
              {brandTitle ?? "Velora"}
            </span>
            {/* Beta tag — orange gradient pill sitting INSIDE the
                brand tag, immediately after the name. Signals to the
                clinician that this surface is a pilot release; the
                gradient keeps it warm without competing with the
                violet brand tone on the rest of the agent UI. */}
            <span
              className="inline-flex shrink-0 items-center rounded-[5px] px-[6px] py-[2px] text-[9.5px] font-bold uppercase leading-none text-white"
              style={{
                background: "linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)",
                letterSpacing: "0.08em",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 1px 2px rgba(234,88,12,0.20)",
              }}
              aria-label="Beta release"
            >
              Beta
            </span>
          </span>

          {/* Unified Dropdown — Specialty + Doctor Type + Intake (removed — demo only) */}
          {false && <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className={cn(
                "flex items-center gap-[4px] rounded-full px-[7px] py-[2px]",
                "text-[12px] leading-[1.3] text-white/60",
                "bg-white/10 backdrop-blur-sm transition-colors duration-150",
                "hover:bg-white/20 hover:text-white/90",
                dropdownOpen && "bg-white/20 text-white/90",
              )}
            >
              {/* Compact badge chips */}
              {badgeParts.map((part, i) => (
                <React.Fragment key={part}>
                  {i > 0 && <span className="text-white/30">·</span>}
                  <span>{part}</span>
                </React.Fragment>
              ))}
              <svg
                width={8}
                height={8}
                viewBox="0 0 10 10"
                fill="none"
                className={cn(
                  "flex-shrink-0 transition-transform duration-150",
                  dropdownOpen && "rotate-180",
                )}
              >
                <path
                  d="M2.5 3.75L5 6.25L7.5 3.75"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Dropdown panel — multi-section */}
            {dropdownOpen && (
              <div
                className={cn(
                  "absolute left-0 top-full z-[120] mt-[4px]",
                  "min-w-[180px] rounded-[10px] border border-tp-slate-100/80",
                  "bg-white/95 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.08)]",
                )}
              >
                {/* Demo notice */}
                <div className="border-b border-tp-slate-100 px-[10px] py-[4px]">
                  <p className="text-[10px] leading-[1.3] text-tp-slate-400 italic">
                    Demo only — not in production
                  </p>
                </div>

                {/* ── Section 1: Specialty ── */}
                <div className="px-[10px] pt-[6px] pb-[2px]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-tp-slate-400 mb-[3px]">Specialty</p>
                  <div className="flex flex-wrap gap-[4px] pb-[6px]">
                    {SPECIALTY_OPTIONS.map((opt) => {
                      const isActive = opt.id === activeSpecialty
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSpecialtySelect(opt.id)}
                          className={cn(
                            "rounded-full px-[8px] py-[3px] text-[12px] leading-[1.3] transition-all duration-100",
                            isActive
                              ? "bg-tp-slate-700 text-white font-medium"
                              : "bg-tp-slate-50 text-tp-slate-500 hover:bg-tp-slate-100 hover:text-tp-slate-700",
                          )}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* ── Section 2: Doctor Type (View As) ── */}
                {showDoctorViewSelector && doctorViewType && onDoctorViewChange && (
                  <>
                    <div className="mx-[10px] border-t border-tp-slate-100" />
                    <div className="px-[10px] pt-[6px] pb-[2px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-tp-slate-400 mb-[3px]">View as</p>
                      <div className="flex flex-wrap gap-[4px] pb-[6px]">
                        {DOCTOR_VIEW_OPTIONS.map((opt) => {
                          const isActive = opt.id === doctorViewType
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => onDoctorViewChange(opt.id)}
                              className={cn(
                                "rounded-full px-[8px] py-[3px] text-[12px] leading-[1.3] transition-all duration-100",
                                isActive
                                  ? "bg-tp-violet-600 text-white font-medium"
                                  : "bg-tp-slate-50 text-tp-slate-500 hover:bg-tp-violet-50 hover:text-tp-violet-700",
                              )}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Section 3: Intake Mode ── */}
                {onIntakeModeChange && (
                  <>
                    <div className="mx-[10px] border-t border-tp-slate-100" />
                    <div className="px-[10px] pt-[6px] pb-[6px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-tp-slate-400 mb-[3px]">Intake</p>
                      <div className="flex gap-[4px]">
                        {INTAKE_OPTIONS.map((opt) => {
                          const isActive = opt.id === intakeMode
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => onIntakeModeChange(opt.id)}
                              className={cn(
                                "rounded-full px-[8px] py-[3px] text-[12px] leading-[1.3] transition-all duration-100",
                                isActive
                                  ? "bg-tp-blue-600 text-white font-medium"
                                  : "bg-tp-slate-50 text-tp-slate-500 hover:bg-tp-blue-50 hover:text-tp-blue-700",
                              )}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>}
        </div>

        {/* Centre: floating patient-context chip lives OUTSIDE the
            navbar (see below) so it can sit just under the bar in
            homepage mode. Rendered after the navbar so the absolute
            position is anchored to the outer wrapper. */}

        {/* Right: admin · guideline settings + collapse — two floating
            glass tags sitting together so the doctor-facing collapse
            stays the rightmost affordance and the admin-only gear is
            one tap to the left. */}
        <div className="pointer-events-auto relative z-10 flex items-center gap-[6px]">
          {/* Admin · Guideline Settings trigger. Now rendered as a
              labelled chip (icon + "Guidelines" + tiny ADMIN tag) so
              the affordance is discoverable. V0: always visible (the
              demo audience IS the admin). Future: gate behind a
              `role === "hospital_admin"` check. */}
          <button
            type="button"
            onClick={() => setGuidelineSettingsOpen(true)}
            className="da-agent-collapse-tag pointer-events-auto relative z-10 flex h-[32px] items-center gap-[5px] rounded-[10px] px-[10px] text-tp-slate-700 transition-colors hover:text-tp-slate-900 active:scale-[0.95]"
            aria-label="Open guideline settings (admin)"
            title="Configure which clinical guidelines this hospital follows (admin)"
          >
            <Setting2 size={15} variant="Bulk" className="text-tp-violet-600" />
            <span className="text-[12.5px] font-semibold leading-none">Guidelines</span>
            <span
              className="rounded-[4px] px-[5px] py-[1px] text-[8.5px] font-bold uppercase leading-none text-white"
              style={{
                background: "linear-gradient(135deg, #FB923C 0%, #F97316 100%)",
                letterSpacing: "0.08em",
              }}
            >
              Admin
            </span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="da-agent-collapse-tag pointer-events-auto relative z-10 flex h-[32px] w-[32px] items-center justify-center rounded-[10px] text-tp-slate-600 transition-colors hover:text-tp-slate-900 active:scale-[0.95]"
            aria-label="Minimize agent"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="3.5" stroke="currentColor" strokeWidth="1.7" />
              <path d="M9 3v18" stroke="currentColor" strokeWidth="1.7" />
              <path d="M13 9l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Homepage navbar only: user profile + vertical kebab. The
              profile click opens a small dropdown with the signed-in
              clinician's identity + a logout option; the kebab opens
              a chat-session menu. Both are dummy targets in V0 (this
              surface is a pilot demo) but they signal the production
              shape so reviewers can see where things will plug in. */}
          {homepageMode && (
            <>
              <span aria-hidden className="mx-[2px] h-[22px] w-px bg-tp-slate-200" />
              {/* Profile dropdown */}
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen((v) => !v)
                    setKebabOpen(false)
                  }}
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-tp-violet-50 text-tp-violet-700 transition-colors hover:bg-tp-violet-100 active:scale-[0.95]"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  aria-label="Open profile menu"
                  title="Profile"
                >
                  <Profile size={18} variant="Bulk" />
                </button>
                {profileOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-[140] mt-[8px] min-w-[244px] overflow-hidden rounded-[12px] border border-tp-slate-100 bg-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)]"
                  >
                    {/* Identity block */}
                    <div className="flex items-center gap-[10px] border-b border-tp-slate-100 px-[14px] py-[12px]">
                      <span className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-tp-violet-100 text-tp-violet-700">
                        <Profile size={20} variant="Bulk" />
                      </span>
                      <span className="flex flex-col leading-tight">
                        <span className="text-[13.5px] font-semibold text-tp-slate-800">Dr. Shyam GR</span>
                        <span className="text-[11.5px] text-tp-slate-500">shyam.gr@tatvacare.in</span>
                      </span>
                    </div>
                    {/* Org line */}
                    <div className="px-[14px] py-[8px] text-[11px] uppercase tracking-wider text-tp-slate-400">
                      Zydus · TatvaPractice
                    </div>
                    {/* Logout */}
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false)
                        // Dummy logout — V0 demo surface.
                      }}
                      role="menuitem"
                      className="flex w-full items-center gap-[10px] border-t border-tp-slate-100 px-[14px] py-[10px] text-left text-[13px] text-tp-slate-700 transition-colors hover:bg-tp-rose-50 hover:text-tp-rose-700"
                    >
                      <Logout size={16} variant="Bulk" className="text-tp-rose-500" />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                )}
              </div>
              {/* Vertical kebab */}
              <div ref={kebabRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setKebabOpen((v) => !v)
                    setProfileOpen(false)
                  }}
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-full text-tp-slate-600 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-900 active:scale-[0.95]"
                  aria-haspopup="menu"
                  aria-expanded={kebabOpen}
                  aria-label="Open session menu"
                  title="More"
                >
                  <More size={20} variant="Bold" className="rotate-90" />
                </button>
                {kebabOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-[140] mt-[8px] min-w-[228px] overflow-hidden rounded-[12px] border border-tp-slate-100 bg-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)]"
                  >
                    <button
                      type="button"
                      onClick={() => setKebabOpen(false)}
                      role="menuitem"
                      className="flex w-full items-center gap-[10px] px-[14px] py-[10px] text-left text-[13px] text-tp-slate-700 transition-colors hover:bg-tp-slate-50"
                    >
                      <MessageEdit size={16} variant="Bulk" className="text-tp-violet-600" />
                      <span className="font-medium">Start new chat session</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setKebabOpen(false)}
                      role="menuitem"
                      className="flex w-full items-center gap-[10px] border-t border-tp-slate-100 px-[14px] py-[10px] text-left text-[13px] text-tp-slate-700 transition-colors hover:bg-tp-slate-50"
                    >
                      <Clock size={16} variant="Bulk" className="text-tp-slate-500" />
                      <span className="font-medium">Chat session history</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setKebabOpen(false)}
                      role="menuitem"
                      className="flex w-full items-center gap-[10px] border-t border-tp-slate-100 px-[14px] py-[10px] text-left text-[13px] text-tp-slate-700 transition-colors hover:bg-tp-slate-50"
                    >
                      <Setting2 size={16} variant="Bulk" className="text-tp-slate-500" />
                      <span className="font-medium">Settings</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating patient-context chip — lives BELOW the navbar in
          homepage mode (anchored to the outer wrapper). Visible only
          when the host page supplies a patient label. Same liquid-
          glass treatment as the Velora brand tag. Clicking opens the
          existing PatientSelector via `onPatientChipClick`. */}
      {patientChipLabel && (
        <button
          type="button"
          onClick={onPatientChipClick}
          disabled={!onPatientChipClick}
          aria-label={`Patient context: ${patientChipLabel}${patientChipMeta ? ` (${patientChipMeta})` : ""}`}
          title="Switch patient"
          className="da-agent-brand-tag pointer-events-auto absolute left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-[7px] rounded-[10px] py-[5px] pl-[10px] pr-[9px] transition-transform active:scale-[0.98] disabled:cursor-default"
          style={{ top: patientChipTop }}
        >
          <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-white/60 text-tp-slate-600">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path opacity="0.4" d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" fill="currentColor" />
              <path d="M12 14.5c-5.01 0-9.09 3.36-9.09 7.5 0 .28.22.5.5.5h17.18c.28 0 .5-.22.5-.5 0-4.14-4.08-7.5-9.09-7.5Z" fill="currentColor" />
            </svg>
          </span>
          <span className="text-[13px] font-semibold leading-none text-tp-slate-800" style={{ letterSpacing: "0.1px" }}>
            {patientChipLabel}
          </span>
          {patientChipMeta && (
            <span className="text-[11px] font-normal leading-none text-tp-slate-500">
              ({patientChipMeta})
            </span>
          )}
          {onPatientChipClick && (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="shrink-0 text-tp-slate-500" aria-hidden>
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}

      {/* Admin sidebar — slide-in panel. Renders into document.body via
          its own portal, so it sits above every chat surface. */}
      <GuidelineSettingsSidebar
        open={guidelineSettingsOpen}
        onClose={() => setGuidelineSettingsOpen(false)}
      />

      <style>{`
        /* Dr. Agent brand tag — iOS liquid-glass with subtle AI gradient tint.
           Low bg opacity + strong blur + saturate so content scrolling behind
           is visibly diffused through the glass. */
        .da-agent-brand-tag {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.18) 100%),
            linear-gradient(135deg, rgba(213,101,234,0.14) 0%, rgba(103,58,172,0.10) 55%, rgba(75,74,213,0.10) 100%);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.80),
            inset 0 0 0 1px rgba(103,58,172,0.12),
            0 4px 12px -4px rgba(103,58,172,0.12);
        }
        /* Collapse tag — same glass weight, subtle neutral AI hint */
        .da-agent-collapse-tag {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.22) 100%),
            linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(75,74,213,0.08) 100%);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.85),
            inset 0 0 0 1px rgba(15,23,42,0.08),
            0 4px 12px -4px rgba(15,23,42,0.08);
          transition: background 180ms ease, box-shadow 180ms ease, color 180ms ease, transform 120ms ease;
        }
        .da-agent-collapse-tag:hover {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0.38) 100%),
            linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(75,74,213,0.10) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,1),
            inset 0 0 0 1px rgba(15,23,42,0.12),
            0 6px 16px -4px rgba(15,23,42,0.12);
        }
      `}</style>
    </div>
  )
}
