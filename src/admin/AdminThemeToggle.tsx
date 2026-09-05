/**
 * Zeynalikid Admin — دکمه تغییر تم (وایت/دارک مود) هدر پنل مدیریت
 * بازطراحی با الهام از نمونه «change theme button»:
 *  • کپسول لغزنده با «صورت» خورشید/ماه که با چرخش و محو نرم جابه‌جا می‌شود.
 *  • در حالت تیره: هاله نیلی نرم + ستاره‌های چشمک‌زن داخل کپسول.
 *  • کاملاً event-driven و سبک (فقط transform/opacity) — بدون وابستگی خارجی.
 *  • احترام کامل به prefers-reduced-motion.
 * تمام رنگ‌های روز از توکن‌های --zkad-* گرفته می‌شوند تا با تم پنل هماهنگ بمانند.
 */
import React from 'react';
import { zkAlert, zkConfirm } from '../components/ZkDialog';

interface Props {
  dark: boolean;
  onToggle: () => void;
  rtl: boolean;
}

export default function AdminThemeToggle({ dark, onToggle, rtl }: Props) {
  const label = dark ? (rtl ? 'تغییر به حالت روشن' : 'Switch to light mode') : (rtl ? 'تغییر به حالت تیره' : 'Switch to dark mode');
  const title = dark ? (rtl ? 'حالت روشن' : 'Light mode') : (rtl ? 'حالت تیره' : 'Dark mode');

  return (
    <button
      type="button"
      className={`zkth-toggle${dark ? ' zkth-dark' : ''}`}
      onClick={onToggle}
      aria-pressed={dark}
      aria-label={label}
      title={title}
    >
      <style>{`
        .zkth-toggle{border:0;background:transparent;padding:0;cursor:pointer;direction:ltr;-webkit-tap-highlight-color:transparent;border-radius:999px}
        .zkth-toggle:focus-visible{outline:2px solid var(--zkad-accent2);outline-offset:2px}
        .zkth-socket{position:relative;display:block;width:64px;height:34px;border-radius:999px;background:var(--zkad-inp);border:1px solid var(--zkad-brd-strong);box-shadow:inset 0 1px 3px rgba(15,23,42,.10),var(--zkad-shadow-sm);transition:background .4s var(--zkad-ease),border-color .4s var(--zkad-ease),box-shadow .4s var(--zkad-ease)}
        .zkth-face{position:absolute;top:50%;left:4px;transform:translateY(-50%);width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#FFE08A,#F59E0B);color:#7C2D12;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.28),inset 0 1px 1px rgba(255,255,255,.55);transition:transform .45s cubic-bezier(.34,1.4,.64,1),background .45s var(--zkad-ease),color .45s var(--zkad-ease),box-shadow .45s var(--zkad-ease)}
        .zkth-dark .zkth-socket{background:linear-gradient(135deg,#1E293B,#111827);border-color:rgba(99,102,241,.5);box-shadow:inset 0 1px 4px rgba(0,0,0,.6),0 0 0 1px rgba(99,102,241,.15)}
        .zkth-dark .zkth-face{transform:translateY(-50%) translateX(30px);background:linear-gradient(135deg,#818CF8,#4F46E5);color:#E0E7FF;box-shadow:0 0 0 3px rgba(99,102,241,.25),0 0 14px rgba(99,102,241,.55),0 2px 8px rgba(0,0,0,.45)}
        .zkth-icon{position:absolute;display:flex;transition:transform .45s cubic-bezier(.34,1.4,.64,1),opacity .35s ease}
        .zkth-sun{opacity:1;transform:rotate(0deg) scale(1)}
        .zkth-moon{opacity:0;transform:rotate(-90deg) scale(.35)}
        .zkth-dark .zkth-sun{opacity:0;transform:rotate(90deg) scale(.35)}
        .zkth-dark .zkth-moon{opacity:1;transform:rotate(0deg) scale(1)}
        .zkth-stars{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .4s ease .05s}
        .zkth-dark .zkth-stars{opacity:1}
        .zkth-stars i{position:absolute;width:3px;height:3px;border-radius:50%;background:#C7D2FE;box-shadow:0 0 4px rgba(199,210,254,.9);animation:zkth-twinkle 2.6s ease-in-out infinite}
        .zkth-stars i:nth-child(1){top:7px;left:12px;animation-delay:0s}
        .zkth-stars i:nth-child(2){top:20px;left:19px;width:2px;height:2px;animation-delay:.8s}
        .zkth-stars i:nth-child(3){top:9px;left:22px;width:2px;height:2px;animation-delay:1.6s}
        @keyframes zkth-twinkle{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1.25)}}
        @-webkit-keyframes zkth-twinkle{0%,100%{opacity:.2;-webkit-transform:scale(.7)}50%{opacity:1;-webkit-transform:scale(1.25)}}
        @media (prefers-reduced-motion: reduce){
          .zkth-face,.zkth-icon,.zkth-socket{transition:none!important}
          .zkth-stars i{animation:none!important;-webkit-animation:none!important}
        }
      `}</style>
      <span className="zkth-socket" aria-hidden="true">
        <span className="zkth-stars"><i /><i /><i /></span>
        <span className="zkth-face">
          <span className="zkth-icon zkth-sun">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
            </svg>
          </span>
          <span className="zkth-icon zkth-moon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />
            </svg>
          </span>
        </span>
      </span>
    </button>
  );
}
