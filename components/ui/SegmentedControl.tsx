'use client';
/**
 * Nhóm chọn MỘT trong vài lựa chọn (Classic | Modern, Cổng | Hào, Theo giờ |
 * Theo ngày, 13 thiên thể…) — kiểu rãnh xám của proposal hướng A (`.seg` trong
 * `app/globals.css`).
 *
 * Hợp đồng a11y GIỮ NGUYÊN như các nhóm tự dựng trước đây: `role="group"` có
 * nhãn + mỗi nút `aria-pressed`. Không đổi sang `role="radiogroup"` / phím mũi
 * tên: e2e và trình đọc màn hình đã quen hợp đồng này (xem `shell/ViewTabs`),
 * và Tab đi qua từng nút như mọi chỗ khác trong app.
 *
 * ★ Trước 2026-09-26 có BỐN kiểu nhóm nút: `.seg` ở bảy chỗ, và ba nhóm tự
 *   dựng (Theo dõi kích hoạt, Thay đổi sắp tới, Lịch Thiên văn Rave) — nền mực
 *   khi chọn, cao cứng 44px kể cả khi dùng chuột, Lịch còn dùng xám Tailwind
 *   thô thay cho tokens. Nay một component.
 */
import type { JSX, ReactNode } from 'react';

export interface SegmentOption<V extends string | number | boolean> {
  value: V;
  label: ReactNode;
  testId?: string;
  /** Nhãn cho trình đọc màn hình khi `label` là ký hiệu / chữ rút gọn — phải CHỨA chữ hiển thị (WCAG 2.5.3). */
  ariaLabel?: string;
  title?: string;
  lang?: string;
}

export interface SegmentedControlProps<V extends string | number | boolean> {
  /** Nhãn của cả nhóm — bắt buộc, `role="group"` không nhãn là nhóm câm. */
  label: string;
  value: V;
  onChange: (v: V) => void;
  options: readonly SegmentOption<V>[];
  /** Nhiều lựa chọn thì xuống dòng (rãnh thành khay). */
  wrap?: boolean;
  className?: string;
  testId?: string;
}

export function SegmentedControl<V extends string | number | boolean>({
  label, value, onChange, options, wrap = false, className = '', testId,
}: SegmentedControlProps<V>): JSX.Element {
  return (
    <div role="group" aria-label={label} className={`seg ${className}`} data-wrap={wrap || undefined}
         data-testid={testId}>
      {options.map(o => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value}
                onClick={() => onChange(o.value)} data-testid={o.testId}
                aria-label={o.ariaLabel} title={o.title} lang={o.lang}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
