/**
 * Dữ liệu sinh truyền qua LINK — website humandesign.vn mở/nhúng chart đã điền sẵn (Hưng duyệt 2026-10-20,
 * hợp đồng ở `docs/CHART-INTEGRATION.md` mục "Dữ liệu sinh qua link").
 *
 *   https://chart.humandesign.vn/?embed=1#ngay=1985-06-15&gio=05:30&noi=Hà%20Nội
 *
 * ★ Dữ liệu nằm sau `#`, KHÔNG sau `?`: trình duyệt không gửi phần sau `#` lên máy chủ ⇒ không vào log
 *   Cloudflare, không vào Referer — giữ đúng câu "không gửi dữ liệu đi đâu". Trang đọc xong thì xoá `#…`
 *   khỏi thanh địa chỉ (`app/page.tsx`).
 * ★ Thuần (không DOM) để unit test. Múi giờ `tz` chỉ được CẮT khoảng trắng ở đây — kiểm hợp lệ bằng
 *   `isValidZone` ở nơi gọi; nơi sinh `noi` tra GeoNames bằng `resolvePlace` (không đoán bừa).
 */

/** Tên tham số — tiếng Việt không dấu, theo ba ô của form trang chủ website (+ `tz` khi website đã chọn nơi). */
export const BIRTH_LINK_KEYS = { date: 'ngay', time: 'gio', place: 'noi', zone: 'tz' } as const;

export interface BirthLink {
  /** `YYYY-MM-DD` (đã chuẩn hoá từ `dd/mm/yyyy` nếu cần), đã kiểm là ngày có thật. */
  date?: string;
  /** `HH:MM` 24 giờ (nhận cả `H:MM`, trả về đã đệm số 0). */
  time?: string;
  /** Nơi sinh gõ tự do. */
  place?: string;
  /** Tên múi giờ IANA — CHƯA kiểm hợp lệ. */
  zone?: string;
  /** Tham số CÓ mặt nhưng sai dạng — form báo lỗi dưới đúng ô. */
  bad: { date?: true; time?: true };
}

/** Nơi sinh dài hơn thế này là rác — cắt bỏ thay vì đem đi tra. */
export const PLACE_MAX = 200;

/**
 * `ngay` nhận HAI dạng (Hưng 2026-10-20: "vẫn dùng dd/mm/yyyy, người Việt mà"): `dd/mm/yyyy` như người Việt gõ
 * (cũng nhận `d/m/yyyy`, dấu `.` hoặc `-`) và `YYYY-MM-DD`. Năm luôn 4 chữ số nên hai dạng không lẫn nhau;
 * KHÔNG nhận `mm/dd/yyyy` kiểu Mỹ. Trả `YYYY-MM-DD` hoặc `null` nếu không phải ngày có thật.
 */
export function normalizeDate(s: string): string | null {
  let y: number, mo: number, d: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const vn = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (iso) { y = +iso[1]!; mo = +iso[2]!; d = +iso[3]!; }
  else if (vn) { d = +vn[1]!; mo = +vn[2]!; y = +vn[3]!; }
  else return null;
  if (mo < 1 || mo > 12 || d < 1) return null;
  // Ngày 0 của tháng sau = ngày cuối tháng này (Date.UTC chỉ dùng để đếm ngày, không vào phép tính).
  if (d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) return null;
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Đọc `location.hash`. Không có tham số nào trong `BIRTH_LINK_KEYS` ⇒ `null` (hash khác của trang
 * — nếu sau này có — để yên). Tham số rỗng coi như vắng mặt.
 */
export function parseBirthLink(hash: string): BirthLink | null {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const get = (k: string) => { const v = p.get(k)?.trim(); return v === '' ? undefined : v; };
  const K = BIRTH_LINK_KEYS;
  if (!Object.values(K).some(k => p.has(k))) return null;

  const out: BirthLink = { bad: {} };
  const date = get(K.date);
  if (date !== undefined) { const n = normalizeDate(date); if (n) out.date = n; else out.bad.date = true; }
  const time = get(K.time);
  if (time !== undefined) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(time);
    if (m && +m[1]! < 24 && +m[2]! < 60) out.time = `${m[1]!.padStart(2, '0')}:${m[2]!}`;
    else out.bad.time = true;
  }
  const place = get(K.place);
  if (place !== undefined && place.length <= PLACE_MAX) out.place = place;
  const zone = get(K.zone);
  if (zone !== undefined) out.zone = zone;
  return out;
}

/** Dựng phần `#…` — cho test và làm mẫu cho website. */
export function birthLinkHash(v: { date?: string; time?: string; place?: string; zone?: string }): string {
  const p = new URLSearchParams();
  const K = BIRTH_LINK_KEYS;
  if (v.date) p.set(K.date, v.date);
  if (v.time) p.set(K.time, v.time);
  if (v.place) p.set(K.place, v.place);
  if (v.zone) p.set(K.zone, v.zone);
  return '#' + p.toString().replace(/\+/g, '%20');
}
