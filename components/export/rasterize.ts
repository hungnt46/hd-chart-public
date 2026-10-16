/**
 * SVG → ảnh raster (PNG / JPEG / WebP). Dùng chung cho nút Xuất của chart và
 * Illustrator (docs/PLAN-illustrator.md Phase 1c).
 *
 * Không thư viện: vẽ SVG lên `<canvas>` rồi `toBlob`.
 */

import { EXPORT_BACKGROUND } from './export-palette.js';

export type RasterMime = 'image/png' | 'image/jpeg' | 'image/webp';

export interface RasterOptions {
  /** Kích thước CSS của SVG; ảnh ra = kích thước × `scale`. */
  width: number;
  height: number;
  /** Hệ số nhân (chart: 2; Illustrator: 1–3 × khổ gốc `EXPORT_BASE`). */
  scale: number;
  mime: RasterMime;
  /** 0–1, chỉ JPEG/WebP dùng. */
  quality?: number;
  /**
   * Màu lót dưới ảnh. JPEG không có kênh alpha nên LUÔN được lót (mặc định
   * trắng) — không lót thì phần trong suốt ra màu đen.
   */
  background?: string | null;
}

export interface RasterResult {
  blob: Blob;
  /** Định dạng THẬT của `blob` — có thể khác định dạng đã xin, xem `fellBack`. */
  mime: RasterMime;
  /**
   * Trình duyệt không mã hoá được định dạng đã xin (Safari với WebP) và trả
   * PNG thay vào. Nơi gọi PHẢI báo người dùng (`Notice`), không âm thầm.
   */
  fellBack: boolean;
}

/** Đuôi tệp theo định dạng. */
export const EXT: Readonly<Record<RasterMime, string>> =
  { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

/** Màu lót thực dùng: JPEG bắt buộc có, còn lại theo yêu cầu. */
export function effectiveBackground(mime: RasterMime, background: string | null | undefined): string | null {
  if (mime === 'image/jpeg') return background ?? EXPORT_BACKGROUND;
  return background ?? null;
}

/**
 * Canvas trả định dạng nó MÃ HOÁ ĐƯỢC, không phải định dạng được xin: Safari
 * xin `image/webp` nhận về PNG. Đọc `blob.type` để biết thật.
 */
export function resolveEncoded(requested: RasterMime, blob: Blob): RasterResult {
  const actual = (Object.keys(EXT) as RasterMime[]).find(m => m === blob.type) ?? 'image/png';
  return { blob, mime: actual, fellBack: actual !== requested };
}

export async function rasterize(svg: string, o: RasterOptions): Promise<RasterResult> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(o.width * o.scale);
  canvas.height = Math.round(o.height * o.scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas 2D');
  const bg = effectiveBackground(o.mime, o.background);
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, o.mime, o.quality));
  if (!blob) throw new Error(`Không tạo được ảnh ${EXT[o.mime].toUpperCase()}`);
  return resolveEncoded(o.mime, blob);
}
