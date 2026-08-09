import React from 'react';

type IconProps = { size?: number; color?: string; style?: React.CSSProperties; className?: string };

const base = (size:number)=>({ width:size, height:size, display:'inline-block', verticalAlign:'middle', flexShrink:0 });

export const MenuIcon = ({size=22,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={{...base(size),...style}} aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

// اصلاح ۱۳: آیکون خانه برای منوی همبرگری
export const HomeIcon = ({size=18,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

export const ConsultIcon = ({size=18,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);

export const CoursesIcon = ({size=18,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);

export const VideoIcon = ({size=18,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <polygon points="23 7 16 12 23 17 23 7" fill={color} stroke="none" opacity="0.9"/>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
);

export const LicensesIcon = ({size=18,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <circle cx="12" cy="8" r="6"/>
    <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>
  </svg>
);

export const EducationIcon = ({size=18,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M12 6.5C10.2 4.9 7.6 4 4.5 4c-.8 0-1.5.7-1.5 1.5v12c0 .9.7 1.5 1.5 1.5 3.1 0 5.7.9 7.5 2.5 1.8-1.6 4.4-2.5 7.5-2.5.8 0 1.5-.6 1.5-1.5v-12c0-.8-.7-1.5-1.5-1.5-3.1 0-5.7.9-7.5 2.5z"/>
    <path d="M12 6.5v15"/>
  </svg>
);

export const AboutIcon = ({size=18,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

export const ContactIcon = ({size=18,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

export const TrackIcon = ({size=18,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

// اصلاح ۱۰: آیکون سوالات متداول (FAQ) — حباب گفتگو بدون علامت سوال
export const FAQIcon = ({size=16,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
);

export const AdminIcon = ({size=16,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

export const AudioIcon = ({size=18,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill={color} stroke="none" style={{...base(size),...style}} aria-hidden="true">
    <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/>
  </svg>
);

export const PhotoIcon = ({size=18,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5" fill={color} stroke="none"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

export const TextIcon = ({size=18,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <polyline points="4 7 4 4 20 4 20 7"/>
    <line x1="9" y1="20" x2="15" y2="20"/>
    <line x1="12" y1="4" x2="12" y2="20"/>
  </svg>
);

export const PhoneIcon = ({size=16,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
    <line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
);

export const PinIcon = ({size=16,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <line x1="12" y1="17" x2="12" y2="22"/>
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
  </svg>
);

export const MedicalIcon = ({size=18,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1.17a.3.3 0 0 0-.2.08L5 7.25"/>
    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
    <circle cx="20" cy="10" r="2"/>
    <path d="M8 15v-1a6 6 0 0 1 6-6"/>
  </svg>
);

export const SearchIcon = ({size=16,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

export const ChatIcon = ({size=14,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

// Fallback simple dot
export const DotIcon = ({size=14,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill={color} style={{...base(size),...style}} aria-hidden="true">
    <circle cx="12" cy="12" r="5"/>
  </svg>
);

// اصلاح ۸: وکتورهای مرتبط با محصولات (جایگزین ایموجی در طریقه مصرف مکمل‌ها)
export const DrinkIcon = ({size=18,color='currentColor',style}:IconProps)=>( // داینامین/نوشیدنی
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M8 2h8l-1 4H9z"/>
    <path d="M8 6l1.2 13.2A2 2 0 0 0 11.2 21h1.6a2 2 0 0 0 2-1.8L16 6"/>
    <line x1="7.5" y1="13" x2="16.5" y2="13"/>
  </svg>
);
export const ProteinBarIcon = ({size=18,color='currentColor',style}:IconProps)=>( // پروتئین‌بار
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <rect x="2" y="8" width="20" height="8" rx="2" ry="2"/>
    <line x1="7" y1="8" x2="7" y2="16"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="17" y1="8" x2="17" y2="16"/>
  </svg>
);
export const DateFruitIcon = ({size=18,color='currentColor',style}:IconProps)=>( // خرما
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <ellipse cx="12" cy="13" rx="6" ry="8"/>
    <path d="M12 5c1-2 3-3 5-3"/>
  </svg>
);
export const CandyIcon = ({size=18,color='currentColor',style}:IconProps)=>( // لوکوم
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M8 8h8v8H8z"/>
    <path d="M8 10 3 7v10l5-3"/><path d="M16 10l5-3v10l-5-3"/>
  </svg>
);
export const TeaIcon = ({size=18,color='currentColor',style}:IconProps)=>( // ماچا
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M3 8h14v5a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/>
    <path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/>
    <line x1="7" y1="3" x2="7" y2="6"/><line x1="11" y1="3" x2="11" y2="6"/>
  </svg>
);
export const HoneyIcon = ({size=18,color='currentColor',style}:IconProps)=>( // عسل
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M7 3h10l1 4-1 4H7L6 7z"/>
    <path d="M6 11h12v6a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z"/>
    <line x1="6" y1="15" x2="18" y2="15"/>
  </svg>
);
export const CoffeeIcon = ({size=18,color='currentColor',style}:IconProps)=>( // قهوه
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M4 9h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/>
    <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/>
    <path d="M6 3c0 1-1 1-1 2s1 1 1 2M11 3c0 1-1 1-1 2s1 1 1 2"/>
  </svg>
);
export const BranIcon = ({size=18,color='currentColor',style}:IconProps)=>( // سبوس
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M12 2v20"/>
    <path d="M12 4c2 1 3 3 3 5s-1 4-3 5"/>
    <path d="M12 4c-2 1-3 3-3 5s1 4 3 5"/>
    <path d="M12 12c2 1 3 3 3 5"/>
    <path d="M12 12c-2 1-3 3-3 5"/>
  </svg>
);
// اصلاح ۲۲: آیکون محصولات برای منوی همبرگری
export const ProductsIcon = ({size=18,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

export const BoxIcon = ({size=18,color='currentColor',style}:IconProps)=>( // پیش‌فرض محصول (بدون آیکون مرتبط)
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M21 8 12 3 3 8v8l9 5 9-5z"/>
    <path d="M3 8l9 5 9-5"/><line x1="12" y1="13" x2="12" y2="21"/>
  </svg>
);

// اصلاح ۸: نگاشت ایموجی محصول به وکتور مرتبط — در صورت نبود مورد مشابه، مقدار null برمی‌گردد (ایموجی اصلی باقی می‌ماند)
export function productVectorIcon(icon?: string): React.ComponentType<IconProps> | null {
  switch (icon) {
    case 'drink': return DrinkIcon;
    case '': return ProteinBarIcon;
    case '': return DateFruitIcon;
    case '': return CandyIcon;
    case '': return TeaIcon;
    case '': return HoneyIcon;
    case '': return CoffeeIcon;
    case '': return BranIcon;
    case '': return BoxIcon;
    default: return null;
  }
}

// اصلاح ۵: بهبود وکتورهای بخش «خدمات ما» — خطوط یکدست‌تر، گوشه‌های گردتر و جزئیات بیشتر
export const ServiceNutritionIcon = ({size=22,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M12 2.5C9.5 2.5 7.5 5 7.5 8c0 1.8.7 2.8 1 4.5v8h7v-8c.3-1.7 1-2.7 1-4.5 0-3-2-5.5-4.5-5.5z" opacity="0.95"/>
    <line x1="9.5" y1="12" x2="14.5" y2="12"/>
    <path d="M10 16.5h4" strokeOpacity="0.6"/>
  </svg>
);
export const ServiceExerciseIcon = ({size=22,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M5 9h3a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/>
    <path d="M16 9h3a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/>
    <line x1="10" y1="11" x2="14" y2="11" strokeOpacity="0.6"/>
    <line x1="10" y1="13" x2="14" y2="13" strokeOpacity="0.6"/>
  </svg>
);
export const ServiceTemperamentIcon = ({size=22,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <circle cx="12" cy="9.5" r="6.5"/>
    <path d="M9.5 9.5c0 2.5 1.8 5.5 3.5 5.5s2.5-2.5 2.5-5.5" strokeOpacity="0.8"/>
    <circle cx="9.5" cy="8.5" r="1" fill={color} stroke="none"/>
    <circle cx="14.5" cy="8.5" r="1" fill={color} stroke="none"/>
  </svg>
);
export const ServiceEmpowerIcon = ({size=22,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <circle cx="12" cy="7.5" r="3.5"/>
    <path d="M6.5 20.5c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" strokeOpacity="0.9"/>
    <path d="M12 15v2.5" strokeOpacity="0.6"/>
    <path d="M16 10l2.5-2.5" strokeOpacity="0.6"/>
  </svg>
);
export const ServiceGrowthIcon = ({size=22,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <polyline points="3 18 9 12 13 16 21 7"/>
    <polyline points="16 7 21 7 21 12"/>
    <circle cx="21" cy="7" r="1.5" fill={color} stroke="none"/>
  </svg>
);
export const ServiceHeightIcon = ({size=22,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <line x1="12" y1="20" x2="12" y2="4"/>
    <polyline points="7 9 12 4 17 9"/>
    <line x1="7" y1="20" x2="17" y2="20"/>
    <line x1="7" y1="16" x2="10" y2="16" strokeOpacity="0.6"/>
    <line x1="14" y1="16" x2="17" y2="16" strokeOpacity="0.6"/>
  </svg>
);
export const ServiceAppetiteIcon = ({size=22,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M5 3.5v7a3.5 3.5 0 0 0 3.5 3.5h0"/>
    <path d="M5 3.5v11"/>
    <path d="M9 3.5c2 0 3.5 2.5 3.5 5.5s-1.5 5-3.5 5"/>
    <path d="M13 3.5v16"/>
    <path d="M17 3.5v16"/>
  </svg>
);
export const ServiceWeightIcon = ({size=22,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <circle cx="12" cy="13.5" r="7"/>
    <path d="M12 13.5V9"/>
    <path d="M12 9l2.5-3"/>
    <path d="M9 5.5h6l-1 2.5H10z"/>
    <circle cx="12" cy="13.5" r="1.5" fill={color} stroke="none"/>
  </svg>
);
export const ServiceBrainIcon = ({size=22,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M9.5 2.5a3.5 3.5 0 0 0-3.5 3.5v1a3.5 3.5 0 0 0-2 3.5 3.5 3.5 0 0 0 1 6 3.5 3.5 0 0 0 3.5 3.5h1a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 0 0-3.5-3.5z"/>
    <path d="M14.5 2.5a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1 2 3.5 3.5 3.5 0 0 1-1 6 3.5 3.5 0 0 1-3.5 3.5h-1a3.5 3.5 0 0 1-3.5-3.5V6a3.5 3.5 0 0 1 3.5-3.5z"/>
    <line x1="12" y1="8" x2="12" y2="11" strokeOpacity="0.6"/>
  </svg>
);
export const ServiceImmunityIcon = ({size=22,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M12 2.5l7 3v5.5c0 4.5-3 7.5-7 10-4-2.5-7-5.5-7-10V5.5z"/>
    <polyline points="9 12 11 14 15 10"/>
    <path d="M12 5.5v2" strokeOpacity="0.6"/>
  </svg>
);
export const ServiceSleepIcon = ({size=22,color='currentColor',style}:IconProps)=>(
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{...base(size),...style}} aria-hidden="true">
    <path d="M21 12.5a8.5 8.5 0 1 1-9.5-8.5 7 7 0 0 0 9.5 8.5z"/>
    <path d="M6 8a2 2 0 0 0 0 4" strokeOpacity="0.6"/>
    <path d="M17 17a2 2 0 0 0 0 4" strokeOpacity="0.6"/>
  </svg>
);

export default {
  MenuIcon, ConsultIcon, CoursesIcon, VideoIcon, LicensesIcon,
  EducationIcon, AboutIcon, ContactIcon, TrackIcon, AdminIcon, FAQIcon,
  AudioIcon, PhotoIcon, TextIcon, PhoneIcon, PinIcon, MedicalIcon, SearchIcon, ChatIcon,
  DrinkIcon, ProteinBarIcon, DateFruitIcon, CandyIcon, TeaIcon, HoneyIcon, CoffeeIcon, BranIcon, BoxIcon, productVectorIcon,
  ServiceNutritionIcon, ServiceExerciseIcon, ServiceTemperamentIcon, ServiceEmpowerIcon, ServiceGrowthIcon, ServiceHeightIcon, ServiceAppetiteIcon, ServiceWeightIcon, ServiceBrainIcon, ServiceImmunityIcon, ServiceSleepIcon
};


export const BellIcon = ({size=22,color='currentColor',style}:IconProps)=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle',flexShrink:0,...style}} aria-hidden="true">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
