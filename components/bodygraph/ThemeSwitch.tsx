'use client';
/**
 * Công tắc "Classic | Modern" — trong bảng cài đặt trên thanh trên, cạnh ngôn
 * ngữ và giờ (Hưng chốt 2026-09-28, phương án D). Đổi chủ đề là đổi cả bản vẽ
 * bodygraph lẫn bảng màu chart ghép — xem `ChartThemeProvider`.
 */
import type { JSX } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { SegmentedControl } from '../ui/SegmentedControl.js';
import { useChartTheme } from './CompositePaletteProvider.js';

export function ThemeSwitch(): JSX.Element {
  const { t } = useLanguage();
  const { theme, setTheme } = useChartTheme();
  return (
    <SegmentedControl label={t('theme.group')} value={theme} onChange={setTheme} testId="theme-switch"
      options={(['classic', 'modern'] as const).map(th => ({
        value: th, testId: `theme-${th}`, label: th === 'classic' ? t('theme.classic') : t('theme.modern'),
      }))} />
  );
}
