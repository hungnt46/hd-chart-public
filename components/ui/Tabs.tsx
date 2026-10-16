'use client';
/**
 * Dải tab theo mẫu WAI-ARIA APG "Tabs" (kích hoạt tự động): `role="tablist"`,
 * mỗi tab `aria-selected` + `aria-controls`, CHỈ tab đang chọn nằm trong thứ tự
 * Tab (`tabIndex` lăn), ← → Home End đổi tab và đưa focus theo.
 *
 * Dùng cho tab NỘI DUNG liền kề (Tra cứu chi tiết: Cổng · Kênh · Trung tâm).
 * Sáu CHẾ ĐỘ XEM trên thanh trên KHÔNG dùng cái này — chúng là nhóm nút
 * `aria-pressed` (`shell/ViewTabs`), vì thứ đổi theo là cả khung làm việc chứ
 * không phải một tabpanel ngay dưới.
 *
 * ★ Trước 2026-09-26 dải tab Tra cứu có `role="tab"` nhưng KHÔNG có phím mũi
 *   tên và cả ba tab đều nằm trong thứ tự Tab — trình đọc màn hình báo "tab 1
 *   trên 3" rồi phím mũi tên không làm gì.
 *
 * Panel do nơi gọi tự vẽ, với `id={panelId(k)}` và `aria-labelledby={tabId(k)}`.
 *
 * Hai kiểu nhìn, cùng hành vi: `fill` (mặc định, `.tab` tô mực — Tra cứu) và
 * `underline` (`.navtab` gạch chân — bảng Illustrator; Hưng chọn 2026-09-29 giữ
 * nhìn của mockup Phase 2 nhưng đổi sang tab đúng chuẩn, trước đó là nhóm nút
 * `aria-pressed`).
 */
import { useRef, type JSX, type KeyboardEvent, type ReactNode } from 'react';

export interface TabListProps<K extends string> {
  label: string;
  tabs: readonly K[];
  value: K;
  onChange: (k: K) => void;
  /** Tiền tố id (thường `useId()`): tab = `${idBase}-tab-${k}`, panel = `${idBase}-panel-${k}`. */
  idBase: string;
  renderLabel: (k: K) => ReactNode;
  /** Thuộc tính thêm cho từng tab (testid, data-count…). */
  tabProps?: (k: K) => Record<string, string | number | undefined>;
  className?: string;
  variant?: 'fill' | 'underline';
  /** Lớp thêm cho TỪNG tab (ví dụ `flex-1 justify-center` để chia đều). */
  tabClassName?: string;
}

export const tabId = (idBase: string, k: string) => `${idBase}-tab-${k}`;
export const panelId = (idBase: string, k: string) => `${idBase}-panel-${k}`;

export function TabList<K extends string>({
  label, tabs, value, onChange, idBase, renderLabel, tabProps, className = '', variant = 'fill', tabClassName = '',
}: TabListProps<K>): JSX.Element {
  const cls = `${variant === 'underline' ? 'navtab' : 'tab'} ${tabClassName}`.trim();
  const list = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.indexOf(value);
    const next = e.key === 'ArrowRight' ? (i + 1) % tabs.length
      : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? tabs.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    const k = tabs[next]!;
    onChange(k);
    list.current?.ownerDocument.getElementById(tabId(idBase, k))?.focus();
  };
  return (
    <div ref={list} role="tablist" aria-label={label} className={className} onKeyDown={onKeyDown}>
      {tabs.map(k => (
        <button key={k} type="button" role="tab" id={tabId(idBase, k)} aria-controls={panelId(idBase, k)}
                aria-selected={k === value} tabIndex={k === value ? 0 : -1}
                onClick={() => onChange(k)} className={cls} {...tabProps?.(k)}>
          {renderLabel(k)}
        </button>
      ))}
    </div>
  );
}
