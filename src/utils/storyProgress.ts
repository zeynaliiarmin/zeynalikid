// پیشرفت مشاهدهٔ استوری‌ها/هایلایت‌ها — کاملاً سمت کلاینت (localStorage).
// ⚠️ هیچ دیتابیس/فضای سوپابیس درگیر نمی‌شود؛ وضعیت «دیده‌شده» برای هر دستگاه جدا نگه داشته می‌شود
// (مثل اپ‌های بدون لاگین). چون id استوری‌ها را نگه می‌داریم، هر وقت استوری جدیدی به یک هایلایت
// اضافه شود، id آن در لیست «دیده‌شده» نیست و هایلایت دوباره رنگی می‌شود.

const KEY = 'zk_story_progress_v1';
const HINT_KEY = 'zk_story_hint_shown_v1';

export type StoryProgress = Record<string, { seen: string[] }>;

export function getStoryProgress(): StoryProgress {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function markStorySeen(highlightId: string, storyId: string): void {
  try {
    const p = getStoryProgress();
    const cur = p[highlightId] || { seen: [] };
    const seen = Array.isArray(cur.seen) ? cur.seen : [];
    if (!seen.includes(storyId)) {
      p[highlightId] = { seen: [...seen, storyId] };
      localStorage.setItem(KEY, JSON.stringify(p));
    }
  } catch { /* ignore */ }
}

/** آیا همهٔ استوری‌های این هایلایت دیده شده‌اند؟ (اگر هیچ استوری‌ای نباشد، true) */
export function isHighlightSeen(highlightId: string, storyIds: string[]): boolean {
  if (!storyIds.length) return true;
  const seen = new Set((getStoryProgress()[highlightId]?.seen) || []);
  return storyIds.every((id) => seen.has(id));
}

/** ایندکس اولین استوریِ دیده‌نشده (برای ادامه از همان‌جا) — اگر همه دیده شده باشند -1 */
export function getResumeIndex(highlightId: string, storyIds: string[]): number {
  const seen = new Set((getStoryProgress()[highlightId]?.seen) || []);
  return storyIds.findIndex((id) => !seen.has(id));
}

export function hasSeenStoryHint(): boolean {
  try { return localStorage.getItem(HINT_KEY) === '1'; } catch { return true; }
}
export function markStoryHintSeen(): void {
  try { localStorage.setItem(HINT_KEY, '1'); } catch { /* ignore */ }
}
