/**
 * Tra FIXING của một hào: hành tinh nào exalt, hành tinh nào detriment.
 *
 * Thuần, không React. Dữ liệu sinh bằng `npm run gen:fixings` từ
 * `../hd-corpus/hdkit/constants.js` — xem `generate/extract-fixings.ts` để biết
 * hai loại ô trống và vì sao chúng KHÁC nhau.
 *
 * Dùng cho dấu ▲/▼ trong cột hành tinh. Đây là DỮ KIỆN nên KHÔNG sau cờ nội
 * dung: cột vẫn hiện dấu khi `NEXT_PUBLIC_HD_CONTENT_BUNDLED=false`.
 */
import { ALL_BODIES, Body, BODY_NAMES } from '../ephemeris/bodies.js';
import raw from './fixings.json' with { type: 'json' };

export type Fixing = 'exalted' | 'detriment';

/**
 * Tên hành tinh trong nguồn → `Body`. Nguồn không có Node nào, đúng như HD.
 *
 * Dựng từ `ALL_BODIES` chứ KHÔNG từ `Object.keys(BODY_NAMES)`: `Object.keys`
 * trên enum số trả về CHUỖI, nên map sẽ chứa `'2'` thay vì `2` và mọi so sánh
 * `Body` sau đó lặng lẽ sai. Đã mắc, test `fixings.spec.ts` bắt được.
 */
const BY_NAME = new Map<string, Body>(ALL_BODIES.map(b => [BODY_NAMES[b], b]));

const TABLE = raw.fixings as Record<string, { exalted?: string; detriment?: string }>;

/**
 * Thiên thể `body` có đang fix hào `gate.line` không, và theo chiều nào.
 *
 * Trả `null` khi không — gồm cả ba trường hợp, và CỐ Ý không phân biệt chúng ở
 * đây vì giao diện xử lý như nhau (không vẽ dấu):
 *   · thiên thể này không phải thiên thể fix hào đó;
 *   · hào đó thật sự không có fixing (10 ô, xem `_gaps.khongCoFixing`);
 *   · cổng 32 — nợ dữ liệu, nguồn thiếu (xem `_gaps.noCuaNguon`).
 * Muốn biết ô nào thuộc loại nào thì đọc `FIXING_GAPS`.
 */
export function fixingOf(gate: number, line: number, body: Body): Fixing | null {
  const e = TABLE[`${gate}.${line}`];
  if (!e) return null;
  const name = BODY_NAMES[body];
  if (e.exalted === name) return 'exalted';
  if (e.detriment === name) return 'detriment';
  return null;
}

/** Thiên thể fix hào đó, hoặc `null` cho từng chiều. */
export function fixingPlanets(gate: number, line: number):
    { exalted: Body | null; detriment: Body | null } {
  const e = TABLE[`${gate}.${line}`];
  const look = (name: string | undefined) => (name ? BY_NAME.get(name) ?? null : null);
  return { exalted: look(e?.exalted), detriment: look(e?.detriment) };
}

/** Hai loại ô trống, giữ nguyên phân loại từ bản sinh. Có cổng kiểm khoá lại. */
export const FIXING_GAPS = raw._gaps as {
  khongCoFixing: { keys: string[] };
  noCuaNguon: { keys: string[] };
};
