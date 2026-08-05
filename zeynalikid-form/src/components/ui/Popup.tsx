import type { ReactNode } from 'react';

export type PopupProps = {
  open: boolean;
  children: ReactNode;
};

export default function Popup({ open, children }: PopupProps) {
  if (!open) return null;
  return <>{children}</>;
}
