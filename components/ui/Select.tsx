/**
 * `<select>` một dòng có mũi tên — chung cho Kho chart và Kết nối.
 *
 * `appearance-none` là BẮT BUỘC (WebKit bỏ qua `min-height` của `<select>`
 * mặc định, xem `.select` trong `globals.css`), mà nó lấy mất mũi tên gốc ⇒ ô
 * chọn trông y hệt ô nhập chữ. Vẽ lại mũi tên bằng biểu tượng chung, không nhận
 * chuột. Trước 2026-09-26 bản này nằm riêng trong `ChartLibrary` (mũi tên là ký
 * tự "▾" 12px), còn `ConnectionPanel` dùng `<select>` trần không có mũi tên.
 */
import type { JSX } from 'react';
import { Icon } from './Icon.js';

/** `selectClassName` thêm vào chính `<select>` (lề trong gọn hơn — ô Tháng/Năm của lịch ngày sinh). */
export function Select({ children, className = '', selectClassName = '', ...rest }:
  JSX.IntrinsicElements['select'] & { selectClassName?: string }): JSX.Element {
  return (
    <span className={`relative inline-block ${className}`}>
      <select {...rest} className={selectClassName ? `field select ${selectClassName}` : 'field select'}>{children}</select>
      <Icon name="chevronDown" size={16}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-2" />
    </span>
  );
}
