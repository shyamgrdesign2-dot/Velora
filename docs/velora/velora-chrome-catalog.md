# Velora — chrome catalogue

> **Scope:** every chrome component the Velora homepage renders OUTSIDE the V0 cards. Login flow, navbar, trust marker, sticky cascade, welcome screen.
> **Read when:** changing the surrounding chrome (not the cards themselves) or auditing a chrome component.

## `components/velora/LoginScreen.tsx`

Sign-in card + animated AI backdrop.

**Props**

```ts
{ onAuthenticated: () => void }
```

**Composition (top → bottom)**

1. **Layer 1 — AI wash.** `/icons/dr-agent/chat-bg.gif` at `opacity: 0.06`, scaled `2.4×`, blurred `160px`. Same asset used behind the Velora sparkle in the chat welcome card; here it's the page backdrop.
2. **Layer 2 — Animated grid.** `<AnimatedGrid />` at `88vmin`, opacity 0.95, painted in lavender (`#C4B5FD`) via `currentColor`.
3. **Layer 3 — Radial vignette.** Soft white fade at the corners (`0 → 0.12 → 0.38 → 0.55`).
4. **Layer 4 — Card.** Liquid-glass: `rounded-[32px]`, `backdrop-blur(28px) saturate(140%)`, translucent white. Contents:
   - **Velora sparkle** at 56×56 (same composition as the chat welcome icon — white tile + chat-bg.gif underlay + rotating spark @ 16 s linear).
   - **Headline** — `Sign in to Velora` in Playfair Display. The word "Velora" uses an animated background-position gradient (9 s ease-in-out) for a "living wordmark".
   - **Username / Password fields** — focus ring `tp-blue-500 / tp-blue-100`.
   - **Get started CTA** — solid blue (`#2563EB`, hover `#1D4ED8`, active `#1E40AF`).
   - **Footer** — `New here? Contact your hospital.`

**Dummy auth.** Accepts `(admin | demo | doctor) / admin@123`. Google SSO removed in an earlier pass.

**Reduced-motion.** `prefers-reduced-motion: reduce` disables the grid drift, spark rotation, and headline-gradient animation.

---

## `components/velora/AnimatedGrid.tsx`

Pure-SVG geometric grid with comet pulses traveling along each lane (horizontal / vertical / `/` / `\`). Self-contained: a fixed `EDGES[]` array inside a `0 0 2500 2500` viewBox + a per-lane `<animateMotion>` on a comet rectangle clipped to the lane's actual line segments.

**Props**

```ts
{ className?: string }
```

`stroke="currentColor"` — the host wraps it with a `text-*` class to pick the line colour. The comet gradient is hardcoded (`#A78BFA → #E0E7FF → #FFFFFF`) for the "shiny passing light" effect.

**Tuning knobs** (constants at the top of the file):

| Constant | Default | Effect |
|---|---|---|
| `SPEED` | 1050 u/s | Comet velocity (constant across all lanes). |
| `CYCLE` | 3.0 s | Active travel + idle pause per loop. |
| `COMET_LEN` | 200 u | Comet length (tail). |
| `COMET_T` | 4 u | Comet thickness. |
| `LINE_T` | 3.5 u | Base-line stroke width. |
| `CLIP_T` | 5 u | Per-lane clip path thickness. |

---

## Homepage navbar — `components/tp-rxpad/dr-agent/shell/AgentHeader.tsx`

Mode-aware: renders differently when `mode === "homepage"` vs the embedded sidebar default.

### Homepage mode

- **Height** — 42 px.
- **Background** — translucent white (`.da-agent-navbar` class) with `backdrop-filter: blur(14px) saturate(140%)` and a 1px `rgba(15,23,42,0.06)` bottom hairline. No violet tint, no inset highlights — neutral surface.
- **Left** — Velora sparkle (26×26) + "Velora" wordmark (15 px) + Beta tag (orange gradient, 10 px).
- **Right** — circular profile button (neutral slate, 30×30) + vertical kebab (shared three-dots SVG, no background). Profile dropdown opens identity + `Logout`; kebab opens `Settings · Start new chat session · Chat session history`.
- **z-index 30** — content scrolls behind.

### Embedded mode

- 52 px transparent floating-tags strip. Same Velora chip + Guidelines admin chip + minimize button as before the Velora work. Not relevant to the standalone surface.

---

## Trust marker — bottom row of `components/tp-rxpad/dr-agent/chat/ChatInput.tsx`

Single flex-between row pinned at the bottom of the chat column.

- **Left** — shield icon (`SecuritySafe`, 16 px) + the trust phrase (`text-[10.5px] truncate text-tp-slate-300`). Default text passed by the homepage: `"Your data is safe with Velora · End-to-end private"`.
- **Right** — patient context chip (greyish `bg-tp-slate-100`, person icon + name + `(F, 76y)` + caret). Only renders when `patientName + onPatientClick` props are wired and not locked — i.e. homepage mode. Click opens the patient selector sheet.

The input box itself is hidden on the homepage via the
CSS override `#dr-agent-panel-root .chat-input-border { display: none }`.

---

## Welcome screen — `components/tp-rxpad/dr-agent/chat/WelcomeScreen.tsx`

Empty-state for the chat column. Surfaces four canned actions
the doctor can tap.

- **Layout** — `grid-cols-1` below 300 px, `min-[300px]:grid-cols-2`
  above. Each card is a horizontal row (icon left, title +
  subtitle stack right) with `min-w-0 flex-1` on the text column
  so long subtitles wrap naturally instead of truncating.
- **Animated Velora sparkle** at 36 × 36 at the top — same
  composition as the LoginScreen icon, smaller.
- **Greeting** — `Good morning, Dr.` + patient name.
- **Quick-action cards** — Cross-consultation brief · Patient
  journey · Recent vital trends · Recent lab trends. Tapping
  fires the corresponding canned question.

---

## Sticky cascade (homepage only)

Three sticky lanes are wired via CSS custom properties set on
the chat-scroll container in `DrAgentPanel.tsx`:

```css
--velora-card-sticky-top:             0px;   /* CardShell title — z-31 */
--velora-specialty-sticky-top:       50px;   /* Medical history + Filter — z-5 */
--velora-specialty-heading-sticky-top: 92px; /* Specialty headings — z-3 */
```

The **card title** is bumped above the navbar's `z-30` so when
scrolled, the title visually replaces the navbar at the top of
the page (instead of hiding behind it). See
[velora-design-tokens.md](./velora-design-tokens.md) for the
full cascade rationale.

---

## CSS overrides shipped from `app/page.tsx`

```css
/* Hide the agent's "Minimize agent" tag — nothing to collapse to. */
#dr-agent-panel-root .da-agent-collapse-tag { display: none !important; }

/* Hide the chat-input box (textarea + send + voice). The sticky
   bottom container that holds it stays visible because it also
   carries the trust-marker line. */
#dr-agent-panel-root .chat-input-border { display: none !important; }
```

These are the only place the homepage reaches into
`dr-agent` internals via CSS — everything else is driven by
props.

## Related docs

- [velora-cards-catalog.md](./velora-cards-catalog.md) — the V0 cards.
- [velora-design-tokens.md](./velora-design-tokens.md) — the cascade values + AI palette.
