/**
 * Sinh `lib/place/timezone-list.ts` — danh sách múi giờ TĨNH cho bộ chọn.
 *
 *   npm run gen:timezones
 *
 * Dựng lại 2026-09-23 (STATUS §4 D2): script `gen:timezones` có trong
 * `package.json` từ commit khởi tạo nhưng tệp này CHƯA TỪNG được commit. Kiểm
 * dựng lại đúng: chạy trên Node 24 (ICU 78.3, tzdata 2026c) cho ra ĐÚNG 418 tên
 * như tệp sinh ngày 2026-09-21, khác mỗi dòng ngày ở đầu.
 *
 * Vì sao danh sách tĩnh, không dò `Intl` lúc chạy: xem đầu `timezone-list.ts`.
 * Chạy lại khi nâng Node/ICU nếu muốn nhận vùng mới — rồi xem diff trước khi
 * commit: một tên đổi là chart đã lưu hiện khác đi.
 */
import { writeFileSync } from 'node:fs';
import { canonicalZone, isValidZone } from './timezones.js';

const OUT = 'lib/place/timezone-list.ts';

const names = [...new Set(Intl.supportedValuesOf('timeZone').map(canonicalZone))]
  .filter(isValidZone)
  // localeCompare với locale CỐ ĐỊNH, không `.sort()` trần: bản gốc sắp theo
  // collation ICU ("Port_of_Spain" trước "Port-au-Prince"); sắp theo mã UTF-16
  // thì đảo cặp đó và mỗi lần sinh lại là một diff vô nghĩa.
  .sort((a, b) => a.localeCompare(b, 'en'));

const header = `/**
 * Danh sách múi giờ IANA **TĨNH** — sinh sẵn, KHÔNG dò lúc chạy.
 *
 * ⚠️ Vì sao không gọi \`Intl.supportedValuesOf('timeZone')\` lúc chạy:
 *  1. Nội dung phụ thuộc phiên bản ICU ⇒ Node (server render) và trình duyệt
 *     (hydrate) cho danh sách KHÁC NHAU ⇒ **hydration mismatch** trong Next.
 *  2. Nó trả tên cũ (\`Asia/Calcutta\`) thay vì tên chuẩn (\`Asia/Kolkata\`).
 *
 * Sinh bởi \`npm run gen:timezones\`. Đã áp bảng alias→canonical của timezones.ts.
 * Sinh ngày ${new Date().toISOString().slice(0, 10)} · ${names.length} múi giờ.
 */
`;
writeFileSync(OUT, `${header}export const TIMEZONE_LIST: readonly string[] = Object.freeze(${JSON.stringify(names, null, 2)});\n`);
const { icu = '?', tz = '?' } = process.versions as Record<string, string | undefined>;
process.stdout.write(`${OUT}: ${names.length} múi giờ (ICU ${icu}, tz ${tz})\n`);
