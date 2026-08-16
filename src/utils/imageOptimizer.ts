let _webpSupported: boolean | null = null;

export const supportsWebP = (): boolean => {
  if (_webpSupported !== null) return _webpSupported;
  try {
    if (typeof document === 'undefined') {
      _webpSupported = false;
      return false;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const data = canvas.toDataURL('image/webp');
    _webpSupported = data.startsWith('data:image/webp');
  } catch {
    _webpSupported = false;
  }
  return _webpSupported;
};

export interface OptimizeOptions {
  maxLongSide?: number;
  quality?: number;
}

const resizeIfNeeded = async (
  bitmap: ImageBitmap | HTMLImageElement,
  maxLongSide: number
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> => {
  const w = bitmap.width;
  const h = bitmap.height;
  let newW = w;
  let newH = h;
  if (w > maxLongSide || h > maxLongSide) {
    const aspect = w / h;
    if (w > h) {
      newW = maxLongSide;
      newH = Math.round(maxLongSide / aspect);
    } else {
      newH = maxLongSide;
      newW = Math.round(maxLongSide * aspect);
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(bitmap, 0, 0, newW, newH);
  }
  return { canvas, width: newW, height: newH };
};

const loadImageBitmapSafe = async (file: File): Promise<ImageBitmap | HTMLImageElement> => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {}
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
};

const optimizeInternal = async (
  file: File,
  options?: OptimizeOptions
): Promise<File> => {
  const maxLongSide = options?.maxLongSide ?? 1920;
  const quality = options?.quality ?? 0.8;

  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic|heif|gif|svg)$/i.test(file.name);
  if (!isImage) return file;

  // pass SVG, GIF, WebP unchanged
  if (
    file.type === 'image/svg+xml' ||
    file.type === 'image/gif' ||
    file.type === 'image/webp' ||
    /\.(svg|gif|webp)$/i.test(file.name)
  ) {
    return file;
  }

  try {
    const bitmap = await loadImageBitmapSafe(file);
    const { canvas } = await resizeIfNeeded(bitmap, maxLongSide);
    if ('close' in bitmap && typeof bitmap.close === 'function') {
      try { bitmap.close(); } catch {}
    }

    const useWebP = supportsWebP();
    const targetType = useWebP ? 'image/webp' : file.type || 'image/jpeg';
    const targetExt = useWebP ? '.webp' : /\.[^/.]+$/.test(file.name) ? '' : '.jpg';

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), targetType, quality);
    });

    if (!blob) return file;

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const newName = useWebP ? `${baseName}.webp` : `${file.name}${targetExt}`;

    return new File([blob], newName, {
      type: targetType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
};

export const optimizeForUpload = async (
  file: File,
  options?: OptimizeOptions
): Promise<File> => {
  try {
    return await Promise.race([
      optimizeInternal(file, options),
      new Promise<File>((resolve) => {
        setTimeout(() => resolve(file), 3000);
      }),
    ]);
  } catch {
    return file;
  }
};
