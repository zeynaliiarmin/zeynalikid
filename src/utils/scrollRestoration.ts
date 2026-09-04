export type ScrollPosition = { x: number; y: number };

/** Kept inside each browser-history entry; it never touches product data or settings. */
export const SCROLL_POSITION_STATE_KEY = '__zkScrollPosition';

const hasWindow = () => typeof window !== 'undefined' && typeof window.history !== 'undefined';

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
);

const toCoordinate = (value: unknown): number | null => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
};

export function readCurrentScrollPosition(): ScrollPosition {
  if (!hasWindow()) return { x: 0, y: 0 };
  return {
    x: Math.max(0, Math.round(window.scrollX || window.pageXOffset || 0)),
    y: Math.max(0, Math.round(window.scrollY || window.pageYOffset || 0)),
  };
}

export function readHistoryScrollPosition(state: unknown): ScrollPosition | null {
  const position = asRecord(state)[SCROLL_POSITION_STATE_KEY];
  const record = asRecord(position);
  const x = toCoordinate(record.x);
  const y = toCoordinate(record.y);
  return x === null || y === null ? null : { x, y };
}

/** Save the exact current viewport for this entry while preserving React Router's state. */
export function saveCurrentHistoryScrollPosition(): void {
  if (!hasWindow()) return;
  const position = readCurrentScrollPosition();
  const current = asRecord(window.history.state);
  const saved = readHistoryScrollPosition(current);
  if (saved?.x === position.x && saved.y === position.y) return;
  try {
    window.history.replaceState({ ...current, [SCROLL_POSITION_STATE_KEY]: position }, '');
  } catch {
    // History can be unavailable in a restricted embedded browser; navigation still works.
  }
}

/**
 * Native in-page details/sheets use their own history entries. Preserve the router index
 * and the saved viewport so a later full-page Back still remains an in-app Back.
 */
export function pushInPageHistoryState(patch: Record<string, unknown>): void {
  if (!hasWindow()) return;
  try {
    window.history.pushState({ ...asRecord(window.history.state), ...patch }, '');
  } catch {
    // The UI remains usable even if a browser disallows history writes.
  }
}

/** Remove a transient query parameter without discarding router/scroll state. */
export function replaceCurrentHistoryUrl(url: string): void {
  if (!hasWindow()) return;
  try {
    window.history.replaceState({ ...asRecord(window.history.state) }, '', url);
  } catch {
    // URL clean-up is best-effort only.
  }
}

/** React Router records `idx` for same-document entries. Zero means a direct visit. */
export function canGoBackWithinApp(): boolean {
  if (!hasWindow()) return false;
  const index = Number(asRecord(window.history.state).idx);
  return Number.isInteger(index) && index > 0;
}
