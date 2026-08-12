const base = (import.meta.env.VITE_SUPABASE_URL as string || '').replace(/\/$/, '');
const endpoint = `${base}/functions/v1/admin-session`;
const TOKEN_KEY = 'zk_admin_session_token';
const DEVICE_KEY = 'zk_admin_device_id';
const AUTHED_KEY = 'zk_admin_authed';
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
  sessionStorage.setItem(TOKEN_KEY, data.sessionToken);
  sessionStorage.setItem(DEVICE_KEY, data.deviceId);
  sessionStorage.setItem(AUTHED_KEY, 'true');
  return data;
}
export const getAdminSessionToken = () => sessionStorage.getItem(TOKEN_KEY) || '';
export const getAdminDeviceId = () => sessionStorage.getItem(DEVICE_KEY) || '';
export const clearAdminSession = () => { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(DEVICE_KEY); sessionStorage.removeItem(AUTHED_KEY); };

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
      sessionStorage.setItem(AUTHED_KEY, 'true');
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
