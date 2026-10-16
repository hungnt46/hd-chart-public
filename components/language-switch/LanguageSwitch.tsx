'use client';
/**
 * Nút chuyển ngôn ngữ — nhãn NGẮN "VI | EN" (Hưng chốt 2026-09-25) để vừa thanh
 * trên cùng cạnh sáu tab. Mã ISO không thuộc ngôn ngữ nào nên người không đọc
 * được thứ tiếng đang hiện vẫn tìm ra nút của mình; tên đầy đủ, viết bằng CHÍNH
 * ngôn ngữ đó, nằm trong `aria-label` (chứa luôn mã hiển thị — WCAG 2.5.3) và `title`.
 */
import type { JSX } from 'react';
import { LANGS, LANG_LABEL, LANG_SHORT } from '../../i18n/ui/index.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { SegmentedControl } from '../ui/SegmentedControl.js';

export function LanguageSwitch(): JSX.Element {
  const { lang, setLang, t } = useLanguage();
  return (
    <SegmentedControl label={t('app.language')} value={lang} onChange={setLang} testId="language-switch"
      options={LANGS.map(l => ({
        value: l, label: LANG_SHORT[l], testId: `lang-${l}`, lang: l,
        ariaLabel: `${LANG_LABEL[l]} (${LANG_SHORT[l]})`, title: LANG_LABEL[l],
      }))} />
  );
}
