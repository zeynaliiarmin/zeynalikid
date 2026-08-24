// supabase/functions/_shared/cors.ts
// Shared CORS helpers for all Zeynalikid Edge Functions.
// Allowed origins:
//   - Production: https://zeynalikid.vercel.app
//   - Zeynalikid-owned Vercel aliases/previews beginning with zeynalikid-
//   - Local dev: http://localhost:5173 (Vite default)
// Other projects' *.vercel.app origins are intentionally rejected.

const ALLOWED_PRIMARY_ORIGIN="https://zeynalikid.vercel.app";
const ALLOWED_PREVIEW_PREFIX="zeynalikid-";
const ALLOWED_LOCAL="http://localhost:5173";
// Custom domains can be added at runtime through the comma-separated
// ALLOWED_ORIGINS Edge secret; no code change or cross-project wildcard is needed.
const CONFIGURED_ORIGINS=new Set(String(Deno.env.get("ALLOWED_ORIGINS")||"").split(",").map(v=>v.trim().replace(/\/$/,"")).filter(Boolean));

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const normalized=origin.replace(/\/$/,"");
  if(normalized===ALLOWED_PRIMARY_ORIGIN||normalized===ALLOWED_LOCAL||CONFIGURED_ORIGINS.has(normalized))return true;
  try {
    const u = new URL(origin);
    if (u.protocol === "https:" && u.hostname.startsWith(ALLOWED_PREVIEW_PREFIX) && u.hostname.endsWith(".vercel.app")) return true;
    return false;
  } catch {
    return false;
  }
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function jsonResponse(
  body: unknown,
  status = 200,
  origin = "",
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("Origin") ?? "";
    const allowed = isAllowedOrigin(origin) ? origin : "";
    return new Response(null, { status: 200, headers: corsHeaders(allowed) });
  }
  return null;
}

export function getOrigin(req: Request): string {
  const origin = req.headers.get("Origin") ?? "";
  return isAllowedOrigin(origin) ? origin : "";
}
