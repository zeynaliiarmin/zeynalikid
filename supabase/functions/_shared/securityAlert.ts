// 🛡 نگهبان امنیتی — گزارش خودکارِ رویدادهای مشکوک به ربات تلگرامِ مالک.
// فارسیِ کامل با عنوان انگلیسی (SECURITY ALERT) تا ماهیت «گزارش هک/خطر امنیتی» روشن باشد.
// هیچ اقدامی علیه کاربر انجام نمی‌دهد؛ فقط اطلاع می‌دهد. ضد‌اسپم: هر کلید حداکثر یک هشدار در ۴۵ دقیقه.
type SecKind = "rate-limit" | "portal-brute" | "admin-brute" | "captcha" | "custom";

const FA: Record<SecKind, string> = {
  "rate-limit": "عبور از سقف درخواست‌ها — احتمال حمله یا ربات",
  "portal-brute": "تلاش مشکوک ورود به پنل کاربر — حدس کد پیگیری/شماره",
  "admin-brute": "تلاش‌های ناموفق مکرر برای ورود پنل مدیریت",
  captcha: "رد شدن بررسی کپچا — احتمال ربات",
  custom: "رویداد امنیتی",
};
const EN: Record<SecKind, string> = {
  "rate-limit": "rate-limit exceeded (possible attack/bot)",
  "portal-brute": "portal login brute-force pattern (code guessing)",
  "admin-brute": "repeated failed admin logins",
  captcha: "captcha verification failed (likely bot)",
  custom: "security event",
};

const lastSent = new Map<string, number>();
const TTL = 45 * 60_000;

export async function sendSecurityAlert(kind: SecKind, detail: string, dedupeKey = ""): Promise<boolean> {
  try {
    const token = String(Deno.env.get("TELEGRAM_BOT_TOKEN") || "").trim();
    const chat = String(Deno.env.get("TELEGRAM_CHAT_ID") || "").trim();
    if (!token || !chat) return false;
    const key = `${kind}:${dedupeKey || "-"}`.slice(0, 160);
    const now = Date.now();
    for (const [k, t] of lastSent) if (now - t > TTL) lastSent.delete(k);
    if (now - (lastSent.get(key) || 0) < TTL) return false;
    lastSent.set(key, now);
    const project = String(Deno.env.get("TELEGRAM_PROJECT_NAME") || "Site").slice(0, 60);
    const time = new Date().toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });
    const text = [
      "🛡 گزارش خطر امنیتی | SECURITY ALERT 🛡",
      `پروژه: ${project}`,
      `نوع: ${FA[kind]}`,
      `Type: ${EN[kind]}`,
      detail ? `جزئیات: ${detail.slice(0, 900)}` : "",
      `زمان (تهران): ${time}`,
      "این پیام خودکار است؛ فقط اطلاع‌رسانی می‌کند و اقدامی انجام نشده.",
    ].join("\n");
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
