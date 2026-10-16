/**
 * Chuẩn hoá tên địa danh để TÌM — bỏ dấu, thường hoá, gộp khoảng trắng.
 *
 * Dùng CHUNG cho bộ sinh dữ liệu (`generate-places.ts`) và ô tìm lúc chạy: khoá
 * lưu trong `public/data/places-<ngày>.tsv` đã fold sẵn, nên hai phía phải fold y hệt
 * nhau, nếu không "Hà Nội" gõ vào sẽ không khớp "ha noi" đã lưu.
 *
 * ★ `đ`/`Đ` không phải "d + dấu": NFD không tách nó ra, phải thay tay. Tương tự
 *   các chữ Latin "liền" khác (ø, ł, ß, æ, œ…) hay gặp trong tên châu Âu.
 */
const LIGATURES: Readonly<Record<string, string>> = {
  đ: 'd', ð: 'd', ø: 'o', ł: 'l', ß: 'ss', æ: 'ae', œ: 'oe', þ: 'th', ı: 'i', ħ: 'h',
};

export function foldName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/[đðøłßæœþıħ]/g, c => LIGATURES[c] ?? c)
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/[\s,;/]+/g, ' ')
    .trim();
}
