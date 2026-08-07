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
    'audio/ogg'
  ];
  if (typeof MediaRecorder === 'undefined') return '';
  for (const type of types) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
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
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const resetRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    stopStream();
    if (audioUrl) {
      try { URL.revokeObjectURL(audioUrl); } catch {}
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    stopStream();
  }, [stopStream]);

  const startRecording = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('ضبط صدا در این مرورگر یا دستگاه پشتیبانی نمی‌شود.');
      setState('error');
      return;
    }

    try {
      if (audioUrl) {
        try { URL.revokeObjectURL(audioUrl); } catch {}
      }
      setAudioBlob(null);
      setAudioUrl(null);
      setError(null);
      setDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalType = mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setState('recorded');
        stopStream();
      };

      recorder.onerror = (e: any) => {
        setError(e?.error?.message || 'خطا در ضبط صدا');
        setState('error');
        stopStream();
      };

      recorder.start(250);
      setState('recording');
      startTimeRef.current = Date.now();

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        if (elapsed >= maxDuration) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try { mediaRecorderRef.current.stop(); } catch {}
          }
          stopStream();
        } else {
          setDuration(Math.floor(elapsed));
        }
      }, 100);

    } catch (err: any) {
      setError(err?.message || 'دسترسی به میکروفون داده نشد یا دستگاه پشتیبانی نمی‌شود.');
      setState('error');
      stopStream();
    }
  }, [audioUrl, maxDuration, stopStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      stopStream();
    };
  }, [stopStream]);

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
