/**
 * Persistent personal colour-mode bridge for this browser and domain.
 * The header toggle writes only localStorage; it never changes site settings.
 */
import {
  LEGACY_THEME_KEY,
  PERSONAL_COLOR_MODE_EVENT,
  PERSONAL_COLOR_MODE_KEY,
  normalizePersonalColorMode,
  type PersonalColorMode,
} from '../utils/colorMode';

export type ZkThemePref = PersonalColorMode;
export const ZK_THEME_KEY = PERSONAL_COLOR_MODE_KEY;
export const ZK_LEGACY_THEME_KEY = LEGACY_THEME_KEY;
export const ZK_THEME_EVENT = PERSONAL_COLOR_MODE_EVENT;

export function getZkThemePref(): ZkThemePref | null {
  try {
    return normalizePersonalColorMode(localStorage.getItem(ZK_THEME_KEY));
  } catch {
    return null;
  }
}

/** Read the former admin key only when the admin shell explicitly migrates it. */
export function getLegacyZkThemePref(): ZkThemePref | null {
  try {
    return normalizePersonalColorMode(localStorage.getItem(ZK_LEGACY_THEME_KEY));
  } catch {
    return null;
  }
}

export function resolveZkDark(pref: ZkThemePref | null = getZkThemePref()): boolean {
  return pref === 'dark';
}

/** Apply resolved colours to the document without persisting a preference. */
export function applyResolvedZkTheme(mode: ZkThemePref): boolean {
  const dark = mode === 'dark';
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.style.colorScheme = mode;
  if (dark) {
    root.style.setProperty('--zk-bg', '#0F1722');
    root.style.setProperty('--zk-surface', '#1E293B');
    root.style.setProperty('--zk-text', '#E2E8F0');
    root.style.setProperty('--zk-text-muted', '#B0BED1');
    root.style.setProperty('--zk-border', '#334155');
    root.style.setProperty('--zk-primary', '#2DD4BF');
  } else {
    root.style.removeProperty('--zk-bg');
    root.style.removeProperty('--zk-surface');
    root.style.removeProperty('--zk-text');
    root.style.removeProperty('--zk-text-muted');
    root.style.removeProperty('--zk-border');
    root.style.removeProperty('--zk-primary');
  }
  return dark;
}

/** Persist a deliberate header-toggle choice and notify the current tab. */
export function applyZkTheme(pref: ZkThemePref): boolean {
  try { localStorage.setItem(ZK_THEME_KEY, pref); } catch {}
  const dark = applyResolvedZkTheme(pref);
  try { window.dispatchEvent(new CustomEvent(ZK_THEME_EVENT, { detail: { dark, pref } })); } catch {}
  return dark;
}
