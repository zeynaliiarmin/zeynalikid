import {
  needsOwnerReviewForAnswer,
  prepareOwnerReviewedUnansweredDraft,
} from '../supabase/functions/_shared/assistantCuration.ts';

const expect = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

function reviewDb() {
  const unanswered = [
    { id: 1, question: 'هزینه مشاوره چقدر است؟', occurrences: 2, status: 'pending' },
    { id: 2, question: 'هزینه مشاوره چنده؟', occurrences: 3, status: 'pending' },
  ];
  const clusters = [
    {
      representative_question: 'هزینه مشاوره چقدر است؟',
      sample_questions: ['هزینه مشاوره چنده؟'],
      occurrence_count: 5,
      last_answer: 'برای اطلاع از هزینه، درخواست مشاوره را ثبت کنید.',
      last_model: 'mistral-small-latest',
    },
    {
      representative_question: 'درمان سرطان کودک چیست؟',
      sample_questions: [],
      occurrence_count: 1,
      last_answer: 'برای درمان سرطان کودک باید با پزشک متخصص صحبت کنید.',
      last_model: 'mistral-small-latest',
    },
  ];
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        order: () => chain,
        range: () => ({ data: unanswered, error: null }),
        limit: () => ({ data: table === 'assistant_question_clusters' ? clusters : unanswered, error: null }),
      };
      return chain;
    },
  };
}

const tests: Array<[string, () => void | Promise<void>]> = [];
const test = (name: string, fn: () => void | Promise<void>) => tests.push([name, fn]);

test('generic and low-confidence answers enter owner review, while trusted answers do not', () => {
  for (const answer of [
    'اطلاعات تأییدشده‌ای درباره این موضوع ندارم.',
    'اطلاعات عمومی بیشتری درباره ایشون ثبت نشده.',
    'ایشون رو نمیشناسم و اطلاعات تأییدشده‌ای درباره‌شون ندارم.',
    'I do not have enough approved information about that.',
  ]) {
    const generic = needsOwnerReviewForAnswer({ answer, fallback: '', model: 'mistral-small-latest', confidence: 0.9 });
    expect(generic.needs_review && generic.reason === 'generic_answer', `generic fallback was not queued: ${answer}`);
  }

  const low = needsOwnerReviewForAnswer({
    answer: 'پاسخی با منبع ناکافی', fallback: '', model: 'mistral-small-latest', confidence: 0.4,
  });
  expect(low.needs_review && low.reason === 'low_confidence', 'low-confidence result was not queued');

  const trusted = needsOwnerReviewForAnswer({
    answer: 'پاسخ تأییدشده', fallback: '', model: 'mistral-small-latest', confidence: 0.9,
  });
  expect(!trusted.needs_review, 'trusted result was incorrectly queued');
});

test('review draft groups close wording and remains non-publishing even with a suggestion', async () => {
  const draft = await prepareOwnerReviewedUnansweredDraft(reviewDb(), {
    id: 1, question: 'هزینه مشاوره چقدر است؟', occurrences: 2, status: 'pending',
  });
  expect(draft.aliases.includes('هزینه مشاوره چنده؟'), 'similar unanswered wording was not grouped');
  expect(draft.grouped_occurrences === 5, `expected grouped count 5, got ${draft.grouped_occurrences}`);
  expect(draft.suggested_answer === 'برای اطلاع از هزینه، درخواست مشاوره را ثبت کنید.', 'safe prior answer was not shown as a draft suggestion');
  expect(draft.response_mode === 'exact' && draft.match_mode === 'smart', 'owner draft is not locked to exact/smart owner-reviewed publication');
});

test('locked medical safety language is never reused as a draft suggestion', async () => {
  const draft = await prepareOwnerReviewedUnansweredDraft(reviewDb(), {
    id: 3, question: 'درمان سرطان کودک چیست؟', occurrences: 1, status: 'pending',
  });
  expect(!draft.suggested_answer, 'medical safety response was offered as an editable owner draft');
});

test('fixed child-growth medical guidance is never reused as a draft suggestion', async () => {
  const db = reviewDb();
  const clusters = [{
    representative_question: 'قد کودک ۵ ساله چقدر باید باشد؟', sample_questions: [], occurrence_count: 1,
    last_answer: 'برای ارزیابی دقیق رشد کودک با پزشک متخصص صحبت کنید.', last_model: 'mistral-small-latest',
  }];
  const originalFrom = db.from.bind(db);
  (db as any).from = (table: string) => table === 'assistant_question_clusters'
    ? { select: () => ({ is: () => ({ order: () => ({ limit: () => ({ data: clusters, error: null }) }) }) }) }
    : originalFrom(table);
  const draft = await prepareOwnerReviewedUnansweredDraft(db, {
    id: 4, question: 'قد کودک ۵ ساله چقدر باید باشد؟', occurrences: 1, status: 'pending',
  });
  expect(!draft.suggested_answer, 'fixed growth medical guidance was offered as an editable owner draft');
});

for (const [name, run] of tests) {
  await run();
  console.log(`✓ ${name}`);
}
console.log('Assistant curation runtime contracts passed.');
