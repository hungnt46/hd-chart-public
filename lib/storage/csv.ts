/**
 * Dựng tệp CSV — STATUS §4 E5 ("Export Charts to CSV" như app tham chiếu). Thuần: nhận bảng
 * chuỗi, trả chuỗi; không biết gì về chart.
 *
 * Ba điều cố ý:
 * 1. BOM UTF-8 ở đầu — không có thì Excel trên Windows đọc tiếng Việt thành rác.
 * 2. RFC 4180: ô chứa `"` `,` hay xuống dòng thì bọc ngoặc kép, `"` nhân đôi;
 *    dòng kết thúc bằng CRLF.
 * 3. Chặn "CSV injection": ô bắt đầu bằng `=` `+` `-` `@` (hoặc tab/CR) bị bảng
 *    tính hiểu là CÔNG THỨC. Tên chart do người dùng gõ, và tệp này có thể được
 *    gửi cho người khác mở ⇒ thêm `'` đứng trước (khuyến nghị của OWASP).
 */
const FORMULA = /^[=+\-@\t\r]/;

export function csvCell(v: string): string {
  const s = FORMULA.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: readonly (readonly string[])[]): string {
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export const csvFileName = (d: Date): string => `hd-charts-${d.toISOString().slice(0, 10)}.csv`;
