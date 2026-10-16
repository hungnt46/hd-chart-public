/**
 * "sau 3 ngày 14 giờ" — hai đơn vị lớn nhất khác 0, như cách người ta nói.
 * Dùng chung cho bảng Thay đổi sắp tới và Activation Watch.
 */
import type { UiKey } from '../../i18n/ui/index.js';

type T = (key: UiKey, vars?: Record<string, string | number>) => string;

export function afterLabel(t: T, jdFrom: number, jdTo: number): string {
  let mins = Math.max(0, Math.round((jdTo - jdFrom) * 1440));
  const d = Math.floor(mins / 1440); mins -= d * 1440;
  const h = Math.floor(mins / 60); const m = mins - h * 60;
  const parts = [
    d ? t('changes.unit.day', { n: d }) : null,
    h ? t('changes.unit.hour', { n: h }) : null,
    m ? t('changes.unit.minute', { n: m }) : null,
  ].filter((x): x is string => x !== null).slice(0, 2);
  return t('changes.after', { t: parts.length ? parts.join(' ') : t('changes.unit.minute', { n: 0 }) });
}
