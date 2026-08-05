import React, { useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface ImageUploaderProps {
  currentImage: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
  defaultImage?: string;
  label?: string;
  T: any;
  S: any;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  currentImage,
  onUpload,
  onRemove,
  defaultImage = '/images/hero-default.jpg',
  label = 'تصویر',
  T,
  S,
}) => {
  const [uploading, setUploading] = useState(false);

  const compressImage = (file: File, maxSizeKB: number = 500): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          // Resize if too large
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width *= ratio;
            height *= ratio;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Try reducing quality until under max size
            let quality = 0.85;
            let blob: Blob | null = null;
            while (quality > 0.1) {
              blob = (() => {
                let result: Blob | null = null;
                canvas.toBlob((b) => { result = b; }, 'image/jpeg', quality);
                return result;
              })();
              // For synchronous approach, just use current quality
              break;
            }
            canvas.toBlob((b) => {
              if (b) resolve(b);
              else resolve(file);
            }, 'image/jpeg', quality);
          } else {
            resolve(file);
          }
        };
        img.src = e.target?.result as string || '';
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('لطفاً فقط فایل تصویری (JPG, PNG, WebP) انتخاب کنید.');
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      alert('حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.');
      return;
    }

    setUploading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        // Upload to Supabase Storage
        
        // Compress image first
        const compressedBlob = await compressImage(file, 500);
        
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `images/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('media')
          .upload(fileName, compressedBlob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (error) {
          console.error('Upload error:', error);
          alert('خطا در آپلود تصویر: ' + error.message);
          setUploading(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(data.path);

        onUpload(urlData.publicUrl);
      } else {
        // Fallback: convert to data URL
        const reader = new FileReader();
        reader.onload = (e) => {
          onUpload(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('خطا در آپلود تصویر. لطفاً مجدداً تلاش کنید.');
    }

    setUploading(false);
    // Reset input value
    e.target.value = '';
  };

  const handleRemove = async () => {
    // If it's a Supabase URL, try to delete the file
    if (isSupabaseConfigured && supabase && currentImage && currentImage.includes('storage')) {
      try {
        // Extract path from URL
        const urlParts = currentImage.split('/storage/v1/object/public/media/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('media').remove([filePath]);
        }
      } catch (e) {
        console.warn('Could not delete file from storage:', e);
      }
    }
    onRemove();
  };

  return (
    <div className="image-uploader" style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.mut, marginBottom: 6 }}>{label}</div>
      {currentImage && (
        <div style={{ marginBottom: 8 }}>
          <img
            src={currentImage}
            alt={label}
            style={{
              maxWidth: 200,
              maxHeight: 120,
              objectFit: 'cover',
              borderRadius: 10,
              border: `1px solid ${T.brd}`,
              display: 'block',
            }}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== defaultImage) {
                target.src = defaultImage;
              }
            }}
          />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          disabled={uploading}
          style={{
            ...S.inp,
            padding: '8px',
            fontSize: 12,
            flex: '1 1 auto',
            minWidth: 150,
          }}
        />
        {uploading && (
          <span style={{ fontSize: 11, color: T.acc, fontWeight: 700 }}>
            در حال آپلود...
          </span>
        )}
      </div>
      {currentImage && currentImage !== defaultImage && (
        <button
          onClick={handleRemove}
          type="button"
          disabled={uploading}
          style={{
            marginTop: 6,
            padding: '6px 12px',
            borderRadius: 8,
            border: `1px solid ${T.err}`,
            background: `${T.err}10`,
            color: T.err,
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: 'inherit',
          }}
        >
          حذف تصویر و بازگشت به پیش‌فرض
        </button>
      )}
    </div>
  );
};

export default ImageUploader;
