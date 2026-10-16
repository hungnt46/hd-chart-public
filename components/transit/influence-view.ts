/**
 * Phần THUẦN của bảng Ảnh hưởng hành tinh (`PlanetaryInfluence.tsx`): khoảng
 * tháng, chữ thời lượng, tách nhãn giờ, tìm kiếm. Không React — test được bằng
 * vitest thường (`__tests__/influence-view.spec.ts`).
 */
import type { InfluenceRow } from '../../calc-core/rave/planetary-influence.js';
import type { Lang, UiKey } from '../../i18n/ui/index.js';
import { channelName, circuitName, gateName } from '../../i18n/hd-names/index.js';
import { centerShortName, planetName } from '../../i18n/terms.js';
import { jdOfMs } from '../../calc-core/time/julian.js';

type T = (key: UiKey, vars?: Record<string, string | number>) => string;

export interface Month { y: number; m: number }   // m: 1–12

/** Tháng chứa một thời điểm — cắt theo UTC như ứng dụng tham chiếu (engine, định nghĩa 4). */
export const monthOf = (d: Date): Month => ({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 });
export const addMonths = ({ y, m }: Month, n: number): Month => {
  const k = y * 12 + (m - 1) + n;
  return { y: Math.floor(k / 12), m: (k % 12) + 1 };
};
/** `[jdFrom, jdTo)` của một tháng UTC. */
export const monthRange = ({ y, m }: Month): { jdFrom: number; jdTo: number } => ({
  jdFrom: jdOfMs(Date.UTC(y, m - 1, 1)), jdTo: jdOfMs(Date.UTC(y, m, 1)),
});
export const monthKey = ({ y, m }: Month) => `${y}-${String(m).padStart(2, '0')}`;
export const monthLabel = (t: T, { y, m }: Month) => t('pi.monthLabel', { month: t(`pi.mon.${m}` as UiKey), y });

/**
 * Thời lượng: HAI đơn vị lớn nhất, như ứng dụng tham chiếu ("2 years 2 months", "3 days 20 hrs")
 * và như `afterLabel` của bảng Thay đổi. Năm = 365.25 ngày, tháng = 1/12 năm —
 * test engine so với bản tham chiếu ±1 đơn vị nhỏ nhất in ra, nên cách quy đổi này đủ.
 */
const UNITS: readonly [UiKey, number][] = [
  ['pi.unit.year', 365.25], ['pi.unit.month', 365.25 / 12], ['changes.unit.day', 1],
  ['changes.unit.hour', 1 / 24], ['changes.unit.minute', 1 / 1440],
];
export function durationLabel(t: T, days: number): string {
  let rest = Math.max(0, Math.round(days * 1440)) / 1440;
  const parts: string[] = [];
  for (const [key, size] of UNITS) {
    const n = Math.floor(rest / size + 1e-9);
    if (parts.length) {                       // đơn vị thứ hai: phải LIỀN đơn vị đầu
      if (n > 0) parts.push(t(key, { n }));
      break;
    }
    if (n > 0) { parts.push(t(key, { n })); rest -= n * size; }
  }
  return parts.length ? parts.join(' ') : t('changes.unit.minute', { n: 0 });
}

/**
 * Tách nhãn của `momentLabel` ("28-09-2026 14:30" · "2026-09-28 14:30" · "… UTC")
 * thành ô hai dòng: ngày-tháng + giờ, rồi thứ (+ năm nếu khác năm đang xem).
 * Giờ vẫn đi qua `momentLabel` — luật CLAUDE.md, không tự ghép giờ ở component.
 */
export interface WhenParts { day: string; time: string; dow: number; year: number }
export function whenParts(label: string, lang: Lang): WhenParts {
  const m = /(\d+)-(\d+)-(\d+) (\d\d:\d\d)/.exec(label);
  if (!m) return { day: label, time: '', dow: 0, year: 0 };
  const [Y, M, D] = lang === 'vi' ? [+m[3]!, m[2]!, m[1]!] : [+m[1]!, m[2]!, m[3]!];
  return {
    day: lang === 'vi' ? `${D}-${M}` : `${M}-${D}`, time: m[4]!,
    dow: new Date(Date.UTC(Y, +M - 1, +D)).getUTCDay(), year: Y,
  };
}

/** Chữ để tìm của một dòng: số cổng, tên cổng, thiên thể, kênh, mạch, trung tâm. */
export function searchText(r: InfluenceRow, lang: Lang): string {
  return [
    String(r.gate), gateName(r.gate, lang), planetName(r.body, lang),
    ...r.channels.flatMap(c => [
      `${c.channel.gates[0]}-${c.channel.gates[1]}`, `${c.channel.gates[1]}-${c.channel.gates[0]}`, String(c.harmonic),
      channelName(c.channel.id, lang), circuitName(c.circuit, lang),
    ]),
    ...r.definesCenters.map(s => centerShortName(s.center, lang)),
  ].join(' ').toLocaleLowerCase(lang);
}
