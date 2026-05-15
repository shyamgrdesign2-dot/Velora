"use client"

import React, { useState } from "react"
import { Eye, EyeSlash } from "iconsax-reactjs"
import AnimatedGrid from "./AnimatedGrid"

/**
 * LoginScreen — first-mount gate for the standalone Velora surface.
 *
 *   Layout
 *     • Full-bleed AI conic-gradient background (same palette as
 *       da-gradient-wash inside the chat panel) with a soft radial
 *       darkening so the centred card pops.
 *     • Behind the card: AnimatedGrid SVG (white line scaffolding +
 *       traveling comet pulses) at low opacity. The animation reuses
 *       the asset shipped with the Velora design kit so the login
 *       reads as the same "living" surface as the chat.
 *     • Foreground: a white card with the sign-in form. Headline uses
 *       Playfair Display (loaded by the root layout via next/font);
 *       the word "Velora" is rendered with the same violet → pink
 *       gradient text-fill used on Stack 2 AI affordances.
 *
 *   Auth shape (V0 / demo)
 *     • The signup flow lives elsewhere — this surface is sign-in
 *       only. Two paths: (a) username + password (Google-style flat
 *       fields with a show/hide eye on the password); (b) "Continue
 *       with Google" SSO. Both wire to `onAuthenticated()` in this
 *       build — the password path validates against admin/admin@123,
 *       Google is a no-op shortcut.
 *
 *   Why a portal-free render?
 *     The host (VeloraHomePage) controls when this mounts: when the
 *     auth flag is unset, it returns just <LoginScreen>; once the
 *     callback fires, it swaps to the DrAgentPanel. No portal or
 *     overlay — clean single-route mount.
 */
export function LoginScreen({
  onAuthenticated,
}: {
  onAuthenticated: () => void
}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    // V0 dummy auth: any of (admin, demo, doctor) with `admin@123`
    // is accepted. Slight delay so the CTA shows a "verifying" state.
    setTimeout(() => {
      const u = username.trim().toLowerCase()
      const ok = (u === "admin" || u === "demo" || u === "doctor") && password === "admin@123"
      if (ok) {
        onAuthenticated()
      } else {
        setError("Incorrect username or password. Try admin / admin@123.")
        setSubmitting(false)
      }
    }, 350)
  }

  function handleGoogleSignIn() {
    // V0: skip the OAuth round-trip entirely. The real implementation
    // would redirect to /auth/google here.
    setSubmitting(true)
    setTimeout(() => onAuthenticated(), 250)
  }

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#1A1948]">
      {/* ── Layer 1 — AI conic-gradient wash ── */}
      <div className="velora-login-wash pointer-events-none absolute inset-0" aria-hidden />

      {/* ── Layer 2 — Animated grid scaffolding ── */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="velora-login-grid h-[140vmin] w-[140vmin]">
          <AnimatedGrid className="h-full w-full opacity-[0.55]" />
        </div>
      </div>

      {/* ── Layer 3 — Vignette so the card has somewhere to sit ── */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(15,9,46,0.0) 0%, rgba(15,9,46,0.18) 60%, rgba(15,9,46,0.42) 100%)",
        }}
      />

      {/* ── Layer 4 — Card ── */}
      <div className="relative z-10 w-full max-w-[440px] px-[20px]">
        <div
          className="rounded-[24px] bg-white px-[28px] pt-[36px] pb-[28px]"
          style={{
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.6) inset, 0 24px 60px -20px rgba(15,9,46,0.45), 0 12px 28px -16px rgba(15,9,46,0.30)",
          }}
        >
          {/* Brand mark — Velora sparkle + wordmark */}
          <div className="mb-[22px] flex items-center justify-center gap-[8px]">
            <span
              className="relative inline-flex h-[32px] w-[32px] items-center justify-center overflow-hidden"
              style={{ borderRadius: 9 }}
              aria-hidden
            >
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
                width={18}
                height={18}
              />
            </span>
            <span
              className="text-[18px] font-semibold leading-none text-tp-slate-800"
              style={{ letterSpacing: "0.1px" }}
            >
              Velora
            </span>
            <span
              className="inline-flex shrink-0 items-center rounded-[5px] px-[7px] py-[3px] text-[10px] font-bold uppercase leading-none text-white"
              style={{
                background: "linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)",
                letterSpacing: "0.08em",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.45), 0 1px 2px rgba(234,88,12,0.20)",
              }}
              aria-label="Beta release"
            >
              Beta
            </span>
          </div>

          {/* Headline — Playfair Display via --font-display */}
          <h1
            className="velora-login-headline mb-[6px] text-center text-[36px] font-bold leading-[1.1] text-tp-slate-900"
          >
            Sign in to{" "}
            <span className="velora-login-headline-accent italic">Velora</span>
          </h1>
          <p className="mb-[24px] text-center text-[13px] leading-[1.5] text-tp-slate-500">
            Hospital-signed clinical AI · Private, cited, you decide
          </p>

          {/* ── Google SSO (top — primary entry) ── */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="mb-[18px] flex w-full items-center justify-center gap-[10px] rounded-[10px] border border-tp-slate-200 bg-white px-[16px] py-[11px] text-[14px] font-semibold text-tp-slate-800 transition-all hover:bg-tp-slate-50 active:scale-[0.99] disabled:cursor-default disabled:opacity-60"
          >
            <GoogleGlyph />
            Continue with Google
          </button>

          <div className="mb-[18px] flex items-center gap-[10px]" aria-hidden>
            <span className="h-px flex-1 bg-tp-slate-100" />
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-tp-slate-400">
              or
            </span>
            <span className="h-px flex-1 bg-tp-slate-100" />
          </div>

          {/* ── Password sign-in form ── */}
          <form onSubmit={handleSubmit} noValidate>
            <label className="mb-[14px] block">
              <span className="mb-[6px] block text-[12px] font-semibold text-tp-slate-700">
                Username
              </span>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="block w-full rounded-[10px] border border-tp-slate-200 bg-white px-[14px] py-[11px] text-[14px] text-tp-slate-800 placeholder:text-tp-slate-400 focus:border-tp-violet-400 focus:outline-none focus:ring-2 focus:ring-tp-violet-100"
              />
            </label>

            <label className="mb-[8px] block">
              <span className="mb-[6px] block text-[12px] font-semibold text-tp-slate-700">
                Password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-[10px] border border-tp-slate-200 bg-white px-[14px] py-[11px] pr-[44px] text-[14px] text-tp-slate-800 placeholder:text-tp-slate-400 focus:border-tp-violet-400 focus:outline-none focus:ring-2 focus:ring-tp-violet-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-[10px] top-1/2 -translate-y-1/2 flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-tp-slate-400 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-700"
                >
                  {showPassword ? <EyeSlash size={16} variant="Linear" /> : <Eye size={16} variant="Linear" />}
                </button>
              </div>
            </label>

            {error && (
              <p className="mb-[12px] text-[12px] text-tp-error-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !username.trim() || !password}
              className="velora-login-cta mt-[12px] flex w-full items-center justify-center gap-[8px] rounded-[12px] px-[18px] py-[12px] text-[14.5px] font-semibold text-white transition-transform active:scale-[0.99] disabled:cursor-default disabled:opacity-60"
            >
              {submitting ? "Verifying…" : "Get started"}
            </button>
          </form>

          <p className="mt-[18px] text-center text-[11.5px] leading-[1.5] text-tp-slate-400">
            New here? Velora accounts are provisioned by your hospital admin.
          </p>
        </div>

        {/* Trust marker — outside the card, on the gradient */}
        <p className="mt-[18px] text-center text-[11px] leading-[1.5] text-white/70">
          Anchored to hospital-signed guidelines · Private · Cited · You decide
        </p>
      </div>

      <style>{`
        /* Conic AI wash — same palette as da-gradient-wash but at higher
           opacity (this is the actual background, not a subtle tint). */
        @property --velora-login-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .velora-login-wash {
          background: conic-gradient(
            from var(--velora-login-angle) at 50% 50%,
            #E38BBE 0deg,
            #B06CE0 55deg,
            #8B5CF6 115deg,
            #6B5FE0 180deg,
            #4B4AD5 235deg,
            #4FACFE 295deg,
            #E38BBE 360deg
          );
          animation: veloraLoginRotate 28s linear infinite;
          will-change: --velora-login-angle;
          filter: saturate(1.05);
        }
        @keyframes veloraLoginRotate {
          from { --velora-login-angle: 0deg; }
          to   { --velora-login-angle: 360deg; }
        }

        /* Soft drift on the grid so the lines don't feel static. */
        .velora-login-grid {
          animation: veloraGridDrift 60s ease-in-out infinite;
          transform-origin: center;
          mix-blend-mode: screen;
        }
        @keyframes veloraGridDrift {
          0%, 100% { transform: scale(1.0) rotate(0deg); }
          50%       { transform: scale(1.04) rotate(0.6deg); }
        }

        /* Playfair Display headline + violet→pink gradient on "Velora". */
        .velora-login-headline {
          font-family: var(--font-display), "Playfair Display", Georgia, serif;
          letter-spacing: -0.01em;
        }
        .velora-login-headline-accent {
          background: linear-gradient(135deg, #B06CE0 0%, #8B5CF6 40%, #E38BBE 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          position: relative;
        }
        .velora-login-headline-accent::after {
          content: "";
          position: absolute;
          left: 6%;
          right: 6%;
          bottom: 0.05em;
          height: 2px;
          background: linear-gradient(90deg, #B06CE0 0%, #E38BBE 100%);
          border-radius: 2px;
          opacity: 0.55;
        }

        /* CTA — AI gradient pill */
        .velora-login-cta {
          background: linear-gradient(135deg, #6B5FE0 0%, #8B5CF6 45%, #B06CE0 100%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.30),
            0 8px 20px -8px rgba(107,95,224,0.55);
        }
        .velora-login-cta:hover:not(:disabled) {
          filter: brightness(1.04);
        }

        @media (prefers-reduced-motion: reduce) {
          .velora-login-wash, .velora-login-grid { animation: none; }
        }
      `}</style>
    </div>
  )
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86a5.27 5.27 0 0 1-4.95-3.64H1.04v2.28A8.99 8.99 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M4.05 10.78A5.4 5.4 0 0 1 3.77 9c0-.62.11-1.22.28-1.78V4.94H1.04A9 9 0 0 0 0 9c0 1.45.34 2.82.94 4.06l3.11-2.28Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.34l2.58-2.58A8.97 8.97 0 0 0 9 0 8.99 8.99 0 0 0 1.04 4.94l3.01 2.28C4.78 5.05 6.7 3.58 9 3.58Z"
      />
    </svg>
  )
}
