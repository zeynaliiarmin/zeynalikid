/**
 * Design Tokens — Complete Design System for Zeynalikid
 *
 * Classic    → تم‌های ترکیبی قدیمی (نئومورفیسم + مینیمال + ممفیس)
 * Wellness   → Public pages (Home, Courses, Experience, Licenses, About, Contact)
 * KidLearn   → Education & Training pages
 * NavyStack  → Admin Panel
 *
 * Font: Vazirmatn (400, 500, 700) — replaces Google Sans / Fredoka / Nunito / system-sans
 * All designs share the brand purple (#7A12D4) for unified brand identity.
 */

// ═══════════════════════════════════════════════════════════
// CLASSIC THEMES (تم‌های ترکیبی قدیمی)
// ═══════════════════════════════════════════════════════════

export const classicThemes = {
  light: {
    bg: '#eaf1f7',
    card: '#fff',
    brd: 'rgba(35,100,165,.16)',
    acc: '#2564a8',
    soft: 'rgba(35,100,165,.09)',
    grad: 'linear-gradient(135deg,#1a4f8a,#2578c8)',
    txt: '#162435',
    mut: '#5a7282',
    ttl: '#2564a8',
    inp: '#f4f8fc',
    sel: '#eaf1f7',
    pop: '#fff',
    err: '#dc2626',
    ok: '#059669',
    warn: '#ca8a04',
    badge: '#f0f5fb',
    hdr: 'rgba(234,241,247,.96)',
    neuOut: '6px 6px 12px rgba(35,100,165,.14),-6px -6px 12px rgba(255,255,255,.75)',
    neuIn: 'inset 3px 3px 7px rgba(35,100,165,.12),inset -3px -3px 7px rgba(255,255,255,.7)',
    memphis: ['#bfdbfe','#93c5fd','#dbeafe'],
  },
  cream: {
    bg: 'linear-gradient(155deg,#fdf6ee,#f4e4d0)',
    card: '#fff',
    brd: 'rgba(175,108,45,.18)',
    acc: '#9c5820',
    soft: 'rgba(156,88,32,.09)',
    grad: 'linear-gradient(135deg,#7a4015,#c87028)',
    txt: '#3a1e0a',
    mut: '#8a5832',
    ttl: '#9c5820',
    inp: '#fdf8f0',
    sel: '#fdf6ee',
    pop: '#fffaf3',
    err: '#dc2626',
    ok: '#059669',
    warn: '#ca8a04',
    badge: '#f5eade',
    hdr: 'rgba(253,246,238,.96)',
    neuOut: '6px 6px 12px rgba(156,88,32,.14),-6px -6px 12px rgba(255,255,255,.75)',
    neuIn: 'inset 3px 3px 7px rgba(156,88,32,.12),inset -3px -3px 7px rgba(255,255,255,.7)',
    memphis: ['#f4e4d0','#eecfa3','#fbe8cf'],
  },
  ocean: {
    bg: 'linear-gradient(135deg,#0f2027,#1a3a4a,#0f2027)',
    card: 'rgba(255,255,255,.045)',
    brd: 'rgba(0,201,255,.18)',
    acc: '#00c9ff',
    soft: 'rgba(0,201,255,.12)',
    grad: 'linear-gradient(135deg,#0077b6,#00c9ff)',
    txt: '#e8f4f8',
    mut: '#7ecfe8',
    ttl: '#2ac9f5',
    inp: 'rgba(255,255,255,.07)',
    sel: '#102638',
    pop: '#0f2535',
    err: '#f87171',
    ok: '#6ee7b7',
    warn: '#facc15',
    badge: 'rgba(255,255,255,.045)',
    hdr: 'rgba(10,28,42,.94)',
    neuOut: '6px 6px 14px rgba(0,0,0,.35),-6px -6px 14px rgba(255,255,255,.04)',
    neuIn: 'inset 3px 3px 7px rgba(0,0,0,.3),inset -3px -3px 7px rgba(255,255,255,.03)',
    memphis: ['#0e3a4a','#124a5e','#0a2c38'],
  },
  dark: {
    bg: '#0d0d0d',
    card: 'rgba(255,255,255,.055)',
    brd: 'rgba(129,140,248,.22)',
    acc: '#818cf8',
    soft: 'rgba(99,102,241,.11)',
    grad: 'linear-gradient(135deg,#4f46e5,#818cf8)',
    txt: '#f1f5f9',
    mut: '#94a3b8',
    ttl: '#a5b4fc',
    inp: 'rgba(255,255,255,.065)',
    sel: '#111',
    pop: '#111827',
    err: '#f87171',
    ok: '#34d399',
    warn: '#facc15',
    badge: 'rgba(255,255,255,.045)',
    hdr: 'rgba(8,8,8,.96)',
    neuOut: '6px 6px 14px rgba(0,0,0,.5),-6px -6px 14px rgba(255,255,255,.03)',
    neuIn: 'inset 3px 3px 7px rgba(0,0,0,.45),inset -3px -3px 7px rgba(255,255,255,.02)',
    memphis: ['#1e1b3a','#241f4a','#171430'],
  },
};

// ═══════════════════════════════════════════════════════════
// WELLNESS TOKENS (از wellness-DESIGN.md)
// ═══════════════════════════════════════════════════════════

export const wellnessTokens = {
  colors: {
    brand: '#7A12D4',
    brandBright: '#9B37F2',
    brandContent: '#680FB4',
    brandDark: '#4F0C8A',
    brandLight: '#F8EFFF',
    brandBorder: '#EED8FE',
    blue: '#005CFF',
    blueContent: '#1C3BD4',
    blueDark: '#1832B4',
    blueLight: '#EBF5FF',
    green: '#159F65',
    greenContent: '#128756',
    greenLight: '#E8F9F1',
    orange: '#ED6325',
    orangeContent: '#C9541F',
    orangeLight: '#FFF4E9',
    pink: '#DF1A6F',
    pinkLight: '#FEEAF3',
    red: '#F34747',
    grey100: '#F9F9F9',
    grey200: '#F3F4F6',
    grey300: '#CED1D7',
    grey400: '#979CA5',
    grey500: '#595E67',
    grey600: '#292D38',
    ink: '#0F131A',
    white: '#FFFFFF',
    bg: '#FFFFFF',
    bgMuted: '#F9F9F9',
    bgSubtle: '#F3F4F6',
    surface: '#FFFFFF',
    text: '#0F131A',
    textMuted: '#595E67',
    textSubtle: '#71767F',
    textDisabled: '#B3B8C1',
    textInverse: '#FFFFFF',
    link: '#7A12D4',
    border: '#DFE1E5',
    borderStrong: '#CED1D7',
    borderMuted: '#F3F4F6',
    focusRing: '#9B37F2',
  },
  rounded: { none: 0, xs: 4, sm: 8, md: 16, lg: 24, full: 128 },
  spacing: {
    '3': 4, '4': 6, '5': 8, '6': 12, '7': 16, '8': 20, '9': 24,
    '10': 28, '11': 32, '12': 36, '13': 40, '14': 48, '15': 56, '16': 64,
    '17': 80, '18': 96, '19': 112, '20': 128,
    sectionSm: 64, sectionMd: 80, sectionLg: 128,
    container: 1280, containerWide: 1440,
  },
  shadows: {
    light: '0 4px 15px 0 rgba(0,0,0,0.05)',
    medium: '0 5px 20px 0 rgba(0,0,0,0.10)',
    strong: '0 15px 30px 0 rgba(0,0,0,0.20)',
    focus: '0 0 0 4px rgba(155,55,242,0.35)',
  },
  gradients: {
    sunset: 'linear-gradient(135deg, #4F0C8A 0%, #DF1A6F 100%)',
    dusk: 'linear-gradient(135deg, #4F0C8A 0%, #1832B4 100%)',
  },
  typography: {
    fontFamily: "'Vazirmatn','Tahoma',Arial,sans-serif",
    weights: { regular: 400, medium: 500, bold: 700 },
  },
};

// ═══════════════════════════════════════════════════════════
// KIDLEARN TOKENS (از kidlearn-DESIGN.md)
// ═══════════════════════════════════════════════════════════

export const kidlearnTokens = {
  colors: {
    primary: '#EF4444',
    secondary: '#3B82F6',
    tertiary: '#FACC15',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    surfaceBase: '#FFFFFF',
    surfaceHighlight: '#FEF3C7',
    surfaceRaised: '#F9FAFB',
    text: '#1F2937',
    textMuted: '#6B7280',
    border: '#E5E7EB',
    borderDefault: '#E5E7EB',
    // Brand purple for consistency
    brand: '#7A12D4',
    brandLight: '#F8EFFF',
  },
  rounded: { sm: 12, md: 20, lg: 28, pill: 9999, circle: '50%' },
  spacing: {
    '1': 8, '2': 16, '3': 24, '4': 32, '5': 40, '6': 48, '8': 64,
  },
  shadows: {
    sm: '2px 2px 4px rgba(0,0,0,0.08)',
    md: '4px 4px 12px rgba(0,0,0,0.12)',
    lg: '8px 8px 24px rgba(0,0,0,0.16)',
    playful: '6px 6px 0px #D1D5DB',
    focus: '0 0 0 4px rgba(59,130,246,0.35)',
  },
  typography: {
    fontFamily: "'Vazirmatn','Tahoma',Arial,sans-serif",
    weights: { regular: 400, semibold: 600, bold: 700 },
  },
};

// ═══════════════════════════════════════════════════════════
// NAVYSTACK TOKENS (از navystack-DESIGN.md)
// ═══════════════════════════════════════════════════════════

export const navystackTokens = {
  colors: {
    background: '#0A0E27',
    sidebar: '#0D1333',
    header: '#0D1333',
    cardSurface: '#111638',
    cardHover: '#161D48',
    primary: '#00D4FF',
    primaryHover: '#33DDFF',
    purple: '#7C3AED',
    green: '#10B981',
    yellow: '#F59E0B',
    red: '#EF4444',
    textPrimary: '#E2E8F0',
    textSecondary: '#94A3B8',
    border: '#1E2756',
    // Brand purple for consistency
    brand: '#7A12D4',
    brandLight: 'rgba(122,18,212,0.15)',
  },
  rounded: { sm: 4, md: 8, lg: 12, pill: 20, circle: '50%' },
  spacing: {
    '1': 4, '2': 6, '3': 8, '4': 10, '5': 12, '6': 14, '7': 16, '8': 18, '9': 20, '10': 24,
    contentPaddingV: 20, contentPaddingH: 24,
    cardPadding: 16, cardPaddingCompact: 14, cardPaddingKpi: 18,
    gridGap: 16, gridGapTight: 12,
  },
  shadows: {
    glow: '0 0 12px rgba(0,212,255,0.15)',
    cardHover: '0 4px 16px rgba(0,212,255,0.08)',
  },
  typography: {
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif",
    weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  },
};

// ═══════════════════════════════════════════════════════════
// THEME OBJECT GENERATORS (compatible with existing TH structure)
// ═══════════════════════════════════════════════════════════

export function classicTheme(id: keyof typeof classicThemes) {
  const t = classicThemes[id];
  return {
    id,
    name: id === 'light' ? 'روشن' : id === 'cream' ? 'کرم' : id === 'ocean' ? 'اقیانوسی' : 'تاریک',
    ...t,
  };
}

export function wellnessTheme() {
  const t = wellnessTokens;
  return {
    id: 'wellness',
    name: 'Wellness',
    bg: t.colors.bg,
    card: t.colors.surface,
    brd: t.colors.border,
    acc: t.colors.brand,
    soft: t.colors.brandLight,
    grad: t.gradients.sunset,
    txt: t.colors.text,
    mut: t.colors.textMuted,
    ttl: t.colors.brand,
    inp: t.colors.white,
    sel: t.colors.brandLight,
    pop: t.colors.white,
    err: t.colors.red,
    ok: t.colors.green,
    warn: t.colors.orange,
    badge: t.colors.brandLight,
    hdr: 'rgba(255,255,255,.96)',
    neuOut: t.shadows.light,
    neuIn: 'inset 2px 2px 5px rgba(0,0,0,0.04), inset -2px -2px 5px rgba(255,255,255,0.8)',
    memphis: [t.colors.brandLight, '#EBF5FF', t.colors.greenLight],
    // Wellness-specific extras
    pillRadius: t.rounded.full,
    cardRadius: t.rounded.md,
    inputRadius: t.rounded.sm,
    shadowLight: t.shadows.light,
    shadowMedium: t.shadows.medium,
    shadowStrong: t.shadows.strong,
    shadowFocus: t.shadows.focus,
    // Typography
    fontFamily: t.typography.fontFamily,
    fontWeight: t.typography.weights,
  };
}

export function kidlearnTheme() {
  const t = kidlearnTokens;
  return {
    id: 'kidlearn',
    name: 'KidLearn',
    bg: t.colors.surfaceBase,
    card: t.colors.surfaceRaised,
    brd: t.colors.border,
    acc: t.colors.primary,
    soft: t.colors.surfaceHighlight,
    grad: `linear-gradient(135deg, ${t.colors.primary} 0%, ${t.colors.secondary} 100%)`,
    txt: t.colors.text,
    mut: t.colors.textMuted,
    ttl: t.colors.primary,
    inp: t.colors.surfaceBase,
    sel: t.colors.surfaceHighlight,
    pop: t.colors.surfaceBase,
    err: t.colors.error,
    ok: t.colors.success,
    warn: t.colors.warning,
    badge: t.colors.surfaceHighlight,
    hdr: 'rgba(255,255,255,.96)',
    neuOut: t.shadows.playful,
    neuIn: 'inset 2px 2px 6px rgba(0,0,0,0.05), inset -2px -2px 6px rgba(255,255,255,0.7)',
    memphis: [t.colors.surfaceHighlight, '#DBEAFE', '#DCFCE7'],
    // KidLearn-specific extras
    primary: t.colors.primary,
    secondary: t.colors.secondary,
    tertiary: t.colors.tertiary,
    success: t.colors.success,
    pillRadius: t.rounded.pill,
    cardRadius: t.rounded.md,
    inputRadius: t.rounded.md,
    shadowSm: t.shadows.sm,
    shadowMd: t.shadows.md,
    shadowLg: t.shadows.lg,
    shadowPlayful: t.shadows.playful,
    shadowFocus: t.shadows.focus,
    // Brand consistency
    brandPurple: t.colors.brand,
    // Typography
    fontFamily: t.typography.fontFamily,
    fontWeight: t.typography.weights,
  };
}

export function navystackTheme() {
  const t = navystackTokens;
  return {
    id: 'navystack',
    name: 'NavyStack',
    bg: t.colors.background,
    card: t.colors.cardSurface,
    brd: t.colors.border,
    acc: t.colors.primary,
    soft: 'rgba(0,212,255,0.06)',
    grad: `linear-gradient(135deg, ${t.colors.primary} 0%, ${t.colors.purple} 100%)`,
    txt: t.colors.textPrimary,
    mut: t.colors.textSecondary,
    ttl: t.colors.primary,
    inp: t.colors.background,
    sel: 'rgba(0,212,255,0.06)',
    pop: t.colors.cardSurface,
    err: t.colors.red,
    ok: t.colors.green,
    warn: t.colors.yellow,
    badge: 'rgba(0,212,255,0.08)',
    hdr: t.colors.sidebar,
    neuOut: '0 2px 8px rgba(0,0,0,0.3)',
    neuIn: 'inset 1px 1px 4px rgba(0,0,0,0.3), inset -1px -1px 4px rgba(30,39,86,0.2)',
    memphis: ['rgba(0,212,255,0.04)', 'rgba(124,58,237,0.04)', 'rgba(16,185,129,0.04)'],
    // NavyStack-specific extras
    sidebar: t.colors.sidebar,
    header: t.colors.header,
    cardHover: t.colors.cardHover,
    primary: t.colors.primary,
    primaryHover: t.colors.primaryHover,
    purple: t.colors.purple,
    green: t.colors.green,
    yellow: t.colors.yellow,
    red: t.colors.red,
    cardRadius: t.rounded.md,
    btnRadius: t.rounded.sm,
    inputRadius: t.rounded.sm,
    tagRadius: t.rounded.sm,
    shadowGlow: t.shadows.glow,
    shadowCardHover: t.shadows.cardHover,
    // Brand consistency
    brandPurple: t.colors.brand,
    // Typography
    fontFamily: t.typography.fontFamily,
    fontWeight: t.typography.weights,
    // Extra NavyStack tokens for admin panel
    kpiFontSize: '26px',
    kpiFontWeight: 700,
    kpiLabelFontSize: '14px',
    kpiLabelFontWeight: 400,
    pageHeadingFontSize: '16px',
    pageHeadingFontWeight: 600,
    bodyFontSize: '13px',
    labelFontSize: '11px',
    sidebarWidth: 220,
    sidebarActiveBg: 'rgba(0,212,255,0.08)',
    sidebarActiveBorder: '3px solid #00D4FF',
    sidebarItemPaddingV: 10,
    sidebarItemPaddingH: 20,
    sidebarItemFontSize: 13,
    modalMaxWidth: 560,
    modalRadius: 12,
    tagPadding: '2px 8px',
    tableFontSize: 13,
    tableHeaderFontSize: 12,
    tableCellPaddingV: 10,
    tableCellPaddingH: 12,
    tableBorderColor: 'rgba(30,39,86,0.5)',
    cardHoverTransform: 'translateY(-2px)',
    btnDangerBg: '#EF4444',
    btnDangerText: '#FFFFFF',
    btnSuccessBg: '#10B981',
    btnSuccessText: '#FFFFFF',
    btnSmallPadding: '4px 10px',
    btnSmallFontSize: 11,
    tabActiveBorder: '2px solid #00D4FF',
    statusDotSize: 8,
    timelineLineColor: '#1E2756',
    timelineLineWidth: 2,
    timelineDotSize: 10,
    timelineDotBorder: '2px solid #00D4FF',
  };
}

// ═══════════════════════════════════════════════════════════
// EXPORT ALL THEME OBJECTS FOR DIRECT USE
// ═══════════════════════════════════════════════════════════

export const classic = {
  light: classicTheme('light'),
  cream: classicTheme('cream'),
  ocean: classicTheme('ocean'),
  dark: classicTheme('dark'),
};

export const wellness = wellnessTheme();
export const kidlearn = kidlearnTheme();
export const navystack = navystackTheme();

// ═══════════════════════════════════════════════════════════
// SHARED CONSTANTS
// ═══════════════════════════════════════════════════════════

export const VAZIRMATN = "'Vazirmatn','Tahoma',Arial,sans-serif";
// Stage 1: Primary brand is trust teal/blue. Legacy purple kept for limited backward compat only.
export const BRAND_PURPLE = '#0F766E';
export const BRAND_PURPLE_CONTENT = '#134E4B';
export const BRAND_PURPLE_DARK = '#0F766E';
export const BRAND_PURPLE_LIGHT = '#CCFBF1';
export const BRAND_PURPLE_BORDER = '#E5E0D8';
export const BRAND_PRIMARY = '#0F766E';
export const BRAND_ACCENT = '#0EA5E9';

// Available designs
export const AVAILABLE_DESIGNS = ['classic', 'wellness', 'kidlearn', 'navystack'] as const;
export type DesignType = typeof AVAILABLE_DESIGNS[number];

// Available classic themes
export const AVAILABLE_CLASSIC_THEMES = ['light', 'cream', 'ocean', 'dark', 'motherly', 'trust', 'blend', 'motherly-trust'] as const;
export type ClassicThemeType = typeof AVAILABLE_CLASSIC_THEMES[number];

// Stage 7 semantic Foundation tokens. Legacy theme shapes above remain for compatibility.
export const semanticTokens = {
  action: { primary: '#1769C2', primaryHover: '#12559E', primarySoft: '#E7F2FC', secondary: '#356B62' },
  surface: { page: '#F7F9FC', base: '#FFFFFF', raised: '#FFFFFF', selected: '#EAF4FF', inverse: '#102B46' },
  text: { primary: '#17202B', secondary: '#405466', muted: '#6B7B8A', inverse: '#FFFFFF' },
  border: { default: '#D9E2EA', strong: '#B5C5D3', focus: '#3B8DDD' },
  status: { success: '#218653', warning: '#B56A08', error: '#B83A3A', info: '#1769C2', disabled: '#9BA9B5' },
  admin: { accent: '#4BA8D8', surface: '#F1F5F8', border: '#C8D5DF' },
  typography: { family: VAZIRMATN, weights: { regular: 400, medium: 500, semibold: 600, bold: 700 } },
  spacing: { base: 4, page: 16, section: 32, touch: 48 },
  radius: { input: 10, button: 14, card: 16, modal: 22, badge: 999, avatar: '50%' },
  elevation: { soft: '0 4px 15px rgba(15,38,60,.06)', medium: '0 8px 24px rgba(15,38,60,.11)', strong: '0 18px 42px rgba(15,38,60,.18)' },
  motion: { fast: 140, base: 200, slow: 320, easing: 'cubic-bezier(.2,0,0,1)' },
  zIndex: { header: 1000, drawer: 3000, modal: 9000 },
};

export const themeVariants = ['light', 'cream', 'ocean', 'dark', 'motherly', 'trust', 'blend', 'motherly-trust'] as const;
export type ThemeVariant = typeof themeVariants[number];
export const AVAILABLE_CLASSIC_THEMES_V2 = themeVariants;
