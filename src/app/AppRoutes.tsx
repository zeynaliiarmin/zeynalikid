import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppContextProvider, type AppContextValue } from './AppContext';

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
const TrackPage = lazy(() => import('../pages/TrackPage'));
const UserPortalPage = lazy(() => import('../pages/UserPortalPage'));
const ConsultationPage = lazy(() => import('../pages/ConsultationPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const GrowthChartPage = lazy(() => import('../pages/GrowthChartPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));

interface AppRoutesProps {
  app: AppContextValue;
  adminAuthed: boolean;
  referralReady: boolean;
  referralConsultant: unknown;
}

export default function AppRoutes({ app, adminAuthed, referralReady, referralConsultant }: AppRoutesProps) {
  // صفحهٔ ورودی سایت: از تنظیمات پنل مدیریت (entryMode) — «پیگیری دوره» یا «پنل کاربر»
  const portalMode = (app.cfg as any)?.entryMode === 'user';
  const entryPage = portalMode ? <UserPortalPage /> : <TrackPage />;
  const fallback = <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--zk-text-muted, #4B5563)', fontSize: 14 }}>در حال بارگذاری...</div>;
  return (
    <AppContextProvider value={app}>
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
          <Route path="/track" element={entryPage} />
          <Route path="/portal" element={entryPage} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/growth" element={<GrowthChartPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/experience" element={<ExperiencePage />} />
          <Route path="/licenses" element={<LicensesPage />} />
          <Route path="/education" element={<EducationPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/form" element={<ConsultationPage />} />
          <Route path="/consultation" element={<ConsultationPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={adminAuthed ? <AdminPanel /> : <Navigate to="/admin/login" replace />} />
          <Route path="/admin/app" element={adminAuthed ? <AdminPanel /> : <Navigate to="/admin/login" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppContextProvider>
  );
}
