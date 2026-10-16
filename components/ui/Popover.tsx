'use client';
/**
 * Nút mở một bảng nhỏ (menu Xuất, menu cài đặt trên điện thoại).
 *
 * Mẫu DISCLOSURE (`aria-expanded` + `aria-controls`), không phải `role=menu`:
 * bên trong là nút và nhóm nút bình thường, nên Tab đi tuần tự như mọi chỗ khác
 * — `role=menu` bắt người dùng bàn phím học phím mũi tên mà không được gì thêm.
 *
 * Đóng khi: bấm ra ngoài · Esc (trả focus về nút mở) · `closeOnPick` và bấm một
 * nút bên trong. Bảng LUÔN nằm trong DOM (ẩn bằng `hidden`) để test tìm được
 * phần tử bên trong kể cả khi đang đóng — `data-testid` của nút con không đổi.
 *
 * ★ Từ 2026-09-26 cả bảng cài đặt ngôn ngữ/giờ trên thanh trên cũng dùng cái
 *   này — trước đó `TopBar` chép lại logic bấm-ra-ngoài/Esc và quên trả focus.
 *   Chưa dùng Popover API gốc (`popover`): nó tự đóng khi bấm ra ngoài nhưng
 *   không tự trả focus về nút mở ở mọi engine, và định vị cạnh nút vẫn cần CSS
 *   anchor positioning mới có từ 01/2026 (docs/DESIGN-SYSTEM.md §4).
 */
import { useEffect, useId, useRef, useState, type JSX, type ReactNode } from 'react';

export interface PopoverProps {
  /** Nội dung nút — hàm thì nhận trạng thái mở (xoay mũi tên…). */
  label: ReactNode | ((open: boolean) => ReactNode);
  /** Nhãn cho trình đọc màn hình khi `label` chỉ là biểu tượng. */
  ariaLabel?: string;
  children: ReactNode;
  align?: 'start' | 'end';
  /** Mở lên trên — nút nằm ở chân một khung sát đáy màn (chân bảng Illustrator). */
  above?: boolean;
  buttonClassName?: string;
  panelClassName?: string;
  testId?: string;
  /** Bấm một nút bên trong thì đóng (menu hành động) — trừ nút có `data-keep-open` (bước hỏi lại). */
  closeOnPick?: boolean;
  /** `id` cố định cho bảng (mặc định `useId`). */
  panelId?: string;
  /** Tooltip của nút mở (nút gọn chỉ còn biểu tượng + mã). */
  title?: string;
}

export function Popover({
  label, ariaLabel, children, align = 'end', above = false, buttonClassName = 'btn', panelClassName = '',
  testId, closeOnPick = false, panelId, title,
}: PopoverProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const autoId = useId();
  const id = panelId ?? autoId;
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button ref={btn} type="button" className={buttonClassName} aria-expanded={open} aria-controls={id}
              aria-label={ariaLabel} title={title} data-testid={testId} onClick={() => setOpen(o => !o)}>
        {typeof label === 'function' ? label(open) : label}
      </button>
      <div id={id} hidden={!open}
           onClick={closeOnPick ? e => {
             const b = (e.target as HTMLElement).closest('button');
             if (b && !b.hasAttribute('data-keep-open')) setOpen(false);
           } : undefined}
           className={`absolute ${above ? 'bottom-full mb-2' : 'top-full mt-2'} z-40 rounded-xl border border-line bg-surface p-2 shadow-lg ${
             align === 'end' ? 'right-0' : 'left-0'} ${panelClassName}`}>
        {children}
      </div>
    </div>
  );
}
