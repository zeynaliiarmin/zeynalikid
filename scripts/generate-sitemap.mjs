// Generate sitemap.xml at build time with today's lastmod dates.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { siteUrl, brand } from './ssg-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const today = new Date().toISOString().slice(0, 10);

const urls = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/courses', changefreq: 'weekly', priority: '0.9' },
  { loc: '/education', changefreq: 'weekly', priority: '0.7' },
  { loc: '/faq', changefreq: 'monthly', priority: '0.7' },
  { loc: '/about', changefreq: 'monthly', priority: '0.7' },
  { loc: '/contact', changefreq: 'monthly', priority: '0.7' },
  { loc: '/products', changefreq: 'weekly', priority: '0.7' },
  { loc: '/consultation', changefreq: 'monthly', priority: '0.7' },
  { loc: '/growth', changefreq: 'monthly', priority: '0.7' },
  { loc: '/privacy', changefreq: 'yearly', priority: '0.5' },
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${siteUrl}${u.loc === '/' ? '' : u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

await writeFile(resolve(__dirname, '../public/sitemap.xml'), xml, 'utf8');
console.log(`Sitemap generated for ${brand} with lastmod=${today}`);
