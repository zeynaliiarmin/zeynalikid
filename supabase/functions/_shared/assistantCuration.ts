import { assistantIntentTokens, normalizeAssistantText, sameAssistantIntent } from './assistantMatch.ts';

/**
 * This is the review-only assistant layer for unanswered public questions.
 * It may group wording from real questions and prepare aliases/keywords plus a
 * clearly-labelled prior-answer suggestion, but it never creates knowledge. Only
 * resolveOwnerApprovedUnanswered
 * is allowed to publish, and it requires the owner's supplied answer.
 */
export type UnansweredDetectionReason = 'no_match' | 'low_confidence' | 'generic_answer';

export interface OwnerReviewedUnansweredDraft {
  question: string;
  aliases: string[];
  keywords: string[];
  category: string;
  response_mode: 'exact';
  match_mode: 'smart';
  grouped_occurrences: number;
  /** An optional, non-publishing suggestion drawn from a prior non-policy answer. */
  suggested_answer: string;
  suggested_answer_notice: string;
  owner_notice: string;
}

const clean = (value: unknown, max: number) => String(value || '').trim().slice(0, max);
const unique = (values: unknown[], max: number, itemMax: number) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = clean(value, itemMax);
    const normalized = normalizeAssistantText(text);
    if (normalized.length < 2 || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(text);
    if (result.length >= max) break;
  }
  return result;
};

const genericPatterns = [
  /اطلاعات(?:ی| کافی| تأییدشده(?:‌?ای)?| ثبت شده)?(?: درباره(?: این موضوع| ایشون|شان)?| بیشتری درباره.*)? ندارم/i,
  /دانش(?:ی| مستقیم)?(?: مرتبط)? پیدا نشد/i,
  /این اطلاعات در دانش عمومی دستیار ثبت نشده/i,
  /اطلاعات عمومی بیشتری درباره.*ثبت نشده/i,
  /ایشون رو نمی(?:\s|‌)?شناسم/i,
  /نمی(?:\s|‌)?دانم/i,
  /i do not have enough (?:approved )?information/i,
  /i do not know enough about that/i,
  /no (?:approved )?information (?:is )?available/i,
];

/** A generic or low-confidence reply must be queued for owner review, not learned automatically. */
/** Never reuse a policy, safety, exact-rule or generic fallback as an owner draft. */
function safeSuggestedOwnerAnswer(answerValue: unknown, modelValue: unknown): string {
  const answer = clean(answerValue, 1500);
  const model = clean(modelValue, 120);
  if (answer.length < 2 || /^(internal-(?:policy|privacy-policy|who-growth|exact-rule|refusal-rule|context-policy))$/i.test(model)) return '';
  if (genericPatterns.some((pattern) => pattern.test(answer))) return '';
  if (/(سرطان|شیمی\s*درمان|پرتو\s*درمان|دوز\s*دارو|نحوه\s*مصرف\s*دارو)/i.test(answer)) return '';
  if (/(پزشک|دکتر|doctor)/i.test(answer) && /(رشد|قد|وزن|کودک|نوجوان|growth|height|weight|child)/i.test(answer)) return '';
  return answer;
}

export function needsOwnerReviewForAnswer(options: {
  answer: unknown;
  fallback: unknown;
  model: unknown;
  confidence: unknown;
}): { needs_review: boolean; reason: UnansweredDetectionReason } {
  const answer = normalizeAssistantText(options.answer);
  const fallback = normalizeAssistantText(options.fallback);
  const model = clean(options.model, 120);
  const confidence = Number(options.confidence || 0);
  if (!answer || answer === fallback || genericPatterns.some((pattern) => pattern.test(String(options.answer || '')))) {
    return { needs_review: true, reason: 'generic_answer' };
  }
  if (model === 'internal-no-knowledge') return { needs_review: true, reason: 'no_match' };
  if (!Number.isFinite(confidence) || confidence < 0.62) return { needs_review: true, reason: 'low_confidence' };
  return { needs_review: false, reason: 'low_confidence' };
}

/** Fetch every open row in bounded pages so owner tools never silently hide older questions. */
export async function listAllPendingUnanswered(db: any, columns = '*'): Promise<any[]> {
  const rows: any[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .from('assistant_unanswered')
      .select(columns)
      .eq('status', 'pending')
      .order('occurrences', { ascending: false })
      .order('last_seen_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function addCandidate(target: string[], question: string, primary: string) {
  const normalized = normalizeAssistantText(question);
  if (!normalized || normalized === normalizeAssistantText(primary)) return;
  if (!sameAssistantIntent(primary, question)) return;
  target.push(question);
}

/**
 * Builds an explicitly non-publishing draft. It may show one prior non-policy
 * answer as a clearly-labelled suggestion, but it never writes knowledge: explicit
 * owner review and the separate resolve action are still required to publish.
 */
export async function prepareOwnerReviewedUnansweredDraft(db: any, source: any): Promise<OwnerReviewedUnansweredDraft> {
  const question = clean(source?.question, 500);
  const ownOccurrences = Math.max(1, Number(source?.occurrences || 1));
  const [unansweredRows, clustersResult] = await Promise.all([
    listAllPendingUnanswered(db, 'id,question,occurrences,status'),
    db.from('assistant_question_clusters').select('representative_question,sample_questions,occurrence_count,last_answer,last_model').is('knowledge_id', null).order('last_seen_at', { ascending: false }).limit(180),
  ]);
  if (clustersResult.error) throw clustersResult.error;
  const candidates: string[] = [];
  const suggestedAnswers: string[] = [];
  let groupedOccurrences = ownOccurrences;
  for (const row of unansweredRows) {
    if (String(row?.id) === String(source?.id)) continue;
    if (!sameAssistantIntent(question, String(row?.question || ''))) continue;
    addCandidate(candidates, String(row.question || ''), question);
    groupedOccurrences += Math.max(0, Number(row.occurrences || 0));
  }
  for (const cluster of clustersResult.data || []) {
    const sampleQuestions = [cluster?.representative_question, ...(Array.isArray(cluster?.sample_questions) ? cluster.sample_questions : [])]
      .map((value) => clean(value, 500))
      .filter(Boolean);
    const matchesGroup = sampleQuestions.some((sample) => sameAssistantIntent(question, sample));
    if (!matchesGroup) continue;
    for (const sample of sampleQuestions) addCandidate(candidates, sample, question);
    const proposed = safeSuggestedOwnerAnswer(cluster?.last_answer, cluster?.last_model);
    if (proposed) suggestedAnswers.push(proposed);
  }
  const aliases = unique(candidates, 29, 500);
  const keywords = unique([question, ...aliases].flatMap((value) => assistantIntentTokens(value)), 12, 100);
  const suggestedAnswer = unique(suggestedAnswers, 1, 1500)[0] || '';
  return {
    question,
    aliases,
    keywords,
    category: 'سؤال‌های کاربران',
    response_mode: 'exact',
    match_mode: 'smart',
    grouped_occurrences: groupedOccurrences,
    suggested_answer: suggestedAnswer,
    suggested_answer_notice: suggestedAnswer
      ? 'این فقط پیش‌نویس پیشنهادی از پاسخ قبلیِ غیرقطعی است؛ آن را بررسی یا بازنویسی کنید. تا ذخیره صریح شما، چیزی منتشر نمی‌شود.'
      : 'برای این مورد پیش‌نویس امنی پیشنهاد نشده است؛ پاسخ تأییدشده خودتان را بنویسید.',
    owner_notice: 'عبارت‌های مشابه فقط پیشنهاد هستند. فقط متن تأییدشده مالک و پس از ذخیره صریح منتشر می‌شود.',
  };
}

export async function resolveOwnerApprovedUnanswered(
  db: any,
  options: {
    id: unknown;
    answer: unknown;
    aliases?: unknown[];
    keywords?: unknown[];
    createdBy: string;
  },
) {
  const id = Number(options.id);
  const answer = clean(options.answer, 6000);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('ASSISTANT_UNANSWERED_INVALID_ID');
  if (answer.length < 2) throw new Error('ASSISTANT_REQUIRED_FIELDS');
  const { data: row, error: readError } = await db.from('assistant_unanswered').select('id,question,occurrences,status').eq('id', id).eq('status', 'pending').maybeSingle();
  if (readError) throw readError;
  if (!row) throw new Error('ASSISTANT_UNANSWERED_NOT_PENDING');
  const draft = await prepareOwnerReviewedUnansweredDraft(db, row);
  // A panel owner may explicitly trim the suggestions; Telegram uses the safe grouped defaults.
  const aliases = options.aliases === undefined ? draft.aliases : unique(options.aliases, 29, 500);
  const keywords = options.keywords === undefined ? draft.keywords : unique(options.keywords, 12, 100);
  const { data, error } = await db.rpc('resolve_assistant_unanswered', {
    p_unanswered_id: id,
    p_answer: answer,
    p_aliases: aliases,
    p_keywords: keywords,
    p_category: draft.category,
    p_response_mode: 'exact',
    p_match_mode: 'smart',
    p_priority: 12,
    p_created_by: clean(options.createdBy, 40) || 'owner-unanswered',
  });
  if (error) throw error;
  return { knowledge: data, draft };
}

/** Soft archive only: pending questions stay in the project's database and can be audited later. */
export async function archivePendingUnanswered(db: any) {
  const { data, error } = await db
    .from('assistant_unanswered')
    .update({ status: 'ignored', archived_at: new Date().toISOString() })
    .eq('status', 'pending')
    .select('id');
  if (error) throw error;
  return (data || []).length;
}
