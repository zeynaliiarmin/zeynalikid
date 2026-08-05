import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const isPlaceholder = (value?: string) =>
  !value ||
  value.trim() === '' ||
  value.includes('your_supabase_project_url') ||
  value.includes('your_supabase_anon_key');

export const isSupabaseConfigured = !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

const requireSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
    );
  }
  return supabase;
};

export type Submission = Record<string, any> & {
  id?: string | number;
  created_at?: string;
  updated_at?: string;
  fullPhone?: string;
  full_phone?: string;
};

export type AppSettings = Record<string, any> & {
  id?: string | number;
  key?: string;
  settings?: Record<string, any>;
};

const SUBMISSIONS_TABLE = 'submissions';

const RECEIPT_BUCKET = 'images';
const storagePathFromPublicUrl = (u: string): string | null => {
  try {
    const m = new URL(u).pathname.match(/\/storage\/v1\/object\/public\/images\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
};
const removeStoredImageByUrl = async (client: SupabaseClient, url?: string): Promise<void> => {
  if (!url) return;
  const path = storagePathFromPublicUrl(url);
  if (!path) return;
  try {
    await client.storage.from(RECEIPT_BUCKET).remove([path]);
  } catch (err) {
    console.warn('Could not delete receipt image:', err);
  }
};

const SETTINGS_TABLE = 'settings';
const SETTINGS_KEY = 'app_settings';

export const dbRowToSubmission = (row: Record<string, any> | null): Submission | null => {
  if (!row) return null;
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  return {
    ...payload,
    ...row,
    fullPhone: row.full_phone ?? payload.fullPhone ?? payload.full_phone,
  };
};

export const submissionToDbRow = (submission: Submission): Record<string, any> => {
  const { id, created_at, updated_at, fullPhone, full_phone, ...payload } = submission || {};
  return {
    ...(id != null ? { id } : {}),
    full_phone: fullPhone ?? full_phone ?? payload?.fullPhone ?? null,
    payload: {
      ...payload,
      ...(fullPhone || full_phone ? { fullPhone: fullPhone ?? full_phone } : {}),
    },
    updated_at: new Date().toISOString(),
  };
};

export const dbRowToSettings = (row: Record<string, any> | null): AppSettings | null => {
  if (!row) return null;
  if (row.settings && typeof row.settings === 'object') return row.settings;
  if (row.payload && typeof row.payload === 'object') return row.payload;
  return row as AppSettings;
};

export const settingsToDbRow = (settings: AppSettings): Record<string, any> => ({
  key: SETTINGS_KEY,
  settings,
  updated_at: new Date().toISOString(),
});

export const fetchSubmissions = async (): Promise<Submission[]> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => dbRowToSubmission(row)).filter(Boolean) as Submission[];
};

export const fetchDeletedSubmissions = async (): Promise<Submission[]> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => dbRowToSubmission(row)).filter(Boolean) as Submission[];
};

export const softDeleteSubmission = async (id: string | number): Promise<void> => {
  const client = requireSupabase();
  // ۱) دریافت payload برای دسترسی به لینک فیش
  const { data: row, error: fetchError } = await client
    .from(SUBMISSIONS_TABLE)
    .select('payload')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  const payload = (row?.payload && typeof row.payload === 'object' ? row.payload : {}) as Record<string, any>;
  const receiptUrl = payload?.payment?.receipt;
  // ۲) حذف کامل فیش از Storage
  if (receiptUrl) await removeStoredImageByUrl(client, receiptUrl);
  // ۳) انتقال به سطل آشغال + خالی کردن receipt و ثبت تاریخ حذف فیش
  const newPayload = receiptUrl
    ? { ...payload, payment: { ...(payload.payment || {}), receipt: '', receipt_image: '', receiptDeletedAt: new Date().toISOString() } }
    : payload;
  const { error } = await client
    .from(SUBMISSIONS_TABLE)
    .update({ deleted_at: new Date().toISOString(), payload: newPayload })
    .eq('id', id);
  if (error) throw error;
};

export const softDeleteMultipleSubmissions = async (ids: Array<string | number>): Promise<void> => {
  if (!ids.length) return;
  const client = requireSupabase();
  // ۱) دریافت payload فرم‌ها برای دسترسی به لینک فیش‌ها
  const { data: rows, error: fetchError } = await client
    .from(SUBMISSIONS_TABLE)
    .select('id, payload')
    .in('id', ids);
  if (fetchError) throw fetchError;
  const now = new Date().toISOString();
  for (const row of rows || []) {
    const payload = (row?.payload && typeof row.payload === 'object' ? row.payload : {}) as Record<string, any>;
    const receiptUrl = payload?.payment?.receipt;
    // ۲) حذف فیش از Storage
    if (receiptUrl) await removeStoredImageByUrl(client, receiptUrl);
    // ۳) به‌روزرسانی هر ردیف (payload هر فرم متفاوت است، پس تک‌به‌تک)
    const newPayload = receiptUrl
      ? { ...payload, payment: { ...(payload.payment || {}), receipt: '', receipt_image: '', receiptDeletedAt: now } }
      : payload;
    const { error } = await client
      .from(SUBMISSIONS_TABLE)
      .update({ deleted_at: now, payload: newPayload })
      .eq('id', row.id);
    if (error) console.warn('soft delete failed for', row.id, error);
  }
};

export const restoreSubmission = async (id: string | number): Promise<void> => {
  const client = requireSupabase();
  const { error } = await client
    .from(SUBMISSIONS_TABLE)
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) throw error;
};

export const permanentDeleteSubmission = async (id: string | number): Promise<void> => {
  const client = requireSupabase();
  const { error } = await client.from(SUBMISSIONS_TABLE).delete().eq('id', id);
  if (error) throw error;
};

export const permanentDeleteMultipleSubmissions = async (ids: Array<string | number>): Promise<void> => {
  if (!ids.length) return;
  const client = requireSupabase();
  const { error } = await client.from(SUBMISSIONS_TABLE).delete().in('id', ids);
  if (error) throw error;
};

export const createSubmission = async (submission: Submission): Promise<Submission> => {
  const client = requireSupabase();
  const row = submissionToDbRow(submission);
  delete row.id;

  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .insert(row)
    .select('*')
    .single();

  if (error) throw error;
  return dbRowToSubmission(data) as Submission;
};

export const updateSubmission = async (
  id: string | number,
  updates: Partial<Submission>,
): Promise<Submission> => {
  const client = requireSupabase();
  const row = submissionToDbRow(updates as Submission);
  delete row.id;

  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .update(row)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return dbRowToSubmission(data) as Submission;
};

export const deleteMultipleSubmissions = async (ids: Array<string | number>): Promise<void> => {
  if (!ids.length) return;
  const client = requireSupabase();
  const { error } = await client.from(SUBMISSIONS_TABLE).delete().in('id', ids);
  if (error) throw error;
};

export const updateMultipleSubmissions = async (
  ids: Array<string | number>,
  updates: Partial<Submission>,
): Promise<Submission[]> => {
  if (!ids.length) return [];
  const client = requireSupabase();
  const row = submissionToDbRow(updates as Submission);
  delete row.id;

  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .update(row)
    .in('id', ids)
    .select('*');

  if (error) throw error;
  return (data || []).map((item) => dbRowToSubmission(item)).filter(Boolean) as Submission[];
};

export const checkDuplicatePhone = async (phone: string): Promise<boolean> => {
  if (!phone) return false;
  const client = requireSupabase();
  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .select('id')
    .eq('full_phone', phone)
    .limit(1);

  if (error) throw error;
  return Boolean(data && data.length > 0);
};

export const fetchSettings = async (): Promise<AppSettings | null> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from(SETTINGS_TABLE)
    .select('*')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();

  if (error) throw error;
  return dbRowToSettings(data);
};

export const saveSettings = async (settings: AppSettings): Promise<AppSettings> => {
  const client = requireSupabase();
  const row = settingsToDbRow(settings);

  const { data, error } = await client
    .from(SETTINGS_TABLE)
    .upsert(row, { onConflict: 'key' })
    .select('*')
    .single();

  if (error) throw error;
  return dbRowToSettings(data) as AppSettings;
};

// ===== آمار بازدید صفحات (page_views) — اصلاح جدید =====
// اصلاح ۳۱: ثبت بازدید بسیار سبک و بی‌صدا — هرگز نباید در تجربه کاربری اختلال ایجاد کند.
const PAGE_VIEWS_TABLE = 'page_views';

export const trackPageView = (path: string): void => {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    supabase
      .from(PAGE_VIEWS_TABLE)
      .insert({
        page_path: path,
        referrer: (typeof document !== 'undefined' && document.referrer) || null,
        user_agent: (typeof navigator !== 'undefined' && navigator.userAgent) || null,
      })
      .then(
        () => {},
        () => {},
      );
  } catch {
    // کاملاً بی‌صدا — هیچ خطایی نباید به بیرون درز کند.
  }
};

export type PageViewStats = {
  total: number;
  thisMonth: number;
  today: number;
  topPages: { page_path: string; count: number }[];
};

export const fetchPageViewStats = async (): Promise<PageViewStats> => {
  const client = requireSupabase();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ count: total }, { count: today }, { count: thisMonth }, { data: recentRows }] = await Promise.all([
    client.from(PAGE_VIEWS_TABLE).select('*', { count: 'exact', head: true }),
    client.from(PAGE_VIEWS_TABLE).select('*', { count: 'exact', head: true }).gte('created_at', startOfDay),
    client.from(PAGE_VIEWS_TABLE).select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    client
      .from(PAGE_VIEWS_TABLE)
      .select('page_path')
      .gte('created_at', startOfMonth)
      .limit(5000),
  ]);

  const counts: Record<string, number> = {};
  (recentRows || []).forEach((row: any) => {
    const p = row.page_path || '/';
    counts[p] = (counts[p] || 0) + 1;
  });
  const topPages = Object.entries(counts)
    .map(([page_path, count]) => ({ page_path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { total: total || 0, today: today || 0, thisMonth: thisMonth || 0, topPages };
};

