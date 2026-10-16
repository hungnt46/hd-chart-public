/**
 * Ghép biểu đồ ĐANG HIỂN THỊ thành một tệp SVG độc lập — STATUS §4 E1 (học
 * ứng dụng tham chiếu).
 *
 * Khung chart trên trang là LƯỚI của nhiều SVG riêng (cột trái · bodygraph ·
 * cột phải, hoặc mandala). Ở đây đọc vị trí THẬT của từng SVG trên màn hình rồi
 * đặt chúng vào một SVG ngoài cùng đúng chỗ đó — ảnh xuất ra y như người dùng
 * đang thấy, không dựng lại bố cục lần hai (dựng lại là hai nơi giữ một bố cục,
 * sớm muộn lệch nhau).
 *
 * Được vì các SVG của app TỰ CHỨA: màu, sọc, pattern đều nằm trong thuộc tính
 * và `<defs>` của chính nó, không dựa vào class CSS nào (đã soát 2026-09-23).
 */

import { EXPORT_BACKGROUND, EXPORT_CAPTION_INK } from './export-palette.js';
export interface Placed {
  /** `outerHTML` của một SVG trên trang. */
  markup: string;
  x: number; y: number; width: number; height: number;
}

export interface ComposeInput {
  width: number;
  height: number;
  parts: readonly Placed[];
  /** Dòng chú thích phía trên biểu đồ (ngày giờ, nơi sinh, Type · Profile…). */
  caption: readonly string[];
  fontFamily: string;
  /**
   * Màu nền. Bỏ trống ⇒ trắng như trước; `null` ⇒ TRONG SUỐT, không có `<rect>`
   * nền (Illustrator xuất PNG/WebP nền trong suốt).
   */
  background?: string | null;
  /**
   * Chỗ đặt chú thích. Mặc định như nút Xuất của chart: trên, canh trái, cỡ
   * 15/13px. Illustrator (mockup Hưng duyệt 2026-09-28): DƯỚI hình, canh giữa,
   * cỡ nhân `scale` vì ảnh vẽ theo khổ bản vẽ (~1400px) chứ không theo màn hình.
   */
  captionLayout?: { at: 'top' | 'bottom'; align: 'start' | 'middle'; scale: number };
}

const CAPTION_LINE = 20;
const CAPTION_PAD = 12;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Mở thẻ `<svg …>` của một phần rồi GHI ĐÈ vị trí/kích thước, bỏ `class`. */
function placeSvg(p: Placed, dy: number): string {
  const m = /^<svg\b([^>]*)>/.exec(p.markup);
  if (!m) throw new Error('compose-svg: phần tử không phải <svg>');
  const attrs = m[1]!
    .replace(/\s(class|style|width|height|x|y)="[^"]*"/g, '')
    .replace(/\sxmlns="[^"]*"/, '');
  const f = (n: number) => String(Math.round(n * 100) / 100);
  return `<svg${attrs} x="${f(p.x)}" y="${f(p.y + dy)}" width="${f(p.width)}" height="${f(p.height)}">` +
    p.markup.slice(m[0].length);
}

export function composeSvg({
  width, height, parts, caption, fontFamily, background = EXPORT_BACKGROUND,
  captionLayout = { at: 'top', align: 'start', scale: 1 },
}: ComposeInput): string {
  const k = captionLayout.scale;
  const band = caption.length ? (CAPTION_PAD * 2 + caption.length * CAPTION_LINE) * k : 0;
  const dy = captionLayout.at === 'top' ? band : 0;
  const y0 = captionLayout.at === 'top' ? 0 : height;
  const W = Math.ceil(width), H = Math.ceil(height + band);
  const middle = captionLayout.align === 'middle';
  const x = middle ? W / 2 : CAPTION_PAD * k;
  const lines = caption.map((c, i) =>
    `<text x="${r2(x)}" y="${r2(y0 + (CAPTION_PAD + (i + 1) * CAPTION_LINE - 5) * k)}" font-size="${r2((i === 0 ? 15 : 13) * k)}"` +
    `${middle ? ' text-anchor="middle"' : ''} font-weight="${i === 0 ? 600 : 400}" fill="${EXPORT_CAPTION_INK}">${esc(c)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"` +
    ` width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${esc(fontFamily)}">` +
    (background === null ? '' : `<rect width="100%" height="100%" fill="${esc(background)}"/>`) + lines +
    parts.map(p => placeSvg(p, dy)).join('') + '</svg>';
}

const r2 = (n: number) => String(Math.round(n * 100) / 100);

/**
 * Đọc các SVG CẤP NGOÀI CÙNG trong `root` (không lấy SVG lồng bên trong một SVG
 * khác) cùng vị trí của chúng so với `root`.
 */
export function collectParts(root: HTMLElement): { width: number; height: number; parts: Placed[] } {
  const box = root.getBoundingClientRect();
  const parts: Placed[] = [];
  let right = 0, bottom = 0;
  for (const el of root.querySelectorAll('svg')) {
    if (el.parentElement?.closest('svg')) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const p = { markup: el.outerHTML, x: r.left - box.left, y: r.top - box.top, width: r.width, height: r.height };
    parts.push(p);
    right = Math.max(right, p.x + p.width);
    bottom = Math.max(bottom, p.y + p.height);
  }
  return { width: Math.max(box.width, right), height: Math.max(bottom, 1), parts };
}
