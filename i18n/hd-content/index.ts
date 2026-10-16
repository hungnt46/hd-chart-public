/**
 * Cổng truy cập DUY NHẤT vào nội dung diễn giải Human Design — SPEC.md §3.2.
 *
 * ⚠️ KHÔNG import các file JSON trong thư mục này từ bất kỳ đâu khác. Toàn bộ
 * văn bản ở đây là **tác phẩm có bản quyền của Jovian Archive**; gom đường vào
 * một chỗ để nếu quyết định phân phối (D1) thay đổi thì gỡ chỉ tốn một thư mục
 * và một cờ, không phải refactor.
 *
 * Cờ `NEXT_PUBLIC_HD_CONTENT_BUNDLED`:
 *   - `'false'` ⇒ mọi hàm trả `null`, UI hiện placeholder. App vẫn chạy đúng.
 *   - còn lại (kể cả không đặt) ⇒ trả nội dung.
 */
import { BANK } from './bank.js';
import type {
  CenterContent, ChannelContent, CrossContent, GateContent, Lang, LangBank, LineContent,
} from './types.js';

type ContentTable = keyof LangBank;

export type {
  CenterContent, ChannelContent, CrossContent, GateContent, Lang, LineContent,
};

/**
 * Nội dung có được nhúng không.
 * Đọc qua hàm (không phải hằng số) để test đổi được cờ lúc chạy.
 */
export function isContentBundled(): boolean {
  return process.env.NEXT_PUBLIC_HD_CONTENT_BUNDLED !== 'false';
}

/**
 * Lấy một mục, có DỰ PHÒNG sang tiếng Anh.
 * Bản dịch tiếng Việt còn khuyết vài chỗ; thà hiện bản Anh còn hơn để trống,
 * nhưng phải nói rõ là đang dùng dự phòng (xem `resolved`).
 */
function pick<K extends ContentTable>(
  lang: Lang, table: K, key: string,
): { value: LangBank[K][string] | null; resolved: Lang | null } {
  // TS không thu hẹp được `LangBank[K][string]` khi K còn là tham số kiểu, nên
  // phải khẳng định một lần ở đây; bù lại lời gọi bên ngoài suy kiểu chính xác.
  type V = LangBank[K][string];
  if (!isContentBundled()) return { value: null, resolved: null };
  const primary = BANK[lang][table][key] as V | undefined;
  if (primary && Object.values(primary).some(v => v !== null)) return { value: primary, resolved: lang };
  if (lang !== 'en') {
    const fb = BANK.en[table][key] as V | undefined;
    if (fb && Object.values(fb).some(v => v !== null)) return { value: fb, resolved: 'en' };
  }
  return { value: null, resolved: null };
}

export const gateContent = (gate: number, lang: Lang = 'vi') =>
  pick(lang, 'gates', String(gate));

export const channelContent = (channelId: number, lang: Lang = 'vi') =>
  pick(lang, 'channels', String(channelId));

export const centerContent = (centerId: number, lang: Lang = 'vi') =>
  pick(lang, 'centers', String(centerId));

/** Khoá dạng `"gate.line"`, ví dụ `"17.4"`. */
export const lineContent = (gate: number, line: number, lang: Lang = 'vi') =>
  pick(lang, 'lines', `${gate}.${line}`);

export const crossContent = (crossId: number, lang: Lang = 'vi') =>
  pick(lang, 'crosses', String(crossId));

/**
 * 7 mục RỖNG NGAY TRONG DỮ LIỆU NGUỒN — không phải lỗi rút dữ liệu.
 * Giữ lại để test khẳng định, khỏi ai đó "sửa" nhầm sau này.
 */
export const KNOWN_SOURCE_GAPS = Object.freeze({
  exalted: ['47.6', '58.2'],
  detriment: ['25.4', '37.1', '47.5', '54.5', '57.3'],
});
