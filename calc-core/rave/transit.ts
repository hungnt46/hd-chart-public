/**
 * Transit & Day chart — SPEC §10.5 (D11).
 *
 * ★ Bằng chứng về HÌNH DẠNG dữ liệu (đo trên "Just Now Chart" của
 *   jovianarchive.com, 2026-09-22): chart của một thời điểm có **MỘT** bộ
 *   activation, nhãn cột là `Transit`, gồm 13 thiên thể xác định. Không có cặp
 *   Design/Personality — vì không có sự kiện sinh nào để lùi 88° cung.
 *   Kênh defined ở đó mang class `c2`, tức tô bằng màu personality.
 *
 * Hai loại chart:
 *   - `calculateDayChart`  — chỉ transit, đứng một mình ("Just Now").
 *   - `calculateTransitChart` — transit CHỒNG lên một chart nền: hợp hai tập
 *     cổng rồi tính lại kênh/trung tâm, và ghi rõ cái gì đến từ đâu.
 *
 * Toàn bộ dùng lại `computeActivations` và `deriveStructure` của Phase 1 —
 * không có luật thiên văn mới nào ở đây.
 */
import type { EphemerisProvider } from '../ephemeris/provider.js';
import { DEFAULT_BODY_CONFIG, DEFINING_BODIES_STANDARD, type BodyConfig, type Body } from '../ephemeris/bodies.js';
import { computeActivations, type ActivationSet } from './activations.js';
import { deriveStructure } from './derive/structure.js';
import type { CenterId, ChannelDef } from './derive/tables.js';
import { CALC_CORE_VERSION, type RaveChart } from './chart.js';
import { cycleChannelState, type CycleChannel, type CycleCompositionState } from './cycle.js';

/** Cổng/kênh đến từ đâu khi chồng hai chart. */
export type Origin = 'base' | 'transit' | 'both';

export interface DayChart {
  /** Một bộ activation duy nhất — xem ghi chú đầu tệp. */
  transit: ActivationSet;
  jdUT: number;
  definedGates: ReadonlySet<number>;
  definedChannels: readonly ChannelDef[];
  definedCenters: ReadonlySet<CenterId>;
  provenance: { providerId: string; bodyConfig: BodyConfig; calcCoreVersion: string };
}

export interface TransitChart extends DayChart {
  /**
   * Cấu trúc SAU KHI chồng: cổng của chart nền hợp với cổng transit, rồi tính
   * lại kênh và trung tâm. Đây mới là thứ người ta xem transit để biết.
   */
  combined: {
    definedGates: ReadonlySet<number>;
    definedChannels: readonly ChannelDef[];
    definedCenters: ReadonlySet<CenterId>;
  };
  /** Cổng nào do nền, cổng nào do transit, cổng nào cả hai. */
  gateOrigin: ReadonlyMap<number, Origin>;
  /**
   * Kênh nào do transit mà THÀNH — tức chỉ defined khi có transit góp vào.
   * Đây là phần "hôm nay bạn khác thường ở chỗ nào".
   */
  newChannels: readonly ChannelDef[];
  /** Trung tâm nào transit làm defined thêm. */
  newCenters: ReadonlySet<CenterId>;
  /**
   * MỌI kênh của bản chồng, gắn trạng thái theo từ vựng của chart CHU KỲ —
   * Natal / Compromise / Educational / Personal Connection (STATUS §4 E2).
   *
   * Vì sao từ vựng chu kỳ chứ không phải của chart hai người: bản tham chiếu ghi
   * đúng bộ này cho transit (fixture đối chiếu 2026-09-23, phần properties),
   * và lý do như chu kỳ — quan hệ KHÔNG đối xứng: "tôi vốn
   * có" (Natal) khác "bầu trời mang tới". Luật là `cycleChannelState`, dùng
   * chung, không viết lại.
   *
   * Bất biến (có test): Natal = đúng kênh của người; ba nhóm còn lại = đúng
   * `newChannels`.
   */
  channels: readonly CycleChannel[];
  counts: Readonly<Record<CycleCompositionState, number>>;
}

const gatesOf = (set: ActivationSet, bodies: readonly Body[]): Set<number> => {
  const out = new Set<number>();
  for (const b of bodies) {
    const a = set.byBody[b];
    if (a) out.add(a.position.gate);
  }
  return out;
};

/** Chart của một thời điểm, đứng một mình. Còn gọi là DayChart; Jovian gọi "Just Now". */
export function calculateDayChart(
  eph: EphemerisProvider,
  jdUT: number,
  cfg: BodyConfig = DEFAULT_BODY_CONFIG,
): DayChart {
  const transit = computeActivations(eph, jdUT, cfg);
  const gates = gatesOf(transit, DEFINING_BODIES_STANDARD);
  const struct = deriveStructure(gates);
  return {
    transit,
    jdUT,
    definedGates: struct.definedGates,
    definedChannels: struct.definedChannels,
    definedCenters: struct.definedCenters,
    provenance: { providerId: eph.id, bodyConfig: cfg, calcCoreVersion: CALC_CORE_VERSION },
  };
}

/**
 * Transit chồng lên một chart nền.
 *
 * ⚠️ KHÔNG tính lại Type/Authority/Profile cho bản chồng. Transit không đổi
 * thiết kế của một người — nó chỉ tạm thời nối thêm kênh. Trả về Type mới sẽ
 * khiến người đọc tưởng hôm nay mình là Type khác, đó là hiểu sai nghiêm trọng
 * về bộ môn. Phần cố định vẫn đọc từ `base`.
 */
export function calculateTransitChart(
  eph: EphemerisProvider,
  base: RaveChart,
  jdUT: number,
  cfg: BodyConfig = DEFAULT_BODY_CONFIG,
): TransitChart {
  const day = calculateDayChart(eph, jdUT, cfg);

  const baseGates = base.definedGates;
  const tGates = day.definedGates;
  const union = new Set<number>([...baseGates, ...tGates]);
  const combined = deriveStructure(union);

  const gateOrigin = new Map<number, Origin>();
  for (const g of union) {
    const inBase = baseGates.has(g), inT = tGates.has(g);
    gateOrigin.set(g, inBase && inT ? 'both' : inBase ? 'base' : 'transit');
  }

  const baseKeys = new Set(base.definedChannels.map(c => c.id));
  const newChannels = combined.definedChannels.filter(c => !baseKeys.has(c.id));
  const newCenters = new Set<CenterId>(
    [...combined.definedCenters].filter(c => !base.definedCenters.has(c)));

  const counts: Record<CycleCompositionState, number> =
    { Natal: 0, Compromise: 0, Educational: 0, PersonalConnection: 0 };
  const channels: CycleChannel[] = combined.definedChannels.map(channel => {
    const [g1, g2] = channel.gates;
    const nBase = (baseGates.has(g1) ? 1 : 0) + (baseGates.has(g2) ? 1 : 0);
    const nT = (tGates.has(g1) ? 1 : 0) + (tGates.has(g2) ? 1 : 0);
    const state = cycleChannelState(nBase, nT);
    counts[state]++;
    return { channel, state };
  });

  return {
    ...day,
    combined: {
      definedGates: combined.definedGates,
      definedChannels: combined.definedChannels,
      definedCenters: combined.definedCenters,
    },
    gateOrigin,
    newChannels,
    newCenters,
    channels,
    counts,
  };
}
