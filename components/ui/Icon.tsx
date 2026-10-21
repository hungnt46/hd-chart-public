/**
 * Biểu tượng nét 1.75, khung 24 — vẽ tay, không kéo thư viện icon vào gói
 * (cả app chỉ cần chưa tới chục hình).
 *
 * LUÔN `aria-hidden`: nút nào chỉ có biểu tượng thì PHẢI tự mang `aria-label`.
 *
 * ★ Đừng đặt biểu tượng BÊN TRONG khung xuất ảnh (`ChartCanvas` › `data-export-root`):
 *   bộ ghép ảnh (`components/export/compose-svg.ts`) nhặt MỌI `<svg>` cấp ngoài
 *   cùng trong khung đó.
 */
import type { JSX } from 'react';

const PATHS = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  library: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H9l2 2h7.5A1.5 1.5 0 0 1 20 7.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z',
  download: 'M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  fit: 'M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4M9 9h6v6H9z',
  save: 'M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  /* Cài đặt hiển thị (ngôn ngữ · giờ · chủ đề): hai thanh trượt. */
  sliders: 'M4 8h8M16 8h4M4 16h4M12 16h8M14 8m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M10 16m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  /* Illustrator (Phase 2). */
  pen: 'M4 20l4-1 11-11a2.1 2.1 0 0 0-3-3L5 16l-1 4zM14 6l3 3',
  /** Chart sinh trong Kho (cạnh `pen` = bản vẽ). */
  triangle: 'M12 4l8.5 15h-17z',
  /* Thanh đáy điện thoại (giao diện D): mandala = hai vòng; transit = con mắt. */
  mandala: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  transit: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 12c0-2 4-5 9-5s9 3 9 5-4 5-9 5-9-3-9-5z',
  undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  upload: 'M12 20V9m0 0l-4.5 4.5M12 9l4.5 4.5M5 5h14',
  calendar: 'M6 5h12a2.5 2.5 0 0 1 2.5 2.5v10A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5v-10A2.5 2.5 0 0 1 6 5zM3.5 10h17M8 3v4M16 3v4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  reset: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4',
  /* Aura (2026-10-21): nút menu website (hai vạch), mũi tên link, hai ô thanh đáy bản công khai. */
  twoLines: 'M5 9.5h14M5 14.5h14',
  arrowRight: 'M5 12h14m0 0l-5-5m5 5l-5 5',
  cross: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 4v16M4 12h16',
  connection: 'M9 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM15 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={name === 'more' ? 3 : 1.75} strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true" focusable="false" className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}
