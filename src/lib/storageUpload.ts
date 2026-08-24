import { getAdminSessionToken } from '../utils/adminSession';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined || '');
const ENDPOINT = `${SUPABASE_URL}/functions/v1/storage-upload`;

type UploadProgress = (percent: number) => void;

type SignedUpload = {
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
  canonicalUrl: string;
};

async function requestSignedUpload(body: Record<string, unknown>, admin = false): Promise<SignedUpload> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Supabase تنظیم نشده است.');
  const token = admin ? getAdminSessionToken() : '';
  if (admin && !token) throw new Error('نشست مدیریت معتبر نیست. دوباره وارد شوید.');
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${admin ? token : SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.signedUrl || !data?.token) {
    throw new Error(data?.error || 'آماده‌سازی آپلود انجام نشد.');
  }
  return data as SignedUpload;
}

function uploadToSignedUrl(
  signedUrl: string,
  file: Blob,
  contentType: string,
  onProgress?: UploadProgress,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 99))));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        let message = 'آپلود فایل انجام نشد.';
        try { message = JSON.parse(xhr.responseText)?.message || JSON.parse(xhr.responseText)?.error || message; } catch {}
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error('خطای شبکه هنگام آپلود فایل.'));
    const form = new FormData();
    form.append('cacheControl', '3600');
    form.append('', file, `upload.${contentType.split('/')[1] || 'bin'}`);
    xhr.send(form);
  });
}

export async function uploadPublicFile(
  kind: 'voice' | 'tongue' | 'receipt',
  file: Blob,
  onProgress?: UploadProgress,
): Promise<string> {
  const contentType = String(file.type || '').toLowerCase().split(';')[0] || 'application/octet-stream';
  const signed = await requestSignedUpload({ mode: 'public', kind, contentType, size: file.size }, false);
  await uploadToSignedUrl(signed.signedUrl, file, contentType, onProgress);
  return signed.canonicalUrl;
}

export async function uploadAdminFile(
  bucket: 'images' | 'media' | 'files',
  folder: string,
  file: Blob,
  onProgress?: UploadProgress,
): Promise<string> {
  const contentType = String(file.type || '').toLowerCase().split(';')[0] || 'application/octet-stream';
  const signed = await requestSignedUpload({ mode: 'admin', bucket, folder, contentType, size: file.size }, true);
  await uploadToSignedUrl(signed.signedUrl, file, contentType, onProgress);
  return signed.canonicalUrl;
}
