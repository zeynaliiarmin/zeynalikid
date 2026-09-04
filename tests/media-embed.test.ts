import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isHtmlEmbedCode,
  mediaEmbedProvider,
  mediaFrameSandbox,
  normalizeEmbedCode,
  normalizeVideoEmbedUrl,
} from '../src/components/MediaCard';

let passed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`FAILED: ${message}`);
  passed++;
}

const aparat = '<style>.h_iframe-aparat_embed_frame{position:relative}</style><div class="h_iframe-aparat_embed_frame"><iframe src="https://www.aparat.com/video/video/embed/videohash/example/vt/frame"></iframe></div>';
const encoded = aparat.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isolatedSandbox = 'allow-scripts allow-presentation';
const trustedSandbox = 'allow-scripts allow-same-origin allow-presentation';

assert(normalizeEmbedCode(aparat) === aparat, 'plain Aparat style+iframe code remains unchanged');
assert(normalizeEmbedCode(encoded) === aparat, 'HTML-entity encoded Aparat iframe is decoded');
assert(normalizeEmbedCode(`(${encoded})`) === aparat, 'encoded iframe wrapped in parentheses is normalized');
assert(isHtmlEmbedCode(aparat), 'Aparat code beginning with style is recognized as HTML');
assert(isHtmlEmbedCode(encoded), 'encoded Aparat code is recognized as HTML');
assert(!isHtmlEmbedCode('https://www.aparat.com/video/video/embed/videohash/example/vt/frame'), 'plain embed URL remains a URL');

assert(mediaEmbedProvider('https://www.aparat.com/video/video/embed/videohash/example/vt/frame') === 'aparat', 'Aparat gets an explicit trusted-provider classification');
assert(mediaEmbedProvider('https://www.youtube.com/embed/example') === 'youtube', 'YouTube gets an explicit trusted-provider classification');
assert(mediaEmbedProvider('https://player.vimeo.com/video/example') === 'vimeo', 'Vimeo gets an explicit trusted-provider classification');
assert(mediaEmbedProvider('https://youtube.example.test/embed/example') === 'other', 'look-alike hosts are never treated as trusted providers');
assert(mediaFrameSandbox('https://www.aparat.com/video/video/embed/videohash/example/vt/frame') === trustedSandbox, 'Aparat receives the verified native-control sandbox it needs to show its own play control');
assert(mediaFrameSandbox('https://www.youtube.com/embed/example') === trustedSandbox, 'YouTube native controls get only its verified player capabilities');
assert(mediaFrameSandbox('https://unknown.example/embed/example') === isolatedSandbox, 'unknown embeds stay isolated without same-origin or popup permissions');

assert(normalizeVideoEmbedUrl('https://www.aparat.com/v/rgzh6ht') === 'https://www.aparat.com/video/video/embed/videohash/rgzh6ht/vt/frame', 'Aparat watch links become official player URLs');
assert(normalizeVideoEmbedUrl('https://www.youtube.com/watch?v=abcdefghi12') === 'https://www.youtube.com/embed/abcdefghi12', 'YouTube watch links become official player URLs');

const mediaCardSource = readFileSync(resolve(process.cwd(), 'src/components/MediaCard.tsx'), 'utf8');
assert(
  mediaCardSource.includes("!expanded && (openDetails?<button type=\"button\" data-media-card-cover=\"true\""),
  'a closed media card uses its cover button as the only interactive media surface',
);
assert(
  mediaCardSource.includes("{expanded&&type==='video'&&(mediaCode?<ManualEmbed code={mediaCode} type=\"video\""),
  'the real video player is rendered only by the expanded detail branch',
);
assert(!mediaCardSource.includes('zke-play-ov'), 'the retired custom preview play overlay is not present');
assert(!mediaCardSource.includes('zke-playbtn'), 'the retired custom player control is not present');
assert(!mediaCardSource.includes('allow-popups'), 'embedded players do not receive unnecessary popup permission');
assert(mediaCardSource.includes('referrerPolicy="strict-origin-when-cross-origin"'), 'detail players preserve the secure origin referrer required by native platform controls');
assert(
  mediaCardSource.includes('const previewBox=<div data-media-card-preview="true"'),
  'the preview branch is explicitly a cover-only box',
);
const vercelConfig = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'));
const csp = vercelConfig.headers?.flatMap((entry: any) => entry.headers || []).find((entry: any) => entry.key === 'Content-Security-Policy')?.value || '';
assert(csp.includes('frame-src https:'), 'production CSP permits a secure detail iframe for every sanitized HTTPS embed provider');

console.log(`media-embed: ${passed} assertions passed`);
