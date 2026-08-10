const base = (import.meta.env.VITE_SUPABASE_URL as string || '').replace(/\/$/, '');
const endpoint = `${base}/functions/v1/admin-session`;
const TOKEN_KEY = 'zk_admin_session_token';
const DEVICE_KEY = 'zk_admin_device_id';
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
  return data;
}
export const getAdminSessionToken = () => sessionStorage.getItem(TOKEN_KEY) || '';
export const getAdminDeviceId = () => sessionStorage.getItem(DEVICE_KEY) || '';
export const clearAdminSession = () => { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(DEVICE_KEY); sessionStorage.removeItem('zk_admin_authed'); };
