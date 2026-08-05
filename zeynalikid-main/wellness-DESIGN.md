---
version: alpha
name: Wellness
description: Warm, confident, transformational personal-growth brand. Purple does the heavy lifting; cool-grey neutrals; Google Sans only; pill buttons and rounded surfaces but square full-bleed media; three shadows; no emoji in product chrome.
colors:
  # Brand (purple)
  brand: "#7A12D4"            # primary CTAs, links, focused state
  brand-bright: "#9B37F2"     # accents, highlights, focus ring
  brand-content: "#680FB4"    # AA-compliant purple text on white
  brand-dark: "#4F0C8A"       # dark hero backgrounds
  brand-light: "#F8EFFF"      # soft fills, hover/badge backgrounds
  brand-border: "#EED8FE"     # hairline borders on light surfaces
  # Support (semantic signals only — not decorative)
  blue: "#005CFF"             # trust, info
  blue-content: "#1C3BD4"
  blue-dark: "#1832B4"
  blue-light: "#EBF5FF"
  green: "#159F65"            # success, growth, progress complete
  green-content: "#128756"
  green-light: "#E8F9F1"
  orange: "#ED6325"           # sales, urgency, countdown
  orange-content: "#C9541F"
  orange-light: "#FFF4E9"
  pink: "#DF1A6F"             # love, community, hearts
  pink-light: "#FEEAF3"
  red: "#F34747"              # destructive, errors only
  # Neutral (cool grey — slightly blue, never warm)
  grey-100: "#F9F9F9"
  grey-200: "#F3F4F6"
  grey-300: "#CED1D7"
  grey-400: "#979CA5"
  grey-500: "#595E67"
  grey-600: "#292D38"
  ink: "#0F131A"
  white: "#FFFFFF"
  # Semantic aliases (light mode default)
  bg: "#FFFFFF"
  bg-muted: "#F9F9F9"
  bg-subtle: "#F3F4F6"
  surface: "#FFFFFF"
  text: "#0F131A"
  text-muted: "#595E67"
  text-subtle: "#71767F"
  text-disabled: "#B3B8C1"
  text-inverse: "#FFFFFF"
  link: "#7A12D4"
  border: "#DFE1E5"
  border-strong: "#CED1D7"
  border-muted: "#F3F4F6"
  focus-ring: "#9B37F2"
  # Immersive dark surface (player / hero / onboarding only)
  dark-bg: "#0F131A"
  dark-bg-muted: "#181D26"
  dark-bg-subtle: "#292D38"
  dark-text: "#FFFFFF"
  dark-text-muted: "#B3B8C1"
typography:
  display-1: { fontFamily: "Google Sans", fontSize: 96px, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em" }
  display-2: { fontFamily: "Google Sans", fontSize: 60px, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em" }
  title-1:   { fontFamily: "Google Sans", fontSize: 60px, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.02em" }
  title-2:   { fontFamily: "Google Sans", fontSize: 48px, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.02em" }
  title-3:   { fontFamily: "Google Sans", fontSize: 40px, fontWeight: 700, lineHeight: 1.2 }
  title-4:   { fontFamily: "Google Sans", fontSize: 32px, fontWeight: 700, lineHeight: 1.2 }
  title-5:   { fontFamily: "Google Sans", fontSize: 24px, fontWeight: 500, lineHeight: 1.3 }
  title-6:   { fontFamily: "Google Sans", fontSize: 20px, fontWeight: 500, lineHeight: 1.3 }
  title-7:   { fontFamily: "Google Sans", fontSize: 16px, fontWeight: 500, lineHeight: 1.3 }
  title-8:   { fontFamily: "Google Sans", fontSize: 14px, fontWeight: 500, lineHeight: 1.3 }
  body-lg:   { fontFamily: "Google Sans", fontSize: 22px, fontWeight: 400, lineHeight: 1.6 }
  body-md:   { fontFamily: "Google Sans", fontSize: 16px, fontWeight: 400, lineHeight: 1.5 }
  body-sm:   { fontFamily: "Google Sans", fontSize: 14px, fontWeight: 400, lineHeight: 1.5 }
  body-xs:   { fontFamily: "Google Sans", fontSize: 12px, fontWeight: 400, lineHeight: 1.5 }
  overline:  { fontFamily: "Google Sans", fontSize: 14px, fontWeight: 700, lineHeight: 1.0, letterSpacing: "0.08em" }
rounded:
  none: 0          # full-bleed media (hero, video, image tiles)
  xs: 4px          # tiny tokens
  sm: 8px          # inputs, selects, small chips
  md: 16px         # cards, modals
  lg: 24px         # large surfaces
  full: 128px      # buttons, tags, pills, avatars
spacing:
  # 4px base grid (token name = Wellness scale step)
  "3": 4px
  "4": 6px
  "5": 8px
  "6": 12px
  "7": 16px
  "8": 20px
  "9": 24px
  "10": 28px
  "11": 32px
  "12": 36px
  "13": 40px
  "14": 48px
  "15": 56px
  "16": 64px
  "17": 80px
  "18": 96px
  "19": 112px
  "20": 128px
  section-sm: 64px      # dense lists (desktop)
  section-md: 80px      # product (desktop)
  section-lg: 128px     # marketing (desktop)
  container: 1280px
  container-wide: 1440px
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.white}"
    rounded: "{rounded.full}"
    padding: "14px 28px"
    typography: "{typography.title-8}"
  button-primary-hover:
    backgroundColor: "{colors.brand-content}"
  button-primary-active:
    backgroundColor: "{colors.brand-content}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
    padding: "14px 28px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.brand}"
    rounded: "{rounded.full}"
    padding: "14px 28px"
  button-inverse:
    backgroundColor: "{colors.white}"
    textColor: "{colors.brand-dark}"
    rounded: "{rounded.full}"
    padding: "14px 28px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "14px 16px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "24px"
  course-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
  badge:
    backgroundColor: "{colors.brand-light}"
    textColor: "{colors.brand-content}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    typography: "{typography.body-xs}"
  avatar:
    backgroundColor: "{colors.brand-light}"
    textColor: "{colors.brand-content}"
    rounded: "{rounded.full}"
    size: 40px
  progress:
    backgroundColor: "{colors.grey-200}"
    rounded: "{rounded.full}"
    height: 4px
  topbar:
    backgroundColor: "{colors.white}"
    height: 64px
---

## Overview

Warm, confident, transformational. Write and design like a thoughtful coach, not an
institution. Every screen should look like Wellness without anyone having to ask.

**The six non-negotiables** (these outrank everything below):

1. **Typeface is Google Sans** — weights 400 / 500 / 700. No Inter, Roboto, Arial,
   system-ui, serifs, or alternates.
2. **Purple `{colors.brand}` is the brand** — primary CTAs, links, active states, brand
   moments. Never invent new purples; use the five brand stops.
3. **Cool grey only** — neutrals are slightly blue. No warm greys, no pure `#000`, no
   Tailwind `slate-*` / `gray-*`.
4. **Pill buttons, rounded surfaces, square media** — buttons `{rounded.full}`; cards/modals
   `{rounded.md}`/`{rounded.lg}`; inputs `{rounded.sm}`; full-bleed media `{rounded.none}`.
5. **Three shadows only** — light, medium, strong (see Elevation & Depth).
6. **No emoji in product chrome** — emoji belong only to user-generated content.

### Voice & tone

- **Do** lead with the human outcome ("In 30 days you'll meditate without effort").
- **Do** be specific ("21 days", "your lead instructor", "11pm Pacific").
- **Don't** use hype words: *revolutionary*, *world-class*, *game-changing*, *unlock your
  potential*.
- **Don't** use AI clichés: *delve*, *journey*, *empower*, *seamless*, *elevate*.
- Headlines are **sentence case** unless they're a wordmark.
- Microcopy is short and active: "Start", not "Get started now"; "Join Tribe", not
  "Become a member of our community".

### Imagery

- **Photography over illustration** — real teachers, real members, real moments; looking
  into camera is fine.
- Gradients are for abstract backdrops only, **two stops** (see Colors).
- **No** stock vector art, generic AI imagery, isometric illustration, or 3D blobs.
- Full-bleed media is square (`{rounded.none}`); photo tiles inside grids use `{rounded.md}`.

### Logo

- **Wordmark** ("Wellness") for site chrome, emails, marketing — 22–32px tall in chrome,
  up to 200px in a marketing hero.
- **Wing mark** (compact glyph) for favicons, the app icon, avatar placeholders, tight
  headers.
- Logo SVGs use `currentColor`; set color on a parent. Clearspace = the height of the wing
  glyph.
- **Never** stretch, recolor outside the palette, place on low-contrast backgrounds, or
  render as a gradient.

## Colors

Brand purple does the heavy lifting. Support colors are **semantic signals** — use them
for their meaning (green = success), never decoratively.

- **Brand** — `{colors.brand}` for primary CTAs/links/focus; `{colors.brand-bright}` for
  accents and the focus ring; `{colors.brand-content}` for AA-compliant purple text on
  white; `{colors.brand-dark}` for dark hero backgrounds; `{colors.brand-light}` for soft
  fills, hover/badge backgrounds; `{colors.brand-border}` for hairlines.
- **Support** — Blue = trust/info, Green = success/progress complete, Orange =
  sales/urgency/countdown, Pink = love/community, Red = destructive/errors only. Each has a
  solid, a `-content` text shade, and a `-light` fill.
- **Neutral (cool grey)** — `{colors.grey-100}`/`{colors.grey-200}` for backgrounds,
  `{colors.grey-300}` for borders, `{colors.grey-400}` for disabled, `{colors.grey-500}`
  for muted text, `{colors.grey-600}`/`{colors.ink}` for ink and dark surfaces.

### Dark surface

Not a full dark mode — reserved for **immersive contexts** (meditation/video player,
marketing hero, onboarding). Toggle with `data-mv-theme="dark"` on a container; it remaps
`bg`/`surface`/`text` to the `dark-*` tokens.

### Canonical gradients

Only these two — no three-stop gradients, no generated meshes:

- **Sunset** (marketing hero, energy): `linear-gradient(135deg, {colors.brand-dark} 0%, {colors.pink} 100%)`
- **Dusk** (meditation, calm): `linear-gradient(135deg, {colors.brand-dark} 0%, {colors.blue-dark} 100%)`

## Typography

One typeface (**Google Sans**), three weights, a clear scale.

- **400 Regular** — body copy. **500 Medium** — UI labels, buttons, card titles, nav.
  **700 Bold** — display and page/section titles.
- Display and titles 1–4 get **tight tracking** (`-0.02em`); never add tracking to body.
- **Sentence case** for headlines and buttons — not Title Case.
- `overline` = uppercase + wide tracking + purple, used sparingly (one per section).
- Long-form body uses `body-lg` (22px) at line-height 1.6.

**Mobile (≤768px)** scales the large end down: `display-1` 64px, `display-2` 48px,
`title-1` 36px, `title-2` 32px, `title-3` 28px, `title-4` 26px, `title-5` 22px,
`title-6` 18px.

## Layout

4px base grid; stick to the named `spacing` scale.

- **Section gutters** (between page sections): desktop large **128px** (marketing), medium
  **80px** (product), small **64px** (dense lists). Halve each on mobile (64 / 48 / 32).
- **Container** max-width 1280px (`container`), wide variant 1440px.
- **Page gutter** 24px desktop / 16px mobile.
- **Side padding** — product 64–80px; marketing 96–128px.

### Density

- **Product UI is dense** — 16px body, 24px card padding, tight rows. More info on screen.
- **Marketing is spacious** — 22px+ body, 80–128px section gutters, full-bleed photography.
- Don't apply 128px marketing gutters to a settings page.

## Elevation & Depth

Three elevations — no others.

- `shadow-light` `0 4px 15px 0 rgba(0,0,0,0.05)` — resting cards
- `shadow-medium` `0 5px 20px 0 rgba(0,0,0,0.10)` — hover, interactive
- `shadow-strong` `0 15px 30px 0 rgba(0,0,0,0.20)` — modals, dropdowns, elevated hover
- `shadow-focus` `0 0 0 4px rgba(155,55,242,0.35)` — focus ring (`{colors.brand-bright}` @ 35%)

On dark surfaces the same tokens darken (0.45 / 0.55 / 0.65 alpha). Anything else —
including Tailwind `shadow-xl` — is wrong.

### Motion

- Durations: fast 120ms (hover/focus), base 200ms (most transitions), slow 320ms (card
  lifts, drawer/modal enters).
- Easing: standard `cubic-bezier(0.2,0,0,1)`, enter `cubic-bezier(0,0,0,1)`, exit
  `cubic-bezier(0.4,0,1,1)`.
- Interactive cards lift `translateY(-2px)` (shadow light → strong). Buttons press
  `translateY(1px)` on active. Image-cards zoom `scale(1.04)` on hover.

## Shapes

The pill is the brand's strongest shape signal — use it.

- Buttons, tags, pills, avatars → `{rounded.full}` (128px, full pill).
- Cards, modals, large surfaces → `{rounded.md}` (16px) or `{rounded.lg}` (24px).
- Inputs, selects, small chips → `{rounded.sm}` (8px).
- Tiny tokens → `{rounded.xs}` (4px).
- Full-bleed media (hero, video, image tiles) → `{rounded.none}` (0).

Don't round cards at 4px. Don't round buttons at 8px. Don't round hero images.

## Components

Class convention: `mv-` prefix, class-based, no scoped CSS. Reach for the simplest pattern
first — cards before custom layouts.

- **Button** — always a pill. Primary = purple/white; Secondary = white with
  `{colors.border-strong}`; Ghost = transparent with purple text; Inverse = white pill with
  `{colors.brand-dark}` text (on dark bg). Padding default `14px 28px` (sm `10px 18px`, lg
  `18px 36px`). Focus shows the focus ring; active presses `translateY(1px)`.
- **Input** — `{rounded.sm}`, `{colors.border-strong}` border, `14px 16px` padding. On
  focus the border becomes `{colors.brand}` with the focus ring.
- **Card** — `{rounded.md}`, 24px padding, `shadow-light` resting; interactive cards lift to
  `shadow-strong` + `translateY(-2px)`. **Never nest a bordered card inside a bordered card.**
- **Course card** (canonical product card) — 16:9, `{rounded.md}`, image fills with a
  bottom→top dark gradient overlay, title + meta at the bottom; hover zooms image
  `scale(1.04)`.
- **Badge** — pill, 12px text, `4px 10px` padding; background `*-light`, text `*-content`.
- **Avatar** — 40×40 circle; falls back to initials on `{colors.brand-light}`.
- **Progress** — 4px tall, `{colors.grey-200}` track, `{colors.brand}` bar.
- **Top bar** — 64px tall, white bg, hairline bottom border; active link gets purple text +
  a 2px purple underline.

### Iconography

- **24×24 grid, 2px stroke, rounded joins/caps, no fill** unless solid by nature
  (Feather-style). Icons inherit `currentColor` — set color on the parent.
- Don't mix outline and solid styles in one view. No emoji in product chrome.

## Do's and Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| Google Sans only | Inter, Roboto, system-ui directly, serifs |
| `{colors.brand}` for primary | Invent new purples (no Tailwind `purple-600`) |
| Cool grey neutrals | Warm grey, pure black `#000`, Tailwind `slate` |
| Pill buttons (`{rounded.full}`) | 8px rounded buttons |
| `{rounded.md}`/`{rounded.lg}` cards | 4px rounded cards |
| Square full-bleed media | Rounded hero images |
| Three shadow tokens | Tailwind `shadow-xl`, custom `box-shadow` |
| Sentence case headlines | Title Case Everywhere |
| Photography of real people | Stock vector, 3D blobs, AI imagery |
| 2-stop gradients (sunset / dusk) | 3+ stop or mesh gradients |
| Emoji only in user-generated content | Emoji in nav, buttons, headings |
| Nest content in cards | Nest a bordered card inside a bordered card |
| Use overlines sparingly (1 per section) | Stack multiple eyebrows |
| Semantic colors for their meaning (green = success) | A color just because it looks nice |

**When in doubt:** use the closest existing token rather than a "near enough" arbitrary
value; if no token fits, you probably don't need it — compose with what's here. Dense
product UI is not marketing.