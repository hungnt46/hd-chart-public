'use client';
/**
 * Bàn làm việc của MỘT chart — hướng A "Bàn đo" (Hưng chốt 2026-09-25).
 *
 * Sáu tab chế độ nằm trên THANH TRÊN CÙNG (`shell/ViewTabs`, phương án (a) —
 * Hưng chốt 2026-09-25), không nằm ở đây. Bố cục phần này (≥ 1400px):
 *
 *     ┌──────────────────────────────────────────┬──────────┐
 *     │                                          │ điều khiển│  ← theo tab
 *     │        KHUNG BIỂU ĐỒ (cao = màn hình)     │ kết quả  │
 *     │                                          │ thuộc tính│
 *     └──────────────────────────────────────────┴──────────┘
 *     phần dưới: tra cứu chi tiết · hoặc Lịch / Theo dõi / Thay đổi (transit)
 *
 * Dưới 1400px bảng phải "tan" vào luồng chính (`display: contents`) và các mảnh
 * xếp lại bằng `order`: điều khiển → biểu đồ → kết quả → thuộc tính.
 * Thứ tự DOM = thứ tự đọc ở màn hẹp, nên Tab bàn phím đi đúng thứ tự thấy.
 *
 * ★ Vì sao như vậy (audit F1–F3): trước đây điều khiển transit nằm cách nút
 *   "Transit" ~5 400px, danh sách chu kỳ và Kết nối ở tận cuối trang, và nút
 *   "Chu kỳ" chỉ xuất hiện SAU khi đã mở một chu kỳ. Nay mỗi chế độ là một tab
 *   luôn có, và điều khiển của nó nằm ngay cạnh biểu đồ.
 *
 * Mọi quy ước tô và ghép giữ NGUYÊN từ bản trước (STATUS §5 #10, #13, #14,
 * §4 B4, E4) — chỉ chỗ đặt thay đổi. Các ghi chú ★ về luật tô đi theo code.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { RaveChart } from '../../calc-core/rave/chart.js';
import type { TransitChart } from '../../calc-core/rave/transit.js';
import type { CycleChart } from '../../calc-core/rave/cycle.js';
import type { ActivationSource } from '../../calc-core/rave/derive/activation-source.js';
import { channelActivationSource, gateActivationSources } from '../../calc-core/rave/derive/activation-source.js';
import { Body, DEFINING_BODIES_STANDARD } from '../../calc-core/ephemeris/bodies.js';
import { deriveStructure } from '../../calc-core/rave/derive/structure.js';
import type { UTResolution } from '../../lib/time/resolveUT.js';
import type { BirthFormValue } from '../birth-form/BirthForm.js';
import { Bodygraph } from '../bodygraph/Bodygraph.js';
import { Mandala } from '../mandala/Mandala.js';
import { HubBodygraph } from '../mandala/HubBodygraph.js';
import { ARTWORKS } from '../bodygraph/artworks/index.js';
import { COMPOSITE_PALETTES, THEMES, type ArtworkId } from '../bodygraph/theme.js';
import { compositeSources } from '../bodygraph/composite.js';
import { useChartTheme } from '../bodygraph/CompositePaletteProvider.js';
import {
  COLUMN_ASPECT, CompactPairPlanetColumn, CompactPlanetColumn, PAIR_COLUMN_ASPECT, PairPlanetColumn, PlanetColumn,
} from '../planet-columns/PlanetColumn.js';
import { CYCLE_HEADING, CyclePanel, CycleResult } from '../cycle/CyclePanel.js';
import { ConnectionPanel } from '../connection/ConnectionPanel.js';
import { ChartDetails } from '../chart-details/ChartDetails.js';
import { PUBLIC_EDITION } from '../../lib/edition.js';
import dynamic from 'next/dynamic';
import { TransitControls, TransitResults, useTransit } from '../transit/TransitPanel.js';
import { NextUp } from '../transit/NextUp.js';
import { deviceZone, momentLabel } from '../time-mode/format.js';
import { useTimeMode } from '../time-mode/TimeModeProvider.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { authorityName, centerName, crossDisplayName, profileName, typeName } from '../../i18n/terms.js';
import { ChartCanvas, useMedia, useZoom } from './ChartCanvas.js';
import { SegmentedControl } from '../ui/SegmentedControl.js';
import { ChartFacts, chartRows } from './ChartFacts.js';
import { gateFontUnits, rowPercents, type RowSpec } from './layout.js';
import type { View } from '../shell/ViewTabs.js';
import { dateUTToJd } from '../../calc-core/time/julian.js';

/** Bộ lọc chart ghép (B4): `both` = ghép · `base` = chỉ chart của người · `other` = chỉ transit / mốc chu kỳ. */
type ChartShow = 'both' | 'base' | 'other';

/*
 * ★ NẠP SAU (2026-10-06, STATUS Đợt 8): những khối chỉ cần khi người dùng mở tới — bốn khối dưới tab Transit và nút Xuất ảnh —
 *   tách thành chunk riêng bằng `next/dynamic`, không vào First Load của trang.
 *   `ssr: false`: chúng chỉ hiện sau tương tác, không có gì để dựng sẵn.
 */
const ActivationWatch = dynamic(() => import('../transit/ActivationWatch.js').then(m => m.ActivationWatch), { ssr: false });
const ChangesTable = dynamic(() => import('../transit/ChangesTable.js').then(m => m.ChangesTable), { ssr: false });
const EphemerisGantt = dynamic(() => import('../transit/EphemerisGantt.js').then(m => m.EphemerisGantt), { ssr: false });
const PlanetaryInfluence = dynamic(() => import('../transit/PlanetaryInfluence.js').then(m => m.PlanetaryInfluence), { ssr: false });
const ChartExport = dynamic(() => import('../export/ChartExport.js').then(m => m.ChartExport), { ssr: false });

/** Chế độ Thập tự Nhập Thế (E4): hai thiên thể tạo nên Incarnation Cross. */
const CROSS_BODIES = [Body.Sun, Body.Earth] as const;
/**
 * Điện thoại: cột gọn nằm ở hai góc trên, cao TỐI ĐA bằng phần này của biểu đồ — xem
 * `data-mobile="corners"` trong `app/globals.css`. Con số gốc đo theo NỀN cũ (tam giác Classic ~61%, bóng người
 * Modern 46%); từ 2026-10-26 không còn nền, khung ôm sát lưới ⇒ chiều cao thật do TRẦN `CORNER_CAP` quyết định
 * ở mọi khổ điện thoại (hai bản), số này chỉ còn là mức trên.
 */
const CORNER_H: Record<ArtworkId, string> = { hdkit: '60%', alternate: '46%' };
/*
 * ★ TRẦN chiều cao cột góc — cả hai bản (Hưng 2026-10-22, STATUS §5 #89; bản đầy đủ từ 2026-10-26 khi nó cũng
 *   bỏ nền, khung giống hệt bản công khai): ở máy hẹp, dòng cuối cột (và dấu
 *   ▲▼ nằm ở mép TRONG) chạm kênh chéo của hình (16-48 bên trái, 35-36 bên phải; chart 06/12/1992 Qui Nhơn: ▲ của
 *   43.2). Kênh chéo là đường thẳng theo tỉ lệ hình còn cột rộng cố định 60px ⇒ chiều cao an toàn là hàm BẬC NHẤT
 *   của chiều cao hàng: `a% − b px` (đo bằng tìm nhị phân trên chart mẫu ở 320 và 393px, trừ hao 4px; Modern đo trên `alternate.public.json`
 *   — không bóng người). Trên
 *   ~400px trần cao hơn `--corner-h` nên không đổi gì. `e2e-public/corner-overlap.spec.ts` đo đè thật — đổi bản vẽ
 *   hay cỡ cột thì đo lại hai hằng này, đừng nới test.
 */
const CORNER_CAP: Record<ArtworkId, string> = { hdkit: 'calc(76.6% - 113px)', alternate: 'calc(63.1% - 94px)' };
/* Cột HAI SỐ (104px, tab Transit "Ghép"/"Của tôi") lấn sâu hơn ⇒ trần riêng, đo cùng cách. */
const CORNER_CAP_PAIR: Record<ArtworkId, string> = { hdkit: 'calc(77.7% - 177px)', alternate: 'calc(53.4% - 80px)' };

export interface ChartWorkspaceProps {
  chart: RaveChart;
  utcDate: Date;
  value: BirthFormValue;
  resolution: UTResolution;
  /**
   * Chế độ xem — giữ ở TRANG vì sáu tab nằm trên thanh trên cùng (phương án (a),
   * Hưng chốt 2026-09-25), không nằm trong khung làm việc này.
   */
  view: View;
  setView: (v: View) => void;
  /**
   * THẺ ĐẦU bảng phải (Aura phương án C): ngày giờ · nơi sinh + Lưu — trang dựng
   * (`IdentityCard`), chỉ ≥ 640px; điện thoại để danh tính trên thanh dưới header.
   */
  identity?: ReactNode;
}

export function ChartWorkspace({ chart, utcDate, value, resolution, view, setView: setViewState, identity }: ChartWorkspaceProps): JSX.Element {
  const { lang, t } = useLanguage();
  const { mode } = useTimeMode();
  const exportRef = useRef<HTMLDivElement>(null);
  const zoom = useZoom();

  /* Đổi chế độ xem ⇒ khung về "vừa khung". */
  const { setIndex: resetZoomOnView } = zoom;
  useEffect(() => { resetZoomOnView(0); }, [view, resetZoomOnView]);
  /* Chủ đề bodygraph — kiêm bảng màu chart ghép; công tắc ở bảng cài đặt trên thanh trên (Hưng chốt 2026-09-28). */
  const { theme } = useChartTheme();
  const palette = COMPOSITE_PALETTES[theme];
  /** Bodygraph ở tâm Mandala — mặc định hiện (M3), có nút ẩn. */
  const [mandalaHub, setMandalaHub] = useState(true);
  /*
   * ★ GHÉP transit với chart của mình — STATUS §5 #10 và #13. Transit vẫn mặc
   *   định đứng MỘT MÌNH (Hưng: "chỉ khi nào người dùng lựa chọn là ghép… thì
   *   mới ghép và chồng chart"); nút lọc là lựa chọn đó.
   */
  const [transitShow, setTransitShow] = useState<ChartShow>('other');
  /*
   * ★ BỘ LỌC chart ghép (STATUS §4 B4) — "Only" KHÔNG phải giấu bớt màu trên
   *   chart ghép mà vẽ RIÊNG chart đó như chart đơn. Chu kỳ mặc định `both` vì
   *   mở chu kỳ là để xem nó ghép lên mình.
   */
  const [cycleShow, setCycleShow] = useState<ChartShow>('both');
  const [cycle, setCycle] = useState<CycleChart | null>(null);
  const openCycle = useCallback((cc: CycleChart | null) => {
    setCycle(cc);
    if (!cc) return;
    setViewState('cycle');
    // Màn hẹp: danh sách chu kỳ đứng TRÊN biểu đồ — mở xong thì đưa biểu đồ vào tầm mắt.
    if (!window.matchMedia('(min-width: 1400px)').matches) {
      requestAnimationFrame(() => document.getElementById('chart-h')?.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [setViewState]);

  /** Lịch Thiên văn Rave bấm một mốc ⇒ transit tính lại tại đó. */
  const [transitRequest, setTransitRequest] = useState<{ jd: number; n: number } | null>(null);
  const pickTransit = useCallback((jd: number) => setTransitRequest(r => ({ jd, n: (r?.n ?? 0) + 1 })), []);
  const tr = useTransit(chart, transitRequest);
  const transit: TransitChart | null = tr.result;

  /*
   * Chart khác ⇒ GIỮ chế độ đang xem (đang so transit thì mở chart khác vẫn ở
   * transit, như bản trước), chỉ đưa khung về "vừa khung". Chu kỳ tự đóng —
   * `CyclePanel` gọi `onOpen(null)` khi chart đổi.
   */
  const { setIndex: resetZoom } = zoom;
  useEffect(() => { resetZoom(0); }, [chart, resetZoom]);

  const gateSources = useMemo(() => gateActivationSources(chart, DEFINING_BODIES_STANDARD), [chart]);
  const channelSources = useMemo(() => new Map(chart.definedChannels.map(
    ch => [`${ch.gates[0]}-${ch.gates[1]}`, channelActivationSource(ch, gateSources)])), [chart, gateSources]);
  /* Cả hai cột cùng nhìn CẢ chart: fixing được kích chéo phía (xem PlanetColumn). */
  const chartSets = useMemo(() => [chart.personality, chart.design], [chart]);

  /*
   * Nguồn kích hoạt cho CHART TRANSIT đứng một mình: một bộ activation, mọi
   * cổng cùng một nguồn — tô như `personality` (ứng dụng tham chiếu cũng gọi cột đó là
   * "Personality" và để đen).
   */
  const transitSources = useMemo(() => {
    const g = new Map<number, ActivationSource>();
    const c = new Map<string, ActivationSource>();
    if (transit) {
      for (const x of transit.definedGates) g.set(x, 'personality');
      for (const ch of transit.definedChannels) c.set(`${ch.gates[0]}-${ch.gates[1]}`, 'personality');
    }
    return { g, c };
  }, [transit]);

  const xemTransit = view === 'transit' && transit !== null;
  const xemCycle = view === 'cycle' && cycle !== null;
  /* Chart ghép: tô theo BÊN — xem `compositeTheme`. Chỉ tính khi ĐANG xem. */
  const transitComposite = useMemo(() => transit && xemTransit && transitShow === 'both'
    ? compositeSources(chart.definedGates, transit.definedGates, transit.combined.definedChannels)
    : null, [chart, transit, xemTransit, transitShow]);
  const cycleComposite = useMemo(() => cycle && xemCycle && cycleShow === 'both'
    ? compositeSources(chart.definedGates, cycle.cycle.definedGates, cycle.definedChannels)
    : null, [chart, cycle, xemCycle, cycleShow]);
  /* "Chỉ chu kỳ": lá số tại mốc chu kỳ vẽ như chart đơn, đỏ/đen CỦA NÓ. */
  const cycleOwn = useMemo(() => {
    if (!cycle || !xemCycle || cycleShow !== 'other') return null;
    const gs = gateActivationSources(cycle.cycle, DEFINING_BODIES_STANDARD);
    return { gateSources: gs, channelSources: new Map(cycle.cycle.definedChannels.map(
      ch => [`${ch.gates[0]}-${ch.gates[1]}`, channelActivationSource(ch, gs)])) };
  }, [cycle, xemCycle, cycleShow]);
  /* Thập tự Nhập Thế (E4): chỉ Mặt Trời + Trái Đất của hai phía. */
  const crossOnly = useMemo(() => {
    const gs = gateActivationSources(chart, CROSS_BODIES);
    const gates = new Set(gs.keys());
    const s = deriveStructure(gates);
    return {
      gates, gateSources: gs, definedCenters: s.definedCenters, definedChannels: s.definedChannels,
      channelSources: new Map(s.definedChannels.map(
        ch => [`${ch.gates[0]}-${ch.gates[1]}`, channelActivationSource(ch, gs)])),
    };
  }, [chart]);

  /** Nhãn cho trình đọc màn hình — mô tả đúng cái biểu đồ nói. */
  const chartLabel = t('a11y.bodygraph', {
    type: typeName(chart.type, lang),
    profile: profileName(chart.profile, lang),
    authority: authorityName(chart.authority, chart.type, lang, t),
    centers: chart.definedCenters.size,
    centerList: chart.definedCenters.size
      ? t('a11y.centerList', { list: [...chart.definedCenters].map(id => centerName(id, lang)).join(', ') })
      : t('a11y.centerListEmpty'),
    channels: chart.definedChannels.length,
  });

  const show: ChartShow | null = xemTransit ? transitShow : xemCycle ? cycleShow : null;
  /** Cột hai số của NGƯỜI bên trái — có trừ khi đang "chỉ bên kia". */
  const cotNguoi = show !== null && show !== 'other';

  /* ── Hàng biểu đồ ─────────────────────────────────────────────────────── */
  const art = ARTWORKS[THEMES[theme].artwork];
  const A = art.viewBox.w / art.viewBox.h;
  const isRing = view === 'mandala' || view === 'cross';
  const spec: RowSpec = isRing ? { chart: 1 }
    : xemTransit ? { chart: A, left: cotNguoi ? PAIR_COLUMN_ASPECT : undefined, right: COLUMN_ASPECT }
    : xemCycle ? { chart: A, left: cotNguoi ? PAIR_COLUMN_ASPECT : undefined, right: PAIR_COLUMN_ASPECT }
    : { chart: A, left: COLUMN_ASPECT, right: COLUMN_ASPECT };
  const pct = rowPercents(spec);
  const gate = isRing ? undefined
    : { vbWidth: art.viewBox.w, fontUnits: gateFontUnits(Object.values(art.badges)[0]!.r) };
  const singleView = !xemTransit && !xemCycle && !isRing;
  /* #89: Modern công khai cũng không nền (`alternate.public.json`) ⇒ cột như Classic. */
  const sidesCols = PUBLIC_EDITION && !isRing;

  const bodygraphEl = (() => {
    const cls = 'block h-auto w-full';
    if (xemTransit && transitShow === 'both') {
      return <Bodygraph composite definedCenters={transit.combined.definedCenters}
                        definedChannels={transit.combined.definedChannels}
                        gateSources={transitComposite!.gateSources} channelSources={transitComposite!.channelSources}
                        theme={theme} className={cls} title={t('transit.mode.overlay')} />;
    }
    if (show === 'base') {
      return <Bodygraph definedCenters={chart.definedCenters} definedChannels={chart.definedChannels}
                        gateSources={gateSources} channelSources={channelSources} theme={theme}
                        className={cls} title={chartLabel} />;
    }
    if (xemCycle && cycleShow === 'other') {
      return <Bodygraph definedCenters={cycle.cycle.definedCenters} definedChannels={cycle.cycle.definedChannels}
                        gateSources={cycleOwn!.gateSources} channelSources={cycleOwn!.channelSources} theme={theme}
                        className={cls} title={t('view.cycle')} />;
    }
    if (xemCycle) {
      return <Bodygraph composite definedCenters={cycle.definedCenters} definedChannels={cycle.definedChannels}
                        gateSources={cycleComposite!.gateSources} channelSources={cycleComposite!.channelSources}
                        theme={theme} className={cls} title={t('view.cycle')} />;
    }
    if (xemTransit) {
      return <Bodygraph definedCenters={transit.definedCenters} definedChannels={transit.definedChannels}
                        gateSources={transitSources.g} channelSources={transitSources.c} theme={theme}
                        className={cls} title={t('view.transit')} />;
    }
    return <Bodygraph definedCenters={chart.definedCenters} definedChannels={chart.definedChannels}
                      gateSources={gateSources} channelSources={channelSources} theme={theme}
                      className={cls} title={chartLabel} />;
  })();

  const crossTitle = `${t('prop.cross')}: ${chart.cross ? crossDisplayName(chart.cross, lang) : '—'}`;
  /*
   * ★ Mandala M3 (Hưng chốt 2026-09-25): vành hoàng đạo, ô tô theo nguồn, và
   *   bodygraph ở tâm — thu VỪA vòng trong, BỎ NỀN (xem `HubBodygraph`). Nút
   *   "Bodygraph ở tâm: Hiện | Ẩn" ở bảng điều khiển của tab Mandala.
   */
  const row: ReactNode = view === 'mandala' ? (
    <Mandala personality={chart.personality} design={chart.design} activatedGates={chart.definedGates}
             gateSources={gateSources} theme={theme} zodiac
             className="block h-auto w-full" title={t('mandala.title')}>
      {mandalaHub && (
        <HubBodygraph definedCenters={chart.definedCenters} definedChannels={chart.definedChannels}
                      gateSources={gateSources} channelSources={channelSources} theme={theme} zodiac
                      title={chartLabel} />
      )}
    </Mandala>
  ) : view === 'cross' ? (
    /*
     * ★ Thập tự Nhập Thế (STATUS §4 E4) — mandala với bodygraph ở giữa, CHỈ bốn
     *   kích hoạt Mặt Trời/Trái Đất của Personality + Design; kênh/trung tâm suy
     *   lại từ đúng bốn cổng đó; đỏ/đen như chart đơn. Cùng kiểu vẽ M3 với tab
     *   Mandala — bodygraph ở tâm thu vừa vòng trong, bỏ nền.
     */
    <div data-testid="cross-view" data-gates={[...crossOnly.gates].sort((a, b) => a - b).join(',')}>
      <Mandala personality={chart.personality} design={chart.design}
               activatedGates={crossOnly.gates} gateSources={crossOnly.gateSources} bodies={CROSS_BODIES} theme={theme} zodiac
               className="block h-auto w-full" title={crossTitle}>
        <HubBodygraph definedCenters={crossOnly.definedCenters} definedChannels={crossOnly.definedChannels}
                      gateSources={crossOnly.gateSources} channelSources={crossOnly.channelSources}
                      theme={theme} zodiac title={t('prop.cross')} />
      </Mandala>
    </div>
  ) : (
    /*
     * ★ Điện thoại: MỌI chế độ bodygraph để cột ở HAI GÓC TRÊN khung (Hưng chốt
     *   2026-09-28 cho Transit / Chu kỳ, như chart đơn từ 2026-09-25) — cột gọn
     *   `cr-compact`; cột hai số gọn thêm `cr-pair` (rộng hơn). Trước đó chart
     *   ghép để cột chuẩn rơi xuống DƯỚI biểu đồ (`data-mobile="below"`, đã bỏ).
     */
    /* Bản công khai, Classic: cột gọn HAI BÊN cao trọn biểu đồ (STATUS §5 #68, `sidesCols`) — chart đơn và
       từ #70 cả tab Transit (cột đôi trái + cột transit phải). Modern (bản vẽ phủ kín khung — cột sẽ đè tam
       giác) giữ góc. */
    /* #75 (Hưng 2026-10-16, chọn B trên bản nháp): chart ĐƠN điện thoại về lại cột ở HAI GÓC TRÊN, cao 56%, để hình
       trọn bề ngang (rộng 214 → 356px ở 390px) — cột dàn trọn chiều cao chiếm chỗ, thu nhỏ hình. Cột vẫn chữ
       `COMPACT_SIDE` (sideLayout). Thẻ "Bầu trời" và "Chỉ transit" giữ "sides".
       #89 (Hưng 2026-10-22, chọn A): tab Transit "Ghép"/"Của tôi" (có cột đôi) cũng về góc — hình 166 → 350px. */
    <div className="chart-row" data-mobile={sidesCols && !singleView && !cotNguoi ? 'sides' : 'corners'}
         data-cols={cotNguoi || singleView ? 'lr' : 'r'}
         style={{ ['--gl' as string]: `${pct.left.toFixed(4)}%`, ['--gc' as string]: `${pct.chart.toFixed(4)}%`,
                  ['--gr' as string]: `${pct.right.toFixed(4)}%`, ['--corner-h' as string]: sidesCols ? '56%' : CORNER_H[THEMES[theme].artwork],
                  ['--corner-cap' as string]: CORNER_CAP[THEMES[theme].artwork],
                  ['--corner-cap-pair' as string]: CORNER_CAP_PAIR[THEMES[theme].artwork] }}>
      {singleView && (
        <>
          <PlanetColumn set={chart.design} chartSets={chartSets} side="design" showDate zone={resolution.zone}
                        className="cr-l cr-std block h-auto w-full" />
          <CompactPlanetColumn set={chart.design} chartSets={chartSets} side="design" showDate zone={resolution.zone}
                               className="cr-l cr-compact" sideLayout={sidesCols} />
        </>
      )}
      {cotNguoi && (() => {
        const p = {
          design: chart.design, personality: chart.personality, side: 'left' as const,
          otherSets: show !== 'both' ? [] : xemCycle ? [cycle.cycle.personality, cycle.cycle.design] : [transit!.transit],
          otherAccent: palette.other, heading: t('legend.mine'), accent: palette.base, testId: 'person',
        };
        return (
          <>
            <PairPlanetColumn {...p} className="cr-l cr-std block h-auto w-full" />
            <CompactPairPlanetColumn {...p} className="cr-l cr-compact cr-pair" sideLayout={sidesCols} />
          </>
        );
      })()}
      <div className="cr-c">{bodygraphEl}</div>
      {singleView && (
        <>
          <PlanetColumn set={chart.personality} chartSets={chartSets} side="personality" showDate zone={resolution.zone}
                        className="cr-r cr-std block h-auto w-full" />
          <CompactPlanetColumn set={chart.personality} chartSets={chartSets} side="personality" showDate zone={resolution.zone}
                               className="cr-r cr-compact" sideLayout={sidesCols} />
        </>
      )}
      {xemCycle && (() => {
        const p = {
          design: cycle.cycle.design, personality: cycle.cycle.personality, side: 'right' as const,
          otherSets: cycleShow === 'both' ? chartSets : [], otherAccent: palette.base,
          heading: CYCLE_HEADING[cycle.kind] + (cycle.ordinal > 1 ? ` ${cycle.ordinal}` : ''),
          accent: palette.other, testId: 'cycle',
        };
        return (
          <>
            <PairPlanetColumn {...p} className="cr-r cr-std block h-auto w-full" />
            <CompactPairPlanetColumn {...p} className="cr-r cr-compact cr-pair" />
          </>
        );
      })()}
      {xemTransit && (() => {
        const p = {
          set: transit.transit, chartSets: [transit.transit], otherSets: transitShow === 'both' ? chartSets : [],
          otherColour: palette.base, side: 'transit' as const, showDate: true, zone: deviceZone(),
        };
        return (
          <>
            <PlanetColumn {...p} className="cr-r cr-std block h-auto w-full" />
            <CompactPlanetColumn {...p} className="cr-r cr-compact" sideLayout={sidesCols} />
          </>
        );
      })()}
    </div>
  );

  /* ── Xuất ảnh (E1): chú thích + tên tệp theo chế độ đang xem ────────────── */
  const rows = chartRows(chart, lang, t);
  const exportCaption: string[] = [
    `${momentLabel(dateUTToJd(utcDate), mode, resolution.zone, lang)} · ${value.place ?? value.zone}`,
    rows.map(([, v]) => v).join(' · '),
    ...(xemTransit ? [`${t('view.transit')}: ${momentLabel(transit.jdUT, mode, deviceZone(), lang)}`] : []),
    ...(xemCycle ? [`${t('view.cycle')}: ${CYCLE_HEADING[cycle.kind]}${cycle.ordinal > 1 ? ` ${cycle.ordinal}` : ''}`
      + ` · ${momentLabel(cycle.jdUT, mode, resolution.zone, lang)}`] : []),
  ];
  const fileView = view === 'bodygraph' || view === 'connection' || (view === 'cycle' && !cycle) ? '' : `-${view}`;
  const exportFile = `hd-${value.date}-${value.time.replace(':', '')}${fileView}`;

  /* ── Điều khiển — TRONG khung biểu đồ (`ChartCanvas`), không ở bảng phải ──── */
  /*
   * ★ Hưng xem lại 2026-09-25: bảng thuộc tính phải canh ngay lề trên của biểu
   *   đồ như mockup hướng A — nút chủ đề, nút xuất, "cỡ biểu đồ" không được chen
   *   lên trên nó. Nay: bodygraph-ở-tâm ở góc trái ô biểu đồ, Xuất lên thanh trên
   *   cùng. Chart ghép: bộ lọc + chú giải màu ở hàng đầu khung — như mockup Transit.
   * ★ 2026-09-28 (Hưng chốt): chủ đề Classic/Modern RỜI khung, vào bảng cài đặt
   *   trên thanh trên (`shell/TopBar`, phương án D); bỏ nút phóng trong khung.
   */
  /* Mandala tắt bodygraph ở tâm thì không còn bản vẽ nào để đổi chủ đề. */
  const hubSeg = view === 'mandala' && (
    <div className="flex flex-col gap-1">
      <span className="hint max-sm:sr-only">{t('mandala.hub')}</span>
      <SegmentedControl label={t('mandala.hub')} value={mandalaHub} onChange={setMandalaHub}
        options={([true, false] as const).map(on => ({
          value: on, testId: on ? 'mandala-hub-on' : 'mandala-hub-off', label: t(on ? 'mandala.hubShow' : 'mandala.hubHide'),
        }))} />
    </div>
  );
  const showSeg = (which: 'transit' | 'cycle') => {
    const cur = which === 'transit' ? transitShow : cycleShow;
    const set = which === 'transit' ? setTransitShow : setCycleShow;
    return (
      <SegmentedControl label={t(which === 'transit' ? 'transit.mode.group' : 'cycle.mode.group')} value={cur} onChange={set}
        className="max-sm:flex max-sm:w-full max-sm:[&>button]:flex-1 max-sm:[&>button]:whitespace-normal max-sm:[&>button]:leading-tight"
        options={(['other', 'both', 'base'] as const).map(m => {
          const id = which === 'transit'
            ? ({ other: 'transit-mode-alone', both: 'transit-mode-overlay', base: 'transit-mode-mine' } as const)[m]
            : `cycle-mode-${m}`;
          const label = m === 'base' ? t('show.mine')
            : m === 'both' ? t(which === 'transit' ? 'transit.mode.overlay' : 'show.both')
            : t(which === 'transit' ? 'transit.mode.alone' : 'show.cycleOnly');
          /* Điện thoại: nhãn ngắn như proposal ("Chỉ transit · Ghép · Của tôi") — nhãn dài cho trình đọc màn hình. */
          const short = m === 'base' ? t('show.mineShort') : m === 'both' && which === 'transit' ? t('transit.mode.overlayShort') : label;
          return {
            value: m, testId: id, ariaLabel: label,
            label: <><span className="max-sm:hidden">{label}</span><span aria-hidden="true" className="sm:hidden">{short}</span></>,
          };
        })} />
    );
  };
  /*
   * Chú giải màu BÊN của chart ghép. Không còn nhóm nút "Màu ghép" riêng — màu
   * ghép đi theo chủ đề (Hưng chốt 2026-09-28), nên đổi Classic/Modern là đổi cả hai.
   */
  const paletteBlock = show === 'both' && (
    <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1" data-testid="composite-legend">
      <span className="hint flex items-center gap-2" aria-hidden="true">
        <span className="inline-block size-2.5 rounded-full" style={{ background: palette.base }} />{t('legend.mine')}
        <span className="inline-block size-2.5 rounded-full" style={{ background: palette.other }} />
        {t(xemTransit ? 'view.transit' : 'view.cycle')}
      </span>
    </div>
  );
  /*
   * Hàng đầu khung (proposal Transit): bộ lọc bên TRÁI; bên PHẢI là chủ đề và
   * dòng "Màu ghép" xếp chồng. Có hàng này thì nút chủ đề ở đây, không ở góc.
   */
  const bandLeft: ReactNode = view === 'transit' ? showSeg('transit')
    : xemCycle ? showSeg('cycle')
    : view === 'cycle' ? <p className="px-1 py-3 text-ui text-ink-2" data-testid="cycle-hint">{t('cycle.pickHint')}</p>
    : null;
  const band: ReactNode = bandLeft ? (
    <>
      {bandLeft}
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 max-sm:w-full max-sm:justify-between">
        {paletteBlock}
      </div>
    </>
  ) : undefined;

  /*
   * Xuất: ba nút nằm thẳng trong menu ⋯ của header (`#sheet-export` của `TopBar`) ở MỌI
   * khổ — Aura phương án C (bản đầy đủ: "Xuất, Illustrator vào ⋯"). Máy tính ⋯ là bảng thả,
   * điện thoại là bảng trượt; đổi khổ là đổi chỗ ⇒ dò lại theo `bigTop`.
   */
  const bigTop = useMedia('(min-width: 640px)');
  const sheetSlot = useTopbarSlot('sheet-export', bigTop);
  /* Bản công khai (STATUS §5 #57): không xuất ảnh ở khổ nào. */
  const exportInSheet = !PUBLIC_EDITION && sheetSlot !== null;
  const exportEl = <ChartExport target={exportRef} caption={exportCaption} fileBase={exportFile}
                                menuAlign="start" inline={exportInSheet} />;
  const exportInCorner = !PUBLIC_EDITION && !exportInSheet;
  const corners = {
    tl: (hubSeg || exportInCorner) ? <>{hubSeg}{exportInCorner && exportEl}</> : undefined,
  };

  /* CyclePanel luôn gắn (giữ danh sách đã dò + chu kỳ đang mở), chỉ ẩn khi không ở tab Chu kỳ. Bản công khai không có Chu kỳ. */
  const cycleList = PUBLIC_EDITION ? null : (
    <div hidden={view !== 'cycle'} className="space-y-3">
      <CyclePanel chart={chart} jdBirthUT={dateUTToJd(utcDate)} onOpen={openCycle} zone={resolution.zone} showResult={false} />
    </div>
  );

  const summary: ReactNode = view === 'transit' ? (
    <>
      <TransitResults result={transit} />
      {tr.ut && <NextUp jdRef={dateUTToJd(tr.ut)} />}
    </>
  ) : xemCycle ? <section className="card px-5 py-4"><CycleResult cc={cycle} zone={resolution.zone} /></section> : null;

  /*
   * Bảng phải hẹp (14rem) ở các chế độ chart đơn: số cổng ≥ 8px ở 1440×900 cần
   * khung biểu đồ rộng ≥ 1166px (`layout.ts`). Transit / Chu kỳ có nhiều điều
   * khiển hơn và vốn là chart ghép (cột hai số đã chiếm chỗ) ⇒ bảng rộng 18rem.
   */
  /* Proposal: 224px · transit 300px. Transit lấy 320px: ô ngày giờ nằm giữa ◀ ▶ (vùng bấm 44px) cần ~190px mới hiện đủ. */
  /* Bản công khai (Hưng 2026-10-15, STATUS §5 #72): bảng 14rem làm chữ xuống dòng nhiều ⇒ 20rem ở MỌI chế độ. */
  const rail = PUBLIC_EDITION || view === 'transit' || view === 'cycle' ? '20rem' : '14rem';
  /* Giao diện D (2026-10-04): từ 1600px bảng nở tới 23.75rem (380px) như mockup D — ở 1440 vẫn
     14rem / 20rem vì luật 8px (`ui.spec`). Dưới 1600 KHÔNG nở: mockup vẽ 380px ở 1440 là ảnh minh hoạ. */

  return (
    <div className="space-y-3">
    {exportInSheet && createPortal(exportEl, sheetSlot)}
    {/*
      ★ Lưới RIÊNG cho [biểu đồ | bảng phải]; phần dưới nằm NGOÀI lưới. Bảng phải
        `sticky` bám theo cả khối chứa nó — khi còn chung một lưới với phần dưới,
        cuộn xuống Tra cứu thì bảng trượt theo và đè lên chữ.
    */}
    <div className="grid grid-cols-1 gap-3 sm:max-wide:gap-3.5 wide:grid-cols-[minmax(0,1fr)_var(--rail)] wide:items-start [--rail:var(--rail-base)] min-[100rem]:[--rail:23.75rem]"
         style={{ ['--rail-base' as string]: rail }}>
      {/* Bảng phải — `contents` dưới 1400px để các mảnh xếp vào luồng chính. */}
      <div className="contents wide:sticky wide:top-[calc(var(--topbar-h)+.75rem)] wide:col-start-2 wide:row-start-1 wide:flex wide:max-h-[calc(var(--vh100)-var(--topbar-h)-.75rem)] wide:flex-col wide:gap-3 wide:overflow-y-auto wide:pb-3">
        {identity && <div className="order-1 min-w-0">{identity}</div>}
        {(view === 'transit' || view === 'cycle' || view === 'connection') && (
          <div className="order-2 min-w-0 space-y-2.5">
            {view === 'transit' && (
              <section className="card px-5 py-4" data-testid="transit-panel" aria-labelledby="transit-when-h">
                <h2 id="transit-when-h" className="card-heading mb-2.5">{t('transit.when')}</h2>
                <TransitControls s={tr} />
              </section>
            )}
            {cycleList}
            {view === 'connection' && <ConnectionPanel chart={chart} />}
          </div>
        )}
        {summary && <div className="order-4 min-w-0 space-y-2.5" data-testid="view-summary">{summary}</div>}
        {/* Tab Transit: bảng phải chỉ bốn thẻ của transit, như proposal (Hưng 2026-09-25, 7b). */}
        {view !== 'transit' && (
          <ChartFacts chart={chart} utcDate={utcDate} resolution={resolution} lookup={!PUBLIC_EDITION} className="order-5 min-w-0" />
        )}
      </div>

      <section aria-labelledby="chart-h" className="order-3 min-w-0 wide:col-start-1 wide:row-start-1">
        <h2 id="chart-h" tabIndex={-1} className="sr-only" data-testid="chart-heading">{t('app.chartHeading')}</h2>
        <ChartCanvas spec={spec} gate={gate} zoom={zoom} exportRef={exportRef} band={band} corners={corners}>
          {row}
        </ChartCanvas>
      </section>
    </div>

      <div className="min-w-0 space-y-3">
        {/*
          ★ Bản công khai (Hưng 2026-10-15, STATUS §5 #74): tab Transit KHÔNG có bốn khối công cụ — Ảnh hưởng hành
            tinh, Lịch Thiên văn Rave, Theo dõi kích hoạt, Thay đổi sắp tới. Đó là công cụ cho người hành nghề (các ứng dụng
            khác để transit ở gói trả phí hoặc chỉ cho biểu đồ) và làm trang điện thoại dài ~5.000px. Còn lại:
            biểu đồ + Thời điểm · Transit nối thêm · Mọi kênh · Tiếp theo. Bản đầy đủ giữ nguyên.
        */}
        {xemTransit ? PUBLIC_EDITION ? null : (
          <>
            {/*
              Ảnh hưởng hành tinh (docs/PLAN-planetary-influence.md Phase 3) — Hưng duyệt
              mockup 2026-09-28, phương án A: NGAY dưới khung biểu đồ, trên Lịch. Bấm một
              dòng ⇒ transit tính lại tại lúc vào cổng, như bấm Lịch.
            */}
            <PlanetaryInfluence chart={chart} onPick={pickTransit} jdTransit={transit.jdUT} />
            {/* Lịch Thiên văn Rave (STATUS §4 B5): ngay dưới chart transit, trọn bề ngang. */}
            <div className="card p-4"><EphemerisGantt chart={chart} jdRef={transit.jdUT} zone={deviceZone()} onPick={pickTransit} /></div>
            {/*
              ★ `min-w-0` trên từng ô lưới (2026-09-26): bảng Thay đổi sắp tới có
                `min-w-[34rem]` trong khung cuộn riêng, nhưng ô lưới mặc định
                `min-width: auto` nên nở theo bảng ⇒ ở 375px cả trang rộng 586px
                (có từ trước — đo ở d1e0131). Nay bảng cuộn trong khung của nó.
            */}
            <div className="grid gap-3 xl:grid-cols-2">
              {tr.ut && <div className="card min-w-0 scroll-mt-[calc(var(--topbar-h)+.5rem)] p-4" id="watch"><ActivationWatch jdRef={dateUTToJd(tr.ut)} /></div>}
              {tr.ut && <div className="card min-w-0 scroll-mt-[calc(var(--topbar-h)+.5rem)] p-4" id="changes"><ChangesTable jdRef={dateUTToJd(tr.ut)} zone={deviceZone()} /></div>}
            </div>
          </>
        ) : PUBLIC_EDITION ? null : (
          /* Bản công khai: không có bảng Tra cứu chi tiết (Hưng, STATUS §5 #60). */
          <ChartDetails chart={chart} />
        )}
      </div>
    </div>
  );
}

/**
 * Chỗ trống do `TopBar` dựng cho nút Xuất (`sheet-export`, trong menu ⋯) — gắn bằng portal.
 * Header đổi khổ (`wide` = ≥ 640px: bảng thả ↔ bảng trượt) thì chỗ đổi theo ⇒ dò lại.
 * `TopBar` dựng chỗ đó cùng lượt vẽ với khung làm việc.
 */
function useTopbarSlot(id: string, wide: boolean): Element | null {
  const [slot, setSlot] = useState<Element | null>(null);
  useEffect(() => { setSlot(document.getElementById(id)); }, [id, wide]);
  return slot;
}
