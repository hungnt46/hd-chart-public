/**
 * Kiểu dùng chung cho kho nội dung. Tách riêng để `bank.ts` (có nội dung thật)
 * và `bank-empty.ts` (rỗng) cùng khai một hình dạng, và để `index.ts` không
 * phải import ngược vào bank khi chỉ cần kiểu.
 */
export type Lang = 'en' | 'vi';

/*
 * Cổng / kênh chỉ còn KEYNOTE. TÊN là dữ kiện chuẩn, ở `i18n/hd-names/`
 * (`gateName` / `channelName`), không sau cờ — docs/PLAN-planetary-influence.md
 * Phase 3 bước 4.
 */
export interface GateContent { keynote: string | null }
export interface ChannelContent { keynote: string | null }
export interface CenterContent { name: string | null }
export interface LineContent {
  name: string | null;
  /** "Blue keynote" của sách Rave I'Ching — dưới tên hào, trên câu thế vượng; nhiều hào không có. */
  blue: string | null;
  exalted: string | null;
  /** Phần IN NGHIÊNG (câu cuối) của `exalted`, đúng từng ký tự — `exalted.endsWith(exaltedItalic)`. */
  exaltedItalic: string | null;
  detriment: string | null;
  detrimentItalic: string | null;
}
export interface CrossContent { name: string | null }

export type Dict<T> = Record<string, T>;

export interface LangBank {
  gates: Dict<GateContent>;
  channels: Dict<ChannelContent>;
  centers: Dict<CenterContent>;
  lines: Dict<LineContent>;
  crosses: Dict<CrossContent>;
}

export type Bank = Record<Lang, LangBank>;
