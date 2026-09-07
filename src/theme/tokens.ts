// src/theme/tokens.ts
// Stage-1 Design Tokens: runtime CSS variable layer on top of zk-tokens.css
//
// This module does NOT remove tokens from S/TH/defaultSettings. It only emits a
// set of CSS custom properties (on :root / [data-theme]) that inline styles in
// App.tsx can reference via var(--zk-...). This keeps every rendered pixel
// identical to the previous version while making the style system auditable.
//
// Static palette (zk-primary, zk-bg, ...) lives in src/zk-tokens.css (imported by
// index.css). The tokens here are the ones that need to react to the active
// per-page palette (T) — shadows, cards, inputs, buttons — and are therefore
// re-computed whenever the theme changes.

export interface ThemeTokensInput {
  /** Accent/primary color used for CTAs, focus rings, and active states. */
  acc: string;
  accText?: string;
  /** Title color for section headings. */
  ttl?: string;
  /** Body text color. */
  txt?: string;
  /** Card background color. */
  card: string;
  /** Input background color. */
  inp: string;
  /** Border color. */
  brd: string;
  /** Muted/secondary text color. */
  mut: string;
  /** Error color. */
  err: string;
  /** Page background. */
  bg: string;
  /** CTA gradient string (already linear-gradient(...)). */
  grad?: string;
  /** Design-id of the active palette (for scoping data-zk-theme selectors). */
  id?: string | number;
  /** Radii / paddings — optional, fall back to the CSS defaults in zk-tokens.css. */
  cardRadius?: number | string;
  cardPadding?: number | string;
  inputRadius?: number | string;
  inputPadding?: number | string;
  btnRadius?: number | string;
  btnPadding?: number | string;
  badgeRadius?: number | string;
}

/**
 * Build a CSS string that sets runtime theme tokens on :root and the active
 * [data-zk-theme="..."] selector. All values fall back to the static tokens in
 * zk-tokens.css so they can be used in components that do not run through App.
 */
export function buildRuntimeThemeVars(T: ThemeTokensInput): string {
  // The legacy code uses hard-coded rgba(0,0,0,…) shadows. We expose them as
  // CSS vars so downstream components can say `box-shadow: var(--zk-shadow-chip)`
  // instead of re-building the string. Values are intentionally byte-identical to
  // the previous `__chipShadow`, `__cardShadow`, etc. literals in App.tsx so the
  // visual output does not change at all.
  return `:root{
  color-scheme: light;
  /* Palette bridge: map the active TH palette onto the static tokens used by
     the rest of the app (zk-tokens.css defines defaults but the per-page
     design can override them here). */
  --zk-pri:${T.acc};
  --zk-pri-text:${T.accText || T.acc};
  --zk-ttl:${T.ttl || 'var(--zk-text)'};
  --zk-text:${T.txt || 'var(--zk-text)'};
  --zk-card:${T.card};
  --zk-inp:${T.inp};
  --zk-br:${T.brd};
  --zk-mut:${T.mut};
  --zk-err:${T.err};
  --zk-bg:${T.bg};
  --zk-grad:${T.grad || `linear-gradient(135deg, ${T.acc}, ${T.acc})`};

  /* Radius/padding overrides for this palette (T.cardRadius etc.). If the
     palette does not set them, the static defaults from zk-tokens.css win. */
  ${cssLength('--zk-radius-card', T.cardRadius, 22)}
  ${cssLength('--zk-radius-input', T.inputRadius, 16)}
  ${cssLength('--zk-radius-btn', T.btnRadius, 16)}
  ${cssLength('--zk-radius-badge', T.badgeRadius, 12)}
  ${cssLength('--zk-space-card', T.cardPadding, 20)}
  ${cssLength('--zk-space-input', T.inputPadding, '14px 16px')}
  ${cssLength('--zk-space-btn', T.btnPadding, '14px 28px')}

  /* Derived shadows — exact same values previously inlined as __chipShadow etc. */
  --zk-shadow-chip: 0 3px 8px rgba(0,0,0,.09), 0 1px 3px rgba(0,0,0,.06), -1px -1px 0 rgba(255,255,255,.6);
  --zk-shadow-chip-active: 0 2px 5px rgba(0,0,0,.06), 0 0 0 2.5px color-mix(in srgb, var(--zk-pri) 35%, transparent), inset 0 1px 2px rgba(255,255,255,.7);
  --zk-shadow-input: 0 3px 8px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05), inset 0 -1px 0 rgba(255,255,255,.5);
  --zk-shadow-input-focus: 0 4px 12px rgba(0,0,0,.10), 0 0 0 3px color-mix(in srgb, var(--zk-pri) 16%, transparent), 0 1px 2px rgba(0,0,0,.04);
  --zk-shadow-card: 0 8px 24px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.05), -1px -1px 0 rgba(255,255,255,.5);
  --zk-shadow-btn: 0 8px 18px rgba(0,0,0,.14), 0 3px 6px rgba(0,0,0,.08), 0 10px 24px color-mix(in srgb, var(--zk-pri) 19%, transparent);

  /* Border helpers (color-mix wrappers) — matches the previous __inpBorder. */
  --zk-border-input: 1px solid color-mix(in srgb, var(--zk-br) 80%, transparent);
  --zk-border-btn-ghost: 1.5px solid color-mix(in srgb, var(--zk-br) 75%, transparent);
  --zk-border-card: 1px solid color-mix(in srgb, var(--zk-br) 70%, transparent);
}`;
}

/** Emit a CSS custom property definition, with an optional fallback used when
 *  the theme does not provide a value. Pass null/undefined to omit entirely. */
function cssLength(name: string, value: unknown, fallback?: number | string): string {
  if (value === undefined || value === null || value === '') {
    return fallback !== undefined ? `${name}:${typeof fallback === 'number' ? `${fallback}px` : fallback};` : '';
  }
  const normalized = typeof value === 'number' ? `${value}px` : String(value);
  return `${name}:${normalized};`;
}

/**
 * Pre-baked S (style) object that reads values back from the CSS variables
 * above. Components that previously spread `S.btn`, `S.inp`, etc. keep
 * working unchanged — but the actual color/shadow/border values are now
 * resolved through CSS variables instead of being inlined per-palette.
 */
export function buildS(lang: 'fa' | 'en') {
  return {
    page: {
      minHeight: '100dvh',
      fontFamily: "var(--zk-font,'Vazirmatn','Tahoma',Arial,sans-serif)",
      direction: lang === 'fa' ? 'rtl' : 'ltr',
      padding:
        'calc(16px + env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) calc(16px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      color: 'var(--zk-text)',
      position: 'relative' as const,
      overflowX: 'hidden' as const,
    },
    card: {
      width: '100%',
      maxWidth: 'min(880px, 100%)',
      background: 'var(--zk-card)',
      border: 'var(--zk-border-card)',
      borderRadius: 'var(--zk-radius-card)',
      padding: 'var(--zk-space-card)',
      boxShadow: 'var(--zk-shadow-card)',
      boxSizing: 'border-box' as const,
      position: 'relative' as const,
      zIndex: 1,
    },
    lbl: {
      display: 'block',
      fontSize: 13,
      color: 'var(--zk-mut)',
      marginBottom: 9,
      fontWeight: 700,
      letterSpacing: '0',
    },
    inp: {
      width: '100%',
      padding: 'var(--zk-space-input)',
      background: 'var(--zk-inp)',
      border: 'var(--zk-border-input)',
      borderRadius: 'var(--zk-radius-input)',
      minHeight: 50,
      color: 'var(--zk-text)',
      fontSize: 16,
      outline: 'none',
      boxSizing: 'border-box' as const,
      fontFamily: 'inherit',
      boxShadow: 'var(--zk-shadow-input)',
      transition: 'box-shadow .22s ease, border-color .22s ease, transform .1s ease',
    },
    ta: {
      width: '100%',
      padding: 'var(--zk-space-input)',
      background: 'var(--zk-inp)',
      border: 'var(--zk-border-input)',
      borderRadius: 'var(--zk-radius-input)',
      color: 'var(--zk-text)',
      fontSize: 16,
      outline: 'none',
      boxSizing: 'border-box' as const,
      minHeight: 120,
      resize: 'vertical' as const,
      fontFamily: 'inherit',
      boxShadow: 'var(--zk-shadow-input)',
      transition: 'box-shadow .22s ease, border-color .22s ease',
    },
    btn: {
      width: '100%',
      minHeight: 52,
      padding: 'var(--zk-space-btn)',
      background: 'var(--zk-grad, linear-gradient(135deg, var(--zk-pri), var(--zk-pri)))',
      border: 0,
      borderRadius: 'var(--zk-radius-btn)',
      color: 'var(--zk-text-inverse,#fff)',
      fontSize: 16,
      fontWeight: 800,
      cursor: 'pointer',
      boxShadow: 'var(--zk-shadow-btn)',
      fontFamily: 'inherit',
      transition: 'all .25s ease',
    },
    btnGhost: {
      width: '100%',
      minHeight: 48,
      padding: '12px 24px',
      background: 'var(--zk-card)',
      border: 'var(--zk-border-btn-ghost)',
      borderRadius: 'var(--zk-radius-btn)',
      color: 'var(--zk-pri-text)',
      fontSize: 14.5,
      fontWeight: 700,
      cursor: 'pointer',
      boxShadow: 'var(--zk-shadow-chip)',
      fontFamily: 'inherit',
      transition: 'all .25s ease',
    },
    chip: 'var(--zk-shadow-chip)',
    chipActive: 'var(--zk-shadow-chip-active)',
    inpFocus: { boxShadow: 'var(--zk-shadow-input-focus)' } as const,
    sec: {
      fontSize: 14.5,
      fontWeight: 800,
      color: 'var(--zk-ttl,var(--zk-text))',
      margin: '20px 0 12px',
      display: 'flex',
      gap: 8,
      alignItems: 'center',
    },
    div: {
      height: 1,
      background: 'linear-gradient(to right,transparent,var(--zk-br),transparent)',
      margin: '18px 0',
    },
  };
}
