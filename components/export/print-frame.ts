/**
 * In qua một <iframe> ẩn — dùng chung cho nút Xuất → In (`ChartExport`) và bảng
 * Ảnh hưởng hành tinh. In cả trang thì ra kèm form, kho chart, bảng phải…
 *
 * ★ Bảo mật (quét vbsec 2026-09-30, lỗi CAO đã tái hiện thật): tiêu đề ghép từ
 *   ngày/giờ sinh của chart, mà chart có thể đến từ TỆP NHẬP người khác gửi.
 *   Trước đây chuỗi đó chèn thẳng vào `srcdoc` và khung không `sandbox` ⇒
 *   `localTime = "08:30:</title><img src=x onerror=…>"` chạy mã cùng origin,
 *   đọc/sửa được cả kho chart. Hai lớp chặn, đừng bỏ lớp nào:
 *   1. `escapeHtml` mọi chuỗi đưa vào HTML;
 *   2. `sandbox="allow-same-origin allow-modals"` — KHÔNG `allow-scripts`: mã
 *      trong khung (kể cả `onerror`) không chạy được. `allow-same-origin` để
 *      trang mẹ còn gọi `contentWindow.print()`; `allow-modals` để hộp thoại in
 *      không bị chặn. Tổ hợp nguy hiểm là allow-scripts + allow-same-origin —
 *      ở đây KHÔNG có allow-scripts.
 */
export const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const PRINT_SANDBOX = 'allow-same-origin allow-modals';

export interface PrintFrameOptions {
  testId: string;
  /** Chuỗi THÔ — hàm này tự escape. */
  title: string;
  /** HTML đã an toàn (stylesheet của trang / `<style>` cố định). */
  head: string;
  /** HTML đã an toàn (SVG tuần tự hoá từ DOM, hoặc markup React dựng). */
  body: string;
}

/** Khung tự gỡ sau `afterprint` (hoặc 60 s nếu trình duyệt không phát sự kiện đó). */
export function printInFrame({ testId, title, head, body }: PrintFrameOptions): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('data-testid', testId);
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('sandbox', PRINT_SANDBOX);
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${head}` +
    `</head><body>${body}</body></html>`;
  const cleanup = () => { frame.remove(); };
  frame.addEventListener('load', () => {
    const win = frame.contentWindow;
    if (!win) { cleanup(); return; }
    win.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 60_000);
    win.focus();
    win.print();
  }, { once: true });
  document.body.appendChild(frame);
}
