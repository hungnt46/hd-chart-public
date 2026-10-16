'use client';
/**
 * Thẻ "Kích hoạt" của Illustrator — mockup Phase 2 (Hưng duyệt 2026-09-28):
 * chế độ Vẽ tự do / Theo luật chart · bút bốn phía · ô tìm · Cổng / Kênh /
 * Trung tâm kèm số đếm · lưới 64 cổng hoặc danh sách có tên.
 *
 * Tên cổng/kênh là DỮ KIỆN (`i18n/hd-names`, không sau cờ nội dung).
 * Menu "…" từng cổng (hào, hành tinh, màu riêng — Phase 3): nút "…" ở dạng
 * danh sách, chuột phải / nhấn giữ lên ô lưới (`GateMenu`, mở ở vùng làm việc).
 */
import { useMemo, useState, type CSSProperties, type JSX } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { gateName, channelName } from '../../i18n/hd-names/index.js';
import { centerShortName, planetName } from '../../i18n/terms.js';
import { CHANNELS } from '../../calc-core/rave/derive/tables.js';
import {
  ALL_CENTERS, ALL_GATES, paintGate, setMode, toggleCenter, toggleChannel, toRenderSets,
  type GateMark, type GateSide,
} from '../../lib/illustrator/model.js';
import type { GateMenuTarget } from './GateMenu.js';
import type { BodygraphTheme } from '../bodygraph/theme.js';
import { CENTER_KEY_OF } from '../bodygraph/center-keys.js';
import { SegmentedControl } from '../ui/SegmentedControl.js';
import { Icon } from '../ui/Icon.js';
import type { IllustrationApi } from './useIllustration.js';
import { fold } from './fold.js';
import { readableOn, textOnFill } from '../bodygraph/contrast.js';

export const SIDES: readonly GateSide[] = ['plain', 'personality', 'design', 'both'];

/** Màu nền của một ô cổng / ô bút theo phía — đọc từ bảng màu đang dùng (kể cả màu tự chọn). */
export function sideSwatch(side: GateSide, t: BodygraphTheme, stripe = 7): CSSProperties {
  switch (side) {
    case 'plain': return { background: t.plainFill ?? '#ffffff' };
    case 'design': return { background: t.design };
    case 'personality': return { background: t.personality };
    case 'both': return { background: `repeating-linear-gradient(-45deg, ${t.design} 0 ${stripe}px, ${t.personality} ${stripe}px ${stripe + 3}px)` };
  }
}


type Kind = 'gates' | 'channels' | 'centers';

/**
 * Chữ số trên ô cổng tô PHÍA. CSS ghim trắng (mực ở `plain`) — đúng với bộ màu
 * mặc định nên khi đạt 4.5:1 thì KHÔNG thêm gì (markup y hệt). Màu tự chọn quá
 * sáng / quá tối ⇒ trắng hay đen theo tương phản (Hưng chọn 2026-09-29, mục 5).
 */
function sideText(side: GateSide, t: BodygraphTheme): CSSProperties {
  const current = side === 'plain' ? '#1b1f24' : '#ffffff';          // = `.illu-gate[data-side…]` trong globals.css
  const fills = side === 'both' ? [t.design, t.personality] : [side === 'plain' ? t.plainFill ?? '#ffffff' : t[side]];
  const c = readableOn(current, fills);
  if (c === current) return {};
  return side === 'both' ? { color: c, textShadow: `0 0 2px ${c === '#ffffff' ? '#000' : '#fff'}` } : { color: c };
}

/** Nền ô cổng: màu riêng (nếu có) đè màu phía. */
export const markSwatch = (m: GateMark, t: BodygraphTheme): CSSProperties =>
  m.color ? { background: m.color, borderColor: m.color, color: textOnFill(m.color), textShadow: 'none' }
    : { ...sideSwatch(m.side, t), ...sideText(m.side, t) };

export function ActivationsPanel({ api, theme, brush, setBrush, openMenu }: {
  api: IllustrationApi; theme: BodygraphTheme; brush: GateSide; setBrush: (b: GateSide) => void;
  openMenu: (t: GateMenuTarget) => void;
}): JSX.Element {
  const { lang, t } = useLanguage();
  const { state: s, update } = api;
  const [kind, setKind] = useState<Kind>('gates');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [query, setQuery] = useState('');
  const rs = useMemo(() => toRenderSets(s), [s]);
  const q = fold(query.trim());
  const definedKeys = new Set(rs.definedChannels.map(c => c.id));

  const gates = ALL_GATES.filter(g => !q || String(g) === q || fold(gateName(g, lang)).includes(q));
  const channels = CHANNELS.filter(c => !q || c.gates.map(String).includes(q) || `${c.gates[0]}-${c.gates[1]}` === q
    || `${c.gates[1]}-${c.gates[0]}` === q || fold(channelName(c.id, lang)).includes(q));
  const centers = ALL_CENTERS.filter(c => !q || fold(centerShortName(c, lang)).includes(q));
  // Đang tìm thì lưới chỉ còn vài ô rời rạc — đọc tên dễ hơn, nên hiện danh sách.
  const asList = view === 'list' || (kind === 'gates' && q !== '' && !/^\d+$/.test(q));

  const paint = (g: number) => update(x => paintGate(x, g, brush));
  /** Mở menu cạnh phần tử (nút "…" / ô lưới), lệch sang TRÁI bảng để không che danh sách. */
  const menuAt = (g: number, el: Element) => {
    const r = el.getBoundingClientRect();
    openMenu({ gate: g, x: r.left - 312, y: r.top });
  };
  /** "Thiết kế · Mặt Trời 20.3 · 20.5" — dòng phụ ở danh sách. */
  const summary = (g: number, m: GateMark): string => {
    const parts = [t(`illu.side.${m.side}`),
      ...(m.acts ?? []).filter(a => a.body !== null || a.line !== null)
        .map(a => [a.body !== null ? planetName(a.body, lang) : '', a.line !== null ? `${g}.${a.line}` : ''].filter(Boolean).join(' ')),
      ...(m.color ? [t('illu.gm.color').toLowerCase()] : [])];
    return parts.join(' · ');
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-2">
        <SegmentedControl label={t('illu.mode')} value={s.mode} className="flex [&>button]:flex-1" testId="illu-mode"
          onChange={m => update(x => setMode(x, m))}
          options={[
            { value: 'free', label: t('illu.mode.free'), testId: 'illu-mode-free' },
            { value: 'mechanics', label: t('illu.mode.mechanics'), testId: 'illu-mode-mechanics' },
          ]} />
        <p className="hint">{t(s.mode === 'free' ? 'illu.mode.freeHint' : 'illu.mode.mechanicsHint')}</p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="card-title mb-0">{t('illu.brush')}</p>
        <div role="group" aria-label={t('illu.brush')} className="grid grid-cols-4 gap-1">
          {SIDES.map(side => (
            <button key={side} type="button" aria-pressed={brush === side} onClick={() => setBrush(side)}
                    data-testid={`brush-${side}`} className="illu-brush">
              <i aria-hidden="true" style={sideSwatch(side, theme, 5)} />
              {t(`illu.side.${side}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{t('illu.search')}</span>
            <Icon name="search" size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input type="search" className="field pl-8" placeholder={t('illu.search')} value={query}
                   onChange={e => setQuery(e.target.value)} data-testid="illu-search" />
          </label>
          {kind === 'gates' && (
            <SegmentedControl label={t('illu.view')} value={view} onChange={setView} testId="illu-view"
              options={[
                { value: 'grid', label: '▦', ariaLabel: t('illu.view.grid'), title: t('illu.view.grid'), testId: 'illu-view-grid' },
                { value: 'list', label: '☰', ariaLabel: t('illu.view.list'), title: t('illu.view.list'), testId: 'illu-view-list' },
              ]} />
          )}
        </div>

        <SegmentedControl label={t('illu.kind')} value={kind} onChange={setKind} className="flex [&>button]:flex-1" testId="illu-kind"
          options={([
            ['gates', s.gates.size], ['channels', rs.definedChannels.length], ['centers', rs.definedCenters.size],
          ] as const).map(([k, n]) => ({
            value: k, testId: `illu-kind-${k}`,
            label: <>{t(`illu.kind.${k}`)}<span className="ml-1.5 font-normal tabular-nums text-ink-3" data-testid={`illu-count-${k}`}>{n}</span></>,
          }))} />

        {kind === 'gates' && (asList ? (
          gates.length ? (
            <ul className="overflow-hidden rounded-lg border border-line" data-testid="illu-gate-list">
              {gates.map(g => {
                const m = s.gates.get(g);
                const side = m?.side;
                return (
                  <li key={g} className="flex items-center border-t border-line pr-1 first:border-t-0 hover:bg-subtle">
                    <button type="button" onClick={() => paint(g)} aria-pressed={side !== undefined}
                            onContextMenu={e => { e.preventDefault(); openMenu({ gate: g, x: e.clientX, y: e.clientY }); }}
                            data-testid={`illu-gate-row-${g}`}
                            className="grid min-h-11 min-w-0 flex-1 grid-cols-[2.25rem_1fr] items-center gap-2 px-2 py-1.5 text-left text-ui mouse:min-h-10">
                      <span className="illu-gate h-7 min-h-0" data-side={side} style={m ? markSwatch(m, theme) : undefined}>{g}</span>
                      <span className="min-w-0 leading-tight">{gateName(g, lang)}
                        {m && <span className="block text-caption text-ink-3" data-testid={`illu-gate-row-${g}-summary`}>{summary(g, m)}</span>}</span>
                    </button>
                    <button type="button" className="btn btn-ghost w-9 shrink-0 px-0" aria-label={t('illu.gm.open', { gate: g })}
                            title={t('illu.gm.open', { gate: g })} aria-haspopup="dialog"
                            onClick={e => menuAt(g, e.currentTarget)} data-testid={`illu-gate-more-${g}`}>
                      <Icon name="more" size={18} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <p className="empty">{t('illu.noMatch')}</p>
        ) : (
          /* Chuột: 8 cột (ô 32px). Cảm ứng: bao nhiêu cột ô ≥ 44px vừa khung (375px ⇒ 6–7) — lưới cao hơn. */
          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1 mouse:grid-cols-8" data-testid="illu-gate-grid">
            {gates.map(g => {
              const m = s.gates.get(g);
              const side = m?.side;
              return (
                <button key={g} type="button" className="illu-gate" data-side={side} aria-pressed={side !== undefined}
                        title={`${g} · ${gateName(g, lang)}${m ? ` — ${summary(g, m)}` : ''}`}
                        aria-label={`${g} ${gateName(g, lang)}${m ? `, ${summary(g, m)}` : ''}`}
                        style={m ? markSwatch(m, theme) : undefined}
                        onContextMenu={e => { e.preventDefault(); menuAt(g, e.currentTarget); }}
                        onClick={() => paint(g)} data-testid={`illu-gate-${g}`}>{g}</button>
              );
            })}
          </div>
        ))}
        {kind === 'gates' && <p className="hint">{t('illu.gridHint')}</p>}

        {kind === 'channels' && (channels.length ? (
          <ul className="overflow-hidden rounded-lg border border-line" data-testid="illu-channel-list">
            {channels.map(c => {
              const on = definedKeys.has(c.id);
              return (
                <li key={c.id} className="border-t border-line first:border-t-0">
                  <label className="flex min-h-11 cursor-pointer items-center gap-2.5 px-2.5 py-1.5 text-ui hover:bg-subtle mouse:min-h-10">
                    <input type="checkbox" className="size-4 accent-ink" checked={on}
                           onChange={() => update(x => toggleChannel(x, c, brush))} data-testid={`illu-channel-${c.gates[0]}-${c.gates[1]}`} />
                    <span className="w-12 shrink-0 font-semibold tabular-nums">{c.gates[0]}-{c.gates[1]}</span>
                    <span className="leading-tight">{channelName(c.id, lang)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : <p className="empty">{t('illu.noMatch')}</p>)}

        {kind === 'centers' && (
          <>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5" data-testid="illu-center-list">
              {centers.map(c => (
                <label key={c} className={`flex min-h-11 items-center gap-2 text-ui mouse:min-h-9 ${s.mode === 'free' ? 'cursor-pointer' : 'text-ink-3'}`}>
                  <input type="checkbox" className="size-4 accent-ink" disabled={s.mode !== 'free'}
                         checked={rs.definedCenters.has(c)} onChange={() => update(x => toggleCenter(x, c))}
                         data-testid={`illu-center-${CENTER_KEY_OF[c]}`} />
                  {centerShortName(c, lang)}
                </label>
              ))}
            </div>
            {s.mode !== 'free' && <p className="hint">{t('illu.centersLocked')}</p>}
          </>
        )}
      </div>
    </div>
  );
}
