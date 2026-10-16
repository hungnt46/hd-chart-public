/**
 * Hình học BỐ CỤC của khung biểu đồ — thuần, không React, có unit test.
 *
 * Khung biểu đồ là MỘT HÀNG: [cột trái?] [biểu đồ] [cột phải?]. Mọi phần tử cao
 * BẰNG NHAU (cột hành tinh cùng hệ tỉ lệ với bodygraph — số đo tham chiếu, xem
 * `PlanetColumn`), nên cả hàng có một tỉ lệ rộng/cao R duy nhất:
 *
 *     R = A (biểu đồ) + Σ Bᵢ (các cột)          — A, B là rộng/cao của viewBox
 *
 * Khung "vừa khung" thì rộng = min(bề ngang có, chiều cao có × R). Từ đó suy ra
 * cỡ chữ số cổng thật trên màn hình — con số mà luật 8px canh.
 *
 * ★ 8px đo bằng TỈ LỆ THẬT của biểu đồ, không bằng bề ngang hộp SVG. Audit
 *   2026-09-25 bắt được test cũ đọc 8.5px trong khi chữ thật chỉ 6.0px: hộp SVG
 *   rộng 880px nhưng `max-h-[78vh]` + `preserveAspectRatio` thu NỘI DUNG theo
 *   chiều cao. Bố cục mới không còn `max-h` nào đè lên tỉ lệ — cả hàng được cấp
 *   đúng R nên hộp và nội dung trùng nhau.
 */

/** Ngưỡng đọc được của số cổng — KHÔNG hạ (CLAUDE.md, BAN-GIAO-THIET-KE §4b). */
export const GATE_TEXT_MIN_PX = 8;
/** Mức "đọc" đặt nhỉnh hơn ngưỡng một chút để làm tròn điểm ảnh không kéo về 7.99. */
const READ_TARGET_PX = 8.25;

/**
 * Cỡ chữ số cổng theo ĐƠN VỊ KHUNG của bản vẽ. Phải khớp đúng công thức ở
 * `BodygraphArtwork.tsx` (`fontSize={b.r * 1.08}`) — có test ghim hai chỗ.
 * Chữ đã lấp gần kín huy hiệu nên KHÔNG tăng được mà không đổi hình học:
 * cách duy nhất để chữ to hơn là vẽ cả biểu đồ to hơn.
 */
export const gateFontUnits = (badgeRadius: number): number => badgeRadius * 1.08;

export interface RowSpec {
  /** Rộng/cao của biểu đồ (viewBox). Mandala = 1. */
  chart: number;
  /** Rộng/cao của cột trái / phải, bỏ trống nếu không có. */
  left?: number;
  right?: number;
}

export const rowRatio = (s: RowSpec): number => s.chart + (s.left ?? 0) + (s.right ?? 0);

/** Bề ngang từng phần theo PHẦN TRĂM của cả hàng. */
export function rowPercents(s: RowSpec): { left: number; chart: number; right: number } {
  const r = rowRatio(s);
  return { left: ((s.left ?? 0) / r) * 100, chart: (s.chart / r) * 100, right: ((s.right ?? 0) / r) * 100 };
}

/** Bề ngang của hàng khi "vừa khung" trong một vùng `w × h` (px). `h` vô hạn = chỉ theo bề ngang. */
export const fitWidth = (s: RowSpec, w: number, h = Infinity): number => Math.min(w, h * rowRatio(s));

/**
 * Cỡ chữ số cổng (px) khi cả hàng rộng `rowWidthPx`.
 * `vbWidth` là bề ngang viewBox của bản vẽ, `fontUnits` từ `gateFontUnits`.
 */
export function gateTextPx(s: RowSpec, rowWidthPx: number, vbWidth: number, fontUnits: number): number {
  const chartPx = rowWidthPx * (s.chart / rowRatio(s));
  return (chartPx / vbWidth) * fontUnits;
}

/**
 * Hệ số phóng (so với "vừa khung") để số cổng đạt mức đọc. ≤ 1 nghĩa là vừa
 * khung đã đọc được — khi đó mức "đọc" chính là vừa khung.
 */
export function readZoom(s: RowSpec, fitWidthPx: number, vbWidth: number, fontUnits: number): number {
  const now = gateTextPx(s, fitWidthPx, vbWidth, fontUnits);
  return now > 0 ? READ_TARGET_PX / now : 1;
}

/** Các nấc phóng: vừa khung → đọc được → ×1.5 → ×2 (tính từ mức đọc). */
export function zoomSteps(read: number): number[] {
  const base = Math.max(1, read);
  const steps = [1, base, base * 1.5, base * 2];
  return steps.filter((z, i) => i === 0 || z > steps[i - 1]! + 0.01);
}
