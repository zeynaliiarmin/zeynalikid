/**
 * Zeynalikid Admin — Stage 7A
 * SVG icon set for the admin panel (replaces every emoji).
 * Stroke-based, currentColor, dense 24-grid. RTL-safe (no direction baked in).
 */
import React from 'react';

export interface ZkIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  className?: string;
}

function make(path: React.ReactNode, filled = false) {
  return function ZkIcon({ size = 18, color = 'currentColor', strokeWidth = 1.8, style, className }: ZkIconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? color : 'none'}
        stroke={filled ? 'none' : color}
        strokeWidth={filled ? 0 : strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
        aria-hidden="true"
        focusable="false"
      >
        {path}
      </svg>
    );
  };
}

/* ── ناوبری (منوی اصلی) ─────────────────────────────────────────── */
export const ZkDashboardIcon = make(<><rect x="3" y="3" width="7.5" height="9" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="1.6"/><rect x="13.5" y="12" width="7.5" height="9" rx="1.6"/><rect x="3" y="15.5" width="7.5" height="5.5" rx="1.6"/></>);
export const ZkUsersIcon = make(<><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.8" cy="9.5" r="2.4"/><path d="M16.5 14.6c2.2.3 3.6 1.8 4 4"/></>);
export const ZkCoursesIcon = make(<><path d="M12 4 2.8 8.3 12 12.6l9.2-4.3L12 4z"/><path d="M6.5 10.6v4.6c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-4.6"/><path d="M21.2 8.3v5"/></>);
export const ZkProductsIcon = make(<><path d="M12 3 4 7v10l8 4 8-4V7l-8-4z"/><path d="M4 7l8 4 8-4"/><path d="M12 11v10"/></>);
export const ZkReviewsIcon = make(<><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.4A8.5 8.5 0 1 1 21 11.5z"/><path d="M12 8.2l1.1 2.2 2.4.4-1.7 1.7.4 2.4-2.2-1.1-2.2 1.1.4-2.4-1.7-1.7 2.4-.4L12 8.2z"/></>);
export const ZkOrdersIcon = make(<><circle cx="9" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/><path d="M2.5 3.5h2.6l2.5 12h11l2.4-8.5H6"/></>);
export const ZkContentIcon = make(<><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></>);
export const ZkSettingsIcon = make(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.7 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.7.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5h.1a1.6 1.6 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.7v.1a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1z"/></>);
export const ZkTrashIcon = make(<><path d="M3.5 6.5h17"/><path d="M8.5 6.5v-2a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v2"/><path d="M5.5 6.5 6.4 19a2 2 0 0 0 2 1.9h7.2a2 2 0 0 0 2-1.9l.9-12.5"/><path d="M10 11v5.5M14 11v5.5"/></>);

/* ── هدر ─────────────────────────────────────────────────────────── */
export const ZkBellIcon = make(<><path d="M18 8.5a6 6 0 1 0-12 0c0 6.5-2.5 8-2.5 8h17s-2.5-1.5-2.5-8"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/></>);
export const ZkSunIcon = make(<><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></>);
export const ZkMoonIcon = make(<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/>);
export const ZkLogoutIcon = make(<><path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M9 8l-4 4 4 4"/><path d="M5 12h11"/></>);
export const ZkMenuIcon = make(<><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>);
export const ZkCloseIcon = make(<><path d="M6 6l12 12"/><path d="M18 6 6 18"/></>);
export const ZkHomeIcon = make(<><path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1h4v-6h3v6h4a1 1 0 0 0 1-1V9.5"/></>);

/* ── ابزار عمومی (جایگزین emoji) ────────────────────────────────── */
export const ZkChevronDownIcon = make(<path d="m6 9.5 6 6 6-6"/>);
export const ZkChevronUpIcon = make(<path d="m6 14.5 6-6 6 6"/>);
export const ZkChevronStartIcon = make(<path d="m14.5 6-6 6 6 6"/>);   /* اشاره به چپ — مناسب RTL برای «مشاهده» */
export const ZkArrowUpIcon = make(<><path d="M12 20V5"/><path d="m5.5 11.5 6.5-6.5 6.5 6.5"/></>);
export const ZkArrowDownIcon = make(<><path d="M12 4v15"/><path d="m5.5 12.5 6.5 6.5 6.5-6.5"/></>);
export const ZkCheckIcon = make(<path d="m4.5 12.5 5 5L19.5 7"/>);
export const ZkCheckCircleIcon = make(<><circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.7L16 9.5"/></>);
export const ZkXCircleIcon = make(<><circle cx="12" cy="12" r="9"/><path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6"/></>);
export const ZkInfoIcon = make(<><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.6h.01"/></>);
export const ZkWarnIcon = make(<><path d="M10.3 3.9 2.6 17.5a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4"/><path d="M12 16.8h.01"/></>);
export const ZkEyeIcon = make(<><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></>);
export const ZkEyeOffIcon = make(<><path d="M4 4l16 16"/><path d="M9.9 5.2A9.4 9.4 0 0 1 12 5c6 0 9.5 7 9.5 7a16.3 16.3 0 0 1-2.7 3.6M6.1 6.8A16 16 0 0 0 2.5 12S6 19 12 19a9 9 0 0 0 3.9-.9"/><path d="M9.9 9.9a2.8 2.8 0 0 0 4 4"/></>);
export const ZkCameraIcon = make(<><path d="M4 7.5h3l1.5-2.3h7L17 7.5h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5z"/><circle cx="12" cy="13" r="3.2"/></>);
export const ZkDocIcon = make(<><path d="M14 2.5H6.5A1.5 1.5 0 0 0 5 4v16a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20V7.5L14 2.5z"/><path d="M14 2.5V7.5H19"/><path d="M8.5 12.5h7M8.5 16h7"/></>);
export const ZkMoneyIcon = make(<><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9"/><path d="M15 9.6c-.7-1-1.8-1.4-3-1.4-1.7 0-3 .9-3 2.2 0 3 6 1.5 6 4.3 0 1.3-1.3 2.2-3 2.2-1.3 0-2.4-.5-3-1.5"/></>);
export const ZkCalendarIcon = make(<><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4M16 3v4M3.5 10.5h17"/></>);
export const ZkPillIcon = make(<><path d="m10.5 3.5 10 10a5 5 0 0 1-7 7l-10-10a5 5 0 0 1 7-7z"/><path d="m7 7 7 7"/></>);
export const ZkStethoscopeIcon = make(<><path d="M5 3v6a5 5 0 0 0 10 0V3"/><path d="M10 14v2.5a4.5 4.5 0 0 0 9 0V14"/><circle cx="19" cy="11.5" r="2.2"/></>);
export const ZkImageIcon = make(<><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 15.5-4.5-4.5-9 8.5"/></>);
export const ZkVideoIcon = make(<><rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="m15.5 11 6-3.5v9l-6-3.5"/></>);
export const ZkAudioIcon = make(<><path d="M12 3a7 7 0 0 0-7 7v3.5"/><path d="M12 3a7 7 0 0 1 7 7v3.5"/><rect x="3.5" y="13" width="4" height="7" rx="1.8"/><rect x="16.5" y="13" width="4" height="7" rx="1.8"/></>);
export const ZkLinkIcon = make(<><path d="M10 14a5 5 0 0 0 7.1 0l2.4-2.4a5 5 0 0 0-7-7.1L11 6"/><path d="M14 10a5 5 0 0 0-7.1 0l-2.4 2.4a5 5 0 0 0 7 7.1L13 18"/></>);
export const ZkCardIcon = make(<><rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19"/><path d="M6 14.5h4"/></>);
export const ZkPaletteIcon = make(<><path d="M12 21.5a9.5 9.5 0 1 1 9.5-9.5c0 2-1.5 3-3 3h-2a2.5 2.5 0 0 0-2 4c.5.8 0 2.5-2.5 2.5z"/><circle cx="7.5" cy="10.5" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="16.5" cy="10.5" r="1.2"/></>);
export const ZkBookIcon = make(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2.5H6.5A2.5 2.5 0 0 0 4 5v14.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></>);
export const ZkGlobeIcon = make(<><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14.5 14.5 0 0 1 0 18 14.5 14.5 0 0 1 0-18z"/></>);
export const ZkPhoneIcon = make(<path d="M21 16.5v3a1.5 1.5 0 0 1-1.7 1.5A19 19 0 0 1 3 4.7 1.5 1.5 0 0 1 4.5 3h3A1.5 1.5 0 0 1 9 4.3a12 12 0 0 0 .7 2.9 1.5 1.5 0 0 1-.4 1.6L8 10a16 16 0 0 0 6 6l1.2-1.3a1.5 1.5 0 0 1 1.6-.4 12 12 0 0 0 2.9.7 1.5 1.5 0 0 1 1.3 1.5z"/>);
export const ZkStarIcon = make(<path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8L12 3z"/>);
export const ZkTagIcon = make(<><path d="M3.5 12.5v-8a1 1 0 0 1 1-1h8L21 12l-8.5 8.5-9-8z"/><circle cx="8" cy="8" r="1.4"/></>);
export const ZkCopyIcon = make(<><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5.5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5v1"/></>);
export const ZkResetIcon = make(<><path d="M3.5 5v5h5"/><path d="M4.3 13.5a8 8 0 1 0 1.2-6.2L3.5 10"/></>);
export const ZkShieldIcon = make(<><path d="M12 2.5 4.5 5.5v6c0 4.5 3 8 7.5 10 4.5-2 7.5-5.5 7.5-10v-6L12 2.5z"/><path d="m8.8 11.8 2.3 2.3 4.2-4.5"/></>);
export const ZkChartIcon = make(<><path d="M3.5 3.5V20a.5.5 0 0 0 .5.5h16.5"/><path d="M8 16v-5M12.5 16V7.5M17 16v-3"/></>);
export const ZkPlusIcon = make(<><path d="M12 5v14"/><path d="M5 12h14"/></>);
export const ZkDownloadIcon = make(<><path d="M12 3.5V15"/><path d="m7 10.5 5 5 5-5"/><path d="M4 20.5h16"/></>);
export const ZkSendIcon = make(<><path d="m21.5 2.5-10 10"/><path d="M21.5 2.5 15 21.5l-3.5-9L2.5 9l19-6.5z"/></>);
export const ZkHeartIcon = make(<path d="M12 20.5S3.5 15 3.5 8.9A4.6 4.6 0 0 1 8.1 4.3 4.9 4.9 0 0 1 12 6.4a4.9 4.9 0 0 1 3.9-2.1 4.6 4.6 0 0 1 4.6 4.6C20.5 15 12 20.5 12 20.5z"/>);
export const ZkSearchIcon = make(<><circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.5-4.5"/></>);
export const ZkFilterIcon = make(<path d="M3 5h18l-7 8v5.5L10 21v-8L3 5z"/>);
export const ZkClockIcon = make(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>);
export const ZkTruckIcon = make(<><path d="M2.5 6h11v11h-11z"/><path d="M13.5 10h4l3 3v4h-7"/><circle cx="7" cy="18.5" r="1.8"/><circle cx="17" cy="18.5" r="1.8"/></>);
export const ZkUploadIcon = make(<><path d="M12 16V4"/><path d="m6.5 9.5 5.5-5.5 5.5 5.5"/><path d="M4 20h16"/></>);
export const ZkStaffIcon = make(<><circle cx="12" cy="8" r="3.4"/><path d="M5 20c.7-3.8 3.4-6 7-6s6.3 2.2 7 6"/><path d="M12 14v3"/><circle cx="12" cy="18.6" r="1.1"/></>);
