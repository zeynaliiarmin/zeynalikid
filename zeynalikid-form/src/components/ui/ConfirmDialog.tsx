import type { ReactNode } from 'react';

export type ConfirmDialogProps = {
  open?: boolean;
  children?: ReactNode;
};

export default function ConfirmDialog({ open = false, children }: ConfirmDialogProps) {
  if (!open) return null;
  return <>{children}</>;
}
