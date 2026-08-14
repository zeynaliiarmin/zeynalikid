import React, { useEffect, useRef, useState } from 'react';

export type StickyAnchorItem = { id: string; label: string };

type Props = {
  items: StickyAnchorItem[];
  topOffset?: number;
  maxWidth?: number | string;
  lang?: 'fa' | 'en';
  ariaLabel?: string;
  zIndex?: number;
};

type ScrollRoot = Window | HTMLElement;

const NAV_HEIGHT = 54;

function getScrollRoot(element: HTMLElement | null): ScrollRoot {
  let parent = element?.parentElement || null;
  while (parent) {
    if (parent === document.body || parent === document.documentElement) return window;
    const style = window.getComputedStyle(parent);
    const canScroll = parent.scrollHeight > parent.clientHeight + 2;
    // A fixed overflow container is a modal scroll root even before reviews
    // finish loading; ordinary non-overflowing wrappers must not hijack the
    // window scroll listener.
    if (/(auto|scroll|overlay)/.test(style.overflowY) && (canScroll || style.position === 'fixed')) return parent;
    parent = parent.parentElement;
  }
  return window;
}

function isWindow(root: ScrollRoot): root is Window {
  return root === window;
}

export default function StickyAnchorNav({ items, topOffset = 0, maxWidth = 960, lang = 'fa', ariaLabel, zIndex = 1190 }: Props) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const navScrollerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rootRef = useRef<ScrollRoot | null>(null);
  const frameRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState(items[0]?.id || '');
  const itemSignature = items.map((item) => item.id).join('|');

  useEffect(() => {
    setActiveId(items[0]?.id || '');
  }, [itemSignature]);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || !items.length) return;
    const root = getScrollRoot(trigger);
    rootRef.current = root;

    const update = () => {
      frameRef.current = null;
      const rootRect = isWindow(root) ? { top: 0, bottom: window.innerHeight } : root.getBoundingClientRect();
      const navBottomOffset = (navRef.current?.getBoundingClientRect().bottom ?? (rootRect.top + topOffset + NAV_HEIGHT)) - rootRect.top;
      const triggerTop = trigger.getBoundingClientRect().top - rootRect.top;
      const shouldShow = triggerTop <= navBottomOffset + 18 && triggerTop > -1_000_000;
      setVisible(shouldShow);

      // Reading the rendered nav edge includes the device safe-area inset.
      const activationLine = rootRect.top + navBottomOffset + 22;
      let nextActive = items[0]?.id || '';
      for (const item of items) {
        const section = document.getElementById(item.id);
        if (section && section.getBoundingClientRect().top <= activationLine) nextActive = item.id;
      }
      const atBottom = isWindow(root)
        ? window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
        : root.scrollTop + root.clientHeight >= root.scrollHeight - 4;
      if (atBottom) nextActive = items[items.length - 1]?.id || nextActive;
      setActiveId((current) => current === nextActive ? current : nextActive);
    };

    const schedule = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(update);
    };
    const eventTarget: Window | HTMLElement = root;
    eventTarget.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    schedule();
    return () => {
      eventTarget.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [itemSignature, topOffset]);

  useEffect(() => {
    const button = buttonRefs.current[activeId];
    const scroller = navScrollerRef.current;
    if (!button || !scroller || !visible) return;
    const buttonRect = button.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const delta = (buttonRect.left + buttonRect.width / 2) - (scrollerRect.left + scrollerRect.width / 2);
    // A relative visual delta works with both positive LTR and negative RTL
    // scrollLeft implementations.
    scroller.scrollBy({ left: delta, behavior: 'smooth' });
  }, [activeId, visible]);

  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    const root = rootRef.current || window;
    if (!section) return;
    setActiveId(id);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth';
    if (isWindow(root)) {
      const navBottom = navRef.current?.getBoundingClientRect().bottom ?? (topOffset + NAV_HEIGHT);
      const destination = window.scrollY + section.getBoundingClientRect().top - navBottom - 12;
      window.scrollTo({ top: Math.max(0, destination), behavior });
    } else {
      const rootRect = root.getBoundingClientRect();
      const navBottomOffset = (navRef.current?.getBoundingClientRect().bottom ?? (rootRect.top + topOffset + NAV_HEIGHT)) - rootRect.top;
      const destination = root.scrollTop + section.getBoundingClientRect().top - rootRect.top - navBottomOffset - 12;
      root.scrollTo({ top: Math.max(0, destination), behavior });
    }
  };

  const width = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;
  return (
    <>
      <div ref={triggerRef} data-sticky-anchor-trigger aria-hidden="true" style={{ height: 1, pointerEvents: 'none' }} />
      <nav
        ref={navRef}
        data-sticky-anchor-nav
        data-visible={visible ? 'true' : 'false'}
        aria-label={ariaLabel || (lang === 'fa' ? 'دسترسی سریع به بخش‌های صفحه' : 'Page section navigation')}
        style={{
          position: 'fixed',
          top: `calc(${topOffset}px + env(safe-area-inset-top, 0px))`,
          left: '50%',
          width: `min(100vw, ${width})`,
          height: NAV_HEIGHT,
          // Keep vertical geometry stable while fading in so even an immediate
          // click uses the exact final safe-area offset.
          transform: 'translate(-50%, 0)',
          opacity: visible ? 1 : 0,
          visibility: visible ? 'visible' : 'hidden',
          pointerEvents: visible ? 'auto' : 'none',
          zIndex,
          background: 'color-mix(in srgb, var(--zk-surface) 94%, transparent)',
          borderBottom: '1px solid var(--zk-border)',
          boxShadow: visible ? '0 10px 28px rgba(15,23,42,.12)' : 'none',
          backdropFilter: 'blur(16px) saturate(1.15)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.15)',
          transition: 'opacity 180ms ease, transform 180ms ease, visibility 180ms ease',
        }}
      >
        <div
          ref={navScrollerRef}
          dir={lang === 'fa' ? 'rtl' : 'ltr'}
          style={{ height: '100%', display: 'flex', alignItems: 'stretch', gap: 2, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 10px', overscrollBehaviorX: 'contain' }}
        >
          {items.map((item) => {
            const active = activeId === item.id;
            return (
              <button
                key={item.id}
                ref={(element) => { buttonRefs.current[item.id] = element; }}
                type="button"
                data-anchor-target={item.id}
                aria-current={active ? 'location' : undefined}
                onClick={() => scrollToSection(item.id)}
                style={{
                  position: 'relative',
                  flex: '0 0 auto',
                  minHeight: 44,
                  padding: '0 13px',
                  border: 0,
                  background: 'transparent',
                  color: active ? 'var(--zk-primary)' : 'var(--zk-text-muted)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: active ? 850 : 650,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 160ms ease',
                }}
              >
                {item.label}
                <span aria-hidden="true" style={{ position: 'absolute', right: 9, left: 9, bottom: 0, height: 3, borderRadius: '3px 3px 0 0', background: 'var(--zk-primary)', transform: active ? 'scaleX(1)' : 'scaleX(0)', opacity: active ? 1 : 0, transition: 'transform 180ms ease, opacity 180ms ease' }} />
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export const detailSectionStyle = (topOffset = 0): React.CSSProperties => ({
  scrollMarginTop: topOffset + NAV_HEIGHT + 18,
  padding: '20px 0 4px',
  borderTop: '1px solid var(--zk-border)',
});

export const detailSectionTitleStyle: React.CSSProperties = {
  margin: '0 0 14px',
  color: 'var(--zk-text)',
  fontSize: 17,
  lineHeight: 1.5,
  fontWeight: 850,
};
