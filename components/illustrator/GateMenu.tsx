'use client';
/**
 * Menu "…" của một cổng — Phase 3 (mockup Hưng duyệt 2026-09-29, khung 1):
 * các LẦN KÍCH HOẠT (Thiết kế/Tính cách · hào 1–6 · hành tinh hoặc "Không hành
 * tinh"), màu riêng, Tắt cổng. Mở từ nút "…" ở danh sách cổng, và bằng chuột phải
 * / nhấn giữ lên cổng trên biểu đồ hoặc ô lưới (Hưng chốt câu B).
 *
 * Luật nằm ở mô hình (`setGateActs`): phía cổng theo các lần kích hoạt, một
 * hành tinh chỉ ở MỘT chỗ mỗi phía, có hành tinh thì có hào. Menu chỉ gọi nó.
 * Mỗi thay đổi là một bước Hoàn tác (màu kéo liên tục thì gộp một bước).
 */
import { useEffect, useLayoutEffect, useRef, useState, type JSX } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { gateName } from '../../i18n/hd-names/index.js';
import { centerShortName, planetName } from '../../i18n/terms.js';
import { GATE_TO_CENTER } from '../../calc-core/rave/derive/tables.js';
import { DEFINING_BODIES_STANDARD, type Body } from '../../calc-core/ephemeris/bodies.js';
import {
  setGateActs, setGateColor, toggleGate, type ActSide, type GateAct,
} from '../../lib/illustrator/model.js';
import { SegmentedControl } from '../ui/SegmentedControl.js';
import { Select } from '../ui/Select.js';
import { Icon } from '../ui/Icon.js';
import type { BodygraphTheme } from '../bodygraph/theme.js';
import type { IllustrationApi } from './useIllustration.js';
import { sideSwatch } from './ActivationsPanel.js';

export interface GateMenuTarget { gate: number; x: number; y: number }

const NONE = 'none';
const LINES = [1, 2, 3, 4, 5, 6] as const;

export function GateMenu({ api, theme, target, onClose }: {
  api: IllustrationApi; theme: BodygraphTheme; target: GateMenuTarget; onClose: () => void;
}): JSX.Element {
  const { lang, t } = useLanguage();
  const { state: s, update } = api;
  const g = target.gate;
  const mark = s.gates.get(g);
  const acts = mark?.acts ?? [];
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: target.x, top: target.y });

  /* Kẹp trong màn: đo chính khung rồi dời vào nếu tràn mép. */
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 8;
    setPos({
      left: Math.max(pad, Math.min(target.x, window.innerWidth - r.width - pad)),
      top: Math.max(pad, Math.min(target.y, window.innerHeight - r.height - pad)),
    });
  }, [target.x, target.y, acts.length]);

  /* Esc / bấm ra ngoài thì đóng; mở ra thì focus vào khung. */
  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) onClose(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown, true); };
  }, [onClose]);

  const setActs = (next: readonly GateAct[]) => update(x => setGateActs(x, g, next));
  const patch = (i: number, p: Partial<GateAct>) => setActs(acts.map((a, k) => (k === i ? { ...a, ...p } : a)));

  /** Hành tinh đang ở cổng KHÁC cùng phía — ghi chú trong ô chọn: chọn là dời nó sang đây. */
  const elsewhere = (side: ActSide, b: Body): number | null => {
    for (const [gg, m] of s.gates) if (gg !== g && m.acts?.some(a => a.side === side && a.body === b)) return gg;
    return null;
  };

  const center = GATE_TO_CENTER[g]!;
  return (
    <div ref={box} role="dialog" aria-label={t('illu.gm.title', { gate: g })} tabIndex={-1}
         className="fixed z-50 grid w-[19rem] gap-2.5 rounded-xl border border-line bg-surface p-3 shadow-lg outline-none"
         style={{ left: pos.left, top: pos.top }} data-testid="illu-gate-menu" data-gate={g}>
      <div className="flex items-center gap-2.5">
        <span className="illu-gate h-8 w-9 min-h-0 shrink-0" data-side={mark?.side}
              style={mark ? { ...sideSwatch(mark.side, theme), ...(mark.color ? { background: mark.color } : {}) } : undefined}>{g}</span>
        <div className="min-w-0 leading-tight">
          <b className="block truncate text-ui font-semibold">{t('illu.gm.title', { gate: g })} · {gateName(g, lang)}</b>
          <span className="hint">{centerShortName(center, lang)} · {t('illu.gm.count', { n: acts.length })}</span>
        </div>
      </div>

      {acts.length === 0 && <p className="hint">{t(mark ? 'illu.gm.noActs' : 'illu.gm.off')}</p>}
      {acts.map((a, i) => (
        <div key={i} className="grid gap-1.5 rounded-lg border border-line bg-subtle p-2" data-testid={`illu-act-${i}`}>
          <SegmentedControl label={t('illu.gm.side')} value={a.side} className="flex [&>button]:flex-1"
            testId={`illu-act-${i}-side`} onChange={side => patch(i, { side })}
            options={(['design', 'personality'] as const).map(v => ({ value: v, label: t(`illu.side.${v}`), testId: `illu-act-${i}-${v}` }))} />
          <div className="flex items-center gap-1.5">
            <span className="w-16 shrink-0 text-xs text-ink-2">{t('illu.gm.line')}</span>
            <SegmentedControl label={t('illu.gm.line')} value={a.line ?? 0} testId={`illu-act-${i}-line`}
              onChange={line => patch(i, { line })}
              options={LINES.map(l => ({ value: l, label: String(l), testId: `illu-act-${i}-line-${l}` }))} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-16 shrink-0 text-xs text-ink-2">{t('illu.gm.planet')}</span>
            <Select className="min-w-0 flex-1" value={a.body === null ? NONE : String(a.body)}
                    aria-label={t('illu.gm.planet')} data-testid={`illu-act-${i}-planet`}
                    onChange={e => patch(i, { body: e.target.value === NONE ? null : Number(e.target.value) })}>
              <option value={NONE}>{t('illu.gm.noPlanet')}</option>
              {DEFINING_BODIES_STANDARD.map(b => {
                const at = elsewhere(a.side, b);
                return <option key={b} value={b}>{planetName(b, lang)}{at ? ` · ${t('illu.gm.atGate', { gate: at })}` : ''}</option>;
              })}
            </Select>
            <button type="button" className="btn btn-ghost w-9 px-0" aria-label={t('illu.gm.removeAct')}
                    title={t('illu.gm.removeAct')} onClick={() => setActs(acts.filter((_, k) => k !== i))}
                    data-testid={`illu-act-${i}-remove`}>
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn justify-self-start" data-testid="illu-act-add"
              onClick={() => setActs([...acts, {
                side: acts.at(-1)?.side === 'design' ? 'personality' : mark?.side === 'personality' ? 'personality' : 'design',
                line: null, body: null,
              }])}>
        <Icon name="plus" size={16} />{t('illu.gm.addAct')}
      </button>

      {mark && (
        <div className="flex min-h-9 items-center justify-between gap-2 border-t border-line pt-2 text-ui">
          <span>{t('illu.gm.color')}</span>
          <span className="inline-flex items-center gap-1.5">
            <input type="color" value={mark.color ?? '#e0a100'} aria-label={t('illu.gm.color')}
                   className="size-7 cursor-pointer rounded-md border-0 bg-transparent p-0" data-testid="illu-gate-color"
                   onChange={e => update(x => setGateColor(x, g, e.target.value), `gate-color-${g}`)} />
            {mark.color
              ? <button type="button" className="btn btn-ghost" onClick={() => update(x => setGateColor(x, g, null))}
                        data-testid="illu-gate-color-clear">{t('illu.gm.colorClear')}</button>
              : <span className="text-xs text-ink-3">{t('illu.gm.colorBySide')}</span>}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {mark
          ? <button type="button" className="btn btn-ghost" data-testid="illu-gate-off"
                    onClick={() => { update(x => toggleGate(x, g)); onClose(); }}>{t('illu.gm.off.button')}</button>
          : <button type="button" className="btn btn-ghost" data-testid="illu-gate-on"
                    onClick={() => update(x => toggleGate(x, g))}>{t('illu.gm.on.button')}</button>}
        <button type="button" className="btn btn-primary" onClick={onClose} data-testid="illu-gate-menu-done">{t('illu.gm.done')}</button>
      </div>
    </div>
  );
}
