// src/sections/PageChrome.tsx
// Stage-3 refactor: سربرگ/منو/پس‌زمینه ممفیس/sliver زبان و سوییچ هدر که در
// return اصلی App.tsx قبل از {page} رندر می‌شد. تمام پروپ‌ها از بالا می‌آیند
// و state را تغییر نمی‌دهند تا رفتار کاملاً ثابت بماند.
import Header from '../components/Header';
import HamburgerMenu from '../components/HamburgerMenu';
import LanguageSwitcher from '../components/LanguageSwitcher';
import AssistantWidget from '../components/AssistantWidget';
import ErrorAlertHost from '../components/ErrorAlert/ErrorAlertHost';
import ZkDialog from '../components/ZkDialog';
import { MemphisBg } from '../app/appSupport';
import type { DynamicRecord } from '../app/AppContext';
import type { ParsedReferral } from '../utils/referral';

interface PageChromeProps {
  T: Record<string, any>;
  S: Record<string, any>;
  lang: 'fa' | 'en';
  view: string;
  showHeader: boolean;
  showMenu: boolean;
  showLangSwitcher: boolean;
  showAssistant: boolean;
  showMemphis: boolean;
  adminAuthed: boolean;
  cfg: DynamicRecord;
  setLang: (v: any) => void;
  setView: (v: string) => void;
  setAdminTab: (v: string) => void;
  setCourseTab: (v: string) => void;
  publicText: (k: string, fb?: string) => string;
  APP_B_URL: string;
  referralConsultant: DynamicRecord | null;
  referralTarget: ParsedReferral | null;
  findTabByCode: (tabs: DynamicRecord[], code: string) => DynamicRecord | undefined;
  requestConsult: () => void;
}

export default function PageChrome(props: PageChromeProps) {
  const {
    T, lang, view, showHeader, showMenu, showLangSwitcher, showAssistant, showMemphis,
    adminAuthed, cfg, setLang, setView, setAdminTab, setCourseTab,
    publicText, APP_B_URL, referralConsultant, referralTarget, findTabByCode, requestConsult,
  } = props;
  return (
    <>
      {showMemphis && <MemphisBg T={T} />}
      {showHeader && (
        <Header
          T={T} lang={lang} setLang={setLang} adminAuthed={adminAuthed}
          onAdminQuestions={() => { setView('admin'); setAdminTab('userQuestions'); }}
          portalMode={(cfg as any)?.entryMode !== 'track'}
          assistantSlot={!!showAssistant}
        />
      )}
      {!showHeader && showLangSwitcher && (
        <div style={{ position: 'fixed', left: 8, top: 8, zIndex: 1000 }}>
          <LanguageSwitcher lang={lang} setLang={setLang} T={T} />
        </div>
      )}
      {showMenu && (
        <HamburgerMenu
          T={T} lang={lang} setLang={setLang} cfg={cfg} publicText={publicText}
          APP_A_URL={APP_B_URL} setView={setView}
          referralConsultant={referralConsultant} referralTarget={referralTarget}
          findTabByCode={findTabByCode}
          onCoursesClick={() => {
            if (referralTarget?.tabCode) {
              const tab = findTabByCode(cfg.courseTabs || [], referralTarget.tabCode);
              if (tab) { setCourseTab(tab.id); setView('courses'); return; }
            }
            setView('courses');
          }}
          onConsultClick={() => { requestConsult(); }}
        />
      )}
      {showAssistant && <AssistantWidget T={T} lang={lang} />}
      <ErrorAlertHost cfg={cfg} lang={lang} />
      <ZkDialog />
    </>
  );
}
