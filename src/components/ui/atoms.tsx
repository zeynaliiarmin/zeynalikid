// src/components/ui/atoms.tsx
// Stage-5: کامپوننت‌های اتمی برای جایگزینی استایل‌های inline تکراری.
// همه از CSS variableهای Stage-1 می‌خوانند → هر بار که تم عوض می‌شود خودبه‌خود
// هماهنگ می‌مانند. هدف این فایل حذف style={{...S.btn,...}} های پرتکرار در JSX
// است، نه تغییر بصری. همه پراپ‌های استاندارد HTML از طریق ...rest عبور می‌کنند
// تا form/button type, disabled, onClick, aria-*, و ... بدون تغییر کار کنند.
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode, TextareaHTMLAttributes, InputHTMLAttributes } from 'react';

type Styleable = { className?: string; style?: React.CSSProperties };

/** دکمه اصلی (CTA) — همان S.btn. نوع پیش‌فرض button است تا در فرم‌ها
 *  اتفاقی submit نکند؛ هر جا به type="submit" نیاز است به‌صراحت پاس دهید. */
export function PrimaryButton({
  type = 'button',
  children,
  style,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & Styleable & { children?: ReactNode }) {
  return (
    <button
      type={type}
      className={className}
      style={{
        width: '100%', minHeight: 52, padding: 'var(--zk-space-btn, 14px 28px)',
        background: 'var(--zk-grad, var(--zk-primary))', border: 0,
        borderRadius: 'var(--zk-radius-btn, 16px)', color: 'var(--zk-text-inverse, #fff)',
        fontSize: 16, fontWeight: 800, cursor: 'pointer',
        boxShadow: 'var(--zk-shadow-btn)', fontFamily: 'inherit',
        transition: 'all .25s ease', ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** دکمه ثانویه (نوع گاست/بازگشت) — همان S.btnGhost */
export function GhostButton({
  children,
  style,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & Styleable & { children?: ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      style={{
        width: '100%', minHeight: 48, padding: '12px 24px',
        background: 'var(--zk-card)', border: 'var(--zk-border-btn-ghost)',
        borderRadius: 'var(--zk-radius-btn, 16px)', color: 'var(--zk-pri-text)',
        fontSize: 14.5, fontWeight: 700, cursor: 'pointer',
        boxShadow: 'var(--zk-shadow-chip)', fontFamily: 'inherit',
        transition: 'all .25s ease', ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** چیپ/تگ انتخابی. از state آگاه نیست — active بودن با prop کنترل می‌شود. */
export function Chip({
  active,
  children,
  style,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & Styleable & { active?: boolean; children?: ReactNode }) {
  return (
    <button
      type="button"
      className={`zk-chip${active ? ' is-active' : ''}${className ? ' ' + className : ''}`}
      style={style}
      {...rest}
    >
      {children}
    </button>
  );
}

/** تیتر بخش (همان S.sec) */
export function SectionTitle({
  children,
  style,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div
      className={className}
      style={{
        fontSize: 14.5, fontWeight: 800, color: 'var(--zk-ttl,var(--zk-text))',
        margin: '20px 0 12px', display: 'flex', gap: 8, alignItems: 'center', ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/** خط جداکننده (همان S.div) */
export function Divider({ style, className }: { style?: React.CSSProperties; className?: string }) {
  return (
    <div
      className={className}
      style={{
        height: 1, background: 'linear-gradient(to right,transparent,var(--zk-br),transparent)',
        margin: '18px 0', ...style,
      }}
    />
  );
}

/** Input متنی — همان S.inp. این یک نسخه پایه است؛ در مراحل بعدی
 *  با جایگزینی در صفحات فرم به‌تدریج توسعه خواهد یافت و تا آن زمان DefaultValue+onBlur
 *  پایدار می‌ماند (باید type="text" و ...rest پاس دهد). */
export function TextField({
  style,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & Styleable) {
  return (
    <input
      className={className}
      style={{
        width: '100%', padding: 'var(--zk-space-input, 14px 16px)',
        background: 'var(--zk-inp)', border: 'var(--zk-border-input)',
        borderRadius: 'var(--zk-radius-input, 16px)', minHeight: 50,
        color: 'var(--zk-text)', fontSize: 16, outline: 'none',
        boxSizing: 'border-box', fontFamily: 'inherit',
        boxShadow: 'var(--zk-shadow-input)',
        transition: 'box-shadow .22s ease, border-color .22s ease, transform .1s ease',
        ...style,
      }}
      {...rest}
    />
  );
}

/** Textarea (همان S.ta) */
export function TextArea({
  style,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & Styleable) {
  return (
    <textarea
      className={className}
      style={{
        width: '100%', padding: 'var(--zk-space-input, 14px 16px)',
        background: 'var(--zk-inp)', border: 'var(--zk-border-input)',
        borderRadius: 'var(--zk-radius-input, 16px)', color: 'var(--zk-text)',
        fontSize: 16, outline: 'none', boxSizing: 'border-box',
        minHeight: 120, resize: 'vertical', fontFamily: 'inherit',
        boxShadow: 'var(--zk-shadow-input)',
        transition: 'box-shadow .22s ease, border-color .22s ease',
        ...style,
      }}
      {...rest}
    />
  );
}
