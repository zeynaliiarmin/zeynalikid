import {
  AMIYANE_GUIDE,
  POLICY_RULES,
  POLICY_VERSION,
  policySummary,
  scanContentPolicy,
} from '../supabase/functions/_shared/contentPolicy.ts';

/**
 * قانون نگارش «ه» (طراحی مالک، ۱۴۰۵-۰۶-۲۰):
 * همزه روی حرف «ه» در محتوای تولیدشده توسط ایجنت ممنوع است؛ فقط «ه» یا «ه‌ی» با نیم‌فاصله.
 * این قانون جایگزین آن بررسی ایستا شد که کل سورس track‌شده را اسکن می‌کرد و CI را قرمز می‌کرد؛
 * حالا همان قانون در لایه‌ی اجباری content-api نشسته و ایجنت آن را با get_policy می‌بیند.
 */

const expect = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const HEH_HAMZA = '\u0647\u0654'; // ه + همزه بالای آن (ممنوع)
const HEH_PRECOMPOSED = '\u06c0'; // نویسه‌ی آماده (ممنوع)
const HEH_YA = '\u0647\u200c\u06cc'; // ه‌ی با نیم‌فاصله (مجاز)

const rulesOf = (violations: { rule: string }[]) => violations.map((v) => v.rule);

const tests: [string, () => void][] = [];
const test = (name: string, run: () => void) => tests.push([name, run]);

test('composed heh + hamza above is rejected with a self-explanatory violation', () => {
  const violations = scanContentPolicy({ title: `نقشه${HEH_HAMZA} اتصال دوره` });
  expect(rulesOf(violations).includes('no_heh_hamza'), 'composed heh+hamza was accepted');
  const hit = violations.find((v) => v.rule === 'no_heh_hamza');
  expect(!!hit, 'no_heh_hamza violation missing');
  expect(hit!.message.includes('U+0647'), 'violation message does not name the forbidden codepoint');
  expect(hit!.message.includes(HEH_YA), 'violation message does not offer the allowed replacement');
  expect(hit!.excerpt.length > 0, 'violation carries no excerpt for debugging');
});

test('precomposed U+06C0 is rejected too', () => {
  const violations = scanContentPolicy({ body: `اینجا نقشه${HEH_PRECOMPOSED} رشد بچه را می‌بینی` });
  expect(rulesOf(violations).includes('no_heh_hamza'), 'precomposed U+06C0 was accepted');
});

test('the rule also scans strings passed outside the body', () => {
  const violations = scanContentPolicy({}, [`درباره${HEH_HAMZA} ما`]);
  expect(rulesOf(violations).includes('no_heh_hamza'), 'extraStrings were not scanned');
});

test('allowed heh forms pass the heh rule', () => {
  const violations = scanContentPolicy({
    title: `نقشه${HEH_YA} اتصال`,
    body: `بچه‌ها با هم بازی میکنن، خوب میخوابن و نقشه${''} رشدشون روشن می‌مونه.`,
  });
  expect(!rulesOf(violations).includes('no_heh_hamza'), 'compliant heh text was flagged');
});

test('the rule is published to agents through get_policy', () => {
  expect(POLICY_VERSION >= 4, `POLICY_VERSION was not bumped for the new rule (got ${POLICY_VERSION})`);
  expect(POLICY_RULES.some((r) => r.rule === 'no_heh_hamza'), 'no_heh_hamza is not in POLICY_RULES');

  const summary = policySummary();
  expect(
    summary.rules.some((r) => r.id === 'no_heh_hamza'),
    'policy summary does not expose no_heh_hamza to agents',
  );

  const charRules = AMIYANE_GUIDE.char_rules_fa.join('\n');
  expect(charRules.includes('قاعده ۸'), 'the heh rule is missing from char_rules_fa');
  expect(charRules.includes('U+0654'), 'char rule does not name the forbidden codepoint');

  const prohibitions = AMIYANE_GUIDE.prohibitions_fa.join('\n');
  expect(prohibitions.includes('همزه روی «ه»'), 'the heh prohibition is missing from prohibitions_fa');
});

for (const [name, run] of tests) {
  run();
  console.log(`✓ ${name}`);
}
console.log('Persian heh typography policy contracts passed.');
