const KEY = 'zk_admin_passkey_v1';
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const fromB64 = (value: string) => { const s = value.replace(/-/g, '+').replace(/_/g, '/'); const pad = s + '='.repeat((4 - s.length % 4) % 4); return Uint8Array.from(atob(pad), c => c.charCodeAt(0)); };
const random = () => crypto.getRandomValues(new Uint8Array(32));
export const biometricSupported = () => typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials;
export const hasAdminBiometric = () => { try { return !!localStorage.getItem(KEY); } catch { return false; } };
export async function enrollAdminBiometric(phone: string) {
  if (!biometricSupported()) throw new Error('پشتیبانی نمی‌شود');
  const credential = await navigator.credentials.create({ publicKey: { challenge: random(), rp: { name: 'Zeynalikid Admin' }, user: { id: random(), name: phone || 'admin', displayName: 'مدیر زینالیکید' }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' }, timeout: 60000, attestation: 'none' } }) as PublicKeyCredential | null;
  if (!credential) throw new Error('لغو شد');
  localStorage.setItem(KEY, b64(new Uint8Array(credential.rawId)));
}
export async function verifyAdminBiometric() {
  const id = localStorage.getItem(KEY); if (!id || !biometricSupported()) return false;
  const result = await navigator.credentials.get({ publicKey: { challenge: random(), allowCredentials: [{ type: 'public-key', id: fromB64(id), transports: ['internal'] }], userVerification: 'required', timeout: 60000 } });
  return !!result;
}
export const removeAdminBiometric = () => localStorage.removeItem(KEY);
