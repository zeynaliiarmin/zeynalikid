// هوک مدیریت هشدار خطا — به bus رویداد گوش می‌دهد و آخرین هشدار را نگه می‌دارد.
// فقط نمایشی است؛ هیچ تأثیری بر جریان ثبت اطلاعات یا localStorage ندارد.
import { useEffect, useState } from 'react';
import { subscribeErrorAlerts, type ErrorAlertPayload } from '../utils/errorAlertBus';

export function useErrorHandler() {
  const [alert, setAlert] = useState<ErrorAlertPayload | null>(null);

  useEffect(() => {
    const unsub = subscribeErrorAlerts((payload) => setAlert(payload));
    return unsub;
  }, []);

  const dismiss = () => setAlert(null);

  return { alert, dismiss };
}
