### افزودهٔ ۱۴۰۵/۰۶/۱۹ — لحن آمیانهٔ مؤدبان + چرخه‌حیات صفحهٔ امنیت

**پس‌زمینه:** قانون لحن مالک (فرهنگ ChatGPTِ تدوین‌شده) و سه قانون چرخه‌حیات دادهٔ امنیتی در هر دو پروژه پیاده و دیپلوی شد.

**۱) لحن آمیانهٔ مؤدبان**
- `_shared/generativeAssistant.ts`: خط لحن فشردهٔ قبلی به مجموعهٔ کامل ۸ قاعده (می/نمی چسبیده، ان→ون، خوا→خا، بدون اعراب، است→ـه، صور گفتاری، بدون کوچه‌بازاری/توهین: برار/چار/گنده ممنوع، داداش مجاز) + نمونه‌های اصلاح ارتقا یافت.
- `_shared/contentPolicy.ts` نسخه ۳: بلاک `AMIYANE_GUIDE` (rules_fa / frequent_pairs_fa / prohibitions_fa / sample_rewrite_fa) در خروجی `get_policy`؛ قانون سخت `no_bookish_persian` در `scanContentPolicy` — ≥۲ نشانهٔ کتابی ⇒ 422.
- سؤال مستقیم «هوش مصنوعی هستی؟» همچنان با پاسخ صادقانهٔ آماده (بدون افشای مدل) پاسخ می‌شود — بدون تغییر، در `assistant-public/index.ts`.

**۲) چرخه‌حیات صفحهٔ امنیت**
- `admin-api`: `listApiAuditLogs` پیش از خواندن، رکوردهای `api_audit_logs` قدیمی‌تر از ۳ روز را پاک می‌کند؛ `content-api.logAudit` نیز پیش از ثبت رکورد جدید همان پاک‌سازی را می‌کند (خودترمیم‌شونده در هر سوخت).
- `admin-api.listPendingApprovals`: رکوردهای `api_pending_approvals` با status غیر pending و `decided_at<now-1day` پاک می‌شوند؛ درخواست‌های بدون تصمیم هرگز خودکار حذف نمی‌شوند. RPC `expire_pending_approvals` دست‌نخورده.
- UI `ApiKeysManager.tsx`: کلیدهای `revoked` دیگر در لیست نشان داده نمی‌شوند (در DB حفظ می‌شوند).
- اسکوپ/تشخیص‌گیری: دیپلوی شد در هر دو پروژه؛ تغییری در schema نبود (soft-delete حفظ شده).

**مدارک:** `AI-CONTENT-AGENT-API.md` نسخه ۳ (§۶-د) در root workspace (/home/user).

**تست/دیپلوی:** typecheck+unit (zk: 2663، af: 2662 تست سبز). توابع دیپلوی‌شده: `assistant-public`, `admin-api`, `content-api` × هر دو پروژه (kkdrvexwzuuumjezipnd و doikoqzarsuprcwkghsq).

