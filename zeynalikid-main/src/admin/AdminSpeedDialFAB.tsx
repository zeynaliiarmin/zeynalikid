import React, { useState } from 'react';
import { ZkPlusIcon, ZkCoursesIcon, ZkProductsIcon, ZkCheckIcon } from './adminIcons';

export interface AdminSpeedDialFABProps {
  T: any;
  lang: 'fa' | 'en';
  onNavigate: (tab: string) => void;
  onSave?: () => void;
}

export default function AdminSpeedDialFAB({
  T,
  lang,
  onNavigate,
  onSave,
}: AdminSpeedDialFABProps) {
  const [open, setOpen] = useState(false);
  const isRtl = lang === 'fa';

  const items = [
    {
      id: 'faq',
      label: isRtl ? 'افزودن سوال متداول' : 'Add FAQ',
      icon: <ZkCoursesIcon size={16} />,
      onClick: () => {
        onNavigate('content');
        setOpen(false);
      },
    },
    {
      id: 'product',
      label: isRtl ? 'افزودن محصول' : 'Add Product',
      icon: <ZkProductsIcon size={16} />,
      onClick: () => {
        onNavigate('products');
        setOpen(false);
      },
    },
    {
      id: 'save',
      label: isRtl ? 'ذخیره تنظیمات' : 'Save Settings',
      icon: <ZkCheckIcon size={16} />,
      onClick: () => {
        if (onSave) onSave();
        setOpen(false);
      },
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        [isRtl ? 'left' : 'right']: 24,
        zIndex: 5000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: isRtl ? 'flex-start' : 'flex-end',
        gap: 10,
      }}
    >
      {open && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isRtl ? 'flex-start' : 'flex-end',
            gap: 8,
            marginBottom: 4,
            animation: 'fadeSlide .2s ease both',
          }}
        >
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={it.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 20,
                border: `1px solid ${T.brd}`,
                background: T.card,
                color: T.txt,
                fontSize: 13,
                fontWeight: 700,
                boxShadow: '0 8px 24px rgba(0,0,0,.15)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: T.acc }}>{it.icon}</span>
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={isRtl ? 'منوی سریع' : 'Speed dial'}
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          background: T.acc || '#0F766E',
          color: '#fff',
          border: 0,
          boxShadow: `0 4px 14px ${T.acc || '#0F766E'}55`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all .2s ease',
          transform: open ? 'rotate(45deg)' : 'none',
        }}
      >
        <ZkPlusIcon size={24} color="#fff" />
      </button>
    </div>
  );
}
