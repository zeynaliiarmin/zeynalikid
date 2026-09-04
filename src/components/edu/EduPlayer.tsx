import { type EduItem } from './edu-data';
import { ManualEmbed } from '../MediaCard';

/**
 * Detail-only media renderer. Platform controls belong to the embedded platform;
 * direct media keeps the browser's native controls through ManualEmbed.
 */
export default function EduPlayer({ item, kind, lang }: { item: EduItem; kind: 'video' | 'audio' | 'image'; lang: string }) {
  const en = lang === 'en';
  const code = (item as any).manualCode || item.url || '';
  if (code) {
    return (
      <div className="zke-player" style={{ border: 0, padding: 0, background: 'transparent' }}>
        <ManualEmbed code={code} type={kind} lang={lang} minHeight={kind === 'audio' ? 90 : 220} />
      </div>
    );
  }

  const message = kind === 'video'
    ? (en ? 'This video will be uploaded soon.' : 'ویدیو به‌زودی بارگذاری می‌شود.')
    : kind === 'image'
      ? (en ? 'This image will be uploaded soon.' : 'تصویر این قسمت به‌زودی بارگذاری می‌شود.')
      : (en ? 'The audio file will be uploaded soon.' : 'فایل صوتی این قسمت به‌زودی بارگذاری می‌شود.');
  return <div className="zke-player"><p className="zke-player-note">{message}</p></div>;
}
