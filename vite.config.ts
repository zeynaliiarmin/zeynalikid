import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // با اضافه‌شدن react-router-dom (BrowserRouter) و URLهای واقعی مثل /courses،
  // base باید مطلق (/) باشد تا asset ها از هر مسیر عمیق هم درست بارگذاری شوند.
  base: '/',
  plugins: [react()],
  ssr: { noExternal: ['react-helmet-async'] },
  // The local Arena preview is served through a generated public host.
  server: { allowedHosts: true },
  preview: { allowedHosts: true },
  build: {
    minify: 'esbuild',
    esbuild: {
      // Strip console.log/info/debug in production to reduce bundle size and leakage.
      // console.warn and console.error are intentionally kept for production diagnostics.
      drop: ['console.log', 'console.info', 'console.debug'],
    },
    sourcemap: false,
    cssMinify: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // اصلاح چانک-۱: Code Splitting — تفکیک وابستگی‌های بزرگ به فایل‌های جداگانه
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/react-router-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase-vendor';
          }
          if (id.includes('src/locales/')) {
            return 'i18n-locales';
          }
        },
      },
    },
  },
});
