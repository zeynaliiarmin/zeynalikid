// /track — حالت قدیمی «پیگیری دوره» حذف شده است.
// این مسیر باید خطای واقعی ۴۰۴ برگرداند (نه پوستهٔ SPA)، تا هیچ صفحه‌ای با عنوان track باز نشود
// و موتورهای جستجو آن را از ایندکس خارج کنند.
import { renderNotFoundPage } from './referral/notFoundPage.js';

const BRAND = "زینالیکید";
const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || 'https://kkdrvexwzuuumjezipnd.supabase.co').replace(/\/$/, '');

export default function handler(request, response) {
  response.statusCode = 404;
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  response.end(renderNotFoundPage({ brand: BRAND, supabaseUrl: SUPABASE_URL, initialMode: 'auto' }));
}
