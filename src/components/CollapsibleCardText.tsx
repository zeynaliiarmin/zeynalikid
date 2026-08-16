import { useLayoutEffect, useRef, useState } from 'react';

type Props = {
  text?: string;
  color?: string;
  accentColor?: string;
  background?: string;
  fontSize?: number | string;
  lineHeight?: number;
  lines?: number;
  moreLabel?: string;
  lessLabel?: string;
  className?: string;
  direction?: 'rtl' | 'ltr';
};

export default function CollapsibleCardText({
  text = '',
  color = 'var(--zk-text-muted)',
  accentColor = 'var(--zk-primary)',
  background = 'var(--zk-surface)',
  fontSize = 12,
  lineHeight = 1.8,
  lines = 2,
  moreLabel = 'بیشتر…',
  lessLabel = 'کمتر',
  className,
  direction = 'rtl',
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const value = String(text || '').trim();
  const numericSize = typeof fontSize === 'number' ? fontSize : 12;
  const closedHeight = numericSize * lineHeight * lines;

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element || !value) {
      setCanExpand(false);
      return;
    }
    const measure = () => {
      const overflowed = element.scrollHeight > closedHeight + 2;
      setCanExpand(overflowed || value.length > 78);
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (observer) observer.observe(element);
    return () => observer?.disconnect();
  }, [value, closedHeight]);

  if (!value) return <div aria-hidden="true" style={{ height: closedHeight }} />;

  return (
    <div className={className} style={{ position: 'relative', color, fontSize, lineHeight }}>
      <div
        ref={textRef}
        style={expanded ? {
          whiteSpace: 'pre-wrap',
        } : {
          height: closedHeight,
          minHeight: closedHeight,
          display: '-webkit-box',
          WebkitLineClamp: lines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          paddingInlineEnd: canExpand ? 58 : 0,
        }}
      >
        {value}
      </div>
      {canExpand && !expanded && (
        <button
          type="button"
          aria-expanded="false"
          onClick={(event) => { event.stopPropagation(); setExpanded(true); }}
          style={{
            position: 'absolute',
            insetInlineEnd: 0,
            bottom: 0,
            minHeight: numericSize * lineHeight,
            padding: '0 2px 0 7px',
            border: 0,
            background: `linear-gradient(to ${direction === 'rtl' ? 'left' : 'right'}, transparent, ${background} 24%, ${background})`,
            color: accentColor,
            cursor: 'pointer',
            font: 'inherit',
            fontWeight: 850,
            lineHeight,
          }}
        >
          {moreLabel}
        </button>
      )}
      {canExpand && expanded && (
        <button
          type="button"
          aria-expanded="true"
          onClick={(event) => { event.stopPropagation(); setExpanded(false); }}
          style={{ border: 0, background: 'transparent', color: accentColor, cursor: 'pointer', font: 'inherit', fontWeight: 850, padding: '3px 0 0' }}
        >
          {lessLabel}
        </button>
      )}
    </div>
  );
}
