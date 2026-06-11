import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'http://localhost:3004').replace(/\/+$/, '');
const urls = ['/admissions/region-vi/iloilo/302345'];
const generatedAt = new Date().toISOString();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${siteUrl}${url}</loc>
    <lastmod>${generatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

const outputPath = resolve(process.cwd(), 'public', 'sitemap.xml');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, xml, 'utf8');
