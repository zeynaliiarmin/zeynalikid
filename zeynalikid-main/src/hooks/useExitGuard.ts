import { useEffect } from 'react';

export default function useExitGuard(isDirty: boolean, message?: string) {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      const msg =
        message ||
        'اطلاعات واردشده ذخیره نشده است. آیا مطمئنید؟ / You have unsaved changes. Are you sure?';
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    };

    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
    };
  }, [isDirty, message]);
}
