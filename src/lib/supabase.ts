import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getAdminSessionToken } from '../utils/adminSession';
import { maskReviewPhone } from '../utils/reviewPresentation';
import { reportError } from '../utils/errorLog';
import { triggerErrorAlert } from '../utils/errorAlertBus';
import { uploadPublicFile } from './storageUpload';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const isPlaceholder = (value?: string) =>
  !value ||
  value.trim() === '' ||
  value.includes('your_supabase_project_url') ||
  value.includes('your_supabase_anon_key');

export const isSupabaseConfigured = !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured && typeof window !== 'undefined'
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

async function collectAdminPages<T>(load:(page:number,limit:number)=>Promise<{items:T[];total:number}>):Promise<T[]>{
  const limit=100;const all:T[]=[];
  for(let page=1;page<=100;page++){
    const result=await load(page,limit);all.push(...result.items);
    if(all.length>=result.total||result.items.length<limit)break;
  }
  return all;
}

export const fetchSubmissions=async():Promise<Submission[]>=>{
  const {adminFetchSubmissions}=await import('./adminApi');
  return collectAdminPages(async(page,limit)=>{const r=await adminFetchSubmissions({page,limit});return{items:r.submissions,total:r.total}});
};

export const fetchDeletedSubmissions=async():Promise<Submission[]>=>{
  const {adminFetchDeletedSubmissions}=await import('./adminApi');
  return collectAdminPages(async(page,limit)=>{const r=await adminFetchDeletedSubmissions({page,limit});return{items:r.submissions,total:r.total}});
};

export const softDeleteSubmission = async (id: string | number): Promise<void> => {
  // Phase 3: route through admin-api for the DB update.
  // Phase 5: storage cleanup now goes through admin-api too (delete_storage_files with
  // service_role) — anon storage DELETE will be revoked, so client-side anon remove is gone.
  const { adminGetSubmission, adminUpdateSubmission, adminSoftDeleteSubmission, adminDeleteStorageFiles } = await import('./adminApi');
  // 1) Get current payload to find file URLs
  const sub = await adminGetSubmission(id);
  const payload = (sub as any) ?? {};
  const receiptUrl = payload?.payment?.receipt;
  const voiceUrl = payload?.voice_note_url || payload?.voiceNoteUrl;
  const tongueArr: string[] = Array.isArray(payload?.tonguePhotos) ? payload.tonguePhotos : [];
  // 2) Optionally clear receipt URL in payload (so admin panel doesn't show stale link)
  if (receiptUrl) {
    try {
      await adminUpdateSubmission(id, {
        payment: { ...(payload.payment || {}), receipt: '', receipt_image: '', receiptDeletedAt: new Date().toISOString() },
      } as any);
    } catch { /* admin-api whitelist will accept payment field; ignore if fails */ }
  }
  // 3) Delete storage files via admin-api (server-side service_role, whitelisted buckets)
  const urls = [receiptUrl, voiceUrl, ...tongueArr].filter(Boolean) as string[];
  if (urls.length) {
    try {
      await adminDeleteStorageFiles(urls);
    } catch (e) {
      console.warn('Could not delete submission files via admin-api:', e);
    }
  }
  // 4) Set deleted_at via admin-api
  await adminSoftDeleteSubmission(id);
};

export const softDeleteMultipleSubmissions = async (ids: Array<string | number>): Promise<void> => {
  if (!ids.length) return;
  // Phase 3: loop client-side using the single-row softDeleteSubmission
  for (const id of ids) {
    await softDeleteSubmission(id);
  }
};

export const restoreSubmission = async (id: string | number): Promise<void> => {
  // Phase 3: route through admin-api
  const { adminRestoreSubmission } = await import('./adminApi');
  await adminRestoreSubmission(id);
};

export const permanentDeleteSubmission = async (id: string | number): Promise<void> => {
  // Phase 3: route through admin-api
  const { adminPermanentDeleteSubmission } = await import('./adminApi');
  await adminPermanentDeleteSubmission(id);
};

export const permanentDeleteMultipleSubmissions = async (ids: Array<string | number>): Promise<void> => {
  if (!ids.length) return;
  // Phase 3: route through admin-api (loop client-side)
  const { adminPermanentDeleteMultipleSubmissions } = await import('./adminApi');
  await adminPermanentDeleteMultipleSubmissions(ids);
};

export const createSubmission=async(submission:Submission):Promise<Submission>=>{
  requireSupabase();
  const base=(import.meta.env.VITE_SUPABASE_URL as string||'').replace(/\/$/,'');
  const response=await fetch(`${base}/functions/v1/create-submission`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({submission})});
  const body=await response.json().catch(()=>({}));
  if(!response.ok||!body?.submission)throw new Error(body?.error||'ثبت فرم انجام نشد');
  return dbRowToSubmission(body.submission) as Submission;
};

export const updateSubmission = async (
  id: string | number,
  updates: Partial<Submission>,
): Promise<Submission> => {
  // Phase 3: route through admin-api (whitelist-enforced).
  // admin-api returns only { updated, changedFields }, so we re-fetch to get the full row.
  const { adminUpdateSubmission, adminGetSubmission } = await import('./adminApi');
  await adminUpdateSubmission(id, updates);
  const updated = await adminGetSubmission(id);
  return updated as Submission;
};

export const deleteMultipleSubmissions = async (ids: Array<string | number>): Promise<void> => {
  if (!ids.length) return;
  // Phase 3: route through admin-api (permanent delete)
  const { adminPermanentDeleteMultipleSubmissions } = await import('./adminApi');
  await adminPermanentDeleteMultipleSubmissions(ids);
};

export const updateMultipleSubmissions = async (
  ids: Array<string | number>,
  updates: Partial<Submission>,
): Promise<Submission[]> => {
  if (!ids.length) return [];
  // Phase 3: route through admin-api (loop client-side)
  const { adminUpdateMultipleSubmissions } = await import('./adminApi');
  await adminUpdateMultipleSubmissions(ids, updates);
  // Return empty array — caller (admin panel) will refetch the list anyway
  return [];
};

// Phase 4.5: checkDuplicatePhone REMOVED — it was an enumeration risk (anyone with anon key
// could check if a phone number exists in submissions). The duplicate-checking logic in
// ConsultationPage now uses localStorage cache only, and the server-side duplicate prevention
// happens via the unique trackingCode generation + createSubmission's insert-or-fail behavior.

const PUBLIC_SETTINGS_CACHE_KEY='zk_public_settings_cache_v1';
const PUBLIC_SETTINGS_TTL_MS=5*60*1000;
let publicSettingsMemory:{at:number;value:AppSettings}|null=null;
let publicSettingsInFlight:Promise<AppSettings|null>|null=null;

export const fetchSettings=async():Promise<AppSettings|null>=>{
  // Phase 4.5: split settings fetching by context:
  // - Admin context (has sessionToken): use admin-api (returns full settings with sensitive keys masked)
  // - Public context (no sessionToken): use public-settings edge function (returns only whitelisted keys)
  try {
    if (getAdminSessionToken()) {
      const { adminFetchSettings } = await import('./adminApi');
      const s = await adminFetchSettings();
      if (s) return s;
    }
  } catch { /* fall through to public-settings */ }

  const now=Date.now();
  if(publicSettingsMemory&&now-publicSettingsMemory.at<PUBLIC_SETTINGS_TTL_MS)return publicSettingsMemory.value;
  try{
    const cached=sessionStorage.getItem(PUBLIC_SETTINGS_CACHE_KEY);
    if(cached){const parsed=JSON.parse(cached);if(parsed?.value&&now-Number(parsed.at||0)<PUBLIC_SETTINGS_TTL_MS){publicSettingsMemory={at:Number(parsed.at),value:parsed.value};return parsed.value}}
  }catch{}
  if(publicSettingsInFlight)return publicSettingsInFlight;
  const base=(import.meta.env.VITE_SUPABASE_URL as string||'').replace(/\/$/,'');
  publicSettingsInFlight=(async()=>{
    try{
      const resp=await fetch(`${base}/functions/v1/public-settings`,{method:'GET',headers:{'Content-Type':'application/json'}});
      if(resp.ok){const body=await resp.json();if(body.settings){const entry={at:Date.now(),value:body.settings as AppSettings};publicSettingsMemory=entry;try{sessionStorage.setItem(PUBLIC_SETTINGS_CACHE_KEY,JSON.stringify(entry))}catch{}return entry.value}}
    }catch{}
    return null;
  })();
  try{return await publicSettingsInFlight}finally{publicSettingsInFlight=null}
};

export const saveSettings = async (settings: AppSettings): Promise<AppSettings> => {
  // Phase 3: route through admin-api (blocklist prevents saving adminPassword etc.)
  const { adminSaveSettings } = await import('./adminApi');
  await adminSaveSettings(settings);
  publicSettingsMemory=null;try{sessionStorage.removeItem(PUBLIC_SETTINGS_CACHE_KEY)}catch{}
  return settings;
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
  // Phase 4.5: route ONLY through admin-api — no direct Supabase fallback.
  // If admin-api fails (e.g. no admin session), throw an error. The caller
  // (AnalyticsPanel) should catch and show an error/retry message.
  const { adminFetchPageViewStats } = await import('./adminApi');
  const stats = await adminFetchPageViewStats(30);
  // Map admin-api response to the PageViewStats shape used by the frontend
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const todayCount = (stats.dailyCounts || [])
    .filter((d: any) => d.date === startOfDay)
    .reduce((sum: number, d: any) => sum + d.views, 0);
  const thisMonthCount = (stats.dailyCounts || [])
    .filter((d: any) => d.date >= startOfMonth)
    .reduce((sum: number, d: any) => sum + d.views, 0);
  return {
    total: stats.totalViews || 0,
    today: todayCount,
    thisMonth: thisMonthCount,
    topPages: (stats.topPages || []).slice(0, 5).map((p: any) => ({ page_path: p.page_path, count: p.views })),
  };
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
    // Phase 5: no `.select()` after insert (anon INSERT-only RLS — reading back would 401).
    const { error } = await supabase
      .from(QUESTIONS_TABLE)
      .insert([insertPayload]);
    if (error) {
      if (error.message?.includes('phone') || error.code === 'PGRST204') {
        delete insertPayload.phone;
        const { error: e2 } = await supabase
          .from(QUESTIONS_TABLE)
          .insert([insertPayload]);
        if (e2) throw e2;
        return newQ;
      }
      throw error;
    }
    return newQ;
  } catch (err) {
    console.warn('Could not insert question to Supabase, saving to localStorage:', err);
    reportError('ask_question', 'Could not insert question to Supabase', String((err as any)?.message||err));triggerErrorAlert('question');
    const list = getLSQuestions();
    setLSQuestions([newQ, ...list]);
    return newQ;
  }
};

export const fetchUserQuestions = async (status?: string): Promise<UserQuestion[]> => {
  // Admin context (has session): full access via admin-api.
  if (getAdminSessionToken()) {
    try {
      const { adminFetchUserQuestions } = await import('./adminApi');
      return await collectAdminPages(async(page,limit)=>{const r=await adminFetchUserQuestions({status:status&&status!=='all'?status:undefined,page,limit});return{items:r.questions,total:r.total}});
    } catch { /* fall through to public read below */ }
  }

  // Public context (no session): sanitized answered questions via public-questions edge function.
  // The function strips "[شماره تماس: ...]" from the question text — no PII leaks publicly.
  // Phase 5 RLS: anon has no SELECT on user_questions, so this is the only public read path.
  try {
    const base = (import.meta.env.VITE_SUPABASE_URL as string || '').replace(/\/$/, '');
    const resp = await fetch(`${base}/functions/v1/public-questions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (resp.ok) {
      const body = await resp.json();
      const list = Array.isArray(body.questions) ? (body.questions as UserQuestion[]) : [];
      if (status && status !== 'all') {
        return list.filter((q) => q.status === status);
      }
      return list;
    }
  } catch { /* ignore — fall through to LS */ }

  // Local fallback for offline support
  const list = getLSQuestions();
  if (status && status !== 'all') {
    return list.filter((q) => q.status === status);
  }
  return list;
};

export const answerUserQuestion = async (
  id: number,
  answer: string,
  answerEn?: string
): Promise<UserQuestion | null> => {
  // Phase 3: route through admin-api
  try {
    const { adminAnswerUserQuestion } = await import('./adminApi');
    await adminAnswerUserQuestion(id, answer.trim(), answerEn?.trim() || undefined);
    // Return a partial UserQuestion (caller will refetch the list)
    return { id, answer: answer.trim(), answer_en: answerEn?.trim() || '', status: 'answered', answered_at: new Date().toISOString() } as UserQuestion;
  } catch (err) {
    // Fall back to LS if admin-api unavailable
    const list = getLSQuestions();
    const answeredAt = new Date().toISOString();
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
  // Phase 3: route through admin-api
  try {
    const { adminArchiveUserQuestion } = await import('./adminApi');
    await adminArchiveUserQuestion(id);
    return true;
  } catch {
    const list = getLSQuestions();
    const updated = list.map((q) => (q.id === id ? { ...q, status: 'archived' as const } : q));
    setLSQuestions(updated);
    return true;
  }
};

export const deleteUserQuestion = async (id: number): Promise<boolean> => {
  // Phase 3: route through admin-api
  try {
    const { adminDeleteUserQuestion } = await import('./adminApi');
    await adminDeleteUserQuestion(id);
    return true;
  } catch {
    const list = getLSQuestions();
    const updated = list.filter((q) => q.id !== id);
    setLSQuestions(updated);
    return true;
  }
};


export const uploadVoiceNote=async(blob:Blob):Promise<string|null>=>{
  if(!isSupabaseConfigured)return null;
  try{return await uploadPublicFile('voice',blob)}catch(e){console.warn('Voice note upload error:',e);return null}
};


export interface ReviewItem {
  id: number;
  course_id?: string;
  reviewer_name: string;
  rating: number;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected';
  placements?: string[]; // تنها مقادیر مجاز در UI/API: course_detail و product_detail
  course_ids?: string[]; // شناسه دوره‌ها یا محصولاتی که نظر در جزئیات آن‌ها نمایش داده می‌شود
  phone?: string; // پنل: مقدار کامل کاربر؛ عمومی: فقط خروجی ماسک‌شده امن public_phone
  phone_country?: string; // پیش‌شماره کشور، مانند +98
  public_phone?: string; // ستون تولیدشده دیتابیس؛ هرگز شامل شماره کامل نیست
  created_at: string;
}

export const REVIEW_PLACEMENT_OPTIONS = [
  { id: 'course_detail', label: 'جزئیات دوره', color: '#7c3aed', desc: 'نمایش در تب نظرات جزئیات دوره انتخابی' },
  { id: 'product_detail', label: 'جزئیات محصول', color: '#0d9488', desc: 'نمایش در تب نظرات جزئیات محصول انتخابی' },
] as const;

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
  placements?: string[],
  phone?: string,
  courseIds?: string[],
  phoneCountry?: string,
  createdAt?: string,
): Promise<ReviewItem> => {
  const allowedPlacements = (placements || []).filter((place) => place === 'course_detail' || place === 'product_detail') as Array<'course_detail' | 'product_detail'>;
  const defaultPlacements: Array<'course_detail' | 'product_detail'> = allowedPlacements.length
    ? allowedPlacements
    : ['course_detail'];

  const newR: ReviewItem = {
    id: Date.now(),
    course_id: courseId,
    reviewer_name: name.trim(),
    rating: Math.min(5, Math.max(1, rating)),
    comment: comment?.trim() || '',
    status: 'pending',
    placements: defaultPlacements,
    phone: phone?.trim() || '',
    phone_country: phoneCountry?.trim() || '',
    course_ids: Array.isArray(courseIds) ? courseIds.filter(Boolean) : [],
    created_at: createdAt || new Date().toISOString(),
  };
  if (!isSupabaseConfigured || !supabase) {
    const list = getLSReviews();
    setLSReviews([newR, ...list]);
    return newR;
  }
  try {
    // Phase 5: no `.select()` after insert (anon INSERT-only RLS — reading back would 401).
    const { error } = await supabase
      .from(REVIEWS_TABLE)
      .insert([
        {
          course_id: newR.course_id,
          reviewer_name: newR.reviewer_name,
          rating: newR.rating,
          comment: newR.comment,
          status: 'pending',
          placements: newR.placements,
          phone: newR.phone || '',
          phone_country: newR.phone_country || '',
          course_ids: newR.course_ids || [],
          created_at: newR.created_at,
        },
      ]);
    if (error) throw error;
    return newR;
  } catch (err) {
    reportError('submit_review', 'Could not insert review to Supabase', String((err as any)?.message||err));triggerErrorAlert('review');
    const list = getLSReviews();
    setLSReviews([newR, ...list]);
    return newR;
  }
};

export const fetchReviews = async (status?: string): Promise<ReviewItem[]> => {
  // Admin context (has session): full access via admin-api.
  if (getAdminSessionToken()) {
    try {
      const { adminFetchReviews } = await import('./adminApi');
      return await collectAdminPages(async(page,limit)=>{const r=await adminFetchReviews({status:status&&status!=='all'?status:undefined,page,limit});return{items:r.reviews,total:r.total}});
    } catch { /* fall through to public read below */ }
  }

  // Public context: only safe columns are selected. `public_phone` is generated by
  // PostgreSQL and contains five leading digits + four x + two trailing digits;
  // the full `phone` column has no SELECT grant for anonymous/authenticated users.
  try {
    if (isSupabaseConfigured && supabase) {
      const safeColumns = 'id,course_id,reviewer_name,rating,comment,status,placements,course_ids,phone_country,public_phone,created_at';
      let query = supabase.from(REVIEWS_TABLE).select(safeColumns).limit(1000);
      if (status && status !== 'all') query = query.eq('status', status);
      const { data, error } = await query;
      if (!error && data) {
        return (data as any[]).map((row) => ({ ...row, phone: row.public_phone || '' })) as ReviewItem[];
      }
    }
  } catch { /* ignore — fall through to LS */ }

  const list = getLSReviews();
  const filtered = status && status !== 'all' ? list.filter((r) => r.status === status) : list;
  if (getAdminSessionToken()) return filtered;
  return filtered.map((review) => ({
    ...review,
    phone: maskReviewPhone(review.phone, review.phone_country),
    public_phone: maskReviewPhone(review.phone, review.phone_country),
  }));
};

export const approveReview = async (id: number): Promise<boolean> => {
  // Phase 3: route through admin-api
  try {
    const { adminApproveReview } = await import('./adminApi');
    await adminApproveReview(id);
    return true;
  } catch {
    const list = getLSReviews();
    setLSReviews(list.map((r) => (r.id === id ? { ...r, status: 'approved' as const } : r)));
    return true;
  }
};

export const rejectReview = async (id: number): Promise<boolean> => {
  // Phase 3: route through admin-api
  try {
    const { adminRejectReview } = await import('./adminApi');
    await adminRejectReview(id);
    return true;
  } catch {
    const list = getLSReviews();
    setLSReviews(list.map((r) => (r.id === id ? { ...r, status: 'rejected' as const } : r)));
    return true;
  }
};

export const deleteReview = async (id: number): Promise<boolean> => {
  // Phase 3: route through admin-api
  try {
    const { adminDeleteReview } = await import('./adminApi');
    await adminDeleteReview(id);
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
  // Phase 3: route through admin-api
  try {
    const { adminUpdateReview } = await import('./adminApi');
    await adminUpdateReview(id, updates);
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
  // Phase 3: loop client-side via admin-api
  try {
    const { adminApproveReview } = await import('./adminApi');
    await Promise.all(ids.map(id => adminApproveReview(id)));
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
  // Phase 3: loop client-side via admin-api
  try {
    const { adminRejectReview } = await import('./adminApi');
    await Promise.all(ids.map(id => adminRejectReview(id)));
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
  // Phase 3: loop client-side via admin-api
  try {
    const { adminDeleteReview } = await import('./adminApi');
    await Promise.all(ids.map(id => adminDeleteReview(id)));
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
  // Phase 3: route through admin-api (loop client-side)
  try {
    const { adminBulkUpdateReviewPlacements } = await import('./adminApi');
    await adminBulkUpdateReviewPlacements(ids, placements);
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
