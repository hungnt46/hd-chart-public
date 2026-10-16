'use client';
/**
 * Cầu nối iframe ↔ trang cha của chế độ NHÚNG (`?embed=1`, chỉ bản công khai) — P7c.
 *
 *   · Gắn `data-embed` lên <html> NGAY (tập lệnh nội tuyến ở layout đã làm trước khi vẽ;
 *     đây là lưới an toàn) — CSS ở `app/globals.css` bám nó: bỏ `min-h-screen`, ẩn thanh cuộn,
 *     và `--vh100` thôi theo chiều cao iframe.
 *   · Báo chiều cao nội dung cho trang cha (`height`), chỉ tới origin trong danh sách.
 *   · Nghe `viewport` của trang cha để biết "màn hình" thật cao bao nhiêu (iframe tự co theo
 *     nội dung nên `100dvh` của nó vô nghĩa — dùng sẽ thành vòng lặp cao mãi) và đang nhìn
 *     tới đâu (`top` ⇒ `--embed-top`, hộp thoại / bảng trượt đặt theo đó).
 *   · Ô nhập nhận focus ⇒ báo vị trí (`focus`) để trang cha cuộn khỏi bàn phím iPhone.
 * Giao thức đầy đủ: `docs/CHART-INTEGRATION.md`. Phần thuần ở `lib/embed.ts`.
 */
import { useEffect } from 'react';
import { PUBLIC_EDITION } from '../../lib/edition';
import {
  childMessage, embedParents, parseViewport, resolveParentOrigin, wantsEmbed, DEFAULT_EMBED_VIEWPORT_PX,
  type ChildMessage,
} from '../../lib/embed';

export function EmbedBridge(): null {
  useEffect(() => {
    if (!PUBLIC_EDITION || !wantsEmbed(window.location.search, true)) return;
    const root = document.documentElement;
    root.dataset.embed = '1';
    root.style.setProperty('--embed-vh', `${DEFAULT_EMBED_VIEWPORT_PX}px`);

    const allowed = embedParents();
    const inFrame = window.parent !== window;
    // Firefox không có `ancestorOrigins` (lib.dom khai báo nó luôn có) ⇒ ép kiểu thành tuỳ chọn.
    const ancestors = (window.location as { ancestorOrigins?: DOMStringList }).ancestorOrigins;
    const parentOrigin = inFrame
      ? resolveParentOrigin(ancestors ? Array.from(ancestors) : undefined, document.referrer, allowed)
      : null;
    const send = (m: ChildMessage) => { if (parentOrigin) window.parent.postMessage(m, parentOrigin); };

    let last = -1;
    let raf = 0;
    const report = () => {
      raf = 0;
      // Đo THÂN trang, không phải documentElement: documentElement.scrollHeight không bao giờ nhỏ hơn
      // chiều cao iframe, nên trang cha không thu iframe lại được khi nội dung ngắn đi.
      const h = Math.ceil(document.body.getBoundingClientRect().height);
      if (h !== last) { last = h; send(childMessage.height(h)); }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(report); };
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    window.addEventListener('resize', schedule);

    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent || e.origin !== parentOrigin) return;
      const v = parseViewport(e.data);
      if (v) {
        root.style.setProperty('--embed-vh', `${v.height}px`);
        root.style.setProperty('--embed-top', `${v.top}px`);
        schedule();
      }
    };
    window.addEventListener('message', onMessage);

    const onFocus = (e: FocusEvent) => {
      const el = e.target;
      if (!(el instanceof HTMLElement) || !el.matches('input, select, textarea, [contenteditable=true]')) return;
      const r = el.getBoundingClientRect();
      send(childMessage.focus(r.top + window.scrollY, r.bottom + window.scrollY));
    };
    document.addEventListener('focusin', onFocus);

    send(childMessage.ready());
    report();
    return () => {
      ro.disconnect(); cancelAnimationFrame(raf);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('message', onMessage);
      document.removeEventListener('focusin', onFocus);
      delete root.dataset.embed;
      root.style.removeProperty('--embed-vh');
      root.style.removeProperty('--embed-top');
    };
  }, []);
  return null;
}
