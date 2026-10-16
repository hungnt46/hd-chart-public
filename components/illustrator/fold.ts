/**
 * Bỏ dấu tiếng Việt, chữ thường — để ô tìm "suc hut" ra "Sức Hút", và để tên
 * bản vẽ thành tên tệp ASCII. `\u0111` là "đ" (NFD không tách được nó).
 */
export const fold = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').replace(/\u0111/g, 'd').replace(/\u0110/g, 'D').toLowerCase();
