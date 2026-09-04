import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');const [home,homeCss,services,install,menu,courses,notFound,notFoundCss,server404,assistantCss,icon]=await Promise.all([read('src/pages/HomePage.tsx'),read('src/pages/home-v2.css'),read('src/components/ServicesSection.tsx'),read('src/components/InstallPrompt.tsx'),read('src/components/HamburgerMenu.tsx'),read('src/pages/CoursesPage.tsx'),read('src/pages/NotFoundPage.tsx'),read('src/pages/not-found-page.css'),read('api/referral/notFoundPage.js'),read('src/components/assistant-widget.css'),read('src/components/GuideHeadsetIcon.tsx')]);
const failures=[];const need=(s,t,m)=>{if(!s.includes(t))failures.push(m)};const forbid=(s,r,m)=>{if(r.test(s))failures.push(m)};
need(home,"'محصولات منتخب'",'featured products title not corrected');forbid(home,/محصولات و برنامه‌های منتخب/,'old featured products title remains');forbid(home,/محصولات قبلی|محصولات بعدی|Previous products|Next products/,'featured product arrow controls remain');need(homeCss,'.zk-home-core-grid{display:grid!important','mobile core grid is not non-scrolling');need(homeCss,'.zk-home-quick-grid{grid-template-columns:repeat(2','mobile quick access redesign missing');
for(const text of ['<span class="exclaim">عه !</span><span class="question">اینجا کجاست؟</span>','صفحه‌ای که دنبالش بودی، پیدا نشد.','مسیر درست را از بین گزینه‌های زیر پیدا کن!','درخواست مشاوره','معرفی دوره‌ها','تجربه والدین','مجوزها و نمادها','مقالات آموزشی','ارتباط با ما و پشتیبانی','بازگشت به صفحه اصلی','id="neu-4-shadow"','id="donut-hole-mask"'])need(server404,text,`server 404 omits ${text}`);
for(const text of ['<span className="zk-nf-exclaim">عه !</span><span className="zk-nf-question">اینجا کجاست؟</span>','صفحه‌ای که دنبالش بودی، پیدا نشد.','مسیر درست را از بین گزینه‌های زیر پیدا کن!','مقالات آموزشی','ارتباط با ما و پشتیبانی','Memphis404Artwork','id="neu-4-shadow"','id="donut-hole-mask"'])need(notFound,text,`client 404 omits ${text}`);
for(const token of ['min-height:100dvh','min-height:92dvh','overflow-y:auto','border-radius:38px','border-radius:9999px','grid-template-columns:repeat(2','-webkit-tap-highlight-color:transparent','outline:none!important','var(--nf-page-bg)','var(--nf-surface)','var(--nf-text)','var(--nf-warm)','var(--nf-gradient)','color-mix(in srgb,var(--nf-tone)',"data-nf-mode='dark'",'color-scheme:dark','transition:none!important'])need(notFoundCss,token,`client theme-aware unified 404 contract omits ${token}`);
for(const token of ["const {T}=useAppContext()","data-nf-theme={themeId}","data-nf-mode={dark?'dark':'light'}","'--nf-accent':accent","'--nf-surface':surface","'--nf-gradient':String(T.grad"])need(notFound,token,`client 404 does not consume active theme token: ${token}`);
for(const token of ['min-height:100dvh','min-height:92dvh','overflow-y:auto','border-radius:38px','border-radius:9999px','grid-template-columns:repeat(2','-webkit-tap-highlight-color:transparent','outline:none!important','background:#edf6f5','linear-gradient(90deg,#1769c2 0%,#356b62 100%)','color:#B83A3A','color:#17202b'])need(server404,token,`server unified 404 contract omits ${token}`);
const emoji=/\p{Extended_Pictographic}/u;forbid(notFound,emoji,'client 404 contains emoji');forbid(server404,emoji,'server 404 contains emoji');forbid(notFoundCss,/@keyframes|animation\s*:/,'client 404 must be entirely static');forbid(server404,/@keyframes|animation\s*:/,'server 404 must be entirely static');forbid(notFoundCss,/overflow\s*:\s*hidden|position\s*:\s*fixed|max-height\s*:\s*100dvh/,'client 404 still locks the viewport');forbid(server404,/overflow\s*:\s*hidden|position\s*:\s*fixed|max-height\s*:\s*100dvh/,'server 404 still locks the viewport');forbid(notFound,/ارتباط و پشتیبانی/,'client 404 retains the previous contact title');forbid(server404,/ارتباط و پشتیبانی/,'server 404 retains the previous contact title');
need(menu,'zk-public-menu-in-rtl','public menu slide animation missing');forbid(courses,/\{filteredCourses\.length\}\s*\{lang === 'en' \? 'courses'/,'course count remains visible');need(install,"background: 'transparent'",'install close background remains');need(assistantCss,'.zka-head button{width:32px','assistant close button reset missing');need(assistantCss,'border-radius:8px','assistant suggestions are still pill-shaped');need(icon,'m22.7 3','new assistant sparkle-chat vector missing');
const navParts=services.match(/aria-label=\{isRtl \? 'قبلی'[\s\S]*?aria-label=\{isRtl \? 'بعدی'/)?.[0]||'';need(navParts,"background: 'transparent'",'service arrows still have containers');need(navParts,'border: 0','service arrow border remains');


// Regression coverage for the public-course, portal, return-header and typography request.
const [courseDetail, portal, portalCss, review, article, ctaCss, backCss, profile, entryBack] = await Promise.all([
  read('src/components/CourseDetailView.tsx'),
  read('src/pages/UserPortalPage.tsx'),
  read('src/pages/portal.css'),
  read('src/components/ReviewSection.tsx'),
  read('src/components/edu/ArticleModal.tsx'),
  read('src/components/zkCta.css'),
  read('src/components/public-back-button.css'),
  read('src/pages/ProfilePage.tsx'),
  read('src/components/EntryBackButton.tsx'),
]);
forbid(courseDetail, /دوره تخصصی|Specialized Course/, 'fixed specialized-course detail tag remains');
need(courseDetail, "{course.duration && (", 'course duration is no longer independently guarded after fixed tag removal');
need(courseDetail, 'data-testid="course-consult-panel"', 'opened consultation panel is not separately targetable');
need(courseDetail, 'className="zk-consult-panel-copy"', 'opened consultation panel copy card is missing');
need(courseDetail, 'className="zk-consult-panel-icon"', 'opened consultation panel visual cue is missing');
need(ctaCss, '.zk-consult-panel-copy', 'opened-only consultation panel styling is missing');
need(ctaCss, '.zk-consult-panel-icon', 'opened-only consultation panel icon styling is missing');
need(ctaCss, '.zk-consult-panel > .zk-swap-cta', 'opened consultation CTA does not receive its full-width treatment');
need(ctaCss, '.zk-consult-trigger {', 'closed consultation trigger contract is missing');
need(ctaCss, 'padding: 10px 16px 12px;', 'closed consultation trigger dimensions changed');
need(portal, "'خوش آمدید!'", 'portal Persian welcome heading is not exact');
need(portal, '<span className="zp-sub-line">با شماره تماس و کد پیگیری وارد شوید؛</span>', 'portal first Persian subtitle line is not exact');
need(portal, '<span className="zp-sub-line">اگر کد پیگیری دارید نیازی به ثبت‌نام دوباره نیست</span>', 'portal second Persian subtitle line is not exact');
need(portalCss, '.zp-sub-line{display:block}', 'portal subtitle lines are not independently displayed');
need(portal, '<EntryBackButton lang={lang} />', 'portal entry header no longer uses the shared return control');
forbid(portal, /className="zp-chip"[\s\S]{0,300}USER PORTAL/, 'portal user chip remains');
for(const [source, id, label] of [
  [courseDetail, 'public-course-education-back', 'course education overlay'],
  [courseDetail, 'public-course-faq-back', 'course FAQ overlay'],
  [review, 'public-reviews-back', 'reviews overlay'],
  [article, 'public-education-detail-back', 'education detail overlay'],
  [entryBack, 'public-entry-back', 'portal entry header'],
]) {
  need(source, id, `${label} has no public return control`);
}
need(courseDetail, 'className="zk-public-title-row" dir={isFa ? \'rtl\' : \'ltr\'}', 'course detached headers have no explicit local direction');
need(review, '<div className="zk-public-title-row">', 'reviews title and return are not placed in the shared row');
need(review, "dir={isFa ? 'rtl' : 'ltr'}", 'reviews detached header has no local direction');
need(article, 'className="zke-modal-head zk-public-title-row" dir={en ? \'ltr\' : \'rtl\'}', 'education detail header has no local title-row direction');
need(article, 'className="zke-modal-heading"', 'education detail title and type icon are not grouped');
need(backCss, '.zk-public-title-row > .zk-public-back', 'shared public return row contract is missing');
need(backCss, 'order: 2;', 'shared public return does not occupy the opposite title edge');
need(profile, "textAlign: 'start'", 'profile public title remains centered instead of aligned to its language edge');

// U+06C0 and HEH + HAMZA ABOVE must not survive in tracked source as visual text.
const {execFileSync} = await import('node:child_process');
const typographyFiles = execFileSync('git', ['ls-files', '-z'], { encoding: 'buffer' }).toString().split('\0').filter(Boolean);
const precomposed = Buffer.from([0xdb, 0x80]);
const composed = Buffer.from([0xd9, 0x87, 0xd9, 0x94]);
const typographyOffenders = [];
for (const file of typographyFiles) {
  const body = await readFile(new URL(`../${file}`, import.meta.url));
  // Avoid treating arbitrary binary coincidences as text; all textual project assets decode as UTF-8.
  if (body.toString('utf8').includes('\ufffd')) continue;
  if (body.includes(precomposed) || body.includes(composed)) typographyOffenders.push(file);
}
if (typographyOffenders.length) failures.push(`requested HEH form remains in: ${typographyOffenders.join(', ')}`);

if(failures.length){console.error(failures.join('\n'));process.exit(1)}console.log('Requested UI polish and theme-aware unified 404 contracts passed.');
