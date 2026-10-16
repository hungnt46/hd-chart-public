/**
 * Bố cục thuần của Mandala — không React, có test.
 *
 * Hai việc:
 *   1. `bandSlots` — xếp ký hiệu hành tinh TRONG NHÁNH QUẠT của cổng nó kích
 *      hoạt (Hưng, 2026-09-25, lần góp ý thứ hai). Mandala chia 64 nhánh quạt
 *      từ vành cổng vào tới tâm; hành tinh ở cổng nào nằm gọn giữa nhánh đó,
 *      KHÔNG có vạch nối nào. Design ở dải ngoài, Personality ở dải trong; nhiều
 *      hành tinh cùng phía ở cùng một cổng thì XẾP CHỒNG theo bán kính.
 *      Hai bản trước đều bị bác: (a) chấm + vạch xuyên tâm + ký hiệu đè nhau;
 *      (b) vạch đúng vị trí + ký hiệu dàn theo cung, có nét nối khi bị xê dịch —
 *      Hưng: "vẫn đang bị kẻ line nối vào mandala, nhìn rất lặt vặt chướng mắt".
 *      Cái mất đi là vị trí CHÍNH XÁC trong cổng (tới hào) — cột hành tinh và bảng
 *      tra cứu vẫn ghi đủ cổng.hào.
 *   2. `hubFit` — thu bodygraph ở tâm cho VỪA vòng trong, không che dải hành
 *      tinh nào.
 */
import { pathPoints } from '../bodygraph/svg-path.js';

export type Side = 'design' | 'personality';

/**
 * Hai dải hành tinh, đơn vị viewBox 620 (vành cổng 262–300 là số đo Jovian, không
 * đổi). Design ngoài, Personality trong — quy ước màu/vị trí có từ bản đầu.
 */
export const BANDS: Readonly<Record<Side, { outer: number; inner: number }>> = Object.freeze({
  design: { outer: 258, inner: 226 },
  personality: { outer: 222, inner: 192 },
});

/** Cỡ ký hiệu mặc định và khe giữa hai ký hiệu xếp chồng. */
export const GLYPH = 14;
export const GLYPH_GAP = 1;

export interface Slot {
  /** Bán kính tâm ký hiệu. */
  r: number;
  /** Cỡ ký hiệu (đơn vị viewBox). */
  size: number;
}

/**
 * Chỗ cho `n` ký hiệu cùng phía trong cùng một nhánh quạt: chồng theo bán kính,
 * canh giữa dải. Dải không đủ chỗ cho `n` ký hiệu cỡ `GLYPH` thì THU cỡ lại cho
 * vừa, chứ không tràn sang dải kia hay đè lên bodygraph ở tâm.
 * Thứ tự: phần tử đầu ở NGOÀI cùng.
 */
export function bandSlots(n: number, side: Side): Slot[] {
  if (n <= 0) return [];
  const { outer, inner } = BANDS[side];
  const width = outer - inner;
  const pitch = Math.min(GLYPH + GLYPH_GAP, width / n);
  const size = Math.min(GLYPH, pitch - GLYPH_GAP);
  const mid = (outer + inner) / 2;
  const first = mid + ((n - 1) / 2) * pitch;
  return Array.from({ length: n }, (_, k) => ({ r: first - k * pitch, size }));
}

export interface HubFit {
  /** Tâm của phần hình (không tính nền), đơn vị khung bản vẽ. */
  cx: number; cy: number;
  /** Khoảng cách xa nhất từ tâm tới một điểm của trung tâm nào đó. */
  rMax: number;
}

/**
 * Tâm và bán kính bao của MẠNG LƯỚI bodygraph (chín trung tâm — các điểm xa
 * tâm nhất đều là đỉnh trung tâm: đỉnh Head, đáy Root, mũi Spleen / Đám Rối),
 * tính từ chính path trong `artworks/*.json`. Nền tam giác / bóng người KHÔNG
 * tính — ở tâm mandala nền được bỏ.
 */
export function hubFit(centerPaths: readonly string[]): HubFit {
  const pts = centerPaths.flatMap(d => pathPoints(d));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const rMax = Math.max(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy)));
  return { cx, cy, rMax };
}
