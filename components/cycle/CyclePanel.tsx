'use client';
/**
 * Chu kỳ (Cycle) — SPEC §10.5 (D11). Sáu dòng, đúng thứ tự tab CYCLES của phần mềm tham chiếu.
 *
 * Danh sách mốc tính một lần khi có chart. Bấm vào một mốc thì MỞ CHART CHU KỲ
 * tại mốc đó — y như phần mềm tham chiếu (tab CYCLES → bấm tên chu kỳ): composite natal + lá số
 * đầy đủ tại mốc, với từ vựng kênh RIÊNG của loại chart này
 * (`CycleCompositionState`, xem `calc-core/rave/cycle.ts`).
 *
 * ★ `now` được CHỐT một lần cùng với danh sách, rồi dùng lại khi mở chart.
 *   Solar/Lunar return phụ thuộc "bây giờ" (năm / tháng dương lịch hiện tại);
 *   nếu lúc bấm gọi lại `Date.now()` thì bấm ngay sau nửa đêm đầu tháng sẽ mở
 *   một Lunar return KHÁC với mốc đang hiện trên dòng vừa bấm.
 */
import { useCallback, useEffect, useState, type JSX } from 'react';
import type { RaveChart } from '../../calc-core/rave/chart.js';
import {
  CYCLE_COMPOSITION_STATES, calculateCycleChart, summarizeCycles,
  type CycleChart, type CycleKind, type CycleSummary,
} from '../../calc-core/rave/cycle.js';
import { crossDisplayName } from '../../i18n/terms.js';
import { getBrowserEphemeris } from '../../lib/ephemeris/browser-client.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { momentLabel } from '../time-mode/format.js';
import { useTimeMode } from '../time-mode/TimeModeProvider.js';
import type { UiKey } from '../../i18n/ui/index.js';
import { Notice } from '../ui/Notice.js';
import { jdOfMs } from '../../calc-core/time/julian.js';

export interface CyclePanelProps {
  chart: RaveChart; jdBirthUT: number;
  /**
   * Báo chart chu kỳ đang mở lên `page.tsx` để vẽ nó ở khung biểu đồ chính
   * (bodygraph ghép + hai cột hai số). `null` khi đóng hoặc chart gốc đổi.
   */
  onOpen?: (cc: CycleChart | null) => void;
  /** Múi giờ NƠI SINH — mốc chu kỳ là mốc của chart, "địa phương" nghĩa là nơi sinh. */
  zone?: string;
  /** Vẽ kết quả ngay dưới danh sách (mặc định). Bàn làm việc tự đặt nó ở bảng phải. */
  showResult?: boolean;
}

/**
 * Tiêu đề cột của mốc chu kỳ — tiếng Anh in hoa như mọi tiêu đề cột khác
 * (`HEADING` trong `PlanetColumn.tsx`); bản tham chiếu ghi "SATURN RETURN".
 */
export const CYCLE_HEADING: Readonly<Record<CycleKind, string>> = {
  SaturnReturn: 'SATURN RETURN', UranusOpposition: 'URANUS OPPOSITION', ChironReturn: 'CHIRON RETURN',
  SolarReturn: 'SOLAR RETURN', LunarReturn: 'LUNAR RETURN',
};


const norm = (g: readonly number[]) => [...g].sort((a, b) => a - b).join('–');
const rowId = (r: { kind: string; ordinal: number }) => `${r.kind}#${r.ordinal}`;
const kindLabel = (r: { kind: string; ordinal: number }) =>
  `cycle.${r.kind}${r.ordinal > 1 ? String(r.ordinal) : ''}` as UiKey;

export function CyclePanel({ chart, jdBirthUT, onOpen, zone, showResult = true }: CyclePanelProps): JSX.Element {
  const { lang, t } = useLanguage();
  const { mode } = useTimeMode();
  const fmt = (jd: number) => momentLabel(jd, mode, zone, lang);
  const [list, setList] = useState<{ rows: CycleSummary[]; now: number } | null>(null);
  const [open, setOpen] = useState<CycleChart | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const mounted = { on: true };
    void (async () => {
      try {
        const eph = await getBrowserEphemeris();
        const now = jdOfMs(Date.now());
        const rows = summarizeCycles(eph, jdBirthUT, now);
        if (mounted.on) setList({ rows, now });
      } catch (e) {
        if (mounted.on) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { mounted.on = false; };
  }, [jdBirthUT]);

  // Chart gốc đổi (bấm "Tạo Thêm", mở chart khác từ kho) thì chart chu kỳ cũ
  // không còn là của người này nữa.
  useEffect(() => { setOpen(null); onOpen?.(null); }, [chart, onOpen]);

  const choose = useCallback(async (r: CycleSummary) => {
    if (!list) return;
    if (open && rowId(open) === rowId(r)) { setOpen(null); onOpen?.(null); return; }
    setErr(null);
    try {
      const eph = await getBrowserEphemeris();
      const cc = calculateCycleChart(eph, chart, jdBirthUT, r.kind, list.now, r.ordinal);
      setOpen(cc);
      onOpen?.(cc);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [chart, jdBirthUT, list, open, onOpen]);

  return (
    <section className="card p-4" data-testid="cycle-panel">
      <h2 className="card-heading mb-2">{t('cycle.heading')}</h2>
      <p className="hint mt-1">{mode === 'ut' ? t('cycle.note.ut') : t('cycle.note.local', { zone: zone ?? 'UTC' })}</p>

      {err && <Notice tone="danger" className="mt-3" testId="cycle-error">{err}</Notice>}

      {list && (
        <ul className="mt-3 space-y-1.5">
          {list.rows.map(r => {
            const active = open !== null && rowId(open) === rowId(r);
            return (
              <li key={rowId(r)} data-cycle={rowId(r)}>
                <button type="button" aria-expanded={active}
                        onClick={() => void choose(r)} data-testid="cycle-open"
                        className={`flex min-h-11 w-full flex-wrap items-baseline justify-between gap-x-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                          active ? 'border-ink bg-ink text-white' : 'border-line hover:bg-subtle'}`}>
                  <span className="font-medium">{t(kindLabel(r))}</span>
                  <span className={`text-xs tabular-nums ${active ? 'text-white/80' : 'text-ink-2'}`}>{fmt(r.jdUT)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showResult && open && <CycleResult cc={open} zone={zone} />}
    </section>
  );
}

/**
 * Phần hiển thị CHART CHU KỲ đã tính. Tách riêng để dựng tĩnh được trong unit
 * test với ephemeris của Node — `CyclePanel` thì cần ephemeris trình duyệt.
 */
export function CycleResult({ cc, zone }: { cc: CycleChart; zone?: string }): JSX.Element {
  const { lang, t } = useLanguage();
  const { mode } = useTimeMode();
  const fmt = (jd: number) => momentLabel(jd, mode, zone, lang);
  return (
    <div className="space-y-3" data-testid="cycle-result" data-cycle-open={rowId(cc)}>
      <h3 className="card-heading mb-2">{t('cycle.chartOf', { name: t(kindLabel(cc)) })}</h3>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-ink-2">{t('cycle.moment')}</dt>
        <dd className="text-sm tabular-nums" data-testid="cycle-moment">{fmt(cc.jdUT)}</dd>
        <dt className="text-ink-2">{t('cycle.designMoment')}</dt>
        <dd className="text-sm tabular-nums" data-testid="cycle-design">{fmt(cc.cycle.design.jdUT)}</dd>
        <dt className="text-ink-2">{t('cycle.cross')}</dt>
        <dd data-testid="cycle-cross">{cc.cycle.cross ? crossDisplayName(cc.cycle.cross, lang) : '—'}</dd>
      </dl>

      <ul className="flex flex-wrap gap-2 text-xs">
        {CYCLE_COMPOSITION_STATES.map(s => (
          <li key={s} data-cycle-count={s} className="chip">
            {t(`cycleState.${s}` as UiKey)}: <strong>{cc.counts[s]}</strong>
          </li>
        ))}
      </ul>

      <div>
        <h4 className="hint">
          {t('cycle.channels', { n: cc.definedChannels.length })}
        </h4>
        <ul className="mt-1 space-y-1">
          {cc.channels
            .map(c => ({ ...c, pair: [...c.channel.gates].sort((x, y) => x - y) }))
            .sort((x, y) => x.pair[0]! - y.pair[0]! || x.pair[1]! - y.pair[1]!)
            .map(c => (
              <li key={c.channel.id} className="text-sm tabular-nums"
                  data-cycle-channel={norm(c.channel.gates)} data-cycle-state={c.state}>
                {c.pair.join('–')}
                <span className="ml-2 text-ink-2">{t(`cycleState.${c.state}` as UiKey)}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
