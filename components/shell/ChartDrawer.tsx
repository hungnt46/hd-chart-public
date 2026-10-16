'use client';
/**
 * Ngăn kéo "Chọn chart" — trượt từ trái, mở bằng nút "Kho chart" hoặc bấm vào
 * danh tính chart trên thanh trên (Hưng chốt 2026-09-25, audit F1).
 *
 * Gom HAI lối đổi chart vào một chỗ: tạo chart mới (form) và mở chart đã lưu
 * (kho). Trước đây cả hai đứng TRƯỚC biểu đồ trong cột trái — trên điện thoại,
 * tính xong người dùng vẫn chỉ thấy kho, biểu đồ nằm dưới nếp gấp (y = 838px).
 *
 * KHÔNG modal: trên máy tính ngăn kéo che nửa trái, phần còn lại vẫn dùng được
 * (mở chart từ kho rồi nhìn nó ngay bên cạnh). Esc đóng và trả focus về nút mở.
 *
 * ★ Điện thoại (< 640px, 2026-09-26): ngăn kéo rộng TRỌN màn nên nội dung phía
 *   sau bị che hết — nhưng trước đây Tab vẫn đi vào đó, focus nằm dưới ngăn kéo
 *   mà không thấy (WCAG 2.4.11). Nay `<main>` thành `inert` CHỈ ở khổ đó; thanh
 *   trên vẫn dùng được (nút Kho chart / Chart mới đóng-mở ngăn kéo). Máy tính giữ
 *   nguyên không modal (STATUS §5 #25).
 * Nội dung LUÔN gắn (ẩn bằng `hidden`) để kho không phải mở lại IndexedDB mỗi
 * lần và ô tên chart giữ giá trị gợi ý.
 */
import { useEffect, useRef, type JSX, type ReactNode } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { Icon } from '../ui/Icon.js';

export interface ChartDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Mục "Chart mới" đang mở (bấm nút Chart mới) hay thu gọn (mở kho). */
  newOpen: boolean;
  onToggleNew: () => void;
  form: ReactNode;
  library: ReactNode;
  /** Tăng mỗi lần bấm "Lưu" trên thanh trên ⇒ đưa focus vào ô tên chart của kho. */
  focusSave?: number;
}

export function ChartDrawer({ open, onClose, newOpen, onToggleNew, form, library, focusSave = 0 }: ChartDrawerProps): JSX.Element {
  const { t } = useLanguage();
  const heading = useRef<HTMLHeadingElement>(null);
  const back = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    back.current = document.activeElement as HTMLElement | null;
    // Mở để tạo chart mới thì form tự focus vào ô ngày; mở kho thì focus tiêu đề.
    if (!newOpen) heading.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      back.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const main = document.querySelector('main');
    const mq = window.matchMedia('(max-width: 639.98px)');
    const apply = () => { if (main) main.inert = mq.matches; };
    apply();
    mq.addEventListener('change', apply);
    return () => { mq.removeEventListener('change', apply); if (main) main.inert = false; };
  }, [open]);

  /* Sau effect trên (cùng lượt vẽ, khai sau nên chạy sau) — thắng focus vào tiêu đề. */
  useEffect(() => {
    if (!open || !focusSave) return;
    const el = document.querySelector<HTMLInputElement>('#chart-drawer [data-testid=library-name]');
    el?.focus();
    el?.select();
  }, [open, focusSave]);

  return (
    <aside id="chart-drawer" hidden={!open} aria-labelledby="drawer-h" data-testid="chart-drawer"
           className="fixed bottom-0 left-0 top-[calc(var(--topbar-h)+env(safe-area-inset-top))] z-20 w-full overflow-y-auto overscroll-contain border-r border-line bg-page shadow-2xl sm:w-[26rem]">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-page/95 px-4 py-2 backdrop-blur">
        <h2 id="drawer-h" ref={heading} tabIndex={-1} className="section-title">{t('shell.drawerTitle')}</h2>
        <button type="button" className="btn btn-icon btn-ghost" aria-label={t('shell.close')} onClick={onClose}
                data-testid="drawer-close">
          <Icon name="close" />
        </button>
      </div>

      <div className="space-y-4 p-4 pb-10">
        <section className="card p-4" aria-labelledby="drawer-new-h">
          <h3 id="drawer-new-h">
            <button type="button" aria-expanded={newOpen} aria-controls="drawer-new" onClick={onToggleNew}
                    className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-base font-semibold">
              <span className="flex items-center gap-2"><Icon name="plus" />{t('shell.newChart')}</span>
              <Icon name="chevronDown" className={`text-ink-3 transition-transform ${newOpen ? 'rotate-180' : ''}`} />
            </button>
          </h3>
          <div id="drawer-new" hidden={!newOpen} className="mt-3">{form}</div>
        </section>

        <div className="card p-4">{library}</div>
      </div>
    </aside>
  );
}
