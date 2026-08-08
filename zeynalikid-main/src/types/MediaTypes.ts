// اصلاح ۳۷: تعریف انواع محتوای چندرسانه‌ای با پلتفرم‌های مجزا

export type MediaDisplayMode = 'aparat' | 'youtube' | 'auto';
export type MediaCategory = 'experience' | 'height' | 'appetite' | 'mind';

export interface MediaItemBase {
  id: string;
  title?: string;
  description?: string;
  descriptionCourses?: string;
  active?: boolean;
  order?: number;
  phone?: string;
  thumbnail?: string;
  tags?: string[];
  displayMode?: MediaDisplayMode;
  mediaCategory?: MediaCategory;
}

export interface VideoItem extends MediaItemBase {
  type: 'video';
  youtubeCode?: string;    // کد دستی یوتیوب (VPN روشن)
  aparatCode?: string;     // کد دستی آپارات (VPN خاموش)
  // backward compat
  youtubeUrl?: string;
  aparatUrl?: string;
  url?: string;
  manualCode?: string;
}

export interface AudioItem extends MediaItemBase {
  type: 'audio';
  externalCode?: string;   // کد دستی صوتی خارجی (VPN روشن)
  internalCode?: string;   // کد دستی صوتی داخلی (VPN خاموش)
  youtubeUrl?: string;
  aparatUrl?: string;
  url?: string;
  manualCode?: string;
}

export interface ImageItem extends MediaItemBase {
  type: 'image';
  externalCode?: string;   // کد دستی تصویر خارجی (VPN روشن)
  internalCode?: string;   // کد دستی تصویر داخلی (VPN خاموش)
  youtubeUrl?: string;
  aparatUrl?: string;
  url?: string;
  manualCode?: string;
}

export interface TextItem extends MediaItemBase {
  type: 'text';
  body?: string;
}

export type MediaItem = VideoItem | AudioItem | ImageItem | TextItem;
