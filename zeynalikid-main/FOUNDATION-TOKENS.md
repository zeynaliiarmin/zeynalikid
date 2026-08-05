# Zeynalikid Design Tokens — Stage 1 Foundation

**Brand:** Zeynalikid — Warm, trustworthy, maternal, specialized child growth & nutrition (2-17y)

**Audience:** Parents (especially mothers)

**Palette Principle:**
- Primary: Trust-building Teal/Blue family (#0F766E, #0EA5E9, #134E4B)
- Neutrals: Warm cream & soft off-white (#FDF8F3, #F8F4EF, #EDE9E3)
- Text: Deep slate (#1F2937, #374151, #6B7280)
- Accents: Warm teal + soft green for health (#0EA5E9, #14B8A6)
- Never use purple as primary. Limited legacy purple only for brand consistency if absolutely needed.

## Core Tokens (CSS Variables + JS)

### Colors
```css
--zk-primary: #0F766E;        /* Main brand (teal-deep) */
--zk-primary-hover: #134E4B;
--zk-primary-light: #CCFBF1;
--zk-accent: #0EA5E9;         /* Sky / trust accent */
--zk-accent-light: #E0F2FE;

--zk-bg: #FDF8F3;             /* Warm cream page */
--zk-surface: #FFFFFF;
--zk-surface-muted: #F8F4EF;
--zk-surface-soft: #F1EDE6;

--zk-text: #1F2937;
--zk-text-muted: #4B5563;
--zk-text-subtle: #6B7280;
--zk-text-inverse: #FFFFFF;

--zk-border: #E5E0D8;
--zk-border-strong: #D1C8BB;

--zk-success: #14B8A6;
--zk-warning: #F59E0B;
--zk-error: #DC2626;
```

### Typography
- Font: `Vazirmatn`, Tahoma, system sans
- Scale: 12px / 13px / 14px / 15px / 16px / 18px / 20px / 24px / 28px / 32px
- Weights: 400 / 500 / 600 / 700 / 800
- Mobile: clamp() for hero

### Radius
- pill: 9999px (buttons, pills, chips)
- card: 20px / 24px (xl)
- input: 14px
- badge: 999px

### Shadows (strict 3 levels)
- --shadow-light: 0 4px 15px 0 rgba(15, 23, 42, 0.06)
- --shadow-medium: 0 5px 20px 0 rgba(15, 23, 42, 0.10)
- --shadow-strong: 0 15px 30px 0 rgba(15, 23, 42, 0.18)

### Spacing
Base: 4px grid. Touch target: 48px minimum.

### Breakpoints
320 / 360 / 390 / 480 / 768 / 1024px (mobile-first)

### Animation
- base: 200ms cubic-bezier(0.2, 0, 0, 1)
- fast: 120ms

## Applied to Components
- Hero: Full-bleed image + soft warm gradient overlay (2-stop teal/cream)
- Cards: rounded-2xl + shadow-light
- Buttons: pill (full), 48px min height
- Inputs: rounded-lg + 14px

**No emoji in UI chrome. Only SVG / vector.**

**RTL & LTR fully supported with direction + logical properties.**

---

**Date:** 2026-08-04 (Stage 1)
**Status:** Foundation complete for public pages + form
