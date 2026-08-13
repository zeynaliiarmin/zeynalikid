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
  // Licenses (public display — image, title, description)
  "licenses",
  "designSystem",
  "sections",
  // Public image URLs + crop/frame metadata (no private storage or credentials)
  "images",
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
  // Public media/content pages. These contain display text and public embed URLs only;
  // nested values are explicitly sanitized below (phone numbers are masked).
  "customPlatforms",
  "mediaItems",
  "mediaCountryMode",
  "experience",
  "education",
  "experienceTabs",
];

// Fields within 'banks' array items that are public (everything else stripped).
const PUBLIC_BANK_FIELDS = ["id", "name", "label", "logo", "color", "active", "order", "default"];

// Crypto wallets: only return whether each is visible, never the address.
const PUBLIC_CRYPTO_FIELDS = ["id", "name", "symbol", "logo", "color", "active", "network"];

const PUBLIC_MEDIA_ITEM_FIELDS = [
  "id", "type", "title", "titleEn", "description", "descriptionEn", "descriptionCourses",
  "body", "keywords", "tags", "active", "isVisible", "order", "thumbnail", "displayMode",
  "mediaCategory", "mediaCategories", "categories", "platform", "platforms", "manualCode",
  "youtubeCode", "aparatCode", "youtubeUrl", "aparatUrl", "externalCode", "internalCode",
  "imageUrl", "audioUrl", "url", "phone",
];

function maskPublicPhone(value: unknown): string {
  const digits = String(value ?? "").replace(/[^0-9۰-۹٠-٩]/g, "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (digits.length < 7) return "";
  return `${digits.slice(0, 4)}xxxx${digits.slice(-3)}`;
}

function sanitizeMediaItem(item: any): Record<string, any> {
  if (!item || typeof item !== "object" || Array.isArray(item)) return {};
  const clean: Record<string, any> = {};
  for (const field of PUBLIC_MEDIA_ITEM_FIELDS) {
    if (!(field in item)) continue;
    clean[field] = field === "phone" ? maskPublicPhone(item[field]) : item[field];
  }
  return clean;
}

function sanitizeMediaGroup(value: any): any {
  if (Array.isArray(value)) return value.map(sanitizeMediaItem);
  if (!value || typeof value !== "object") return {};
  const clean: Record<string, any> = {};
  for (const group of ["videos", "audios", "images", "texts"]) {
    if (Array.isArray(value[group])) clean[group] = value[group].map(sanitizeMediaItem);
  }
  return clean;
}

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
      if ((key === "education" || key === "experience") && val && typeof val === "object") {
        val = { items: Array.isArray(val.items) ? val.items.map(sanitizeMediaItem) : [] };
      }
      if (key === "mediaItems") val = sanitizeMediaGroup(val);
      if (key === "customPlatforms") {
        val = (Array.isArray(val) ? val : Object.values(val || {})).map((platform: any) => ({
          id: String(platform?.id || ""),
          name: String(platform?.name || ""),
          code: String(platform?.code || ""),
          vpnRequired: platform?.vpnRequired === true,
        }));
      }
      if (key === "experienceTabs" && val && typeof val === "object") {
        val = Object.fromEntries(["video", "audio", "image", "text"]
          .filter((tab) => tab in val)
          .map((tab) => [tab, val[tab] !== false]));
      }
      if (key === "mediaCountryMode" && !["auto", "iran", "intl"].includes(val)) val = "auto";
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
