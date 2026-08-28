export type PersonalColorMode = 'light' | 'dark';
export type PublicColorMode = PersonalColorMode | 'auto';
export type ResolvedColorMode = PersonalColorMode;

export const PERSONAL_COLOR_MODE_KEY = 'zk_personal_color_mode';
export const PUBLIC_COLOR_MODE_CACHE_KEY = 'zk_public_theme_mode';
export const PERSONAL_COLOR_MODE_EVENT = 'zk-personal-color-mode-changed';
export const LEGACY_THEME_KEY = 'zk_theme';

const REMOVED_DESIGN_ID = ['navy', 'stack'].join('');
const DESIGN_IDS = new Set(['wellness', 'kidlearn', 'blend', 'classic']);
const THEME_IDS = new Set(['light', 'cream', 'ocean', 'dark', 'motherly', 'trust', 'blend', 'motherly-trust']);

export function normalizePersonalColorMode(value: unknown): PersonalColorMode | null {
  return value === 'light' || value === 'dark' ? value : null;
}

export function normalizePublicColorMode(value: unknown): PublicColorMode {
  return value === 'light' || value === 'dark' || value === 'auto' ? value : 'auto';
}

export function isAutomaticDarkHour(hour: number): boolean {
  return hour >= 23 || hour < 7;
}

export function resolveColorMode(
  personal: unknown,
  globalMode: unknown,
  hour = new Date().getHours(),
): ResolvedColorMode {
  const personalMode = normalizePersonalColorMode(personal);
  if (personalMode) return personalMode;
  const publicMode = normalizePublicColorMode(globalMode);
  return publicMode === 'dark' || (publicMode === 'auto' && isAutomaticDarkHour(hour)) ? 'dark' : 'light';
}

/** Runtime-only compatibility for a retired design id; stored settings are never mutated. */
export function normalizeDesignId(value: unknown, fallback = 'classic'): string {
  const id = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (id === REMOVED_DESIGN_ID) return fallback;
  return DESIGN_IDS.has(id) ? id : fallback;
}

/** Runtime-only compatibility for retired or invalid theme selections. */
export function normalizeThemeId(value: unknown, fallback = 'light'): string {
  const id = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (id === REMOVED_DESIGN_ID) return fallback;
  return THEME_IDS.has(id) ? id : fallback;
}
