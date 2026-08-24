import { migrateMediaItem } from '../utils/mediaPlacement';

export const defaultCountries = [
 {id:'ir',name:'ایران',nameEn:'Iran',code:'+98',flag:'🇮🇷',regex:'^(0?9)\\d{9}$',required:true,locked:true},
 {id:'us',name:'آمریکا/کانادا',nameEn:'US/Canada',code:'+1',flag:'🇺🇸',regex:'^[2-9]\\d{9}$',required:true},
 {id:'uk',name:'انگلیس',nameEn:'United Kingdom',code:'+44',flag:'🇬🇧',regex:'^0\\d{9,10}$'},
 {id:'de',name:'آلمان',nameEn:'Germany',code:'+49',flag:'🇩🇪',regex:'^0\\d{9,10}$'},
 {id:'se',name:'سوئد',nameEn:'Sweden',code:'+46',flag:'🇸🇪',regex:'^0\\d{8,9}$'},
 {id:'ch',name:'سوئیس',nameEn:'Switzerland',code:'+41',flag:'🇨🇭',regex:'^0\\d{8,9}$'},
 {id:'no',name:'نروژ',nameEn:'Norway',code:'+47',flag:'🇳🇴',regex:'^[49]\\d{7}$'},
 {id:'fr',name:'فرانسه',nameEn:'France',code:'+33',flag:'🇫🇷',regex:'^0\\d{9}$'},
 {id:'au',name:'استرالیا',nameEn:'Australia',code:'+61',flag:'🇦🇺',regex:'^0\\d{8,9}$'},
 {id:'ae',name:'امارات',nameEn:'UAE',code:'+971',flag:'🇦🇪',regex:'^0\\d{8}$'},
 {id:'tr',name:'ترکیه',nameEn:'Turkey',code:'+90',flag:'🇹🇷',regex:'^0\\d{9}$'},
 {id:'nl',name:'هلند',nameEn:'Netherlands',code:'+31',flag:'🇳🇱',regex:'^0\\d{8,9}$'},
 {id:'in',name:'هند',nameEn:'India',code:'+91',flag:'🇮🇳',regex:'^[6-9]\\d{9}$'},
 {id:'af',name:'افغانستان',nameEn:'Afghanistan',code:'+93',flag:'🇦🇫',regex:'^0?\\d{9}$'},
 {id:'other',name:'سایر',nameEn:'Other',code:'+',flag:'🌍',regex:'^\\d{7,}$'}
] as Array<Record<string, unknown>>;

const DEFAULT_SERVICES = [
  { id: 's1', title: 'فعال‌سازی رشد قد', titleEn: 'Height Growth Activation', description: 'تحریک طبیعی صفحات رشد قد با تغذیه هدفمند و مکمل‌های ارگانیک.', descriptionEn: 'Stimulate natural growth plates with targeted nutrition and organic supplements.', icon: '' },
  { id: 's2', title: 'برنامه تغذیه شخصی‌سازی‌شده', titleEn: 'Personalized Nutrition Plan', description: 'طراحی برنامه غذایی و مکمل اختصاصی بر اساس طبع و ذائقه فرزندتان.', descriptionEn: 'Custom meal and supplement plan based on your child\'s temperament and taste.', icon: '' },
  { id: 's3', title: 'کنترل وزن و اصلاح رشد قدی', titleEn: 'Weight Control & Height Correction', description: 'بررسی وزن و قد و ارائه راهکارهای اصلاحی.', descriptionEn: 'Weight and height assessment with corrective solutions.', icon: '' },
  { id: 's4', title: 'تحلیل طبع و مزاج (زبان‌شناسی)', titleEn: 'Temperament & Tongue Analysis', description: 'تحلیل تخصصی عکس زبان فرزند برای شناسایی ریشه پنهان بی‌اشتهایی، کندی رشد یا ضعف بدنی.', descriptionEn: 'Specialized tongue photo analysis to identify hidden roots of appetite loss, slow growth or weakness.', icon: '' },
  { id: 's5', title: 'تقویت سیستم ایمنی', titleEn: 'Immune System Boost', description: 'ایمن‌سازی طبیعی بدن کودک در برابر بیماری‌های ویروسی و عفونی با مکمل‌های کاملاً ارگانیک و گیاهی.', descriptionEn: 'Natural immunity against viral and infectious diseases with fully organic and herbal supplements.', icon: '' },
  { id: 's6', title: 'پایش تخصصی رشد قد و وزن', titleEn: 'Specialized Growth Tracking', description: 'بررسی دقیق روند رشد قدی، وزنی و استخوان‌بندی کودک.', descriptionEn: 'Precise tracking of height, weight and bone development.', icon: '' },
  { id: 's7', title: 'توانمندسازی والدین', titleEn: 'Parent Empowerment', description: 'آموزش نکات کاربردی تغذیه، مدیریت بدغذایی و اصلاح سبک زندگی؛ تا خودتان به متخصص سلامت فرزندتان تبدیل شوید.', descriptionEn: 'Practical nutrition, picky eating management and lifestyle training — become your child’s health expert.', icon: '‍‍' },
  { id: 's8', title: 'برنامه ورزشی (در صورت نیاز)', titleEn: 'Exercise Program (if needed)', description: 'معرفی حرکات ورزشی ساده در خانه یا بهترین رشته ورزشی متناسب با شرایط فرزندتان، جهت همراهی بهتر در دورهٔ تخصصی.', descriptionEn: 'Simple home exercises or the best sport tailored to your child for better progress.', icon: '' },
  { id: 's9', title: 'تنظیم خواب و آرام‌سازی', titleEn: 'Sleep Regulation & Calm', description: 'بهبود کیفیت خواب شبانه با برنامه اصولی و مکمل‌های آرام‌بخش و گیاهی؛ خوابی که موتور اصلی ترشح هورمون رشد است.', descriptionEn: 'Improve nighttime sleep quality with proper routine and herbal calm supplements — sleep is the main engine for growth hormone.', icon: '' },
] as Array<{ id: string; title: string; titleEn?: string; description: string; descriptionEn?: string; icon: string }>;

export const defaultSettings = {

  // ─── مشاورین و لینک‌های ارجاع ───
  consultants: [] as Array<{
    id: string;
    name: string;         // نام فارسی (الزامی)
    nameEn: string;       // نام انگلیسی (الزامی — برای ساخت کد ارجاع)
    title?: string;
    titleEn?: string;
    desc?: string;
    descEn?: string;
    photoUrl?: string;    // عکس (در صورت انتخاب/آپلود)
    useAboutPhoto?: boolean; // استفاده از عکس «درباره ما» (جلوگیری از آپلود دوباره)
    aboutPhotoUrl?: string;  // عکسِ منبع «درباره ما»
    showPhoto?: boolean;     // نمایش عکس در اطلاعات مشاور
    referralCode?: string;   // کد ارجاع یکتا و کوتاه
    bank?: Record<string, any>;   // اطلاعات بانکی اختصاصی
    wallet?: Record<string, any>; // اطلاعات کیف پول رمزارز
    active?: boolean;
    order?: number;
  }>,
  referral: {
    showConsultantSelection: false, // نمایش انتخاب مشاور در روند ثبت (پیش‌فرض مخفی)
    home: {
      showCta: true,               // نمایش دکمه‌های CTA هوم (ثبت مشاوره/مشاهده دوره)
    },
    // ── متون راهنمای قابل‌ویرایش در حالت لینک ارجاع ──
    texts: {
      homeBase: '',
      homeTab: '',
      homeCourse: '',
      coursesTab: '',
      coursesCourse: '',
      popupTitle: '',
      popupPrimaryBase: '',
      popupPrimaryTab: '',
      popupPrimaryCourse: '',
      reconsultLabel: '',
      reconsultQuestion: '',
    },
  },

  dailyTips: [
    { id:'t1', fa:'سفره آرام یعنی بدون فشار؛ وعده‌های منظم و تنوع کوچک کافیه.', en:"A calm table means no pressure; regular meals and tiny variety are enough." },
    { id:'t2', fa:'خواب کافی کودک، تمرکز فردای اوست.', en:"Your child's sleep tonight is their focus tomorrow." },
    { id:'t3', fa:'مکمل بدون مشورت، مسیر ناشناخته است.', en:"Supplements without consultation are an unknown path." },
    { id:'t4', fa:'رشد قد، مسیر هر کودک خودش را دارد.', en:"Height growth has its own path for each child." },
    { id:'t5', fa:'الگوی غذایی کودک رو چند روز یادداشت کنید؛ تصویر واقعی‌تری می‌بینید.', en:"Track your child's eating pattern for a few days; you'll see a clearer picture." },
    { id:'t6', fa:'پیگیری مرحله‌ای، همراهی واقعی است.', en:"Step-by-step follow-up is real companionship." },
    { id:'t7', fa:'کودک با سلیقه، نیاز به تنوع دارد نه اجبار.', en:"A child with preferences needs variety, not force." },
  ],

  // ─── سوالات دستی پرتکرار والدین (برای صفحه سوالات کاربران - افزودن دستی توسط ادمین)
  manualUserQuestions: [
    // { id: string, question: string, answer: string, category: string, active: boolean, order: number }
  ] as Array<{ id: string; question: string; answer: string; category?: string; active?: boolean; order?: number }>,

  currencyUnit: 'تومان',

  // ─── مدیریت محتوا ───
  mediaItems: [
    // {
    //   id: string,
    //   title: string,
    //   description: string,
    //   type: 'video' | 'image' | 'audio',
    //   platforms: {
    //     youtube?: string,
    //     aparat?: string,
    //     externalImage?: string,
    //     internalImage?: string,
    //     externalAudio?: string,
    //     internalAudio?: string,
    //     custom?: { name: string; code: string; vpnRequired: boolean }[]
    //   },
    //   displayMode: 'external' | 'internal' | 'both' | 'custom',
    //   categories: ('parent-experience' | 'growth' | 'appetite' | 'intelligence')[],
    //   isVisible: boolean
    // }
  ] as Array<Record<string, unknown>>,

  // ─── پلتفرم‌های سفارشی ───
  customPlatforms: [
    // { id: string, name: string, code: string, vpnRequired: boolean }
  ] as Array<Record<string, unknown>>,

  // ─── محصولات با عکس ───
  products: {
    showSection: false,
    homeFeatured: {
      enabled: true,
    },
    items: [
      // { id, title, image, homeImage, showOnHome, homeImageAspectRatio, homeImageObjectPosition, ... }
    ] as Array<Record<string, unknown>>,
  },

  // ─── هایلایت‌ها با کاور ───
  highlights: [
    // { id: string, title: string, coverImage: string, stories: [...] }
  ] as Array<Record<string, unknown>>,

  // ─── مجوزها با عکس ───
  licenses: [
    // { id: string, title: string, description: string, image: string, isVisible: boolean }
  ] as Array<Record<string, unknown>>,

  // ─── خدمات ما ───
  servicesDisplayMode: {
    home: 'carousel',
    courses: 'carousel',
  },

  servicesVisibility: {
    home: true,
    courses: true,
    parentExperience: false,
    licenses: false,
    trainings: false,
    about: false,
    faq: false,
    contact: false,
  },

  carouselSettings: {
    columns: 2,
    autoScrollInterval: 8,
    autoScrollEnabled: true,
    pauseOnSwipe: 3,
    columnsData: [
      {
        id: 'col-1',
        items: DEFAULT_SERVICES.slice(0, 5).map((service, index) => ({
          ...service,
          id: `c1-${index + 1}`,
          isVisible: true,
          isDefault: true,
        })),
      },
      {
        id: 'col-2',
        items: DEFAULT_SERVICES.slice(5, 9).map((service, index) => ({
          ...service,
          id: `c2-${index + 1}`,
          isVisible: true,
          isDefault: true,
        })),
      },
    ],
  },

  listSettings: {
    items: DEFAULT_SERVICES.map((service, index) => ({
      ...service,
      id: `l${index + 1}`,
      isVisible: true,
      isDefault: true,
    })),
  },

  // ── دوره‌های ویژه (Featured Courses) ───
  featuredCourses: {
    enabled: true,
    title: 'پرطرفدارترین‌ها',
    titleEn: 'Most Popular',
    heroCourseId: '',
    courseIds: [] as string[],
    maxCourses: 5,
    showStock: true,
    showDiscount: true,
  },

  // ─── دوره‌های ویژه با تگ (مرحله ۱) ───
  taggedCourses: {
    enabled: true,
    title: 'پرفروش‌ترین دوره‌ها',
    titleEn: 'Best Selling Courses',
    tags: ['پرفروش', 'پرطرفدار', 'محبوب'] as string[],
    maxCourses: 6,
  },

  // ─── تنظیمات صفحه معرفی دوره‌ها ───
  coursePageSettings: {
    showStock: true,
    showDiscount: true,
  },

  // ─── تصاویر صفحه اصلی و فرم مشاوره ───
  images: {
    hero: {
      url: '/images/asset13c-hero-mother-child.webp',
      alt: 'مادر و کودک در بنر اصلی زینالیکید',
      enabled: true,
      storagePath: '',
      aspectRatio: '1.05 / 1',
      objectPosition: 'center',
    },
    trustBox: {
      url: '/images/asset13c-trust-parent-care.webp',
      alt: 'مادر و کودک خندان',
      enabled: true,
      storagePath: '',
    },
    courseDefault: {
      url: '/images/course-default.webp',
      alt: 'دوره آموزشی',
      enabled: true,
    },
    specialist: {
      url: '/images/specialist-default.webp',
      alt: 'کارشناس تغذیه',
      enabled: true,
      storagePath: '',
    },
    homeAvatar: {
      url: '/images/specialist/specialist-about.webp',
      alt: 'کارشناس رشد و تغذیه',
      enabled: true,
      storagePath: '',
    },
    // ─── کتابخانهٔ تصاویر بخش‌ها (گالری مدیریت تصاویر) ───
    // هر بخش تب و پوشهٔ مجزای خودش را دارد؛ عکس‌های هر بخش فقط در همان بخش دیده می‌شوند.
    library: {
      licenses: [],   // { id, url, alt, aspectRatio, objectPosition, storagePath, enabled }
      products: [],
      courses: [],
      general: [],
    },
    // عکس کارشناس/متخصص فرم مشاوره (پیش‌فرض: photoUrl موجود)
    consultationPhoto: {
      url: '/specialist-photo.webp',
      alt: 'کارشناس فرم مشاوره',
      enabled: true,
      storagePath: '',
    },
    // عکس هیرو صفحهٔ درباره ما
    aboutHero: {
      url: '/images/specialist/specialist-hero-master.webp',
      alt: 'کارشناس ارشد زینالیکید',
      enabled: true,
      storagePath: '',
    },
    tcMethodGraphic: {
      url: '/images/graphics/graphic-tc-method.webp',
      alt: 'تصویر روش TC',
      enabled: true,
      storagePath: '',
      aspectRatio: '4 / 3',
      objectPosition: 'center',
    },
  },

  // ─── باکس جملات اعتمادساز جدید (TrustBoxNew) ───
  trustBoxes: {
    enabled: true,
    defaultInterval: 8,
    home: { enabled: true, interval: 8, category: 'health' },
    tabs: {
      height: { enabled: true, interval: 8, category: 'height' },
      appetite: { enabled: true, interval: 8, category: 'appetite' },
      mind: { enabled: true, interval: 8, category: 'mind' },
    },
    sentences: {
      health: [
        { id: 'h1', title: 'فرمولاسیون آلمانی، تولید کاملاً بهداشتی و ایمن.', description: 'محصولاتمون تحت لیسانس آلمان، با تأییدیه سازمان غذا و دارو و نشان سیب سلامت تولید میشن. سالم، ایمن و بدون ذره‌ای مواد شیمیایی.', titleEn: 'German formulation, fully hygienic and safe production.', descriptionEn: 'Our products are produced under German license, with Food and Drug approval and health certification. Healthy, safe and free of chemicals.', priority: 5, tabs: ['health'], active: true },
        { id: 'h2', title: 'پشتیبانت هستیم، نه فروشنده‌ای که ناپدید بشه.', description: 'از روز اول تا آخرین روز دوره، کنارتیم. هفتگی پیگیر وضعیت رشد، اشتها و خواب فرزندت هستیم.', titleEn: 'We’re by your side, not a seller who disappears.', descriptionEn: 'From day one to the last day of the course, we’re with you. We follow your child’s growth, appetite and sleep weekly.', priority: 5, tabs: ['health'], active: true },
        { id: 'h3', title: 'اگر نتیجه نگیریم، صریح میگیم.', description: 'تعهد ما فقط وقتی معنا داره که تو هم همراهیمون کنی. روراست و متعهد، درست مثل خودت.', titleEn: 'If we can’t get results, we’ll say so honestly.', descriptionEn: 'Our commitment only makes sense when you accompany us. Honest and committed, just like you.', priority: 4, tabs: ['health'], active: true },
        { id: 'h4', title: 'زیر لیسانس آلمان بودن، یعنی پاسپورت سلامت اروپا تو جیب محصول ماست.', description: 'ما این افتخار رو با فرمولاسیون کاملاً بومی و مناسب طبع بچه‌های ایران ترکیب کردیم.', titleEn: 'Being under German license means a European health passport is in our product’s pocket.', descriptionEn: 'We combine this honor with a fully native formulation suitable for Iranian children’s temperament.', priority: 4, tabs: ['health'], active: true },
        { id: 'h5', title: 'تجربه‌های ثبت‌شده والدین، راهنمای انتخاب آگاهانه‌تر است.', description: 'تجربه‌ها و بازخوردهای منتشرشده را ببینید و با آگاهی بیشتری تصمیم بگیرید.', titleEn: 'Published parent experiences can support a more informed choice.', descriptionEn: 'Review the published feedback and experiences before making your decision.', priority: 5, tabs: ['health'], active: true },
        { id: 'h6', title: 'بچت قهرمان نمیشه چون مکمل می‌خوره؛ قهرمان میشه چون بدنش از درون ترمیم میشه.', description: 'تفاوت بین یه کودک خسته، بدغذا و کم‌حوصله با یه کودک پرانرژی و سرزنده، ریشه‌اش تو ترمیم سلولیه.', titleEn: 'Your child won’t become a hero because they take supplements; they’ll become a hero because their body heals from within.', descriptionEn: 'The difference between a tired, picky, low-energy child and an energetic, cheerful one is cellular repair.', priority: 5, tabs: ['health'], active: true },
        { id: 'h7', title: 'سلامتی یه مقصد نیست، یه مسیر شخصی‌سازیه.', description: 'ما با ۱۷۰۰ محصول، مسیر سلامت فرزند تو رو منحصربه‌فرد طراحی می‌کنیم.', titleEn: 'Health is not a destination, it’s a personalized journey.', descriptionEn: 'With 1,700 products, we design a unique health path for your child.', priority: 4, tabs: ['health'], active: true },
        { id: 'h8', title: 'پیشگیری، ریشه‌ای‌ترین کار ماست.', description: 'نمی‌ذاریم ضعف ایمنی، کوتاهی قد یا کاهش تمرکز، فرزندت رو غافلگیر کنه.', titleEn: 'Prevention is our most fundamental work.', descriptionEn: 'We won’t let weak immunity, short stature or poor focus surprise your child.', priority: 4, tabs: ['health'], active: true },
        { id: 'h9', title: 'یک بدن سالم، یک کودکی شاد می‌سازه.', description: 'ما پشت صحنه انرژی، بازیگوشی و خنده‌های فرزندت هستیم.', titleEn: 'A healthy body builds a happy childhood.', descriptionEn: 'We are behind your child’s energy, playfulness and laughter.', priority: 3, tabs: ['health'], active: true },
        { id: 'h10', title: 'کودک امروز، سرمایه فردای جامعه است.', description: 'ما با تغذیه سالم، از امروز برای فردای ایران قهرمان می‌سازیم.', titleEn: 'The child of today is the capital of tomorrow’s society.', descriptionEn: 'With healthy nutrition, we build champions for Iran’s future from today.', priority: 3, tabs: ['health'], active: true },
      ],
      height: [
        { id: 'ht1', title: 'رشد قد یه مسابقه با زمانه؛ ما زمان رو از دست نمی‌دیم.', description: 'صفحات رشد بسته بشن، دیر میشه. روش TC طراحی شده تا حتی یک سانتیمتر از پتانسیل قدی فرزندت هدر نره.', titleEn: 'Height growth is a race against time; we don’t waste time.', descriptionEn: 'Once growth plates close, it’s too late. The TC method is designed so not even one centimeter of your child’s height potential is wasted.', priority: 5, tabs: ['height'], active: true },
        { id: 'ht2', title: 'دشمن رشد قد، کمبود آهن و زینک نیست؛ بی‌خبری توئه.', description: 'تا وقتی ندونی بدن بچهات چه ریزمغذی‌هایی رو جذب نمی‌کنه، هر چی بدی فایده نداره.', titleEn: 'The enemy of height growth is not iron and zinc deficiency; it’s your unawareness.', descriptionEn: 'Until you know which micronutrients your child’s body doesn’t absorb, nothing you give will help.', priority: 5, tabs: ['height'], active: true },
        { id: 'ht3', title: 'قد کوتاه، اعتماد به نفس کوتاه میاره.', description: 'این یه شعار نیست، یه حقیقت تلخه. ما برای رسیدن به سانتیمترهای از دست رفته نمی‌جنگیم، برای اعتماد به نفس آینده‌ش می‌جنگیم.', titleEn: 'Short stature brings short self-confidence.', descriptionEn: 'This is not a slogan, it’s a bitter truth. We don’t fight for lost centimeters, we fight for future self-confidence.', priority: 5, tabs: ['height'], active: true },
        { id: 'ht4', title: 'هر سانتیمتر قد، یه جهان اعتماد به نفس برای بچهات می‌سازه.', description: 'نگذار کمبود امروز، حسرت فردای فرزندت بشه.', titleEn: 'Every centimeter of height builds a world of confidence for your child.', descriptionEn: 'Don’t let today’s deficiency become tomorrow’s regret.', priority: 4, tabs: ['height'], active: true },
        { id: 'ht5', title: 'هورمون رشد رو با تغذیه بیدار کن، نه با آمپول.', description: 'روش TC، سوخت طبیعی جهش قدی رو بدون دستکاری هورمونی فراهم می‌کنه.', titleEn: 'Wake up growth hormone with nutrition, not injections.', descriptionEn: 'The TC method provides natural fuel for height spurts without hormonal manipulation.', priority: 4, tabs: ['height'], active: true },
        { id: 'ht6', title: 'خواب کافی + تغذیه هدفمند = موتور روشن رشد قد.', description: 'بادرنجبویه و املاح ضروری، نسخه شب‌های طلایی رشد رو می‌پیچن.', titleEn: 'Enough sleep + targeted nutrition = engine on for height growth.', descriptionEn: 'Lemon balm and essential minerals write the golden night prescription for growth.', priority: 3, tabs: ['height'], active: true },
        { id: 'ht7', title: 'پروتئین بار ۴۰ گرمی ما، یه آجر محکم برای برج بلند قدشه.', description: '۱۲ گرم پروتئین خالص، تحویل مستقیم به صفحات رشد.', titleEn: 'Our 40-gram protein bar is a strong brick for the tower of height.', descriptionEn: '12 grams of pure protein, delivered directly to growth plates.', priority: 3, tabs: ['height'], active: true },
        { id: 'ht8', title: 'بچه‌ای که کلسیم جذب نکنه، استخون‌هاش آهنگ رشد رو کند می‌زنن.', description: 'داینامین ایزوتونیک، کلسیم و D3 رو ۱۰ برابر سریع‌تر به استخوان می‌رسونه.', titleEn: 'A child who doesn’t absorb calcium, their bones slow the rhythm of growth.', descriptionEn: 'Isotonic Dynamin delivers calcium and D3 10x faster to bones.', priority: 4, tabs: ['height'], active: true },
        { id: 'ht9', title: 'صفحه رشد یه درِ کشویی‌ست که یه روز برای همیشه بسته میشه.', description: 'قبل از بسته شدنش، سوخت لازم رو بهش برسون.', titleEn: 'The growth plate is a sliding door that one day closes forever.', descriptionEn: 'Before it closes, deliver the fuel it needs.', priority: 5, tabs: ['height'], active: true },
        { id: 'ht10', title: 'مکمل رشد قد، وقتی با طبع فرزندت هماهنگ باشه، بهتر جواب می‌ده.', description: 'ما با تحلیل تخصصی عکس زبان، مسیر جذب و رشد رو بهتر می‌شناسیم.', titleEn: 'Height supplements work best when they match your child’s temperament.', descriptionEn: 'With tongue photo analysis, we unlock absorption for your child’s stature.', priority: 4, tabs: ['height'], active: true },
        { id: 'ht11', title: 'عکس زبون بچهات، نقشه گنج سلامتی و قد بلندشه.', description: 'ما به جای حدس زدن، نقشه می‌خونیم. ریشه کندرشدی رو دقیقاً همونجا پیدا می‌کنیم.', titleEn: 'Your child’s tongue photo is the treasure map for health and tall stature.', descriptionEn: 'Instead of guessing, we read the map. We find the root of slow growth right there.', priority: 5, tabs: ['height'], active: true },
        { id: 'ht12', title: 'نسخهٔ منحصربه‌فرد برای رشد منحصربه‌فرد فرزندت.', description: 'هیچ دو نسخه‌ای در زینالیکید شبیه هم نیست. چون هیچ دو کودکی شبیه هم نیستن.', titleEn: 'A unique prescription for your child’s unique growth.', descriptionEn: 'No two prescriptions at Zeynalikid are alike, because no two children are alike.', priority: 4, tabs: ['height'], active: true },
        { id: 'ht13', title: 'تجربه‌های والدین می‌تواند به انتخاب آگاهانه‌تر مسیر رشد کمک کند.', description: 'بازخوردها را ببینید و سپس متناسب با شرایط فرزندتان تصمیم بگیرید.', titleEn: 'Published parent experiences can support a more informed choice.', descriptionEn: 'Review published feedback and consider your child’s individual needs before deciding.', priority: 5, tabs: ['height'], active: true },
        { id: 'ht14', title: 'هر هفته که بگذره و اقدام نکنی، یه قدم از هم‌سن و سالاش عقب‌تر میفته.', description: 'کمبود وزن موندگار میشه و قد از دست میره. تصمیم سخت امروز، حسرت آسون فردا رو حذف می‌کنه.', titleEn: 'Every week you delay, they fall one step behind peers.', descriptionEn: 'Weight deficit becomes permanent and height is lost. Today’s hard decision removes tomorrow’s easy regret.', priority: 5, tabs: ['height'], active: true },
        { id: 'ht15', title: 'بچت قهرمان قدی میشه چون بدنش از درون ترمیم میشه.', description: 'تفاوت بین یه کودک خسته و کم‌قد، با یه کودک پرانرژی و بلندقامت، ریشه‌اش تو ترمیم سلولیه.', titleEn: 'Your child becomes a height champion because their body heals from within.', descriptionEn: 'The difference between a tired, short child and an energetic, tall child is cellular repair.', priority: 4, tabs: ['height'], active: true },
        { id: 'ht16', title: '۱۷۰۰ محصول داریم، اما فقط ۴ تاش مال بچه توئه.', description: 'این یعنی ما یه سوزن رو از انبار کاه پیدا می‌کنیم. نسخه عمومی ممنوع، فقط شفای اختصاصی برای رشد.', titleEn: 'We have 1,700 products, but only 4 belong to your child.', descriptionEn: 'This means we find a needle in a haystack. No generic prescription, only specialized healing for growth.', priority: 4, tabs: ['height'], active: true },
      ],
      appetite: [
        { id: 'ap1', title: 'بی‌اشتهایی مادر اصلی مشکلات کودکان است.', description: 'تا وقتی بچه غذا نخوره، بدن روند رشد نرمالی نخواهد داشت، سیستم ایمنی ضعیف می‌شه، استخوان‌بندی ناقص می‌مونه و حتی مغز برای تمرکز و یادگیری سوخت کافی نداره.', titleEn: 'Loss of appetite is the mother of all children’s problems.', descriptionEn: 'Until a child eats, the body won’t have normal growth, immunity weakens, bone structure remains incomplete and even the brain lacks fuel for focus and learning.', priority: 5, tabs: ['appetite'], active: true },
        { id: 'ap2', title: 'بی‌اشتهایی یهویی نمیاد که یهویی بره. ریشه‌اش رو پیدا کن، نه با زور.', description: 'پشت هر بچه بدغذا، یه سیستم گوارشی هست که کمک می‌خواد.', titleEn: 'Loss of appetite doesn’t come suddenly to go suddenly. Find its root, not with force.', descriptionEn: 'Behind every picky child is a digestive system that needs help.', priority: 5, tabs: ['appetite'], active: true },
        { id: 'ap3', title: 'بچه لجباز نیست، بدغذا نیست؛ بدنش سیگنال گرسنگی رو گم کرده.', description: 'ما با اصلاح طبع، دوباره این سیگنال رو روشن می‌کنیم.', titleEn: 'The child is not stubborn, not picky; their body has lost the hunger signal.', descriptionEn: 'By correcting temperament, we turn that signal back on.', priority: 5, tabs: ['appetite'], active: true },
        { id: 'ap4', title: 'اگه بچه‌ات رو با گوشی و تبلت سرگرم می‌کنی تا غذا بخوره، داری بمب ساعتی درست می‌کنی.', description: 'امروز ساکت میشه، فردا به هیچ قیمتی دهنش باز نمیشه.', titleEn: 'If you entertain your child with phone and tablet to make them eat, you’re making a time bomb.', descriptionEn: 'Today they stay quiet, tomorrow they won’t open their mouth at any price.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap5', title: 'تا وقتی طبع و مزاج اصلاح نشه، بشقاب غذا پر از جنگ و گریه می‌مونه.', description: 'تنها راه صلح با غذا، اصلاح مزاج از درونه.', titleEn: 'Until temperament is corrected, the plate remains a battlefield of war and tears.', descriptionEn: 'The only way to make peace with food is temperament correction from within.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap6', title: 'بی‌اشتهاییِ همراهی‌نشده، بعد از ۳ ماه یه عادت مغزی میشه.', description: 'همون بچه‌ای که امروز کم می‌خوره، فردا کلاً گرسنگی رو فراموش می‌کنه.', titleEn: 'Untreated loss of appetite becomes a brain habit after 3 months.', descriptionEn: 'The child who eats little today will completely forget hunger tomorrow.', priority: 5, tabs: ['appetite'], active: true },
        { id: 'ap7', title: 'هر لقمه‌ای که با گریه و التماس پایین بره، هیچ‌وقت کامل جذب بدن نمیشه.', description: 'استرس، قفل جذب مواد مغذی در روده‌هاست.', titleEn: 'Every bite that goes down with crying and pleading is never fully absorbed.', descriptionEn: 'Stress is the lock on nutrient absorption in the gut.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap8', title: 'بدغذایی یعنی بدن بچه هوشمندتر از اون چیزیه که فکر می‌کنی.', description: 'یه کمبودی داره که با بدغذایی بهت هشدار میده.', titleEn: 'Picky eating means your child’s body is smarter than you think.', descriptionEn: 'They have a deficiency that they warn you about through picky eating.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap9', title: 'زبان بچه‌ات راز بی‌اشتهایی رو فاش می‌کنه.', description: 'فقط کافیه بلد باشی بخونیش. با علم زبان‌شناسی، بدون آزمایش و دارو، ریشه رو پیدا کن.', titleEn: 'Your child’s tongue reveals the secret of appetite loss.', descriptionEn: 'Just know how to read it. With tongue analysis, find the root without tests or drugs.', priority: 5, tabs: ['appetite'], active: true },
        { id: 'ap10', title: 'شربت اشتها، یه چسب زخم روی یه زخم عمیقه. روش TC یه جراحی تغذیه‌ایه.', description: 'فرق بین چند هفته اشتهای کاذب و یک عمر سلامت واقعی.', titleEn: 'Appetite syrup is a band-aid on a deep wound. The TC method is nutritional surgery.', descriptionEn: 'The difference between a few weeks of false appetite and a lifetime of real health.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap11', title: 'بچه‌ای که آب می‌خوره ولی غذا نمی‌خوره، سیر نیست؛ بدنش فریبش زده.', description: 'سوءمزاج معده، گرسنگی رو با تشنگی اشتباه می‌گیره.', titleEn: 'A child who drinks water but doesn’t eat is not full; their body has deceived them.', descriptionEn: 'Stomach temperament mistake confuses hunger with thirst.', priority: 3, tabs: ['appetite'], active: true },
        { id: 'ap12', title: 'اگه سر سفره جنگ جهانی سوم راه میفته، مشکل از غذا نیست، از سیستم گوارش و طبعشه.', description: 'قبل از دعوا، تیغه‌های زبانش رو بررسی کن.', titleEn: 'If World War III breaks out at the table, the problem is not food, it’s the digestive system and temperament.', descriptionEn: 'Before fighting, check the tongue’s coating.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap13', title: 'به جای این‌که توپ رو به گردن بچه بندازی، ببین بدنش چه ریزمغذی‌ای رو جذب نکرده.', description: 'کمبود زینک و آهن، اولین مظنون بی‌اشتهایی بچه‌هاست.', titleEn: 'Instead of blaming the child, see which micronutrient their body hasn’t absorbed.', descriptionEn: 'Zinc and iron deficiency are the first suspects for child appetite loss.', priority: 3, tabs: ['appetite'], active: true },
        { id: 'ap14', title: 'بی‌اشتهایی یعنی متابولیسم بدن قفل کرده. ما کلیدش رو داریم.', description: 'کلیدش یه نسخه گیاهی پیچیده شده با طعم مورد علاقه بچه‌اته.', titleEn: 'Loss of appetite means body metabolism is locked. We have the key.', descriptionEn: 'The key is an herbal prescription crafted with your child’s favorite taste.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap15', title: 'زینالیکید بدغذاست؟ نه! بدنش هوشمندانه از چیزی که بلد نیست هضم کنه، فرار می‌کنه.', description: 'به بدنش گوش بده، داره راه نجات رو نشون میده.', titleEn: 'Is my child picky? No! Their body intelligently escapes what it doesn’t know how to digest.', descriptionEn: 'Listen to their body, it’s showing the way to rescue.', priority: 5, tabs: ['appetite'], active: true },
        { id: 'ap16', title: 'با اصلاح طبع، بچه‌ای که از قاشق فرار می‌کرد، خودش دنبال بشقاب میاد.', description: 'این یه شعار نیست، نتیجه‌ای هست که ۱۰,۰۰۰ مادر دیدش.', titleEn: 'By correcting temperament, the child who ran from the spoon will chase the plate themselves.', descriptionEn: 'This is not a slogan, it’s what 10,000 mothers saw.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap17', title: 'همراهی ریشه‌ای، نه مسکن موقت.', description: 'ما با تحلیل زبان‌شناسی و اصلاح طبع، بی‌اشتهایی رو ریشه‌ای دنبال می‌کنیم؛ به‌جای راه‌حل‌های موقت.', titleEn: 'Root accompaniment, not temporary relief.', descriptionEn: 'With tongue analysis and temperament correction, we pursue appetite loss at its root, instead of temporary solutions.', priority: 5, tabs: ['appetite'], active: true },
        { id: 'ap18', title: 'یه مادر آگاه، دنبال شربت اشتها نیست؛ دنبال ریشه‌یابیه.', description: 'شربت فقط یه مُسکنه، روش TC جراحی تغذیه‌ایه برای بی‌اشتهایی.', titleEn: 'An aware mother doesn’t seek appetite syrup; she seeks root cause.', descriptionEn: 'Syrup is just a painkiller, the TC method is nutritional surgery for appetite loss.', priority: 3, tabs: ['appetite'], active: true },
        { id: 'ap19', title: 'عکس زبون بچهات، نقشه گنج اشتها و سلامتیشه.', description: 'ما به جای حدس زدن، نقشه می‌خونیم. ریشه بی‌اشتهایی رو دقیقاً همونجا پیدا می‌کنیم.', titleEn: 'Your child’s tongue photo is the treasure map for appetite and health.', descriptionEn: 'Instead of guessing, we read the map. We find the root of appetite loss right there.', priority: 4, tabs: ['appetite'], active: true },
      ],
      mind: [
        { id: 'm1', title: 'مغز بچه مثل یه اسفنج تشنه‌ست؛ یا تغذیه درست بهش میدی، یا هرز میره.', description: 'تغذیه، سیم‌کشی مغز برای آینده است.', titleEn: 'A child’s brain is like a thirsty sponge; either you feed it right or it goes to waste.', descriptionEn: 'Nutrition is the brain’s wiring for the future.', priority: 5, tabs: ['mind'], active: true },
        { id: 'm2', title: 'هوش رو نمیشه تزریق کرد، اما میشه تغذیه‌اش کرد. با مواد مغذی درست.', description: 'امگا ۳، زینک و ویتامین‌های B، سوخت جت مغزن.', titleEn: 'Intelligence cannot be injected, but it can be nourished. With the right nutrients.', descriptionEn: 'Omega-3, zinc and B vitamins are jet fuel for the brain.', priority: 4, tabs: ['mind'], active: true },
        { id: 'm3', title: 'تمرکز پایین، لجبازی نیست؛ گاهی مغز گرسنه‌ست و خودت نمی‌دونی.', description: 'قبل از تنبیه، بشقاب صبحانه‌اش رو چک کن.', titleEn: 'Low focus is not stubbornness; sometimes the brain is hungry and you don’t know.', descriptionEn: 'Before punishment, check their breakfast plate.', priority: 5, tabs: ['mind'], active: true },
        { id: 'm4', title: 'قبل از معلم خصوصی و کلاس تقویتی، تغذیه مغز رو درست کن.', description: 'یه مغز سوخت‌رسانی‌شده، تو کلاس کم نمیاره.', titleEn: 'Before private tutor and extra classes, fix brain nutrition.', descriptionEn: 'A fueled brain won’t fall short in class.', priority: 4, tabs: ['mind'], active: true },
        { id: 'm5', title: 'امگا ۳ رو فراموش کن، مغز بچه‌ات فراموش‌کاری رو کنار می‌ذاره.', description: 'DHA، آجر ساختمان حافظه و یادگیریه.', titleEn: 'Forget omega-3, your child’s brain will stop forgetting.', descriptionEn: 'DHA is the building block of memory and learning.', priority: 3, tabs: ['mind'], active: true },
        { id: 'm6', title: 'بچه‌ای که صبحانه کامل نخوره، زنگ دوم ریاضی کم میاره.', description: 'قند خون که بیفته، تمرکز هم سقوط می‌کنه.', titleEn: 'A child who doesn’t eat a full breakfast will fall short in second-period math.', descriptionEn: 'When blood sugar drops, focus also collapses.', priority: 3, tabs: ['mind'], active: true },
        { id: 'm7', title: 'ویتامین‌های گروه B، باتری شارژر سلول‌های خاکستری مغزن.', description: 'بدون B کمپلکس، انتقال پیام‌های عصبی کند میشه.', titleEn: 'B vitamins are the charger batteries for gray cells.', descriptionEn: 'Without B complex, nerve transmission slows.', priority: 3, tabs: ['mind'], active: true },
        { id: 'm8', title: 'حواس‌پرتی یه بیماری نیست، یه کمبوده. کمبود آهن، روی و منیزیم.', description: 'با تغذیه درست، تمرکزش رو مثل لیزر تیز کن.', titleEn: 'Distraction is not a disease, it’s a deficiency. Iron, zinc and magnesium deficiency.', descriptionEn: 'With proper nutrition, sharpen their focus like a laser.', priority: 4, tabs: ['mind'], active: true },
        { id: 'm9', title: 'یه مغز تغذیه‌شده، یه سر و گردن از هم‌کلاسی‌هاش بالاتره.', description: 'نه فقط تو امتحان؛ تو حل مسائل زندگی.', titleEn: 'A nourished brain is a head and shoulders above classmates.', descriptionEn: 'Not only in exams; in solving life’s problems.', priority: 3, tabs: ['mind'], active: true },
        { id: 'm10', title: 'ما به مغز بچهات ماهی نمی‌دیم؛ بهش یاد می‌دیم چطور خودشو بازسازی کنه.', description: 'تقویت مسیرهای عصبی، نه فقط دادن چند تا ویتامین.', titleEn: 'We don’t give fish to your child’s brain; we teach it how to rebuild itself.', descriptionEn: 'Strengthening neural pathways, not just giving vitamins.', priority: 4, tabs: ['mind'], active: true },
        { id: 'm11', title: 'خواب باکیفیت + تغذیه هوشمند = سوخت جت برای مغز.', description: 'بادرنجبویه برای خواب عمیق، پروتئین برای شارژ مغز.', titleEn: 'Quality sleep + smart nutrition = jet fuel for the brain.', descriptionEn: 'Lemon balm for deep sleep, protein for brain charge.', priority: 3, tabs: ['mind'], active: true },
        { id: 'm12', title: 'دشمن یادگیری، شیطنت نیست؛ قند پنهان و کمبود ریزمغذی‌هاست.', description: 'قند زیاد، مغز رو خاموش می‌کنه. پروتئین، روشنش.', titleEn: 'The enemy of learning is not naughtiness; it’s hidden sugar and micronutrient deficiency.', descriptionEn: 'Excess sugar shuts the brain off. Protein turns it on.', priority: 4, tabs: ['mind'], active: true },
        { id: 'm13', title: 'توی روش TC، قبل از کتاب دست بچه، بشقابش رو پُر می‌کنیم.', description: 'یادگیری از آشپزخونه شروع میشه، نه از کتابخونه.', titleEn: 'In the TC method, before placing a book in the child’s hand, we fill their plate.', descriptionEn: 'Learning starts in the kitchen, not the library.', priority: 5, tabs: ['mind'], active: true },
        { id: 'm14', title: 'آینده تحصیلی بچهات، تو آشپزخونه رقم می‌خوره نه توی کلاس.', description: 'یه مغز گرسنه، بهترین معلم دنیا رو هم درک نمی‌کنه.', titleEn: 'Your child’s academic future is decided in the kitchen, not in class.', descriptionEn: 'A hungry brain cannot comprehend even the world’s best teacher.', priority: 4, tabs: ['mind'], active: true },
        { id: 'm15', title: 'فرزندت قرار نیست نابغه به دنیا بیاد؛ می‌تونه نابغه تغذیه بشه.', description: 'پتانسیل واقعی مغز، با تغذیه بیدار میشه.', titleEn: 'Your child won’t be born a genius; they can become a nutrition genius.', descriptionEn: 'The brain’s true potential is awakened by nutrition.', priority: 4, tabs: ['mind'], active: true },
        { id: 'm16', title: 'ذهن آروم، حافظه قوی و یادگیری سریع، محصول یه صبحانه مهندسی‌شده‌ست.', description: 'ما مهندس تغذیه مغزیم.', titleEn: 'A calm mind, strong memory and fast learning are the product of an engineered breakfast.', descriptionEn: 'We are brain nutrition engineers.', priority: 3, tabs: ['mind'], active: true },
        { id: 'm17', title: 'ما با علم زبان‌شناسی و اصلاح طبع، مشکل تمرکز رو از ریشه حل می‌کنیم.', description: 'نه با داروهای شیمیایی. نسخهٔ منحصربه‌فرد برای ذهن منحصربه‌فرد فرزندت.', titleEn: 'We solve focus problems from the root with tongue analysis and temperament correction.', descriptionEn: 'Not with chemicals. A unique prescription for your child’s unique mind.', priority: 5, tabs: ['mind'], active: true },
        { id: 'm18', title: 'هیچ دو نسخه‌ای در زینالیکید شبیه هم نیست. حتی برای تقویت هوش.', description: 'چون هیچ دو کودکی شبیه هم نیستن.', titleEn: 'No two prescriptions at Zeynalikid are alike, even for boosting intelligence.', descriptionEn: 'Because no two children are alike.', priority: 3, tabs: ['mind'], active: true },
      ],
    },
  },

  // ─── سیستم مدیریت تم‌ها ───
  themeConfig: {
    defaultThemes: {
      public: 'wellness',
      education: 'kidlearn',
      admin: 'navystack',
    },
    overrides: {} as Record<string, string>,
  },

  // ─── سیستم پرداخت چنددرگاهی (ساختار جدید — مرحله ۴) ───
  paymentConfig: {
    gateways: [
      { id: 'zarinpal', label: 'زرین‌پال', enabled: false, config: { merchantId: '', sandbox: false } },
      { id: 'idpay', label: 'آیدی‌پی', enabled: false, config: { apiKey: '', sandbox: false } },
      { id: 'payping', label: 'پی‌پینگ', enabled: false, config: { apiKey: '', clientId: '' } },
      { id: 'blubank', label: 'بلوبانک (بانک سامان)', enabled: false, config: { merchantCode: '', terminalCode: '' } },
      { id: 'stripe', label: 'Stripe (بین‌المللی)', enabled: false, config: { secretKey: '', publishableKey: '' } },
      { id: 'paypal', label: 'PayPal (بین‌المللی)', enabled: false, config: { clientId: '', clientSecret: '', sandbox: true } },
      { id: 'crypto', label: 'ارز دیجیتال', enabled: false, config: { wallets: [] as Array<{ currency: string; address: string; network?: string }> } },
    ],
    defaultCurrency: 'IRR',
    callbackUrl: '',
  },

  // ─── سیستم مدیریت دیزاین (مرحله ۱ - بازطراحی تدریجی) ───
  designSystem: {
    // انتخاب دیزاین برای هر بخش
    sections: {
      public: {
        design: 'classic',        // shared semantic Foundation theme
        theme: 'motherly-trust',            // فقط در حالت 'classic' معنی دارد
      },
      education: {
        design: 'kidlearn',
        theme: 'light',
      },
      admin: {
        design: 'navystack',
        theme: 'dark',
      },
    },
    // تنظیمات دیزاین ترکیبی (کلاسیک)
    classic: {
      themes: ['light', 'cream', 'ocean', 'dark'],
      defaultTheme: 'light',
    },
  },
} as Record<string, unknown>;

// ─── سیستم مهاجرت داده‌ها (Data Migration) ───
export const CURRENT_SETTINGS_VERSION = 2;

export function migrateSettings(settings: any): any {
  if (!settings) return settings;
  let migrated = { ...settings, version: settings.version || 1 };

  // مهاجرت از نسخه ۱ به نسخه ۲
  if (migrated.version < 2) {
    // مهاجرت mediaItems: آبجکت قدیمی {videos:[], audios:[], images:[]} — آرایه تخت
    if (migrated.mediaItems && !Array.isArray(migrated.mediaItems)) {
      const old = migrated.mediaItems;
      migrated.mediaItems = [
        ...(Array.isArray(old.videos) ? old.videos : []),
        ...(Array.isArray(old.audios) ? old.audios : []),
        ...(Array.isArray(old.images) ? old.images : []),
      ];
    }

    // مهاجرت customPlatforms: آبجکت قدیمی — آرایه
    if (migrated.customPlatforms && !Array.isArray(migrated.customPlatforms)) {
      migrated.customPlatforms = Object.values(migrated.customPlatforms);
    }

    // مهاجرت products: آرایه قدیمی — آبجکت {showSection, list}
    if (Array.isArray(migrated.products)) {
      migrated.products = { showSection: true, list: migrated.products };
    }

    // مهاجرت storyHighlights.items قدیمی — storyHighlights.highlights
    if (migrated.storyHighlights?.items?.length > 0 && !migrated.storyHighlights.highlights?.length) {
      const items = migrated.storyHighlights.items;
      const legacy = {
        id: 'legacy',
        title: 'استوری',
        coverUrl: '',
        active: true,
        order: 1,
        stories: items.map((it: any, idx: number) => ({
          id: it.id || 'st' + idx,
          title: it.title || '',
          imageCodeExternal: it.embedCode || '',
          imageCodeInternal: it.embedCode || '',
          active: it.active !== false,
          order: it.order || idx + 1,
        })),
      };
      migrated.storyHighlights = {
        ...(migrated.storyHighlights),
        highlights: [...(migrated.storyHighlights.highlights || []), legacy],
        items: [],
      };
    }

    // مهاجرت servicesDisplayMode: رشته قدیمی — آبجکت {home, courses}
    if (typeof migrated.servicesDisplayMode === 'string') {
      const mode = migrated.servicesDisplayMode.toLowerCase();
      migrated.servicesDisplayMode = {
        home: mode === 'carousel' ? 'carousel' : 'list',
        courses: mode === 'carousel' ? 'carousel' : 'list',
      };
    }

    // مهاجرت showServicesOn قدیمی — servicesVisibility
    if (!migrated.servicesVisibility && migrated.showServicesOn) {
      migrated.servicesVisibility = {
        home: true,
        courses: true,
        parentExperience: !!migrated.showServicesOn.experience,
        licenses: !!migrated.showServicesOn.licenses,
        trainings: !!migrated.showServicesOn.education,
        about: false,
        faq: false,
        contact: false,
      };
    }

    migrated.version = 2;
  }

  // ─── مهاجرت paymentConfig: ساختار قدیمی (activeGateway/gatewaySettings) — جدید (gateways[]) ───
  migrated = migratePaymentConfig(migrated);

  // ─── مهاجرت designSystem: اضافه کردن ساختار پیش‌فرض اگر وجود ندارد ───
  if (!migrated.designSystem) {
    migrated.designSystem = {
      sections: {
        public: { design: 'classic', theme: 'motherly-trust' },
        education: { design: 'kidlearn', theme: 'light' },
        admin: { design: 'navystack', theme: 'dark' },
      },
      classic: {
        themes: ['light', 'cream', 'ocean', 'dark', 'motherly', 'trust', 'blend', 'motherly-trust'],
        defaultTheme: 'motherly-trust',
      },
    };
  }

  // ─── مهاجرت images: ساختار قدیمی (heroImage, trustBoxImage) — ساختار جدید (hero, trustBox, courseDefault, specialist) ───
  if (migrated.images) {
    const old = migrated.images;
    if (old.heroImage && !old.hero) {
      migrated.images = {
        hero: { url: old.heroImage.url || '/images/asset13c-hero-mother-child.webp', alt: old.heroImage.alt || 'مادر و کودک در بنر اصلی صفحهٔ خانه', enabled: old.heroImage.enabled !== false, storagePath: '' },
        trustBox: { url: (old.trustBoxImage?.url) || '/images/trust-default.webp', alt: (old.trustBoxImage?.alt) || 'مادر و کودک خندان', enabled: (old.trustBoxImage?.enabled) !== false, storagePath: '' },
        courseDefault: { url: (old.courseImages?.defaultImage) || '/images/course-default.webp', alt: 'دوره آموزشی', enabled: (old.courseImages?.enabled) !== false },
        specialist: { url: '/images/specialist-default.webp', alt: 'کارشناس تغذیه', enabled: true, storagePath: '' },
      };
    } else if (!old.courseDefault) {
      migrated.images.courseDefault = { url: '/images/course-default.webp', alt: 'دوره آموزشی', enabled: true };
    }
    if (!migrated.images.specialist) {
      migrated.images.specialist = { url: '/images/specialist-default.webp', alt: 'کارشناس تغذیه', enabled: true, storagePath: '' };
    }
    // اضافه کردن storagePath به فیلدهای قدیمی اگر ندارند
    if (migrated.images.hero && !migrated.images.hero.storagePath) migrated.images.hero.storagePath = '';
    if (migrated.images.trustBox && !migrated.images.trustBox.storagePath) migrated.images.trustBox.storagePath = '';
    if (migrated.images.specialist && !migrated.images.specialist.storagePath) migrated.images.specialist.storagePath = '';
    if (!migrated.images.homeAvatar) {
      const oldPick = Array.isArray(migrated.images.specialistHome?.options)
        ? migrated.images.specialistHome.options.find((o: any) => String(o?.id) === String(migrated.images.specialistHome?.selectedId))?.url
        : '';
      migrated.images.homeAvatar = {
        url: oldPick || '/images/specialist/specialist-about.webp',
        alt: 'کارشناس رشد و تغذیه',
        enabled: true,
        storagePath: '',
      };
    }
    delete migrated.images.specialistHome;
    // اطمینان از وجود کتابخانهٔ تصاویر بخش‌ها
    if (!migrated.images.library) {
      migrated.images.library = { licenses: [], products: [], courses: [], general: [] };
    } else {
      for (const k of ['licenses', 'products', 'courses', 'general']) {
        if (!Array.isArray(migrated.images.library[k])) migrated.images.library[k] = [];
      }
    }
    // اطمینان از وجود عکس فرم مشاوره و عکس دربارهٔ ما
    if (!migrated.images.consultationPhoto) {
      migrated.images.consultationPhoto = {
        url: migrated.photoUrl || '/specialist-photo.webp',
        alt: 'کارشناس فرم مشاوره',
        enabled: migrated.showSpecialistPhoto !== false,
        storagePath: '',
      };
    }
    if (!migrated.images.aboutHero) {
      migrated.images.aboutHero = {
        url: '/images/specialist/specialist-hero-master.webp',
        alt: 'کارشناس ارشد',
        enabled: true,
        storagePath: '',
      };
    }
  }

  // ─── مهاجرت trustBoxes: اطمینان از وجود ۴ دسته جملات اعتمادساز (health/height/appetite/mind) با ۶۳ جمله
  // این ۴ دسته در defaultSettings تعریف شده‌اند ولی اگر تنظیمات قدیمی در Supabase بدون آن‌ها ذخیره شده باشد، باید ادغام شوند
  try{
    const defTB = (defaultSettings as any).trustBoxes;
    if (!migrated.trustBoxes) {
      migrated.trustBoxes = JSON.parse(JSON.stringify(defTB));
    } else {
      if (!migrated.trustBoxes.sentences) migrated.trustBoxes.sentences = JSON.parse(JSON.stringify(defTB.sentences));
      else {
        (['health','height','appetite','mind'] as const).forEach(cat=>{
          const defList: any[] = (defTB.sentences as any)[cat] || [];
          const curList: any = (migrated.trustBoxes.sentences as any)[cat];
          if (!Array.isArray(curList) || curList.length === 0) {
            (migrated.trustBoxes.sentences as any)[cat] = JSON.parse(JSON.stringify(defList));
          } else if (curList.length < defList.length) {
            const existingIds = new Set(curList.map((x:any)=>x.id));
            const missing = defList.filter((x:any)=> !existingIds.has(x.id));
            if (missing.length) {
              (migrated.trustBoxes.sentences as any)[cat] = [...curList, ...missing];
            }
          }
        });
      }
      if (!migrated.trustBoxes.tabs) migrated.trustBoxes.tabs = JSON.parse(JSON.stringify(defTB.tabs));
      else {
        // اطمینان از وجود کلیدهای height/appetite/mind در tabs
        (['height','appetite','mind'] as const).forEach(k=>{
          if (!(migrated.trustBoxes.tabs as any)[k]) (migrated.trustBoxes.tabs as any)[k] = JSON.parse(JSON.stringify((defTB.tabs as any)[k]));
        });
      }
      if (!migrated.trustBoxes.home) migrated.trustBoxes.home = JSON.parse(JSON.stringify(defTB.home));
      if (migrated.trustBoxes.enabled === undefined) migrated.trustBoxes.enabled = true;
      if (migrated.trustBoxes.defaultInterval === undefined) migrated.trustBoxes.defaultInterval = 8;
    }
  }catch{}

  // ─── رسانه‌ها: تبدیل انتخاب تک‌مقداری قدیمی به انتخاب چندصفحه‌ای بدون حذف فیلد قبلی ───
  if (Array.isArray(migrated.experience?.items)) {
    migrated.experience = {
      ...migrated.experience,
      items: migrated.experience.items.map((item: any) => migrateMediaItem(item, 'experience')),
    };
  }
  if (Array.isArray(migrated.education?.items)) {
    migrated.education = {
      ...migrated.education,
      items: migrated.education.items.map((item: any) => migrateMediaItem(item, 'education')),
    };
  }

  return migrated;
}

/**
 * مهاجرت تنظیمات پرداخت از ساختار تک‌درگاهی به چنددرگاهی.
 *
 * ساختار قدیمی:
 *   paymentConfig: { activeGateway: 'zarinpal', gatewaySettings: { merchantId: '...' } }
 *
 * ساختار جدید:
 *   paymentConfig: { gateways: [{ id: 'zarinpal', enabled: true, config: { merchantId: '...' } }] }
 */
export function migratePaymentConfig(settings: any): any {
  if (!settings?.paymentConfig) return settings;
  const pc = settings.paymentConfig;

  // اگر ساختار جدید (gateways[]) از قبل وجود دارد، نیازی به مهاجرت نیست
  if (Array.isArray(pc.gateways) && pc.gateways.length > 0) return settings;

  // ساختار قدیمی: activeGateway + gatewaySettings
  if (pc.activeGateway || pc.gatewaySettings) {
    const activeGw: string = pc.activeGateway || 'blubank';
    const gs: any = pc.gatewaySettings || {};

    // تعریف درگاه‌های پیش‌فرض
    const defaultGateways = [
      { id: 'zarinpal', label: 'زرین‌پال', config: { merchantId: '', sandbox: false } },
      { id: 'idpay', label: 'آیدی‌پی', config: { apiKey: '', sandbox: false } },
      { id: 'payping', label: 'پی‌پینگ', config: { apiKey: '', clientId: '' } },
      { id: 'blubank', label: 'بلوبانک (بانک سامان)', config: { merchantCode: '', terminalCode: '' } },
      { id: 'stripe', label: 'Stripe (بین‌المللی)', config: { secretKey: '', publishableKey: '' } },
      { id: 'paypal', label: 'PayPal (بین‌المللی)', config: { clientId: '', clientSecret: '', sandbox: true } },
      { id: 'crypto', label: 'ارز دیجیتال', config: { wallets: [] } },
    ];

    // نگاشت فیلدهای قدیمی — ساختار جدید
    const configMap: Record<string, any> = {
      zarinpal: { merchantId: gs.merchantId || '', sandbox: !!gs.zarinpalSandbox },
      idpay: { apiKey: gs.idpayApiKey || '', sandbox: !!gs.idpaySandbox },
      payping: { apiKey: gs.paypingApiKey || '', clientId: gs.paypingClientId || '' },
      blubank: { merchantCode: gs.merchantCode || '', terminalCode: gs.terminalCode || '' },
      stripe: { secretKey: gs.stripeSecretKey || '', publishableKey: gs.stripePublishableKey || '' },
      paypal: { clientId: gs.paypalClientId || '', clientSecret: gs.paypalClientSecret || '', sandbox: gs.paypalSandbox !== false },
      crypto: { wallets: Array.isArray(gs.cryptoWallets) ? gs.cryptoWallets : [] },
    };

    const gateways = defaultGateways.map(gw => ({
      ...gw,
      enabled: gw.id === activeGw, // فقط درگاه فعال قبلی — enabled: true
      config: { ...gw.config, ...(configMap[gw.id] || {}) },
    }));

    settings = {
      ...settings,
      paymentConfig: {
        gateways,
        defaultCurrency: pc.defaultCurrency || 'IRR',
        callbackUrl: pc.callbackUrl || '',
      },
    };
  }

  return settings;
}
