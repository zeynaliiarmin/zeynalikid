import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import {
  readHistoryScrollPosition,
  saveCurrentHistoryScrollPosition,
  type ScrollPosition,
} from '../utils/scrollRestoration';

const RESTORE_DELAYS = [0, 50, 150, 350, 700, 1200] as const;

/**
 * Route policy for the public SPA:
 * - a new route always begins at its top;
 * - browser/device/project Back restores the exact viewport of its history entry.
 *
 * Positions live only in `history.state`, never in user settings or production data.
 */
export default function useRouteScrollRestoration(): void {
  const location = useLocation();
  const navigationType = useNavigationType();
  const mountedRef = useRef(false);
  const restoringRef = useRef(false);
  const cancelRestoreRef = useRef<() => void>(() => {});

  const saveCurrent = useCallback(() => {
    if (!restoringRef.current) saveCurrentHistoryScrollPosition();
  }, []);

  const cancelPendingRestore = useCallback(() => {
    cancelRestoreRef.current();
    cancelRestoreRef.current = () => {};
    restoringRef.current = false;
  }, []);

  const restore = useCallback((position: ScrollPosition) => {
    cancelPendingRestore();
    restoringRef.current = true;
    let cancelled = false;
    const timers: number[] = [];
    const interactionTargets: Array<[EventTarget, string, EventListenerOrEventListenerObject]> = [];

    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      for (const timer of timers) window.clearTimeout(timer);
      for (const [target, type, listener] of interactionTargets) target.removeEventListener(type, listener);
      restoringRef.current = false;
      cancelRestoreRef.current = () => {};
    };

    const cancelForUserInput = () => {
      finish();
      saveCurrentHistoryScrollPosition();
    };
    for (const [target, type] of [
      [window, 'wheel'],
      [window, 'touchstart'],
      [window, 'pointerdown'],
      [window, 'keydown'],
    ] as Array<[EventTarget, string]>) {
      const listener: EventListener = cancelForUserInput;
      target.addEventListener(type, listener, { passive: true, once: true });
      interactionTargets.push([target, type, listener]);
    }

    const apply = () => {
      if (cancelled) return;
      window.requestAnimationFrame(() => {
        if (!cancelled) window.scrollTo(position.x, position.y);
      });
    };
    for (const delay of RESTORE_DELAYS) timers.push(window.setTimeout(apply, delay));
    timers.push(window.setTimeout(finish, RESTORE_DELAYS[RESTORE_DELAYS.length - 1] + 80));
    cancelRestoreRef.current = finish;
  }, [cancelPendingRestore]);

  // A React Router PUSH/REPLACE is a new page, not a Back/Forward traversal.
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      saveCurrentHistoryScrollPosition();
      return;
    }
    if (navigationType === 'POP') return;
    cancelPendingRestore();
    window.scrollTo(0, 0);
    saveCurrentHistoryScrollPosition();
  }, [cancelPendingRestore, location.hash, location.key, location.pathname, location.search, navigationType]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const previousMode = window.history.scrollRestoration;
    try { window.history.scrollRestoration = 'manual'; } catch {}

    let scrollFrame = 0;
    const onScroll = () => {
      if (restoringRef.current || scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        saveCurrent();
      });
    };
    const onDocumentClick = (event: MouseEvent) => {
      // Capture phase runs before a Link/button can change the route.
      if (event.button === 0) saveCurrent();
    };
    const onDocumentKeyDown = () => {
      // Keyboard activation (Enter/Space) can change a route without a pointer click.
      saveCurrent();
    };
    const onPopState = (event: PopStateEvent) => {
      restore(readHistoryScrollPosition(event.state) || { x: 0, y: 0 });
    };
    const saveBeforeLeave = () => saveCurrentHistoryScrollPosition();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveBeforeLeave();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onDocumentClick, true);
    document.addEventListener('keydown', onDocumentKeyDown, true);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('pagehide', saveBeforeLeave);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      cancelPendingRestore();
      saveBeforeLeave();
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onDocumentClick, true);
      document.removeEventListener('keydown', onDocumentKeyDown, true);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('pagehide', saveBeforeLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      // Restore browser defaults if this React root ever unmounts.
      try { window.history.scrollRestoration = previousMode; } catch {}
    };
  }, [cancelPendingRestore, restore, saveCurrent]);
}
