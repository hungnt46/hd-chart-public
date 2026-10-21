'use client';
/**
 * Sáu chế độ xem của một chart — nằm TRÊN THANH TRÊN CÙNG (Hưng chốt 2026-09-25,
 * phương án (a), đúng mockup hướng A). Dáng VIÊN bo 10px từ giao diện D (`.viewtab`).
 *
 * ★ Lịch sử để khỏi đi vòng: bản dựng đầu đặt tab thành ô 3×2 ở đầu bảng phải,
 *   vì thanh trên không đủ chỗ cho cả tab lẫn hai công tắc ngôn ngữ/giờ ghi tên
 *   đầy đủ, còn thêm một HÀNG riêng cho tab thì biểu đồ ở 1440×900 tụt dưới 8px.
 *   Hưng không duyệt thay đổi đó; chọn (a): tab lên thanh trên, hai công tắc
 *   viết ngắn. Từ 1400px tab nằm CÙNG hàng với thanh; hẹp hơn thì thành hàng thứ
 *   hai của chính thanh (dính theo khi cuộn) — lúc đó biểu đồ vốn đã bị bề ngang
 *   giới hạn nên thêm một hàng không làm số cổng nhỏ đi.
 *
 * Nút dùng `aria-pressed` (nhóm nút bật tắt), không phải `role=tab`: e2e và trình
 * đọc màn hình đã quen hợp đồng đó từ trước, và nội dung đổi theo là cả khung
 * làm việc chứ không phải một tabpanel liền kề.
 *
 * ★ Màn hẹp (375px): sáu tab ~550px không vừa một hàng ⇒ dải tab CUỘN NGANG.
 *   Tab khuất mà không có dấu hiệu là lặp lại đúng lỗi audit F1 (chế độ bị giấu),
 *   nên mép nào còn tab khuất thì mờ dần (`data-more`), và tab đang chọn luôn
 *   được cuộn vào tầm nhìn. Tự đặt `scrollLeft`, KHÔNG `scrollIntoView` — cái đó
 *   còn cuộn cả trang theo chiều dọc.
 */
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { PUBLIC_EDITION } from '../../lib/edition.js';

export type View = 'bodygraph' | 'mandala' | 'cross' | 'transit' | 'cycle' | 'connection';
/* Bản công khai (STATUS §5 #57) không có Chu kỳ. */
export const VIEWS: readonly View[] = (['bodygraph', 'mandala', 'cross', 'transit', 'cycle', 'connection'] as const)
  .filter(v => !PUBLIC_EDITION || v !== 'cycle');

export function ViewTabs({ view, setView }: { view: View; setView: (v: View) => void }): JSX.Element {
  const { t, lang } = useLanguage();
  const strip = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState<'' | 'l' | 'r' | 'lr'>('');
  const measure = useCallback(() => {
    const el = strip.current;
    if (!el) return;
    const l = el.scrollLeft > 1, r = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setMore(l && r ? 'lr' : l ? 'l' : r ? 'r' : '');
  }, []);
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);
  useEffect(() => {
    const el = strip.current;
    const b = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!el || !b) return;
    const pad = 32;   // chừa vệt mờ
    if (b.offsetLeft - pad < el.scrollLeft) el.scrollLeft = b.offsetLeft - pad;
    else if (b.offsetLeft + b.offsetWidth + pad > el.scrollLeft + el.clientWidth) {
      el.scrollLeft = b.offsetLeft + b.offsetWidth + pad - el.clientWidth;
    }
    measure();
  }, [view, lang, measure]);
  return (
    <div ref={strip} role="group" aria-label={t('view.group')} onScroll={measure} data-more={more || undefined}
         className="navtabs flex h-full min-w-0 items-stretch gap-1.5 overflow-x-auto [scrollbar-width:none] max-lg:gap-2">
      {VIEWS.map(v => (
        <button key={v} type="button" onClick={() => setView(v)} data-testid={`view-${v}`}
                aria-pressed={view === v} className="viewtab">
          {t(`view.${v}` as const)}
        </button>
      ))}
    </div>
  );
}
