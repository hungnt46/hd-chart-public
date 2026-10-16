/**
 * Hình học Rave Mandala — bánh xe 64 cổng. THUẦN dữ liệu, không React.
 *
 * Ánh xạ kinh độ hoàng đạo → góc màn hình được **đo từ chính bản của Jovian
 * Archive** (chế độ Mandala, 2026-09-21): đọc toạ độ cả
 * 64 nhãn cổng, giải ra hằng số. Xem MANDALA_ZERO_SCREEN_DEG.
 */
import { DEG_PER_GATE, WHEEL, WHEEL_OFFSET, mod360 } from '../../calc-core/rave/constants.js';

export const VIEWBOX = { size: 620 };
export const CENTER = { x: 310, y: 310 };

/** Bán kính các vành, từ ngoài vào. */
export const RADII = {
  gateOuter: 300,
  gateInner: 262,
  /** Vành hành tinh Design (đỏ) — nằm ngoài. */
  design: 240,
  /** Vành hành tinh Personality (đen) — nằm trong. */
  personality: 212,
  hub: 190,
} as const;

/**
 * Góc màn hình (độ, chiều kim đồng hồ từ 12 giờ) ứng với kinh độ hoàng đạo 0°.
 *
 * ★ ĐO ĐƯỢC, không phải chọn: `gócMànHình = 268.26 − kinhĐộ (mod 360)`.
 * Khớp cả 64 cổng với sai số trung bình 0.05°, tối đa 0.15°.
 * Giả thuyết "tròn 270°" (quy ước 0° Bạch Dương ở 9 giờ) sai trung bình 1.74°.
 *
 * ⚠️ Hằng số này CHỈ xoay toàn bộ bức tranh. Vì ranh giới cổng và điểm hành tinh
 * đều dùng chung nó, hành tinh luôn rơi đúng ô bất kể giá trị — tính đúng không
 * phụ thuộc vào nó. Nó chỉ quyết định bức tranh có trùng hướng với bản gốc không.
 */
export const MANDALA_ZERO_SCREEN_DEG = 268.26;

/** Kinh độ hoàng đạo → góc màn hình (độ, chiều kim đồng hồ từ 12 giờ). */
export const longitudeToScreenDeg = (longitude: number): number =>
  mod360(MANDALA_ZERO_SCREEN_DEG - longitude);

/** Góc màn hình → toạ độ điểm trên đường tròn bán kính `r`. */
export function pointAt(screenDeg: number, r: number): [number, number] {
  const rad = (screenDeg - 90) * Math.PI / 180;   // 0° = 12 giờ
  return [CENTER.x + r * Math.cos(rad), CENTER.y + r * Math.sin(rad)];
}

export interface GateSector {
  gate: number;
  /** Ô trên bánh xe, 1..64. */
  slot: number;
  /** Kinh độ đầu/cuối/tâm của ô. */
  startLon: number;
  endLon: number;
  midLon: number;
  /** Góc màn hình tương ứng. */
  startDeg: number;
  endDeg: number;
  midDeg: number;
}

/** 64 ô theo đúng thứ tự WHEEL. */
export const SECTORS: readonly GateSector[] = Object.freeze(
  WHEEL.map((gate, i) => {
    const startLon = mod360(i * DEG_PER_GATE + WHEEL_OFFSET);
    const endLon = mod360(startLon + DEG_PER_GATE);
    const midLon = mod360(startLon + DEG_PER_GATE / 2);
    return {
      gate, slot: i + 1, startLon, endLon, midLon,
      startDeg: longitudeToScreenDeg(startLon),
      endDeg: longitudeToScreenDeg(endLon),
      midDeg: longitudeToScreenDeg(midLon),
    };
  }),
);

/** `d` của một hình quạt vành khuyên (annulus sector) giữa hai bán kính. */
export function sectorPath(startLon: number, endLon: number, rInner: number, rOuter: number): string {
  // Kinh độ tăng ⇒ góc màn hình GIẢM, nên vẽ ngược lại cho đúng chiều.
  const a0 = longitudeToScreenDeg(endLon);
  const a1 = longitudeToScreenDeg(startLon);
  const [x0o, y0o] = pointAt(a0, rOuter);
  const [x1o, y1o] = pointAt(a1, rOuter);
  const [x1i, y1i] = pointAt(a1, rInner);
  const [x0i, y0i] = pointAt(a0, rInner);
  const sweep = mod360(a1 - a0) > 180 ? 1 : 0;
  return [
    `M ${x0o.toFixed(2)} ${y0o.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${sweep} 1 ${x1o.toFixed(2)} ${y1o.toFixed(2)}`,
    `L ${x1i.toFixed(2)} ${y1i.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${sweep} 0 ${x0i.toFixed(2)} ${y0i.toFixed(2)}`,
    'Z',
  ].join(' ');
}
