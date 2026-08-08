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
const voicePathFromUrl = (u: string): string | null => {
  try { const m = new URL(u).pathname.match(/\/storage\/v1\/object\/public\/voice-notes\/(.+)$/); return m ? decodeURIComponent(m[1]) : null; } catch { return null; }
};
const tonguePathFromUrl = (u: string): string | null => {
  try { const m = new URL(u).pathname.match(/\/storage\/v1\/object\/public\/tongue-photos\/(.+)$/); return m ? decodeURIComponent(m[1]) : null; } catch { return null; }
};
const removeVoiceByUrl = async (client: SupabaseClient, url?: string): Promise<void> => {
  if (!url) return;
  const p = voicePathFromUrl(url);
  if (!p) return;
  try { await client.storage.from('voice-notes').remove([p]); } catch (e) { console.warn('Could not delete voice note:', e); }
};
const removeTongueByUrl = async (client: SupabaseClient, url?: string): Promise<void> => {
  if (!url) return;
  const p = tonguePathFromUrl(url);
  if (!p) return;
  try { await client.storage.from('tongue-photos').remove([p]); } catch (e) { console.warn('Could not delete tongue photo:', e); }
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
  const voiceUrl = payload?.voice_note_url || payload?.voiceNoteUrl;
  const tongueArr: string[] = Array.isArray(payload?.tonguePhotos) ? payload.tonguePhotos : [];
  // ۲) حذف کامل فیش، ویس و عکس زبان از Storage
  if (receiptUrl) await removeStoredImageByUrl(client, receiptUrl);
  if (voiceUrl) await removeVoiceByUrl(client, voiceUrl);
  for (const u of tongueArr) { if (u) await removeTongueByUrl(client, u); }
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
    const voiceUrl = payload?.voice_note_url || payload?.voiceNoteUrl;
    const tongueArr: string[] = Array.isArray(payload?.tonguePhotos) ? payload.tonguePhotos : [];
    // ۲) حذف فیش، ویس و عکس زبان از Storage
    if (receiptUrl) await removeStoredImageByUrl(client, receiptUrl);
    if (voiceUrl) await removeVoiceByUrl(client, voiceUrl);
    for (const u of tongueArr) { if (u) await removeTongueByUrl(client, u); }
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


export interface UserQuestion {
  id: number;
  question: string;
  question_en?: string;
  phone?: string;
  answer?: string;
  answer_en?: string;
  voice_note_url?: string;
  page_source?: string;
  status: 'pending' | 'answered' | 'archived';
  created_at: string;
  answered_at?: string;
}

const QUESTIONS_TABLE = 'user_questions';
const LS_QUESTIONS_KEY = 'zk_user_questions';

function getLSQuestions(): UserQuestion[] {
  try {
    const raw = localStorage.getItem(LS_QUESTIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function setLSQuestions(list: UserQuestion[]) {
  try {
    localStorage.setItem(LS_QUESTIONS_KEY, JSON.stringify(list));
  } catch {}
}

export const submitUserQuestion = async (
  question: string,
  voiceNoteUrl?: string,
  pageSource?: string,
  phone?: string
): Promise<UserQuestion> => {
  const cleanPhone = (phone || '').trim();
  const rawQ = (question || '').trim();
  const fullText = cleanPhone
    ? (rawQ ? `[شماره تماس: ${cleanPhone}]\n${rawQ}` : `[شماره تماس: ${cleanPhone}]\nدرخواست تماس تلفنی جهت پاسخ به سؤال`)
    : (rawQ || 'درخواست تماس تلفنی');

  const newQ: UserQuestion = {
    id: Date.now(),
    question: fullText,
    phone: cleanPhone,
    voice_note_url: voiceNoteUrl || '',
    page_source: pageSource || 'faq',
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured || !supabase) {
    const list = getLSQuestions();
    setLSQuestions([newQ, ...list]);
    return newQ;
  }

  try {
    const insertPayload: any = {
      question: newQ.question,
      voice_note_url: newQ.voice_note_url,
      page_source: newQ.page_source,
      status: 'pending',
      created_at: newQ.created_at,
    };
    if (cleanPhone) {
      insertPayload.phone = cleanPhone;
    }
    const { data, error } = await supabase
      .from(QUESTIONS_TABLE)
      .insert([insertPayload])
      .select()
      .single();
    if (error) {
      if (error.message?.includes('phone') || error.code === 'PGRST204') {
        delete insertPayload.phone;
        const { data: d2, error: e2 } = await supabase
          .from(QUESTIONS_TABLE)
          .insert([insertPayload])
          .select()
          .single();
        if (e2) throw e2;
        return (d2 || newQ) as UserQuestion;
      }
      throw error;
    }
    return (data || newQ) as UserQuestion;
  } catch (err) {
    console.warn('Could not insert question to Supabase, saving to localStorage:', err);
    const list = getLSQuestions();
    setLSQuestions([newQ, ...list]);
    return newQ;
  }
};

export const fetchUserQuestions = async (status?: string): Promise<UserQuestion[]> => {
  if (!isSupabaseConfigured || !supabase) {
    const list = getLSQuestions();
    if (status && status !== 'all') {
      return list.filter((q) => q.status === status);
    }
    return list;
  }

  try {
    let query = supabase.from(QUESTIONS_TABLE).select('*').order('created_at', { ascending: false });
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as UserQuestion[];
  } catch (err) {
    const list = getLSQuestions();
    if (status && status !== 'all') {
      return list.filter((q) => q.status === status);
    }
    return list;
  }
};

export const answerUserQuestion = async (
  id: number,
  answer: string,
  answerEn?: string
): Promise<UserQuestion | null> => {
  const answeredAt = new Date().toISOString();
  if (!isSupabaseConfigured || !supabase) {
    const list = getLSQuestions();
    const updated = list.map((q) =>
      q.id === id
        ? { ...q, answer: answer.trim(), answer_en: answerEn?.trim() || '', status: 'answered' as const, answered_at: answeredAt }
        : q
    );
    setLSQuestions(updated);
    return updated.find((q) => q.id === id) || null;
  }

  try {
    const { data, error } = await supabase
      .from(QUESTIONS_TABLE)
      .update({
        answer: answer.trim(),
        answer_en: answerEn?.trim() || '',
        status: 'answered',
        answered_at: answeredAt,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return (data as UserQuestion) || null;
  } catch (err) {
    const list = getLSQuestions();
    const updated = list.map((q) =>
      q.id === id
        ? { ...q, answer: answer.trim(), answer_en: answerEn?.trim() || '', status: 'answered' as const, answered_at: answeredAt }
        : q
    );
    setLSQuestions(updated);
    return updated.find((q) => q.id === id) || null;
  }
};

export const archiveUserQuestion = async (id: number): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    const list = getLSQuestions();
    const updated = list.map((q) => (q.id === id ? { ...q, status: 'archived' as const } : q));
    setLSQuestions(updated);
    return true;
  }

  try {
    const { error } = await supabase.from(QUESTIONS_TABLE).update({ status: 'archived' }).eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    const list = getLSQuestions();
    const updated = list.map((q) => (q.id === id ? { ...q, status: 'archived' as const } : q));
    setLSQuestions(updated);
    return true;
  }
};

export const deleteUserQuestion = async (id: number): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    const list = getLSQuestions();
    const updated = list.filter((q) => q.id !== id);
    setLSQuestions(updated);
    return true;
  }

  try {
    const { error } = await supabase.from(QUESTIONS_TABLE).delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    const list = getLSQuestions();
    const updated = list.filter((q) => q.id !== id);
    setLSQuestions(updated);
    return true;
  }
};


const VOICE_BUCKET = 'voice-notes';
export const uploadVoiceNote = async (blob: Blob): Promise<string | null> => {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const ext = blob.type.includes('webm') ? 'webm'
              : blob.type.includes('mp4') ? 'mp4'
              : blob.type.includes('ogg') ? 'ogg'
              : 'webm';
    const path = `voice-notes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from(VOICE_BUCKET)
      .upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) {
      console.warn('Voice note upload failed:', error.message);
      return null;
    }
    const { data } = supabase.storage.from(VOICE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn('Voice note upload error:', e);
    return null;
  }
};


export interface ReviewItem {
  id: number;
  course_id?: string;
  reviewer_name: string;
  rating: number;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected';
  placements?: string[]; // محل‌های نمایش در بخش‌های سایت: 'home', 'courses', 'course_detail', 'consultation', 'faq', 'about', 'track', 'all_places'
  created_at: string;
}

export const REVIEW_PLACEMENT_OPTIONS = [
  { id: 'all_places', label: 'همه بخش‌ها (سراسری)', color: '#4f46e5', desc: 'نمایش سراسری در کلیه بخش‌های مرتبط سایت' },
  { id: 'home', label: 'صفحه اصلی', color: '#0284c7', desc: 'نمایش در بخش نظرات صفحه اول سایت' },
  { id: 'courses', label: 'صفحه دوره‌ها', color: '#0d9488', desc: 'نمایش در صفحه کاتالوگ دوره‌های رشد و تغذیه' },
  { id: 'course_detail', label: 'جزئیات اختصاصی دوره', color: '#7c3aed', desc: 'نمایش در تب نظرات جزئیات همان دوره انتخابی' },
  { id: 'consultation', label: 'فرم مشاوره', color: '#ea580c', desc: 'نمایش در باکس‌های اعتمادساز فرم مشاوره تخصصی' },
  { id: 'faq', label: 'سوالات و تجربیات', color: '#16a34a', desc: 'نمایش در صفحه سوالات متداول و رضایت والدین' },
  { id: 'about', label: 'درباره ما و متد TC', color: '#db2777', desc: 'نمایش در صفحه معرفی دکتر زینالی و متد TC' },
  { id: 'track', label: 'صفحه پیگیری نوبت', color: '#6366f1', desc: 'نمایش در صفحه پیگیری نوبت و نتایج' },
];

const REVIEWS_TABLE = 'reviews';
const LS_REVIEWS_KEY = 'zk_reviews';

function getLSReviews(): ReviewItem[] {
  try {
    const raw = localStorage.getItem(LS_REVIEWS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function setLSReviews(list: ReviewItem[]) {
  try {
    localStorage.setItem(LS_REVIEWS_KEY, JSON.stringify(list));
  } catch {}
}

export const submitReview = async (
  courseId: string,
  name: string,
  rating: number,
  comment?: string,
  placements?: string[]
): Promise<ReviewItem> => {
  const defaultPlacements = placements && placements.length > 0
    ? placements
    : ['course_detail', 'courses', 'home'];

  const newR: ReviewItem = {
    id: Date.now(),
    course_id: courseId,
    reviewer_name: name.trim(),
    rating: Math.min(5, Math.max(1, rating)),
    comment: comment?.trim() || '',
    status: 'pending',
    placements: defaultPlacements,
    created_at: new Date().toISOString(),
  };
  if (!isSupabaseConfigured || !supabase) {
    const list = getLSReviews();
    setLSReviews([newR, ...list]);
    return newR;
  }
  try {
    const { data, error } = await supabase
      .from(REVIEWS_TABLE)
      .insert([
        {
          course_id: newR.course_id,
          reviewer_name: newR.reviewer_name,
          rating: newR.rating,
          comment: newR.comment,
          status: 'pending',
          placements: newR.placements,
          created_at: newR.created_at,
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return data as ReviewItem;
  } catch {
    const list = getLSReviews();
    setLSReviews([newR, ...list]);
    return newR;
  }
};

export const fetchReviews = async (status?: string): Promise<ReviewItem[]> => {
  if (!isSupabaseConfigured || !supabase) {
    const list = getLSReviews();
    if (status && status !== 'all') {
      return list.filter((r) => r.status === status);
    }
    return list;
  }
  try {
    let query = supabase.from(REVIEWS_TABLE).select('*').order('created_at', { ascending: false });
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ReviewItem[];
  } catch {
    const list = getLSReviews();
    if (status && status !== 'all') {
      return list.filter((r) => r.status === status);
    }
    return list;
  }
};

export const approveReview = async (id: number): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    const list = getLSReviews();
    setLSReviews(list.map((r) => (r.id === id ? { ...r, status: 'approved' as const } : r)));
    return true;
  }
  try {
    await supabase.from(REVIEWS_TABLE).update({ status: 'approved' }).eq('id', id);
    return true;
  } catch {
    const list = getLSReviews();
    setLSReviews(list.map((r) => (r.id === id ? { ...r, status: 'approved' as const } : r)));
    return true;
  }
};

export const rejectReview = async (id: number): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    const list = getLSReviews();
    setLSReviews(list.map((r) => (r.id === id ? { ...r, status: 'rejected' as const } : r)));
    return true;
  }
  try {
    await supabase.from(REVIEWS_TABLE).update({ status: 'rejected' }).eq('id', id);
    return true;
  } catch {
    const list = getLSReviews();
    setLSReviews(list.map((r) => (r.id === id ? { ...r, status: 'rejected' as const } : r)));
    return true;
  }
};

export const deleteReview = async (id: number): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    const list = getLSReviews();
    setLSReviews(list.filter((r) => r.id !== id));
    return true;
  }
  try {
    await supabase.from(REVIEWS_TABLE).delete().eq('id', id);
    return true;
  } catch {
    const list = getLSReviews();
    setLSReviews(list.filter((r) => r.id !== id));
    return true;
  }
};

export const updateReview = async (
  id: number,
  updates: Partial<ReviewItem>
): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    const list = getLSReviews();
    setLSReviews(list.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    return true;
  }
  try {
    const { error } = await supabase.from(REVIEWS_TABLE).update(updates).eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    const list = getLSReviews();
    setLSReviews(list.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    return true;
  }
};

/**
 * عملیات گروهی و دسته‌جمعی نظرات
 */
export const bulkApproveReviews = async (ids: number[]): Promise<boolean> => {
  if (!ids || ids.length === 0) return true;
  if (!isSupabaseConfigured || !supabase) {
    const list = getLSReviews();
    const idSet = new Set(ids);
    setLSReviews(list.map((r) => (idSet.has(r.id) ? { ...r, status: 'approved' as const } : r)));
    return true;
  }
  try {
    const { error } = await supabase.from(REVIEWS_TABLE).update({ status: 'approved' }).in('id', ids);
    if (error) throw error;
    return true;
  } catch {
    const list = getLSReviews();
    const idSet = new Set(ids);
    setLSReviews(list.map((r) => (idSet.has(r.id) ? { ...r, status: 'approved' as const } : r)));
    return true;
  }
};

export const bulkRejectReviews = async (ids: number[]): Promise<boolean> => {
  if (!ids || ids.length === 0) return true;
  if (!isSupabaseConfigured || !supabase) {
    const list = getLSReviews();
    const idSet = new Set(ids);
    setLSReviews(list.map((r) => (idSet.has(r.id) ? { ...r, status: 'rejected' as const } : r)));
    return true;
  }
  try {
    const { error } = await supabase.from(REVIEWS_TABLE).update({ status: 'rejected' }).in('id', ids);
    if (error) throw error;
    return true;
  } catch {
    const list = getLSReviews();
    const idSet = new Set(ids);
    setLSReviews(list.map((r) => (idSet.has(r.id) ? { ...r, status: 'rejected' as const } : r)));
    return true;
  }
};

export const bulkDeleteReviews = async (ids: number[]): Promise<boolean> => {
  if (!ids || ids.length === 0) return true;
  if (!isSupabaseConfigured || !supabase) {
    const list = getLSReviews();
    const idSet = new Set(ids);
    setLSReviews(list.filter((r) => !idSet.has(r.id)));
    return true;
  }
  try {
    const { error } = await supabase.from(REVIEWS_TABLE).delete().in('id', ids);
    if (error) throw error;
    return true;
  } catch {
    const list = getLSReviews();
    const idSet = new Set(ids);
    setLSReviews(list.filter((r) => !idSet.has(r.id)));
    return true;
  }
};

export const bulkUpdateReviewPlacements = async (ids: number[], placements: string[]): Promise<boolean> => {
  if (!ids || ids.length === 0) return true;
  if (!isSupabaseConfigured || !supabase) {
    const list = getLSReviews();
    const idSet = new Set(ids);
    setLSReviews(list.map((r) => (idSet.has(r.id) ? { ...r, placements } : r)));
    return true;
  }
  try {
    const { error } = await supabase.from(REVIEWS_TABLE).update({ placements }).in('id', ids);
    if (error) throw error;
    return true;
  } catch {
    const list = getLSReviews();
    const idSet = new Set(ids);
    setLSReviews(list.map((r) => (idSet.has(r.id) ? { ...r, placements } : r)));
    return true;
  }
};

/**
 * توابع دانلود و خروجی نظرات به فرمت CSV اکسل و JSON با پشتیبانی کامل از UTF-8 BOM
 */
export const downloadReviewsAsCSV = (reviews: ReviewItem[], filename = 'zeynalikid-reviews.csv') => {
  if (!reviews || reviews.length === 0) {
    alert('هیچ نظری برای دانلود وجود ندارد.');
    return;
  }

  const getPlacementLabels = (places?: string[]) => {
    if (!places || places.length === 0) return 'پیش‌فرض (جزئیات دوره، دوره‌ها، خانه)';
    return places
      .map((p) => {
        const found = REVIEW_PLACEMENT_OPTIONS.find((opt) => opt.id === p);
        return found ? found.label : p;
      })
      .join(' | ');
  };

  const getStatusLabel = (status: string) => {
    if (status === 'approved') return 'تأیید شده (قابل پخش)';
    if (status === 'rejected') return 'رد شده (غیرقابل پخش)';
    return 'در انتظار بررسی';
  };

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headers = [
    'شناسه نظر',
    'نام والد / ثبت‌کننده',
    'دوره یا بخش مربوطه',
    'امتیاز (از ۵ ستاره)',
    'وضعیت انتشار',
    'محل‌های نمایش در سایت',
    'متن نظر والد',
    'تاریخ ثبت (میلادی)',
    'تاریخ ثبت (شمسی)',
  ];

  const rows = reviews.map((r) => {
    let faDate = '—';
    try {
      faDate = new Date(r.created_at).toLocaleDateString('fa-IR');
    } catch {}

    return [
      escapeCSV(r.id),
      escapeCSV(r.reviewer_name),
      escapeCSV(r.course_id || 'عمومی'),
      escapeCSV(r.rating || 5),
      escapeCSV(getStatusLabel(r.status)),
      escapeCSV(getPlacementLabels(r.placements)),
      escapeCSV(r.comment || ''),
      escapeCSV(r.created_at || ''),
      escapeCSV(faDate),
    ].join(',');
  });

  // افزودن UTF-8 BOM برای نمایش درست کاراکترهای فارسی در اکسل
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadReviewsAsJSON = (reviews: ReviewItem[], filename = 'zeynalikid-reviews.json') => {
  if (!reviews || reviews.length === 0) {
    alert('هیچ نظری برای دانلود وجود ندارد.');
    return;
  }
  const jsonContent = JSON.stringify(reviews, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadSingleReview = (review: ReviewItem) => {
  downloadReviewsAsCSV([review], `review-${review.id}-${(review.reviewer_name || 'user').replace(/\s+/g, '_')}.csv`);
};
