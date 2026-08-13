import {
  getMediaDestinations,
  getMediaItemsForDestination,
  getMediaItemsForDestinations,
  migrateMediaItem,
  pickPlacedMediaCode,
  toEducationMediaItem,
} from '../src/utils/mediaPlacement';

let passed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`FAILED: ${message}`);
  passed++;
}

const oldEducation = { id: 'old', mediaCategory: 'experience', type: 'video', active: true };
assert(
  JSON.stringify(getMediaDestinations(oldEducation, 'education')) === JSON.stringify(['education', 'experience']),
  'legacy single-choice keeps its original education page and selected experience page',
);

const migrated = migrateMediaItem(oldEducation, 'education');
assert(Array.isArray(migrated.mediaCategories), 'migration writes mediaCategories');
assert(migrated.mediaCategory === 'experience', 'migration retains compatible mediaCategory');

const explicitNone = { id: 'none', mediaCategory: 'experience', mediaCategories: [] };
assert(getMediaDestinations(explicitNone, 'education').length === 0, 'explicit empty multi-selection is authoritative');
assert(!('mediaCategory' in migrateMediaItem(explicitNone, 'education')), 'migration removes a stale legacy value when all destinations are unchecked');

const cfg = {
  education: {
    items: [
      { id: 'edu-video', type: 'video', mediaCategories: ['education', 'experience', 'height'], active: true, order: 2 },
      { id: 'hidden', type: 'image', mediaCategories: ['experience'], active: false },
    ],
  },
  experience: {
    items: [{ id: 'exp-audio', type: 'audio', active: true, order: 1 }],
  },
  mediaItems: [
    { id: 'generic-image', type: 'image', categories: ['growth', 'intelligence'], isVisible: true },
    { id: 'generic-hidden', type: 'audio', categories: ['parent-experience'], isVisible: false },
  ],
};

const experience = getMediaItemsForDestination(cfg, 'experience');
assert(experience.map((x) => x.id).join(',') === 'exp-audio,edu-video', 'cross-page education item appears on experience and inactive items stay hidden');
assert(getMediaItemsForDestination(cfg, 'education').map((x) => x.id).join(',') === 'edu-video', 'education destination is resolved');
assert(getMediaItemsForDestination(cfg, 'height').some((x) => x.id === 'generic-image'), 'legacy growth category maps to height');
assert(getMediaItemsForDestination(cfg, 'mind').some((x) => x.id === 'generic-image'), 'legacy intelligence category maps to mind');
assert(getMediaItemsForDestinations(cfg, ['height', 'mind']).filter((x) => x.id === 'generic-image').length === 1, 'multi-destination collection de-duplicates an item');

const dualVideo = { type: 'video', youtubeCode: 'YT', aparatCode: 'AP', displayMode: 'auto' };
assert(pickPlacedMediaCode(dualVideo, true) === 'YT', 'VPN-on education playback picks YouTube');
assert(pickPlacedMediaCode(dualVideo, false) === 'AP', 'VPN-off education playback picks Aparat');
assert(pickPlacedMediaCode({ ...dualVideo, displayMode: 'youtube' }, false) === 'YT', 'explicit YouTube display mode is honored');
const educationMapped = toEducationMediaItem({ ...dualVideo, title: 'T', description: 'D', thumbnail: 'thumb' }, false);
assert(educationMapped.manualCode === 'AP' && educationMapped.desc === 'D' && educationMapped.cover === 'thumb', 'admin media fields map to education player/card fields');

console.log(`media-placement: ${passed} assertions passed`);
