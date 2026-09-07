import { createContext, useContext, type ReactNode } from 'react';

// Settings and legacy content are schema-flexible at the application boundary. Keeping the
// escape hatch here prevents `any` from being repeated across every route while migrations
// progressively add stronger domain types.
export type DynamicRecord = Record<string, any>;

/** UI / palette / i18n / navigation — برای کامپوننت‌هایی که فقط رنگ، متن، زبان و
 *  ناوبری نیاز دارند. تغییر fd/course/admin این context را به‌روز نمی‌کند
 *  → re-render کمتر در Header/Menu/Footer که در همه صفحات هستند. */
export type AppUIValue = DynamicRecord & {
  cfg: DynamicRecord;
  T: DynamicRecord;
  TH: DynamicRecord;
  S: DynamicRecord;
  css: string;
  lang: 'fa' | 'en';
  setLang: (...a: any[]) => any;
  view: string;
  setView: (v: any) => void;
  publicText: (...a: any[]) => any;
  trVal: (...a: any[]) => any;
  publicDesign: string;
  publicColorMode: string;
  showContactOn: (...a: any[]) => any;
  APP_B_URL: string;
  APP_A_URL: string;
  goHome: (...a: any[]) => any;
  goToAppA: (...a: any[]) => any;
  // Shared atomic components (تابع/کامپوننت‌هایی که از appSupport آمده‌اند و در JSX استفاده می‌شوند)
  Modal: any;
  MiniIcon: any;
  Footer: any;
  ContactPanel: any;
  TrustRotator: any;
  MemphisBg: any;
  Field: any;
  SelectBox: any;
  Err: any;
  CountrySelect: any;
  Tag: any;
  Stepper: any;
};

/** State مربوط به روند فرم و دوره (fd, course, shipModal, courseResult, …).
 *  کامپوننت‌هایی که فقط UI می‌خوانند (هدر، فوتر، منو) این context را subscribe
 *  نمی‌کنند و با هر keystroke در فرم re-render نمی‌شوند. */
export type AppFlowValue = DynamicRecord & {
  // form draft
  fd: DynamicRecord;
  setFd: (...a: any[]) => any;
  // course enrollment
  course: DynamicRecord;
  setCourse: (...a: any[]) => any;
  courseResult: DynamicRecord | null;
  editChild: boolean;
  setEditChild: (...a: any[]) => any;
  shipModal: DynamicRecord | null;
  setShipModal: (...a: any[]) => any;
  courseTab: string;
  setCourseTab: (...a: any[]) => any;
  expandedCourse: DynamicRecord | null;
  setExpandedCourse: (...a: any[]) => any;
  activeTab: DynamicRecord | undefined;
  // course steps helpers
  chooseDest: (...a: any[]) => any;
  deliveryText: (...a: any[]) => any;
  validateOptionalDate: (...a: any[]) => any;
  finalizeCourseRegistration: (...a: any[]) => any;
  resetForm: (...a: any[]) => any;
  // referral
  referralConsultant: DynamicRecord | null;
  setReferralConsultant: (...a: any[]) => any;
  referralTarget: DynamicRecord | null;
  setReferralTarget: (...a: any[]) => any;
  referralConsultOpen: boolean;
  setReferralConsultOpen: (...a: any[]) => any;
  referralConsultReason: string;
  setReferralConsultReason: (...a: any[]) => any;
  referralConsultShowReason: boolean;
  setReferralConsultShowReason: (...a: any[]) => any;
  requestConsult: (...a: any[]) => any;
  startConsult: (...a: any[]) => any;
  consultPulse: number;
  findTabByCode: (...a: any[]) => any;
  // shared utilities used by course-flow pages
  countries: any;
  placeholder: any;
  PROFILE_PHOTO: string;
  phonePlaceholder: (...a: any[]) => any;
  validPhone: (...a: any[]) => any;
  fullPhone: (...a: any[]) => any;
  p2e: (...a: any[]) => any;
  fileToData: (...a: any[]) => any;
  deleteStoredImage: (...a: any[]) => any;
  uploadPdfFile: (...a: any[]) => any;
  deleteStoredFile: (...a: any[]) => any;
  uploadTonguePhoto: (...a: any[]) => any;
  deleteStoredTonguePhoto: (...a: any[]) => any;
  uploadReceiptWithProgress: (...a: any[]) => any;
  uploadVoiceNote: (...a: any[]) => any;
};

/** State مربوط به ورود و پنل مدیریت. فقط کامپوننت‌های مدیریت و روت محافظ
 *  به این نیاز دارند. صفحات عمومی این context را نمی‌خوانند. */
export type AppAdminValue = DynamicRecord & {
  adminAuthed: boolean;
  adminTab: string;
  setAdminTab: (...a: any[]) => any;
  onLogout: (...a: any[]) => any;
};

/**
 * نوع کامل context — همان `AppContextValue` قبلی با حفظ سازگاری.
 * همچنان در App.tsx به‌صورت یک آبجکت ساخته می‌شود ولی سه Provider جداگانه
 * ارائه می‌دهیم.
 */
export type AppContextValue = AppUIValue & AppFlowValue & AppAdminValue & DynamicRecord;

// ─── Contexts ───
const AppContext = createContext<AppContextValue | null>(null);
const AppUIContext = createContext<AppUIValue | null>(null);
const AppFlowContext = createContext<AppFlowValue | null>(null);
const AppAdminContext = createContext<AppAdminValue | null>(null);

/**
 * Provider واحد که یک value می‌گیرد و آن را در سه context جدا می‌ریزد.
 * نکته: خود value مثل قبل یک آبجکت تکی است (که در App.tsx در هر رندر تازه
 * می‌شود)؛ اما جدا بودن contextها سبب می‌شود subscribe به یکی از آن‌ها
 * وقتی که فقط فیلدهای مربوط به بقیه عوض شده‌اند re-render ندهد — البته به
 * شرطی که consumer از selector یا useMemo درست استفاده کند و آبجکت value
 * خودش به سه زیرآبجکت memo شده تقسیم شود. در App.tsx این تقسیم را با
 * useMemo انجام می‌دهیم.
 */
export function AppContextProvider({
  value,
  ui,
  flow,
  admin,
  children,
}: {
  value: AppContextValue;
  ui: AppUIValue;
  flow: AppFlowValue;
  admin: AppAdminValue;
  children: ReactNode;
}) {
  return (
    <AppContext.Provider value={value}>
      <AppUIContext.Provider value={ui}>
        <AppFlowContext.Provider value={flow}>
          <AppAdminContext.Provider value={admin}>
            {children}
          </AppAdminContext.Provider>
        </AppFlowContext.Provider>
      </AppUIContext.Provider>
    </AppContext.Provider>
  );
}

// ─── Hooks ───
/** Hook قدیمی — بدون تغییر می‌ماند تا همه ۵۰ مصرف‌کنندهٔ موجود به کار
 *  خودشان ادامه دهند. کامپوننت‌های جدید می‌توانند از hook های اختصاصی زیر
 *  استفاده کنند تا re-render کمتری بدهند. */
export function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppContext is unavailable outside AppContextProvider.');
  return value;
}

export function useAppUI(): AppUIValue {
  const v = useContext(AppUIContext);
  if (!v) throw new Error('AppUIContext is unavailable outside AppContextProvider.');
  return v;
}

export function useAppFlow(): AppFlowValue {
  const v = useContext(AppFlowContext);
  if (!v) throw new Error('AppFlowContext is unavailable outside AppContextProvider.');
  return v;
}

export function useAppAdmin(): AppAdminValue {
  const v = useContext(AppAdminContext);
  if (!v) throw new Error('AppAdminContext is unavailable outside AppContextProvider.');
  return v;
}
