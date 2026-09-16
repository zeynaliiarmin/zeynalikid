import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [routes,defaults,support,header,appRoutes,app,vercel,robots]=await Promise.all([
  read('src/config/routes.ts'),read('src/config/defaultSettings.ts'),read('src/app/appSupport.tsx'),read('src/components/Header.tsx'),read('src/app/AppRoutes.tsx'),read('src/App.tsx'),read('vercel.json'),read('public/robots.txt'),
]);
const failures=[];const need=(source,text,message)=>{if(!source.includes(text))failures.push(message)};const needRe=(source,pattern,message)=>{if(!pattern.test(source))failures.push(message)};const forbid=(source,pattern,message)=>{if(pattern.test(source))failures.push(message)};

// ─── ورودی یکتا: /profile = پنل کاربر ───
need(routes,"'/profile':'portal'",'/profile is not mapped to the parent panel view');
need(defaults,"entryMode: 'user'",'user portal is not the source default entry mode');
need(support,"m.entryMode='user';",'saved entry mode is not forced to the user portal');

// ─── حالت «پیگیری دوره» حذف شده ───
forbid(routes,/\/track/,'/track is still present in the route map');
forbid(appRoutes,/TrackPage/,'the tracking page is still routed');
forbid(appRoutes,/path="\/track"/,'/track still has a route');
forbid(defaults,/entryMode: *'user' *as *'track' *\| *'user'/,'the removed tracking mode is still a valid entry mode');
need(vercel,'"source": "/track"','/track rewrite is missing from vercel.json');
need(vercel,'"destination": "/api/track"','/track must be served by the 404 handler, not the SPA shell');

// ─── مسیر قدیمی /portal به /profile منتقل می‌شود ───
needRe(appRoutes,/<Route path="\/portal" element=\{<Navigate to="\/profile" replace \/>\} \/>/,'/portal does not redirect to /profile');
needRe(appRoutes,/<Route path="\/profile" element=\{<UserPortalPage \/>\} \/>/,'/profile does not render the user portal');

// ─── هدر عمومی ───
need(header,'data-testid="header-user-control"','public header avatar is not testable or permanently rendered');
need(header,'const showUserBtn = true;','public header avatar remains conditionally hidden');
need(header,"const showLogout = signedIn && path === '/profile';",'avatar logout behavior is not limited to signed-in /profile');
need(header,"const entryTarget = '/profile';",'avatar does not point at the single entry page');
forbid(header,/portalMode/,'the removed tracking preference is still used by the header');

// ─── لیست‌های view در App.tsx بدون پیگیری ───
forbid(app,/\['admin-login','track','portal'\]/,'tracking is still listed among the full-glass views');
forbid(app,/\['track','portal','admin-login'\]/,'tracking is still listed among the entry chrome views');

// ─── سئو: پنل کاربر ایندکس نشود و /track از خزش خارج باشد ───
need(robots,'Disallow: /profile','/profile is not disallowed for crawlers');
need(robots,'Disallow: /track','/track is not disallowed for crawlers');

if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('Entry-mode source contracts passed (single entry: /profile, /track removed).');
