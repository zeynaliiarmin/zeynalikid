/**
 * Zeynalikid Admin — Stage 7A
 * Theme bridge between the admin panel and Stage 6's theme system.
 * Stage 6 contract (must stay identical):
 *   - localStorage key: "zk_theme"  =  'light' | 'dark' | 'auto'
 *   - <html data-theme="light|dark">
 *   - auto: dark between 20:00–07:00 OR when OS prefers-color-scheme is dark
 *   - dark mode sets the same --zk-* overrides SettingsPage sets.
 */
export type ZkThemePref = 'light' | 'dark' | 'auto';

export const ZK_THEME_KEY = 'zk_theme';
export const ZK_THEME_EVENT = 'zk-admin-theme-changed';

export function getZkThemePref(): ZkThemePref {
  try {
    const v = localStorage.getItem(ZK_THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch {}
  return 'light';
}

/** Resolve a preference to an actual dark/light result (Stage 6 rule). */
export function resolveZkDark(pref?: ZkThemePref): boolean {
  const p = pref ?? getZkThemePref();
  if (p === 'dark') return true;
  if (p === 'light') return false;
  try {
    const prefersDark = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark;
  } catch {
    return false;
  }
}

/**
 * Apply a preference: writes localStorage, sets data-theme + --zk-* vars
 * (mirrors SettingsPage.applyTheme exactly) and notifies the app shell so
 * the admin T-tokens can re-render. Returns the resolved dark state.
 */
export function applyZkTheme(pref: ZkThemePref): boolean {
  let final: 'light' | 'dark' = pref === 'dark' ? 'dark' : pref === 'light' ? 'light' : (resolveZkDark('auto') ? 'dark' : 'light');
  try { localStorage.setItem(ZK_THEME_KEY, pref); } catch {}
  const root = document.documentElement;
  root.setAttribute('data-theme', final);
  if (final === 'dark') {
    root.style.setProperty('--zk-bg', '#0F1722');
    root.style.setProperty('--zk-surface', '#172231');
    root.style.setProperty('--zk-text', '#E2E8F0');
    root.style.setProperty('--zk-text-muted', '#94A3B8');
    root.style.setProperty('--zk-border', 'rgba(148,163,184,0.2)');
    root.style.setProperty('--zk-primary', '#4BA8D8');
  } else {
    root.style.removeProperty('--zk-bg');
    root.style.removeProperty('--zk-surface');
    root.style.removeProperty('--zk-text');
    root.style.removeProperty('--zk-text-muted');
    root.style.removeProperty('--zk-border');
    root.style.removeProperty('--zk-primary');
  }
  try { window.dispatchEvent(new CustomEvent(ZK_THEME_EVENT, { detail: { dark: final === 'dark', pref } })); } catch {}
  return final === 'dark';
}
