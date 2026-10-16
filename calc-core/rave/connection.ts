/**
 * Connection chart (composite của HAI người) — SPEC §10.5 (D11).
 *
 * ★ Luật 4 trạng thái kênh: DÒ ĐƯỢC, không phải đoán (2026-09-22).
 *   ghi chép nội bộ không có luật này; bảng trạng thái kênh chuẩn chỉ liệt
 *   kê 7 cái tên. Luật dưới đây rút ra bằng hai ca đối chiếu trên tab
 *   "Relationship Chart" của jovianarchive.com — xem
 *   `__fixtures__/reference/jovian-connection-2026-09-22.json`.
 *
 *   Với mỗi kênh ĐÃ defined trong composite, gọi `aFull` = A có ĐỦ hai cổng,
 *   `bFull` = B có đủ hai cổng:
 *
 *   | điều kiện | trạng thái | nghĩa |
 *   |---|---|---|
 *   | aFull && bFull | **Companionship** | cả hai cùng có trọn kênh |
 *   | đúng một người full, người kia có **0** cổng | **Dominance** | một bên áp đảo |
 *   | đúng một người full, người kia có **1** cổng | **Compromise** | phải nhượng bộ |
 *   | không ai full, hợp lại mới đủ | **Electromagnetic** | sức hút |
 *
 *   Bốn nhánh này **vét cạn và loại trừ nhau** trên mọi kênh defined của
 *   composite — có test ghim.
 *
 * ✅ Ba trạng thái còn lại trong bảng chuẩn — `Natal`, `Educational`,
 *   `Personal Connection` — KHÔNG xuất hiện ở chart hai người vì chúng thuộc
 *   **CHART CHU KỲ** (Hưng chỉ chỗ, đã dò xác nhận 2026-09-22). Chúng không phải
 *   trạng thái bổ sung mà là **từ vựng riêng** của loại chart đó; xem bảng đối
 *   chiếu hai bộ từ vựng trong `cycle.ts` (`CycleCompositionState`).
 *
 * ⚠️ KHÔNG tính Type/Authority/Profile "của cặp đôi". Đo trên app Jovian: khung
 *   Properties của chart kết nối hiện thuộc tính của **người thứ nhất**, không
 *   phải của composite. Một cặp đôi không có Type.
 */
import type { RaveChart } from './chart.js';
import { deriveStructure } from './derive/structure.js';
import type { CenterId, ChannelDef } from './derive/tables.js';

export type CompositionState = 'Companionship' | 'Dominance' | 'Compromise' | 'Electromagnetic';

export const COMPOSITION_STATES: readonly CompositionState[] =
  ['Electromagnetic', 'Dominance', 'Compromise', 'Companionship'];

/** Ai là người trong cặp. */
export type Side = 'a' | 'b';

export interface ConnectionChannel {
  channel: ChannelDef;
  state: CompositionState;
  /** Chỉ có với Dominance/Compromise: bên đang giữ trọn kênh. */
  fullSide?: Side;
}

export interface ConnectionChart {
  /** Cấu trúc SAU khi hợp hai người. */
  definedGates: ReadonlySet<number>;
  definedChannels: readonly ChannelDef[];
  definedCenters: ReadonlySet<CenterId>;
  /** Từng kênh composite kèm trạng thái. */
  channels: readonly ConnectionChannel[];
  counts: Readonly<Record<CompositionState, number>>;
  /**
   * Chỉ số chủ đề 0..9 = **số trung tâm composite xác định**.
   * Bản tham chiếu hiện thành "x - y" với y = 9 − x ("9 - 0, No Where To Go").
   * Tên gọi nằm ở lớp giao diện, không nằm trong calc-core.
   */
  themeIndex: number;
  /** Cổng nào của ai. */
  gateOrigin: ReadonlyMap<number, Side | 'both'>;
}

export function calculateConnectionChart(a: RaveChart, b: RaveChart): ConnectionChart {
  const union = new Set<number>([...a.definedGates, ...b.definedGates]);
  const struct = deriveStructure(union);

  const gateOrigin = new Map<number, Side | 'both'>();
  for (const g of union) {
    const inA = a.definedGates.has(g), inB = b.definedGates.has(g);
    gateOrigin.set(g, inA && inB ? 'both' : inA ? 'a' : 'b');
  }

  const counts: Record<CompositionState, number> =
    { Companionship: 0, Dominance: 0, Compromise: 0, Electromagnetic: 0 };

  const channels: ConnectionChannel[] = struct.definedChannels.map(channel => {
    const [g1, g2] = channel.gates;
    const aFull = a.definedGates.has(g1) && a.definedGates.has(g2);
    const bFull = b.definedGates.has(g1) && b.definedGates.has(g2);

    if (aFull && bFull) {
      counts.Companionship++;
      return { channel, state: 'Companionship' as const };
    }
    if (aFull || bFull) {
      const fullSide: Side = aFull ? 'a' : 'b';
      const other = aFull ? b : a;
      const held = (other.definedGates.has(g1) ? 1 : 0) + (other.definedGates.has(g2) ? 1 : 0);
      const state = held === 0 ? ('Dominance' as const) : ('Compromise' as const);
      counts[state]++;
      return { channel, state, fullSide };
    }
    counts.Electromagnetic++;
    return { channel, state: 'Electromagnetic' as const };
  });

  return {
    definedGates: struct.definedGates,
    definedChannels: struct.definedChannels,
    definedCenters: struct.definedCenters,
    channels,
    counts,
    themeIndex: struct.definedCenters.size,
    gateOrigin,
  };
}
