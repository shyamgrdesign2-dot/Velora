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

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#1A1948]">
      {/* ── Layer 1 — AI conic-gradient wash ── */}
      <div className="velora-login-wash pointer-events-none absolute inset-0" aria-hidden />

      {/* ── Layer 2 — Animated grid scaffolding.
            Cranked-up visibility per design call: container scaled to
            160vmin (the grid extends past the viewport so we always
            see the dense centre, not the fade edges), opacity nudged
            to ~0.95, blend mode kept on screen so the white strokes
            pop against the deep gradient. ── */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="velora-login-grid h-[160vmin] w-[160vmin]">
          <AnimatedGrid className="h-full w-full opacity-95" />
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
          {/* Brand mark — just the Velora sparkle icon, scaled up.
              Wordmark + Beta tag dropped per the simplified spec
              (the headline below already names the product). */}
          <div className="mb-[20px] flex items-center justify-center">
            <span
              className="relative inline-flex h-[64px] w-[64px] items-center justify-center overflow-hidden"
              style={{ borderRadius: 18 }}
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
                width={36}
                height={36}
              />
            </span>
          </div>

          {/* Headline — Playfair Display via --font-display.
              Subtitle removed per simplified spec. */}
          <h1
            className="velora-login-headline mb-[26px] text-center text-[36px] font-bold leading-[1.1] text-tp-slate-900"
          >
            Sign in to{" "}
            <span className="velora-login-headline-accent italic">Velora</span>
          </h1>

          {/* ── Username + password (only auth path) ── */}
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
                className="block w-full rounded-[10px] border border-tp-slate-200 bg-white px-[14px] py-[11px] text-[14px] text-tp-slate-800 placeholder:text-tp-slate-400 focus:border-tp-blue-500 focus:outline-none focus:ring-2 focus:ring-tp-blue-100"
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
                  className="block w-full rounded-[10px] border border-tp-slate-200 bg-white px-[14px] py-[11px] pr-[44px] text-[14px] text-tp-slate-800 placeholder:text-tp-slate-400 focus:border-tp-blue-500 focus:outline-none focus:ring-2 focus:ring-tp-blue-100"
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
      </div>

      <style>{`
        /* Conic AI wash — deeper indigo / violet / midnight-blue palette.
           Darker than the chat-panel wash so the white card pops and the
           grid lines (which are white) read clearly. */
        @property --velora-login-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .velora-login-wash {
          background: conic-gradient(
            from var(--velora-login-angle) at 50% 50%,
            #1E1B4B 0deg,
            #312E81 55deg,
            #4338CA 115deg,
            #5B21B6 180deg,
            #4C1D95 235deg,
            #1E3A8A 295deg,
            #1E1B4B 360deg
          );
          animation: veloraLoginRotate 28s linear infinite;
          will-change: --velora-login-angle;
          filter: saturate(1.1);
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

        /* CTA — solid blue. Per spec, this surface uses blue only for
           the primary action; violet stays for the "Velora" headline
           accent so the brand wordmark still reads as the AI surface. */
        .velora-login-cta {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #1E40AF 100%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.32),
            0 8px 20px -8px rgba(29,78,216,0.55);
        }
        .velora-login-cta:hover:not(:disabled) {
          filter: brightness(1.06);
        }

        @media (prefers-reduced-motion: reduce) {
          .velora-login-wash, .velora-login-grid { animation: none; }
        }
      `}</style>
    </div>
  )
}

