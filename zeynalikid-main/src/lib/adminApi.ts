// src/lib/adminApi.ts
// Frontend client for the admin-api edge function.
// All admin CRUD operations go through this module — never call Supabase directly
// for admin-only tables (submissions, settings, user_questions, reviews, page_views).
//
// Each function:
//   - Reads sessionToken from sessionStorage via getAdminSessionToken()
//   - Sends it as Authorization: Bearer <token>
//   - Throws a typed AdminApiError on failure (with status code + Persian message)
//   - Never falls back to direct Supabase access (no insecure fallback)

import { getAdminSessionToken, clearAdminSession } from '../utils/adminSession';
import type { Submission, AppSettings, UserQuestion, ReviewItem } from './supabase';

const ADMIN_API_URL = `${(import.meta.env.VITE_SUPABASE_URL as string || '').replace(/\/$/, '')}/functions/v1/admin-api`;

export class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

interface AdminApiOptions {
  // If true, a 401 response will trigger clearAdminSession() + redirect to /admin/login.
  // Default: true. Set to false if caller wants to handle 401 itself.
  autoRedirectOn401?: boolean;
}

async function callAdminApi(action: string, payload: Record<string, any> = {}, options: AdminApiOptions = {}): Promise<any> {
  const token = getAdminSessionToken();
  if (!token) {
    if (options.autoRedirectOn401 !== false) {
      clearAdminSession();
      // Use location.href for a hard redirect (more reliable than router in edge cases)
      if (typeof window !== 'undefined' && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    throw new AdminApiError('نشست ادمین یافت نشد. لطفاً دوباره وارد شوید.', 401);
  }

  let resp: Response;
  try {
    resp = await fetch(ADMIN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch (e: any) {
    throw new AdminApiError('خطا در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.', 0);
  }

  let body: any;
  try {
    body = await resp.json();
  } catch {
    body = {};
  }

  if (!resp.ok) {
    const message = body?.error || `خطای سرور (${resp.status})`;
    if (resp.status === 401 && options.autoRedirectOn401 !== false) {
      clearAdminSession();
      if (typeof window !== 'undefined' && window.location.pathname !== '/admin/login') {
        // Defer redirect to allow caller to show error first if needed
        setTimeout(() => { window.location.href = '/admin/login'; }, 100);
      }
    }
    throw new AdminApiError(message, resp.status);
  }

  return body;
}

// ──────────────────────────────────────────────────────────────────────────
// Submissions
// ──────────────────────────────────────────────────────────────────────────

export async function adminFetchSubmissions(opts: {
  page?: number; limit?: number; search?: string; type?: string; status?: string;
  includeDeleted?: boolean; sortBy?: string; sortOrder?: 'asc' | 'desc';
} = {}): Promise<{ submissions: Submission[]; total: number; page: number; limit: number }> {
  const body = await callAdminApi('list_submissions', opts);
  return {
    submissions: (body.submissions || []).map((row: any) => dbRowToSubmission(row)).filter(Boolean),
    total: body.total ?? 0,
    page: body.page ?? 1,
    limit: body.limit ?? 50,
  };
}

export async function adminFetchDeletedSubmissions(opts: {
  page?: number; limit?: number;
} = {}): Promise<{ submissions: Submission[]; total: number; page: number; limit: number }> {
  // Fetch deleted submissions by setting includeDeleted=true and filtering in client
  // (admin-api returns all + deleted_at if includeDeleted=true)
  // For now we fetch with includeDeleted and filter client-side; could be optimized later
  const body = await callAdminApi('list_submissions', {
    ...opts,
    includeDeleted: true,
    // We can't filter "deleted_at IS NOT NULL" server-side via current API, so client-filter
  });
  const all = (body.submissions || []).map((row: any) => dbRowToSubmission(row)).filter(Boolean);
  const deleted = all.filter((s: any) => s.deleted_at);
  return {
    submissions: deleted,
    total: deleted.length,
    page: body.page ?? 1,
    limit: body.limit ?? 50,
  };
}

export async function adminGetSubmission(id: string | number): Promise<Submission | null> {
  const body = await callAdminApi('get_submission', { id });
  return body.submission ? dbRowToSubmission(body.submission) : null;
}

export async function adminUpdateSubmission(id: string | number, updates: Partial<Submission>): Promise<{ updated: boolean; changedFields: string[] }> {
  // Strip top-level fields that the API doesn't accept as payload
  const { id: _id, created_at: _c, updated_at: _u, full_phone: _fp, deleted_at: _d, ...payloadUpdates } = updates as any;
  const body = await callAdminApi('update_submission', { id, updates: payloadUpdates });
  return { updated: body.updated === true, changedFields: body.changedFields ?? [] };
}

export async function adminSoftDeleteSubmission(id: string | number): Promise<void> {
  await callAdminApi('soft_delete_submission', { id });
}

export async function adminRestoreSubmission(id: string | number): Promise<void> {
  await callAdminApi('restore_submission', { id });
}

export async function adminPermanentDeleteSubmission(id: string | number): Promise<void> {
  await callAdminApi('permanent_delete_submission', { id, confirm: true });
}

export async function adminPermanentDeleteMultipleSubmissions(ids: Array<string | number>): Promise<void> {
  if (!ids.length) return;
  // admin-api doesn't have a bulk action — loop client-side
  // Could be optimized later by adding a bulk action to admin-api
  await Promise.all(ids.map(id => callAdminApi('permanent_delete_submission', { id, confirm: true })));
}

export async function adminUpdateMultipleSubmissions(ids: Array<string | number>, updates: Partial<Submission>): Promise<void> {
  if (!ids.length) return;
  const { id: _id, created_at: _c, updated_at: _u, full_phone: _fp, deleted_at: _d, ...payloadUpdates } = updates as any;
  await Promise.all(ids.map(id => callAdminApi('update_submission', { id, updates: payloadUpdates })));
}

// Convert DB row (id, full_phone, payload, created_at, updated_at, deleted_at) to Submission
// (same logic as dbRowToSubmission in supabase.ts — kept here to avoid circular imports)
function dbRowToSubmission(row: Record<string, any> | null): Submission | null {
  if (!row) return null;
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  return {
    ...payload,
    ...row,
    fullPhone: row.full_phone ?? payload.fullPhone ?? payload.full_phone,
  } as Submission;
}

// ──────────────────────────────────────────────────────────────────────────
// Settings
// ──────────────────────────────────────────────────────────────────────────

export async function adminFetchSettings(): Promise<AppSettings | null> {
  const body = await callAdminApi('list_settings');
  return body.settings ?? null;
}

export async function adminSaveSettings(settings: AppSettings): Promise<{ saved: boolean; blockedFields: string[] }> {
  const body = await callAdminApi('save_settings', { settings });
  return { saved: body.saved === true, blockedFields: body.blockedFields ?? [] };
}

// ──────────────────────────────────────────────────────────────────────────
// User Questions
// ──────────────────────────────────────────────────────────────────────────

export async function adminFetchUserQuestions(opts: {
  page?: number; limit?: number; status?: string;
} = {}): Promise<{ questions: UserQuestion[]; total: number; page: number; limit: number }> {
  const body = await callAdminApi('list_questions', opts);
  return {
    questions: body.questions ?? [],
    total: body.total ?? 0,
    page: body.page ?? 1,
    limit: body.limit ?? 50,
  };
}

export async function adminAnswerUserQuestion(id: number, answer: string, answerEn?: string): Promise<void> {
  await callAdminApi('update_question', { id, answer, answer_en: answerEn, status: 'answered' });
}

export async function adminArchiveUserQuestion(id: number): Promise<void> {
  await callAdminApi('update_question', { id, status: 'archived' });
}

export async function adminDeleteUserQuestion(id: number): Promise<void> {
  await callAdminApi('delete_question', { id, confirm: true });
}

// ──────────────────────────────────────────────────────────────────────────
// Reviews
// ──────────────────────────────────────────────────────────────────────────

export async function adminFetchReviews(opts: {
  page?: number; limit?: number; status?: string;
} = {}): Promise<{ reviews: ReviewItem[]; total: number; page: number; limit: number }> {
  const body = await callAdminApi('list_reviews', opts);
  return {
    reviews: body.reviews ?? [],
    total: body.total ?? 0,
    page: body.page ?? 1,
    limit: body.limit ?? 50,
  };
}

export async function adminApproveReview(id: number): Promise<void> {
  await callAdminApi('update_review', { id, status: 'approved' });
}

export async function adminRejectReview(id: number): Promise<void> {
  await callAdminApi('update_review', { id, status: 'rejected' });
}

export async function adminDeleteReview(id: number): Promise<void> {
  await callAdminApi('delete_review', { id, confirm: true });
}

export async function adminUpdateReview(id: number, updates: Partial<ReviewItem>): Promise<void> {
  await callAdminApi('update_review', { id, ...updates });
}

export async function adminBulkUpdateReviewPlacements(ids: number[], placements: string[]): Promise<void> {
  if (!ids.length) return;
  await Promise.all(ids.map(id => callAdminApi('update_review', { id, placements })));
}

// ──────────────────────────────────────────────────────────────────────────
// Page View Stats
// ──────────────────────────────────────────────────────────────────────────

export async function adminFetchPageViewStats(days: number = 30): Promise<{
  totalViews: number;
  days: number;
  topPages: Array<{ page_path: string; views: number }>;
  dailyCounts: Array<{ date: string; views: number }>;
}> {
  const body = await callAdminApi('list_page_view_stats', { days });
  return {
    totalViews: body.totalViews ?? 0,
    days: body.days ?? days,
    topPages: body.topPages ?? [],
    dailyCounts: body.dailyCounts ?? [],
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Signed URLs for private storage (Phase 6)
// Converts private storage public-format URLs into short-lived signed URLs
// so the admin panel can display receipts / tongue photos / voice notes / PDFs.
// ──────────────────────────────────────────────────────────────────────────

export async function adminGetSignedUrls(urls: string[]): Promise<Record<string, string>> {
  const body = await callAdminApi('get_signed_urls', { urls });
  return body.urls ?? {};
}

// ──────────────────────────────────────────────────────────────────────────
// Storage file deletion (via admin-api delete_storage_files action)
// Phase 5: anon storage DELETE is revoked; file removal happens server-side
// with service_role so only an authenticated admin session can delete files.
// ──────────────────────────────────────────────────────────────────────────

export async function adminDeleteStorageFiles(urls: string[]): Promise<{ deleted: number }> {
  const body = await callAdminApi('delete_storage_files', { urls });
  return { deleted: body.deleted ?? 0 };
}

// ──────────────────────────────────────────────────────────────────────────
// Cleanup receipts (uses cleanup-receipts function directly, not admin-api)
// ──────────────────────────────────────────────────────────────────────────

const CLEANUP_URL = `${(import.meta.env.VITE_SUPABASE_URL as string || '').replace(/\/$/, '')}/functions/v1/cleanup-receipts`;

export async function adminCleanupReceiptsDryRun(): Promise<{ targetFiles: number; oldestFile: string | null }> {
  const token = getAdminSessionToken();
  if (!token) throw new AdminApiError('نشست ادمین یافت نشد.', 401);

  const resp = await fetch(CLEANUP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ dryRun: true }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    if (resp.status === 401) {
      clearAdminSession();
      setTimeout(() => { window.location.href = '/admin/login'; }, 100);
    }
    throw new AdminApiError(body?.error || 'خطا در بررسی فیش‌ها', resp.status);
  }
  return {
    targetFiles: body.targetFiles ?? 0,
    oldestFile: body.oldestFile ?? null,
  };
}

export async function adminCleanupReceiptsExecute(): Promise<{ deleted: number; cleanedRows: number; targetFiles: number }> {
  const token = getAdminSessionToken();
  if (!token) throw new AdminApiError('نشست ادمین یافت نشد.', 401);

  const resp = await fetch(CLEANUP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ dryRun: false }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    if (resp.status === 401) {
      clearAdminSession();
      setTimeout(() => { window.location.href = '/admin/login'; }, 100);
    }
    throw new AdminApiError(body?.error || 'خطا در پاک‌سازی فیش‌ها', resp.status);
  }
  return {
    deleted: body.deleted ?? 0,
    cleanedRows: body.cleanedRows ?? 0,
    targetFiles: body.targetFiles ?? 0,
  };
}
