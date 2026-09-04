import {writeFile} from 'node:fs/promises';
import {renderNotFoundPage} from '../api/referral/notFoundPage.js';
import {brand,supabaseUrl} from './ssg-config.mjs';

// پالت تاریک اختصاصی هر دیزاین (همان مقادیر src/theme/warmPalettes.ts) — برای صفحه ۴۰۴ ایستا.
const DARK_DESIGN_PALETTES={
 wellness:{bg:'#0F1A19',bg2:'#122020',surface:'#121C1A',raised:'#182422',text:'#ECE9F2',muted:'#A6B8B2',accent:'#A855F7',onAccent:'#12101C',border:'rgba(255,255,255,.14)'},
 kidlearn:{bg:'#0F1A19',bg2:'#122020',surface:'#121C1A',raised:'#182422',text:'#F0EAE2',muted:'#A6B8B2',accent:'#F87171',onAccent:'#12101C',border:'rgba(255,255,255,.14)'},
 blend:{bg:'#0F1A19',bg2:'#122020',surface:'#121C1A',raised:'#182422',text:'#E6F2F1',muted:'#A6B8B2',accent:'#38BDF8',onAccent:'#12101C',border:'rgba(255,255,255,.14)'},
 classic:{bg:'#0F1A19',bg2:'#122020',surface:'#121C1A',raised:'#182422',text:'#E3EDF7',muted:'#A6B8B2',accent:'#60A5FA',onAccent:'#12101C',border:'rgba(255,255,255,.14)'},
};
const defaultDesign=DARK_DESIGN_PALETTES[process.env.PUBLIC_DEFAULT_DESIGN||'wellness']?process.env.PUBLIC_DEFAULT_DESIGN||'wellness':'wellness';
const html=renderNotFoundPage({brand,supabaseUrl,initialMode:process.env.PUBLIC_THEME_MODE||'auto',darkDesign:DARK_DESIGN_PALETTES[defaultDesign]});
await writeFile('public/404.html',html);
console.log(`Generated unified, naturally scrollable static 404 for ${brand}.`);
