'use client';
/**
 * Đăng ký service worker (`public/sw.js`) — STATUS §4 G1.
 *
 * Chỉ ở bản dựng production: với `next dev`, SW sẽ giữ lại mã cũ và đè lên
 * cơ chế nạp nóng (HMR) — sửa mã mà trang không đổi, rất khó hiểu.
 * Đăng ký SAU khi trang tải xong để không tranh băng thông với lần mở đầu.
 * Bản công khai KHÔNG đăng ký (kế hoạch §5.2: bớt rủi ro cache cũ) — `build:public`
 * cũng xoá `out/sw.js`.
 */
import { useEffect } from 'react';
import { PUBLIC_EDITION } from '../../lib/edition';

export function RegisterServiceWorker(): null {
  useEffect(() => {
    if (PUBLIC_EDITION || process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const register = () => { void navigator.serviceWorker.register('/sw.js').catch(() => undefined); };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
