import {writeFile} from 'node:fs/promises';
import {renderNotFoundPage} from '../api/referral/notFoundPage.js';
import {brand} from './ssg-config.mjs';
const html=renderNotFoundPage({brand});
await writeFile('public/404.html',html);
console.log(`Generated fixed-viewport static 404 for ${brand}.`);
