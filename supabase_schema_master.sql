-- ==============================================================================
-- ZEYNALIKID PLATFORM (زینالیکید) — MASTER SUPABASE SQL SCHEMA (Stage 11 / v5.0)
-- Engineered for GLM Agent & Supabase Database Deployment
-- Includes all Tables, Storage Buckets, Foreign Keys, RLS Policies, Triggers & Cross-Course Synchronization
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. STORAGE BUCKETS (باکت‌های ذخیره‌سازی فایل‌ها)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES 
('voice-notes', 'voice-notes', true),
('tongue-photos', 'tongue-photos', true),
('images', 'images', true),
('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies: Public Read & Insert
CREATE POLICY "Public Read Voice Notes" ON storage.objects FOR SELECT USING (bucket_id = 'voice-notes');
CREATE POLICY "Public Insert Voice Notes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'voice-notes');
CREATE POLICY "Public Delete Voice Notes" ON storage.objects FOR DELETE USING (bucket_id = 'voice-notes');

CREATE POLICY "Public Read Tongue Photos" ON storage.objects FOR SELECT USING (bucket_id = 'tongue-photos');
CREATE POLICY "Public Insert Tongue Photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tongue-photos');
CREATE POLICY "Public Delete Tongue Photos" ON storage.objects FOR DELETE USING (bucket_id = 'tongue-photos');

CREATE POLICY "Public Read Images" ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "Public Insert Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');
CREATE POLICY "Public Delete Images" ON storage.objects FOR DELETE USING (bucket_id = 'images');

CREATE POLICY "Public Read Files" ON storage.objects FOR SELECT USING (bucket_id = 'files');
CREATE POLICY "Public Insert Files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'files');
CREATE POLICY "Public Delete Files" ON storage.objects FOR DELETE USING (bucket_id = 'files');


-- ==============================================================================
-- 2. MAIN SUBMISSIONS & CHILD PROFILES (پرونده‌های کودک، فرم‌های مشاوره و دوره‌ها)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.submissions (
    id BIGINT PRIMARY KEY,
    tracking_code VARCHAR(30) NOT NULL UNIQUE,
    type VARCHAR(30) DEFAULT 'consultation', -- 'consultation' یا 'course'
    date VARCHAR(30),
    time VARCHAR(30),
    
    -- مشخصات والد / کاربر
    parent_name VARCHAR(150),
    country_code VARCHAR(10) DEFAULT '+98',
    parent_phone VARCHAR(50),
    full_phone VARCHAR(60) NOT NULL,
    
    -- مشخصات فیزیکی کودک
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', '')),
    age VARCHAR(10),
    height VARCHAR(20),
    weight VARCHAR(20),
    
    -- ارزیابی اشتها، گوارش و بیماری‌ها
    topics TEXT[] DEFAULT '{}',
    digestive_issues TEXT[] DEFAULT '{}',
    appetite_status VARCHAR(50),
    special_disease TEXT DEFAULT '',
    special_conditions TEXT[] DEFAULT '{}',
    parent_notes TEXT DEFAULT '',
    
    -- رسانه‌ها (ویس و عکس زبان)
    voice_note_url TEXT DEFAULT '',
    tongue_photo_urls TEXT[] DEFAULT '{}',
    
    -- وضعیت، پیگیری و دسته‌بندی ادمین
    category VARCHAR(50) DEFAULT 'مشاوره اولیه',
    consultation_status VARCHAR(50) DEFAULT 'مشاوره اولیه',
    consultation_status_changed_at TIMESTAMPTZ DEFAULT NOW(),
    order_status VARCHAR(50) DEFAULT 'جدید',
    priority VARCHAR(20) DEFAULT 'normal', -- 'normal' یا 'high'
    unread BOOLEAN DEFAULT TRUE,
    is_new BOOLEAN DEFAULT TRUE,
    follow_reminder BOOLEAN DEFAULT TRUE,
    follow_ups JSONB DEFAULT '[null, null, null, null, null]'::jsonb,
    admin_notes TEXT DEFAULT '',
    time_slot VARCHAR(50) DEFAULT '',
    similar_to BIGINT,
    
    -- نسخه و دستورالعمل‌های مصرف اختصاصی
    usage_instructions TEXT DEFAULT '',
    meal_plan TEXT DEFAULT '',
    show_meal_plan BOOLEAN DEFAULT FALSE,
    usage_pdf_url TEXT DEFAULT '',
    meal_pdf_url TEXT DEFAULT '',
    product_usage JSONB DEFAULT '{}'::jsonb,
    user_notes TEXT DEFAULT '',
    
    -- اطلاعات اصلاحی کاربر
    show_corrective_tab BOOLEAN DEFAULT FALSE,
    corrective_data JSONB DEFAULT '{}'::jsonb,
    corrective TEXT DEFAULT '',
    
    -- اطلاعات ثبت دوره، ارسال پستی و پرداخت
    course JSONB DEFAULT NULL,
    shipping JSONB DEFAULT NULL,
    payment JSONB DEFAULT NULL,
    child_info JSONB DEFAULT NULL,
    edit_history JSONB DEFAULT '[]'::jsonb,
    change_history JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_full_phone ON public.submissions(full_phone);
CREATE INDEX IF NOT EXISTS idx_submissions_tracking_code ON public.submissions(tracking_code);
CREATE INDEX IF NOT EXISTS idx_submissions_type ON public.submissions(type);
CREATE INDEX IF NOT EXISTS idx_submissions_priority ON public.submissions(priority);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at DESC);


-- ==============================================================================
-- 3. TRANSACTIONS & PAYMENT GATEWAYS (تراکنش‌های آنلاین و فیش‌های بانکی)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(50) NOT NULL,
    submission_id BIGINT REFERENCES public.submissions(id) ON DELETE SET NULL,
    gateway VARCHAR(30) NOT NULL, -- 'zarinpal', 'idpay', 'payping', 'blubank', 'stripe', 'paypal', 'crypto'
    amount BIGINT NOT NULL,
    currency VARCHAR(10) DEFAULT 'IRR',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'success', 'failed', 'canceled'
    ref_id VARCHAR(100),
    authority VARCHAR(100),
    user_name VARCHAR(150),
    user_phone VARCHAR(50),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_authority ON public.transactions(authority);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);


-- ==============================================================================
-- 4. REVIEWS & PLACEMENTS (مدیریت نظرات، تجربیات و محل‌های نمایش در سایت)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reviews (
    id BIGINT PRIMARY KEY,
    course_id VARCHAR(100) DEFAULT 'عمومی',
    reviewer_name VARCHAR(150) NOT NULL,
    rating SMALLINT CHECK (rating >= 1 AND rating <= 5) DEFAULT 5,
    comment TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    placements TEXT[] DEFAULT ARRAY['home', 'courses', 'course_detail'], -- محل‌های نمایش در سایت
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_course_id ON public.reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);


-- ==============================================================================
-- 5. USER QUESTIONS (سوالات کاربران و سوال دارم)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_questions (
    id BIGINT PRIMARY KEY,
    phone VARCHAR(50),
    question TEXT NOT NULL,
    question_en TEXT,
    voice_note_url TEXT,
    answer TEXT,
    answer_en TEXT,
    page_source VARCHAR(100) DEFAULT 'faq', -- 'faq', 'courses', 'education', 'home'
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'answered', 'archived'
    is_published_to_faq BOOLEAN DEFAULT FALSE,
    faq_category VARCHAR(100) DEFAULT 'عمومی',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    answered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_questions_status ON public.user_questions(status);
CREATE INDEX IF NOT EXISTS idx_user_questions_phone ON public.user_questions(phone);


-- ==============================================================================
-- 6. FAQS (پرسش‌ها و پاسخ‌های متداول رسمی)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.faqs (
    id VARCHAR(50) PRIMARY KEY,
    question_fa TEXT NOT NULL,
    answer_fa TEXT NOT NULL,
    question_en TEXT,
    answer_en TEXT,
    category VARCHAR(100) DEFAULT 'عمومی',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    show_in_home BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faqs_category ON public.faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_is_active ON public.faqs(is_active);


-- ==============================================================================
-- 7. COURSES & TABS (کاتالوگ دوره‌ها و هماهنگی چند دوره‌ای)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.course_tabs (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    title_en VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.courses (
    id VARCHAR(100) PRIMARY KEY,
    tab_id VARCHAR(50) REFERENCES public.course_tabs(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    title_en VARCHAR(200),
    description TEXT,
    desc_en TEXT,
    price BIGINT NOT NULL DEFAULT 0,
    discounted_price BIGINT DEFAULT 0,
    features TEXT[] DEFAULT '{}',
    prerequisites TEXT[] DEFAULT '{}', -- پیش‌نیازها و هماهنگی بین دوره‌ها
    related_courses TEXT[] DEFAULT '{}', -- دوره‌های مکمل پیشنهادی
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_tab_id ON public.courses(tab_id);
CREATE INDEX IF NOT EXISTS idx_courses_is_active ON public.courses(is_active);


-- ==============================================================================
-- 8. EDU ARTICLES & MEDIA (مقالات، پادکست‌ها و ویدیوهای علمی متد TC)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.edu_articles (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(250) NOT NULL,
    title_en VARCHAR(250),
    summary TEXT,
    content TEXT,
    media_type VARCHAR(20) DEFAULT 'article', -- 'article', 'video', 'audio', 'image'
    aparat_id VARCHAR(100),
    youtube_id VARCHAR(100),
    audio_url TEXT,
    thumbnail_url TEXT,
    category VARCHAR(100) DEFAULT 'رشد و تغذیه',
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edu_articles_category ON public.edu_articles(category);
CREATE INDEX IF NOT EXISTS idx_edu_articles_media_type ON public.edu_articles(media_type);


-- ==============================================================================
-- 9. TRUST SENTENCES (جملات اعتمادساز متحرک و گردان)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.trust_sentences (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(250) NOT NULL,
    title_en VARCHAR(250),
    description TEXT,
    category VARCHAR(50) DEFAULT 'health', -- 'health', 'appetite', 'mind', 'general'
    tabs TEXT[] DEFAULT ARRAY['health'],
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 10. BANK ACCOUNTS & SHIPPING (حساب‌های بانکی و پیکربندی ارسال)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    card VARCHAR(30) NOT NULL,
    iban VARCHAR(50) NOT NULL,
    color VARCHAR(30) DEFAULT 'blue',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 11. PRODUCTS & INVENTORY (محصولات انبار و مکمل‌های طریقه مصرف)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.products (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) DEFAULT 'مکمل',
    price BIGINT DEFAULT 0,
    stock_quantity INT DEFAULT 0,
    dosage_guide TEXT,
    usage_time TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 12. SYSTEM SETTINGS (تنظیمات سراسری و پیکربندی سامانه)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'global_settings',
    theme VARCHAR(50) DEFAULT 'motherly-trust',
    site_title VARCHAR(150) DEFAULT 'زینالیکید',
    browser_title VARCHAR(200) DEFAULT 'فرم مشاوره زینالیکید',
    specialist_name VARCHAR(150) DEFAULT 'کارشناس رشد و تغذیه کودک و نوجوان زینالیکید',
    admin_phone VARCHAR(50) DEFAULT '09125703684',
    tracking_digit_count INT DEFAULT 5,
    form_fields JSONB DEFAULT '{}'::jsonb,
    delivery_config JSONB DEFAULT '{}'::jsonb,
    payment_config JSONB DEFAULT '{}'::jsonb,
    contacts JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 13. TRASH & SOFT-DELETED SUBMISSIONS (سطل بازیافت)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.deleted_submissions (
    id BIGINT PRIMARY KEY,
    tracking_code VARCHAR(30),
    data JSONB NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_by VARCHAR(100) DEFAULT 'admin'
);

CREATE INDEX IF NOT EXISTS idx_deleted_submissions_deleted_at ON public.deleted_submissions(deleted_at DESC);


-- ==============================================================================
-- 14. LOGS (لاگ‌های پیگیری، بازدیدها و رویدادهای ادمین)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tracking_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code VARCHAR(30) NOT NULL,
    phone_queried VARCHAR(50),
    is_success BOOLEAN DEFAULT TRUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 15. COUPONS & DISCOUNTS (کوپن‌ها و کدهای تخفیف دوره‌ها)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.coupons (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type VARCHAR(20) DEFAULT 'percent', -- 'percent' یا 'fixed'
    discount_value BIGINT NOT NULL DEFAULT 0,
    valid_until TIMESTAMPTZ,
    usage_limit INT DEFAULT 100,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    applicable_courses TEXT[] DEFAULT '{}', -- دوره‌های مجاز
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons(is_active);


-- ==============================================================================
-- 16. SMS & NOTIFICATION LOGS (لاگ پیامک‌های ارسالی نوبت، کد پیگیری و فیش)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone VARCHAR(50) NOT NULL,
    message_text TEXT NOT NULL,
    template_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'failed'
    provider_response JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON public.sms_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON public.sms_logs(created_at DESC);


-- ==============================================================================
-- 17. DOWNLOADABLE FILES & EDUCATIONAL ASSETS (فایل‌های دانلودی و جزوات)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.downloadable_files (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) DEFAULT 'pdf',
    file_size_kb INT DEFAULT 0,
    course_id VARCHAR(100),
    is_public BOOLEAN DEFAULT FALSE,
    download_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_downloadable_files_course_id ON public.downloadable_files(course_id);


-- ==============================================================================
-- 18. ANALYTICS & TRAFFIC EVENTS (آمار بازدید و تحلیل رفتار کاربران)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL, -- 'view_course', 'click_cta', 'start_form', 'submit_form', 'payment_attempt'
    page_path VARCHAR(200),
    session_id VARCHAR(100),
    device_type VARCHAR(30), -- 'mobile', 'tablet', 'desktop'
    meta_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);


-- ==============================================================================
-- 19. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloadable_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anonymous Insert & Read Policies (Public Form & Catalog Access)
CREATE POLICY "Public Read Submissions" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "Public Insert Submissions" ON public.submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Submissions" ON public.submissions FOR UPDATE USING (true);
CREATE POLICY "Public Delete Submissions" ON public.submissions FOR DELETE USING (true);

CREATE POLICY "Public Read Reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Public Insert Reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Reviews" ON public.reviews FOR UPDATE USING (true);
CREATE POLICY "Public Delete Reviews" ON public.reviews FOR DELETE USING (true);

CREATE POLICY "Public Read Questions" ON public.user_questions FOR SELECT USING (true);
CREATE POLICY "Public Insert Questions" ON public.user_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Questions" ON public.user_questions FOR UPDATE USING (true);
CREATE POLICY "Public Delete Questions" ON public.user_questions FOR DELETE USING (true);

CREATE POLICY "Public Read Catalog" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Public Manage Catalog" ON public.courses FOR ALL USING (true);

CREATE POLICY "Public Read Tabs" ON public.course_tabs FOR SELECT USING (true);
CREATE POLICY "Public Manage Tabs" ON public.course_tabs FOR ALL USING (true);

CREATE POLICY "Public Read FAQs" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "Public Manage FAQs" ON public.faqs FOR ALL USING (true);

CREATE POLICY "Public Read Articles" ON public.edu_articles FOR SELECT USING (true);
CREATE POLICY "Public Manage Articles" ON public.edu_articles FOR ALL USING (true);

CREATE POLICY "Public Read Trust" ON public.trust_sentences FOR SELECT USING (true);
CREATE POLICY "Public Manage Trust" ON public.trust_sentences FOR ALL USING (true);

CREATE POLICY "Public Read Banks" ON public.bank_accounts FOR SELECT USING (true);
CREATE POLICY "Public Manage Banks" ON public.bank_accounts FOR ALL USING (true);

CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Manage Products" ON public.products FOR ALL USING (true);

CREATE POLICY "Public Read Settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public Manage Settings" ON public.settings FOR ALL USING (true);

CREATE POLICY "Public Manage Transactions" ON public.transactions FOR ALL USING (true);
CREATE POLICY "Public Manage Trash" ON public.deleted_submissions FOR ALL USING (true);
CREATE POLICY "Public Insert Tracking Logs" ON public.tracking_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Insert Admin Logs" ON public.admin_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Insert Page Views" ON public.page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Manage Coupons" ON public.coupons FOR ALL USING (true);
CREATE POLICY "Public Manage SMS Logs" ON public.sms_logs FOR ALL USING (true);
CREATE POLICY "Public Manage Files" ON public.downloadable_files FOR ALL USING (true);
CREATE POLICY "Public Manage Analytics" ON public.analytics_events FOR ALL USING (true);
