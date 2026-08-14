import {
  detectReviewCountryCode,
  formatPersianReviewDate,
  isValidReviewPhone,
  manualMaskedPhoneTemplate,
  maskReviewPhone,
  normalizeReviewPhone,
  persianReviewDateToIso,
  sanitizeManualMaskedPhone,
} from '../src/utils/reviewPresentation';
import { defaultCountries } from '../src/config/defaultSettings';

let passed = 0;
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
};
const countries = defaultCountries as any[];

assert(maskReviewPhone('+989193123469', '+98') === '09193xxxx69', 'Iran phone uses requested public mask');
assert(maskReviewPhone('+12127912384', '+1') === '12127xxxx84', 'international phone uses requested public mask');
assert(maskReviewPhone('09193xxxx69', '+98') === '09193xxxx69', 'already-masked manual phone stays masked');
assert(detectReviewCountryCode('+12125550123', countries) === '+1', 'US/Canada dial code is detected');
assert(detectReviewCountryCode('00447700900000', countries) === '+44', '00-form UK dial code is detected');
assert(detectReviewCountryCode('09193123469', countries) === '+98', 'Iran local number is detected');
assert(normalizeReviewPhone('09193123469', '+98') === '+989193123469', 'Iran phone is stored canonically');
assert(isValidReviewPhone('+12125550123', '+1'), 'international full phone validates');
assert(manualMaskedPhoneTemplate('+98').match(/^\d{5}x{4}\d{2}$/), 'manual Iran template has one masked field');
assert(sanitizeManualMaskedPhone('0919369') === '09193xxxx69', 'seven entered digits become the requested manual mask');
const iso = persianReviewDateToIso('1404/01/01');
assert(!!iso && iso.startsWith('2025-03-21'), 'Persian date converts to the correct Gregorian instant');
assert(formatPersianReviewDate(iso || '', false).replace(/\u200e/g, '') === '1404/01/01', 'stored instant renders as Persian date');

console.log(`review-presentation: ${passed} assertions passed`);
