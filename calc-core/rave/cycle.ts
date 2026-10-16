/**
 * Cycle chart — SPEC §10.5 (D11). Saturn/Chiron return, Uranus opposition,
 * Solar/Lunar return.
 *
 * ★ Luật DÒ ĐƯỢC trên tab CYCLES của một ứng dụng tham chiếu (bản trả phí),
 *   2026-09-22 — xem fixture đối chiếu cùng ngày trong `__fixtures__/reference/`.
 *
 *   1. **Hành tinh chậm** (Saturn, Uranus, Chiron) cắt qua mốc **BA LẦN** vì
 *      nghịch hành. Bản tham chiếu lấy **lần ĐẦU TIÊN**. Kiểm trên g01: Saturn return của
 *      ta ra `2014-02-03 21:47`, bản tham chiếu ghi đúng `February 3, 2014, 21:47 (UTC)`;
 *      hai lần sau (29/03 và 21/10/2014) bị bỏ.
 *   2. **Solar/Lunar return** là chu kỳ mình ĐANG Ở TRONG: lần cắt gần nhất
 *      **trước** mốc tham chiếu, không phải lần kế tiếp.
 *   3. **Uranus opposition** dùng mốc `natal + 180°`.
 *   4. "Second Saturn return" = lần đầu của vòng kế tiếp (~+29.4 năm).
 *
 * ⚠️ BẪY đã mắc khi dò: hàm chênh lệch có dấu nhảy từ +180° sang −180° ở điểm
 *   ĐỐI ĐỈNH. Dò đổi dấu một cách ngây thơ sẽ đếm cả chỗ đó thành "lần cắt",
 *   cho ra Solar return hai lần mỗi năm và Lunar return mỗi 13 ngày. Phải đòi
 *   thêm rằng hai đầu đều GẦN mốc (xem `NEAR_DEG`).
 */
import type { EphemerisProvider } from '../ephemeris/provider.js';
import { findBodyAtLongitude } from './search.js';
import { calculateRaveChart, type RaveChart } from './chart.js';
import { deriveStructure } from './derive/structure.js';
import type { CenterId, ChannelDef } from './derive/tables.js';
import { DEFAULT_BODY_CONFIG, type BodyConfig } from '../ephemeris/bodies.js';
import { jdOfMs, jdToDateUT } from '../time/julian.js';

export type CycleKind =
  | 'SaturnReturn' | 'UranusOpposition' | 'ChironReturn' | 'SolarReturn' | 'LunarReturn';

/** `ipl` chuẩn Swiss Ephemeris. */
const IPL = { Sun: 0, Moon: 1, Saturn: 6, Uranus: 7, Chiron: 15 } as const;

const DAYS_PER_YEAR = 365.25;

/**
 * Ngưỡng "gần mốc" để loại điểm nhảy ±180°. 90° rộng rãi mà vẫn an toàn: một
 * lần cắt thật luôn có hai đầu cùng phía và sát 0°, còn điểm đối đỉnh thì cả
 * hai đầu đều quanh 180°.
 */
const NEAR_DEG = 90;

const mod360 = (x: number) => ((x % 360) + 360) % 360;
const signedDelta = (a: number, b: number) => {
  const d = mod360(a - b);
  return d > 180 ? d - 360 : d;
};

export interface CycleCrossing {
  jdUT: number;
  /** Sai lệch còn lại sau khi tinh chỉnh, để biết phép tìm đã hội tụ tới đâu. */
  residualDeg: number;
}

/**
 * MỌI lần kinh độ của `ipl` cắt qua `targetLon` trong `[jdFrom, jdTo]`.
 * Trả theo thứ tự thời gian — hành tinh nghịch hành cho ba lần.
 */
export function findCrossings(
  eph: EphemerisProvider, ipl: number, targetLon: number,
  jdFrom: number, jdTo: number, stepDays: number,
): CycleCrossing[] {
  const out: CycleCrossing[] = [];
  let prevJd = jdFrom;
  let prev = signedDelta(eph.longitude(jdFrom, ipl), targetLon);
  for (let jd = jdFrom + stepDays; jd <= jdTo; jd += stepDays) {
    const cur = signedDelta(eph.longitude(jd, ipl), targetLon);
    const near = Math.abs(prev) < NEAR_DEG && Math.abs(cur) < NEAR_DEG;
    if (near && (prev === 0 || prev * cur < 0)) {
      const r = findBodyAtLongitude(eph, ipl, targetLon, prevJd, jd);
      out.push({ jdUT: r.jdUT, residualDeg: r.residualDeg });
    }
    prevJd = jd;
    prev = cur;
  }
  return out;
}

interface Slow { ipl: number; offsetDeg: number; everyYears: number; windowYears: number; step: number }

/**
 * Hành tinh chậm. `everyYears` = khoảng cách tới lần XẢY RA kế tiếp, chỉ dùng để
 * ĐẶT CỬA SỔ TÌM — thời điểm thật vẫn do ephemeris quyết.
 *
 * ⚠️ Với **opposition**, khoảng đó là NỬA chu kỳ quỹ đạo, không phải cả chu kỳ:
 * Uranus đi hết vòng trong 84 năm nên đối đỉnh rơi vào ~42. Bản đầu tôi để 84 và
 * phép tìm không thấy gì — cửa sổ nằm cách mốc thật 42 năm.
 */
const SLOW: Readonly<Record<'SaturnReturn' | 'UranusOpposition' | 'ChironReturn', Slow>> = Object.freeze({
  SaturnReturn:     { ipl: IPL.Saturn, offsetDeg: 0,   everyYears: 29.45, windowYears: 5, step: 2 },
  UranusOpposition: { ipl: IPL.Uranus, offsetDeg: 180, everyYears: 42.0,  windowYears: 8, step: 2 },
  ChironReturn:     { ipl: IPL.Chiron, offsetDeg: 0,   everyYears: 50.4,  windowYears: 8, step: 2 },
});

/**
 * Lần cắt ĐẦU TIÊN của một chu kỳ chậm. `ordinal` 1 = lần đầu đời,
 * 2 = "Second Saturn return", …
 */
export function findSlowCycle(
  eph: EphemerisProvider, jdBirthUT: number,
  kind: 'SaturnReturn' | 'UranusOpposition' | 'ChironReturn',
  ordinal = 1,
): CycleCrossing {
  const s = SLOW[kind];
  const target = mod360(eph.longitude(jdBirthUT, s.ipl) + s.offsetDeg);
  const centre = jdBirthUT + s.everyYears * ordinal * DAYS_PER_YEAR;
  const half = (s.windowYears / 2) * DAYS_PER_YEAR;
  const xs = findCrossings(eph, s.ipl, target, centre - half, centre + half, s.step);
  const first = xs[0];
  if (!first) {
    throw new RangeError(
      `findSlowCycle: không thấy lần cắt nào cho ${kind} lần ${ordinal} ` +
      `trong ±${s.windowYears / 2} năm quanh ${centre.toFixed(1)}`);
  }
  return first;
}

/** Đầu năm / đầu tháng dương lịch (UTC) chứa `jdUT`, trả về dạng Julian day. */
function startOfPeriod(jdUT: number, unit: 'year' | 'month'): number {
  const d = jdToDateUT(jdUT);
  const start = unit === 'year'
    ? Date.UTC(d.getUTCFullYear(), 0, 1)
    : Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  return jdOfMs(start);
}

/**
 * Solar/Lunar return: lần cắt **ĐẦU TIÊN kể từ đầu kỳ lịch hiện tại** — đầu NĂM
 * cho Solar, đầu THÁNG cho Lunar.
 *
 * ★ Luật này phải dò bằng ba chart mới ra, vì hai chart đầu cho hai kết luận
 *   trái ngược:
 *     g01 (sinh 15/6) → hiện 15/06/2026, **đã qua** 99 ngày
 *     g04 (sinh 08/10) → hiện 08/10/2026, **sắp tới** 16 ngày
 *   "Gần nhất trước hiện tại" giải thích được g01 chứ không giải thích được g04;
 *   "gần nhất bất kể trước sau" thì ngược lại. Chart thứ ba phân định:
 *     g03 (sinh 08/01) → hiện 07/01/2026, đã qua **8,5 tháng**
 *   — "gần nhất" sẽ phải ra 01/2027. Chỉ còn một luật sống sót: mốc nằm trong
 *   NĂM DƯƠNG LỊCH hiện tại. Lunar cũng vậy với tháng (kiểm trên cả ba: 02/9,
 *   03/9, 22/9 — mỗi chart đúng một mốc trong tháng 9).
 */
export function findFastCycle(
  eph: EphemerisProvider, jdBirthUT: number,
  kind: 'SolarReturn' | 'LunarReturn', jdRefUT: number,
): CycleCrossing {
  const solar = kind === 'SolarReturn';
  const ipl = solar ? IPL.Sun : IPL.Moon;
  const from = startOfPeriod(jdRefUT, solar ? 'year' : 'month');
  // Đủ rộng để chắc chắn tóm được lần đầu: một năm dương lịch < 367 ngày,
  // một tháng < 32 ngày cộng thêm một chu kỳ Mặt Trăng.
  const spanDays = solar ? 367 : 32 + 28;
  const step = solar ? 1 : 0.2;
  const target = eph.longitude(jdBirthUT, ipl);
  const xs = findCrossings(eph, ipl, target, from, from + spanDays, step);
  const first = xs[0];
  if (!first) throw new RangeError(`findFastCycle: không thấy lần cắt nào cho ${kind}`);
  return first;
}

export interface CycleSummary {
  kind: CycleKind;
  ordinal: number;
  jdUT: number;
}

/**
 * Đúng sáu dòng mà tab CYCLES của bản tham chiếu hiện, theo đúng thứ tự đó.
 * `jdRefUT` là "bây giờ" — quyết định Solar/Lunar rơi vào chu kỳ nào.
 */
export function summarizeCycles(
  eph: EphemerisProvider, jdBirthUT: number, jdRefUT: number,
): CycleSummary[] {
  return [
    { kind: 'SaturnReturn', ordinal: 1, jdUT: findSlowCycle(eph, jdBirthUT, 'SaturnReturn', 1).jdUT },
    { kind: 'UranusOpposition', ordinal: 1, jdUT: findSlowCycle(eph, jdBirthUT, 'UranusOpposition').jdUT },
    { kind: 'ChironReturn', ordinal: 1, jdUT: findSlowCycle(eph, jdBirthUT, 'ChironReturn').jdUT },
    { kind: 'SaturnReturn', ordinal: 2, jdUT: findSlowCycle(eph, jdBirthUT, 'SaturnReturn', 2).jdUT },
    { kind: 'SolarReturn', ordinal: 1, jdUT: findFastCycle(eph, jdBirthUT, 'SolarReturn', jdRefUT).jdUT },
    { kind: 'LunarReturn', ordinal: 1, jdUT: findFastCycle(eph, jdBirthUT, 'LunarReturn', jdRefUT).jdUT },
  ];
}

/* ══════════════════════════════════════════════════════════════════════════
 * CHART CHU KỲ (composite natal + mốc chu kỳ)
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * ★ Bốn trạng thái kênh của CHART CHU KỲ — dò được 2026-09-22, giải nốt ẩn số
 *   cuối của dự án.
 *
 * Ba cái tên `Natal` / `Educational` / `Personal Connection` trong
 * bảng trạng thái kênh chuẩn không bao giờ xuất hiện ở chart hai người.
 * Hưng chỉ chỗ: chúng ở CHART CHU KỲ. Đúng vậy — và đây là từ vựng RIÊNG của
 * loại chart đó, không phải trạng thái bổ sung:
 *
 *   | điều kiện (A = natal, B = mốc chu kỳ) | chart chu kỳ | chart hai người |
 *   |---|---|---|
 *   | A giữ TRỌN kênh | **Natal** | Dominance / Compromise |
 *   | B giữ trọn, A có **1** cổng | **Compromise** | Compromise |
 *   | B giữ trọn, A có **0** cổng | **Educational** | Dominance |
 *   | mỗi bên một cổng | **Personal Connection** | Electromagnetic |
 *
 * Khác biệt cốt lõi: quan hệ ở đây KHÔNG đối xứng. Với hai người thì ai giữ
 * trọn kênh cũng như nhau; với chu kỳ thì "tôi vốn đã có" (Natal) khác hẳn
 * "bầu trời mang tới" — nên `Natal` nuốt cả hai ca mà chart hai người gọi là
 * Dominance và Compromise.
 *
 * Kiểm chứng: **19/19 kênh trên hai ca**, phủ cả bốn trạng thái —
 * g01 Saturn return (7 kênh) và g04 Uranus opposition (12 kênh).
 * Xem fixture đối chiếu 2026-09-22 (cycle charts) trong `__fixtures__/reference/`.
 */
export type CycleCompositionState = 'Natal' | 'Compromise' | 'Educational' | 'PersonalConnection';

export const CYCLE_COMPOSITION_STATES: readonly CycleCompositionState[] =
  ['Compromise', 'PersonalConnection', 'Educational', 'Natal'];

export interface CycleChannel {
  channel: ChannelDef;
  state: CycleCompositionState;
}

export interface CycleChart {
  kind: CycleKind;
  ordinal: number;
  /** Mốc chu kỳ. */
  jdUT: number;
  /**
   * Chart ĐẦY ĐỦ tại mốc chu kỳ — có cả cạnh design riêng và Incarnation Cross
   * riêng. Đo đối chiếu: "Cycle Design date" và "Cycle cross" của ta trùng khít
   * ở cả hai ca, nên đây đúng là một lá số hoàn chỉnh chứ không phải transit.
   */
  cycle: RaveChart;
  definedGates: ReadonlySet<number>;
  definedChannels: readonly ChannelDef[];
  definedCenters: ReadonlySet<CenterId>;
  channels: readonly CycleChannel[];
  counts: Readonly<Record<CycleCompositionState, number>>;
}

/** Phân loại một kênh composite theo số cổng mỗi bên giữ. */
export function cycleChannelState(natalGates: number, cycleGates: number): CycleCompositionState {
  if (natalGates === 2) return 'Natal';
  if (cycleGates === 2) return natalGates === 1 ? 'Compromise' : 'Educational';
  return 'PersonalConnection';
}

export function calculateCycleChart(
  eph: EphemerisProvider,
  natal: RaveChart,
  jdBirthUT: number,
  kind: CycleKind,
  jdRefUT: number,
  ordinal = 1,
  cfg: BodyConfig = DEFAULT_BODY_CONFIG,
): CycleChart {
  const at = kind === 'SolarReturn' || kind === 'LunarReturn'
    ? findFastCycle(eph, jdBirthUT, kind, jdRefUT).jdUT
    : findSlowCycle(eph, jdBirthUT, kind, ordinal).jdUT;

  const cycle = calculateRaveChart(eph, at, cfg);
  const struct = deriveStructure(new Set([...natal.definedGates, ...cycle.definedGates]));

  const counts: Record<CycleCompositionState, number> =
    { Natal: 0, Compromise: 0, Educational: 0, PersonalConnection: 0 };

  const channels: CycleChannel[] = struct.definedChannels.map(channel => {
    const [g1, g2] = channel.gates;
    const nA = (natal.definedGates.has(g1) ? 1 : 0) + (natal.definedGates.has(g2) ? 1 : 0);
    const nB = (cycle.definedGates.has(g1) ? 1 : 0) + (cycle.definedGates.has(g2) ? 1 : 0);
    const state = cycleChannelState(nA, nB);
    counts[state]++;
    return { channel, state };
  });

  return {
    kind, ordinal, jdUT: at, cycle,
    definedGates: struct.definedGates,
    definedChannels: struct.definedChannels,
    definedCenters: struct.definedCenters,
    channels, counts,
  };
}
