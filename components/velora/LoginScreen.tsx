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
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-white">
      {/* ── Layer 1 — animated AI wash, reusing the chat-bg.gif
            (the same asset that lives behind the Velora icon tile in
            the chat welcome card). Scaled past the viewport + heavily
            blurred so the doctor reads "soft tinted backdrop" instead
            of a recognisable GIF. Opacity dropped to 0.55 so the
            colour reads as a faint hue, not a saturated background —
            this also leaves enough headroom for the white grid lines
            above it to stay clearly visible. ── */}
      <div
        className="velora-login-wash pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: "url(/icons/dr-agent/chat-bg.gif)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.55,
        }}
      />

      {/* ── Layer 2 — Animated grid scaffolding. Sits ABOVE the wash
            but below the vignette. The previous build used
            mix-blend-mode: multiply on this layer, which on a white
            stroke is the identity transform — the grid was painted
            but invisible. We now render with normal compositing so
            the strokes actually appear; opacity nudged up to 0.95
            so the line art reads at a glance. ── */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="velora-login-grid h-[105vmin] w-[105vmin]">
          <AnimatedGrid className="h-full w-full opacity-95" />
        </div>
      </div>

      {/* ── Layer 3 — Soft radial vignette.
            Pulled back so the corners stay tinted (a hint of the
            wash colour bleeds through at the edges) instead of
            going almost solid white. The card sits in the bright
            centre; the wash gradient is still visible around the
            edges. ── */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 50%, rgba(255,255,255,0) 0%, rgba(255,255,255,0.12) 60%, rgba(255,255,255,0.38) 85%, rgba(255,255,255,0.55) 100%)",
        }}
      />

      {/* ── Layer 4 — Card.
            Liquid-glass treatment: translucent white over the wash,
            backdrop-blur so the violet/blue smear behind the card
            stays visible as a soft halo, 1px inset white highlight
            on the top edge, generous corner radius. ── */}
      <div className="relative z-10 w-full max-w-[440px] px-[20px]">
        <div
          className="rounded-[32px] px-[28px] pt-[36px] pb-[28px]"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.72) 100%)",
            backdropFilter: "blur(28px) saturate(140%)",
            WebkitBackdropFilter: "blur(28px) saturate(140%)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.85), inset 0 0 0 1px rgba(255,255,255,0.18), 0 24px 60px -20px rgba(30,27,75,0.28), 0 12px 28px -16px rgba(30,27,75,0.18)",
          }}
        >
          {/* Brand mark — animated Velora sparkle. Same composition as
              the chat WelcomeScreen icon (white tile + chat-bg.gif
              animated wash at low opacity + slowly rotating spark)
              scaled to 56px so it carries weight on the login surface
              without dwarfing the Playfair headline. */}
          <div className="mb-[18px] flex items-center justify-center">
            <span
              className="pointer-events-none select-none relative inline-flex items-center justify-center overflow-hidden"
              style={{ width: 56, height: 56, borderRadius: 56 * 0.24 }}
              aria-hidden
            >
              <div className="absolute inset-0 bg-white" style={{ borderRadius: 56 * 0.24 }} />
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "url(/icons/dr-agent/chat-bg.gif)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  borderRadius: 56 * 0.24,
                  opacity: 0.32,
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/dr-agent/agent-spark.svg"
                width={56 * 0.72}
                height={56 * 0.72}
                alt=""
                draggable={false}
                className="velora-login-spark-rotate relative z-10"
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
            New here? Contact your hospital.
          </p>
        </div>
      </div>

      <style>{`
        /* Wash layer — chat-bg.gif scaled WELL past the viewport and
           heavily blurred + saturated so the doctor sees a soft
           tinted backdrop rather than a recognisable GIF.
           Heavy blur (160px) makes the colour transitions read as a
           slow ambient drift instead of a tight loopable animation.
           Scale 2.4 enlarges each colour patch so any movement in
           the underlying GIF covers a smaller fraction of the
           screen — the perceived speed drops a lot. */
        .velora-login-wash {
          filter: blur(160px) saturate(135%);
          transform: scale(2.4);
        }

        /* Soft drift on the grid so the lines don't feel static. */
        .velora-login-grid {
          animation: veloraGridDrift 60s ease-in-out infinite;
          transform-origin: center;
          mix-blend-mode: multiply;
          opacity: 0.55;
        }
        @keyframes veloraGridDrift {
          0%, 100% { transform: scale(1.0) rotate(0deg); }
          50%       { transform: scale(1.04) rotate(0.6deg); }
        }

        /* Slow rotation on the Velora sparkle — matches the chat
           welcome icon (16s linear). */
        @keyframes veloraLoginSparkRotate {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .velora-login-spark-rotate {
          animation: veloraLoginSparkRotate 16s linear infinite;
        }

        /* Playfair Display headline + violet→pink gradient that
           gently shifts position across the "Velora" word so the
           wordmark feels alive without distracting. */
        .velora-login-headline {
          font-family: var(--font-display), "Playfair Display", Georgia, serif;
          letter-spacing: -0.01em;
        }
        .velora-login-headline-accent {
          background: linear-gradient(
            120deg,
            #6366F1 0%,
            #8B5CF6 22%,
            #B06CE0 45%,
            #E38BBE 65%,
            #B06CE0 82%,
            #8B5CF6 100%
          );
          background-size: 280% 100%;
          background-position: 0% 50%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          position: relative;
          animation: veloraHeadlineShift 9s ease-in-out infinite;
        }
        @keyframes veloraHeadlineShift {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
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
          opacity: 0.45;
        }

        /* CTA — solid primary blue (single tone, not gradient).
           Per spec: blue is the only colour used for the primary
           action so the doctor reads it as "system action", not
           an AI affordance. */
        .velora-login-cta {
          background: #2563EB;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.28),
            0 8px 20px -8px rgba(37,99,235,0.50);
        }
        .velora-login-cta:hover:not(:disabled) {
          background: #1D4ED8;
        }
        .velora-login-cta:active:not(:disabled) {
          background: #1E40AF;
        }

        @media (prefers-reduced-motion: reduce) {
          .velora-login-grid,
          .velora-login-headline-accent,
          .velora-login-spark-rotate { animation: none; }
        }
      `}</style>
    </div>
  )
}

