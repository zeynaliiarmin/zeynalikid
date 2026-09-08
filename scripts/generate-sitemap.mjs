// Generate sitemap.xml at build time with today's lastmod dates.
// The URL list is derived from the prerendered SSG routes (scripts/ssg-config.mjs)
// so the sitemap can never advertise a non-prerendered SPA shell route again.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { siteUrl, brand, routes } from './ssg-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const today = new Date().toISOString().slice(0, 10);

// Per-route hints; any new SSG route automatically falls back to sensible defaults.
const meta = {
  '/':         { changefreq: 'weekly',  priority: '1.0' },
  '/courses':  { changefreq: 'weekly',  priority: '0.9' },
  '/products': { changefreq: 'weekly',  priority: '0.7' },
  '/privacy':  { changefreq: 'yearly',  priority: '0.5' },
};
const defaults = { changefreq: 'monthly', priority: '0.7' };

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(loc => {
  const u = { ...defaults, ...(meta[loc] || {}) };
  return `  <url>\n    <loc>${siteUrl}${loc === '/' ? '' : loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
}).join('\n')}
</urlset>
`;

await writeFile(resolve(__dirname, '../public/sitemap.xml'), xml, 'utf8');
console.log(`Sitemap generated for ${brand}: ${routes.length} prerendered URLs, lastmod=${today}`);
