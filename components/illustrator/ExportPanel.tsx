'use client';
/**
 * Thẻ "Xuất ảnh" của Illustrator — mockup Phase 2 (Hưng duyệt 2026-09-28):
 * tên + dòng bản quyền (in DƯỚI hình, canh giữa) · PNG/JPEG/WebP · nền trong
 * suốt/trắng/màu · 1×/2×/3× · xem trước · Tải ảnh.
 *
 * Ảnh xuất lấy từ chính SVG xem trước (cùng component với khung vẽ —
 * `IllustrationFigure`), khổ 1× = `figureSize`, không phụ thuộc cỡ màn hình.
 * Safari không mã hoá WebP ⇒ `rasterize` trả PNG kèm `fellBack`: BÁO bằng
 * `Notice`, không âm thầm (plan 1c).
 */
import { useEffect, useRef, useState, type CSSProperties, type JSX } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { composeSvg } from '../export/compose-svg.js';
import { EXT, rasterize, type RasterMime } from '../export/rasterize.js';
import { download } from '../export/download.js';
import { SegmentedControl } from '../ui/SegmentedControl.js';
import { Notice } from '../ui/Notice.js';
import { Icon } from '../ui/Icon.js';
import type { IllustrationApi } from './useIllustration.js';
import { IllustrationFigure, figureSize } from './Figure.js';
import { fold } from './fold.js';

type Bg = 'transparent' | 'white' | 'color';
type Scale = 1 | 2 | 3;
/**
 * Khổ gốc ảnh xuất = HAI lần khung bản vẽ (Hưng 2026-09-29, sau khi so ứng dụng tham chiếu:
 * "2x" của bản đó ra 10000 × 8200, còn 2× cũ của ta chỉ 2952 × 4034). Classic 1×
 * nay 2758 × 2668, 3× 8274 × 8004. Nút Xuất của chart sinh KHÔNG đổi.
 */
export const EXPORT_BASE = 2;
const FORMATS: readonly RasterMime[] = ['image/png', 'image/jpeg', 'image/webp'];
const FMT_NAME: Readonly<Record<RasterMime, string>> = { 'image/png': 'PNG', 'image/jpeg': 'JPEG', 'image/webp': 'WebP' };
const fmtName = (m: RasterMime) => FMT_NAME[m];

/** Tên tệp an toàn từ tên bản vẽ. */
const fileBase = (name: string) =>
  fold(name).replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  || 'bodygraph';

export function ExportPanel({ api }: { api: IllustrationApi }): JSX.Element {
  const { t } = useLanguage();
  const { state: s, update, renameReq } = api;
  const [mime, setMime] = useState<RasterMime>('image/png');
  const [bg, setBg] = useState<Bg>('transparent');
  const [bgColor, setBgColor] = useState('#f3f4f6');
  const [scale, setScale] = useState<Scale>(2);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fellBack, setFellBack] = useState<RasterMime | null>(null);
  /** Cỡ thật đã xuất khi phải hạ vì trần canvas của trình duyệt. */
  const [shrunk, setShrunk] = useState<Scale | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!renameReq) return;
    nameInput.current?.focus();
    nameInput.current?.select();
  }, [renameReq]);

  const caption = [s.meta.name.trim(), s.meta.copyright.trim()].filter(Boolean);
  // JPEG không có kênh alpha: "Trong suốt" thành trắng (rasterize cũng lót) — hiện đúng như vậy.
  const effBg: Bg = mime === 'image/jpeg' && bg === 'transparent' ? 'white' : bg;
  const background = effBg === 'transparent' ? null : effBg === 'white' ? '#ffffff' : bgColor;
  // Khổ trọn hình: bodygraph / kèm cột hành tinh / mandala (Phase 3).
  const { w, h } = figureSize(s);

  const setMeta = (k: 'name' | 'copyright', v: string) =>
    update(x => ({ ...x, meta: { ...x.meta, [k]: v } }), `meta-${k}`);

  const save = async () => {
    setErr(null); setFellBack(null); setShrunk(null); setBusy(true);
    try {
      const markup = preview.current?.querySelector('svg')?.outerHTML;
      if (!markup) throw new Error('Chưa có biểu đồ để xuất');
      const svg = composeSvg({
        width: w, height: h, caption, background,
        // Phông của biểu đồ (`--font-chart`), không phải phông giao diện tự host — xem `ChartExport`.
        fontFamily: getComputedStyle(preview.current!.querySelector('svg')!).fontFamily,
        parts: [{ markup, x: 0, y: 0, width: w, height: h }],
        captionLayout: { at: 'bottom', align: 'middle', scale: w / 700 },
      });
      const m = /width="(\d+)" height="(\d+)"/.exec(svg);
      const size = { width: Number(m?.[1]), height: Number(m?.[2]) };
      // Canvas có trần điểm ảnh (iPhone/iPad ~16,7 triệu): cỡ lớn vẽ hỏng thì hạ
      // dần một nấc và BÁO cỡ thật đã xuất — không âm thầm ra ảnh nhỏ hơn đã chọn.
      let got: Scale = scale, r: Awaited<ReturnType<typeof rasterize>> | null = null, last: unknown = null;
      for (let k = scale; k >= 1 && !r; k--) {
        try { r = await rasterize(svg, { ...size, scale: k * EXPORT_BASE, mime, quality: 0.92 }); got = k; }
        catch (e) { last = e; }
      }
      if (!r) throw last instanceof Error ? last : new Error(String(last));
      setShrunk(got < scale ? got : null);
      if (r.fellBack) setFellBack(mime);
      download(r.blob, `${fileBase(s.meta.name)}.${EXT[r.mime]}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const boxStyle: CSSProperties | undefined = background ? { background } : undefined;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-2.5">
        <label>
          <span className="label">{t('illu.name')}</span>
          <input ref={nameInput} className="field" value={s.meta.name} placeholder={t('illu.namePlaceholder')}
                 onChange={e => setMeta('name', e.target.value)} data-testid="illu-name" />
        </label>
        <label>
          <span className="label">{t('illu.copyright')}</span>
          <input className="field" value={s.meta.copyright} placeholder={t('illu.copyrightPlaceholder')}
                 onChange={e => setMeta('copyright', e.target.value)} data-testid="illu-copyright" />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <p className="card-title mb-0">{t('illu.format')}</p>
        <SegmentedControl label={t('illu.format')} value={mime} onChange={setMime} className="flex [&>button]:flex-1"
          testId="illu-format"
          options={FORMATS.map(f => ({ value: f, label: fmtName(f), testId: `illu-format-${EXT[f]}` }))} />
      </div>

      <div className="flex flex-col gap-2">
        <p className="card-title mb-0">{t('illu.background')}</p>
        <SegmentedControl label={t('illu.background')} value={effBg} onChange={setBg} className="flex [&>button]:flex-1"
          testId="illu-bg"
          options={[
            { value: 'transparent', label: t('illu.bg.transparent'), testId: 'illu-bg-transparent' },
            { value: 'white', label: t('illu.bg.white'), testId: 'illu-bg-white' },
            { value: 'color', label: t('illu.bg.color'), testId: 'illu-bg-color' },
          ]} />
        {bg === 'color' && (
          <label className="flex min-h-9 items-center justify-between gap-2 text-ui">
            <span>{t('illu.bgColor')}</span>
            <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                   className="size-7 cursor-pointer rounded-md border-0 bg-transparent p-0" data-testid="illu-bg-picker" />
          </label>
        )}
        {mime === 'image/jpeg' && <p className="hint">{t('illu.jpegHint')}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <p className="card-title mb-0">{t('illu.size')}</p>
        <SegmentedControl label={t('illu.size')} value={scale} onChange={setScale} className="flex [&>button]:flex-1"
          testId="illu-scale"
          options={([1, 2, 3] as const).map(k => ({ value: k, label: `${k}×`, testId: `illu-scale-${k}` }))} />
        <p className="hint tabular-nums" data-testid="illu-dims">
          {t(caption.length ? 'illu.dimsCaption' : 'illu.dims', { scale, w: w * scale * EXPORT_BASE, h: h * scale * EXPORT_BASE })}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="card-title mb-0">{t('illu.preview')}</p>
        <div className={`flex flex-col items-center rounded-lg border border-line p-2 ${background ? '' : 'illu-checker'}`}
             style={boxStyle} data-testid="illu-preview">
          <div ref={preview} className="w-full">
            <IllustrationFigure s={s} className="mx-auto block h-auto max-h-60 w-full" testId="illu-preview-svg" />
          </div>
          {caption.length > 0 && (
            <p className="mt-1 text-center text-overline leading-snug text-ink">
              <b>{caption[0]}</b>{caption[1] && <><br />{caption[1]}</>}
            </p>
          )}
        </div>
      </div>

      {shrunk && (
        <Notice tone="warn" testId="illu-shrunk">{t('illu.shrunk', { scale: shrunk })}</Notice>
      )}
      {fellBack && (
        <Notice tone="warn" testId="illu-fellback">{t('illu.fellBack', { fmt: fmtName(fellBack) })}</Notice>
      )}
      {err && <Notice tone="danger" testId="illu-export-error">{err}</Notice>}

      <button type="button" className="btn btn-primary w-full" onClick={() => void save()} disabled={busy}
              data-testid="illu-download">
        {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="download" size={16} />}
        {t('illu.download', { fmt: fmtName(mime) })}
      </button>
    </div>
  );
}
