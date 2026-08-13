import { useEffect, useState } from 'react';
import { detectVpnOn, forceRedetectVpn } from '../utils/vpn';

/** Resolves the configured media platform mode and refreshes automatic VPN detection. */
export default function useMediaVpn(cfg: any): boolean {
  const [vpnOn, setVpnOn] = useState(false);

  useEffect(() => {
    let alive = true;
    const mode = cfg?.mediaCountryMode || 'auto';
    if (mode === 'iran') {
      setVpnOn(false);
      return;
    }
    if (mode === 'intl') {
      setVpnOn(true);
      return;
    }

    const check = () => {
      detectVpnOn()
        .then((value) => { if (alive) setVpnOn(value); })
        .catch(() => { if (alive) setVpnOn(false); });
    };
    check();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        forceRedetectVpn();
        check();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    const interval = setInterval(() => {
      forceRedetectVpn();
      check();
    }, 3 * 60 * 1000);

    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
    };
  }, [cfg?.mediaCountryMode]);

  return vpnOn;
}
