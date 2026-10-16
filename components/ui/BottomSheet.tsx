'use client';
/**
 * Bảng trượt từ dưới (bottom sheet) — CHỈ cho điện thoại (< 640px), giao diện D
 * (Hưng duyệt 2026-10-04, artboard M5).
 *
 * `<dialog>` GỐC mở bằng `showModal()`: trình duyệt tự làm phần còn lại của trang
 * trơ (inert), tự bẫy focus và đóng bằng Esc — không cần thư viện (DESIGN-SYSTEM §4).
 * Đóng thì focus TRẢ VỀ nút mở (`returnFocus`) — tự làm, không trông vào trình
 * duyệt: Safari cũ không trả.
 *
 * Đóng khi: Esc · bấm nền mờ · kéo thanh kéo xuống quá 80px · nút bên trong có
 * `data-sheet-close` · cha đặt `open=false`.
 */
import { useEffect, useRef, type JSX, type ReactNode } from 'react';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Nhãn của hộp thoại cho trình đọc màn hình. */
  label: string;
  children: ReactNode;
  testId?: string;
  /** Nút mở — nhận lại focus khi đóng. */
  returnFocus?: () => HTMLElement | null;
}

export function BottomSheet({ open, onClose, label, children, testId, returnFocus }: BottomSheetProps): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; dy: number } | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) {
      d.close();
      returnFocus?.()?.focus();
    }
  }, [open, returnFocus]);

  /* Esc: trình duyệt tự đóng `<dialog>` (sự kiện `cancel`) — báo cha để state khớp. */
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCancel = (e: Event) => { e.preventDefault(); onClose(); };
    d.addEventListener('cancel', onCancel);
    return () => d.removeEventListener('cancel', onCancel);
  }, [onClose]);

  const setY = (y: number) => { if (panel.current) panel.current.style.transform = y > 0 ? `translateY(${y}px)` : ''; };

  return (
    <dialog ref={ref} aria-label={label} data-testid={testId}
            className="sheet m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-ink/40"
            onClick={e => {
              /* Bấm vào NỀN (chính `<dialog>`, ngoài khối trắng) hoặc nút `data-sheet-close` thì đóng. */
              if (e.target === ref.current) onClose();
              else if ((e.target as HTMLElement).closest('[data-sheet-close]')) onClose();
            }}>
      <div ref={panel} className="rounded-t-[1.375rem] bg-surface px-4 pt-2 shadow-card transition-transform"
           style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {/* Thanh kéo — kéo xuống quá 80px thì đóng. Chỉ trang trí với bàn phím (Esc đã đóng được). */}
        <div aria-hidden="true" className="flex h-6 touch-none items-center justify-center"
             onPointerDown={e => { drag.current = { y0: e.clientY, dy: 0 }; e.currentTarget.setPointerCapture(e.pointerId); }}
             onPointerMove={e => { if (drag.current) { drag.current.dy = e.clientY - drag.current.y0; setY(drag.current.dy); } }}
             onPointerUp={() => { const dy = drag.current?.dy ?? 0; drag.current = null; setY(0); if (dy > 80) onClose(); }}
             onPointerCancel={() => { drag.current = null; setY(0); }}>
          <span className="h-1.5 w-10 rounded-full bg-control" />
        </div>
        {children}
      </div>
    </dialog>
  );
}
