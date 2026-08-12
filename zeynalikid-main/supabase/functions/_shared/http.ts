// supabase/functions/_shared/http.ts
// Standard HTTP response helpers for Edge Functions.

export function ok(data: any, origin: string, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
      "Vary": "Origin",
    },
  });
}

export function err(
  message: string,
  origin: string,
  status = 400,
  extra: Record<string, any> = {},
): Response {
  return new Response(JSON.stringify({ ok: false, error: message, ...extra }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
      "Vary": "Origin",
    },
  });
}
