/**
 * Chuỗi GIAO DIỆN — SPEC §10.6.
 *
 * ⚠️ Phân biệt với `i18n/hd-content/`:
 *   - chỗ này là chữ **của ta**: nhãn nút, thông báo, hướng dẫn. Tự viết, không
 *     lấy từ đâu, nên không có ràng buộc bản quyền và KHÔNG đi sau cờ nội dung.
 *   - `hd-content` là văn bản diễn giải và **bản dịch thuật ngữ** của Jovian
 *     Archive — có bản quyền, nằm sau `NEXT_PUBLIC_HD_CONTENT_BUNDLED`.
 * Giao diện phải đọc được đầy đủ kể cả khi cờ đó tắt.
 *
 * Khoá được kiểm ở mức KIỂU: `UiKey` suy từ chính `en.json`, nên gõ sai khoá là
 * lỗi biên dịch chứ không phải chuỗi lạ hiện ra lúc chạy.
 */
import en from './en.json' with { type: 'json' };
import vi from './vi.json' with { type: 'json' };

export type Lang = 'en' | 'vi';
export const LANGS: readonly Lang[] = ['en', 'vi'];
/** `_note` là ghi chú cho người đọc file, không phải khoá dịch. */
export type UiKey = Exclude<keyof typeof en, '_note'>;

const BANK: Record<Lang, Record<string, string>> = { en, vi };
const get = (lang: Lang, key: UiKey): string | undefined => BANK[lang][key];

/** Tên ngôn ngữ, luôn viết bằng CHÍNH ngôn ngữ đó — người không đọc được thứ tiếng hiện tại vẫn tìm ra nút. */
export const LANG_LABEL: Record<Lang, string> = { en: 'English', vi: 'Tiếng Việt' };
/**
 * Nhãn NGẮN trên nút (Hưng chốt 2026-09-25: "nút chọn viết ngắn là EN"). Mã ISO
 * không thuộc ngôn ngữ nào nên vẫn giữ được ý của `LANG_LABEL`: ai cũng tìm ra
 * nút của mình. Tên đầy đủ vẫn nằm trong `aria-label` và `title`.
 */
export const LANG_SHORT: Record<Lang, string> = { en: 'EN', vi: 'VI' };

/**
 * Dịch một khoá. `{tên}` trong chuỗi được thay bằng `vars.tên`.
 * Thiếu bản dịch ⇒ lùi về tiếng Anh; thiếu cả tiếng Anh ⇒ trả chính khoá (để
 * lỗi lộ ra trên màn hình thay vì thành ô trống bí ẩn).
 */
export function translate(lang: Lang, key: UiKey, vars?: Record<string, string | number>): string {
  const raw = get(lang, key) ?? get('en', key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : m);
}

/** Ngôn ngữ từ thẻ `navigator.language`. Mọi thứ không phải `vi-*` ⇒ tiếng Anh. */
export const langFromTag = (tag: string | undefined): Lang =>
  (tag ?? '').toLowerCase().startsWith('vi') ? 'vi' : 'en';

/**
 * Múi giờ MÁY cho biết máy đang ở Việt Nam. `Asia/Hanoi` là vùng backzone app
 * tự thêm (`lib/time/zones.ts`) — máy thật hầu như không báo, nhưng thừa không hại.
 * KHÔNG có `Asia/Bangkok`: Thái Lan, Lào, Campuchia cũng dùng — sẽ đoán nhầm.
 */
const VN_DEVICE_ZONES = new Set(['Asia/Ho_Chi_Minh', 'Asia/Saigon', 'Asia/Hanoi']);

/**
 * ★ Đoán ngôn ngữ lần đầu (Hưng chốt 2026-09-25: "mặc định tiếng Việt nếu truy
 *   cập ở VN"). App chạy offline và không gọi ra ngoài (Phase 0 §8) nên KHÔNG
 *   tra vị trí theo IP; múi giờ của máy là tín hiệu "đang ở Việt Nam" có sẵn,
 *   không xin quyền. Thứ tự: trình duyệt tiếng Việt ⇒ vi; máy ở múi giờ Việt Nam
 *   ⇒ vi (bắt ca máy ở VN nhưng trình duyệt để tiếng Anh); còn lại ⇒ en.
 *   Lựa chọn đã lưu luôn thắng — xem `LanguageProvider`.
 */
export const guessLang = (tag: string | undefined, deviceZone: string | undefined): Lang =>
  langFromTag(tag) === 'vi' || (deviceZone !== undefined && VN_DEVICE_ZONES.has(deviceZone)) ? 'vi' : 'en';

export const isLang = (v: unknown): v is Lang => v === 'en' || v === 'vi';
