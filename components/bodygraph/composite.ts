/**
 * Nguồn kích hoạt cho CHART GHÉP — dịch "bên" (người / bên kia / cả hai) sang ba
 * khe mà renderer đã biết. Xem `compositeTheme` trong `theme.ts` cho lý do.
 */
import type { ActivationSource } from '../../calc-core/rave/derive/activation-source.js';
import { channelActivationSource } from '../../calc-core/rave/derive/activation-source.js';
import type { ChannelDef } from '../../calc-core/rave/derive/tables.js';

export type CompositeSide = 'base' | 'other' | 'both';

const SLOT: Readonly<Record<CompositeSide, ActivationSource>> =
  { base: 'design', other: 'personality', both: 'both' };
/** Ngược lại — để `data-source` trong markup ghi đúng NGHĨA, không ghi tên khe. */
export const SIDE_OF_SLOT: Readonly<Record<ActivationSource, CompositeSide>> =
  { design: 'base', personality: 'other', both: 'both' };

export function compositeSources(
  baseGates: ReadonlySet<number>,
  otherGates: ReadonlySet<number>,
  channels: readonly ChannelDef[],
): { gateSources: Map<number, ActivationSource>; channelSources: Map<string, ActivationSource> } {
  const gateSources = new Map<number, ActivationSource>();
  for (const g of new Set([...baseGates, ...otherGates])) {
    const side: CompositeSide = baseGates.has(g) ? (otherGates.has(g) ? 'both' : 'base') : 'other';
    gateSources.set(g, SLOT[side]);
  }
  /*
   * ★ BỎ QUA kênh không khớp, KHÔNG ném. Đổi chart gốc (bấm "Tạo chart khác")
   *   thì có một lượt render mà transit/chu kỳ vẫn là của chart CŨ, còn cổng đã
   *   là của chart MỚI — `channelActivationSource` ném "chưa defined" và cả trang
   *   sập. Đã mắc thật 2026-09-23: `e2e/connection.spec.ts` (tính hai chart liên
   *   tiếp) đỏ trên cả ba engine. Lượt render sau transit tính lại là khớp.
   */
  const channelSources = new Map(channels
    .filter(ch => gateSources.has(ch.gates[0]) && gateSources.has(ch.gates[1]))
    .map(ch => [`${ch.gates[0]}-${ch.gates[1]}`, channelActivationSource(ch, gateSources)]));
  return { gateSources, channelSources };
}
