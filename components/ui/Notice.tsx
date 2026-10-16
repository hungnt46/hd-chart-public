/**
 * Hộp báo của vỏ ứng dụng — lỗi, cảnh báo, xác nhận (`.notice` trong `globals.css`).
 *
 * Vai trò mặc định theo sắc thái: lỗi = `alert` (đọc ngay, cắt ngang), cảnh báo
 * và xác nhận = `status` (đọc lịch sự). Theo Carbon "inline notification": hộp
 * nằm TẠI CHỖ trong luồng việc, không tự biến mất — khác thông báo "Trực tiếp"
 * (toast, tự ẩn sau 15 s).
 *
 * Lỗi của MỘT ô nhập thì KHÔNG dùng hộp này mà dùng `.field-error` dưới ô, nối
 * bằng `aria-describedby` (xem `BirthForm`).
 */
import type { JSX, ReactNode } from 'react';

export type NoticeTone = 'danger' | 'warn' | 'ok';

export function Notice({ tone, children, testId, className = '', role }: {
  tone: NoticeTone;
  children: ReactNode;
  testId?: string;
  className?: string;
  /** Ghi đè vai trò mặc định — ví dụ cảnh báo kho tạm cần đọc ngay (`alert`). */
  role?: 'alert' | 'status';
}): JSX.Element {
  return (
    <p role={role ?? (tone === 'danger' ? 'alert' : 'status')} data-tone={tone}
       className={`notice ${className}`} data-testid={testId}>
      {children}
    </p>
  );
}
