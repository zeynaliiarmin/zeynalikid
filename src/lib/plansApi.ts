// «برنامه‌ها» — توليد خودکار با هوش مصنوعی + خروجی TXT (فقط پنل ادمین)
import { isSupabaseConfigured, supabase } from './supabase';
import { getAdminSessionToken } from '../utils/adminSession';

export type PlansOut = { mealPlan: string; sportPlan: string };

const inflight = new Map<string, Promise<PlansOut>>();

/** فراخوانی تابع generate-plans؛ force=true یعنی بازتولید حتی اگر برنامه‌ای وجود دارد */
export async function generatePlans(submissionId: any, force = false): Promise<PlansOut> {
  if (!isSupabaseConfigured || !supabase) throw new Error('اتصال ابری فعال نیست');
  const key = String(submissionId);
  if (!force && inflight.has(key)) return inflight.get(key)!;
  const task = (async (): Promise<PlansOut> => {
    try {
      const token = getAdminSessionToken();
      const res: any = await (supabase as any).functions.invoke('generate-plans', { body: { sessionToken: token, submissionId, force } });
      if (res?.error) {
        let m = String(res.error?.message || 'تولید برنامه ناموفق بود');
        try { const j = await (res.error as any)?.context?.json?.(); if (j?.error) m = String(j.error); } catch { /* body was not JSON */ }
        throw new Error(m);
      }
      const data: any = res?.data;
      if (!data?.ok) throw new Error(String(data?.error || 'تولید برنامه انجام نشد'));
      return { mealPlan: String(data.mealPlan || ''), sportPlan: String(data.sportPlan || '') };
    } finally {
      inflight.delete(key);
    }
  })();
  if (!force) inflight.set(key, task);
  return task;
}

/** پس از «مشاوره شده» شدن، اگر برنامه خوراکی خالی بود — بی‌صدا تولید و اعمال شود */
export function autoGeneratePlansIfEmpty(id: any, currentMeal: any, apply: (out: PlansOut) => void) {
  if (!isSupabaseConfigured) return;
  if (String(currentMeal || '').trim()) return;
  generatePlans(id).then(apply).catch(() => { /* خطای خودکار بی‌صدا؛ دکمه دستی همیشه هست */ });
}

/** دانلود فایل متنی برنامه (یونیکد فارسی سالم در Notepad) */
export function downloadPlanTxt(name: string, text: string) {
  const blob = new Blob(['\uFEFF' + String(text || '')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${String(name || 'plan').replace(/[\\/:*?"<>|]/g, '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
