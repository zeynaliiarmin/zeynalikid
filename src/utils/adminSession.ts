const base = (import.meta.env.VITE_SUPABASE_URL as string || '').replace(/\/$/, '');
const endpoint = `${base}/functions/v1/admin-session`;
const TOKEN_KEY = 'zk_admin_session_token';
const DEVICE_KEY = 'zk_admin_device_id';
const AUTHED_KEY = 'zk_admin_authed';
const PASSWORD_UPGRADE_KEY='zk_admin_password_upgrade_required';
// نشست ادمین در localStorage ذخیره می‌شود (نه sessionStorage) تا هنگام ورود با
// Face ID / اثر انگشت یا پس از رفرش، نشست معتبر حفظ شود و به صفحه لاگین برنگردد.
const STORE: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = typeof localStorage !== 'undefined' ? localStorage : (typeof sessionStorage !== 'undefined' ? sessionStorage : ({ getItem: () => null, setItem: () => {}, removeItem: () => {} } as any));
const deviceInfo = () => ({
  device_name: `${navigator.platform || 'Device'} · ${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}`,
  platform: navigator.platform || 'Unknown',
  browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser',
  user_agent: navigator.userAgent,
});
export async function adminSessionAction(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || 'خطا در ارتباط با سرویس امنیت');
  return data;
}
export async function loginAdminSession(phone: string, password: string) {
  const data = await adminSessionAction('login', { phone, password, ...deviceInfo() });
  STORE.setItem(TOKEN_KEY, data.sessionToken);
  STORE.setItem(DEVICE_KEY, data.deviceId);
  STORE.setItem(AUTHED_KEY,'true');
  if(data?.mustChangePassword===true)STORE.setItem(PASSWORD_UPGRADE_KEY,'true');else STORE.removeItem(PASSWORD_UPGRADE_KEY);
  // زمان لاگین برای رد شدن از validate مجدد بلافاصله پس از ورود (کاهش تأخیر ورود به پنل)
  try { (typeof localStorage!=='undefined'?localStorage:STORE).setItem('zk_admin_login_at', String(Date.now())); } catch {}
  return data;
}
export const getAdminSessionToken = () => STORE.getItem(TOKEN_KEY) || '';
export const getAdminDeviceId = () => STORE.getItem(DEVICE_KEY) || '';
export const clearAdminSession=()=>{STORE.removeItem(TOKEN_KEY);STORE.removeItem(DEVICE_KEY);STORE.removeItem(AUTHED_KEY)};
export const isAdminPasswordUpgradeRequired=()=>STORE.getItem(PASSWORD_UPGRADE_KEY)==='true';

/**
 * Revoke ALL admin sessions (every device) via admin-session revoke_all action.
 * The current device's session is included in the revocation, so we also clear
 * local session state afterwards. Throws on failure so the UI can show a message.
 */
export async function revokeAllAdminSessions(): Promise<void> {
  const token = getAdminSessionToken();
  if (!token) return;
  const data = await adminSessionAction('revoke_all', { sessionToken: token });
  if (data?.revoked !== true) {
    throw new Error(data?.message || data?.error || 'خروج از همه نشست‌ها انجام نشد');
  }
  clearAdminSession();
}

/**
 * List active admin devices/sessions via admin-session list_devices action.
 * Returns an array of devices (id, device_name, platform, browser,
 * is_active, last_seen_at, ...). Throws on failure.
 */
export async function listAdminDevices(): Promise<any[]> {
  const token = getAdminSessionToken();
  if (!token) return [];
  const data = await adminSessionAction('list_devices', { sessionToken: token });
  return Array.isArray(data?.devices) ? data.devices : [];
}

/**
 * Revoke a single device session via admin-session revoke_device action.
 * Throws on failure so the UI can show a message.
 */
export async function revokeAdminDevice(deviceId: string): Promise<void> {
  const token = getAdminSessionToken();
  if (!token) return;
  const data = await adminSessionAction('revoke_device', { deviceId, sessionToken: token });
  if (data?.revoked !== true) {
    throw new Error(data?.message || data?.error || 'خروج این دستگاه انجام نشد');
  }
}

// ── تغییر رمز/شماره ورود از داخل پنل (admin-credentials) ─────────────
const CRED_ENDPOINT = `${base}/functions/v1/admin-credentials`;

async function credAction(action: string, payload: Record<string, unknown> = {}): Promise<any> {
  const token = getAdminSessionToken();
  const res = await fetch(CRED_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || 'خطا در ارتباط با سرویس امنیت');
  return data;
}

/** شماره فعلی (ماسک‌شده) برای نمایش در پنل */
export async function getAdminCredsInfo(): Promise<{ phoneMasked: string }> {
  const data = await credAction('get_info');
  return { phoneMasked: data?.phoneMasked || '' };
}

/**
 * تغییر رمز عبور و/یا شماره تماس ورود — با چک رمز فعلی + نشست معتبر.
 * بعد از موفقیت، همه نشست‌ها بسته می‌شوند (سرور) و باید دوباره وارد شوید.
 */
export async function changeAdminCredentials(opts: {
  currentPassword: string;
  newPhone?: string;
  newPassword?: string;
}): Promise<void> {
  const data = await credAction('change_credentials', {
    currentPassword: opts.currentPassword,
    ...(opts.newPhone ? { newPhone: opts.newPhone } : {}),
    ...(opts.newPassword ? { newPassword: opts.newPassword } : {}),
  });
  if(data?.ok!==true)throw new Error(data?.error||'تغییر اطلاعات ورود انجام نشد');
  STORE.removeItem(PASSWORD_UPGRADE_KEY);
}

/**
 * Validate the current admin session by calling admin-session's validate_session action.
 * Returns { valid: true } on success or { valid: false } on failure (and clears session).
 * Network errors return { valid: false } to be safe (fail-closed).
 */
export async function validateAdminSession(): Promise<{ valid: boolean; ownerPhone?: string }> {
  const token = getAdminSessionToken();
  if (!token) {
    clearAdminSession();
    return { valid: false };
  }
  try {
    const data = await adminSessionAction('validate_session', { sessionToken: token });
    if (data?.valid === true) {
      STORE.setItem(AUTHED_KEY, 'true');
      return { valid: true, ownerPhone: data.ownerPhone };
    }
    clearAdminSession();
    return { valid: false };
  } catch {
    // Network error — fail-closed (treat as invalid)
    clearAdminSession();
    return { valid: false };
  }
}
