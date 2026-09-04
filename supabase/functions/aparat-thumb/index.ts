// supabase/functions/aparat-thumb/index.ts
// تصویر بندانگشتی (poster) واقعی ویدیوهای آپارات — به‌صورت redirect.
//
// چرا این تابع لازم است: لینک `.../videohash/xxx/vt/frame` آپارات یک صفحه HTML است،
// نه تصویر. تصویر واقعی (big_poster/small_poster) فقط از API آپارات در دسترس است که
// از مرورگر به‌خاطر CORS قابل اتکا نیست. این تابع آن را سرور-ساید می‌گیرد و به تصویر
// redirect می‌کند تا مستقیماً در تگ <img> قابل استفاده باشد (برای <img> نیازی به CORS نیست).
//
// Deploy: supabase functions deploy aparat-thumb --no-verify-jwt

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const uid = (url.searchParams.get("uid") || "").trim().replace(/[^A-Za-z0-9]/g, "").slice(0, 32);
    if (!uid) return new Response("bad request", { status: 400 });

    const api = await fetch(`https://www.aparat.com/etc/api/video/videohash/${uid}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept": "application/json",
      },
    });
    if (!api.ok) return new Response("not found", { status: 404 });

    const data = await api.json();
    const poster = String(data?.video?.big_poster || data?.video?.small_poster || "");
    if (!/^https?:\/\//.test(poster)) return new Response("not found", { status: 404 });

    return Response.redirect(poster, 302);
  } catch {
    return new Response("error", { status: 502 });
  }
});
