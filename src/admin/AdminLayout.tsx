/**
 * Zeynalikid Admin — Admin Shell / Layout
 * ─ Desktop (≥1024px): fixed sidebar on the inline-start edge (right in RTL)
 *   256px wide, sticky header 60px, content fills the rest.
 * ─ Mobile/tablet (<1024px): sidebar becomes a sliding Drawer from the
 *   inline-start edge with a dimmed backdrop, 250ms ease, closes on backdrop
 *   click / Escape, respects safe-area insets.
 * ─ Clean horizontal flex layout with zero text/chevron overlap.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { applyResolvedZkTheme, applyZkTheme, getLegacyZkThemePref, getZkThemePref, ZK_THEME_EVENT, ZK_THEME_KEY } from './adminTheme';
import AdminThemeToggle from './AdminThemeToggle';
import { ZkBellIcon, ZkChevronDownIcon, ZkHomeIcon, ZkLogoutIcon, ZkMenuIcon, ZkCloseIcon, ZkStaffIcon } from './adminIcons';
import { zkAlert, zkConfirm } from '../components/ZkDialog';

export interface AdminNavLeaf { id: string; label: string; icon?: React.ReactNode; }
export interface AdminNavGroup { id: string; label: string; icon?: React.ReactNode; items?: AdminNavLeaf[]; }

interface AdminLayoutProps {
  lang: 'fa' | 'en';
  groups: AdminNavGroup[];
  active: string;
  onNavigate: (id: string) => void;
  onLogout: () => void;
  onHome: () => void;
  version?: string;
  children: React.ReactNode;
}

export default function AdminLayout({ lang, groups, active, onNavigate, onLogout, onHome, version = '1.0.0', children }: AdminLayoutProps) {
  const rtl = lang !== 'en';
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState<boolean>(() => (getZkThemePref() ?? getLegacyZkThemePref()) === 'dark');
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const desktopMq = useRef<MediaQueryList | null>(null);

  // ── body scope class (tokens) + direction + theme on mount ──────
  useEffect(() => {
    document.body.classList.add('admin-root');
    document.body.classList.toggle('admin-ltr', !rtl);
    const personal = getZkThemePref();
    const legacy = personal ? null : getLegacyZkThemePref();
    setDark(legacy ? applyZkTheme(legacy) : applyResolvedZkTheme(personal ?? 'light'));
    return () => {
      document.body.classList.remove('admin-root');
      document.body.classList.remove('admin-ltr');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep body dir flag in sync when language changes
  useEffect(() => { document.body.classList.toggle('admin-ltr', !rtl); }, [rtl]);

  // ── react to personal colour-mode changes in this or another tab ──
  useEffect(() => {
    const sync = () => {
      const pref = getZkThemePref();
      setDark(applyResolvedZkTheme(pref ?? 'light'));
    };
    const onStorage = (e: StorageEvent) => { if (e.key === ZK_THEME_KEY) sync(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener(ZK_THEME_EVENT, sync as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(ZK_THEME_EVENT, sync as EventListener);
    };
  }, []);

  // ── drawer: close on Escape, lock scroll, auto-close on desktop ───
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    if (!desktopMq.current && typeof window.matchMedia === 'function') desktopMq.current = window.matchMedia('(min-width: 1024px)');
    const mq = desktopMq.current;
    const onMq = (e: MediaQueryListEvent) => { if (e.matches) setOpen(false); };
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', onMq); else if ((mq as any).addListener) (mq as any).addListener(onMq); }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prevOverflow;
      if (mq) { if (mq.removeEventListener) mq.removeEventListener('change', onMq); else if ((mq as any).removeListener) (mq as any).removeListener(onMq); }
    };
  }, [open]);

  // ── notification popover: close on outside click ─────────────────
  useEffect(() => {
    if (!notifOpen) return;
    const h = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [notifOpen]);

  const toggleTheme = useCallback(() => {
    setDark(applyZkTheme(dark ? 'light' : 'dark'));
  }, [dark]);

  const go = useCallback((id: string) => { onNavigate(id); setOpen(false); }, [onNavigate]);

  // ── which group contains the active tab (for expand + breadcrumb) ─
  const activeGroup = groups.find(g => g.id === active || (g.items || []).some(i => i.id === active)) || null;
  const activeLeaf: AdminNavLeaf | null = activeGroup
    ? (activeGroup.id === active ? { id: activeGroup.id, label: activeGroup.label, icon: activeGroup.icon } : (activeGroup.items || []).find(i => i.id === active) || null)
    : null;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(activeGroup ? [activeGroup.id] : []));
  useEffect(() => { if (activeGroup) setExpanded(prev => (prev.has(activeGroup.id) ? prev : new Set(prev).add(activeGroup.id))); }, [activeGroup?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumb = activeGroup && activeLeaf && activeGroup.id !== activeLeaf.id
    ? { root: activeGroup.label, cur: activeLeaf.label }
    : { root: '', cur: activeLeaf?.label || (rtl ? 'داشبورد' : 'Dashboard') };

  const brandName = rtl ? 'زینالیکید ادمین' : 'Zeynalikid Admin';
  const brandSub = rtl ? 'پنل مدیریت' : 'Management panel';

  const sidebarContent = (
    <>
      <div className="zkad-brand">
        <span className="zkad-brand-logo" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21S4.5 16 4.5 9.8A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 16 12 21 12 21z"/><path d="M8.5 11.5h2l1-2 1.5 4 1-2h1.5"/></svg>
        </span>
        <div>
          <h1 className="zkad-brand-name">{brandName}</h1>
          <p className="zkad-brand-sub">{brandSub}</p>
        </div>
      </div>

      <nav className="zkad-nav" aria-label={rtl ? 'منوی اصلی پنل مدیریت' : 'Admin main menu'}>
        {groups.map(g => {
          const hasSub = !!g.items?.length;
          const isGroupActive = g.id === active;
          const isExpanded = expanded.has(g.id);
          const isActiveInSub = (g.items || []).some(i => i.id === active);
          return (
            <div key={g.id} className="zkad-nav-group-wrapper" style={{ marginBottom: 2 }}>
              <div
                className={`zkad-nav-item ${isGroupActive ? 'zkad-active' : ''} ${hasSub ? 'zkad-has-sub' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 0,
                  position: 'relative',
                  overflow: 'hidden',
                  width: '100%',
                }}
              >
                {/* دکمه ناوبری عنوان اصلی گروه */}
                <button
                  type="button"
                  className="zkad-nav-main"
                  aria-current={isGroupActive ? 'page' : undefined}
                  onClick={() => {
                    if (hasSub) {
                      setExpanded(prev => {
                        const n = new Set(prev);
                        if (n.has(g.id)) n.delete(g.id);
                        else n.add(g.id);
                        return n;
                      });
                    }
                    go(g.id);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minWidth: 0,
                    background: 'transparent',
                    border: 0,
                    color: 'inherit',
                    font: 'inherit',
                    cursor: 'pointer',
                    padding: '10px 14px',
                    textAlign: rtl ? 'right' : 'left',
                    minHeight: 44,
                  }}
                >
                  <span className="zkad-nav-ic" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 20 }}>
                    {g.icon}
                  </span>
                  <span className="zkad-nav-lbl" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isGroupActive ? 800 : 600 }}>
                    {g.label}
                  </span>
                </button>

                {/* دکمه چورون (فلش باز و بسته) دقیقاً در سمت چپ‌ترین نقطه بدون همپوشانی */}
                {hasSub && (
                  <button
                    type="button"
                    className={`zkad-caret-btn ${isExpanded ? 'zkad-open-c' : ''}`}
                    aria-label={isExpanded ? (rtl ? 'بستن زیرمنو' : 'Collapse') : (rtl ? 'باز کردن زیرمنو' : 'Expand')}
                    aria-expanded={isExpanded}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(prev => {
                        const n = new Set(prev);
                        if (n.has(g.id)) {
                          if (!isGroupActive && !isActiveInSub) n.delete(g.id);
                          else n.delete(g.id);
                        } else {
                          n.add(g.id);
                        }
                        return n;
                      });
                    }}
                    style={{
                      width: 38,
                      height: 44,
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'transparent',
                      border: 0,
                      color: isExpanded ? 'var(--zkad-acc)' : 'var(--zkad-faint)',
                      cursor: 'pointer',
                      marginInlineStart: 'auto',
                      transition: 'transform .25s ease, color .2s ease',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform .25s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      <ZkChevronDownIcon size={14} />
                    </span>
                  </button>
                )}
              </div>

              {/* رندر زیرمنوها */}
              {hasSub && isExpanded && (
                <div
                  className="zkad-sub"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    paddingInlineStart: 24,
                    marginTop: 2,
                    marginBottom: 4,
                    borderInlineStart: `2px solid var(--zkad-brd)`,
                    marginInlineStart: 18,
                  }}
                >
                  {(g.items || []).map(it => (
                    <button
                      key={it.id}
                      type="button"
                      className={`zkad-nav-item zkad-subitem ${active === it.id ? 'zkad-active' : ''}`}
                      aria-current={active === it.id ? 'page' : undefined}
                      onClick={() => go(it.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '7px 12px',
                        minHeight: 38,
                        border: 0,
                        borderRadius: 'var(--zkad-r-btn)',
                        background: active === it.id ? 'var(--zkad-acc-soft)' : 'transparent',
                        color: active === it.id ? 'var(--zkad-acc)' : 'var(--zkad-mut)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: 12.5,
                        fontWeight: active === it.id ? 800 : 500,
                        textAlign: rtl ? 'right' : 'left',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span className="zkad-nav-ic" style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {it.icon || g.icon}
                      </span>
                      <span className="zkad-nav-lbl" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {it.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="zkad-side-foot">
        <div className="zkad-side-actions">
          <button type="button" className="zkad-side-btn" onClick={() => { onHome(); setOpen(false); }}>
            <ZkHomeIcon size={15} />
            <span>{rtl ? 'نمای سایت' : 'View site'}</span>
          </button>
          <button type="button" className="zkad-side-btn zkad-danger" onClick={onLogout}>
            <ZkLogoutIcon size={15} />
            <span>{rtl ? 'خروج' : 'Logout'}</span>
          </button>
        </div>
        <div className="zkad-side-meta">
          {rtl ? `نسخه ${version}` : `Version ${version}`} · {rtl ? '© زینالیکید' : '© Zeynalikid'}
        </div>
      </div>
    </>
  );

  return (
    <div className="zkad-root" dir={rtl ? 'rtl' : 'ltr'} style={{ display: 'flex', alignItems: 'stretch', minHeight: '100dvh', width: '100%' }}>
      {/* Sidebar / Drawer */}
      <aside className={`zkad-sidebar ${open ? 'zkad-open' : ''}`} aria-hidden={!open && typeof window !== 'undefined' && window.innerWidth < 1024 ? true : undefined}>
        {sidebarContent}
      </aside>

      {/* Drawer backdrop (mobile) */}
      <div className={`zkad-backdrop ${open ? 'zkad-show' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />

      {/* Body: header + content */}
      <div className="zkad-body" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header className="zkad-header">
          <button
            type="button"
            className="zkad-burger"
            aria-label={open ? (rtl ? 'بستن منو' : 'Close menu') : (rtl ? 'باز کردن منو' : 'Open menu')}
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
          >
            {open ? <ZkCloseIcon size={19} /> : <ZkMenuIcon size={19} />}
          </button>

          <div className="zkad-crumb" aria-label={rtl ? 'مسیر صفحه' : 'Breadcrumb'}>
            <span className="zkad-crumb-root">{rtl ? 'پنل' : 'Panel'}</span>
            <span className="zkad-crumb-sep">/</span>
            {breadcrumb.root && (<><span className="zkad-crumb-root">{breadcrumb.root}</span><span className="zkad-crumb-sep">/</span></>)}
            <span className="zkad-crumb-cur">{breadcrumb.cur}</span>
          </div>

          <AdminThemeToggle dark={dark} onToggle={toggleTheme} rtl={rtl} />

          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              type="button"
              className="zkad-hbtn"
              onClick={() => setNotifOpen(v => !v)}
              aria-label={rtl ? 'اعلان‌ها' : 'Notifications'}
              aria-expanded={notifOpen}
            >
              <ZkBellIcon size={18} />
            </button>
            {notifOpen && (
              <div className="zkad-notif-pop" role="status">
                {rtl ? 'اعلان جدیدی ثبت نشده است.' : 'No new notifications.'}
              </div>
            )}
          </div>

          <span className="zkad-avatar" title={rtl ? 'مدیر زینالیکید' : 'Zeynalikid Admin'} aria-label={rtl ? 'حساب مدیر' : 'Admin account'}><ZkStaffIcon size={17} color="#fff" /></span>

          <button
            type="button"
            className="zkad-hbtn"
            onClick={onLogout}
            aria-label={rtl ? 'خروج از پنل' : 'Logout'}
            title={rtl ? 'خروج' : 'Logout'}
            style={{ color: 'var(--zkad-err)' }}
          >
            <ZkLogoutIcon size={18} />
          </button>
        </header>

        <div className="zkad-content" style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
