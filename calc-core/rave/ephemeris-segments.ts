/**
 * Lịch Thiên văn Rave kiểu Gantt — STATUS §4 B5. Với mỗi thiên thể: dãy ĐOẠN
 * `cổng.hào` liền nhau phủ một khoảng thời gian, mỗi đoạn mang mốc bắt đầu/kết
 * thúc THẬT (có thể nằm ngoài khoảng xem) và quan hệ với chart người.
 *
 * Học từ tab EPHEMERIS của một ứng dụng tham chiếu (fixture đối chiếu
 * 2026-09-23, phần ephemeris tab): hàng = thiên thể, ô = một hào rộng đúng bằng thời gian
 * nó kéo dài, bốn màu theo quan hệ với chart người.
 *
 * Dùng CHUNG máy dò với bảng "Thay đổi sắp tới" (`changes.ts`: bước + chia đôi
 * tới dưới 1 giây) nên mép đoạn ở đây trùng ĐÚNG mốc đổi ở bảng kia — hai chỗ
 * trên cùng một trang mà lệch nhau vài giây là người dùng mất tin.
 */
import type { EphemerisProvider } from '../ephemeris/provider.js';
import { Body, DEFAULT_BODY_CONFIG, type BodyConfig } from '../ephemeris/bodies.js';
import {
  bisect, bodySpeed, gateLineAt, HORIZON_DAYS, keyOf, NEVER_RETRO, STEP_DAYS, type ChangeLevel,
} from './changes.js';
import { channelsContaining } from './derive/tables.js';

export interface EphemerisSegment {
  gate: number;
  /** Mức `'gate'`: hào tại mép VÀO phần đoạn nằm trong khoảng xem — chỉ để tham khảo. */
  line: number;
  /** Lúc thiên thể VÀO hào này (UT, Julian day) — có thể trước khoảng xem. */
  jdStart: number;
  /** Lúc RỜI hào — có thể sau khoảng xem. */
  jdEnd: number;
  /** Đi lùi ở giữa phần đoạn nằm trong khoảng xem. Luôn `false` với Mặt Trời, Trái Đất, Mặt Trăng. */
  retrograde: boolean;
}

/**
 * Quan hệ của cổng transit với chart người — đúng bốn nghĩa chú giải của bản tham chiếu:
 * `transit` chỉ transit · `same` người CŨNG có cổng này · `harmonic` người có
 * cổng ĐỐI (đầu kia một kênh) ⇒ tạm thời thành kênh · `both` cả hai.
 */
export type SegmentRelation = 'transit' | 'same' | 'harmonic' | 'both';

export function segmentRelation(gate: number, personGates: ReadonlySet<number>): SegmentRelation {
  const same = personGates.has(gate);
  const harmonic = channelsContaining(gate).some(ch => {
    const other = ch.gates[0] === gate ? ch.gates[1] : ch.gates[0];
    return personGates.has(other);
  });
  return same && harmonic ? 'both' : same ? 'same' : harmonic ? 'harmonic' : 'transit';
}

/**
 * Các đoạn hào phủ `[jdFrom, jdTo]`, theo thứ tự thời gian, LIỀN NHAU (mép cuối
 * đoạn này = mép đầu đoạn sau). Đoạn đầu và đoạn cuối được dò tiếp ra ngoài
 * khoảng để có mốc vào/ra thật — Sao Diêm Vương ở một hào cả năm, chú thích
 * "từ … đến …" mà cắt theo khung nhìn thì nói sai.
 *
 * `level = 'gate'`: đoạn là CỔNG thay vì hào (bảng Planetary Influence) — cùng
 * máy dò, cùng mép, chỉ khác khoá (`keyOf`), nên mép cổng trùng đúng mép hào.
 */
export function bodySegments(
  eph: EphemerisProvider, jdFrom: number, jdTo: number, body: Body,
  cfg: BodyConfig = DEFAULT_BODY_CONFIG, level: ChangeLevel = 'line',
): EphemerisSegment[] {
  if (!(jdTo > jdFrom)) throw new RangeError('bodySegments: jdTo phải sau jdFrom');
  const step = STEP_DAYS[body] ?? 0.5;
  const keyAt = (jd: number) => keyOf(gateLineAt(eph, jd, body, cfg), level);

  /** Mốc VÀO ô đang chứa `jd`: lùi từng bước tới khi khoá khác, rồi chia đôi. */
  const startOf = (jd: number): number => {
    const k = keyAt(jd);
    let hi = jd;
    for (let t = jd - step; t >= jd - HORIZON_DAYS; t -= step) {
      if (keyAt(t) !== k) {
        // bisect() tìm mốc ĐẦU TIÊN có khoá khác k0 khi đi TỚI, nên chạy trên
        // khoá "ngoài ô" rồi lấy mép đó: đó chính là lúc vào ô.
        return bisect(t, hi, keyAt(t), keyAt);
      }
      hi = t;
    }
    throw new RangeError(`bodySegments: ${Body[body]} không đổi hào trong ${HORIZON_DAYS} ngày`);
  };
  /** Mốc RỜI ô đang chứa `jd`. */
  const endOf = (jd: number): number => {
    const k = keyAt(jd);
    let lo = jd;
    for (let t = jd + step; t <= jd + HORIZON_DAYS; t += step) {
      if (keyAt(t) !== k) return bisect(lo, t, k, keyAt);
      lo = t;
    }
    throw new RangeError(`bodySegments: ${Body[body]} không đổi hào trong ${HORIZON_DAYS} ngày`);
  };

  const out: EphemerisSegment[] = [];
  let start = startOf(jdFrom);
  let at = jdFrom;
  while (at < jdTo) {
    const end = endOf(at);
    const g = gateLineAt(eph, at, body, cfg);
    const mid = (Math.max(start, jdFrom) + Math.min(end, jdTo)) / 2;
    out.push({
      gate: g.gate, line: g.line, jdStart: start, jdEnd: end,
      retrograde: !NEVER_RETRO.has(body) && bodySpeed(eph, mid, body, cfg) < 0,
    });
    start = end;
    at = end;
  }
  return out;
}

const MERGE_TOLERANCE_DAYS = 10 / 86400;

/**
 * Nối hai dãy đoạn của CÙNG thiên thể, `a` phủ trước `b` (có thể chồng nhau).
 * Dùng khi khung nhìn cuộn thêm ra hai phía: chỉ dò phần mới rồi nối, không dò
 * lại cả khoảng. Đoạn trùng (cùng hào, cùng mốc vào) chỉ giữ một.
 */
export function mergeSegments(a: readonly EphemerisSegment[], b: readonly EphemerisSegment[]): EphemerisSegment[] {
  const out = [...a];
  for (const s of b) {
    const last = out[out.length - 1];
    // Hai lần dò cùng một mép có thể lệch nhau tới độ phân giải chia đôi
    // (¼ giây) — so với dung sai 10 giây, còn xa mới bằng hào ngắn nhất (~1.5 giờ).
    if (last && s.jdStart < last.jdEnd - MERGE_TOLERANCE_DAYS) continue; // đã có
    out.push(s);
  }
  return out;
}
