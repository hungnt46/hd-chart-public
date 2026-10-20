/**
 * Ô ngày/giờ sinh GÕ TAY của form (Hưng chốt 2026-10-20, giống form trang chủ humandesign.vn): ngày
 * `dd/mm/yyyy`, giờ MỘT ô `hh:mm` 24 giờ. Thay `<input type="date|time">` của trình duyệt — hai ô đó theo
 * ngôn ngữ TRÌNH DUYỆT, không theo công tắc của app (máy tiếng Anh ⇒ "October", AM/PM).
 *
 * Thuần (không DOM) để unit test. Giá trị nội bộ của form KHÔNG đổi: `YYYY-MM-DD` và `HH:MM`.
 */
import { normalizeDate } from './birth-link';

/**
 * Năm sớm nhất nhận được: bộ ephemeris phủ 1800-01-01 → 2400-01-08 (`calc-core/ephemeris/provider.ts`), mốc
 * Design lùi ~88 ngày ⇒ năm sinh từ 1801. (Website chặn từ 1900 — app giữ được chart cũ như golden Hà Nội 1890.)
 */
export const MIN_YEAR = 1801;
export const MAX_YEAR = 2399;

const pad = (n: number) => String(n).padStart(2, '0');

/** Số ngày của tháng `m` (1–12). */
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * Chữ người dùng gõ ⇒ `YYYY-MM-DD`, hoặc `null` nếu chưa phải ngày có thật. Nhận `15/06/1985`, `5/6/1985`,
 * dấu `.`/`-`, 8 chữ số liền `15061985`, và `1985-06-15` (dán từ nơi khác). KHÔNG nhận `mm/dd/yyyy` kiểu Mỹ.
 */
export function parseDateInput(raw: string): string | null {
  const s = raw.trim();
  const eight = /^(\d{2})(\d{2})(\d{4})$/.exec(s);
  const iso = normalizeDate(eight ? `${eight[1]!}/${eight[2]!}/${eight[3]!}` : s);
  return iso && +iso.slice(0, 4) >= MIN_YEAR && +iso.slice(0, 4) <= MAX_YEAR ? iso : null;
}

/** `YYYY-MM-DD` ⇒ `dd/mm/yyyy` (chuỗi khác trả nguyên). */
export function formatDateInput(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]!}/${m[2]!}/${m[1]!}` : iso;
}

/** `5:30`, `5h30`, `5.30`, `0530`, `05:30` ⇒ `05:30`; giờ ≥ 24 hoặc phút ≥ 60 ⇒ `null`. */
export function parseTimeInput(raw: string): string | null {
  const m = /^(\d{1,2})[:h.]?(\d{2})$/.exec(raw.trim().toLowerCase());
  return m && +m[1]! < 24 && +m[2]! < 60 ? `${pad(+m[1]!)}:${m[2]!}` : null;
}

/** Thứ trong tuần, thứ Hai = 0 … Chủ Nhật = 6. */
export const weekdayMon0 = (y: number, m: number, d: number) => (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;

/**
 * Dời ngày đang trỏ `dd` ngày và `dm` tháng (bàn phím lịch). Đổi tháng thì giữ số ngày, kẹp về cuối tháng
 * (31/01 + 1 tháng ⇒ 28 hoặc 29/02). Ra ngoài [MIN_YEAR, `maxYear`] ⇒ `null` (đứng yên).
 */
export function shiftDay(cur: { y: number; m: number; d: number }, dd: number, dm: number, maxYear: number):
  { y: number; m: number; d: number } | null {
  const first = new Date(Date.UTC(cur.y, cur.m - 1 + dm, 1));
  const y0 = first.getUTCFullYear(), m0 = first.getUTCMonth() + 1;
  const t = new Date(Date.UTC(y0, m0 - 1, Math.min(cur.d, daysInMonth(y0, m0)) + dd));
  const y = t.getUTCFullYear();
  if (y < MIN_YEAR || y > maxYear) return null;
  return { y, m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

