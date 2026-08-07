/**
 * Zeynalikid Admin — Stage 7A: Admin Shell / Layout
 * ─ Desktop (≥1024px): fixed sidebar on the inline-start edge (right in RTL)
 *   256px wide, sticky header 60px, content fills the rest.
 * ─ Mobile/tablet (<1024px): sidebar becomes an 66vw Drawer sliding from the
 *   inline-start edge with a dimmed backdrop, 250ms ease, closes on backdrop
 *   click / Escape, respects safe-area insets.
 * ─ All styling lives in zkadmin-tokens.css scoped to body.admin-root, so no
 *   style leaks into marketing pages, the course flow or the form app.
 * ─ Theme toggle is wired to Stage 6 (localStorage "zk_theme" + data-theme).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { applyZkTheme, getZkThemePref, resolveZkDark, ZK_THEME_EVENT, ZK_THEME_KEY } from './adminTheme';
import { ZkBellIcon, ZkChevronDownIcon, ZkHomeIcon, ZkLogoutIcon, ZkMenuIcon, ZkMoonIcon, ZkSunIcon, ZkCloseIcon, ZkStaffIcon } from './adminIcons';

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
  const [dark, setDark] = useState<boolean>(() => resolveZkDark());
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const desktopMq = useRef<MediaQueryList | null>(null);

  // ── body scope class (tokens) + direction + theme on mount ──────
  useEffect(() => {
    document.body.classList.add('admin-root');
    document.body.classList.toggle('admin-ltr', !rtl);
    setDark(applyZkTheme(getZkThemePref()));
    return () => {
      document.body.classList.remove('admin-root');
      document.body.classList.remove('admin-ltr');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep body dir flag in sync when language changes
  useEffect(() => { document.body.classList.toggle('admin-ltr', !rtl); }, [rtl]);

  // ── react to theme changes made elsewhere (SettingsPage, other tab) ──
  useEffect(() => {
    const sync = () => setDark(resolveZkDark());
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
            <React.Fragment key={g.id}>
              <div className={`zkad-nav-item ${isGroupActive ? 'zkad-active' : ''} ${hasSub ? 'zkad-has-sub' : ''}`} style={{display:'flex',alignItems:'center',gap:0,padding:0,overflow:'hidden'}}>
                <button
                  type="button"
                  className="zkad-nav-main"
                  aria-current={isGroupActive ? 'page' : undefined}
                  onClick={() => go(g.id)}
                  style={{flex:1,display:'flex',alignItems:'center',gap:10,minWidth:0,background:'transparent',border:0,color:'inherit',font:'inherit',cursor:'pointer',padding:'9px 12px',paddingInlineStart:'14px',textAlign:'start',minHeight:42}}
                >
                  <span className="zkad-nav-ic">{g.icon}</span>
                  <span className="zkad-nav-lbl">{g.label}</span>
                </button>
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
                          // فقط اگر گروه فعال نیست یا هیچ زیرآیتم فعالی ندارد، جمع شود — در غیر اینصورت باز بماند
                          if (!isGroupActive && !isActiveInSub) n.delete(g.id);
                          else n.delete(g.id);
                        } else {
                          n.add(g.id);
                        }
                        return n;
                      });
                    }}
                    style={{width:40,height:40,flexShrink:0,display:'inline-flex',alignItems:'center',justifyContent:'center',background:'transparent',border:0,color:'var(--zkad-faint)',cursor:'pointer',borderRadius:6}}
                  >
                    <span className={`zkad-caret ${isExpanded ? 'zkad-open-c' : ''}`}><ZkChevronDownIcon size={15} /></span>
                  </button>
                )}
              </div>
              {hasSub && isExpanded && (
                <div className="zkad-sub">
                  {(g.items || []).map(it => (
                    <button
                      key={it.id}
                      type="button"
                      className={`zkad-nav-item zkad-subitem ${active === it.id ? 'zkad-active' : ''}`}
                      aria-current={active === it.id ? 'page' : undefined}
                      onClick={() => go(it.id)}
                    >
                      <span className="zkad-nav-ic">{it.icon || g.icon}</span>
                      <span className="zkad-nav-lbl">{it.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </React.Fragment>
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

          <button
            type="button"
            className="zkad-hbtn"
            onClick={toggleTheme}
            aria-label={dark ? (rtl ? 'تغییر به حالت روشن' : 'Switch to light mode') : (rtl ? 'تغییر به حالت تیره' : 'Switch to dark mode')}
            title={dark ? (rtl ? 'حالت روشن' : 'Light mode') : (rtl ? 'حالت تیره' : 'Dark mode')}
          >
            {dark ? <ZkSunIcon size={18} /> : <ZkMoonIcon size={18} />}
          </button>

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
