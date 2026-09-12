// tests/phone-normalization.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// دو خواستهٔ محصول که اینجا قفل می‌شوند:
//   ۱) همهٔ قالب‌های یک شمارهٔ تماس (برای همهٔ کشورها) به یک مقدار یکسان برسند،
//      هم در کلاینت و هم در سرور — و این دو پیاده‌سازی از هم واگرا نشوند.
//   ۲) «یک کد پیگیری برای هر شماره — برای همیشه»: فرم بعدیِ همان شماره کد تازه
//      نگیرد و هرگز با خطای یکتایی رد نشود.
// ─────────────────────────────────────────────────────────────────────────────

import {
  COUNTRY_RULES as CLIENT_RULES,
  PHONE_RULES_VERSION as CLIENT_VERSION,
  fullPhone,
  normalizeFullPhone as clientNormalize,
  validPhone,
} from '../src/utils/phone';
import {
  COUNTRY_RULES as SERVER_RULES,
  PHONE_RULES_VERSION as SERVER_VERSION,
  normalizeFullPhone as serverNormalize,
} from '../supabase/functions/_shared/phone.ts';
import { getOrCreateTrackingCode, randomTrackingCode } from '../supabase/functions/_shared/trackingCode.ts';

let passed = 0;
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed++;
};
const eq = (actual: unknown, expected: unknown, message: string) =>
  assert(actual === expected, `${message} — انتظار «${expected}» بود ولی «${actual}» شد`);

// ─── ۱) مثال‌های خود مالک: همهٔ این قالب‌ها یک شماره‌اند ───
const IRAN_VARIANTS = ['09198305774', '9198305774', '989198305774', '+9809198305774', '+989198305774'];
for (const v of IRAN_VARIANTS) {
  eq(serverNormalize(v), '+989198305774', `سرور: «${v}» باید به +989198305774 برسد`);
  eq(clientNormalize(v, '+98'), '+989198305774', `کلاینت: «${v}» باید به +989198305774 برسد`);
}
// رقم فارسی و فاصله/خط تیره هم همان نتیجه را بدهند
eq(serverNormalize('۰۹۱۹ ۸۳۰ ۵۷۷۴'), '+989198305774', 'رقم فارسی و فاصله باید یکسان شود');
eq(serverNormalize('0098 919-830-5774'), '+989198305774', 'پیش‌شمارهٔ ۰۰ باید حذف شود');

// ─── ۲) بقیهٔ کشورها: کد کشور اشتباه ساخته نشود ───
eq(serverNormalize('004915123456789'), '+4915123456789', '۰۰۴۹… باید آلمان بماند (باگ قدیمی: +98049151…)');
eq(serverNormalize('+4915123456789'), '+4915123456789', '+۴۹… باید آلمان بماند');
eq(serverNormalize('00447700900000'), '+447700900000', '۰۰۴۴… باید انگلیس بماند');
eq(serverNormalize('+971501234567'), '+971501234567', '+۹۷۱… باید امارات بماند');
eq(clientNormalize('030123456', '+49'), '+4930123456', 'شمارهٔ داخلی آلمان با پیش‌شمارهٔ ۰');
eq(clientNormalize('07700900000', '+44'), '+447700900000', 'شمارهٔ داخلی انگلیس با پیش‌شمارهٔ ۰');
eq(clientNormalize('41234567', '+47'), '+4741234567', 'نروژ پیش‌شمارهٔ داخلی ندارد');
eq(clientNormalize('9876543210', '+91'), '+919876543210', 'شمارهٔ داخلی هند');
// کشور «سایر»: رقم‌ها دست‌نخورده بمانند و کشور اشتباه ساخته نشود
eq(clientNormalize('0039123456789', '+'), '+39123456789', 'کشور «سایر» با ۰۰ باید ایتالیا بماند');
eq(serverNormalize('+39123456789'), '+39123456789', 'کد کشور اعلام‌شده با + دست‌نخورده می‌ماند');

// ─── ۳) ورودی نامعتبر ───
eq(serverNormalize('12345'), '', 'کمتر از ۷ رقم → رشتهٔ خالی');
eq(serverNormalize(''), '', 'ورودی خالی → رشتهٔ خالی');
eq(serverNormalize(null), '', 'ورودی null → رشتهٔ خالی');

// ─── ۴) واگرایی کلاینت/سرور: جدول قواعد و نسخه یکسان ───
eq(CLIENT_VERSION, SERVER_VERSION, 'نسخهٔ قواعد کشورها در کلاینت و سرور یکی نیست');
eq(JSON.stringify(CLIENT_RULES), JSON.stringify(SERVER_RULES), 'جدول قواعد کشورها در کلاینت و سرور یکی نیست');
const PARITY_MATRIX: Array<[string, string | undefined]> = [
  ['09198305774', '+98'], ['9198305774', '+98'], ['+9809198305774', '+98'], ['00989198305774', '+98'],
  ['09123456789', undefined], ['989123456789', undefined], ['004915123456789', undefined],
  ['030123456', '+49'], ['07700900000', '+44'], ['41234567', '+47'], ['2125550123', '+1'],
  ['0501234567', '+971'], ['9876543210', '+91'], ['0701234567', '+93'], ['0612345678', '+31'],
  ['0039123456789', '+'], ['+39123456789', undefined], ['12345', '+98'], ['', undefined],
];
for (const [value, cc] of PARITY_MATRIX) {
  eq(clientNormalize(value, cc), serverNormalize(value, cc), `واگرایی کلاینت/سرور برای «${value}» با کد «${cc}»`);
}

// ─── ۵) fullPhone (فرم‌ها) و validPhone ───
eq(fullPhone('+98', '09123456789'), '+989123456789', 'fullPhone ایران با ۰');
eq(fullPhone('+98', '9123456789'), '+989123456789', 'fullPhone ایران بدون ۰');
eq(fullPhone('+98', '+9809198305774'), '+989198305774', 'fullPhone با کد کشور تایپ‌شدهٔ اضافه');
eq(fullPhone('+1', '5551234567'), '+15551234567', 'fullPhone آمریکا');
eq(validPhone('09198305774', { code: '+98' }), true, 'validPhone ایران معتبر');
eq(validPhone('+9809198305774', { code: '+98' }), true, 'validPhone با کد کشورِ تایپ‌شده هم معتبر است');
eq(validPhone('09111111111', { code: '+98' }), false, 'validPhone رقم تکراری رد شود');
eq(validPhone('0912345678', { code: '+98' }), false, 'validPhone کم‌رقم رد شود');
eq(validPhone('091234567890', { code: '+98' }), false, 'validPhone زیادرقم رد شود');

// ─── ۶) کد پیگیری: یک کد برای هر شماره، برای همیشه ───
const CODE_RE = /^ZK-[1-9][a-z0-9]{6,8}$/;
const c1 = randomTrackingCode('ZK');
assert(CODE_RE.test(c1), `قالب کد تصادفی نامعتبر است: ${c1}`);
assert(randomTrackingCode('FM').startsWith('FM-'), 'پیشوند FM باید حفظ شود');
assert(randomTrackingCode('ZK') !== randomTrackingCode('ZK'), 'دو کد تصادفی پشت‌سرهم نباید یکی باشند');

type Mapping = { full_phone: string; tracking_code: string };
type SubRow = { full_phone?: string; payload?: any; tracking_code?: string | null; created_at?: string };

/** سوپابیس جعلی با همان سطح API که ماژول مشترک استفاده می‌کند */
function fakeSupabase(opts: {
  mappings?: Mapping[];
  submissions?: SubRow[];
  missingMappingTable?: boolean;
}) {
  const mappings: Mapping[] = [...(opts.mappings || [])];
  const submissions: SubRow[] = [...(opts.submissions || [])];
  const log: string[] = [];

  const valueOf = (row: any, col: string) => {
    if (col === 'payload->>type') return row?.payload?.type;
    return row?.[col];
  };
  const project = (row: any, cols: string) => {
    if (cols === 'payload') return { payload: row.payload };
    if (cols === 'tracking_code') return { tracking_code: row.tracking_code };
    if (cols === 'payload->code') return { code: row.payload?.code };
    return row;
  };

  const makeBuilder = (table: string) => {
    const b: any = {
      _cols: '*',
      _filters: [] as Array<(r: any) => boolean>,
      _limit: 0,
      _asc: false,
      select(cols?: string) { b._cols = cols || '*'; return b; },
      eq(col: string, val: any) { b._filters.push((r: any) => valueOf(r, col) === val); return b; },
      not(col: string, _op: string, val: any) { b._filters.push((r: any) => valueOf(r, col) !== val); return b; },
      order(_col: string, o?: any) { b._asc = !!o?.ascending; return b; },
      limit(n: number) { b._limit = n; return b; },
      _run() {
        let rows: any[] = (table === 'phone_tracking_codes' ? mappings : submissions).slice();
        for (const f of b._filters) rows = rows.filter(f);
        rows.sort((x, y) => (String(x.created_at) < String(y.created_at) ? (b._asc ? -1 : 1) : b._asc ? 1 : -1));
        if (b._limit) rows = rows.slice(0, b._limit);
        return { data: rows.map((r) => project(r, b._cols)), error: null };
      },
      then(resolve: (v: any) => void) { resolve(b._run()); },
      async maybeSingle() {
        const r = b._run();
        return { data: r.data[0] || null, error: r.error };
      },
    };
    return b;
  };

  return {
    log,
    mappings,
    from(table: string) {
      if (table === 'phone_tracking_codes' && opts.missingMappingTable) {
        const msg = 'relation "public.phone_tracking_codes" does not exist';
        const b: any = {
          select() { return b; }, eq() { return b; }, not() { return b; }, order() { return b; }, limit() { return b; },
          insert() { return b; },
          then(resolve: (v: any) => void) { resolve({ data: null, error: { code: '42P01', message: msg } }); },
          async maybeSingle() { return { data: null, error: { code: '42P01', message: msg } }; },
        };
        return b;
      }
      const b = makeBuilder(table);
      const original = b;
      original.insert = (row: Mapping) => {
        const result = {
          then(resolve: (v: any) => void) {
            const phoneTaken = mappings.find((m) => m.full_phone === row.full_phone);
            const codeTaken = mappings.find((m) => m.tracking_code === row.tracking_code);
            if (phoneTaken || codeTaken) {
              resolve({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } });
              return;
            }
            mappings.push(row);
            resolve({ data: null, error: null });
          },
        };
        return result;
      };
      return original;
    },
  };
}

const PHONE = '+989198305774';

// ۶-۱) نگاشت رسمی وجود دارد → همان کد برمی‌گردد و کد تازه ساخته نمی‌شود
{
  const db = fakeSupabase({ mappings: [{ full_phone: PHONE, tracking_code: 'ZK-1aaaaaa' }] });
  eq(await getOrCreateTrackingCode(db as any, PHONE, 'ZK'), 'ZK-1aaaaaa', 'کد رسمی از جدول نگاشت خوانده شود');
  eq(db.mappings.length, 1, 'نباید نگاشت تکراری ساخته شود');
}

// ۶-۲) نگاشت نیست ولی شماره سابقه دارد → همان کد به ارث می‌رسد و ثبت می‌شود
{
  const db = fakeSupabase({ submissions: [{ full_phone: PHONE, payload: { trackingCode: 'ZK-2bbbbbb' }, created_at: '2026-09-01' }] });
  eq(await getOrCreateTrackingCode(db as any, PHONE, 'ZK'), 'ZK-2bbbbbb', 'کد موجودِ شماره به ارث برسد');
  eq(db.mappings[0]?.tracking_code, 'ZK-2bbbbbb', 'کد ارثی باید در نگاشت ثبت شود');
}

// ۶-۳) حساب کاربر پنل (payload.code) هم کد رسمی همان شماره است
{
  const db = fakeSupabase({
    submissions: [
      { full_phone: PHONE, payload: { type: 'user', code: 'ZK-3cccccc' }, created_at: '2026-09-01' },
      { full_phone: PHONE, payload: { type: 'consultation', trackingCode: 'ZK-9zzzzzz' }, created_at: '2026-09-05' },
    ],
  });
  eq(await getOrCreateTrackingCode(db as any, PHONE, 'ZK'), 'ZK-3cccccc', 'قدیمی‌ترین کد (کد حساب کاربر) برنده است');
}

// ۶-۴) شمارهٔ کاملاً تازه → کد یکتا ساخته و ثبت می‌شود
{
  const db = fakeSupabase({});
  const code = await getOrCreateTrackingCode(db as any, PHONE, 'ZK');
  assert(CODE_RE.test(code), `کد ساخته‌شده قالب درست ندارد: ${code}`);
  eq(db.mappings[0]?.full_phone, PHONE, 'کد تازه باید برای همان شماره ثبت شود');
  // فرم بعدیِ همان شماره همان کد را می‌گیرد
  eq(await getOrCreateTrackingCode(db as any, PHONE, 'ZK'), code, 'فرم دوم همان شماره باید همان کد را بگیرد');
}

// ۶-۵) رقابت هم‌زمان: اگر شماره در فاصلهٔ خواندن کد گرفته باشد، کد برنده برگردد
{
  const db = fakeSupabase({});
  const originalInsert = db.from.bind(db);
  let injected = false;
  db.from = ((table: string) => {
    const b = originalInsert(table);
    if (table === 'phone_tracking_codes' && !injected) {
      const insert = b.insert.bind(b);
      b.insert = (row: Mapping) => {
        if (!injected) {
          injected = true;
          db.mappings.push({ full_phone: PHONE, tracking_code: 'ZK-4dddddd' });
        }
        return insert(row);
      };
    }
    return b;
  }) as any;
  eq(await getOrCreateTrackingCode(db as any, PHONE, 'ZK'), 'ZK-4dddddd', 'در رقابت هم‌زمان، کد ثبت‌شده برنده است');
}

// ۶-۶) جدول نگاشت ساخته نشده (پروژهٔ مهاجرت‌نکرده) → رفتار سازگار، بدون شکست
{
  const db = fakeSupabase({
    missingMappingTable: true,
    submissions: [{ full_phone: PHONE, payload: { trackingCode: 'ZK-5eeeeee' }, created_at: '2026-09-01' }],
  });
  eq(await getOrCreateTrackingCode(db as any, PHONE, 'ZK'), 'ZK-5eeeeee', 'بدون جدول نگاشت هم کد موجود به ارث برسد');
}
{
  const db = fakeSupabase({
    missingMappingTable: true,
    submissions: [
      { full_phone: '+989000000001', payload: { trackingCode: 'ZK-6ffffff' }, created_at: '2026-09-01' },
    ],
  });
  const code = await getOrCreateTrackingCode(db as any, PHONE, 'ZK');
  assert(CODE_RE.test(code), `کد مسیر سازگار قالب درست ندارد: ${code}`);
  assert(code !== 'ZK-6ffffff', 'کد شمارهٔ دیگر نباید دوباره صادر شود');
}

console.log(`✅ phone-normalization: ${passed} assertion(s) passed`);
