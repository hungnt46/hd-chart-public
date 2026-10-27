'use client';
/**
 * Lịch Thiên văn Rave kiểu Gantt — STATUS §4 B5. Học tab EPHEMERIS của một ứng dụng tham chiếu:
 * hàng = 13 thiên thể, ô = một `cổng.hào` rộng đúng bằng thời gian nó kéo dài,
 * màu theo quan hệ với chart người, vạch BÂY GIỜ và vạch MỐC TRANSIT, hai thang
 * Theo giờ / Theo ngày, cuộn ngang tới đâu dò tới đó.
 *
 * Tự vẽ bằng SVG chứ không nhúng vis-timeline như bản tham chiếu: cần đúng một kiểu hàng,
 * và giờ trên trục phải đi qua `momentLabel` như MỌI giờ khác của app.
 *
 * Bấm vào lịch ⇒ tính transit tại đúng thời điểm dưới con trỏ (`onPick`).
 *
 * "Địa phương" ở đây = GIỜ MÁY, như ô nhập transit (STATUS §5 #18).
 */
import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type JSX } from 'react';
import { IANAZone } from 'luxon';
import type { RaveChart } from '../../calc-core/rave/chart.js';
import { BODY_NAMES, DEFINING_BODIES_STANDARD, type Body } from '../../calc-core/ephemeris/bodies.js';
import { PlanetGlyph } from '../glyphs/PlanetGlyph.js';
import {
  bodySegments, mergeSegments, segmentRelation, type EphemerisSegment,
} from '../../calc-core/rave/ephemeris-segments.js';
import { getBrowserEphemeris } from '../../lib/ephemeris/browser-client.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import type { Lang } from '../../i18n/ui/index.js';
import { planetName } from '../../i18n/terms.js';
import { momentLabel } from '../time-mode/format.js';
import { useTimeMode } from '../time-mode/TimeModeProvider.js';
import {
  CHART_MARKER, EPHEMERIS_DIVIDER, EPHEMERIS_FILL, EPHEMERIS_LABEL_DAY, EPHEMERIS_LABEL_HOUR, EPHEMERIS_TEXT,
  EPHEMERIS_TICK, EPHEMERIS_TICK_MIDNIGHT, MARKER_HALO, NOW_MARKER,
} from './ephemeris-palette.js';
import { SegmentedControl } from '../ui/SegmentedControl.js';
import { Notice } from '../ui/Notice.js';
import { jdOfMs, msOfJd } from '../../calc-core/time/julian.js';

export interface EphemerisGanttProps {
  chart: RaveChart;
  /** Mốc transit đang xem (UT, Julian day). */
  jdRef: number;
  /** Múi giờ của MÁY. */
  zone: string;
  onPick?: (jd: number) => void;
}

type Scale = 'hourly' | 'daily';
/**
 * `span` = nửa khoảng dò lúc đầu, `extend` = mỗi lần cuộn chạm mép dò thêm bấy
 * nhiêu ngày. Đo trên Node: 13 thiên thể × 2 ngày ≈ 80 ms, × 30 ngày ≈ 300 ms,
 * × 1 năm ≈ 2.4 s ⇒ không dò sẵn cả năm; dò phần mới khi cần rồi nối.
 */
const SCALES: Readonly<Record<Scale, { pxPerDay: number; span: number; extend: number }>> = {
  hourly: { pxPerDay: 24 * 44, span: 1, extend: 1 },
  daily: { pxPerDay: 84, span: 12, extend: 12 },
};
const HEADER = 36;
const ROW = 28;
const LABEL_MIN_PX = 34;
/** Cuộn cách mép dưới ngần này thì dò thêm. */
const EDGE_PX = 160;

const isoOf = (jd: number) => new Date(Math.round(msOfJd(jd) / 1000) * 1000).toISOString();

type Segs = ReadonlyMap<Body, readonly EphemerisSegment[]>;

/** Nhường luồng giữa hai thiên thể để trang không đứng hình khi dò khoảng dài. */
const yieldToUi = () => new Promise<void>(r => setTimeout(r, 0));

async function compute(from: number, to: number): Promise<Map<Body, EphemerisSegment[]>> {
  const eph = await getBrowserEphemeris();
  const out = new Map<Body, EphemerisSegment[]>();
  for (const b of DEFINING_BODIES_STANDARD) {
    out.set(b, bodySegments(eph, from, to, b));
    await yieldToUi();
  }
  return out;
}

export function EphemerisGantt({ chart, jdRef, zone, onPick }: EphemerisGanttProps): JSX.Element {
  const { lang, t } = useLanguage();
  const { mode } = useTimeMode();
  const [scale, setScale] = useState<Scale>('hourly');
  const [range, setRange] = useState<{ from: number; to: number } | null>(null);
  const [segs, setSegs] = useState<Segs | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [nowJd, setNowJd] = useState(() => jdOfMs(Date.now()));
  /** Khung hướng dẫn "?" — bản tham chiếu có (STATUS §4 D4). */
  const [help, setHelp] = useState(false);
  const helpId = useId();
  const scroller = useRef<HTMLDivElement>(null);
  /**
   * Mép trái của phần đang thấy (px trong SVG). Nhãn ô bám theo nó — ô Sao Diêm
   * Vương dài cả năm, nhãn đặt giữa ô là nằm tận đâu ngoài màn hình.
   */
  const [viewLeft, setViewLeft] = useState(0);
  const raf = useRef(0);
  /** Sau khi dựng lại: cuộn sao cho mốc này nằm giữa, hoặc dịch đi ngần này px. */
  const pendingCenter = useRef<number | null>(null);
  const pendingShift = useRef(0);
  const busyRef = useRef(false);
  const alive = useRef(true);
  // Đặt lại `true` trong thân effect: Strict Mode (dev) gắn–gỡ–gắn lại, chỉ có
  // cleanup thì ref kẹt ở `false` và mọi kết quả dò bị vứt.
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  /** Lượt `reset` mới nhất — lượt cũ về muộn (thang ngày chậm hơn thang giờ) bị bỏ. */
  const resetId = useRef(0);

  const { pxPerDay, extend } = SCALES[scale];

  useEffect(() => {
    const timer = setInterval(() => setNowJd(jdOfMs(Date.now())), 60_000);
    return () => clearInterval(timer);
  }, []);

  /** Dò lại từ đầu quanh `center` rồi đặt nó giữa khung. */
  const reset = useCallback(async (center: number, s: Scale) => {
    const { span: sp } = SCALES[s];
    const id = ++resetId.current;
    const latest = () => alive.current && id === resetId.current;
    busyRef.current = true; setBusy(true); setErr(null);
    try {
      const from = center - sp, to = center + sp;
      const out = await compute(from, to);
      if (!latest()) return;
      pendingCenter.current = center;
      setRange({ from, to });
      setSegs(out);
    } catch (e) {
      if (latest()) setErr(e instanceof Error ? e.message : String(e));
    } finally {
      if (latest()) { busyRef.current = false; setBusy(false); }
    }
  }, []);

  /*
   * Dò lại khi đổi thang, hoặc khi mốc transit nhảy RA NGOÀI khoảng đã dò. Mốc
   * đổi bên trong khoảng thì không dò lại — chỉ dời vạch, và CUỘN TỚI nếu mốc
   * đang nằm ngoài phần nhìn thấy.
   *
   * ★ Vế "cuộn tới" thêm 2026-09-24. Trước đó mốc trong khoảng thì lịch đứng im:
   *   mở trang lúc "bây giờ" (lịch canh giữa bây giờ) rồi gõ mốc hôm qua vào ô
   *   transit ⇒ vạch mốc nằm ngoài màn hình, người dùng không thấy gì đổi. Lỗi
   *   lộ ra khi e2e chạy sang NGÀY KHÁC ngày viết test. Bấm ngay trên lịch thì
   *   mốc luôn nằm trong phần nhìn thấy ⇒ không giật.
   */
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const shownScale = useRef<Scale | null>(null);
  useEffect(() => {
    const r = rangeRef.current;
    if (shownScale.current === scale && r && jdRef > r.from && jdRef < r.to) {
      const el = scroller.current;
      if (el) {
        const x = (jdRef - r.from) * SCALES[scale].pxPerDay;
        if (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth) {
          el.scrollLeft = x - el.clientWidth / 2;
          setViewLeft(el.scrollLeft);
        }
      }
      return;
    }
    shownScale.current = scale;
    void reset(jdRef, scale);
  }, [jdRef, scale, reset]);

  /** Cuộn chạm mép ⇒ dò thêm ĐÚNG phần mới rồi nối (`mergeSegments`). */
  const grow = useCallback(async (side: 'left' | 'right') => {
    if (busyRef.current || !range || !segs) return;
    // Một `reset` chen vào giữa chừng ⇒ khoảng đã đổi, phần dò thêm này bỏ.
    const id = resetId.current;
    const latest = () => alive.current && id === resetId.current;
    busyRef.current = true; setBusy(true);
    try {
      const [from, to] = side === 'left' ? [range.from - extend, range.from] : [range.to, range.to + extend];
      const add = await compute(from, to);
      if (!latest()) return;
      const merged = new Map<Body, EphemerisSegment[]>();
      for (const b of DEFINING_BODIES_STANDARD) {
        const old = segs.get(b) ?? [], neu = add.get(b) ?? [];
        merged.set(b, side === 'left' ? mergeSegments(neu, old) : mergeSegments(old, neu));
      }
      if (side === 'left') pendingShift.current += extend * pxPerDay;
      setRange(side === 'left' ? { from, to: range.to } : { from: range.from, to });
      setSegs(merged);
    } catch (e) {
      if (latest()) setErr(e instanceof Error ? e.message : String(e));
    } finally {
      if (latest()) { busyRef.current = false; setBusy(false); }
    }
  }, [range, segs, extend, pxPerDay]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !range) return;
    if (pendingCenter.current !== null) {
      el.scrollLeft = (pendingCenter.current - range.from) * pxPerDay - el.clientWidth / 2;
      pendingCenter.current = null;
    } else if (pendingShift.current) {
      el.scrollLeft += pendingShift.current;
      pendingShift.current = 0;
    }
    setViewLeft(el.scrollLeft);
  }, [range, pxPerDay]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => setViewLeft(el.scrollLeft));
    if (el.scrollLeft < EDGE_PX) void grow('left');
    else if (el.scrollLeft + el.clientWidth > el.scrollWidth - EDGE_PX) void grow('right');
  };

  const goTo = (jd: number) => {
    const el = scroller.current;
    if (range && el && jd > range.from + 0.1 && jd < range.to - 0.1) {
      el.scrollLeft = (jd - range.from) * pxPerDay - el.clientWidth / 2;
      setViewLeft(el.scrollLeft);
    } else void reset(jd, scale);
  };

  const personGates = chart.definedGates;
  const label = useCallback((jd: number) => momentLabel(jd, mode, zone, lang), [mode, zone, lang]);

  /**
   * Vạch trục ở mỗi mốc GIỜ TRÒN theo giờ đang hiển thị. Dò theo bước 15 phút
   * vì có múi lệch nửa giờ và 45 phút (Ấn Độ +5:30, Nepal +5:45) — ở đó giờ tròn
   * địa phương không rơi vào giờ tròn UT.
   */
  const ticks = useMemo(() => {
    if (!range) return [];
    const z = mode === 'ut' || !IANAZone.isValidZone(zone) ? null : IANAZone.create(zone);
    const Q = 15 * 60000;
    const out: { jd: number; midnight: boolean }[] = [];
    for (let ms = Math.ceil(msOfJd(range.from) / Q) * Q; ms <= msOfJd(range.to); ms += Q) {
      const local = ms + (z ? z.offset(ms) : 0) * 60000;
      if (local % 3600000 !== 0) continue;
      const midnight = local % 86400000 === 0;
      if (scale === 'daily' && !midnight) continue;
      out.push({ jd: jdOfMs(ms), midnight });
    }
    return out;
  }, [range, mode, zone, scale]);

  const width = range ? Math.round((range.to - range.from) * pxPerDay) : 0;
  const height = HEADER + DEFINING_BODIES_STANDARD.length * ROW;
  const xOf = (jd: number) => (range ? (jd - range.from) * pxPerDay : 0);

  const click = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onPick || !range) return;
    const r = e.currentTarget.getBoundingClientRect();
    onPick(range.from + (e.clientX - r.left) / pxPerDay);
  };

  const marker = (jd: number, color: string, id: string) => range && jd >= range.from && jd <= range.to && (
    <g data-marker={id} data-jd={jd.toFixed(6)} pointerEvents="none">
      {/* viền trắng hai bên ⇒ vạch đạt 3:1 trên mọi màu ô — xem `ephemeris-palette.ts` */}
      <line x1={xOf(jd)} x2={xOf(jd)} y1={0} y2={height} stroke={MARKER_HALO} strokeWidth={4} />
      <line x1={xOf(jd)} x2={xOf(jd)} y1={0} y2={height} stroke={color} strokeWidth={2} />
    </g>
  );

  return (
    <section data-testid="ephemeris" aria-busy={busy} data-scale={scale}
             data-from={range ? isoOf(range.from) : ''} data-to={range ? isoOf(range.to) : ''}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="section-title">{t('ephemeris.heading')}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <SegmentedControl label={t('ephemeris.scale')} value={scale} onChange={setScale}
            options={(['hourly', 'daily'] as const).map(s => ({
              value: s, testId: `ephemeris-scale-${s}`, label: t(s === 'hourly' ? 'ephemeris.hourly' : 'ephemeris.daily'),
            }))} />
          <button type="button" className="btn" data-testid="ephemeris-goto-chart" onClick={() => goTo(jdRef)}>
            {t('ephemeris.gotoChart')}
          </button>
          <button type="button" className="btn" data-testid="ephemeris-goto-now" onClick={() => goTo(jdOfMs(Date.now()))}>
            {t('ephemeris.gotoNow')}
          </button>
          {/* Hướng dẫn: mẫu disclosure. Bảng chỉ gắn khi mở (e2e đếm 0 khi đóng) ⇒ `aria-controls` chỉ trỏ khi có đích. */}
          <button type="button" className="btn btn-icon"
                  aria-label={t('ephemeris.help')} aria-expanded={help} aria-controls={help ? helpId : undefined}
                  data-testid="ephemeris-help-toggle" onClick={() => setHelp(h => !h)}>
            <span aria-hidden="true" className="font-semibold">?</span>
          </button>
        </div>
      </div>

      {help && (
        <div id={helpId} className="mt-2 rounded-lg border border-line bg-subtle p-3 text-ui text-ink-2"
             data-testid="ephemeris-help">
          <ul className="list-disc space-y-1 pl-4">
            <li>{t('ephemeris.helpScroll')}</li>
            <li>{t('ephemeris.helpClick')}</li>
            <li>{t('ephemeris.helpColors')}</li>
            <li>{t('ephemeris.helpLive')}</li>
          </ul>
        </div>
      )}
      {err && <Notice tone="danger" className="mt-2" testId="ephemeris-error">{err}</Notice>}
      <p className="sr-only" role="status" aria-live="polite">{busy ? t('ephemeris.loading') : ''}</p>

      <div className="mt-2 flex overflow-hidden rounded-lg border border-line">
        {/* Cột tên thiên thể: đứng yên, lịch cuộn bên phải */}
        <div className="shrink-0 border-r border-line bg-surface text-xs" aria-hidden="true">
          <div style={{ height: HEADER }} className="flex items-end px-2 pb-1 text-ink-3">
            {mode === 'ut' ? t('time.ut') : t('time.local')}
          </div>
          {DEFINING_BODIES_STANDARD.map(b => (
            <div key={b} style={{ height: ROW }} className="flex items-center gap-1 whitespace-nowrap px-2">
              <PlanetGlyph body={b} /><span>{planetName(b, lang)}</span>
            </div>
          ))}
        </div>
        {/* tabIndex: vùng cuộn phải nhận được bàn phím (WCAG 2.1.1) — phím ←/→ cuộn lịch.
            `role="region"`: `aria-label` trên div trơn bị ARIA cấm; nhãn KHÁC nhãn của svg. */}
        <div ref={scroller} onScroll={onScroll} className="min-w-0 flex-1 overflow-x-auto"
             tabIndex={0} role="region" aria-label={t('ephemeris.scroller')}
             data-testid="ephemeris-scroller">
          {range && segs && (
            <svg width={width} height={height} role="img" aria-label={t('ephemeris.heading')}
                 onClick={click} className={onPick ? 'cursor-crosshair' : undefined}
                 data-testid="ephemeris-svg" data-px-per-day={pxPerDay}>
              {ticks.map(tk => {
                const [day = '', time = ''] = label(tk.jd).split(' ');
                return (
                  <g key={tk.jd} pointerEvents="none">
                    <line x1={xOf(tk.jd)} x2={xOf(tk.jd)} y1={tk.midnight ? 0 : 18} y2={height}
                          stroke={tk.midnight ? EPHEMERIS_TICK_MIDNIGHT : EPHEMERIS_TICK} />
                    {/* nhãn đã trôi qua mép trái thì bỏ — nửa chữ "2026" treo ở mép chỉ gây rối */}
                    {tk.midnight && xOf(tk.jd) >= viewLeft && <text x={xOf(tk.jd) + 3} y={12} fontSize={10} fill={EPHEMERIS_LABEL_DAY}>{day}</text>}
                    {scale === 'hourly' && xOf(tk.jd) >= viewLeft && <text x={xOf(tk.jd) + 3} y={30} fontSize={10} fill={EPHEMERIS_LABEL_HOUR}>{time}</text>}
                  </g>
                );
              })}
              {(() => {
                // Ngày đang thấy ở mép trái — không thì cuộn giữa hai nửa đêm là không biết ngày nào.
                const jdLeft = range.from + viewLeft / pxPerDay;
                const nextMidnight = ticks.find(tk => tk.midnight && tk.jd > jdLeft);
                if (nextMidnight && xOf(nextMidnight.jd) - viewLeft < 76) return null;
                return (
                  <text x={viewLeft + 3} y={12} fontSize={10} fill={EPHEMERIS_LABEL_DAY} pointerEvents="none"
                        data-testid="ephemeris-day-sticky">{label(jdLeft).split(' ')[0]}</text>
                );
              })()}
              <GanttRows segs={segs} from={range.from} to={range.to} pxPerDay={pxPerDay} viewLeft={viewLeft}
                         personGates={personGates} label={label} lang={lang} />
              {marker(nowJd, NOW_MARKER, 'now')}
              {marker(jdRef, CHART_MARKER, 'chart')}
            </svg>
          )}
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" data-testid="ephemeris-legend">
        {(['transit', 'same', 'harmonic', 'both'] as const).map(rel => (
          <li key={rel} className="flex items-center gap-1">
            <svg width={14} height={14} aria-hidden="true">
              {rel === 'both' ? (
                <>
                  <rect width={14} height={7} fill={EPHEMERIS_FILL.same} />
                  <rect y={7} width={14} height={7} fill={EPHEMERIS_FILL.harmonic} />
                </>
              ) : <rect width={14} height={14} fill={EPHEMERIS_FILL[rel]} stroke={EPHEMERIS_DIVIDER} />}
            </svg>
            {t(`ephemeris.rel.${rel}`)}
          </li>
        ))}
        <li className="flex items-center gap-1">
          <span aria-hidden="true" className="inline-block h-3.5 w-0.5" style={{ background: NOW_MARKER }} />
          {t('ephemeris.now')}
        </li>
        <li className="flex items-center gap-1">
          <span aria-hidden="true" className="inline-block h-3.5 w-0.5" style={{ background: CHART_MARKER }} />
          {t('ephemeris.chartMoment')}
        </li>
      </ul>
      {onPick && <p className="hint mt-1">{t('ephemeris.hint')}</p>}
    </section>
  );
}

/**
 * Các hàng ô hào — phần NẶNG của lịch (hàng trăm ô × 13 thiên thể). Tách riêng và `memo` vì nó KHÔNG phụ thuộc
 * mốc transit: kéo thanh giờ của thẻ Thời điểm transit đổi `jdRef` hàng chục lần một giây, mà chỉ cần dời một
 * vạch mốc. Không tách thì mỗi bước vẽ lại cả lịch (đo 2026-10-27: phần lớn thời gian một bước kéo ở tab Transit).
 */
const GanttRows = memo(function GanttRows({ segs, from, to, pxPerDay, viewLeft, personGates, label, lang }: {
  segs: Segs; from: number; to: number; pxPerDay: number; viewLeft: number;
  personGates: ReadonlySet<number>; label: (jd: number) => string; lang: Lang;
}): JSX.Element {
  const range = { from, to };
  const xOf = (jd: number) => (jd - from) * pxPerDay;
  return (
    <>
      {DEFINING_BODIES_STANDARD.map((b, i) => {
        const y = HEADER + i * ROW + 2, h = ROW - 4;
        return (
          <g key={b} data-ephem-body={BODY_NAMES[b]}>
            {(segs.get(b) ?? []).map(s => {
              const x0 = Math.max(s.jdStart, range.from), x1 = Math.min(s.jdEnd, range.to);
              if (x1 <= x0) return null;
              const x = xOf(x0), w = xOf(x1) - x;
              const rel = segmentRelation(s.gate, personGates);
              const cell = `${s.gate}.${s.line}${s.retrograde ? ' R' : ''}`;
              return (
                <g key={s.jdStart} data-seg={`${s.gate}.${s.line}`} data-rel={rel}
                   data-retro={s.retrograde || undefined}
                   data-start={isoOf(s.jdStart)} data-end={isoOf(s.jdEnd)}>
                  <title>{`${planetName(b, lang)} ${cell} · ${label(s.jdStart)} → ${label(s.jdEnd)}`}</title>
                  {rel === 'both' ? (
                    <>
                      <rect x={x} y={y} width={w} height={h / 2} fill={EPHEMERIS_FILL.same} />
                      <rect x={x} y={y + h / 2} width={w} height={h / 2} fill={EPHEMERIS_FILL.harmonic} />
                    </>
                  ) : <rect x={x} y={y} width={w} height={h} fill={EPHEMERIS_FILL[rel]} />}
                  {s.jdStart >= range.from && (
                    <line x1={x} x2={x} y1={y} y2={y + h} stroke={EPHEMERIS_DIVIDER} />
                  )}
                  {x + w - Math.max(x, viewLeft) >= LABEL_MIN_PX && (
                    // Bám mép trái phần đang thấy, nhưng không trượt ra khỏi ô.
                    <text x={Math.min(Math.max(x, viewLeft) + 4, x + w - LABEL_MIN_PX + 4)} y={y + h / 2 + 4}
                          fontSize={11} fill={EPHEMERIS_TEXT} pointerEvents="none">{cell}</text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </>
  );
});
