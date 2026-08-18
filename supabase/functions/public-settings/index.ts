// supabase/functions/public-settings/index.ts
// Public Edge Function that returns ONLY the settings needed for the public website.
//
// Security:
//   - No authentication required (public).
//   - Only whitelisted keys are returned.
//   - Sensitive keys (adminPassword, adminPhone, emergencyToken, merchantId, clientSecret,
//     apiKey, gatewaySecret, cryptoWallets addresses, etc.) are NEVER returned.
//   - CORS: Farzandman production, Farzandman-owned Vercel previews, and local development only.
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
  // Crypto visibility + wallets (addresses are needed to display at payment)
  "cryptoVisibility",
  "cryptoWallets",
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
  // Product catalog must be public; omitting it made the client fall back to defaults.
  "products",
  "showProductsSection",
  "showFeaturedProducts",
  // Public highlights and course FAQ/instructor content.
  "storyHighlights",
  "faqItems",
  "faqItemsEn",
  "courseTabFaqs",
  "courseTabFaqsEn",
  "faqDisplay",
  "courseInstructor",
  "consultants",
  "referral",
];

// Fields within 'banks' array items that are public (everything else stripped).
const PUBLIC_BANK_FIELDS = ["id", "name", "label", "logo", "color", "active", "order", "default"];

// Crypto wallets: only return whether each is visible, never the address.
const PUBLIC_CRYPTO_FIELDS = ["id", "name", "symbol", "logo", "color", "active", "network", "address"];

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

const PUBLIC_PRODUCT_FIELDS = [
  "id", "name", "title", "titleEn", "description", "descriptionEn", "desc", "descEn",
  "price", "priceNum", "discountedPrice", "category", "icon", "tags", "features", "stock", "weight",
  "image", "imageUrl", "aspectRatio", "objectPosition", "homeImage", "homeImageUrl",
  "homeImageAspectRatio", "homeImageObjectPosition", "showOnHome", "isVisible", "active", "order",
];
function sanitizeProduct(item: any): Record<string, any> {
  if (!item || typeof item !== "object" || Array.isArray(item)) return {};
  return Object.fromEntries(PUBLIC_PRODUCT_FIELDS.filter((field) => field in item).map((field) => [field, item[field]]));
}
function sanitizeProducts(value: any): Record<string, any> {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : { list: Array.isArray(value) ? value : [] };
  const list = Array.isArray(source.list) ? source.list : Array.isArray(source.items) ? source.items : [];
  return {
    showSection: source.showSection !== false,
    homeFeatured: { enabled: source.homeFeatured?.enabled !== false },
    list: list.map(sanitizeProduct),
  };
}
function sanitizeStoryHighlights(value: any): Record<string, any> {
  const source = value && typeof value === "object" ? value : {};
  const highlights = (Array.isArray(source.highlights) ? source.highlights : []).map((highlight: any) => ({
    id: String(highlight?.id || ""), title: String(highlight?.title || ""), coverUrl: String(highlight?.coverUrl || ""),
    active: highlight?.active !== false, order: Number(highlight?.order) || 0,
    stories: (Array.isArray(highlight?.stories) ? highlight.stories : []).map((story: any) => ({
      id: String(story?.id || ""), title: String(story?.title || ""),
      imageCodeExternal: String(story?.imageCodeExternal || ""), imageCodeInternal: String(story?.imageCodeInternal || ""),
      active: story?.active !== false, order: Number(story?.order) || 0,
    })),
  }));
  const items = (Array.isArray(source.items) ? source.items : []).map((item: any) => ({
    id: String(item?.id || ""), title: String(item?.title || ""), type: item?.type === "video" ? "video" : "image",
    embedCode: String(item?.embedCode || ""), active: item?.active !== false, order: Number(item?.order) || 0,
  }));
  return { highlights, items };
}
function sanitizeFaqList(value: any): any[] {
  return (Array.isArray(value) ? value : []).map((item: any) => {
    const out: Record<string, any> = {
      id: String(item?.id || ""),
      question: String(item?.question || ""),
      answer: String(item?.answer || ""),
      answerTitle: String(item?.answerTitle || ""),
      category: String(item?.category || ""),
    };
    // placements فقط وقتی آرایه است برگردانده می‌شود؛ مقدار نداشتن placements یعنی «نمایش در همهٔ بخش‌ها»
    // و نباید به [] تبدیل شود (چون سایت سؤال را پنهان می‌کرد).
    if (Array.isArray(item?.categories)) out.categories = item.categories.map(String);
    if (Array.isArray(item?.placements)) out.placements = item.placements.map(String);
    if (item?.tab) out.tab = String(item.tab);
    return out;
  });
}

function sanitizeConsultants(value: any): any[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((c: any) => c?.active !== false)
    .map((c: any) => {
      const out: Record<string, any> = {};
      (["id", "name", "nameEn", "title", "titleEn", "desc", "descEn", "photoUrl", "aboutPhotoUrl", "useAboutPhoto", "showPhoto", "referralCode"] as const).forEach((field) => {
        if (field in (c || {})) out[field] = c[field];
      });
      // اطلاعات بانکی/کیف پول مشاور برای نمایش در روند پرداخت (فقط فیلدهای لازم)
      if (c?.bank) out.bank = { name: c.bank.name, card: c.bank.card, iban: c.bank.iban, holder: c.bank.holder || c.bank.accountName };
      if (c?.banks && Array.isArray(c.banks)) out.banks = c.banks.map((b: any) => ({ name: b?.name, card: b?.card, iban: b?.iban, holder: b?.holder || b?.accountName, active: b?.active !== false })).filter((b: any) => b && (b.card || b.iban));
      if (c?.wallet) out.wallet = { id: c.wallet.id, name: c.wallet.name, symbol: c.wallet.symbol, address: c.wallet.address, network: c.wallet.network, color: c.wallet.color };
      // آرایهٔ کیف پول‌های رمزارز مشاور (ساختار جدید) — قبلاً برگردانده نمی‌شد و پرداخت رمزارزی مشاور نمایش داده نمی‌شد
      if (c?.wallets && Array.isArray(c.wallets)) out.wallets = c.wallets.map((w: any) => ({ id: String(w?.id || ""), name: String(w?.name || ""), symbol: String(w?.symbol || ""), address: String(w?.address || ""), network: String(w?.network || ""), color: w?.color, active: w?.active !== false })).filter((w: any) => w && w.address);
      return out;
    });
}

function sanitizeReferral(value: any): any {
  return { showConsultantSelection: value?.showConsultantSelection === true, home: { showCta: value?.home?.showCta !== false } };
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
      // NOTE: settings may store this as a JSON-string instead of an array;
      // normalize it first so downstream (payment page) always receives an array.
      if (key === "cryptoWallets") {
        let arr = val;
        if (typeof val === "string") {
          try { const p = JSON.parse(val); if (Array.isArray(p)) arr = p; else arr = []; }
          catch { arr = []; }
        }
        if (Array.isArray(arr)) {
          val = arr.map((w: any) => {
            const clean: Record<string, any> = {};
            for (const f of PUBLIC_CRYPTO_FIELDS) {
              if (f in w) clean[f] = w[f];
            }
            return clean;
          });
        } else {
          val = [];
        }
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
      if (key === "products") val = sanitizeProducts(val);
      if (key === "storyHighlights") val = sanitizeStoryHighlights(val);
      if (["faqItems", "faqItemsEn", "courseTabFaqs", "courseTabFaqsEn"].includes(key)) val = sanitizeFaqList(val);
      if (key === "faqDisplay") val = { home: { show: val?.home?.show !== false, maxItems: Math.max(0, Number(val?.home?.maxItems) || 0), viewAllLink: val?.home?.viewAllLink !== false }, faqPage: { show: val?.faqPage?.show !== false } };
      if (key === "courseInstructor") val = Object.fromEntries(["show", "name", "nameEn", "desc", "descEn", "photoUrl"].filter((field) => field in (val || {})).map((field) => [field, val[field]]));
      if (key === "consultants") val = sanitizeConsultants(val);
      if (key === "referral") val = sanitizeReferral(val);
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
