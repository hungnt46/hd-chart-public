'use client';
/**
 * Thẻ "Giao diện" của Illustrator — mockup Phase 2 (Hưng duyệt 2026-09-28):
 * kiểu bản vẽ Classic/Modern · sáu lớp bật/tắt + độ mờ · ô màu · Về mặc định.
 * Phase 3 (mockup duyệt 2026-09-29, khung 2) thêm LÊN ĐẦU: mẫu giao diện, và
 * Hiển thị (Bodygraph / Rave Mandala · cột hành tinh · vành hoàng đạo).
 *
 * Thanh trượt và ô màu là `<input>` GỐC (không thư viện — plan, CLAUDE.md).
 * Màu tự chọn KHÔNG qua cổng kiểm tương phản: đó là việc của người chọn; bộ
 * mặc định (Classic/Modern) thì đã qua kiểm.
 */
import { useState, type JSX } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import type { UiKey } from '../../i18n/ui/index.js';
import type { LayerKey, LayerSetting } from '../bodygraph/display-source.js';
import type { ColorOverrides } from '../bodygraph/custom-colors.js';
import { CenterId } from '../../calc-core/rave/derive/tables.js';
import { THEMES } from '../bodygraph/theme.js';
import { hasPlanets, type IllustrationState } from '../../lib/illustrator/model.js';
import { applyPreset } from '../../lib/illustrator/presets.js';
import { Select } from '../ui/Select.js';
import { usePresets } from './usePresets.js';
import { SegmentedControl } from '../ui/SegmentedControl.js';
import { Icon } from '../ui/Icon.js';
import type { IllustrationApi } from './useIllustration.js';
import { illustrationTheme } from './render.js';

const LAYERS: readonly LayerKey[] = ['backdrop', 'lattice', 'centers', 'gates', 'gateNumbers', 'activation'];
const FULL: LayerSetting = { visible: true, opacity: 1 };

type Appearance = IllustrationState['appearance'];
const withAppearance = (s: IllustrationState, f: (a: Appearance) => Appearance): IllustrationState =>
  ({ ...s, appearance: f(s.appearance) });

/** `<input type=color>` chỉ nhận #rrggbb. */
const hex6 = (c: string) => c.replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i, '#$1$1$2$2$3$3').toLowerCase();

export function AppearancePanel({ api }: { api: IllustrationApi }): JSX.Element {
  const { t } = useLanguage();
  const { state: s, update } = api;
  const ap = s.appearance;
  const th = illustrationTheme(s);

  const setLayer = (k: LayerKey, patch: Partial<LayerSetting>, merge?: string) =>
    update(x => withAppearance(x, a => ({ ...a, layers: { ...a.layers, [k]: { ...FULL, ...a.layers[k], ...patch } } })), merge);
  const setColor = (k: keyof ColorOverrides, v: string | undefined) =>
    update(x => withAppearance(x, a => {
      const { [k]: _old, ...rest } = a.colors;
      return { ...a, colors: v === undefined ? rest : { ...rest, [k]: v } };
    }), `color-${k}`);

  const layerName = (k: LayerKey): string =>
    t(k === 'backdrop' ? `illu.layer.backdrop.${ap.theme}` : `illu.layer.${k}`);

  const swatches: readonly [keyof ColorOverrides, UiKey, string][] = [
    ['design', 'illu.side.design', th.design],
    ['personality', 'illu.side.personality', th.personality],
    ['plain', 'illu.side.plain', th.plainFill ?? '#ffffff'],
    ['centerOpen', 'illu.color.centerOpen', th.centerOpenFill],
    ['circuitry', 'illu.layer.lattice', th.channelOpenFill],
  ];
  const single = typeof ap.colors.centerDefined === 'string';
  const { presets, save, remove } = usePresets();
  /** `null` = đóng; chuỗi = đang gõ tên mẫu mới. */
  const [naming, setNaming] = useState<string | null>(null);
  const [manage, setManage] = useState(false);
  const planetsOk = hasPlanets(s);
  const toggle = (k: 'planets' | 'mandala' | 'zodiac', on: boolean) =>
    update(x => withAppearance(x, a => {
      const { [k]: _old, ...rest } = a;
      return on ? { ...rest, [k]: true } : rest;
    }));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-2" data-testid="illu-presets">
        <p className="card-title mb-0">{t('illu.preset')}</p>
        <Select className="w-full" value="" aria-label={t('illu.preset')} data-testid="illu-preset-pick"
                disabled={presets.length === 0}
                onChange={e => { const p = presets.find(x => x.id === e.target.value); if (p) update(x => applyPreset(x, p)); }}>
          <option value="">{t(presets.length ? 'illu.preset.pick' : 'illu.preset.none')}</option>
          {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        {naming === null ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => setNaming('')} data-testid="illu-preset-save">
              <Icon name="save" size={16} />{t('illu.preset.save')}
            </button>
            {presets.length > 0 && (
              <button type="button" className="btn btn-ghost" aria-expanded={manage} onClick={() => setManage(m => !m)}
                      data-testid="illu-preset-manage">{t('illu.preset.manage')}</button>
            )}
          </div>
        ) : (
          <form className="flex gap-2" onSubmit={e => {
            e.preventDefault();
            if (naming.trim()) { save(naming, ap); setNaming(null); }
          }}>
            <input className="field min-w-0 flex-1" autoFocus value={naming} placeholder={t('illu.preset.namePlaceholder')}
                   aria-label={t('illu.preset.name')} onChange={e => setNaming(e.target.value)} data-testid="illu-preset-name" />
            <button type="submit" className="btn btn-primary" disabled={!naming.trim()} data-testid="illu-preset-confirm">{t('illu.preset.ok')}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setNaming(null)}>{t('illu.cancel')}</button>
          </form>
        )}
        {manage && presets.length > 0 && (
          <ul className="overflow-hidden rounded-lg border border-line">
            {presets.map(p => (
              <li key={p.id} className="flex min-h-10 items-center justify-between gap-2 border-t border-line px-2.5 text-ui first:border-t-0">
                <span className="truncate">{p.name}</span>
                <button type="button" className="btn btn-ghost" onClick={() => remove(p.id)}
                        data-testid={`illu-preset-delete-${p.name}`}>{t('illu.preset.delete')}</button>
              </li>
            ))}
          </ul>
        )}
        <p className="hint">{t('illu.preset.hint')}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="card-title mb-0.5">{t('illu.display')}</p>
        <SegmentedControl label={t('illu.display')} value={ap.mandala === true} className="flex [&>button]:flex-1" testId="illu-display"
          onChange={m => toggle('mandala', m)}
          options={[
            { value: false, label: t('illu.display.bodygraph'), testId: 'illu-display-bodygraph' },
            { value: true, label: t('illu.display.mandala'), testId: 'illu-display-mandala' },
          ]} />
        <label className={`flex min-h-11 items-center gap-2 text-ui mouse:min-h-9 ${planetsOk && !ap.mandala ? 'cursor-pointer' : 'text-ink-3'}`}>
          <input type="checkbox" className="size-4 accent-ink" checked={ap.planets === true} disabled={!planetsOk || ap.mandala === true}
                 onChange={e => toggle('planets', e.target.checked)} data-testid="illu-planets" />
          {t('illu.display.planets')}
        </label>
        <label className={`flex min-h-11 items-center gap-2 text-ui mouse:min-h-9 ${ap.mandala ? 'cursor-pointer' : 'text-ink-3'}`}>
          <input type="checkbox" className="size-4 accent-ink" checked={ap.zodiac === true} disabled={!ap.mandala}
                 onChange={e => toggle('zodiac', e.target.checked)} data-testid="illu-zodiac" />
          {t('illu.display.zodiac')}
        </label>
        <p className="hint" data-testid="illu-display-hint">{t(planetsOk ? 'illu.display.hint' : 'illu.display.noPlanets')}</p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="card-title mb-0">{t('illu.artwork')}</p>
        <SegmentedControl label={t('illu.artwork')} value={ap.theme} className="flex [&>button]:flex-1" testId="illu-theme"
          onChange={theme => update(x => withAppearance(x, a => ({ ...a, theme })))}
          options={[
            { value: 'classic', label: t('theme.classic'), testId: 'illu-theme-classic' },
            { value: 'modern', label: t('theme.modern'), testId: 'illu-theme-modern' },
          ]} />
      </div>

      <div className="flex flex-col gap-1">
        <p className="card-title mb-1">{t('illu.layers')}</p>
        {LAYERS.map(k => {
          const l = { ...FULL, ...ap.layers[k] };
          const pct = Math.round(l.opacity * 100);
          return (
            <div key={k} className="grid grid-cols-[1fr_5.75rem_2.5rem] items-center gap-2 text-ui"
                 data-testid={`illu-layer-${k}`} data-visible={l.visible}>
              {/* Ô tích NẰM TRONG nhãn ⇒ bấm cả tên lớp (trước 2026-09-29 vùng bấm chỉ 16px).
                  gap 14px = cột 22px + khe 8px cũ ⇒ tên lớp không xê dịch. */}
              <label className="flex min-h-11 cursor-pointer items-center gap-3.5 mouse:min-h-9">
                <input type="checkbox" className="size-4 accent-ink" checked={l.visible}
                       onChange={e => setLayer(k, { visible: e.target.checked })} data-testid={`illu-layer-${k}-visible`} />
                <span className={l.visible ? '' : 'text-ink-3'}>{layerName(k)}</span>
              </label>
              {/* Vùng kéo cao bằng hàng (rãnh vẫn mảnh): 44px cảm ứng, 24px chuột (WCAG 2.5.8). */}
              <input type="range" min={0} max={100} step={5} value={pct} disabled={!l.visible}
                     aria-label={t('illu.opacity', { layer: layerName(k) })} className="h-11 w-full cursor-pointer accent-ink disabled:cursor-default disabled:opacity-40 mouse:h-6"
                     onChange={e => setLayer(k, { opacity: Number(e.target.value) / 100 }, `layer-${k}`)}
                     data-testid={`illu-layer-${k}-opacity`} />
              <span className="text-right text-xs tabular-nums text-ink-2">{l.visible ? `${pct}%` : t('illu.hidden')}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        <p className="card-title mb-1">{t('illu.colors')}</p>
        {swatches.map(([k, label, value]) => (
          <ColorRow key={k} label={t(label)} value={value} testId={`illu-color-${k}`} onChange={v => setColor(k, v)} />
        ))}
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 text-ui">
          <span>{t('illu.color.centerDefined')}</span>
          <SegmentedControl label={t('illu.color.centerDefined')} value={single} testId="illu-center-color-mode"
            onChange={one => setColor('centerDefined', one ? THEMES[ap.theme].centerFill[CenterId.Sacral] : undefined)}
            options={[
              { value: false, label: t('illu.color.perCenter') },
              { value: true, label: t('illu.color.single') },
            ]} />
        </div>
        {single && (
          <ColorRow label={t('illu.color.single')} value={ap.colors.centerDefined as string} testId="illu-color-centerDefined"
                    onChange={v => setColor('centerDefined', v)} />
        )}
        <p className="hint mt-1">{t('illu.colorsHint')}</p>
      </div>

      <div>
        <button type="button" className="btn" data-testid="illu-reset"
                onClick={() => update(x => withAppearance(x, a => ({ ...a, layers: {}, colors: {} })))}>
          <Icon name="reset" size={16} />{t('illu.reset')}
        </button>
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange, testId }: {
  label: string; value: string; onChange: (v: string) => void; testId: string;
}): JSX.Element {
  const v = hex6(value);
  return (
    <label className="flex min-h-11 items-center justify-between gap-2 text-ui mouse:min-h-9">
      <span>{label}</span>
      <span className="inline-flex items-center gap-2 rounded-lg border border-control py-0.5 pl-0.5 pr-2 font-mono text-xs tabular-nums text-ink-2">
        <input type="color" value={v} onChange={e => onChange(e.target.value)} data-testid={testId}
               className="size-7 cursor-pointer rounded-md border-0 bg-transparent p-0" />
        {v}
      </span>
    </label>
  );
}
