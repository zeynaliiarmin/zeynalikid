import {writeFile} from 'node:fs/promises';
import {renderNotFoundPage} from '../api/referral/notFoundPage.js';
import {brand,supabaseUrl} from './ssg-config.mjs';
const html=renderNotFoundPage({brand,defaultDesign:'classic',defaultTheme:'motherly-trust',settingsUrl:`${supabaseUrl}/functions/v1/public-settings`});
await writeFile('public/404.html',html);
console.log(`Generated design-aware static 404 for ${brand}.`);
