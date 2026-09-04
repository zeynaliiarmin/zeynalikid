/**
 * Zeynalikid Education — Stage 8
 * نمونه‌محتوای نمایشی (فقط برای پیش‌نمایش UI). وقتی آیتم‌های واقعی از
 * تنظیمات/پنل ادمین بارگذاری شوند، این نمونه‌ها استفاده نمی‌شوند.
 * لحن: گرم/مادرانه/علمی — بدون هیچ ادعای درمان یا تضمین.
 */
import { computeDurationSeconds, formatDuration } from '../../utils/eduDuration';

export type EduType = 'article' | 'text' | 'video' | 'audio' | 'image';

export interface ArticleImage {
  id: string;
  url: string;
  position?: number;
}

export interface EduItem {
  id: string;
  type: EduType;
  title: string;
  titleEn: string;
  desc: string;
  descEn: string;
  minutes: number;      // زمان مطالعه/تماشا/شنیدن
  date: string;         // تاریخ انتشار نمایشی
  dateEn: string;
  cover?: string;
  url?: string;         // در صورت وجود، پلیر واقعی فعال می‌شود
  keywords?: string[];
  body?: string;        // متن مقاله (پاراگراف‌ها با \n\n)
  quote?: string;
  images?: ArticleImage[];
  author?: string;
  authorEn?: string;
  sourceUrl?: string;
  reviewedAt?: string;
}

export const isArticleType = (t: string): boolean => t === 'article' || t === 'text' || t === 'image';

export type ArticleBlock =
  | { kind: 'para'; text: string }
  | { kind: 'img'; url: string };

export function buildArticleBlocks(item: any): ArticleBlock[] {
  const paras = String(item?.body || '').split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  const images = (Array.isArray(item?.images) ? item.images : []).filter((im: any) => im && im.url);
  const byPos: Record<number, any[]> = {};
  images.forEach((im: any) => {
    const p = Number(im.position) || 0;
    (byPos[p] = byPos[p] || []).push(im);
  });
  const blocks: ArticleBlock[] = [];
  const insertAt = (pos: number) => {
    (byPos[pos] || []).forEach((im: any) => blocks.push({ kind: 'img', url: String(im.url) }));
  };
  insertAt(0);
  paras.forEach((p, idx) => {
    blocks.push({ kind: 'para', text: p });
    insertAt(idx + 1);
  });
  const maxPos = paras.length;
  Object.keys(byPos).map(Number).sort((a, b) => a - b).forEach((pos) => {
    if (pos > maxPos) insertAt(pos);
  });
  return blocks;
}


export const EDU_SAMPLES: EduItem[] = [
  {
    id: 's-a1', type: 'article',
    title: 'بدغذایی یا انتخابگری؟ شناخت تفاوت‌ها بدون نگرانی',
    titleEn: 'Picky eating or food preference? A calm guide',
    desc: 'یک راهنمای آرام برای اینکه رفتار غذایی کودک را بهتر بشناسید و سفره را آرام‌تر کنید.',
    descEn: 'A calm guide to understand your child’s eating behaviour.',
    minutes: 6, date: '۲۰ بهمن ۱۴۰۴', dateEn: 'Feb 2026',
    keywords: ['بدغذایی', 'اشتها', 'سفره', 'کودک'],
    quote: 'سفره آرام، تمرین کوچکِ هر روز است؛ نه میدان جنگ.',
    body: 'خیلی از والدین می‌پرسند کودک‌شان «بدغذا» است یا فقط انتخابگر. تفاوت این دو بیشتر از یک کلمه است؛ انتخابگری بخشی از رشد طبیعی سلیقه کودک است و معمولاً با صبر و تنوعِ بدون فشار، به‌مرور آرام می‌شود.\n\nقدم اول این است که الگوی غذایی کودک را چند روز یادداشت کنید؛ ساعت‌ها، مقدارها و حال‌وهوای وعده‌ها. این یادداشت به شما و مشاور کمک می‌کند تصویر واقعی‌تری ببینید، نه تصویری که نگرانی می‌سازد.\n\nقدم دوم، جدا کردن «مسئولیت‌ها» است: چه چیزی و چه زمانی ارائه شود با والدین است، و چه مقدار خورده شود با کودک. این ساده‌سازی، فشار را از سفره کم می‌کند و به کودک اجازه می‌دهد به sinyal‌های سیری و گرسنگی خودش اعتماد کند.\n\nو در نهایت، اگر الگوی غذایی کودک با رشد یا انرژی روزمره او گره خورده و نگران‌کننده به نظر می‌رسد، بهترین مسیر گفت‌وگو با یک مشاور متخصص است؛ محتوای عمومی فقط برای آگاهی است، نه قضاوت یا نسخه.',
  },
  {
    id: 's-a2', type: 'article',
    title: 'روتین خواب و تمرکز مدرسه؛ ارتباطی که کمتر دیده می‌شود',
    titleEn: 'Sleep routine and school focus',
    desc: 'چطور یک روتین خواب ساده می‌تواند روز مدرسه کودک را نرم‌تر کند.',
    descEn: 'How a simple sleep routine can smooth the school day.',
    minutes: 5, date: '۵ بهمن ۱۴۰۴', dateEn: 'Jan 2026',
    keywords: ['خواب', 'تمرکز', 'مدرسه'],
    quote: 'خوابِ کافی، زمینه آرامِ یادگیری است.',
    body: 'تمرکز در کلاس درس از شبِ قبل شروع می‌شود. کودکی که ساعت خواب نامنظم دارد، صبح با ذخیره کمترِ توجه بیدار می‌شود، حتی اگر صبحانه خوبی خورده باشد.\n\nیک روتین لازم نیست پیچیده باشد: ساعت ثابت خواب، نور کم‌تر در یک ساعت پایانی، و یک فعالیت آرام مثل کتاب خواندنِ مشترک. تکرارِ همین سه قدم، سیگنال امنی برای بدن کودک می‌سازد.\n\nاگر بی‌قراری شبانه یا خستگی روزانه ادامه داشت، به‌جای راه‌حل‌های عمومی، مشورت تخصصی مسیر درست‌تری است؛ چون الگوی خواب هر کودک می‌تواند ریشه متفاوتی داشته باشد.',
  },
  {
    id: 's-v1', type: 'video',
    title: 'آشنایی با نگاه TC به تغذیه؛ از مشاهده تا همراهی',
    titleEn: 'Introduction to the TC view on nutrition',
    desc: 'ویدیوی کوتاه درباره اینکه در روش TC ابتدا چه چیزهایی بررسی می‌شود.',
    descEn: 'A short video on what is observed first in the TC approach.',
    minutes: 8, date: '۱۲ بهمن ۱۴۰۴', dateEn: 'Feb 2026',
    keywords: ['TC', 'تغذیه', 'روش'],
  },
  {
    id: 's-v2', type: 'video',
    title: 'تنوع غذایی بدون جنگ؛ ۵ ایده کوچک برای سفره',
    titleEn: 'Food variety without battles; 5 tiny ideas',
    desc: 'ایده‌های کوچک و عملی برای معرفی غذاهای جدید بدون فشار.',
    descEn: 'Tiny practical ideas for introducing new foods without pressure.',
    minutes: 6, date: '۲۸ دی ۱۴۰۴', dateEn: 'Jan 2026',
    keywords: ['تنوع غذایی', 'سفره', 'بدغذایی'],
  },
  {
    id: 's-p1', type: 'audio',
    title: 'پادکست: افسانه‌های رایج درباره اشتهای کودک',
    titleEn: 'Podcast: common myths about appetite',
    desc: 'گفت‌وگوی کوتاه درباره باورهای رایج پیرامون اشتها و اینکه کدام‌یک پشتوانه ندارد.',
    descEn: 'A short talk about common appetite beliefs.',
    minutes: 12, date: '۲۲ بهمن ۱۴۰۴', dateEn: 'Feb 2026',
    keywords: ['اشتها', 'افسانه‌ها', 'پادکست'],
  },
  {
    id: 's-p2', type: 'audio',
    title: 'پادکست: قد و ژنتیک؛ چه چیزهایی در اختیار ماست؟',
    titleEn: 'Podcast: height and genetics',
    desc: 'گفت‌وگو درباره نقش ژنتیک، خواب و تغذیه در رشد قد — بدون وعده‌های بزرگ.',
    descEn: 'A talk on genetics, sleep and nutrition in growth.',
    minutes: 14, date: '۸ بهمن ۱۴۰۴', dateEn: 'Jan 2026',
    keywords: ['قد', 'ژنتیک', 'رشد'],
  },
];

export interface FaqSample { id: string; q: string; a: string; qEn?: string; aEn?: string; }

export const FAQ_SAMPLES: FaqSample[] = [
  { id: 'f1', q: 'آیا مکمل‌ها برای همه سنین مناسب‌اند؟', a: 'خیر؛ نیاز هر کودک متفاوت است و مکمل باید بر اساس شرایط همان کودک انتخاب شود. به همین دلیل ما پیش از هر پیشنهادی، شرایط فرزند شما را بررسی می‌کنیم. هرگز بدون مشورت، مکملی را شروع یا تغییر ندهید.' },
  { id: 'f2', q: 'چطور اشتهای کودک بدغذا را آرام‌تر کنم؟', a: 'اولین قدم کاهش فشار سر سفره است؛ وعده‌های منظم، تنوع کوچک و تکرار بدون اجبار معمولاً مسیر درست‌تری می‌سازد. اگر بی‌اشتهایی با خستگی یا افت انرژی همراه است، مشورت تخصصی توصیه می‌شود.' },
  { id: 'f3', q: 'رشد قد تا چه سنی ادامه دارد؟', a: 'به‌طور کلی تا بسته شدن صفحات رشد در پایان نوجوانی؛ زمان دقیق آن برای هر کودک متفاوت است. الگوی خواب، تغذیه و فعالیت روزانه در این بازه نقش حمایتی دارند و بررسی فردی، تصویر دقیق‌تری می‌دهد.' },
  { id: 'f4', q: 'آیا بررسی زبان کودک واقعاً بی‌خطر است؟', a: 'بله؛ این بررسی فقط یک مشاهده ظاهری برای آشنایی با الگوی مزاج و گوارش است و هیچ مداخله یا آزمایشی ندارد. نتیجه آن به‌تنهایی مبنای تصمیم نیست و فقط سرنخ‌های اولیه به مشاور می‌دهد.' },
  { id: 'f5', q: 'مشاوره آنلاین چه فرقی با حضوری دارد؟', a: 'در مدل ما، مشاوره به‌صورت تلفنی/آنلاین است تا والدین درگیر رفت‌وآمد نشوند؛ روند بررسی اطلاعات و پیگیری هفتگی در هر دو حالت یکسان طراحی شده است.' },
  { id: 'f6', q: 'برنامه تغذیه چطور برای فرزند من شخصی‌سازی می‌شود؟', a: 'با اطلاعات سن، قد، وزن، الگوی اشتها، خواب و گوارش که در فرم ثبت می‌کنید، برنامه مخصوص همان کودک تنظیم و در طول دوره بر اساس پیگیری‌ها اصلاح می‌شود.' },
  { id: 'f7', q: 'چقدر طول می‌کشد نتیجه را ببینیم؟', a: 'هر کودک مسیر خودش را دارد و هیچ زمان قطعی و یکسانی وجود ندارد. به همین دلیل پیگیری مرحله‌ای داریم تا مسیر را آرام و واقع‌بینانه دنبال کنیم.' },
  { id: 'f8', q: 'آیا این محتوا جایگزین پزشک کودک است؟', a: 'خیر؛ مقاله‌ها و پادکست‌های ما فقط برای آگاهی‌بخشی عمومی است. اگر کودک شما علائم خاص یا بیماری زمینه‌ای دارد، اولویت همیشه با نظر پزشک معالج اوست.' },
  { id: 'f9', q: 'کودکم میان‌وعده شیرینی زیاد می‌خواهد؛ چه کنم؟', a: 'حذف ناگهانی معمولاً جواب نمی‌دهد؛ جایگزین‌های ساده در دسترس و زمان‌بندی منظمِ وعده‌ها کمک می‌کند میل به شیرینی به‌مرور متعادل شود. در مشاوره، ایده‌های متناسب با طبع کودک پیشنهاد می‌شود.' },
  { id: 'f10', q: 'آیا برای نوجوان ۱۵-۱۷ ساله هم برنامه دارید؟', a: 'بله؛ بازه همراهی ما ۲ تا ۱۷ سال است و برای نوجوانان، برنامه با توجه به الگوی رشد و سبک زندگی مدرسه‌ای/ورزشی همان نوجوان تنظیم می‌شود.' },
];

export const typeLabel = (t: EduType, lang: string) =>
  (t === 'article' || t === 'text') ? (lang === 'en' ? 'Article' : 'مقاله') :
  t === 'video' ? (lang === 'en' ? 'Video' : 'ویدیو') :
  t === 'image' ? (lang === 'en' ? 'Photo' : 'تصویر') :
  (lang === 'en' ? 'Podcast' : 'پادکست');

export const faNum = (n: number) => { try { return n.toLocaleString('fa-IR'); } catch { return String(n); } };

export const durationLabel = (it: EduItem, lang: string) => {
  // مدت‌زمان به‌صورت خودکار محاسبه می‌شود:
  // مقاله = زمان مطالعه متن (بر اساس تعداد کاراکتر)؛ ویدیو/ویس = مدت رسانه + زمان مطالعه توضیحات.
  // زیر یک دقیقه → ثانیه؛ از یک دقیقه به بالا → دقیقه.
  return formatDuration(it.type, computeDurationSeconds(it as any), lang);
};
