import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseVoiceRecorderReturn {
  state: 'idle' | 'recording' | 'recorded' | 'error';
  startRecording: () => void;
  stopRecording: () => void;
  resetRecording: () => void;
  duration: number;           // ثانیه‌های گذشته
  audioBlob: Blob | null;
  audioUrl: string | null;    // blob URL برای پیش‌نمایش
  error: string | null;
  maxDuration: number;        // ۹۰ ثانیه
}

const MAX_DURATION = 90;

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg'
  ];
  if (typeof MediaRecorder === 'undefined') return '';
  for (const type of types) {
    try {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    } catch {}
  }
  return '';
}

export default function useVoiceRecorder(maxDuration: number = MAX_DURATION): UseVoiceRecorderReturn {
  const [state, setState] = useState<'idle' | 'recording' | 'recorded' | 'error'>('idle');
  const [duration, setDuration] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch {}
        });
      } catch {}
      streamRef.current = null;
    }
  }, []);

  const resetRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // اگر در حال ضبط است، توقف را بدون ایجاد blob انجام بده
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.ondataavailable = null; } catch {}
      try { mediaRecorderRef.current.onstop = null; } catch {}
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    stopStream();
    if (audioUrl) {
      try { URL.revokeObjectURL(audioUrl); } catch {}
    }
    setDuration(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setError(null);
    setState('idle');
  }, [audioUrl, stopStream]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === 'recording') {
      try {
        // درخواست داده نهایی قبل از توقف — برای مرورگرهایی که chunk نهایی را فقط با requestData می‌دهند
        if (typeof rec.requestData === 'function') {
          try { rec.requestData(); } catch {}
        }
      } catch {}
      try { rec.stop(); } catch (e) {
        console.warn('MediaRecorder stop failed', e);
      }
      // استریم را اینجا نمی‌بندیم — onstop خودش بعد از ساخت blob خواهد بست
      // تا داده‌ها از دست نروند
    } else {
      // اگر رکوردر فعال نیست، فقط استریم را ببند
      stopStream();
    }
  }, [stopStream]);

  const startRecording = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('ضبط صدا در این مرورگر یا دستگاه پشتیبانی نمی‌شود.');
      setState('error');
      return;
    }

    try {
      // پاکسازی قبلی
      if (audioUrl) {
        try { URL.revokeObjectURL(audioUrl); } catch {}
      }
      setAudioBlob(null);
      setAudioUrl(null);
      setError(null);
      setDuration(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as any
      });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        // fallback بدون mimeType
        recorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        // حتی اگر size کوچک باشد، نگه می‌داریم — بعداً فیلتر می‌کنیم
        if (e.data) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        try {
          // اگر هیچ chunk نداریم یا همه خالی هستند
          const validChunks = chunksRef.current.filter(c => c && c.size > 0);
          if (validChunks.length === 0) {
            setError('صدایی ضبط نشد. لطفاً دوباره تلاش کنید و مطمئن شوید میکروفون فعال است.');
            setState('error');
            stopStream();
            return;
          }
          // نوع blob را از mimeType انتخاب‌شده یا از اولین chunk بگیر
          const blobType = mimeType || validChunks[0]?.type || 'audio/webm';
          const blob = new Blob(validChunks, { type: blobType });
          
          if (blob.size < 100) { // کمتر از 100 بایت یعنی تقریباً خالی
            setError('فایل صوتی خیلی کوتاه است. لطفاً حداقل ۱ ثانیه صحبت کنید.');
            setState('error');
            stopStream();
            return;
          }

          const url = URL.createObjectURL(blob);
          setAudioBlob(blob);
          setAudioUrl(url);
          setState('recorded');
        } catch (e: any) {
          console.warn('onstop blob creation failed', e);
          setError('خطا در ذخیره صدا. لطفاً دوباره تلاش کنید.');
          setState('error');
        } finally {
          // حالا استریم را ببند
          stopStream();
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      };

      recorder.onerror = (e: any) => {
        console.warn('MediaRecorder error', e);
        setError(e?.error?.message || 'خطا در ضبط صدا');
        setState('error');
        stopStream();
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      // درخواست داده هر 200ms — مقدار بهینه برای حافظه و دقت
      recorder.start(200);
      setState('recording');
      startTimeRef.current = Date.now();

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        if (elapsed >= maxDuration) {
          // زمان به پایان رسید — توقف خودکار
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          const r = mediaRecorderRef.current;
          if (r && r.state === 'recording') {
            try { 
              if (typeof r.requestData === 'function') try { r.requestData(); } catch {}
              r.stop(); 
            } catch {}
          }
          // onstop خودش stopStream را انجام می‌دهد
        } else {
          setDuration(Math.floor(elapsed));
        }
      }, 100);

    } catch (err: any) {
      let msg = 'دسترسی به میکروفون داده نشد یا دستگاه پشتیبانی نمی‌شود.';
      const errName = err?.name || '';
      const errMsg = String(err?.message || '').toLowerCase();
      if (errName === 'NotAllowedError' || errMsg.includes('permission') || errMsg.includes('denied')) {
        msg = 'دسترسی به میکروفون رد شد. لطفاً در تنظیمات مرورگر اجازه میکروفون را فعال کنید.';
      } else if (errName === 'NotFoundError' || errMsg.includes('not found')) {
        msg = 'میکروفونی یافت نشد. لطفاً اتصال میکروفون را بررسی کنید.';
      } else if (errName === 'NotReadableError' || errMsg.includes('readable')) {
        msg = 'میکروفون در حال استفاده توسط برنامه دیگری است.';
      }
      setError(msg);
      setState('error');
      stopStream();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [audioUrl, maxDuration, stopStream]);

  // Cleanup on unmount — بدون وابستگی به audioUrl برای جلوگیری از stale closure
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // در unmount، رکوردر را بی‌صدا متوقف کن
      const rec = mediaRecorderRef.current;
      if (rec && rec.state === 'recording') {
        try { rec.ondataavailable = null; } catch {}
        try { rec.onstop = null; } catch {}
        try { rec.stop(); } catch {}
      }
      if (streamRef.current) {
        try { streamRef.current.getTracks().forEach(t => { try{t.stop()}catch{} }); } catch {}
        streamRef.current = null;
      }
    };
  }, []);

  return {
    state,
    startRecording,
    stopRecording,
    resetRecording,
    duration,
    audioBlob,
    audioUrl,
    error,
    maxDuration,
  };
}
