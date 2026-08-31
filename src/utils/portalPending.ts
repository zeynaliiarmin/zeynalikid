// یادآوری کوتاه: کدام دوره پشتِ درِ ورود/ثبت‌نام مانده بود، تا بعد از ورود همان دوره ادامه پیدا کند
const KEY = 'zkid_portal_pending_register';
export function rememberPendingRegistration(id: string) { try { if (id) sessionStorage.setItem(KEY, id); } catch { /* بی‌خطر */ } }
export function takePendingRegistration(): string { try { const v = sessionStorage.getItem(KEY) || ''; if (v) sessionStorage.removeItem(KEY); return v; } catch { return ''; } }
