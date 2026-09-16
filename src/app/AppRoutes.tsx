import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppContextProvider, type AppContextValue, type AppUIValue, type AppFlowValue, type AppAdminValue } from './AppContext';

const HomePage = lazy(() => import('../pages/HomePage'));
const CoursesPage = lazy(() => import('../pages/CoursesPage'));
const ChildInfoPage = lazy(() => import('../pages/ChildInfoPage'));
const CourseShippingPage = lazy(() => import('../pages/CourseShippingPage'));
const CoursePaymentPage = lazy(() => import('../pages/CoursePaymentPage'));
const PaymentVerifyPage = lazy(() => import('../pages/PaymentVerifyPage'));
const CourseConfirmPage = lazy(() => import('../pages/CourseConfirmPage'));
const CourseDonePage = lazy(() => import('../pages/CourseDonePage'));
const AdminLoginPage = lazy(() => import('../pages/AdminLoginPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const PrivacyPage = lazy(() => import('../pages/PrivacyPage'));
const AdminPanel = lazy(() => import('../admin/AdminPanel'));
const ExperiencePage = lazy(() => import('../pages/InfoPages').then((module) => ({ default: module.ExperiencePage })));
const LicensesPage = lazy(() => import('../pages/InfoPages').then((module) => ({ default: module.LicensesPage })));
const EducationPage = lazy(() => import('../pages/InfoPages').then((module) => ({ default: module.EducationPage })));
const AboutPage = lazy(() => import('../pages/InfoPages').then((module) => ({ default: module.AboutPage })));
const ContactPage = lazy(() => import('../pages/InfoPages').then((module) => ({ default: module.ContactPage })));
const FAQPage = lazy(() => import('../pages/FAQPage'));
const ProductsPage = lazy(() => import('../pages/ProductsPage'));
const UserPortalPage = lazy(() => import('../pages/UserPortalPage'));
const ConsultationPage = lazy(() => import('../pages/ConsultationPage'));
const GrowthChartPage = lazy(() => import('../pages/GrowthChartPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));

interface AppRoutesProps {
  app: AppContextValue;
  ui: AppUIValue;
  flow: AppFlowValue;
  admin: AppAdminValue;
  adminAuthed: boolean;
  referralReady: boolean;
  referralConsultant: unknown;
}

export default function AppRoutes({ app, ui, flow, admin, adminAuthed, referralReady, referralConsultant }: AppRoutesProps) {
  // مسیر ورودی سایت یکتاست: /profile = پنل کاربر (ورود/ثبت‌نام والد).
  // مسیر قدیمی /track (پیگیری دوره) حذف شده و اکنون ۴۰۴ می‌دهد.
  // /portal برای لینک‌های قدیمی به /profile منتقل می‌شود.
  const fallback = <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--zk-text-muted, #4B5563)', fontSize: 14 }}>در حال بارگذاری...</div>;
  return (
    <AppContextProvider value={app} ui={ui} flow={flow} admin={admin}>
      <Suspense fallback={fallback}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/:refCode" element={!referralReady ? null : (referralConsultant ? <HomePage /> : <NotFoundPage />)} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/child-info" element={<ChildInfoPage />} />
          <Route path="/course-shipping" element={<CourseShippingPage />} />
          <Route path="/course-payment" element={<CoursePaymentPage />} />
          <Route path="/course-payment/verify" element={<PaymentVerifyPage />} />
          <Route path="/course-confirm" element={<CourseConfirmPage />} />
          <Route path="/course-done" element={<CourseDonePage />} />
          <Route path="/profile" element={<UserPortalPage />} />
          <Route path="/portal" element={<Navigate to="/profile" replace />} />
          <Route path="/growth" element={<GrowthChartPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/experience" element={<ExperiencePage />} />
          <Route path="/licenses" element={<LicensesPage />} />
          <Route path="/education/:slug" element={<EducationPage />} />
          <Route path="/education" element={<EducationPage />} />
          <Route path="/courses/:slug" element={<CoursesPage />} />
          <Route path="/products/:slug" element={<ProductsPage />} />
          <Route path="/courses/:slug" element={<CoursesPage />} />
          <Route path="/products/:slug" element={<ProductsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/form" element={<ConsultationPage />} />
          <Route path="/consultation" element={<ConsultationPage />} />
          {/* R21: ورود و پنل مدیریت در مسیر بی‌نام (desk) — هر آدرسِ حاوی admin از روتر حذف است؛ تایپِ مستقیمش با ۴۰ واقعیِ ایستا سرو می‌شود */}
          <Route path="/desk" element={<AdminLoginPage />} />
          <Route path="/desk/app" element={adminAuthed ? <AdminPanel /> : <Navigate to="/desk" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppContextProvider>
  );
}
