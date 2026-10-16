/**
 * Tỉ lệ tương phản theo WCAG 2.x — thuần, không React, không DOM.
 *
 * Dùng cho cổng kiểm bảng màu (`__tests__/contrast.spec.ts`). Lỗi "số cổng vô
 * hình" ngày 2026-09-22 (`gateTextOnFill` trắng trên đĩa trắng ⇒ 1.00:1, trung
 * tâm Throat mất sạch 9 số) lọt được là vì trước đó KHÔNG có luật nào về màu;
 * tôi bắt bằng mắt chứ không bằng test. File này để chuyện đó không tái diễn.
 *
 * Công thức: WCAG 2.2 §Relative luminance và §Contrast ratio.
 * Ngưỡng: 4.5:1 cho chữ nhỏ (§1.4.3), 3:1 cho ranh giới đồ hoạ (§1.4.11).
 */

/** `#rgb` hoặc `#rrggbb` → [r, g, b] trong 0..255. */
export function parseHex(hex: string): [number, number, number] {
  const h = hex.trim().replace(/^#/, '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`màu không đọc được: ${hex}`);
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

/** Độ sáng tương đối theo WCAG (0 = đen, 1 = trắng). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(v => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Tỉ lệ tương phản giữa hai màu, luôn ≥ 1. Thứ tự không quan trọng. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a), lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Chữ trên nền màu tuỳ ý: trắng hay gần đen — cái nào tương phản hơn. */
export const textOnFill = (fill: string): string =>
  contrastRatio(fill, '#ffffff') >= contrastRatio(fill, '#111111') ? '#ffffff' : '#111111';

/**
 * Chữ `current` trên nền một hay NHIỀU màu (đĩa sọc "Cả hai" = hai màu phía):
 * GIỮ nguyên nếu đạt 4.5:1 với mọi màu nền — bộ màu mặc định đều đạt nên không
 * đổi pixel nào; không đạt (màu người dùng tự chọn quá sáng) thì trắng hay gần
 * đen, cái nào có tương phản TỆ NHẤT cao hơn. Illustrator, Hưng chọn 2026-09-29
 * (PLAN-SUA-DESIGN-SYSTEM mục 5, phương án A: cả lưới 64 ô lẫn bản vẽ).
 */
export function readableOn(current: string, fills: readonly string[]): string {
  const worst = (c: string) => Math.min(...fills.map(f => contrastRatio(f, c)));
  if (worst(current) >= 4.5) return current;
  return worst('#ffffff') >= worst('#111111') ? '#ffffff' : '#111111';
}
