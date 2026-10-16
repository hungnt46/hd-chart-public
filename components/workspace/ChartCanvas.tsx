'use client';
/**
 * Khung biểu đồ: VỪA KHUNG mặc định, PHÓNG tới mức đọc được, và TOÀN MÀN HÌNH.
 *
 * ★ Luật 8px (Hưng chốt 2026-09-25, audit F5): số cổng ≥ 8px là ngưỡng ĐỌC
 *   ĐƯỢC, không hạ. Nhưng 8px cần biểu đồ Classic cao ≥ 803px — trên điện thoại
 *   hay laptop thấp thì không thể vừa khung mà vẫn 8px. Nên:
 *     · màn đủ lớn (1440×900 trở lên): VỪA KHUNG đã ≥ 8px;
 *     · màn nhỏ hơn: mặc định VỪA KHUNG (thấy trọn hình dạng), và nấc phóng đầu
 *       tiên ("Cỡ đọc") đưa số cổng lên đúng ≥ 8px — test 8px kiểm ở nấc đó.
 *   Bản cũ ép biểu đồ rộng 880px rồi cho vuốt ngang: màn đầu trên điện thoại
 *   chỉ thấy nền tam giác trống, và thật ra số cổng vẫn chỉ 6px (audit F6).
 *
 * ★ Nút đặt TRONG khung, không chiếm bảng phải (Hưng xem lại 2026-09-25: bảng
 *   thuộc tính phải canh ngay lề trên của biểu đồ, không bị nút chủ đề / xuất /
 *   cỡ biểu đồ đẩy xuống — đúng mockup hướng A):
 *     · `corners` — nút PHỦ ở hai góc trên của Ô BIỂU ĐỒ (giữa hai cột hành
 *       tinh), chỗ trắng phía trên hai cạnh tam giác / ngoài vòng mandala. Không
 *       lấy chiều cao nào ⇒ số cổng 1440×900 giữ nguyên 8.1px. Vị trí tính theo
 *       hình học "vừa khung" nên khi phóng, nút đứng yên như nút bản đồ;
 *     · `band` — MỘT hàng ở đầu khung, chỉ cho chart ghép (bộ lọc Chỉ transit /
 *       Ghép / Chỉ chart của tôi — quá rộng để nằm trong góc) và lời nhắc chọn
 *       chu kỳ;
 *     · nút phóng "− Vừa khung +" trong khung: BỎ HẲN 2026-09-28 (Hưng: "cảm
 *       thấy không để làm gì"); điện thoại/tablet (< 1024px) còn "Phóng to"
 *       (toàn màn hình, có nấc phóng bên trong).
 *     · nút chủ đề Classic/Modern: rời khung 2026-09-28, vào bảng cài đặt trên
 *       thanh trên (Hưng chốt phương án D).
 *   Điện thoại (< 640px): hai góc trên đã có cột hành tinh (`data-mobile=
 *   "corners"`) ⇒ các nút góc xếp thành một hàng NGAY TRÊN biểu đồ.
 *
 * Phóng bằng BỀ NGANG thật (không `transform: scale`) để bố cục, cuộn, và bộ
 * ghép ảnh xuất (`compose-svg.ts` đọc vị trí thật của từng SVG) đều thấy đúng
 * kích thước đang vẽ. Kéo để di chuyển bằng chuột; cảm ứng và bàn di chuột dùng
 * cuộn gốc của trình duyệt.
 */
import {
  useCallback, useEffect, useLayoutEffect, useRef, useState, type JSX, type ReactNode, type RefObject,
} from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { Icon } from '../ui/Icon.js';
import { fitWidth, readZoom, rowPercents, rowRatio, zoomSteps, type RowSpec } from './layout.js';
import { PUBLIC_EDITION } from '../../lib/edition.js';

export interface ZoomState {
  index: number;
  steps: number[];
  full: boolean;
  setIndex: (i: number) => void;
  setFull: (f: boolean) => void;
  setSteps: (s: number[]) => void;
}

export function useZoom(): ZoomState {
  const [index, setIndex] = useState(0);
  const [steps, setSteps] = useState<number[]>([1]);
  const [full, setFullState] = useState(false);
  const setFull = useCallback((f: boolean) => {
    setFullState(f);
    // Vào toàn màn hình thì đi thẳng tới nấc ĐỌC ĐƯỢC — đó là lý do người ta bấm.
    setIndex(f ? 1 : 0);
  }, []);
  return { index, steps, full, setIndex, setFull, setSteps };
}

/** Khớp media query phía client; SSR và lần vẽ đầu trả `false`. */
export function useMedia(q: string): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setOn(m.matches);
    f();
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, [q]);
  return on;
}

export interface ChartCanvasProps {
  spec: RowSpec;
  /** Bề ngang viewBox của BODYGRAPH trong hàng và cỡ chữ số cổng (đơn vị khung). Mandala: bỏ trống. */
  gate?: { vbWidth: number; fontUnits: number };
  zoom: ZoomState;
  /** Khung chứa các SVG — nguồn cho nút xuất ảnh. */
  exportRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  /** Hàng công cụ ở đầu khung — chỉ cho chart ghép / lời nhắc. */
  band?: ReactNode;
  /**
   * Nút phủ ở góc trên TRÁI của ô biểu đồ (bodygraph-ở-tâm của Mandala; nút Xuất
   * trên điện thoại). Góc phải đã bỏ 2026-09-28: nút chủ đề chuyển vào bảng cài
   * đặt trên thanh trên (Hưng chốt, phương án D).
   */
  corners?: { tl?: ReactNode };
}

export function ChartCanvas({ spec, gate, zoom, exportRef, children, band, corners }: ChartCanvasProps): JSX.Element {
  const { t } = useLanguage();
  const desktop = useMedia('(min-width: 1024px)');
  const phone = useMedia('(max-width: 639.98px)');
  const fixedHeight = zoom.full || desktop;
  const scroller = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number; top: number; left: number } | null>(null);
  /* Hàng công cụ xuất hiện / biến mất thì khung cuộn dời xuống / lên — đo lại. */
  const hasBand = band !== undefined && band !== null && band !== false;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight, top: el.offsetTop, left: el.offsetLeft });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fixedHeight, hasBand]);

  const fit = box ? fitWidth(spec, box.w, fixedHeight ? box.h : Infinity) : 0;
  const { setSteps } = zoom;
  const read = gate && fit ? readZoom(spec, fit, gate.vbWidth, gate.fontUnits) : 1;
  const stepsKey = zoomSteps(read).map(z => z.toFixed(3)).join(',');
  useEffect(() => { setSteps(stepsKey.split(',').map(Number)); }, [stepsKey, setSteps]);
  const z = zoom.steps[Math.min(zoom.index, zoom.steps.length - 1)] ?? 1;
  const width = fit * z;

  /* Đổi nấc phóng thì GIỮ tâm khung nhìn; lần đầu phóng thì canh giữa biểu đồ. */
  const lastWidth = useRef(width);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !width) return;
    const prev = lastWidth.current;
    lastWidth.current = width;
    if (!prev || prev === width) return;
    const k = width / prev;
    const cx = (el.scrollLeft + el.clientWidth / 2) * k, cy = (el.scrollTop + el.clientHeight / 2) * k;
    el.scrollLeft = cx - el.clientWidth / 2;
    el.scrollTop = cy - el.clientHeight / 2;
  }, [width]);

  /* Esc thoát toàn màn hình; khoá cuộn trang phía sau. */
  useEffect(() => {
    if (!zoom.full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') zoom.setFull(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [zoom]);

  /* Kéo để di chuyển — chỉ chuột, chỉ khi biểu đồ lớn hơn khung. */
  const drag = useRef<{ x: number; y: number; l: number; t: number } | null>(null);
  const zoomed = z > 1.001;
  const onPointerDown = (e: React.PointerEvent) => {
    const el = scroller.current;
    if (!el || e.pointerType !== 'mouse' || !zoomed || e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, l: el.scrollLeft, t: el.scrollTop };
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = scroller.current, d = drag.current;
    if (!el || !d) return;
    el.scrollLeft = d.l - (e.clientX - d.x);
    el.scrollTop = d.t - (e.clientY - d.y);
  };
  const endDrag = () => { drag.current = null; };

  /*
   * ★ Hưng chốt 2026-09-28: BỎ nút phóng "− Vừa khung +" trong khung ("cảm thấy
   *   không để làm gì"). Trước đó nó hiện khi vừa khung < 8px (laptop thấp). Máy
   *   tính giờ chỉ có "vừa khung"; muốn to hơn thì phóng trình duyệt (⌘ +).
   *   Điện thoại / máy tính bảng (< 1024px) GIỮ nút "Phóng to" toàn màn hình —
   *   nút khác, trong đó vẫn có nấc phóng.
   *   BẢN CÔNG KHAI bỏ luôn "Phóng to" ở mọi khổ (Hưng 2026-10-15, STATUS §5 #68).
   */
  const zoomCtl = PUBLIC_EDITION || zoom.full || desktop || phone ? null : (
    <button type="button" className="btn bg-surface embed:hidden" onClick={() => zoom.setFull(true)} data-testid="chart-fullscreen">
      <Icon name="expand" />{t('canvas.fullscreen')}
    </button>
  );
  /* Điện thoại (giao diện D, mockup M2): nút BIỂU TƯỢNG 44px ở góc DƯỚI PHẢI khung, không chiếm một hàng.
     Nhúng (`embed:hidden`, mockup C): "toàn màn hình" trong iframe chỉ phủ được iframe ⇒ bỏ cả hai nút. */
  const zoomFab = !PUBLIC_EDITION && phone && !zoom.full ? (
    <button type="button" onClick={() => zoom.setFull(true)} data-testid="chart-fullscreen" aria-label={t('canvas.fullscreen')}
            className="btn btn-icon absolute bottom-2 right-2 z-10 rounded-xl border-line bg-surface/90 embed:hidden">
      <Icon name="expand" />
    </button>
  ) : null;

  /* Ô biểu đồ ở hình học "vừa khung" — nút góc bám vào đó. */
  const pct = rowPercents(spec);
  const cell = box && fit ? {
    top: box.top + (fixedHeight ? Math.max(0, (box.h - fit / rowRatio(spec)) / 2) : 0),
    left: box.left + Math.max(0, (box.w - fit) / 2) + fit * pct.left / 100,
    width: fit * pct.chart / 100,
    height: fit / rowRatio(spec),
  } : null;
  const tl = <>{corners?.tl}{zoomCtl}</>;
  const hasCorners = !zoom.full && Boolean(corners?.tl ?? zoomCtl);

  /* Giao diện D: thẻ trắng nổi bằng bóng, bo 18px. Viền TRONG SUỐT 1px giữ đúng bề ngang
     cũ — bỏ hẳn viền là biểu đồ to thêm 2px và mọi ảnh tham chiếu lệch theo. */
  return (
    <div data-testid="chart-canvas" data-full={zoom.full ? 'true' : 'false'} data-zoom={z.toFixed(3)}
         className={zoom.full
           ? 'fixed inset-0 z-50 flex flex-col bg-surface'
           : `${PUBLIC_EDITION ? 'pub-canvas ' : ''}relative overflow-hidden rounded-[1.125rem] border border-transparent bg-surface shadow-card ${
             desktop ? 'flex h-[calc(var(--vh100)-var(--topbar-h)-.625rem)] min-h-[26rem] flex-col' : ''}`}>
      {zoom.full && (
        <div className="flex items-center justify-between gap-2 border-b border-line p-2"
             style={{ paddingTop: 'max(.5rem, env(safe-area-inset-top))' }}>
          <button type="button" className="btn" onClick={() => zoom.setFull(false)} data-testid="chart-fullscreen-close">
            <Icon name="close" />{t('canvas.close')}
          </button>
          <ZoomStepper zoom={zoom} inFull />
        </div>
      )}
      {/* Hàng đầu khung — KHÔNG kẻ đường, như các nút nổi ở đầu khung transit của proposal. */}
      {hasBand && (
        <div className="flex flex-wrap items-start justify-between gap-2 px-2 pt-2 sm:px-2.5 sm:pt-2.5" data-testid="canvas-band">
          {band}
        </div>
      )}
      {/*
        Nút góc — TRƯỚC khung cuộn trong DOM (Tab tới nút rồi mới tới biểu đồ).
        < 640px: một hàng tĩnh. Từ 640px: phủ lên góc trên-trái của ô biểu đồ.
      */}
      {hasCorners && (
        <div data-testid="canvas-corners"
             className={`flex flex-wrap items-center gap-2 border-b border-line p-2 max-sm:bg-surface
                         sm:pointer-events-none sm:absolute sm:z-10 sm:items-start sm:border-0
                         sm:left-[var(--cx-left)] sm:top-[var(--cx-top)] sm:w-[var(--cx-w)]
                         ${cell ? '' : 'sm:invisible'}`}
             style={cell ? { ['--cx-top' as string]: `${cell.top}px`, ['--cx-left' as string]: `${cell.left}px`,
                             ['--cx-w' as string]: `${cell.width}px` } : undefined}>
          <div className="flex flex-wrap items-center gap-2 sm:pointer-events-auto sm:flex-col sm:items-start">{tl}</div>
        </div>
      )}
      <div ref={scroller} tabIndex={zoomed ? 0 : -1} aria-label={zoomed ? t('canvas.panHint') : undefined}
           role={zoomed ? 'region' : undefined}
           onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
           className={`${fixedHeight ? 'min-h-0 flex-1' : ''} ${
             zoomed ? 'cursor-grab overflow-auto overscroll-contain active:cursor-grabbing' : 'overflow-hidden'} flex`}>
        <div ref={exportRef} data-export-root className="m-auto shrink-0" style={{ width: width || '100%' }}>
          {children}
        </div>
      </div>
      {zoomFab}
    </div>
  );
}

/**
 * Nấc phóng − · Vừa khung · + (máy tính). Bản trong thanh toàn màn hình mang
 * testid riêng — hai bản có thể cùng có mặt trong DOM.
 */
function ZoomStepper({ zoom, inFull = false }: { zoom: ZoomState; inFull?: boolean }): JSX.Element {
  const { t } = useLanguage();
  const last = zoom.steps.length - 1;
  const id = (k: string) => (inFull ? `full-${k}` : k);
  return (
    <div role="group" aria-label={t('canvas.zoomGroup')} className="seg">
      <button type="button" aria-label={t('canvas.zoomOut')} disabled={zoom.index === 0}
              onClick={() => zoom.setIndex(Math.max(0, zoom.index - 1))} data-testid={id('zoom-out')}
              className="disabled:opacity-40"><Icon name="minus" /></button>
      <button type="button" aria-pressed={zoom.index === 0} onClick={() => zoom.setIndex(0)} data-testid={id('zoom-fit')}>
        {t('canvas.fit')}
      </button>
      <button type="button" aria-label={t('canvas.zoomIn')} disabled={zoom.index >= last}
              onClick={() => zoom.setIndex(Math.min(last, zoom.index + 1))} data-testid={id('zoom-in')}
              className="disabled:opacity-40"><Icon name="plus" /></button>
    </div>
  );
}
