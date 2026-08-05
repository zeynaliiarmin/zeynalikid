import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // با اضافه‌شدن react-router-dom (BrowserRouter) و URLهای واقعی مثل /courses،
  // base باید مطلق (/) باشد تا asset ها از هر مسیر عمیق هم درست بارگذاری شوند.
  base: '/',
  plugins: [react()],
  build: {
    minify: 'esbuild',
    sourcemap: false,
    cssMinify: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
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
        },
      },
    },
  },
});
