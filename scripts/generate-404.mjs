import {writeFile} from 'node:fs/promises';
import {renderNotFoundPage} from '../api/referral/notFoundPage.js';
import {brand,supabaseUrl} from './ssg-config.mjs';

// پالت تاریک اختصاصی هر دیزاین (همان مقادیر src/theme/warmPalettes.ts) — برای صفحهٔ ۴۰۴ ایستا.
const DARK_DESIGN_PALETTES={
 wellness:{bg:'#151021',bg2:'#191327',surface:'#1D1627',raised:'#241C33',text:'#F2EAFC',muted:'#A79BC0',accent:'#A855F7',onAccent:'#12101C',border:'rgba(255,255,255,.14)'},
 kidlearn:{bg:'#1B1112',bg2:'#221516',surface:'#1D1627',raised:'#241C33',text:'#FBE9E4',muted:'#A79BC0',accent:'#F87171',onAccent:'#12101C',border:'rgba(255,255,255,.14)'},
 blend:{bg:'#0F1A19',bg2:'#122020',surface:'#1D1627',raised:'#241C33',text:'#E6F2F1',muted:'#A79BC0',accent:'#38BDF8',onAccent:'#12101C',border:'rgba(255,255,255,.14)'},
 classic:{bg:'#0F1620',bg2:'#131C29',surface:'#1D1627',raised:'#241C33',text:'#E3EDF7',muted:'#A79BC0',accent:'#60A5FA',onAccent:'#12101C',border:'rgba(255,255,255,.14)'},
};
const defaultDesign=DARK_DESIGN_PALETTES[process.env.PUBLIC_DEFAULT_DESIGN||'wellness']?process.env.PUBLIC_DEFAULT_DESIGN||'wellness':'wellness';
const html=renderNotFoundPage({brand,supabaseUrl,initialMode:process.env.PUBLIC_THEME_MODE||'auto',darkDesign:DARK_DESIGN_PALETTES[defaultDesign]});
await writeFile('public/404.html',html);
console.log(`Generated unified, naturally scrollable static 404 for ${brand}.`);
