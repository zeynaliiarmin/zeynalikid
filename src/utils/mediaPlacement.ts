import { extractDirectMediaUrl, normalizeMediaInput } from './mediaInput';

export type MediaDestination = 'education' | 'experience' | 'height' | 'appetite' | 'mind';

export const MEDIA_DESTINATIONS: Array<{ id: MediaDestination; label: string; labelEn: string }> = [
  { id: 'education', label: 'صفحه آموزش‌ها', labelEn: 'Education page' },
  { id: 'experience', label: 'صفحه تجربه والدین', labelEn: 'Parent experiences page' },
  { id: 'height', label: 'بخش دوره‌های رشد قد', labelEn: 'Height-growth courses' },
  { id: 'appetite', label: 'بخش دوره‌های بی‌اشتهایی', labelEn: 'Appetite courses' },
  { id: 'mind', label: 'بخش دوره‌های هوش و ذهن', labelEn: 'Mind and focus courses' },
];

const VALID_DESTINATIONS = new Set<MediaDestination>(MEDIA_DESTINATIONS.map((x) => x.id));

const LEGACY_DESTINATION_MAP: Record<string, MediaDestination> = {
  education: 'education',
  experience: 'experience',
  'parent-experience': 'experience',
  height: 'height',
  growth: 'height',
  appetite: 'appetite',
  mind: 'mind',
  intelligence: 'mind',
};

function asDestination(value: unknown): MediaDestination | null {
  const mapped = LEGACY_DESTINATION_MAP[String(value ?? '').trim()];
  return mapped && VALID_DESTINATIONS.has(mapped) ? mapped : null;
}

function uniqueDestinations(values: unknown[]): MediaDestination[] {
  const out: MediaDestination[] = [];
  for (const value of values) {
    const destination = asDestination(value);
    if (destination && !out.includes(destination)) out.push(destination);
  }
  return out;
}

/**
 * Returns the explicit multi-page destinations for a media item.
 *
 * Backward compatibility:
 * - mediaCategories is the new field and, when present, is authoritative (including []).
 * - mediaCategory is the old single-choice field.
 * - categories is the older generic media manager field.
 * - sourceDestination preserves the page where legacy education/experience items already appeared.
 */
export function getMediaDestinations(item: any, sourceDestination?: MediaDestination): MediaDestination[] {
  if (Array.isArray(item?.mediaCategories)) {
    return uniqueDestinations(item.mediaCategories);
  }

  const legacy: unknown[] = [];
  if (sourceDestination) legacy.push(sourceDestination);
  if (item?.mediaCategory) legacy.push(item.mediaCategory);
  if (Array.isArray(item?.categories)) legacy.push(...item.categories);
  return uniqueDestinations(legacy);
}

export function migrateMediaItem(item: any, sourceDestination: MediaDestination): any {
  const mediaCategories = getMediaDestinations(item, sourceDestination);
  const firstLegacyCategory = mediaCategories.find((x) => x !== sourceDestination) || mediaCategories[0];
  const migrated = { ...item, mediaCategories };
  // Keep the legacy field so older deployed clients continue to understand the item.
  // If every destination was explicitly unchecked, remove the stale single-choice value too.
  if (firstLegacyCategory) migrated.mediaCategory = firstLegacyCategory;
  else delete migrated.mediaCategory;
  return migrated;
}

function flattenGenericMedia(mediaItems: any): any[] {
  if (Array.isArray(mediaItems)) {
    return mediaItems.map((item: any) => ({ ...item, type: item?.type || 'video', _mediaSource: 'generic' }));
  }
  if (!mediaItems || typeof mediaItems !== 'object') return [];
  const groups: Array<[string, string]> = [
    ['videos', 'video'],
    ['audios', 'audio'],
    ['images', 'image'],
    ['texts', 'text'],
  ];
  return groups.flatMap(([key, type]) =>
    (Array.isArray(mediaItems[key]) ? mediaItems[key] : []).map((item: any) => ({
      ...item,
      type: item?.type || type,
      _mediaSource: 'generic',
    })),
  );
}

function destinationMatches(item: any, destination: MediaDestination, source?: MediaDestination): boolean {
  return getMediaDestinations(item, source).includes(destination);
}

/** Collects active media assigned to one public destination, across all compatible storage formats. */
export function getMediaItemsForDestination(cfg: any, destination: MediaDestination): any[] {
  const education = (Array.isArray(cfg?.education?.items) ? cfg.education.items : [])
    .filter((item: any) => destinationMatches(item, destination, 'education'))
    .map((item: any) => ({ ...item, _mediaSource: 'education' }));
  const experience = (Array.isArray(cfg?.experience?.items) ? cfg.experience.items : [])
    .filter((item: any) => destinationMatches(item, destination, 'experience'))
    .map((item: any) => ({ ...item, _mediaSource: 'experience' }));
  const generic = flattenGenericMedia(cfg?.mediaItems)
    .filter((item: any) => destinationMatches(item, destination));

  const seen = new Set<string>();
  return [...education, ...experience, ...generic]
    .filter((item: any) => item?.active !== false && item?.isVisible !== false)
    .filter((item: any, index: number) => {
      const key = `${item?._mediaSource || 'media'}:${String(item?.id || index)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a: any, b: any) => (Number(a?.order) || 0) - (Number(b?.order) || 0));
}

export function getMediaItemsForDestinations(cfg: any, destinations: MediaDestination[]): any[] {
  const seen = new Set<string>();
  return destinations.flatMap((destination) => getMediaItemsForDestination(cfg, destination))
    .filter((item: any, index: number) => {
      const key = `${item?._mediaSource || 'media'}:${String(item?.id || index)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Selects the actual embed/link code while honoring both old and new display-mode values. */
export function pickPlacedMediaCode(item: any, vpnOn: boolean): string {
  const type = item?.type || 'video';
  const mode = String(item?.displayMode || 'auto');
  const manual = String(item?.manualCode || '').trim();
  if (manual) return manual;

  let external = '';
  let internal = '';
  if (type === 'video') {
    external = item?.youtubeCode || item?.youtubeUrl || item?.platforms?.youtube || '';
    internal = item?.aparatCode || item?.aparatUrl || item?.platforms?.aparat || item?.url || '';
  } else if (type === 'image') {
    external = item?.externalCode || item?.platforms?.externalImage || item?.imageUrl || '';
    internal = item?.internalCode || item?.platforms?.internalImage || item?.imageUrl || item?.url || '';
  } else if (type === 'audio') {
    external = item?.externalCode || item?.platforms?.externalAudio || item?.audioUrl || '';
    internal = item?.internalCode || item?.platforms?.internalAudio || item?.audioUrl || item?.url || '';
  }

  if (mode === 'youtube' || mode === 'external') return String(external || internal || '');
  if (mode === 'aparat' || mode === 'internal') return String(internal || external || '');
  if (mode === 'custom') {
    const custom = Array.isArray(item?.platforms?.custom) ? item.platforms.custom : [];
    const match = custom.find((platform: any) => !!platform?.code && (vpnOn || platform?.vpnRequired !== true))
      || custom.find((platform: any) => !!platform?.code);
    if (match?.code) return String(match.code);
  }
  return String(vpnOn ? (external || internal || '') : (internal || external || ''));
}

/** Maps admin media fields to the card/modal field names used by the education page. */
export function toEducationMediaItem(item: any, vpnOn: boolean): any {
  const code = pickPlacedMediaCode(item, vpnOn);
  // پیش‌نمایش کارت باید هم برای لینک مستقیم ImgURL و هم برای <img src="…"> ساخته شود.
  const directImage = item?.type === 'image' ? extractDirectMediaUrl(code, 'image') : '';
  const directCover = extractDirectMediaUrl(item?.cover || item?.thumbnail, 'image');
  const safeCode = item?.type === 'image' ? directImage : code;
  // اگر ویدیو هیچ تصویر بندانگشتی/کاوری نداشته باشد، اولین فریم خودِ ویدیو
  // (یوتیوب/آپارات) به‌عنوان تصویر بندانگشتی کارت استفاده می‌شود (فقط برای کارت، نه پلیر مودال).
  const autoThumb = item?.type === 'video' ? videoAutoThumb(code) : '';
  return {
    ...item,
    title: item?.title || '',
    titleEn: item?.titleEn || item?.title || '',
    desc: item?.desc ?? item?.description ?? '',
    descEn: item?.descEn ?? item?.descriptionEn ?? item?.description ?? '',
    minutes: Number(item?.minutes) || 0,
    date: item?.date || '',
    dateEn: item?.dateEn || item?.date || '',
    cover: directCover || autoThumb || directImage,
    _autoCover: !directCover && !!autoThumb,
    ...(safeCode ? { manualCode: safeCode, url: safeCode } : {}),
  };
}

/** ساخت تصویر بندانگشتی خودکار از کد/لینک ویدیوی یوتیوب یا آپارات (اولین فریم). */
export function videoAutoThumb(code: unknown): string {
  const c = normalizeMediaInput(code);
  if (!c) return '';
  // یوتیوب: watch?v= / embed/ / shorts/ / youtu.be/
  const yt = c.match(/(?:youtube\.com\/(?:watch\?(?:[^#"'\s]*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt?.[1]) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;
  // آپارات: /v/UID یا /video/video/embed/videohash/UID
  const ap = c.match(/aparat\.com\/(?:v\/|video\/video\/embed\/videohash\/)([A-Za-z0-9]+)/);
  if (ap?.[1]) return `https://www.aparat.com/video/video/embed/videohash/${ap[1]}/vt/frame`;
  return '';
}

export const EXPERIENCE_VIDEO_ROTATION_KEY = 'zk_experience_video_rotation_v1';

type RotationStorage = Pick<Storage, 'getItem' | 'setItem'>;
type RotationState = { signature: string; remaining: string[]; lastId: string };

const rotationId = (item:any,index:number) => `${String(item?._mediaSource || 'media')}:${String(item?.id || index)}`;
function shuffled<T>(values:T[],random:()=>number):T[]{
  const out=[...values];
  for(let i=out.length-1;i>0;i--){
    const j=Math.max(0,Math.min(i,Math.floor(random()*(i+1))));
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}

/**
 * Places a different video first on every Experience-page mount.
 * A persisted shuffle bag prevents repeats until all available videos have been first once;
 * at cycle boundaries the previous first video is never selected again when alternatives exist.
 */
export function prioritizeRotatingExperienceVideo(
  items:any[],
  storage?:RotationStorage|null,
  random:()=>number=Math.random,
):any[]{
  const videos=(items||[]).map((item,index)=>({item,id:rotationId(item,index)})).filter(({item})=>(item?.type||'video')==='video');
  if(videos.length<1)return items||[];
  const validIds=videos.map(({id})=>id);
  const signature=[...validIds].sort().join('|');
  let state:RotationState={signature:'',remaining:[],lastId:''};
  try{
    const raw=storage?.getItem(EXPERIENCE_VIDEO_ROTATION_KEY);
    if(raw)state={...state,...JSON.parse(raw)};
  }catch{}

  let remaining=state.signature===signature&&Array.isArray(state.remaining)
    ? state.remaining.filter((id)=>validIds.includes(id))
    : [];
  const lastId=validIds.includes(state.lastId)?state.lastId:'';
  if(!remaining.length){
    remaining=shuffled(validIds,random);
    if(remaining.length>1&&remaining[0]===lastId){
      const swapIndex=remaining.findIndex((id)=>id!==lastId);
      if(swapIndex>0)[remaining[0],remaining[swapIndex]]=[remaining[swapIndex],remaining[0]];
    }
  }
  const selectedId=remaining.shift()||validIds[0];
  try{storage?.setItem(EXPERIENCE_VIDEO_ROTATION_KEY,JSON.stringify({signature,remaining,lastId:selectedId} satisfies RotationState));}catch{}

  const rest=shuffled(validIds.filter((id)=>id!==selectedId),random);
  const rank=new Map([selectedId,...rest].map((id,index)=>[id,index]));
  return (items||[]).map((item,index)=>{
    const id=rotationId(item,index);
    return rank.has(id)?{...item,_experienceRandomRank:rank.get(id)}:item;
  });
}
