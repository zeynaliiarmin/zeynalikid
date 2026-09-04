/* ═══════════════════════════════════════════════════════════════════════
   پالت‌های اختصاصی هر دیزاین (روشن و تاریک)
   منبع: فایل design-A-warm.html (تokens دقیقاً از همان فایل برداشته شده‌اند)
   این تنها جایِ تعریف رنگ‌هاست: هم صفحات ورود/ثبت‌نام/پیگیری/ورود مدیریت
   و هم پوسته تاریک کل سایت از همین جدول خوانده می‌شوند.
   ═══════════════════════════════════════════════════════════════════════ */

export type WarmDesignId = 'wellness' | 'kidlearn' | 'blend' | 'classic';
export const WARM_DESIGNS: WarmDesignId[] = ['wellness', 'kidlearn', 'blend', 'classic'];

export type WarmPalette = {
  acc: string; deep: string; g2: string; soft: string;
  mem0: string; mem1: string; mem2: string;
  bg: string; ink: string; ttl: string;
  card0: string; card1: string; cardbd: string;
  fbg: string; fsh1: string; fsh2: string;
  sub: string; ph: string; track: string;
  warnbg: string; warnbd: string; warnfg: string;
  errbg: string; errbd: string; errfg: string;
  okc: string; btnfg: string;
  /** رنگ متن‌های رنگی (برچسب، لینک، عدد) — در دارک یک درجه روشن‌تر از acc تا خوانا بماند */
  accText: string;
  gtbg: string; gtbd: string; famop: string; island: string;
};

type WarmAccent = Pick<WarmPalette, 'acc' | 'deep' | 'g2' | 'soft' | 'mem0' | 'mem1' | 'mem2' | 'bg' | 'ink' | 'ttl'>;

const SHARED_LIGHT = {
  card0: '#FFFFFF', card1: '#FBF8F3', cardbd: 'rgba(255,255,255,.8)',
  fbg: '#F3EDE4', fsh1: 'rgba(74,58,96,.10)', fsh2: 'rgba(255,255,255,.9)',
  sub: '#756A82', ph: '#7E7388', track: '#EFE9F4',
  warnbg: '#FFF6E4', warnbd: '#F3DDAB', warnfg: '#96660A',
  errbg: '#FDF0EF', errbd: '#F6D0CB', errfg: '#B4403A',
  okc: '#047857', btnfg: '#FFFFFF',
  gtbg: 'rgba(255,255,255,.55)', gtbd: 'rgba(0,0,0,.06)',
  famop: '.16', island: '#3A3345',

};

const SHARED_DARK = {
  card0: '#182422', card1: '#121C1A', cardbd: '#ffffff14',
  fbg: '#101A18', fsh1: 'rgba(0,0,0,.5)', fsh2: 'rgba(255,255,255,.055)',
  sub: '#A6B8B2', ph: '#7E938D', track: '#1E2C29',
  warnbg: '#33280F', warnbd: '#66501B', warnfg: '#F2C968',
  errbg: '#33191D', errbd: '#5C2A30', errfg: '#F2A9A2',
  okc: '#5EEAD4', btnfg: '#12101C',
  gtbg: 'rgba(255,255,255,.09)', gtbd: 'rgba(255,255,255,.14)',
  famop: '.08', island: '#0A1211',

};

const ACCENTS: Record<WarmDesignId, { light: WarmAccent; dark: WarmAccent }> = {
  wellness: {
    light: { acc: '#7A12D4', deep: '#5B0FA6', g2: '#DF1A6F', soft: '#F8EFFF', mem0: '#F1E4FC', mem1: '#DCEFFC', mem2: '#E2F6EC', bg: '#F5EFE7', ink: '#3A2B4E', ttl: '#7A12D4' },
    dark: { acc: '#A855F7', deep: '#7C3AED', g2: '#EC4899', soft: '#221F2E', mem0: '#191825', mem1: '#14201D', mem2: '#151B21', bg: '#0F1A19', ink: '#ECE9F2', ttl: '#C6A8EF' },
  },
  kidlearn: {
    light: { acc: '#B91C1C', deep: '#8C1212', g2: '#1D4ED8', soft: '#FEF3C7', mem0: '#FDE9C8', mem1: '#DCEAFC', mem2: '#DEF4E7', bg: '#F8F0E8', ink: '#4A3022', ttl: '#B91C1C' },
    dark: { acc: '#F87171', deep: '#DC2626', g2: '#60A5FA', soft: '#262019', mem0: '#1C1A15', mem1: '#151D1C', mem2: '#151A21', bg: '#0F1A19', ink: '#F0EAE2', ttl: '#F0BFA1' },
  },
  blend: {
    light: { acc: '#1769C2', deep: '#104E92', g2: '#2F7D6D', soft: '#E3F1EE', mem0: '#DFECF8', mem1: '#E5F3F0', mem2: '#E5F3EC', bg: '#F2F6F4', ink: '#22384B', ttl: '#1769C2' },
    dark: { acc: '#38BDF8', deep: '#1769C2', g2: '#34D399', soft: '#15302B', mem0: '#17293B', mem1: '#163029', mem2: '#163127', bg: '#0F1A19', ink: '#E6F2F1', ttl: '#7CC4E8' },
  },
  classic: {
    light: { acc: '#2564A8', deep: '#1B4D86', g2: '#2E8CD8', soft: '#E1ECF6', mem0: '#D8E7F6', mem1: '#DDEBF7', mem2: '#E4F1F8', bg: '#F1F5F8', ink: '#243A52', ttl: '#2564A8' },
    dark: { acc: '#60A5FA', deep: '#2564A8', g2: '#93C5FD', soft: '#1C2733', mem0: '#16232A', mem1: '#152426', mem2: '#15231F', bg: '#0F1A19', ink: '#E3EDF7', ttl: '#8FBBE9' },
  },
};

export const normalizeWarmDesign = (value: unknown): WarmDesignId => {
  const raw = String(value || '').trim().toLowerCase();
  return (WARM_DESIGNS as string[]).includes(raw) ? (raw as WarmDesignId) : 'classic';
};

/** از شناسه تم (مثل wellness-dark یا admin-light) دیزاین + حالت روشن/تاریک را می‌گیرد */
export function designModeFromThemeId(themeId: unknown): { design: WarmDesignId; dark: boolean } {
  const raw = String(themeId || '');
  const dark = raw.endsWith('-dark') || raw === 'dark';
  return { design: normalizeWarmDesign(raw.replace(/-dark$/, '')), dark };
}

/** پالت کامل یک دیزاین در حالت روشن یا تاریک */
export function warmPalette(design: unknown, dark: boolean): WarmPalette {
  const accent = ACCENTS[normalizeWarmDesign(design)][dark ? 'dark' : 'light'];
  const shared = dark ? SHARED_DARK : SHARED_LIGHT;
  // در حالت روشن خودِ acc خواناست؛ در تاریک نسخه روشن‌تر (ttl) برای متن‌های رنگی استفاده می‌شود.
  return { ...accent, ...shared, accText: dark ? accent.ttl : accent.acc } as unknown as WarmPalette;
}

/** متغیرهای --zp-* برای پوسته صفحات ورود/ثبت‌نام/پیگیری/ورود مدیریت */
export function warmZpVars(design: unknown, dark: boolean): Record<string, string> {
  const p = warmPalette(design, dark);
  return {
    '--zp-acc': p.acc, '--zp-g2': p.g2, '--zp-deep': p.deep, '--zp-ttl': p.ttl,
    '--zp-ink': p.ink, '--zp-sub': p.sub, '--zp-bg': p.bg, '--zp-soft': p.soft,
    '--zp-card0': p.card0, '--zp-card1': p.card1, '--zp-cardbd': p.cardbd,
    '--zp-fbg': p.fbg, '--zp-fsh1': p.fsh1, '--zp-fsh2': p.fsh2,
    '--zp-ph': p.ph, '--zp-track': p.track,
    '--zp-mem0': p.mem0, '--zp-mem1': p.mem1, '--zp-mem2': p.mem2,
    '--zp-warnbg': p.warnbg, '--zp-warnbd': p.warnbd, '--zp-warnfg': p.warnfg,
    '--zp-errbg': p.errbg, '--zp-errbd': p.errbd, '--zp-errfg': p.errfg,
    '--zp-okc': p.okc, '--zp-btnfg': p.btnfg, '--zp-accText': p.accText, '--zp-famop': p.famop,
    '--zp-gtbg': p.gtbg, '--zp-gtbd': p.gtbd, '--zp-island': p.island,
    '--zp-softg': dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.025)',
  };
}

/**
 *patch رنگی تاریک یک دیزاین برای تم عمومی سایت (T).
 * هندسه (شعاع/فاصله/سایه‌های ساختاری) از همان دیزاین روشن می‌آید؛
 * فقط رنگ‌ها اختصاصیِ حالت تاریکِ همان دیزاین می‌شوند.
 */
export function publicDarkPatch(design: unknown) {
  const p = warmPalette(design, true);
  const accName = normalizeWarmDesign(design);
  return {
    bg: p.bg, card: p.card0, brd: p.cardbd,
    acc: p.acc, soft: p.soft, ttl: p.ttl,
    grad: `linear-gradient(135deg, ${p.acc} 0%, ${p.g2} 100%)`,
    grad2: p.g2,
    txt: p.ink, mut: p.sub,
    inp: p.fbg, sel: p.soft, pop: p.card1,
    err: p.errfg, ok: p.okc, warn: p.warnfg,
    info: p.ttl, btnfg: p.btnfg, accText: p.accText,
    badge: p.soft, hdr: p.gtbg,
    sidebar: p.card1, cardHover: p.soft,
    warnBg: p.warnbg, warnBd: p.warnbd, errBg: p.errbg, errBd: p.errbd,
    neuOut: '0 18px 40px rgba(0,0,0,.5)',
    neuIn: `inset 2px 2px 6px ${p.fsh1}, inset -2px -2px 6px ${p.fsh2}`,
    shadowLight: '0 4px 15px rgba(0,0,0,.34)',
    shadowMedium: '0 8px 24px rgba(0,0,0,.42)',
    shadowStrong: '0 18px 42px rgba(0,0,0,.52)',
    shadowFocus: `0 0 0 4px color-mix(in srgb,${p.acc} 34%,transparent)`,
    shadowGlow: `0 0 12px color-mix(in srgb,${p.acc} 26%,transparent)`,
    shadowCardHover: `0 4px 16px color-mix(in srgb,${p.g2} 20%,transparent)`,
    memphis: [p.mem0, p.mem1, p.mem2],
    designDark: accName,
  };
}
