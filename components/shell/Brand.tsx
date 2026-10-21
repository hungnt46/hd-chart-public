/**
 * Chữ hiệu "Human Design Vietnam" (Aura): "Human Design" Newsreader + "Vietnam" chữ phụ,
 * hai chữ CÙNG đường chân chữ (website chốt: căn baseline, không căn giữa dọc).
 * Bấm ⇒ trang chủ website, mở ở cửa sổ cha (trong iframe /chart/ phải rời cả iframe).
 * Tên riêng, không dịch.
 */
import type { JSX } from 'react';
import { SITE_LINKS } from '../../lib/site-links.js';

/* `testId` chỉ cho chữ hiệu trên header — bảng menu website (luôn nằm trong DOM) dựng thêm một bản không testId. */
export function Brand({ small = false, testId }: { small?: boolean; testId?: string }): JSX.Element {
  return (
    <a href={SITE_LINKS[0]!.href} target="_top" data-testid={testId}
       className="flex min-h-11 shrink-0 items-center text-ink no-underline">
      <span className="inline-flex items-baseline gap-1.5 leading-none">
        <span className={`display tracking-[-.01em] ${small ? 'text-xl' : 'text-[length:var(--text-brand)]'}`}>Human Design</span>
        <span className="text-sm text-ink-2">Vietnam</span>
      </span>
    </a>
  );
}
