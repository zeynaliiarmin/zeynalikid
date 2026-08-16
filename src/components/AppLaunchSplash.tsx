import { useEffect, useState } from 'react';

export default function AppLaunchSplash({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const show = window.setTimeout(() => setLeaving(true), 620);
    const done = window.setTimeout(() => setReady(true), 850);
    return () => { window.clearTimeout(show); window.clearTimeout(done); };
  }, []);
  return <>
    {!ready && <div className={`zk-launch ${leaving ? 'zk-launch-out' : ''}`} dir="rtl" aria-label="زینالیکید">
      <div className="zk-launch-blob zk-launch-blob-a" /><div className="zk-launch-blob zk-launch-blob-b" />
      <div className="zk-launch-dots" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
      <main className="zk-launch-card">
        <div className="zk-launch-icon"><img src="/icons/icon-512.png" alt="زینالیکید" /></div>
        <div className="zk-launch-line" />
        <h1>زینالیکید</h1>
        <p>همراهی والدین در مسیر رشد و تغذیه کودک</p>
        <div className="zk-launch-loader"><span /></div>
      </main>
      <small>با آرامش، قدم‌به‌قدم کنار شما هستیم</small>
    </div>}
    {children}
  </>;
}
