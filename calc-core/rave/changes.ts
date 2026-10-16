/**
 * Bảng "Changes" — STATUS §4 B2. Với mỗi thiên thể: cổng/hào hiện tại, cổng/hào
 * KẾ TIẾP, thời điểm đổi, và trạng thái nghịch hành.
 *
 * Học từ tab "Changes" của một ứng dụng tham chiếu (fixture đối chiếu
 * 2026-09-23 trong `calc-core/__fixtures__/reference/`, phần side panel Changes):
 * cột Planet · Current · Next · Shifting Time (+ đếm ngược) · Retrograde, và
 * công tắc Gate/Lines.
 *
 * ★ Ba điều không hiển nhiên:
 *
 * 1. KẾ TIẾP theo THỜI GIAN, không theo thứ tự bánh xe. Hành tinh đang nghịch
 *    hành thì ô kế tiếp là ô TRƯỚC nó trên bánh xe (bản tham chiếu ghi Node
 *    "30.6 → 30.5"). Vì vậy không tính "biên kế tiếp" bằng hình học rồi giải
 *    thời gian — mà bước theo thời gian cho tới khi vị trí đổi, rồi chia đôi.
 *    Cách này cũng đúng khi hành tinh dừng và quay đầu ngay trong ô hiện tại.
 *
 * 2. ĐỔI CHIỀU cũng là một thay đổi. Bản tham chiếu ghi Pluto "41.2 R → 41.2 D"
 *    ở mốc nó dừng nghịch hành, dù ô chưa đổi. Nên "kế tiếp" = sự kiện đến TRƯỚC
 *    giữa đổi ô và đổi chiều (`event`). Node thì không tính đổi chiều — xem
 *    `station`.
 *
 * 3. BƯỚC phải đủ nhỏ để không nhảy qua trọn một ô. Hào rộng 0.9375°; Mặt Trăng
 *    đi ~13–15°/ngày ⇒ bước 0.01 ngày (~0.15°). Hành tinh chậm đi < 0.1°/ngày ⇒
 *    bước 1 ngày. Bảng `STEP_DAYS` ghi rõ vì sao từng con số.
 */
import type { EphemerisProvider } from '../ephemeris/provider.js';
import {
  Body, DEFAULT_BODY_CONFIG, DEFINING_BODIES_STANDARD, iplFor, type BodyConfig,
} from '../ephemeris/bodies.js';
import { mod360 } from './constants.js';
import { longitudeToPosition } from './position.js';

export type ChangeLevel = 'gate' | 'line';

export interface GateLine { gate: number; line: number }
/** Ô + chiều đi. `retrograde` luôn `false` với Mặt Trời, Trái Đất, Mặt Trăng. */
export interface CellState extends GateLine { retrograde: boolean }

export interface BodyChange {
  body: Body;
  current: CellState;
  next: CellState;
  /** Thời điểm chuyển sang `next` (UT, Julian day). */
  jdChange: number;
  /** Cái gì đổi: sang ô khác, hay dừng rồi đổi chiều ngay trong ô hiện tại. */
  event: 'cell' | 'station';
  /** Đang đi lùi tại mốc tham chiếu (= `current.retrograde`). */
  retrograde: boolean;
  /**
   * Lần DỪNG kế tiếp (tốc độ đổi dấu): `retrograde` = bắt đầu đi lùi, `direct` =
   * đi thuận trở lại. `null` với thiên thể không bao giờ nghịch hành (Mặt Trời,
   * Trái Đất, Mặt Trăng) và với hai Node — Node thật lắc qua lại liên tục nên
   * "dừng" của nó không mang nghĩa như hành tinh (bản tham chiếu cũng để trống).
   */
  station: { jdUT: number; kind: 'retrograde' | 'direct' } | null;
}

/**
 * Bước quét (ngày). Nhỏ hơn thời gian ngắn nhất để đi hết MỘT HÀO (0.9375°) với
 * tốc độ lớn nhất của thiên thể, chia thêm ~4 cho an toàn.
 */
export const STEP_DAYS: Readonly<Partial<Record<Body, number>>> = {
  [Body.Moon]: 0.01,                                   // ≤ 15.4°/ngày
  [Body.Sun]: 0.1, [Body.Earth]: 0.1,                  // ≈ 1°/ngày
  [Body.Mercury]: 0.05, [Body.Venus]: 0.1, [Body.Mars]: 0.1, // ≤ 2.2 / 1.3 / 0.8 °/ngày
  [Body.NorthNode]: 0.25, [Body.SouthNode]: 0.25,     // node thật: lắc tới ~0.2°/ngày
  [Body.Jupiter]: 0.5, [Body.Saturn]: 0.5,
  [Body.Uranus]: 1, [Body.Neptune]: 1, [Body.Pluto]: 1,
};
/** Chân trời tìm: đủ cho Pluto đi hết một hào kể cả khi quay đầu giữa chừng. */
export const HORIZON_DAYS = 3 * 365.25;
const STATION_HORIZON_DAYS = 2 * 365.25;
export const NEVER_RETRO: ReadonlySet<Body> = new Set([Body.Sun, Body.Earth, Body.Moon]);
export const NODES: ReadonlySet<Body> = new Set([Body.NorthNode, Body.SouthNode]);
/** Chia đôi tới dưới một giây. */
export const BISECT_DAYS = 1 / 86400 / 4;

export function bodyLongitude(eph: EphemerisProvider, jdUT: number, body: Body, cfg: BodyConfig): number {
  if (body === Body.Earth) return mod360(bodyLongitude(eph, jdUT, Body.Sun, cfg) + 180);
  if (body === Body.SouthNode) return mod360(bodyLongitude(eph, jdUT, Body.NorthNode, cfg) + 180);
  const ipl = iplFor(body, cfg);
  if (ipl === null) throw new Error(`Thiếu ipl cho thiên thể ${Body[body]}`);
  return mod360(eph.longitude(jdUT, ipl));
}

/** Tốc độ (°/ngày), sai phân trung tâm, đã xử lý nhảy 360°→0°. */
export function bodySpeed(eph: EphemerisProvider, jdUT: number, body: Body, cfg: BodyConfig): number {
  const h = 0.005;
  let d = bodyLongitude(eph, jdUT + h, body, cfg) - bodyLongitude(eph, jdUT - h, body, cfg);
  if (d > 180) d -= 360; else if (d < -180) d += 360;
  return d / (2 * h);
}

export const gateLineAt = (eph: EphemerisProvider, jd: number, body: Body, cfg: BodyConfig): GateLine => {
  const p = longitudeToPosition(bodyLongitude(eph, jd, body, cfg));
  return { gate: p.gate, line: p.line };
};
export const keyOf = (g: GateLine, level: ChangeLevel) => (level === 'gate' ? g.gate : g.gate * 10 + g.line);

/** Chia đôi giữa `lo` (khoá = `k0`) và `hi` (khoá khác) tới dưới một giây. */
export function bisect(lo: number, hi: number, k0: number, keyAt: (jd: number) => number): number {
  while (hi - lo > BISECT_DAYS) {
    const mid = (lo + hi) / 2;
    if (keyAt(mid) === k0) lo = mid; else hi = mid;
  }
  return hi;
}

export function nextChange(
  eph: EphemerisProvider, jdRef: number, body: Body, level: ChangeLevel,
  cfg: BodyConfig = DEFAULT_BODY_CONFIG,
): BodyChange {
  const step = STEP_DAYS[body] ?? 0.5;
  const keyAt = (jd: number) => keyOf(gateLineAt(eph, jd, body, cfg), level);
  const current = gateLineAt(eph, jdRef, body, cfg);
  const k0 = keyOf(current, level);

  let lo = jdRef, hi = NaN;
  for (let jd = jdRef + step; jd <= jdRef + HORIZON_DAYS; jd += step) {
    if (keyAt(jd) !== k0) { hi = jd; break; }
    lo = jd;
  }
  if (Number.isNaN(hi)) {
    throw new RangeError(`nextChange: ${Body[body]} không đổi ${level} trong ${HORIZON_DAYS} ngày`);
  }
  const jdChange = bisect(lo, hi, k0, keyAt);

  const speed = bodySpeed(eph, jdRef, body, cfg);
  let station: BodyChange['station'] = null;
  if (!NEVER_RETRO.has(body) && !NODES.has(body)) {
    const sign0 = Math.sign(speed);
    const sStep = Math.max(step, 0.25);
    let a = jdRef;
    for (let jd = jdRef + sStep; jd <= jdRef + STATION_HORIZON_DAYS; jd += sStep) {
      if (Math.sign(bodySpeed(eph, jd, body, cfg)) !== sign0) {
        let b = jd;
        while (b - a > BISECT_DAYS) {
          const m = (a + b) / 2;
          if (Math.sign(bodySpeed(eph, m, body, cfg)) === sign0) a = m; else b = m;
        }
        station = { jdUT: b, kind: sign0 > 0 ? 'retrograde' : 'direct' };
        break;
      }
      a = jd;
    }
  }

  const retro = (jd: number) => !NEVER_RETRO.has(body) && bodySpeed(eph, jd, body, cfg) < 0;
  const retrograde = speed < 0 && !NEVER_RETRO.has(body);
  const cur: CellState = { ...current, retrograde };
  if (station && station.jdUT < jdChange) {
    return { body, current: cur, next: { ...current, retrograde: station.kind === 'retrograde' },
             jdChange: station.jdUT, event: 'station', retrograde, station };
  }
  const after = jdChange + BISECT_DAYS;
  return {
    body, current: cur, next: { ...gateLineAt(eph, after, body, cfg), retrograde: retro(after) },
    jdChange, event: 'cell', retrograde, station,
  };
}

/** Cả bảng, theo thứ tự cột hành tinh (`DEFINING_BODIES_STANDARD`, Moon trước Node). */
export function nextChanges(
  eph: EphemerisProvider, jdRef: number, level: ChangeLevel,
  cfg: BodyConfig = DEFAULT_BODY_CONFIG,
  bodies: readonly Body[] = DEFINING_BODIES_STANDARD,
): BodyChange[] {
  return bodies.map(b => nextChange(eph, jdRef, b, level, cfg));
}

/**
 * Bảng thay đổi ở mốc `jdRef` khi đã có bảng ở mốc SỚM HƠN `prev.jdRef`.
 *
 * ★ Chế độ Trực tiếp tính lại mỗi 30 s; quét lại cả 13 thiên thể mỗi nhịp là lãng
 *   phí: chừng nào CHƯA tới lần đổi gần nhất của một thiên thể (`jdChange` — đã gồm
 *   cả lần dừng nếu nó tới trước), ô hiện tại, ô kế tiếp, giờ đổi, chiều đi và lần
 *   dừng kế tiếp của nó đều y nguyên ⇒ dùng lại dòng cũ. Chỉ tính lại dòng đã qua
 *   mốc, và LUÔN tính lại hai Node: Node thật lắc qua lại liên tục nên `retrograde`
 *   của nó đổi mà không có sự kiện nào báo trước.
 *
 * Kết quả giống `nextChanges(eph, jdRef, level)`: ô, sự kiện, chiều đi y hệt; thời điểm lệch
 * dưới `BISECT_DAYS` (¼ giây — quét từ mốc khác thì điểm chia đôi khác chút). Có test ghim.
 */
export function advanceChanges(
  eph: EphemerisProvider, prev: { jdRef: number; rows: readonly BodyChange[] }, jdRef: number, level: ChangeLevel,
  cfg: BodyConfig = DEFAULT_BODY_CONFIG,
): BodyChange[] {
  if (!(jdRef >= prev.jdRef)) return nextChanges(eph, jdRef, level, cfg, prev.rows.map(r => r.body));
  return prev.rows.map(r => (NODES.has(r.body) || r.jdChange <= jdRef
    ? nextChange(eph, jdRef, r.body, level, cfg)
    /* Mức CỔNG: `current` còn mang số hào, mà hào đổi bên trong cổng không phải sự kiện
       của mức này ⇒ đọc lại ô hiện tại (một lần tra kinh độ). Chiều đi giữ nguyên. */
    : { ...r, current: { ...gateLineAt(eph, jdRef, r.body, cfg), retrograde: r.current.retrograde } }));
}
