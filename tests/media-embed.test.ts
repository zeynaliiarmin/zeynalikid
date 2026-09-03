import { isHtmlEmbedCode, mediaFrameSandbox, normalizeEmbedCode } from '../src/components/MediaCard';

let passed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`FAILED: ${message}`);
  passed++;
}

const aparat = '<style>.h_iframe-aparat_embed_frame{position:relative}</style><div class="h_iframe-aparat_embed_frame"><iframe src="https://www.aparat.com/video/video/embed/videohash/example/vt/frame"></iframe></div>';
const encoded = aparat.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
assert(normalizeEmbedCode(aparat) === aparat, 'plain Aparat style+iframe code remains unchanged');
assert(normalizeEmbedCode(encoded) === aparat, 'HTML-entity encoded Aparat iframe is decoded');
assert(normalizeEmbedCode(`(${encoded})`) === aparat, 'encoded iframe wrapped in parentheses is normalized');
assert(isHtmlEmbedCode(aparat), 'Aparat code beginning with style is recognized as HTML');
assert(isHtmlEmbedCode(encoded), 'encoded Aparat code is recognized as HTML');
assert(!isHtmlEmbedCode('https://www.aparat.com/video/video/embed/videohash/example/vt/frame'), 'plain embed URL remains a URL');
assert(mediaFrameSandbox('https://www.aparat.com/video/video/embed/videohash/example/vt/frame') === 'allow-scripts allow-presentation', 'Aparat iframe is isolated from the site document');
assert(mediaFrameSandbox('https://www.youtube.com/embed/example') === 'allow-scripts allow-same-origin allow-presentation', 'non-Aparat embeds retain their existing sandbox behaviour');

console.log(`media-embed: ${passed} assertions passed`);
