/**
 * Danh sách múi giờ IANA cho bộ chọn — SPEC §8.1.
 *
 * ⚠️ **Không dùng thẳng `Intl.supportedValuesOf('timeZone')`.** Tuỳ phiên bản ICU,
 * nó trả **tên cũ** (`Asia/Calcutta`, `Asia/Saigon`) thay vì tên chuẩn hiện hành
 * (`Asia/Kolkata`, `Asia/Ho_Chi_Minh`). Tệ hơn, `Intl.DateTimeFormat` còn chuẩn
 * hoá NGƯỢC: `Asia/Kolkata` → `Asia/Calcutta`. Đo được trên cả Node 24 lẫn
 * Chromium, 2026-09-21.
 *
 * Cả hai tên đều được luxon chấp nhận làm ĐẦU VÀO (chúng là alias của nhau), nên
 * việc tính toán không sai. Nhưng tên **lưu và hiển thị** phải ổn định, nếu không
 * chart lưu hôm nay sẽ hiện tên khác trên máy có ICU khác.
 */
import { BACKZONES, getZone, isKnownZone } from '../time/zones.js';
import { TIMEZONE_LIST } from './timezone-list.js';

/** Tên cũ → tên chuẩn hiện hành. Chỉ các ca đổi tên phổ biến. */
export const ALIAS_TO_CANONICAL: Readonly<Record<string, string>> = Object.freeze({
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Dacca': 'Asia/Dhaka',
  'Asia/Ashkhabad': 'Asia/Ashgabat',
  'Asia/Thimbu': 'Asia/Thimphu',
  'Asia/Ujung_Pandang': 'Asia/Makassar',
  'Asia/Macao': 'Asia/Macau',
  'Europe/Kiev': 'Europe/Kyiv',
  'Europe/Uzhgorod': 'Europe/Kyiv',
  'Europe/Zaporozhye': 'Europe/Kyiv',
  'America/Godthab': 'America/Nuuk',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'America/Catamarca': 'America/Argentina/Catamarca',
  'America/Cordoba': 'America/Argentina/Cordoba',
  'America/Jujuy': 'America/Argentina/Jujuy',
  'America/Mendoza': 'America/Argentina/Mendoza',
  'Atlantic/Faeroe': 'Atlantic/Faroe',
  'Pacific/Ponape': 'Pacific/Pohnpei',
  'Pacific/Truk': 'Pacific/Chuuk',
  'Pacific/Samoa': 'Pacific/Pago_Pago',
  'Australia/Currie': 'Australia/Hobart',
  'Australia/South': 'Australia/Adelaide',
  'Australia/North': 'Australia/Darwin',
  'Australia/West': 'Australia/Perth',
});

/** Đưa một tên múi giờ về dạng chuẩn hiện hành. */
export const canonicalZone = (name: string): string => ALIAS_TO_CANONICAL[name] ?? name;

/** Múi giờ này dùng được với luxon không? */
/** Múi giờ này dùng được không — ICU hoặc backzone của tzdb (`lib/time/zones.ts`). */
export const isValidZone = (name: string): boolean => isKnownZone(name);

/**
 * Danh sách múi giờ đã chuẩn hoá, sắp xếp, loại trùng.
 *
 * ★ Trả về danh sách **TĨNH** (`timezone-list.ts`), không dò `Intl` lúc chạy.
 *   Dò lúc chạy làm server (Node) và client (trình duyệt) cho kết quả khác nhau
 *   ⇒ hydration mismatch trong Next. Xem ghi chú ở đầu `timezone-list.ts`.
 */
export function listTimeZones(): readonly string[] {
  return ALL_ZONES;
}
/** Danh sách ICU cộng vùng backzone của tzdb (`Asia/Hanoi`) — cùng thứ tự `localeCompare` như bộ sinh. */
const ALL_ZONES: readonly string[] = Object.freeze(
  [...new Set([...TIMEZONE_LIST, ...Object.keys(BACKZONES)])].sort((a, b) => a.localeCompare(b, 'en')));

/**
 * Nhãn hiển thị kèm offset TẠI MỘT MỐC CỤ THỂ, ví dụ "Asia/Ho_Chi_Minh (UTC+07:00)".
 *
 * ⚠️ `atMs` là **bắt buộc**, không mặc định `Date.now()`. Bản đầu có mặc định đó và
 * gây **hydration mismatch**: server render ở một mili-giây, client hydrate ở
 * mili-giây khác, và với múi giờ đang chuyển DST thì nhãn ra khác nhau.
 * Dùng ngày sinh đang nhập làm mốc cũng ĐÚNG HƠN về nghĩa: người dùng cần biết
 * offset lúc sinh, không phải offset hôm nay.
 */
export function zoneLabel(zone: string, atMs: number): string {
  try {
    const z = getZone(zone);
    if (!z) return zone;
    const off = Math.round(z.offset(atMs));
    const sign = off < 0 ? '−' : '+';
    const a = Math.abs(off);
    return `${zone} (UTC${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')})`;
  } catch { return zone; }
}

/**
 * Tên THÀNH PHỐ của một vùng IANA để hiện khi chart chưa có nơi sinh (giao diện D,
 * 2026-10-04): "Asia/Ho_Chi_Minh" → "Hồ Chí Minh" thay vì "Ho_Chi_Minh". Ba vùng
 * Việt Nam có tên Việt; còn lại bỏ phần vùng và đổi "_" thành khoảng trắng.
 */
const VI_CITY: Readonly<Record<string, string>> = {
  'Asia/Ho_Chi_Minh': 'Hồ Chí Minh', 'Asia/Saigon': 'Sài Gòn', 'Asia/Hanoi': 'Hà Nội',
};
export function zoneCityName(zone: string, lang: string): string {
  if (lang === 'vi' && VI_CITY[zone]) return VI_CITY[zone];
  return (zone.split('/').pop() ?? zone).replace(/_/g, ' ');
}
