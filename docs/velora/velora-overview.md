# Velora — overview

> **Scope:** what Velora is, what it ships, the architectural doctrine, the four intent shapes, and how the homepage is wired end-to-end.
> **Read when:** first encounter with Velora, before opening any other doc in this folder.

## What Velora is

Velora is a focused **clinical-AI chat surface** — a single chat
column where a doctor asks short clinical questions about a
selected patient and gets back structured cards with cited,
hospital-signed answers.

It runs as a standalone homepage (`app/page.tsx`) layered on
top of the shared `dr-agent` chat panel used elsewhere in
TPCare. The "Velora" identity is the *standalone* mode of
`DrAgentPanel`: a different navbar, a hidden chat-input box,
auth gating, and four bespoke V0 cards.

## Stack 1 / Stack 2 doctrine

Velora's clinical content sits in two clearly-separated stacks:

- **Stack 1 — verbatim data.** The cross-consultation brief, the
  patient journey, the trend detail series. Drawn from the
  patient's OMOP-CDM rows (`condition_occurrence`,
  `drug_exposure`, `measurement`, `observation`, `note`). **No AI
  authorship.** Every character on the card is auditable to a
  specific OMOP row.
- **Stack 2 — bounded AI synthesis.** Where AI is allowed to
  apply judgment — but only to pick *which* hospital-signed
  guideline panel applies, rank detector fires, and compose
  one-line collision titles. Never to author panel content. The
  clinical-synthesis card that used to render Stack 2 has been
  removed from the live brief; the doctrine remains because
  the codebase still ships the helpers (`CollideEntryCard`,
  the synthesis-panel renderer) for future re-introduction.

The boundary matters because Velora's pitch is *"private,
cited, you decide"* — Stack 1 must never blend with Stack 2.

## The four intents

A doctor's chat message routes to one of four shapes via
`buildVeloraV0Reply(message)` in `lib/velora/v0-replies.ts`:

| # | Intent | Card kind | What the doctor sees |
|---|---|---|---|
| 1 | Cross-consultation brief | `velora_v0_mdt_brief` | Per-specialty visit summaries grouped by team. Patient header + medical history + filter + per-specialty list. |
| 2 | Patient journey | `velora_v0_patient_journey` | Hospital-timeline view: every visit + MDT meeting in chronological order, with open loops surfaced inline. |
| 3 | Recent trends — menu | `velora_v0_trend_menu` | Inline mini-charts per available metric (BP, SpO₂, HbA1c…). Each chart is clickable → opens detail. |
| 4 | Recent trends — detail | `velora_v0_trend_detail` | Single-metric structured table + reference line + cited guideline footer. |

Each is bounded to whatever the patient *actually has* on file —
no dead-end taps possible.

## Auth gate

`app/page.tsx` runs a tri-state auth flag:

1. **`authed === null`** — pre-hydration; render a dark backdrop
   to avoid a white flash.
2. **`authed === false`** — render `<LoginScreen />`.
3. **`authed === true`** — render `<DrAgentPanel mode="homepage" />`.

The flag is persisted to `localStorage["velora-v0-authed"]` so
refresh keeps the doctor signed in. The login form accepts
`admin / admin@123` (or `demo` / `doctor` as username variants).
Clicking the profile-menu *Logout* clears the flag and returns
to the login screen.

## Homepage chrome (what's different from embedded mode)

When `DrAgentPanel` is rendered with `mode="homepage"`:

- **Full-width sticky navbar** at 42 px (instead of the
  embedded 52 px floating-tags strip): Velora wordmark + Beta
  tag on the left, profile + kebab on the right.
- **Patient context chip** moves to the bottom trust-marker
  row (greyish style, right-aligned) instead of floating below
  the navbar.
- **Suggestion-pill row** above the chat input is hidden — the
  homepage's only entry points are the WelcomeScreen canned
  actions.
- **Chat input box** is hidden via a CSS override
  (`#dr-agent-panel-root .chat-input-border { display: none }`);
  the trust marker line at the bottom remains.
- **Three sticky lanes** are active inside the brief card —
  see [velora-design-tokens.md](./velora-design-tokens.md) for
  the cascade values.

## End-to-end wire-up

```
app/page.tsx
  └─ <LoginScreen onAuthenticated={…} />     (when authed=false)
  └─ <VeloraSyncProvider>                    (when authed=true)
       └─ <DrAgentPanel mode="homepage"
            replyOverride={buildVeloraV0Reply}
            trustMarkerText="…"
            onLogout={…}
          />
```

`DrAgentPanel` handles the chat thread; the `replyOverride`
prop is the seam where Velora intercepts every message and
routes it through `buildVeloraV0Reply` before the legacy
RxPad reply engine sees it.

## What lives where

- `app/page.tsx` — entry + auth gate.
- `app/layout.tsx` — Playfair Display + Inter + Mulish fonts.
- `components/velora/` — login-screen chrome (LoginScreen + AnimatedGrid).
- `components/tp-rxpad/dr-agent/cards/velora-v0/` — the four V0 cards.
- `lib/velora/` — reply engine, trend registry, follow-up registry, guideline catalogue, sync context.
- `docs/velora-patients/` — the six per-patient OMOP mocks (P1-P6).
- `docs/velora-v0-recent-trends.md` — trend-registry rationale.
- `docs/velora/` (this folder) — design-system + architectural docs.

## Related docs

- [velora-architecture.md](./velora-architecture.md) — exact file tree + boundaries.
- [velora-chrome-catalog.md](./velora-chrome-catalog.md) — chrome components.
- [velora-cards-catalog.md](./velora-cards-catalog.md) — V0 cards.
- [velora-data-layer.md](./velora-data-layer.md) — `lib/velora/` reference.
- [velora-design-tokens.md](./velora-design-tokens.md) — visual constants.
