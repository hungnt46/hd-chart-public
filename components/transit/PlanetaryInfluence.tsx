'use client';
/**
 * Bảng Ảnh hưởng hành tinh (Planetary Influence) — docs/PLAN-planetary-influence.md
 * Phase 3. Mỗi dòng: MỘT thiên thể VÀO MỘT cổng trong tháng, và việc đó làm gì
 * với chart của người. Engine: `calc-core/rave/planetary-influence.ts` (khớp
 * bản tham chiếu 3 chart × 109 dòng).
 *
 * ★ Hưng duyệt mockup 2026-09-28 — phương án A: nằm TRONG tab Transit, ngay dưới
 *   khung biểu đồ; bấm một dòng ⇒ transit phía trên nhảy tới lúc vào cổng (như
 *   bấm Lịch Thiên văn Rave). Sáu tab trên thanh trên giữ nguyên.
 * ★ Màu GIỮ NGHĨA CỦA APP, khác bản tham chiếu có chủ ý (Hưng chốt cùng ngày): bản đó dùng
 *   xanh dương = cổng bạn có, xanh lá = transit nối kênh; app đã chốt màu BÊN
 *   cho chart ghép (người / transit, `useCompositePalette`). Ở đây: số cổng tô
 *   màu NGƯỜI khi chart có sẵn cổng đó; transit NỐI kênh thì cổng tô màu TRANSIT,
 *   vạch trái dòng màu transit, và vạch nửa-người-nửa-transit ở ô kênh — như
 *   kênh sọc 50/50 trên bodygraph ghép ngay phía trên. Chữ trên viên màu dùng
 *   `gateText` của bảng màu (tương phản đã khoá ở `contrast.spec.ts`).
 * ★ Tên cổng dưới số cổng (Hưng giữ) — DỮ KIỆN từ `i18n/hd-names`, không sau cờ.
 * ⚠️ Cột Type là "Type KHI TÍNH CẢ TRANSIT" (Hưng chốt 2026-09-28, quyết định 2 của
 *   plan) — riêng bảng này; bodygraph ghép vẫn KHÔNG tính lại Type (`transit.ts`).
 *
 * Giờ: công tắc Địa phương/UTC; "địa phương" = MÁY (luật transit). Tháng cắt theo
 * UTC như engine. In 1–3 tháng: khung ẩn như `export/ChartExport`.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type JSX, type ReactNode } from 'react';
import type { RaveChart } from '../../calc-core/rave/chart.js';
import { BODY_NAMES, DEFINING_BODIES_STANDARD, type Body } from '../../calc-core/ephemeris/bodies.js';
import {
  INFLUENCE_FILTERS, filterCounts, matchesFilter, planetaryInfluence,
  type InfluenceFilter, type InfluenceRow, type PlanetaryInfluence as Influence,
} from '../../calc-core/rave/planetary-influence.js';
import { getBrowserEphemeris } from '../../lib/ephemeris/browser-client.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import type { Lang, UiKey } from '../../i18n/ui/index.js';
import { channelName, channelTypeName, circuitName, gateName } from '../../i18n/hd-names/index.js';
import { formatProfile } from '../../calc-core/rave/derive/type-authority.js';
import {
  centerShortName, definitionName, definitionShortName, planetName, typeName, typeShortName,
} from '../../i18n/terms.js';
import type { CompositePalette } from '../bodygraph/theme.js';
import { useCompositePalette } from '../bodygraph/CompositePaletteProvider.js';
import { PlanetGlyph } from '../glyphs/PlanetGlyph.js';
import { deviceZone, momentLabel } from '../time-mode/format.js';
import { useTimeMode, type TimeMode } from '../time-mode/TimeModeProvider.js';
import { Popover } from '../ui/Popover.js';
import { SegmentedControl } from '../ui/SegmentedControl.js';
import { Notice } from '../ui/Notice.js';
import {
  addMonths, durationLabel, monthKey, monthLabel, monthOf, monthRange, searchText, whenParts,
  type Month,
} from './influence-view.js';
import { printInFrame } from '../export/print-frame.js';
import { jdOfMs } from '../../calc-core/time/julian.js';

type T = (key: UiKey, vars?: Record<string, string | number>) => string;

export type InfluenceColumn =
  | 'when' | 'dur' | 'gate' | 'harmonic' | 'channel' | 'circuit' | 'channelType'
  | 'centers' | 'definition' | 'bridges' | 'type';
/** Đúng thứ tự cột của bản tham chiếu. Ba cột đầu luôn hiện (không có chúng dòng vô nghĩa). */
export const INFLUENCE_COLUMNS: readonly InfluenceColumn[] = [
  'when', 'dur', 'gate', 'harmonic', 'channel', 'circuit', 'channelType', 'centers', 'definition', 'bridges', 'type',
];
const ALWAYS: ReadonlySet<InfluenceColumn> = new Set(['when', 'dur', 'gate']);
/** Bề ngang cột (px) ở máy tính — tổng 1300 vừa khung 1440 (đo trên mockup đã duyệt). */
const WIDTH: Record<InfluenceColumn, number> = {
  when: 78, dur: 98, gate: 146, harmonic: 64, channel: 158, circuit: 140, channelType: 104,
  centers: 150, definition: 148, bridges: 70, type: 144,
};
/** Cột đang hiện — nhớ theo MÁY (tiện ích cá nhân, không phải dữ liệu). */
const COLUMNS_STORAGE_KEY = 'hd-webapp:pi-columns';
const PRINT_MONTHS = [1, 2, 3] as const;
/** Giá trị số của nhóm chọn thiên thể → `Body` (nhóm nút chỉ biết `number`). */
const BODY_OF = new Map<number, Body>(DEFINING_BODIES_STANDARD.map(b => [b, b]));

const jdNowOf = () => jdOfMs(Date.now());
/** Nhảy tới lúc vào cổng: +1 phút để làm tròn phút (`TransitRequest`) không rơi về trước mép. */
const PICK_AFTER_DAYS = 1 / 1440;

interface Loaded { month: Month; res: Influence; jdNow: number }

function loadColumns(): Set<InfluenceColumn> {
  try {
    const raw = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr)) return new Set([...ALWAYS, ...INFLUENCE_COLUMNS.filter(c => arr.includes(c))]);
    }
  } catch { /* chế độ riêng tư / bị chặn: dùng mặc định */ }
  return new Set(INFLUENCE_COLUMNS);
}

async function compute(chart: RaveChart, month: Month, jdNow: number): Promise<Influence> {
  const eph = await getBrowserEphemeris();
  // Nhường một nhịp để trạng thái "đang tính" kịp vẽ — một tháng mất vài trăm ms.
  await new Promise(r => setTimeout(r, 0));
  const { jdFrom, jdTo } = monthRange(month);
  return planetaryInfluence(eph, chart, jdFrom, jdTo, { jdNow });
}

export interface PlanetaryInfluenceProps {
  chart: RaveChart;
  /** Bấm một dòng ⇒ transit phía trên tính lại tại mốc này (UT, JD). */
  onPick: (jd: number) => void;
  /** Mốc transit đang xem — dòng VỪA BẤM (mốc = lúc vào cổng + ≤ 2 phút) được đánh dấu; không đánh dấu mọi dòng đang hiệu lực lúc đó (tới 13 dòng). */
  jdTransit: number | null;
}

export function PlanetaryInfluence({ chart, onPick, jdTransit }: PlanetaryInfluenceProps): JSX.Element {
  const { lang, t } = useLanguage();
  const { mode } = useTimeMode();
  const { palette } = useCompositePalette();
  const [month, setMonth] = useState<Month>(() => monthOf(new Date()));
  const [data, setData] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReadonlySet<InfluenceFilter>>(new Set());
  const [query, setQuery] = useState('');
  const [body, setBody] = useState<Body | -1>(-1);   // -1 = tất cả
  const [ongoingOpen, setOngoingOpen] = useState(true);
  const [cols, setCols] = useState<ReadonlySet<InfluenceColumn>>(() => new Set(INFLUENCE_COLUMNS));
  useEffect(() => { setCols(loadColumns()); }, []);

  useEffect(() => {
    const live = { on: true };
    setBusy(true); setErr(null);
    const jdNow = jdNowOf();
    compute(chart, month, jdNow)
      .then(res => { if (live.on) setData({ month, res, jdNow }); })
      .catch((e: unknown) => { if (live.on) setErr(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (live.on) setBusy(false); });
    return () => { live.on = false; };
  }, [chart, month]);

  const toggleColumn = (c: InfluenceColumn) => setCols(prev => {
    const next = new Set(prev);
    if (next.has(c)) next.delete(c); else next.add(c);
    try { localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify([...next])); } catch { /* không nhớ được thì thôi */ }
    return next;
  });
  const toggleFilter = (f: InfluenceFilter) => setFilters(prev => {
    const next = new Set(prev);
    if (next.has(f)) next.delete(f); else next.add(f);
    return next;
  });

  const q = query.trim().toLocaleLowerCase(lang);
  const keep = useCallback((r: InfluenceRow) =>
    [...filters].every(f => matchesFilter(r, f, chart))
    && (body === -1 || r.body === body)
    && (!q || searchText(r, lang).includes(q)), [filters, body, q, lang, chart]);

  const counts = useMemo(() => data ? filterCounts([...data.res.ongoing, ...data.res.rows], chart) : null, [data, chart]);

  /* ── In 1–3 tháng ─────────────────────────────────────────────────────── */
  const [printing, setPrinting] = useState<Loaded[] | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const print = async (n: number) => {
    setErr(null);
    try {
      const jdNow = jdNowOf();
      const out: Loaded[] = [];
      for (let i = 0; i < n; i++) {
        const m = addMonths(month, i);
        out.push(i === 0 && data && monthKey(data.month) === monthKey(m) ? data : { month: m, res: await compute(chart, m, jdNow), jdNow });
      }
      setPrinting(out);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };
  useEffect(() => {
    if (!printing || !printRef.current) return;
    printHtml(printRef.current.innerHTML, `hd-planetary-influence-${monthKey(printing[0]!.month)}`);
    setPrinting(null);
  }, [printing]);

  const shown = data && monthKey(data.month) === monthKey(month) ? data : null;
  const subtitle = t('pi.sub', {
    chart: `${typeName(chart.type, lang)} · ${formatProfile(chart.profile).replace(/ /g, '')} · ${definitionShortName(chart.definition, lang)}`,
  });
  const next = shown?.res.header.nextConnection ?? null;
  const tableProps = { chart, palette, mode, lang, t, cols, keep };

  return (
    <section className="card p-4" data-testid="planetary-influence" aria-labelledby="pi-h" aria-busy={busy}
             data-month={monthKey(month)}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2.5">
        <div className="min-w-0">
          <h3 id="pi-h" className="section-title">{t('pi.heading')}</h3>
          <p className="mt-0.5 text-ui text-ink-2">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label={t('pi.monthGroup')} className="flex items-center gap-1.5">
            <button type="button" className="btn btn-icon" aria-label={t('pi.prevMonth')} data-testid="pi-prev-month"
                    onClick={() => setMonth(m => addMonths(m, -1))}><span aria-hidden="true">◀</span></button>
            <span className="min-w-[7.5rem] text-center font-semibold tabular-nums" data-testid="pi-month" aria-live="polite">
              {monthLabel(t, month)}
            </span>
            <button type="button" className="btn btn-icon" aria-label={t('pi.nextMonth')} data-testid="pi-next-month"
                    onClick={() => setMonth(m => addMonths(m, 1))}><span aria-hidden="true">▶</span></button>
            <button type="button" className="btn" data-testid="pi-this-month" onClick={() => setMonth(monthOf(new Date()))}>
              {t('pi.thisMonth')}
            </button>
          </div>
          <Popover testId="pi-columns" label={<>{t('pi.columns')} <span aria-hidden="true" className="text-[10px]">▾</span></>}>
            <fieldset className="w-60 p-1">
              <legend className="card-title px-1">{t('pi.columnsShow')}</legend>
              {INFLUENCE_COLUMNS.map(c => (
                <label key={c} className="flex min-h-11 items-center gap-2 rounded-md px-1.5 text-ui hover:bg-subtle mouse:min-h-9">
                  <input type="checkbox" checked={cols.has(c)} disabled={ALWAYS.has(c)} data-testid={`pi-col-${c}`}
                         onChange={() => toggleColumn(c)} />
                  {t(`pi.col.${c}` as UiKey)}
                  {ALWAYS.has(c) && <span className="hint">{t('pi.columnsAlways')}</span>}
                </label>
              ))}
            </fieldset>
          </Popover>
          <Popover testId="pi-print" closeOnPick label={<>{t('pi.print')} <span aria-hidden="true" className="text-[10px]">▾</span></>}>
            <div role="group" aria-label={t('pi.printGroup')} className="flex w-60 flex-col">
              {PRINT_MONTHS.map(n => (
                <button key={n} type="button" className="btn btn-ghost w-full justify-start" data-testid={`pi-print-${n}`}
                        onClick={() => void print(n)}>
                  {n === 1 ? t('pi.print1', { month: monthLabel(t, month) })
                    : t('pi.printN', { n, from: monthLabel(t, month), to: monthLabel(t, addMonths(month, n - 1)) })}
                </button>
              ))}
              <p className="hint px-3 pb-1 pt-1.5">{t('pi.printNote')}</p>
            </div>
          </Popover>
        </div>
      </div>

      {shown && (
        <dl className="mt-3 grid w-fit max-w-full grid-cols-[auto_minmax(0,auto)] items-baseline gap-x-4 gap-y-1 rounded-lg bg-subtle px-3 py-2.5 text-ui"
            data-testid="pi-header">
          <dt className="text-caption text-ink-3">{t('pi.typeNow')}</dt>
          <dd className="font-semibold" data-testid="pi-type-now">{typeName(shown.res.header.typeWithTransitsNow, lang)}</dd>
          <dt className="text-caption text-ink-3">{t('pi.nextConnection')}</dt>
          <dd className="font-semibold" data-testid="pi-next-connection" data-gate={next?.gate}>
            {next ? (
              <>
                {momentLabel(next.jdStart, mode, deviceZone(), lang)} · <PlanetGlyph body={next.body} /> {planetName(next.body, lang)}{' '}
                {t('pi.enters')} <GateNum gate={next.gate} tone="other" palette={palette} />
                {next.channels.filter(c => c.forms).map(c => (
                  <span key={c.channel.id}> ⇒ {channelName(c.channel.id, lang)} ({pairOf(c.channel.gates)})</span>
                ))}
              </>
            ) : t('pi.nextConnectionNone')}
          </dd>
          <dd className="col-span-full text-caption font-normal text-ink-3">{t('pi.designNote')}</dd>
        </dl>
      )}

      <div className="mb-2.5 mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        {/*
          Chip bật/tắt ĐỘC LẬP (chọn nhiều), không phải nhóm chọn một ⇒ không dùng
          `SegmentedControl`, và KHÔNG `role=group` (luật design-system: mọi group có
          `aria-pressed` là `.seg`). Nhãn nhóm đọc bằng chữ ẩn đứng trước các nút.
        */}
        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto max-sm:w-full" data-testid="pi-filters">
          <span className="sr-only">{t('pi.filters')}:</span>
          {INFLUENCE_FILTERS.map(f => (
            <button key={f} type="button" aria-pressed={filters.has(f)} onClick={() => toggleFilter(f)}
                    data-testid={`pi-filter-${f}`} data-count={counts?.[f]}
                    className="btn btn-filter">
              {t(`pi.f.${f}` as UiKey)}
              {counts && <span className="tabular-nums opacity-75">{counts[f]}</span>}
            </button>
          ))}
        </div>
        <input type="search" className="field w-56 max-sm:w-full" value={query} onChange={e => setQuery(e.target.value)}
               placeholder={t('pi.search')} aria-label={t('pi.search')} data-testid="pi-search" />
        <SegmentedControl<number> label={t('pi.bodies')} value={body} onChange={v => setBody(BODY_OF.get(v) ?? -1)}
          className="max-w-full overflow-x-auto [scrollbar-width:none] [&>button]:shrink-0" testId="pi-bodies"
          options={[
            { value: -1, label: t('pi.allBodies'), testId: 'pi-body-all' },
            ...DEFINING_BODIES_STANDARD.map(b => ({
              value: b, label: <PlanetGlyph body={b} />, ariaLabel: planetName(b, lang), title: planetName(b, lang),
              testId: `pi-body-${BODY_NAMES[b]}`,
            })),
          ]} />
      </div>

      {err && <Notice tone="danger" testId="pi-error" className="mb-2">{err}</Notice>}
      {!shown && !err && <p className="empty" data-testid="pi-loading">{t('pi.computing')}</p>}
      {shown && (
        <div className="max-h-[40rem] overflow-auto rounded-lg border border-line" data-testid="pi-scroll">
          <InfluenceTable {...tableProps} data={shown} ongoingOpen={ongoingOpen}
                          onToggleOngoing={() => setOngoingOpen(o => !o)} onPick={onPick} jdTransit={jdTransit} />
        </div>
      )}

      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1.5">
        <Legend t={t} palette={palette} />
        <p className="hint">{mode === 'ut' ? t('pi.footUt') : t('pi.footLocal', { zone: deviceZone() })}</p>
      </div>

      {/* Bản in: vẽ ẩn bằng CHÍNH component bảng, rồi chép sang khung in (`printHtml`). */}
      {printing && (
        <div ref={printRef} hidden aria-hidden="true">
          {printing.map(p => (
            <section key={monthKey(p.month)} className="pi-print-month">
              <h2>{t('pi.heading')} · {monthLabel(t, p.month)}</h2>
              <p>{subtitle}</p>
              <InfluenceTable {...tableProps} data={p} ongoingOpen print />
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

const pairOf = (gates: readonly number[]) => [...gates].sort((a, b) => a - b).join('–');

/** Số cổng dạng viên. `base` = chart có sẵn · `other` = transit nối kênh · không tô = còn lại. */
function GateNum({ gate, tone, palette, label }: {
  gate: number | string; tone?: 'base' | 'other'; palette: CompositePalette; label?: string;
}): JSX.Element {
  const style: CSSProperties | undefined = tone ? { background: palette[tone], color: palette.gateText } : undefined;
  return (
    <span className={`inline-block min-w-6 rounded-full px-1.5 text-center font-semibold tabular-nums ${tone ? '' : 'bg-sunken text-ink'}`}
          style={style} data-tone={tone ?? 'none'} title={label}>{gate}</span>
  );
}

/** Vạch nửa người · nửa transit — như kênh sọc 50/50 trên bodygraph ghép. */
function ConnectBar({ palette }: { palette: CompositePalette }): JSX.Element {
  return <span aria-hidden="true" className="inline-block h-1.5 w-4.5 shrink-0 rounded-[3px]"
               style={{ background: `linear-gradient(90deg, ${palette.base} 50%, ${palette.other} 50%)` }} />;
}

function Legend({ t, palette }: { t: T; palette: CompositePalette }): JSX.Element {
  return (
    <p className="hint flex flex-wrap items-center gap-x-3.5 gap-y-1" data-testid="pi-legend">
      <span className="inline-flex items-center gap-1"><GateNum gate={12} tone="base" palette={palette} /> {t('pi.legend.natal')}</span>
      <span className="inline-flex items-center gap-1"><GateNum gate={8} tone="other" palette={palette} /> {t('pi.legend.connects')}</span>
      <span className="inline-flex items-center gap-1"><ConnectBar palette={palette} /> {t('pi.legend.bar')}</span>
      <span><b className="text-ink-2">R</b> {t('pi.legend.retro')}</span>
      <span>{t('pi.legend.plus')}</span>
    </p>
  );
}

interface TableProps {
  chart: RaveChart;
  palette: CompositePalette;
  mode: TimeMode;
  lang: Lang;
  t: T;
  cols: ReadonlySet<InfluenceColumn>;
  keep: (r: InfluenceRow) => boolean;
  data: Loaded;
  ongoingOpen: boolean;
  onToggleOngoing?: () => void;
  onPick?: (jd: number) => void;
  jdTransit?: number | null;
  /** Bản in: không đầu bảng dính, không nút. */
  print?: boolean;
}

function InfluenceTable({
  chart, palette, mode, lang, t, cols, keep, data, ongoingOpen, onToggleOngoing, onPick, jdTransit, print = false,
}: TableProps): JSX.Element {
  const zone = deviceZone();
  /* GIỮ cùng mảng giữa các lần vẽ: `InfluenceTr` là `memo` — mảng mới mỗi lần là cả bảng vẽ lại. */
  const visible = useMemo(() => INFLUENCE_COLUMNS.filter(c => cols.has(c)), [cols]);
  const ongoing = data.res.ongoing.filter(keep);
  const rows = data.res.rows.filter(keep);
  const { jdFrom, jdTo } = monthRange(data.month);
  const nowInMonth = data.jdNow >= jdFrom && data.jdNow < jdTo;
  const nowAt = nowInMonth ? rows.findIndex(r => r.jdStart > data.jdNow) : -1;
  const firstDay = whenParts(momentLabel(jdFrom, 'ut', undefined, lang), lang).day;
  const span = visible.length;

  const row = (r: InfluenceRow, isOngoing: boolean) => (
    <InfluenceTr key={`${r.body}-${r.gate}-${r.jdStart}`} r={r} ongoing={isOngoing} visible={visible} chart={chart}
                 palette={palette} mode={mode} zone={zone} lang={lang} t={t} year={data.month.y}
                 picked={jdTransit != null && jdTransit >= r.jdStart && jdTransit - r.jdStart <= 2 * PICK_AFTER_DAYS}
                 onPick={print ? undefined : onPick} />
  );

  return (
    <table className="w-full min-w-[1300px] table-fixed border-separate border-spacing-0 text-xs leading-normal tabular-nums"
           data-testid={print ? 'pi-print-table' : 'pi-table'}>
      <colgroup>{visible.map(c => <col key={c} style={{ width: WIDTH[c] }} />)}</colgroup>
      <thead>
        <tr>
          {visible.map((c, i) => (
            <th key={c} scope="col" data-col={c}
                className={`border-b border-line bg-surface px-2 py-2 text-left align-bottom text-overline font-semibold uppercase leading-tight tracking-[.04em] text-ink-3 ${
                  print ? '' : 'sticky top-0 z-[2]'} ${i === 0 && !print ? 'left-0 z-[3]' : ''}`}>
              {t(`pi.col.${c}` as UiKey)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr data-testid="pi-group-ongoing">
          <td colSpan={span} className="bg-sunken px-2 py-1.5 text-caption font-semibold text-ink-2">
            {print || !onToggleOngoing ? (
              t('pi.ongoing', { date: firstDay, n: ongoing.length, c: ongoing.filter(r => r.connects).length })
            ) : (
              <button type="button" aria-expanded={ongoingOpen} onClick={onToggleOngoing} data-testid="pi-ongoing-toggle"
                      className="min-h-11 text-left mouse:min-h-6">
                <span aria-hidden="true">{ongoingOpen ? '▾' : '▸'} </span>
                {t('pi.ongoing', { date: firstDay, n: ongoing.length, c: ongoing.filter(r => r.connects).length })}
              </button>
            )}
          </td>
        </tr>
        {ongoingOpen && ongoing.map(r => row(r, true))}
        <tr>
          <td colSpan={span} className="bg-sunken px-2 py-1.5 text-caption font-semibold text-ink-2" data-testid="pi-group-month">
            {t('pi.monthRows', { month: monthLabel(t, data.month), n: rows.length })}
          </td>
        </tr>
        {rows.length === 0 && (
          <tr><td colSpan={span} className="px-2 py-4 text-center text-ui text-ink-3" data-testid="pi-empty">{t('pi.empty')}</td></tr>
        )}
        {rows.map((r, i) => (
          i === nowAt ? [<NowRow key="now" span={span} label={t('pi.now', { when: momentLabel(data.jdNow, mode, zone, lang) })} />, row(r, false)]
            : row(r, false)
        ))}
        {nowInMonth && nowAt === -1 && rows.length > 0 && (
          <NowRow span={span} label={t('pi.now', { when: momentLabel(data.jdNow, mode, zone, lang) })} />
        )}
      </tbody>
    </table>
  );
}

function NowRow({ span, label }: { span: number; label: string }): JSX.Element {
  return (
    <tr data-testid="pi-now">
      {/* Hàng riêng cao 20px — nhãn không đè lên chữ của dòng trên như bản mockup. */}
      <td colSpan={span} className="relative h-5 border-0 p-0">
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-ink" />
        <span className="absolute left-2 top-1/2 z-[1] -translate-y-1/2 rounded-full bg-ink px-2 py-px text-overline font-semibold text-white">{label}</span>
      </td>
    </tr>
  );
}

/*
 * `memo`: kéo thanh giờ của thẻ Thời điểm transit đổi `jdTransit` hàng chục lần một giây, mà nó chỉ đổi `picked`
 * của một hai dòng. Không memo thì mỗi bước vẽ lại cả bảng (~80 ms ⇒ thanh kéo giật, đo 2026-10-27).
 */
const InfluenceTr = memo(function InfluenceTr({ r, ongoing, visible, chart, palette, mode, zone, lang, t, year, picked, onPick }: {
  r: InfluenceRow; ongoing: boolean; visible: readonly InfluenceColumn[]; chart: RaveChart; palette: CompositePalette;
  mode: TimeMode; zone: string; lang: Lang; t: T; year: number; picked: boolean; onPick?: (jd: number) => void;
}): JSX.Element {
  const w = whenParts(momentLabel(r.jdStart, mode, zone, lang), lang);
  const typeChanged = r.typeWithTransits !== chart.type;
  const defChanged = r.definition.withTransits !== r.definition.natal;
  const stack = (f: (c: InfluenceRow['channels'][number]) => ReactNode) => (
    <div className="flex flex-col">{r.channels.map(c => (
      <div key={c.channel.id} className="flex min-h-5.5 min-w-0 items-center gap-1.5 whitespace-nowrap">{f(c)}</div>
    ))}</div>
  );
  const truncate = (s: string, bold = false) => (
    <span className={`min-w-0 truncate ${bold ? 'font-semibold' : ''}`} title={s}>{s}</span>
  );
  const centers = (() => {
    const s = r.definesCenters;
    if (!s.length) return <span className="text-ink-3">—</span>;
    const dur = (x: typeof s[number]) => `${durationLabel(t, x.jdEnd - x.jdStart)}${x.pastPeriodEnd ? '+' : ''}`;
    const same = s.every(x => x.jdStart === s[0]!.jdStart && x.jdEnd === s[0]!.jdEnd && x.pastPeriodEnd === s[0]!.pastPeriodEnd);
    return same
      ? <div>{s.map(x => centerShortName(x.center, lang)).join(', ')} <span className="text-ink-3">{dur(s[0]!)}</span></div>
      : s.map(x => <div key={x.center}>{centerShortName(x.center, lang)} <span className="text-ink-3">{dur(x)}</span></div>);
  })();
  const pairGates = new Set(r.bridges.transitChannels.flatMap(c => c.gates));
  const cell: Record<InfluenceColumn, ReactNode> = {
    when: (
      <>
        {onPick ? (
          <button type="button" onClick={() => onPick(r.jdStart + PICK_AFTER_DAYS)} data-testid="pi-pick"
                  aria-label={t('pi.pick', { when: momentLabel(r.jdStart, mode, zone, lang), planet: planetName(r.body, lang), gate: r.gate })}
                  className="min-h-11 text-left underline decoration-line decoration-1 underline-offset-2 hover:decoration-ink mouse:min-h-6">
            <b className="font-semibold">{w.day}</b> {w.time}
          </button>
        ) : <><b className="font-semibold">{w.day}</b> {w.time}</>}
        <span className="block text-caption text-ink-3">
          {t(`pi.dow.${w.dow}` as UiKey)}{w.year !== year ? ` · ${w.year}` : ''}
        </span>
      </>
    ),
    dur: <span className="whitespace-nowrap text-ink-2">{durationLabel(t, r.jdEnd - r.jdStart)}</span>,
    gate: (
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-ui">
          <PlanetGlyph body={r.body} title={planetName(r.body, lang)} />
          <GateNum gate={r.gate} palette={palette} tone={r.natal ? 'base' : r.connects ? 'other' : undefined} />
          {r.retrograde && <b className="text-overline text-ink-2" title={t('pi.legend.retro')}>R</b>}
        </span>
        <span className="block truncate text-overline text-ink-3" title={gateName(r.gate, lang)} data-gate-name>
          {gateName(r.gate, lang)}
        </span>
      </div>
    ),
    harmonic: stack(c => <GateNum gate={c.harmonic} palette={palette} tone={c.harmonicNatal ? 'base' : undefined} />),
    channel: stack(c => <>{c.forms && <ConnectBar palette={palette} />}{truncate(channelName(c.channel.id, lang), c.forms)}</>),
    circuit: stack(c => truncate(circuitName(c.circuit, lang))),
    channelType: stack(c => truncate(channelTypeName(c.channelType, lang))),
    centers,
    definition: (
      <span title={defChanged ? `${definitionName(r.definition.natal, lang)} → ${definitionName(r.definition.withTransits, lang)}`
                              : definitionName(r.definition.natal, lang)}>
        {definitionShortName(r.definition.natal, lang)}
        {defChanged && <> → <b className="font-semibold">{definitionShortName(r.definition.withTransits, lang)}</b></>}
      </span>
    ),
    bridges: r.bridges.gates.length ? (
      <span className="flex flex-wrap gap-1">
        {r.bridges.gates.filter(g => !pairGates.has(g)).map(g => <GateNum key={g} gate={g} palette={palette} />)}
        {r.bridges.transitChannels.map(c => <GateNum key={c.id} gate={c.gates.join('-')} palette={palette} />)}
      </span>
    ) : <span className="text-ink-3">—</span>,
    type: typeChanged
      ? <span className="font-semibold" title={typeName(r.typeWithTransits, lang)}>{typeShortName(r.typeWithTransits, lang)}</span>
      : <span className="text-ink-3">{t('pi.sameType')}</span>,
  };
  return (
    <tr data-testid="pi-row" data-body={BODY_NAMES[r.body]} data-gate={r.gate} data-ongoing={ongoing}
        data-natal={r.natal} data-connects={r.connects} data-type={r.typeWithTransits}
        data-definition={`${r.definition.natal}>${r.definition.withTransits}`}
        aria-current={picked || undefined}
        className={`group ${picked ? 'bg-sunken' : 'bg-surface hover:bg-subtle'}`}>
      {visible.map((c, i) => (
        <td key={c} data-col={c}
            className={`border-b border-line px-2 py-1.5 align-top ${i === 0 ? 'sticky left-0 z-[1] bg-inherit' : ''}`}
            style={i === 0 && r.connects ? { boxShadow: `inset 3px 0 0 ${palette.other}` } : undefined}>
          {cell[c]}
        </td>
      ))}
    </tr>
  );
});

/**
 * In trong khung ẩn — cùng cách `export/ChartExport`: in cả trang thì ra kèm
 * biểu đồ, form, bảng phải. Chép stylesheet của trang sang để bản in dùng đúng
 * lớp Tailwind của bảng. Khung tự gỡ sau `afterprint` (hoặc 60 s).
 */
function printHtml(body: string, title: string): void {
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map(n => n.outerHTML).join('');
  printInFrame({ testId: 'pi-print-frame', title, body, head: styles +
    '<style>@page{size:A4 landscape;margin:8mm}html,body{margin:0;background:#fff}' +
    '*{print-color-adjust:exact;-webkit-print-color-adjust:exact}' +
    '.pi-print-month{break-after:page;font-size:9px}.pi-print-month:last-child{break-after:auto}' +
    '.pi-print-month h2{font-size:14px;margin:0 0 2px}.pi-print-month p{margin:0 0 6px}' +
    '.pi-print-month table{min-width:0!important;font-size:9px!important}.pi-print-month tr{break-inside:avoid}</style>' });
}
