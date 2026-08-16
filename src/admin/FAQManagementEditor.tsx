import React from 'react';

type Props = {
  cfg: any;
  T: any;
  S: any;
  AdminBtn: () => any;
  Box: any;
  setEditCfg?: (next: any) => void;
  saveCfg?: (next: any) => any;
  showToast: (message: string) => void;
};

/**
 * FAQ editor intentionally lives at module scope and uses uncontrolled draft
 * fields. Typing does not rebuild the parent editor, so mobile keyboards stay
 * open and neither focus nor scroll position jumps.
 */
export default function FAQManagementEditor({ cfg, T, S, AdminBtn, Box, setEditCfg, saveCfg, showToast }: Props) {
  const fa: any[] = Array.isArray(cfg?.faqItems) ? cfg.faqItems : [];
  const en: any[] = Array.isArray(cfg?.faqItemsEn) ? cfg.faqItemsEn : [];
  const tabs: any[] = (cfg?.courseTabs || []).filter((tab: any) => tab.active !== false);
  const destinations = [{ id: 'home', label: 'home' }, { id: 'faq', label: 'FAQ' }, ...tabs.map((tab: any) => ({ id: `course:${tab.id}`, label: tab.title || tab.id }))];

  const publish = async (patch: any, message = 'تغییرات FAQ ذخیره شد.') => {
    const next = { ...cfg, ...patch };
    setEditCfg?.(next);
    const result = await saveCfg?.(next);
    if (result !== false) showToast(message);
  };
  const update = (key: 'faqItems' | 'faqItemsEn', list: any[], index: number, patch: any) => {
    if (!list[index]) return;
    const next = [...list];
    next[index] = { ...next[index], ...patch };
    setEditCfg?.({ ...cfg, [key]: next });
  };
  const toggleDestination = (key: 'faqItems' | 'faqItemsEn', list: any[], index: number, id: string, checked: boolean) => {
    const current = Array.isArray(list[index]?.placements) ? list[index].placements : ['home', 'faq'];
    update(key, list, index, { placements: checked ? [...new Set([...current, id])] : current.filter((value: string) => value !== id) });
  };

  const card = (item: any, index: number, key: 'faqItems' | 'faqItemsEn', list: any[], isEn = false) => (
    <div style={{ border: `1px solid ${T.brd || '#d7e1e7'}`, borderRadius: 12, padding: 9, background: T.badge || T.card, minWidth: 0 }}>
      <input
        key={`${item?.id || key}-${key}-question`}
        dir={isEn ? 'ltr' : undefined}
        defaultValue={item?.question || ''}
        onBlur={(event) => update(key, list, index, { question: event.currentTarget.value })}
        placeholder={isEn ? 'Question' : 'سوال'}
        disabled={!item}
        style={{ ...S.inp, marginBottom: 6, fontSize: 13 }}
      />
      <textarea
        key={`${item?.id || key}-${key}-answer`}
        dir={isEn ? 'ltr' : undefined}
        defaultValue={item?.answer || ''}
        onBlur={(event) => update(key, list, index, { answer: event.currentTarget.value })}
        placeholder={isEn ? 'Answer' : 'پاسخ'}
        disabled={!item}
        style={{ ...S.ta, minHeight: 68, fontSize: 12 }}
      />
      {item && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 7, fontSize: 10.5, lineHeight: 1.4 }}>
          {destinations.map((destination) => (
            <label key={destination.id} style={{ display: 'inline-flex', gap: 3, alignItems: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={!Array.isArray(item.placements) || item.placements.includes(destination.id)} onChange={(event) => toggleDestination(key, list, index, destination.id, event.target.checked)} style={{ width: 13, height: 13, margin: 0 }} />
              {destination.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );

  const pairCount = Math.max(fa.length, en.length);
  const addPair = () => {
    const id = `faq_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    publish({ faqItems: [{ id, question: '', answer: '', placements: ['home', 'faq'] }, ...fa], faqItemsEn: [{ id: `${id}_en`, question: '', answer: '', placements: ['home', 'faq'] }, ...en] }, 'یک جفت سؤال فارسی و انگلیسی افزوده شد.');
  };
  const movePair = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pairCount) return;
    const faNext = [...fa];
    const enNext = [...en];
    [faNext[index], faNext[target]] = [faNext[target], faNext[index]];
    [enNext[index], enNext[target]] = [enNext[target], enNext[index]];
    publish({ faqItems: faNext.filter(Boolean), faqItemsEn: enNext.filter(Boolean) }, 'ترتیب جفت سؤال تغییر کرد.');
  };
  const deletePair = (index: number) => {
    if (!window.confirm('این جفت سؤال فارسی و انگلیسی حذف شود؟')) return;
    publish({ faqItems: fa.filter((_, itemIndex) => itemIndex !== index), faqItemsEn: en.filter((_, itemIndex) => itemIndex !== index) }, 'جفت سؤال حذف شد.');
  };

  return (
    <Box title="مدیریت سوالات متداول (FAQ)">
      <div className="zkad-qu-faq-head"><h4 style={{ color: T.ttl, margin: 0, textAlign: 'right' }}>فارسی ({fa.length})</h4><h4 style={{ color: T.ttl, margin: 0, textAlign: 'left' }}>English ({en.length})</h4></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <button type="button" style={{ ...AdminBtn(), background: T.acc || '#0f766e', color: '#fff', border: 0, fontWeight: 800 }} onClick={addPair}>+ افزودن سؤال جدید</button>
        <button type="button" style={{ ...AdminBtn() }} onClick={() => publish({ faqItems: fa, faqItemsEn: en }, 'همه سؤالات متداول ذخیره و منتشر شد.')}>ذخیره همه</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: pairCount }, (_, index) => (
          <div key={fa[index]?.id || en[index]?.id || `pair-${index}`} data-faq-editor-pair style={{ border: `1px solid ${T.brd || '#d7e1e7'}`, borderRadius: 14, padding: 8, background: T.soft || '#f5fbfb' }}>
            <div className="zkad-qu-faq-pair">{card(fa[index], index, 'faqItems', fa)}{card(en[index], index, 'faqItemsEn', en, true)}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 7 }}>
              <button type="button" style={{ ...AdminBtn(), padding: '4px 9px' }} disabled={index === 0} onClick={() => movePair(index, -1)}>↑</button>
              <button type="button" style={{ ...AdminBtn(), padding: '4px 9px' }} disabled={index === pairCount - 1} onClick={() => movePair(index, 1)}>↓</button>
              <button type="button" style={{ ...AdminBtn(), padding: '4px 9px', color: T.err || '#dc2626' }} onClick={() => deletePair(index)}>حذف</button>
            </div>
          </div>
        ))}
      </div>
    </Box>
  );
}
