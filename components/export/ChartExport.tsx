'use client';
/**
 * Xuất biểu đồ đang xem — PNG · SVG · In/PDF (STATUS §4 E1, học ứng dụng
 * tham chiếu). Ảnh là ĐÚNG cái đang hiện trong khung chart (chart đơn,
 * transit, ghép, chu kỳ, mandala) kèm dòng chú thích.
 *
 * PDF không dùng thư viện: in qua một khung ẩn CHỈ chứa ảnh, người dùng chọn
 * "Lưu thành PDF" trong hộp thoại in của trình duyệt. Thêm jsPDF chỉ để làm
 * đúng việc đó là kéo thêm hàng trăm KB vào gói.
 */
import { useState, type JSX, type RefObject } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { collectParts, composeSvg } from './compose-svg.js';
import { rasterize } from './rasterize.js';
import { download } from './download.js';
import { Popover } from '../ui/Popover.js';
import { Icon } from '../ui/Icon.js';
import { Notice } from '../ui/Notice.js';
import { printInFrame } from './print-frame.js';

export interface ChartExportProps {
  /** Khung chứa các SVG của biểu đồ đang hiển thị. */
  target: RefObject<HTMLElement | null>;
  caption: readonly string[];
  /** Tên tệp, không đuôi. */
  fileBase: string;
  /** Mép canh của menu: `end` khi nút nằm sát mép phải (thanh trên cùng). */
  menuAlign?: 'start' | 'end';
  /**
   * Ba nút nằm THẲNG, không nút mở menu — bảng ⋯ của điện thoại (giao diện D) tự là
   * chỗ chứa. `data-testid` của ba nút giữ nguyên.
   */
  inline?: boolean;
}

/** Ảnh PNG vẽ ở 2× kích thước màn hình — đủ nét để in khổ A4. */
const PNG_SCALE = 2;
/* Mục trong menu: rộng trọn bảng, canh trái, vùng chạm 44px. */
const ITEM = 'btn btn-ghost w-full justify-start';


export function ChartExport({ target, caption, fileBase, menuAlign = 'start', inline = false }: ChartExportProps): JSX.Element {
  const { t } = useLanguage();
  const [err, setErr] = useState<string | null>(null);

  const build = (): { svg: string; width: number; height: number } => {
    const root = target.current;
    if (!root) throw new Error('Chưa có biểu đồ để xuất');
    const { width, height, parts } = collectParts(root);
    if (!parts.length) throw new Error('Chưa có biểu đồ để xuất');
    const svg = composeSvg({ width, height, parts, caption, fontFamily: getComputedStyle(document.body).fontFamily });
    const m = /width="(\d+)" height="(\d+)"/.exec(svg);
    return { svg, width: Number(m?.[1]), height: Number(m?.[2]) };
  };

  const run = (f: () => Promise<void> | void) => async () => {
    setErr(null);
    try { await f(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  const asSvg = run(() => {
    download(new Blob([build().svg], { type: 'image/svg+xml' }), `${fileBase}.svg`);
  });

  const asPng = run(async () => {
    const { svg, width, height } = build();
    const { blob } = await rasterize(svg, { width, height, scale: PNG_SCALE, mime: 'image/png' });
    download(blob, `${fileBase}.png`);
  });

  /*
   * In trong một <iframe> ẩn chỉ chứa ảnh: in cả trang thì ra kèm form, kho
   * chart, bảng tra… Khung tự gỡ sau khi in xong (hoặc sau 60 s nếu trình duyệt
   * không phát `afterprint`).
   */
  const asPrint = run(() => {
    const { svg } = build();
    // Tiêu đề ghép từ ngày/giờ của chart — có thể đến từ tệp nhập ⇒ `printInFrame` escape + sandbox.
    printInFrame({
      testId: 'print-frame', title: fileBase, body: svg,
      head: '<style>@page{margin:10mm}html,body{margin:0}svg{display:block;width:100%;height:auto;max-height:100vh}</style>',
    });
  });

  /*
   * ★ Gom ba nút vào MỘT menu "Xuất" (2026-09-25, audit F3): thanh công cụ cũ có
   *   năm nhóm nút giống hệt nhau, ba nút xuất chiếm cả một nhóm. Nút con giữ
   *   nguyên `data-testid`; menu LUÔN nằm trong DOM (ẩn bằng `hidden`).
   *   Lỗi hiện NGOÀI menu — menu tự đóng sau khi bấm nên lỗi bên trong sẽ bị giấu.
   */
  const items = (
    <div role="group" aria-label={t('export.group')} className={`flex flex-col ${inline ? '' : 'w-52'}`}>
      <button type="button" className={ITEM} data-testid="export-png" onClick={() => void asPng()}>{t('export.png')}</button>
      <button type="button" className={ITEM} data-testid="export-svg" onClick={() => void asSvg()}>{t('export.svg')}</button>
      <button type="button" className={ITEM} data-testid="export-print" onClick={() => void asPrint()}>{t('export.print')}</button>
    </div>
  );
  if (inline) {
    return (
      <div data-testid="chart-export">
        {items}
        {err && <Notice tone="danger" testId="export-error">{err}</Notice>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2" data-testid="chart-export">
      <Popover testId="export-menu" closeOnPick align={menuAlign} buttonClassName="btn max-lg:w-11 max-lg:px-0"
               label={<><Icon name="download" className="lg:hidden" /><span className="max-lg:sr-only">{t('export.menu')}</span>
                        <span aria-hidden="true" className="text-[10px] max-lg:hidden">▾</span></>}>
        {items}
      </Popover>
      {err && <Notice tone="danger" testId="export-error">{err}</Notice>}
    </div>
  );
}
