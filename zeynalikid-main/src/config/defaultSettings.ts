export const defaultCountries = [
 {id:'ir',name:'ایران',nameEn:'Iran',code:'+98',flag:'IR',regex:'^(0?9)\\d{9}$',required:true,locked:true},
 {id:'us',name:'آمریکا/کانادا',nameEn:'US/Canada',code:'+1',flag:'US',regex:'^[2-9]\\d{9}$',required:true},
 {id:'uk',name:'انگلیس',nameEn:'United Kingdom',code:'+44',flag:'GB',regex:'^0\\d{9,10}$'},
 {id:'de',name:'آلمان',nameEn:'Germany',code:'+49',flag:'DE',regex:'^0\\d{9,10}$'},
 {id:'se',name:'سوئد',nameEn:'Sweden',code:'+46',flag:'SE',regex:'^0\\d{8,9}$'},
 {id:'ch',name:'سوئیس',nameEn:'Switzerland',code:'+41',flag:'CH',regex:'^0\\d{8,9}$'},
 {id:'no',name:'نروژ',nameEn:'Norway',code:'+47',flag:'NO',regex:'^[49]\\d{7}$'},
 {id:'fr',name:'فرانسه',nameEn:'France',code:'+33',flag:'FR',regex:'^0\\d{9}$'},
 {id:'au',name:'استرالیا',nameEn:'Australia',code:'+61',flag:'AU',regex:'^0\\d{8,9}$'},
 {id:'ae',name:'امارات',nameEn:'UAE',code:'+971',flag:'AE',regex:'^0\\d{8}$'},
 {id:'tr',name:'ترکیه',nameEn:'Turkey',code:'+90',flag:'TR',regex:'^0\\d{9}$'},
 {id:'nl',name:'هلند',nameEn:'Netherlands',code:'+31',flag:'NL',regex:'^0\\d{8,9}$'},
 {id:'in',name:'هند',nameEn:'India',code:'+91',flag:'IN',regex:'^[6-9]\\d{9}$'},
 {id:'af',name:'افغانستان',nameEn:'Afghanistan',code:'+93',flag:'AF',regex:'^0?\\d{9}$'},
 {id:'other',name:'سایر',nameEn:'Other',code:'+',flag:'',regex:'^\\d{7,}$'}

] as Array<Record<string, unknown>>;

const DEFAULT_SERVICES = [
  { id: 's1', title: 'فعال‌سازی رشد قد', description: 'تحریک طبیعی صفحات رشد قد با تغذیه هدفمند و مکمل‌های ارگانیک.', icon: '' },
  { id: 's2', title: 'برنامه تغذیه شخصی‌سازی‌شده', description: 'طراحی برنامه غذایی و مکمل اختصاصی بر اساس طبع و ذائقه فرزندتان.', icon: '' },
  { id: 's3', title: 'کنترل وزن و اصلاح رشد قدی', description: 'بررسی وزن و قد و ارائه راهکارهای اصلاحی.', icon: '' },
  { id: 's4', title: 'تحلیل طبع و مزاج (زبان‌شناسی)', description: 'تحلیل تخصصی عکس زبان فرزند برای شناسایی ریشه پنهان بی‌اشتهایی، کندی رشد یا ضعف بدنی.', icon: '' },
  { id: 's5', title: 'تقویت سیستم ایمنی', description: 'ایمن‌سازی طبیعی بدن کودک در برابر بیماری‌های ویروسی و عفونی با مکمل‌های کاملاً ارگانیک و گیاهی.', icon: '' },
  { id: 's6', title: 'پایش تخصصی رشد قد و وزن', description: 'بررسی دقیق روند رشد قدی، وزنی و استخوان‌بندی کودک.', icon: '' },
  { id: 's7', title: 'توانمندسازی والدین', description: 'آموزش نکات کاربردی تغذیه، مدیریت بدغذایی و اصلاح سبک زندگی؛ تا خودتان به متخصص سلامت فرزندتان تبدیل شوید.', icon: '‍‍' },
  { id: 's8', title: 'برنامه ورزشی (در صورت نیاز)', description: 'معرفی حرکات ورزشی ساده در خانه یا بهترین رشته ورزشی متناسب با شرایط فرزندتان، جهت همراهی بهتر در دورهٔ تخصصی.', icon: '' },
  { id: 's9', title: 'تنظیم خواب و آرام‌سازی', description: 'بهبود کیفیت خواب شبانه با برنامه اصولی و مکمل‌های آرام‌بخش و گیاهی؛ خوابی که موتور اصلی ترشح هورمون رشد است.', icon: '' },
] as Array<{ id: string; title: string; description: string; icon: string }>;

export const defaultSettings = {
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
    items: [
      // { id: string, title: string, description: string, features: string[], image: string, isVisible: boolean }
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
      url: '/images/specialist/specialist-hero-master.webp',
      alt: 'کارشناس رشد و تغذیه زینالیکید',
      enabled: true,
      storagePath: '',
    },
    trustBox: {
      url: '/images/asset13c-trust-parent-care.webp',
      alt: 'مادر و کودک خندان',
      enabled: true,
      storagePath: '',
    },
    courseDefault: {
      url: '/images/course-default.jpg',
      alt: 'دوره آموزشی',
      enabled: true,
    },
    specialist: {
      url: '/images/specialist-default.jpg',
      alt: 'کارشناس تغذیه',
      enabled: true,
      storagePath: '',
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
        { id: 'h1', title: 'فرمولاسیون برگزیده، تولید بهداشتی و ایمن.', description: 'محصولات ما با استانداردهای بهداشتی و مجوزهای رسمی مربوطه تولید می‌شوند؛ جزئیات مجوزها در بخش مجوزها قابل بررسی است.', priority: 5, tabs: ['health'], active: true },
        { id: 'h2', title: 'پشتیبانت هستیم، نه فروشنده‌ای که ناپدید بشه.', description: 'از روز اول تا آخرین روز دوره، کنارتیم. هفتگی پیگیر وضعیت رشد، اشتها و خواب فرزندت هستیم.', priority: 5, tabs: ['health'], active: true },
        { id: 'h3', title: 'اگر نتیجه نگیریم، صریح میگیم.', description: 'تعهد ما فقط وقتی معنا داره که تو هم همراهیمون کنی. روراست و متعهد، درست مثل خودت.', priority: 4, tabs: ['health'], active: true },
        { id: 'h4', title: 'زیر لیسانس آلمان بودن، یعنی پاسپورت سلامت اروپا تو جیب محصول ماست.', description: 'ما این افتخار رو با فرمولاسیون کاملاً بومی و مناسب طبع بچه‌های ایران ترکیب کردیم.', priority: 4, tabs: ['health'], active: true },
        { id: 'h5', title: '۱۰,۰۰۰+ مادری که نتیجه گرفتن، پشتوانه حرف ماست.', description: 'آمار رضایت‌ها رو ببین، ویس‌ها رو بشنو. این بهترین پشتوانهٔ کیفیت ماست.', priority: 5, tabs: ['health'], active: true },
        { id: 'h6', title: 'بچت قهرمان نمیشه چون مکمل می‌خوره؛ قهرمان میشه چون بدنش از درون ترمیم میشه.', description: 'تفاوت بین یه کودک خسته، بدغذا و کم‌حوصله با یه کودک پرانرژی و سرزنده، ریشه‌اش تو ترمیم سلولیه.', priority: 5, tabs: ['health'], active: true },
        { id: 'h7', title: 'سلامتی یه مقصد نیست، یه مسیر شخصی‌سازیه.', description: 'ما با ۱۷۰۰ محصول، مسیر سلامت فرزند تو رو منحصربه‌فرد طراحی می‌کنیم.', priority: 4, tabs: ['health'], active: true },
        { id: 'h8', title: 'پیشگیری، ریشه‌ای‌ترین کار ماست.', description: 'نمی‌ذاریم ضعف ایمنی، کوتاهی قد یا کاهش تمرکز، فرزندت رو غافلگیر کنه.', priority: 4, tabs: ['health'], active: true },
        { id: 'h9', title: 'یک بدن سالم، یک کودکی شاد می‌سازه.', description: 'ما پشت صحنه انرژی، بازیگوشی و خنده‌های فرزندت هستیم.', priority: 3, tabs: ['health'], active: true },
        { id: 'h10', title: 'کودک امروز، سرمایه فردای جامعه است.', description: 'ما با تغذیه سالم، از امروز برای فردای ایران قهرمان می‌سازیم.', priority: 3, tabs: ['health'], active: true },
      ],
      height: [
        { id: 'ht1', title: 'رشد قد یه مسابقه با زمانه؛ ما زمان رو از دست نمی‌دیم.', description: 'صفحات رشد بسته بشن، دیر میشه. روش TC طراحی شده تا حتی یک سانتیمتر از پتانسیل قدی فرزندت هدر نره.', priority: 5, tabs: ['height'], active: true },
        { id: 'ht2', title: 'دشمن رشد قد، کمبود آهن و زینک نیست؛ بی‌خبری توئه.', description: 'تا وقتی ندونی بدن بچهات چه ریزمغذی‌هایی رو جذب نمی‌کنه، هر چی بدی فایده نداره.', priority: 5, tabs: ['height'], active: true },
        { id: 'ht3', title: 'قد کوتاه، اعتماد به نفس کوتاه میاره.', description: 'این یه شعار نیست، یه حقیقت تلخه. ما برای رسیدن به سانتیمترهای از دست رفته نمی‌جنگیم، برای اعتماد به نفس آینده‌ش می‌جنگیم.', priority: 5, tabs: ['height'], active: true },
        { id: 'ht4', title: 'هر سانتیمتر قد، یه جهان اعتماد به نفس برای بچهات می‌سازه.', description: 'نگذار کمبود امروز، حسرت فردای فرزندت بشه.', priority: 4, tabs: ['height'], active: true },
        { id: 'ht5', title: 'هورمون رشد رو با تغذیه بیدار کن، نه با آمپول.', description: 'روش TC، سوخت طبیعی جهش قدی رو بدون دستکاری هورمونی فراهم می‌کنه.', priority: 4, tabs: ['height'], active: true },
        { id: 'ht6', title: 'خواب کافی + تغذیه هدفمند = موتور روشن رشد قد.', description: 'بادرنجبویه و املاح ضروری، نسخه شب‌های طلایی رشد رو می‌پیچن.', priority: 3, tabs: ['height'], active: true },
        { id: 'ht7', title: 'پروتئین بار ۴۰ گرمی ما، یه آجر محکم برای برج بلند قدشه.', description: '۱۲ گرم پروتئین خالص، تحویل مستقیم به صفحات رشد.', priority: 3, tabs: ['height'], active: true },
        { id: 'ht8', title: 'بچه‌ای که کلسیم جذب نکنه، استخون‌هاش آهنگ رشد رو کند می‌زنن.', description: 'داینامین ایزوتونیک، کلسیم و D3 رو ۱۰ برابر سریع‌تر به استخوان می‌رسونه.', priority: 4, tabs: ['height'], active: true },
        { id: 'ht9', title: 'صفحه رشد یه درِ کشویی‌ست که یه روز برای همیشه بسته میشه.', description: 'قبل از بسته شدنش، سوخت لازم رو بهش برسون.', priority: 5, tabs: ['height'], active: true },
        { id: 'ht10', title: 'مکمل رشد قد، وقتی با طبع فرزندت هماهنگ باشه، بهتر جواب می‌ده.', description: 'ما با تحلیل تخصصی عکس زبان، مسیر جذب و رشد رو بهتر می‌شناسیم.', priority: 4, tabs: ['height'], active: true },
        { id: 'ht11', title: 'عکس زبون بچهات، نقشه گنج سلامتی و قد بلندشه.', description: 'ما به جای حدس زدن، نقشه می‌خونیم. ریشه کندرشدی رو دقیقاً همونجا پیدا می‌کنیم.', priority: 5, tabs: ['height'], active: true },
        { id: 'ht12', title: 'نسخهٔ منحصربه‌فرد برای رشد منحصربه‌فرد فرزندت.', description: 'هیچ دو نسخه‌ای در زینالیکید شبیه هم نیست. چون هیچ دو کودکی شبیه هم نیستن.', priority: 4, tabs: ['height'], active: true },
        { id: 'ht13', title: '۱۰,۰۰۰+ مادری که نتیجه گرفتن، پشتوانه رشد قد فرزندت.', description: 'آمار رضایت‌ها رو ببین، ویس‌ها رو بشنو، تغییرات قدی رو ببین، بعد تصمیم بگیر.', priority: 5, tabs: ['height'], active: true },
        { id: 'ht14', title: 'هر هفته که بگذره و اقدام نکنی، یه قدم از هم‌سن و سالاش عقب‌تر میفته.', description: 'کمبود وزن موندگار میشه و قد از دست میره. تصمیم سخت امروز، حسرت آسون فردا رو حذف می‌کنه.', priority: 5, tabs: ['height'], active: true },
        { id: 'ht15', title: 'بچت قهرمان قدی میشه چون بدنش از درون ترمیم میشه.', description: 'تفاوت بین یه کودک خسته و کم‌قد، با یه کودک پرانرژی و بلندقامت، ریشه‌اش تو ترمیم سلولیه.', priority: 4, tabs: ['height'], active: true },
        { id: 'ht16', title: '۱۷۰۰ محصول داریم، اما فقط ۴ تاش مال بچه توئه.', description: 'این یعنی ما یه سوزن رو از انبار کاه پیدا می‌کنیم. نسخه عمومی ممنوع، فقط شفای اختصاصی برای رشد.', priority: 4, tabs: ['height'], active: true },
      ],
      appetite: [
        { id: 'ap1', title: 'بی‌اشتهایی مادر اصلی مشکلات کودکان است.', description: 'تا وقتی بچه غذا نخوره، بدن روند رشد نرمالی نخواهد داشت، سیستم ایمنی ضعیف می‌شه، استخوان‌بندی ناقص می‌مونه و حتی مغز برای تمرکز و یادگیری سوخت کافی نداره.', priority: 5, tabs: ['appetite'], active: true },
        { id: 'ap2', title: 'بی‌اشتهایی یهویی نمیاد که یهویی بره. ریشه‌اش رو پیدا کن، نه با زور.', description: 'پشت هر بچه بدغذا، یه سیستم گوارشی هست که کمک می‌خواد.', priority: 5, tabs: ['appetite'], active: true },
        { id: 'ap3', title: 'بچه لجباز نیست، بدغذا نیست؛ بدنش سیگنال گرسنگی رو گم کرده.', description: 'ما با اصلاح طبع، دوباره این سیگنال رو روشن می‌کنیم.', priority: 5, tabs: ['appetite'], active: true },
        { id: 'ap4', title: 'اگه بچه‌ات رو با گوشی و تبلت سرگرم می‌کنی تا غذا بخوره، داری بمب ساعتی درست می‌کنی.', description: 'امروز ساکت میشه، فردا به هیچ قیمتی دهنش باز نمیشه.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap5', title: 'تا وقتی طبع و مزاج اصلاح نشه، بشقاب غذا پر از جنگ و گریه می‌مونه.', description: 'تنها راه صلح با غذا، اصلاح مزاج از درونه.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap6', title: 'بی‌اشتهاییِ همراهی‌نشده، بعد از ۳ ماه یه عادت مغزی میشه.', description: 'همون بچه‌ای که امروز کم می‌خوره، فردا کلاً گرسنگی رو فراموش می‌کنه.', priority: 5, tabs: ['appetite'], active: true },
        { id: 'ap7', title: 'هر لقمه‌ای که با گریه و التماس پایین بره، هیچ‌وقت کامل جذب بدن نمیشه.', description: 'استرس، قفل جذب مواد مغذی در روده‌هاست.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap8', title: 'بدغذایی یعنی بدن بچه هوشمندتر از اون چیزیه که فکر می‌کنی.', description: 'یه کمبودی داره که با بدغذایی بهت هشدار میده.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap9', title: 'زبان بچه‌ات راز بی‌اشتهایی رو فاش می‌کنه.', description: 'فقط کافیه بلد باشی بخونیش. با علم زبان‌شناسی، بدون آزمایش و دارو، ریشه رو پیدا کن.', priority: 5, tabs: ['appetite'], active: true },
        { id: 'ap10', title: 'شربت اشتها، یه چسب زخم روی یه زخم عمیقه. روش TC یه جراحی تغذیه‌ایه.', description: 'فرق بین چند هفته اشتهای کاذب و یک عمر سلامت واقعی.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap11', title: 'بچه‌ای که آب می‌خوره ولی غذا نمی‌خوره، سیر نیست؛ بدنش فریبش زده.', description: 'سوءمزاج معده، گرسنگی رو با تشنگی اشتباه می‌گیره.', priority: 3, tabs: ['appetite'], active: true },
        { id: 'ap12', title: 'اگه سر سفره جنگ جهانی سوم راه میفته، مشکل از غذا نیست، از سیستم گوارش و طبعشه.', description: 'قبل از دعوا، تیغه‌های زبانش رو بررسی کن.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap13', title: 'به جای این‌که توپ رو به گردن بچه بندازی، ببین بدنش چه ریزمغذی‌ای رو جذب نکرده.', description: 'کمبود زینک و آهن، اولین مظنون بی‌اشتهایی بچه‌هاست.', priority: 3, tabs: ['appetite'], active: true },
        { id: 'ap14', title: 'بی‌اشتهایی یعنی متابولیسم بدن قفل کرده. ما کلیدش رو داریم.', description: 'کلیدش یه نسخه گیاهی پیچیده شده با طعم مورد علاقه بچه‌اته.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap15', title: 'فرزند من بدغذاست؟ نه! بدنش هوشمندانه از چیزی که بلد نیست هضم کنه، فرار می‌کنه.', description: 'به بدنش گوش بده، داره راه نجات رو نشون میده.', priority: 5, tabs: ['appetite'], active: true },
        { id: 'ap16', title: 'با اصلاح طبع، بچه‌ای که از قاشق فرار می‌کرد، خودش دنبال بشقاب میاد.', description: 'این یه شعار نیست، نتیجه‌ای هست که ۱۰,۰۰۰ مادر دیدش.', priority: 4, tabs: ['appetite'], active: true },
        { id: 'ap17', title: 'همراهی ریشه‌ای، نه مسکن موقت.', description: 'ما با تحلیل زبان‌شناسی و اصلاح طبع، بی‌اشتهایی رو ریشه‌ای دنبال می‌کنیم؛ به‌جای راه‌حل‌های موقت.', priority: 5, tabs: ['appetite'], active: true },
        { id: 'ap18', title: 'یه مادر آگاه، دنبال شربت اشتها نیست؛ دنبال ریشه‌یابیه.', description: 'شربت فقط یه مُسکنه، روش TC جراحی تغذیه‌ایه برای بی‌اشتهایی.', priority: 3, tabs: ['appetite'], active: true },
        { id: 'ap19', title: 'عکس زبون بچهات، نقشه گنج اشتها و سلامتیشه.', description: 'ما به جای حدس زدن، نقشه می‌خونیم. ریشه بی‌اشتهایی رو دقیقاً همونجا پیدا می‌کنیم.', priority: 4, tabs: ['appetite'], active: true },
      ],
      mind: [
        { id: 'm1', title: 'مغز بچه مثل یه اسفنج تشنه‌ست؛ یا تغذیه درست بهش میدی، یا هرز میره.', description: 'تغذیه، سیم‌کشی مغز برای آینده است.', priority: 5, tabs: ['mind'], active: true },
        { id: 'm2', title: 'هوش رو نمیشه تزریق کرد، اما میشه تغذیه‌اش کرد. با مواد مغذی درست.', description: 'امگا ۳، زینک و ویتامین‌های B، سوخت جت مغزن.', priority: 4, tabs: ['mind'], active: true },
        { id: 'm3', title: 'تمرکز پایین، لجبازی نیست؛ گاهی مغز گرسنه‌ست و خودت نمی‌دونی.', description: 'قبل از تنبیه، بشقاب صبحانه‌اش رو چک کن.', priority: 5, tabs: ['mind'], active: true },
        { id: 'm4', title: 'قبل از معلم خصوصی و کلاس تقویتی، تغذیه مغز رو درست کن.', description: 'یه مغز سوخت‌رسانی‌شده، تو کلاس کم نمیاره.', priority: 4, tabs: ['mind'], active: true },
        { id: 'm5', title: 'امگا ۳ رو فراموش کن، مغز بچه‌ات فراموش‌کاری رو کنار می‌ذاره.', description: 'DHA، آجر ساختمان حافظه و یادگیریه.', priority: 3, tabs: ['mind'], active: true },
        { id: 'm6', title: 'بچه‌ای که صبحانه کامل نخوره، زنگ دوم ریاضی کم میاره.', description: 'قند خون که بیفته، تمرکز هم سقوط می‌کنه.', priority: 3, tabs: ['mind'], active: true },
        { id: 'm7', title: 'ویتامین‌های گروه B، باتری شارژر سلول‌های خاکستری مغزن.', description: 'بدون B کمپلکس، انتقال پیام‌های عصبی کند میشه.', priority: 3, tabs: ['mind'], active: true },
        { id: 'm8', title: 'حواس‌پرتی یه بیماری نیست، یه کمبوده. کمبود آهن، روی و منیزیم.', description: 'با تغذیه درست، تمرکزش رو مثل لیزر تیز کن.', priority: 4, tabs: ['mind'], active: true },
        { id: 'm9', title: 'یه مغز تغذیه‌شده، یه سر و گردن از هم‌کلاسی‌هاش بالاتره.', description: 'نه فقط تو امتحان؛ تو حل مسائل زندگی.', priority: 3, tabs: ['mind'], active: true },
        { id: 'm10', title: 'ما به مغز بچهات ماهی نمی‌دیم؛ بهش یاد می‌دیم چطور خودشو بازسازی کنه.', description: 'تقویت مسیرهای عصبی، نه فقط دادن چند تا ویتامین.', priority: 4, tabs: ['mind'], active: true },
        { id: 'm11', title: 'خواب باکیفیت + تغذیه هوشمند = سوخت جت برای مغز.', description: 'بادرنجبویه برای خواب عمیق، پروتئین برای شارژ مغز.', priority: 3, tabs: ['mind'], active: true },
        { id: 'm12', title: 'دشمن یادگیری، شیطنت نیست؛ قند پنهان و کمبود ریزمغذی‌هاست.', description: 'قند زیاد، مغز رو خاموش می‌کنه. پروتئین، روشنش.', priority: 4, tabs: ['mind'], active: true },
        { id: 'm13', title: 'توی روش TC، قبل از کتاب دست بچه، بشقابش رو پُر می‌کنیم.', description: 'یادگیری از آشپزخونه شروع میشه، نه از کتابخونه.', priority: 5, tabs: ['mind'], active: true },
        { id: 'm14', title: 'آینده تحصیلی بچهات، تو آشپزخونه رقم می‌خوره نه توی کلاس.', description: 'یه مغز گرسنه، بهترین معلم دنیا رو هم درک نمی‌کنه.', priority: 4, tabs: ['mind'], active: true },
        { id: 'm15', title: 'فرزندت قرار نیست نابغه به دنیا بیاد؛ می‌تونه نابغه تغذیه بشه.', description: 'پتانسیل واقعی مغز، با تغذیه بیدار میشه.', priority: 4, tabs: ['mind'], active: true },
        { id: 'm16', title: 'ذهن آروم، حافظه قوی و یادگیری سریع، محصول یه صبحانه مهندسی‌شده‌ست.', description: 'ما مهندس تغذیه مغزیم.', priority: 3, tabs: ['mind'], active: true },
        { id: 'm17', title: 'ما با علم زبان‌شناسی و اصلاح طبع، مشکل تمرکز رو از ریشه حل می‌کنیم.', description: 'نه با داروهای شیمیایی. نسخهٔ منحصربه‌فرد برای ذهن منحصربه‌فرد فرزندت.', priority: 5, tabs: ['mind'], active: true },
        { id: 'm18', title: 'هیچ دو نسخه‌ای در زینالیکید شبیه هم نیست. حتی برای تقویت هوش.', description: 'چون هیچ دو کودکی شبیه هم نیستن.', priority: 3, tabs: ['mind'], active: true },
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
        hero: { url: old.heroImage.url || '/images/hero-default.jpg', alt: old.heroImage.alt || 'کودک شاد و سالم', enabled: old.heroImage.enabled !== false, storagePath: '' },
        trustBox: { url: (old.trustBoxImage?.url) || '/images/trust-default.jpg', alt: (old.trustBoxImage?.alt) || 'مادر و کودک خندان', enabled: (old.trustBoxImage?.enabled) !== false, storagePath: '' },
        courseDefault: { url: (old.courseImages?.defaultImage) || '/images/course-default.jpg', alt: 'دوره آموزشی', enabled: (old.courseImages?.enabled) !== false },
        specialist: { url: '/images/specialist-default.jpg', alt: 'کارشناس تغذیه', enabled: true, storagePath: '' },
      };
    } else if (!old.courseDefault) {
      migrated.images.courseDefault = { url: '/images/course-default.jpg', alt: 'دوره آموزشی', enabled: true };
    }
    if (!migrated.images.specialist) {
      migrated.images.specialist = { url: '/images/specialist-default.jpg', alt: 'کارشناس تغذیه', enabled: true, storagePath: '' };
    }
    // اضافه کردن storagePath به فیلدهای قدیمی اگر ندارند
    if (migrated.images.hero && !migrated.images.hero.storagePath) migrated.images.hero.storagePath = '';
    if (migrated.images.trustBox && !migrated.images.trustBox.storagePath) migrated.images.trustBox.storagePath = '';
    if (migrated.images.specialist && !migrated.images.specialist.storagePath) migrated.images.specialist.storagePath = '';
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
