'use client';
/**
 * Công tắc "Địa phương | UTC" — cạnh nút ngôn ngữ. Xem `TimeModeProvider`.
 * Nhãn ngắn (Hưng chốt 2026-09-25); `aria-label` giữ tên đầy đủ và CHỨA chữ
 * hiển thị ("Giờ địa phương" ⊃ "Địa phương") — WCAG 2.5.3.
 */
import type { JSX } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { useTimeMode, type TimeMode } from './TimeModeProvider.js';
import { SegmentedControl } from '../ui/SegmentedControl.js';

export function TimeModeSwitch(): JSX.Element {
  const { t } = useLanguage();
  const { mode, setMode } = useTimeMode();
  return (
    <SegmentedControl label={t('time.group')} value={mode} onChange={setMode} testId="time-mode-switch"
      options={(['local', 'ut'] as const satisfies readonly TimeMode[]).map(m => ({
        value: m, testId: `time-${m}`,
        ariaLabel: m === 'local' ? t('time.local') : t('time.ut'),
        label: m === 'local' ? t('time.localShort') : t('time.ut'),
      }))} />
  );
}
