/** Thiên thể và ánh xạ sang `ipl` của Swiss Ephemeris — SPEC.md §6.2. */

/**
 * Thứ tự này là thứ tự chuẩn của bảng tham chiếu (CONFIRMED) — KHÔNG phải `ipl` của
 * Swiss Ephemeris. Earth=1 và SouthNode=4 giải thích vì sao vòng lặp hành tinh
 * của bản tham chiếu bỏ qua hai id đó (ghi chép nội bộ).
 */
export enum Body {
  Sun = 0, Earth = 1, Moon = 2, NorthNode = 3, SouthNode = 4, Mercury = 5,
  Venus = 6, Mars = 7, Jupiter = 8, Saturn = 9, Uranus = 10, Neptune = 11,
  Pluto = 12, Chiron = 13,
}

/** 14 thiên thể theo đúng thứ tự hiển thị chuẩn. */
export const ALL_BODIES: readonly Body[] = Object.freeze([
  Body.Sun, Body.Earth, Body.Moon, Body.NorthNode, Body.SouthNode, Body.Mercury,
  Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune,
  Body.Pluto, Body.Chiron,
]);

export const BODY_NAMES: Readonly<Record<Body, string>> = Object.freeze({
  [Body.Sun]: 'Sun', [Body.Earth]: 'Earth', [Body.Moon]: 'Moon',
  [Body.NorthNode]: 'NorthNode', [Body.SouthNode]: 'SouthNode',
  [Body.Mercury]: 'Mercury', [Body.Venus]: 'Venus', [Body.Mars]: 'Mars',
  [Body.Jupiter]: 'Jupiter', [Body.Saturn]: 'Saturn', [Body.Uranus]: 'Uranus',
  [Body.Neptune]: 'Neptune', [Body.Pluto]: 'Pluto', [Body.Chiron]: 'Chiron',
});

/**
 * Thiên thể lấy TRỰC TIẾP từ ephemeris → `ipl` chuẩn Swiss Ephemeris.
 * `null` = dẫn xuất bằng đối xứng (SPEC §5.6) hoặc do BodyConfig quyết định.
 */
export const BODY_IPL: Readonly<Record<Body, number | null>> = Object.freeze({
  [Body.Sun]: 0, [Body.Moon]: 1, [Body.Mercury]: 2, [Body.Venus]: 3,
  [Body.Mars]: 4, [Body.Jupiter]: 5, [Body.Saturn]: 6, [Body.Uranus]: 7,
  [Body.Neptune]: 8, [Body.Pluto]: 9,
  [Body.Earth]: null,      // = Sun + 180°
  [Body.SouthNode]: null,  // = NorthNode + 180°
  [Body.NorthNode]: null,  // BodyConfig.northNodeIpl — CONFIRMED = 11 (true node)
  [Body.Chiron]: null,     // BodyConfig.chironIpl — CONFIRMED Phase 0 = 15
});

/** Vùng chưa chắc của SPEC §11 — golden quyết, không đoán. */
export interface BodyConfig {
  /**
   * 10 = mean node, 11 = true node.
   * ✅ CONFIRMED 2026-09-21: bản tham chiếu dùng **TRUE node (11)**.
   * Bằng chứng: đối chiếu ứng dụng chart của Jovian Archive trên 2 chart độc lập —
   * true node khớp 26/26 Gate.Line; mean node sai đúng 4 mục node, lệch 4788″ = 1.33°.
   */
  northNodeIpl: 10 | 11;
  /** CONFIRMED Phase 0: SE_CHIRON = 15. */
  chironIpl: 15;
}

/*
 * ★ CHIRON — đã chốt 2026-09-22, KHÔNG còn là ẩn số.
 *
 * Trước đây đây là cờ `chironDefinesChannels: boolean` gắn nhãn "UNKNOWN U9 —
 * golden quyết". Cách đặt vấn đề đó SAI: tôi coi một hằng của bộ môn như một
 * tham số cần đo, rồi đi tìm lá số phân biệt được hai giả thuyết — thứ không
 * tồn tại.
 *
 * Trong Human Design, bộ thiên thể xác định định nghĩa là **13**: Sun, Earth,
 * Moon, North/South Node, Mercury, Venus, Mars, Jupiter, Saturn, Uranus,
 * Neptune, Pluto. Chiron KHÔNG kích hoạt kênh ở bất kỳ lá số nào, và KHÔNG hiện
 * trên bodygraph. Khớp với quan sát: ứng dụng tham chiếu chỉ vẽ 13 thiên thể.
 *
 * Chiron VẪN được TÍNH nhưng KHÔNG hiện ở đâu trên giao diện — không trên
 * bodygraph, không trên mandala, không trong cột hành tinh. Sửa 2026-09-22:
 * trước đó tôi hiểu nhầm là "không định nghĩa nhưng vẫn liệt kê", Hưng đã nói
 * rõ hai lần rằng nó không xuất hiện trên chart. Dữ liệu vẫn được ghi nhận vì
 * đó là số đo thật, chỉ là không trình bày.
 *
 * Vì vậy `Body.Chiron` và `chironIpl` vẫn còn; thứ bị bỏ chỉ là cái cờ cho phép
 * bật nó thành thiên thể xác định. Cờ đó giờ không thể bật nhầm nữa vì nó không
 * còn tồn tại.
 *
 * Nguồn: kiến thức bộ môn do Hưng chốt (2026-09-22). Có cổng kiểm thường trực ở
 * `calc-core/__tests__/chiron.spec.ts`.
 */

export const DEFAULT_BODY_CONFIG: Readonly<BodyConfig> = Object.freeze({
  northNodeIpl: 11,   // TRUE node — xác nhận bằng golden, xem BodyConfig.northNodeIpl
  chironIpl: 15,
});

/** `ipl` thực tế để gọi ephemeris; `null` nghĩa là thiên thể dẫn xuất. */
export function iplFor(body: Body, cfg: BodyConfig): number | null {
  if (body === Body.NorthNode) return cfg.northNodeIpl;
  if (body === Body.Chiron) return cfg.chironIpl;
  return BODY_IPL[body];
}

/**
 * 13 thiên thể xác định định nghĩa trong HD. Chiron KHÔNG nằm trong đây và
 * không có cấu hình nào đưa nó vào — xem ghi chú CHIRON ở trên.
 */
export const DEFINING_BODIES_STANDARD: readonly Body[] =
  Object.freeze(ALL_BODIES.filter(b => b !== Body.Chiron));

/**
 * Thứ tự các thiên thể trong CỘT HÀNH TINH hai bên bodygraph.
 *
 * ★ HAI NGUỒN THAM CHIẾU ĐÁ NHAU — đo trực tiếp 2026-09-22, không phải suy đoán:
 *
 *   widget Jovian (humandesignamerica.com)
 *     cột Design của lá số Kolkata đọc ra 58.2, 52.2, 2.3, 41.4, 31.4, 5.3…
 *     lớp CSS của từng dòng ghi `gate--58, gate--52, gate--2, gate--41`
 *     ⇒ Sun, Earth, MOON, NorthNode, SouthNode, Mercury…
 *
 *   humandesign.vn · hdkit `planets.js` · open-human-design
 *     cột Design của lá số g01 đọc ra 36.4, 6.4, 23.1, 43.1, 41.4…
 *     đối chiếu số của engine ta: 23.1 là NorthNode, 41.4 là Moon
 *     ⇒ Sun, Earth, NODES, Moon, Mercury…
 *     (open-human-design còn chú thích hẳn "Canonical HD planet-column order
 *      (Nodes before Moon)" — nên đây không phải nhầm lẫn của một bên)
 *
 * Không có thứ tự "chuẩn" duy nhất. Hưng chốt theo Jovian, cho khớp với mọi
 * thứ khác đã theo cùng chuẩn đó: nền bodygraph, bảng màu, hình học, hằng số mandala.
 *
 * Hoá ra đúng bằng `DEFINING_BODIES_STANDARD`, nên không cần hằng riêng. Giữ
 * tên này như một bí danh có ghi chú, để lần sau ai định "sửa lại cho giống
 * hdkit" thì đọc được vì sao KHÔNG nên.
 */
export const CHART_COLUMN_BODIES: readonly Body[] = DEFINING_BODIES_STANDARD;

/** Ký hiệu chiêm tinh Unicode — dùng cho mandala và bảng hành tinh. */
export const BODY_GLYPHS: Readonly<Record<Body, string>> = Object.freeze({
  [Body.Sun]: '☉', [Body.Earth]: '⊕', [Body.Moon]: '☽',
  [Body.NorthNode]: '☊', [Body.SouthNode]: '☋',
  [Body.Mercury]: '☿', [Body.Venus]: '♀', [Body.Mars]: '♂',
  [Body.Jupiter]: '♃', [Body.Saturn]: '♄', [Body.Uranus]: '♅',
  [Body.Neptune]: '♆', [Body.Pluto]: '♇', [Body.Chiron]: '⚷',
});
