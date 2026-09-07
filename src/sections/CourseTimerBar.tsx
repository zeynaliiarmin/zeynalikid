// src/sections/CourseTimerBar.tsx
// Stage-3 refactor: نوار تایمر بالای صفحه که CourseTimer را در طول روند ثبت
// دوره نمایش می‌دهد و page زیرین را کمی به بالا می‌کشد تا هدر روی آن overlap
// نکند. منطق بایت‌به‌بایت همان است که قبلاً در App.tsx بود.
import CourseTimer from '../components/CourseTimer';

interface CourseTimerBarProps {
  flowDeadline: number | null;
  timerViews: readonly string[];
  view: string;
  showHeader: boolean;
  lang: 'fa' | 'en';
}

export default function CourseTimerBar({ flowDeadline, timerViews, view, showHeader, lang }: CourseTimerBarProps) {
  if (!flowDeadline || !timerViews.includes(view)) return null;
  return (
    <>
      <div style={{
        maxWidth: 'min(880px, 100%)',
        margin: '0 auto',
        marginTop: showHeader ? 'calc(env(safe-area-inset-top, 0px) - 6px)' : undefined,
        padding: showHeader ? '0 14px 0' : 'calc(2px + env(safe-area-inset-top, 0px)) 14px 0',
        position: 'relative',
        zIndex: 5,
      }}>
        <CourseTimer deadline={flowDeadline} lang={lang} />
      </div>
      {/* wrapper for <page/> below is rendered by parent so we can add a negative
          margin without creating a separate wrapper here; parent applies the
          margin when this component is visible. */}
    </>
  );
}

/** استایل حاشیه منفی برای wrapper اصلی صفحه وقتی تایمر نمایش داده می‌شود —
 *  قبلاً در App.tsx به‌صورت inline محاسبه می‌شد. */
export const TIMER_BELOW_OFFSET = { marginTop: 'calc(-14px - env(safe-area-inset-top, 0px))' } as const;
