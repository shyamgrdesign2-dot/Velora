# Velora — design tokens

> **Scope:** every numeric / color / motion constant the Velora surface relies on. AI palette, navbar dimensions, sticky cascade, type ramp, the trust-marker copy contract.
> **Read when:** picking a colour or size before building, or auditing a Velora component for token compliance.

Velora reuses the broader TPCare `--tp-*` token system; this doc
catalogues only the **Velora-specific additions** + the
constants Velora hard-codes (e.g. the sticky-cascade `top:`
values, the AI conic-gradient stops).

## AI gradient palette

The "Velora AI" gradient family is used for the wordmark in the
login headline, the AI-pill text fill, the trend mini-card
stroke gradient, the welcome-card icon fill, and the chat-bubble
"sparkle" iconography. All five share the same stops:

```
#E38BBE   pink
#B06CE0   light violet
#8B5CF6   violet (Tailwind violet-500)
#6B5FE0   indigo-violet
#4B4AD5   deep indigo
#4FACFE   blue
```

Used in two forms:

- **Conic** (animated wash, behind the chat panel + behind the
  Velora icon tile) — 22-second rotation.
- **Linear** (`linear-gradient(135deg, ...)`) — static pill
  fills, text gradients via `-webkit-background-clip: text`.

The **login backdrop** uses a different family — the
`chat-bg.gif` (the GIF that lives behind the chat welcome icon)
at `opacity: 0.06`, scaled `2.4×`, blurred `160 px`. So it reads
as a slow ambient drift, not a saturated gradient.

The **animated grid** strokes are painted in `#C4B5FD` (Tailwind
violet-300, via `currentColor` on the wrapper). Comet pulses are
hardcoded to a "shiny passing light" gradient:

```
0      #A78BFA  α=0      (transparent tail)
0.55   #C4B5FD  α=0.45   (soft lavender)
0.85   #E0E7FF  α=0.90   (near-white head)
1.00   #FFFFFF  α=1.00   (white highlight tip)
```

## Navbar dimensions

| Mode | Height | Padding-x |
|---|---|---|
| Homepage standalone | **42 px** | `px-[14px]` |
| Embedded sidebar | 52 px | `px-[14px]` |

Both modes use the `.da-agent-navbar` class for the white-glass
fill (homepage only):

```css
background: rgba(255,255,255,0.78);
backdrop-filter: blur(14px) saturate(140%);
border-bottom: 1px solid rgba(15,23,42,0.06);
```

No violet tint, no inset highlights — neutral surface.

## Sticky cascade (homepage only)

Set on the `da-chat-scroll` container in `DrAgentPanel.tsx`:

```css
--velora-card-sticky-top:               0px;   /* z-31 — above navbar */
--velora-specialty-sticky-top:         50px;   /* z-5 */
--velora-specialty-heading-sticky-top: 92px;   /* z-3 */
```

| Lane | Element | top | z-index | Background |
|---|---|---|---|---|
| 1 | CardShell title (`Cross-consultation brief`) | 0 | 31 (above navbar) | white-wash (94→88%) + violet wash |
| 2 | Medical history bar + Filter band | 50 | 5 | `bg-white` (solid) + backdrop-blur |
| 3 | Specialty headings (`Oncology`, …) | 92 | 3 | `bg-tp-slate-100` (solid) + backdrop-blur |

**Why z-31 on the card title.** With the title pinned at viewport
`y=0` and the navbar also at `y=0`, one has to win — bumping the
title above the navbar makes the title visually **replace** the
navbar while you're scrolled through the card. When you scroll
back up past the card, the title releases and the navbar
returns.

**Why the filter is on lane 2 with z-5.** It needs to layer on
top of the specialty headings (z-3) so when the doctor scrolls
into the per-specialty list, the filter stays visible at lane 2
and each specialty heading takes over lane 3 in turn.

**Why each card-internal sticky has `position: sticky` and not
`fixed`.** Because each lane is bounded by its element's parent
in the DOM — Medical history is sticky only within the medical-
history div, the filter is sticky only within the card body
(which is the entire card), specialty headings only within
their specialty wrapper. As you scroll past each parent, the
sticky element releases naturally.

**Important caveat for the SpecialtyHeading.** Its parent
wrapper used to be an extra anchor div that collapsed to the
heading's own height — sticky had zero range. Fixed in
`e39af78` by setting `display: contents` on that wrapper so the
heading's containing block walks up to the specialty wrapper
(heading + body) and the sticky has the whole specialty's
height to slide over.

## Welcome-screen breakpoint

```
< 300 px viewport  →  grid-cols-1 (vertical stack)
≥ 300 px viewport  →  grid-cols-2 (2×2)
```

Uses Tailwind arbitrary breakpoint `min-[300px]:grid-cols-2`.

## Type ramp (Velora-specific)

Inherits the broader 14 / 12 / 10 rule:

| Use | Size | Notes |
|---|---|---|
| Body copy inside visit body / discharge | **14 px** `leading-[1.65]` | The verbatim Stack 1 text. |
| Subtext (subtitle, meta, empty placeholders) | **12 px** `leading-1.5–1.6` | |
| Tag chips (IPD, ADVICE chip, kicker labels) | **10 px** floor | Don't go below 10. |
| CardShell title | 14 px semibold | |
| CardShell subtitle | 12 px `mt-[1px]` | Tight gap so the pair reads as one header. |
| Trust-marker line | 10.5 px `text-tp-slate-300` | Quietest line on the page. |
| Velora wordmark in navbar | 15 px semibold | Letter-spacing `0.1px`. |
| Login headline (Playfair) | 36 px `font-bold` | `font-family: var(--font-display)`. |

## Trust-marker copy contract

The line at the bottom of every Velora chat surface. Default
shipped by the homepage:

> **`Your data is safe with Velora · End-to-end private`**

This replaces the earlier `ADA · WHO HTN · NICE NG56 · Private,
cited, you decide` because Velora's footer doesn't name
specific guideline bodies independent of the per-card citations
(those still appear on individual cards).

## CTA palette (login screen)

```
default:  #2563EB   blue-600
hover:    #1D4ED8   blue-700
active:   #1E40AF   blue-800
```

Solid blue, no gradient. Per the design call: violet stays for
the brand wordmark accent ("Velora" in the headline); blue is
the only colour used for system actions.

## Auth localStorage keys

```
velora-v0-authed:            "1" when authenticated
velora-v0-guideline-settings: { [specialty]: string[] } admin selection
```

## Reduced motion

All Velora animations honour `prefers-reduced-motion: reduce`:

- Login wash conic rotation — disabled.
- Animated grid drift + spark rotation — disabled.
- Headline gradient background-position shift — disabled.
- Chat-panel `.da-gradient-wash` 22-second conic rotation — disabled.

## Forbidden patterns

- Hard-coded hex outside of these declared palettes. Use `var(--tp-*)`
  or the documented Velora gradients.
- New colour tokens outside this doc. If you need a new tone,
  add it to the relevant `--tp-*` palette (or `--velora-*` if
  Velora-specific) and document it here.
- New sticky offsets outside the cascade. If you add a sticky
  element, register a `--velora-*-sticky-top` var on the
  chat-scroll container and document it.

## Related docs

- [velora-overview.md](./velora-overview.md) — Stack 1 / Stack 2 doctrine + intent map.
- [velora-chrome-catalog.md](./velora-chrome-catalog.md) — where each token is used.
- [velora-architecture.md](./velora-architecture.md) — file boundaries.
