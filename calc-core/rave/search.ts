/**
 * Tìm thời điểm một thiên thể đạt một kinh độ — SPEC.md §5.5.
 *
 * ★ Viết TỔNG QUÁT ngay từ Phase 1 (không viết riêng cho −88°), để Phase 5
 *   (Cycle: Saturn/Uranus/Chiron/Solar/Lunar return) dùng lại mà không sửa lõi.
 */
import { mod360 } from './constants.js';
import type { EphemerisProvider } from '../ephemeris/provider.js';

/** Dung sai hội tụ, đơn vị ngày Julian. 1e−9 ngày ≈ 0.09 ms. */
export const SEARCH_TOLERANCE_DAYS = 1e-9;

export interface SearchResult {
  jdUT: number;
  iterations: number;
  /** Sai lệch còn lại so với kinh độ mục tiêu, độ. */
  residualDeg: number;
}

/** Chênh lệch có dấu trên cung, kết quả trong (−180, 180]. */
const signedDelta = (a: number, b: number): number => {
  const d = mod360(a - b);
  return d > 180 ? d - 360 : d;
};

/**
 * Tìm `jd` trong [jdLow, jdHigh] sao cho kinh độ của `ipl` bằng `targetLon`.
 * Yêu cầu hàm sai lệch đổi dấu trên khoảng đó (bisection).
 */
export function findBodyAtLongitude(
  eph: EphemerisProvider,
  ipl: number,
  targetLon: number,
  jdLow: number,
  jdHigh: number,
  tolerance = SEARCH_TOLERANCE_DAYS,
): SearchResult {
  const f = (jd: number) => signedDelta(eph.longitude(jd, ipl), targetLon);
  let lo = jdLow, hi = jdHigh;
  let flo = f(lo), fhi = f(hi);

  if (flo === 0) return { jdUT: lo, iterations: 0, residualDeg: 0 };
  if (fhi === 0) return { jdUT: hi, iterations: 0, residualDeg: 0 };
  if (flo * fhi > 0) {
    throw new RangeError(
      `findBodyAtLongitude: khoảng [${jdLow}, ${jdHigh}] không bao vây mục tiêu ${targetLon}° ` +
      `(sai lệch hai đầu: ${flo.toFixed(4)}°, ${fhi.toFixed(4)}°)`,
    );
  }

  let iterations = 0;
  while (hi - lo > tolerance && iterations < 200) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (fm === 0) { lo = hi = mid; break; }
    if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
    iterations++;
  }
  const jdUT = (lo + hi) / 2;
  return { jdUT, iterations, residualDeg: Math.abs(f(jdUT)) };
}

/**
 * Tìm thời điểm Mặt Trời ở cách kinh độ lúc sinh đúng `arcDeg` (âm = trước).
 * `findMomentOfSolarArc(eph, jd, -88)` cho thời điểm Design (SPEC §5.5).
 *
 * Bản tham chiếu bắt đầu ở `jd − 95` ngày; ta bao vây [jd−100, jd−80] rồi bisection.
 * Mặt Trời đi ~0.953–1.019°/ngày nên −88° rơi vào 86.3–92.3 ngày trước.
 */
export function findMomentOfSolarArc(
  eph: EphemerisProvider,
  jdBirthUT: number,
  arcDeg: number,
  sunIpl = 0,
): SearchResult {
  const sunAtBirth = eph.longitude(jdBirthUT, sunIpl);
  const target = mod360(sunAtBirth + arcDeg);
  // Cửa sổ rộng hơn mức cần, nhưng vẫn đủ hẹp để Mặt Trời không quay lại target lần hai.
  const daysApprox = Math.abs(arcDeg) / 0.9856;        // ~ ngày cho cung đó
  const lo = jdBirthUT + Math.sign(arcDeg) * (daysApprox + 6);
  const hi = jdBirthUT + Math.sign(arcDeg) * (daysApprox - 6);
  return findBodyAtLongitude(eph, sunIpl, target, Math.min(lo, hi), Math.max(lo, hi));
}
