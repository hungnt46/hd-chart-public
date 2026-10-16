/**
 * Hằng số tính toán Rave — SPEC.md §5.
 *
 * TẤT CẢ giá trị trong file này là CONFIRMED: khớp đúng từng số với phần mềm
 * tham chiếu (ghi chép nội bộ).
 *
 * ⚠️ KHÔNG viết lại các số này ở bất kỳ nơi nào khác. Luôn import từ đây.
 */

/** 360 / 64. Chiều rộng một cổng trên bánh xe, độ. CONFIRMED. */
export const DEG_PER_GATE = 5.625;

/** Góc xoay của Rave Mandala so với 0° Aries nhiệt đới, độ. CONFIRMED. */
export const WHEEL_OFFSET = 3.875;

/** Cung mà Mặt Trời phải lùi để ra thời điểm Design, độ. CONFIRMED. */
export const DESIGN_ARC = -88;

/** Số cổng trên bánh xe. */
export const GATE_COUNT = 64;

/**
 * Thứ tự cổng trên bánh xe Rave Mandala — `int[64]` literal trong static ctor
 * của `Generator`. CONFIRMED. `gate = WHEEL[gateSlot - 1]`; ô 1 = Gate 17.
 */
export const WHEEL: readonly number[] = Object.freeze([
  17, 21, 51, 42,  3, 27, 24,  2, 23,  8, 20, 16, 35, 45, 12, 15,
  52, 39, 53, 62, 56, 31, 33,  7,  4, 29, 59, 40, 64, 47,  6, 46,
  18, 48, 57, 32, 50, 28, 44,  1, 43, 14, 34,  9,  5, 26, 11, 10,
  58, 38, 54, 61, 60, 41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25,
]);

// ---- Các mức chia trong một cổng (SPEC §5.4) — CONFIRMED ----
export const LINES_PER_GATE  = 6;
export const COLORS_PER_LINE = 6;
export const TONES_PER_COLOR = 6;
/** ★ 5 Base, KHÔNG phải 6. Cái bẫy kinh điển của HD. CONFIRMED. */
export const BASES_PER_TONE  = 5;

export const DEG_PER_LINE  = DEG_PER_GATE / LINES_PER_GATE;    // 0.9375
export const DEG_PER_COLOR = DEG_PER_LINE / COLORS_PER_LINE;   // 0.15625
export const DEG_PER_TONE  = DEG_PER_COLOR / TONES_PER_COLOR;  // 0.0260416666…
export const DEG_PER_BASE  = DEG_PER_TONE / BASES_PER_TONE;    // 0.0052083333…

/** Một độ = 3600 arcsec. */
export const ARCSEC_PER_DEG = 3600;

// ---- Cầu nối Swiss Ephemeris (SPEC §5.7) — CONFIRMED ----
/** `iflag = 2` trong `swe_calc_ut`. Dùng file .se1 của Swiss Ephemeris. */
export const SEFLG_SWIEPH = 2;
/** `gregflag = 1` trong `swe_julday`. Lịch Gregory. */
export const GREGFLAG_GREGORIAN = 1;

/** Chuẩn hoá về [0, 360). */
export const mod360 = (deg: number): number => ((deg % 360) + 360) % 360;

/**
 * Kinh độ khởi đầu của một cổng, độ. Dùng cho test bất biến và cho mandala SVG.
 * Nghịch đảo của phép chia ở position.ts.
 */
export function gateStartLongitude(gate: number): number {
  const slotIndex = WHEEL.indexOf(gate);
  if (slotIndex < 0) throw new RangeError(`Cổng không hợp lệ: ${gate}`);
  return mod360(slotIndex * DEG_PER_GATE + WHEEL_OFFSET);
}
