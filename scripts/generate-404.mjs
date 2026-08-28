import {writeFile} from 'node:fs/promises';
import {renderNotFoundPage} from '../api/referral/notFoundPage.js';
import {brand,supabaseUrl} from './ssg-config.mjs';
const html=renderNotFoundPage({brand,supabaseUrl,initialMode:process.env.PUBLIC_THEME_MODE||'auto'});
await writeFile('public/404.html',html);
console.log(`Generated unified, naturally scrollable static 404 for ${brand}.`);
