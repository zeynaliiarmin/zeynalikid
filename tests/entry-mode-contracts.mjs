import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [routes,defaults,support,header,app,entryMigration]=await Promise.all([
  read('src/config/routes.ts'),read('src/config/defaultSettings.ts'),read('src/app/appSupport.tsx'),read('src/components/Header.tsx'),read('src/App.tsx'),read('supabase/migrations/20260904113000_set_user_portal_entry_default.sql'),
]);
const failures=[];const need=(source,text,message)=>{if(!source.includes(text))failures.push(message)};const forbid=(source,pattern,message)=>{if(pattern.test(source))failures.push(message)};
need(routes,"'/track':'track','/portal':'portal'",'/track and /portal are not mapped to independent views');
need(defaults,"entryMode: 'user'",'user portal is not the source default entry mode');
need(entryMigration,`jsonb_set(coalesce(settings, '{}'::jsonb), '{entryMode}', '"user"'::jsonb, true)`, 'existing saved entry preference is not migrated to user portal');
need(support,"m.entryMode=raw?.entryMode==='track'?'track':'user'",'missing/invalid saved entry mode does not safely become user portal');
need(header,'data-testid="header-user-control"','public header avatar is not testable or permanently rendered');
need(header,'const showUserBtn = true;','public header avatar remains conditionally hidden');
need(header,"const showLogout = signedIn && path === '/portal';",'avatar logout behavior is not limited to signed-in /portal');
need(header,"const entryTarget = portalMode === false ? '/track' : '/portal';",'avatar does not use the active entry preference');
need(app,"portalMode={(cfg as any)?.entryMode!=='track'}",'app does not pass the active entry preference to its header');
forbid(routes,/['"]\/portal['"]\s*:\s*['"]track['"]/, '/portal is still aliased to tracking');
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('Entry-mode source contracts passed.');
