/**
 * Tín hiệu "kho chart vừa đổi".
 *
 * Kho là trạng thái NGOÀI React (IndexedDB), nên hai component đọc cùng một kho
 * không tự biết nhau. Trước đây `ConnectionPanel` đọc danh sách đúng một lần lúc
 * gắn: lưu chart xong thì ô chọn vẫn rỗng, và e2e đỏ vì đúng lý do đó.
 *
 * Dùng `CustomEvent` trên `window` thay vì nâng trạng thái lên trang: hai
 * component này không có quan hệ cha-con, và một sự kiện là thứ nhẹ nhất diễn
 * đạt được "có gì đó đã đổi, ai quan tâm thì đọc lại".
 */
export const LIBRARY_CHANGED = 'hd:library-changed';

export function notifyLibraryChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(LIBRARY_CHANGED));
}

/** Đăng ký nghe; trả về hàm huỷ đăng ký. */
export function onLibraryChanged(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(LIBRARY_CHANGED, fn);
  return () => { window.removeEventListener(LIBRARY_CHANGED, fn); };
}
