/**
 * MỘT hàm định dạng mốc thời gian cho mọi chỗ theo công tắc giờ — xem
 * `TimeModeProvider.tsx`. Đừng tự ghép chuỗi giờ ở component: hai chỗ ghép hai
 * kiểu là hai quy ước lệch nhau.
 */
import { getZone } from '../../lib/time/zones';
import type { TimeMode } from './TimeModeProvider';
import { msOfJd } from '../../calc-core/time/julian.js';

/**
 * `local` → giờ ở `localZone` (làm tròn phút, định dạng theo ngôn ngữ — xem
 * `localLabel`). `ut` → cùng định dạng ở UTC, kèm hậu tố " UTC" để không ai phải
 * đoán đang xem giờ nào.
 *
 * ★ Nhãn "UTC", không còn "UT" (Hưng chốt 2026-09-25): người dùng biết UTC,
 *   ít ai biết UT (quy ước của phần mềm Jovian). Chỉ đổi CHỮ — UT1 và UTC chênh
 *   dưới 1 giây, còn mọi mốc ở đây làm tròn tới phút.
 */
export function momentLabel(jdUT: number, mode: TimeMode, localZone: string | undefined, lang: string): string {
  return mode === 'ut' ? `${localLabel(jdUT, undefined, lang)} UTC` : localLabel(jdUT, localZone, lang);
}

/** Múi giờ IANA của máy. Chỉ gọi ở trình duyệt, sau khi đã có dữ liệu tính. */
export function deviceZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
}

/**
 * Julian Day → nhãn ngày giờ ĐỊA PHƯƠNG tại nơi sinh.
 *
 * Ba điều cố ý:
 *
 * 1. GIỜ ĐỊA PHƯƠNG, không phải UT (Hưng chốt 2026-09-22). Mốc Design cách ngày
 *    sinh khoảng 88 ngày nên offset ở đó có thể KHÁC offset lúc sinh — ví dụ
 *    sinh trong mùa DST còn Design rơi ngoài mùa. Vì thế phải hỏi lại IANA tại
 *    chính thời điểm đó, KHÔNG dùng lại `resolution.offsetMinutes` của ngày sinh.
 *
 * 2. LÀM TRÒN VỀ PHÚT trước khi định dạng. Julian Day là số thực, đổi ngược ra
 *    mili-giây rồi cắt cụt thì 05:30:00 thành 05:29 — sai một phút so với giờ
 *    người dùng vừa nhập, nhìn như engine tính lệch. Đã mắc.
 *
 * 3. Tự ghép chuỗi, KHÔNG dùng `Intl.DateTimeFormat`: `Intl` cho kết quả khác
 *    nhau giữa ICU của Node lúc dựng trang và ICU của trình duyệt, đã gây React
 *    #418 đúng một lần trong dự án này (`app/__tests__/ssr-hydration.spec.tsx`).
 *    Offset thì lấy từ luxon — nó chỉ trả về SỐ phút, không phải chữ.
 *
 * Thứ tự ngày theo ngôn ngữ: `vi` dùng DD/MM/YYYY (Aura, Hưng chốt 2026-10-21, mục B8 — cùng kiểu ô nhập
 * ngày; trước là DD-MM-YYYY), `en` dùng YYYY-MM-DD.
 */
export function localLabel(jdUT: number, zone: string | undefined, lang: string): string {
  const ms = Math.round(msOfJd(jdUT) / 60000) * 60000;
  // getZone: ICU cộng backzone tzdb (Asia/Hanoi trước 1970). LMT có giây ⇒ offset lẻ, làm tròn phút.
  const offset = zone ? Math.round(getZone(zone)?.offset(ms) ?? 0) : 0;
  const d = new Date(ms + offset * 60000);
  const p = (n: number) => String(n).padStart(2, '0');
  const [Y, M, D] = [d.getUTCFullYear(), p(d.getUTCMonth() + 1), p(d.getUTCDate())];
  const day = lang === 'vi' ? `${D}/${M}/${Y}` : `${Y}-${M}-${D}`;
  return `${day} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

