/**
 * Kho RỖNG — bản thay thế lúc dựng khi `NEXT_PUBLIC_HD_CONTENT_BUNDLED=false`.
 * Giữ đúng hình dạng của `bank.ts` để `index.ts` không cần biết mình đang dùng
 * bản nào; mọi tra cứu sẽ trượt và trả `null`, UI hiện placeholder.
 *
 * ⚠️ File này KHÔNG được chứa bất kỳ văn bản diễn giải nào.
 */
import type { Bank, LangBank } from './types.js';

const empty: LangBank = { gates: {}, channels: {}, centers: {}, lines: {}, crosses: {} };

export const BANK: Bank = { en: empty, vi: empty };
