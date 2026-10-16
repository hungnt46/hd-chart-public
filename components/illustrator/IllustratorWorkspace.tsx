'use client';
/**
 * Vùng làm việc BodyGraph Illustrator — mockup Phase 2 (Hưng duyệt 2026-09-28):
 * biểu đồ bên trái, bảng ba thẻ (Kích hoạt · Giao diện · Xuất ảnh) bên phải;
 * dưới 1024px bảng rơi xuống dưới biểu đồ.
 *
 * ★ Là một CHẾ ĐỘ riêng, không phải tab thứ 7 (Hưng chốt 2026-09-28): không
 *   cần chart sinh, sáu tab của chart giữ nguyên.
 * ★ Luật 8px: khung vẽ cao trọn màn (trừ thanh trên) ⇒ Classic ~8.2px số cổng
 *   ở 1440×900 (`workspace/layout.ts`). Mọi nút trên khung đều NỔI (absolute),
 *   không lấy chiều cao — một hàng 40px là tụt dưới 8px.
 * ★ Bấm lên biểu đồ dùng phần tử `data-gate` / `data-center` SẴN CÓ của
 *   renderer — không thêm hình học (CLAUDE.md: hình học không sửa tay).
 */
import { useCallback, useEffect, useId, useRef, useState, type JSX, type MouseEvent, type PointerEvent } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { CENTER_ID_OF } from '../bodygraph/center-keys.js';
import { all, clear, paintGate, toggleCenter, type GateSide } from '../../lib/illustrator/model.js';
import { Icon } from '../ui/Icon.js';
import { TabList, panelId, tabId } from '../ui/Tabs.js';
import type { IllustrationApi, IllustratorTab } from './useIllustration.js';
import { illustrationTheme } from './render.js';
import { IllustrationFigure, figureSize } from './Figure.js';
import { GateMenu, type GateMenuTarget } from './GateMenu.js';
import { ActivationsPanel, sideSwatch } from './ActivationsPanel.js';
import { AppearancePanel } from './AppearancePanel.js';
import { ExportPanel } from './ExportPanel.js';
import { LoadFromChart, type LoadProps } from './LoadFromChart.js';

const TABS: readonly IllustratorTab[] = ['act', 'look', 'export'];
const TAB_KEY = { act: 'illu.tab.act', look: 'illu.tab.look', export: 'illu.tab.export' } as const;

export function IllustratorWorkspace({ api, load }: { api: IllustrationApi; load: LoadProps }): JSX.Element {
  const { t } = useLanguage();
  const { state: s, update, undo, canUndo, tab, setTab } = api;
  const [brush, setBrush] = useState<GateSide>('design');
  const uid = useId();
  const theme = illustrationTheme(s);
  const { w, h } = figureSize(s);
  const [menu, setMenu] = useState<GateMenuTarget | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  /** Nhấn giữ (cảm ứng) ⇒ mở menu; cú "bấm" ngay sau đó KHÔNG được tô bút. */
  const press = useRef<{ timer: number; fired: boolean } | null>(null);

  /* ⌘Z / Ctrl+Z hoàn tác — trừ khi đang gõ trong ô nhập (để trình duyệt tự hoàn tác chữ). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return;
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      e.preventDefault(); undo();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undo]);

  /** Cổng dưới con trỏ: huy hiệu, nửa dải, hoặc ô cổng của mandala (`data-sector`). */
  const gateAt = (el: Element): number | null => {
    const g = el.closest('[data-gate], [data-gate-half], [data-sector], [data-wedge], [data-gate-label]');
    const n = Number(g?.getAttribute('data-gate') ?? g?.getAttribute('data-gate-half')
      ?? g?.getAttribute('data-sector') ?? g?.getAttribute('data-wedge') ?? g?.getAttribute('data-gate-label'));
    return n >= 1 && n <= 64 ? n : null;
  };

  const onCanvas = (e: MouseEvent) => {
    if (press.current?.fired) { press.current = null; return; }
    const el = e.target as Element;
    const n = gateAt(el);
    if (n !== null) { update(x => paintGate(x, n, brush)); return; }
    const c = el.closest('[data-center]')?.getAttribute('data-center');
    if (c && s.mode === 'free' && CENTER_ID_OF[c] !== undefined) update(x => toggleCenter(x, CENTER_ID_OF[c]!));
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:h-[calc(100dvh-var(--topbar-h)-env(safe-area-inset-top)-1.375rem)] lg:grid-cols-[minmax(0,1fr)_21rem]"
         data-testid="illustrator">
      <h2 className="sr-only">{t('illu.title')}</h2>
      {/* Khung vẽ: dưới 1024px theo tỉ lệ bản vẽ; từ 1024px cao trọn vùng, SVG tự canh giữa. */}
      <div className="illu-canvas card relative min-h-0 overflow-hidden aspect-(--ar) lg:aspect-auto"
           style={{ ['--ar' as string]: `${w} / ${h}` }} data-mode={s.mode}
           data-testid="illustrator-canvas" onClick={onCanvas}
           onContextMenu={e => {
             const n = gateAt(e.target as Element);
             if (n === null) return;
             e.preventDefault();
             setMenu({ gate: n, x: e.clientX, y: e.clientY });
           }}
           onPointerDown={(e: PointerEvent) => {
             if (e.pointerType !== 'touch') return;
             const n = gateAt(e.target as Element);
             if (n === null) return;
             const { clientX: x, clientY: y } = e;
             const p = { timer: 0, fired: false };
             p.timer = window.setTimeout(() => { p.fired = true; setMenu({ gate: n, x, y }); }, 500);
             press.current = p;
           }}
           onPointerUp={() => { if (press.current && !press.current.fired) { clearTimeout(press.current.timer); press.current = null; } }}
           onPointerCancel={() => { if (press.current) clearTimeout(press.current.timer); press.current = null; }}>
        <IllustrationFigure s={s} className="block h-full w-full" />

        <div className="absolute left-2.5 top-2.5 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface/90 px-2.5 py-1.5 text-xs text-ink-2 backdrop-blur max-lg:hidden"
             aria-label={t('illu.legend')} role="group">
          {(['personality', 'design', 'both', 'plain'] as const).map(side => (
            <span key={side} className="inline-flex items-center gap-1">
              <i aria-hidden="true" className="inline-block size-[11px] rounded-[3px] border border-ink/25" style={sideSwatch(side, theme, 3)} />
              {t(`illu.side.${side}`)}
            </span>
          ))}
        </div>
        <button type="button" className="btn absolute right-2.5 top-2.5 bg-surface/90 backdrop-blur" onClick={undo}
                disabled={!canUndo} data-testid="illu-undo">
          <Icon name="undo" size={16} /><span className="max-sm:sr-only">{t('illu.undo')}</span>
        </button>
        <p className="hint pointer-events-none absolute bottom-2.5 left-3 max-lg:hidden">
          {t(s.mode === 'free' ? 'illu.canvasHintFree' : 'illu.canvasHint')} {t('illu.canvasHintMenu')}
        </p>
      </div>
      {menu && <GateMenu key={menu.gate} api={api} theme={theme} target={menu} onClose={closeMenu} />}

      <aside className="card flex min-h-0 flex-col" aria-label={t('illu.tabs')}>
        {/* Tab NỘI DUNG chuẩn APG (phím mũi tên, tabindex lăn), nhìn gạch chân như mockup Phase 2 — Hưng chọn 2026-09-29. */}
        <TabList label={t('illu.tabs')} tabs={TABS} value={tab} onChange={setTab} idBase={uid} variant="underline"
                 className="flex shrink-0 border-b border-line px-1.5" tabClassName="flex-1 justify-center"
                 renderLabel={k => t(TAB_KEY[k])} tabProps={k => ({ 'data-testid': `illu-tab-${k}` })} />
        <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
          {TABS.map(k => (
            <div key={k} role="tabpanel" id={panelId(uid, k)} aria-labelledby={tabId(uid, k)} hidden={tab !== k}>
              {k === 'act' ? <ActivationsPanel api={api} theme={theme} brush={brush} setBrush={setBrush} openMenu={setMenu} />
                : k === 'look' ? <AppearancePanel api={api} /> : <ExportPanel api={api} />}
            </div>
          ))}
        </div>
        {tab === 'act' && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-b-xl border-t border-line bg-subtle px-3.5 py-2.5">
            <button type="button" className="btn" onClick={() => update(all)} data-testid="illu-all">{t('illu.all')}</button>
            <button type="button" className="btn" onClick={() => update(clear)} data-testid="illu-none">{t('illu.none')}</button>
            <span className="flex-1" />
            <LoadFromChart {...load} testId="illu-load-panel" showLabel above />
          </div>
        )}
      </aside>
    </div>
  );
}
