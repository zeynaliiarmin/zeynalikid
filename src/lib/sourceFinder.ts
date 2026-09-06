// «دستیار سوم» — پیدا کردن خودکار نزدیک‌ترین منبع علمی انگلیسی برای مقالات آموزشی.
import { isSupabaseConfigured, supabase } from './supabase';
import { getAdminSessionToken } from '../utils/adminSession';

export type SourceSuggestion = {
  title: string;
  url: string;
  year: number | null;
  authors: string[];
  venue: string;
  citationCount: number;
};

export type SourceFindResult = {
  ok: boolean;
  top?: SourceSuggestion;
  results?: SourceSuggestion[];
  error?: string;
  status?: number;
};

/** فراخوانی Edge Function find-source برای پیدا کردن منبع/منابع نزدیک به یک مقاله */
export async function findSourceForArticle(opts: {
  title: string;
  body?: string;
  limit?: number;
  mode?: 'single' | 'multi';
}): Promise<SourceFindResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'اتصال ابری فعال نیست' };
  }
  const token = getAdminSessionToken();
  if (!token) {
    return { ok: false, error: 'نشست ادمین منقضی شده؛ لطفاً صفحه را رفرش کنید و دوباره وارد شوید.' };
  }

  // Use direct fetch instead of supabase.functions.invoke to avoid the client
  // auto-injecting the Supabase ANON JWT into the Authorization header (which our
  // admin-auth extractor correctly ignores, but we want to be defensive and explicit
  // here for reliable debugging).
  try {
    const base = (import.meta.env.VITE_SUPABASE_URL as string || '').replace(/\/$/, '');
    const resp = await fetch(`${base}/functions/v1/find-source`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Origin is auto-set by the browser; the edge function validates it via CORS.
        // No Authorization header here — the admin session token goes in the body
        // as sessionToken, which is what all other admin endpoints (generate-plans, etc.) use.
      },
      credentials: 'omit',
      body: JSON.stringify({ sessionToken: token, ...opts }),
    });
    let data: any = null;
    try { data = await resp.json(); } catch { data = null; }
    if (!resp.ok) {
      return { ok: false, error: data?.error || `خطای سرور (${resp.status})`, status: resp.status };
    }
    if (!data?.ok) return { ok: false, error: data?.error || 'منبعی پیدا نشد' };
    return { ok: true, top: data.top, results: data.results };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || e) };
  }
}
