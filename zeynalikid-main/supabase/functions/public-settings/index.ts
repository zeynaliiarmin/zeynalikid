// supabase/functions/public-settings/index.ts
// Public Edge Function that returns ONLY the settings needed for the public website.
//
// Security:
//   - No authentication required (public).
//   - Only whitelisted keys are returned.
//   - Sensitive keys (adminPassword, adminPhone, emergencyToken, merchantId, clientSecret,
//     apiKey, gatewaySecret, cryptoWallets addresses, etc.) are NEVER returned.
//   - CORS: same as other functions (zeynalikid.vercel.app + *.vercel.app).
//
// Deploy: supabase functions deploy public-settings --no-verify-jwt

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import {
  handleOptions, jsonResponse, getOrigin,
} from "../_shared/cors.ts";

// Whitelist of settings keys that the public website needs.
// Everything else is stripped from the response.
const PUBLIC_SETTINGS_WHITELIST = [
  // Display
  "siteTitle",
  "browserTitle",
  "specialistName",
  "showSpecialistPhoto",
  "photoUrl",
  "showProductsPage",
  "showLicensesPage",
  "adminLoginText",
  "designSystem",
  "sections",
  // Theme
  "theme",
  "publicThemeMode",
  // Translations (public text)
  "translations",
  // Trust messages
  "trustMessages",
  "trustRotateMs",
  // Daily tips
  "dailyTips",
  // Course tabs + catalog
  "courseTabs",
  // Shipping + delivery display
  "shippingMethods",
  "delivery",
  // Banks (display only — but we strip sensitive fields below)
  "banks",
  // Crypto visibility (addresses are stripped, only visibility flags returned)
  "cryptoVisibility",
  // Contacts (public)
  "contacts",
  "contactIcons",
  "contactVisibility",
  // Country codes (for phone selector)
  "countryCodes",
  // Form fields config
  "formFields",
  // Manual user questions (display)
  "manualUserQuestions",
  // Settings version
  "version",
  // Image compression
  "imageCompressionKB",
  // Tracking digit count
  "trackingDigitCount",
  // Time slots
  "timeSlots",
  // Tongue photo
  "isTonguePhotoRequired",
  // Menu visibility
  "menuVisibility",
  // Success messages
  "successMsg",
  "successSubMsg",
  "newFormBtn",
  "directCourseBtn",
  // Guest content
  "guestUsage",
  "guestMealPlan",
];

// Fields within 'banks' array items that are public (everything else stripped).
const PUBLIC_BANK_FIELDS = ["id", "name", "label", "logo", "color", "active", "order", "default"];

// Crypto wallets: only return whether each is visible, never the address.
const PUBLIC_CRYPTO_FIELDS = ["id", "name", "symbol", "logo", "color", "active", "network"];

function sanitizeSettings(settings: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of PUBLIC_SETTINGS_WHITELIST) {
    if (key in settings) {
      let val = settings[key];
      // Sanitize 'banks' — strip sensitive fields
      if (key === "banks" && Array.isArray(val)) {
        val = val.map((bank: any) => {
          const clean: Record<string, any> = {};
          for (const f of PUBLIC_BANK_FIELDS) {
            if (f in bank) clean[f] = bank[f];
          }
          return clean;
        });
      }
      // Sanitize 'cryptoWallets' — strip addresses, keep only display fields
      if (key === "cryptoWallets" && Array.isArray(val)) {
        val = val.map((w: any) => {
          const clean: Record<string, any> = {};
          for (const f of PUBLIC_CRYPTO_FIELDS) {
            if (f in w) clean[f] = w[f];
          }
          return clean;
        });
      }
      out[key] = val;
    }
  }
  return out;
}

serve(async (req) => {
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;
  const origin = getOrigin(req);

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("settings")
      .select("settings")
      .eq("key", "app_settings")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("public-settings error:", error);
      return jsonResponse({ error: "خطا در دریافت تنظیمات" }, 500, origin);
    }

    if (!data || !data.settings) {
      return jsonResponse({ settings: {} }, 200, origin);
    }

    // Sanitize — only return whitelisted, non-sensitive fields
    const sanitized = sanitizeSettings(data.settings);
    return jsonResponse({ settings: sanitized }, 200, origin);
  } catch (_e) {
    return jsonResponse({ error: "خطای سرور" }, 500, origin);
  }
});
