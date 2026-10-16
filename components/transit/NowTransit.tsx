'use client';
/**
 * ★ "Bầu trời lúc này" — transit ĐỨNG MỘT MÌNH, không cần ngày sinh (Hưng chọn phương
 *   án D 2026-10-05, tham khảo human-design-system.com: khối "Aktueller Transit" đứng
 *   cạnh form).
 *
 *   · `NowTransitCard`      thẻ ở màn chào, cột phải: bodygraph + cột transit đúng như
 *                           tab Transit vẽ ("Chỉ transit"), Trực tiếp bật sẵn, liên kết
 *                           "Mở transit đầy đủ →".
 *   · `NowTransitWorkspace` chế độ transit đầy đủ khi CHƯA có chart: khung biểu đồ, bảng
 *                           phải (Thời điểm · Kênh transit · Tiếp theo), Theo dõi kích
 *                           hoạt + Thay đổi sắp tới. KHÔNG có Lịch Thiên văn / Ảnh hưởng
 *                           hành tinh / ghép — mấy thứ đó cần chart của người.
 *
 *   Bodygraph tô như transit một mình ở tab Transit: một bộ kích hoạt, nguồn
 *   `personality` (đen). Cột hành tinh là ĐÚNG `PlanetColumn` side="transit".
 */
import { useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react';
import type { DayChart } from '../../calc-core/rave/transit.js';
import type { ActivationSource } from '../../calc-core/rave/derive/activation-source.js';
import { Bodygraph } from '../bodygraph/Bodygraph.js';
import { ARTWORKS } from '../bodygraph/artworks/index.js';
import { THEMES, type ArtworkId } from '../bodygraph/theme.js';
import { useChartTheme } from '../bodygraph/CompositePaletteProvider.js';
import { COLUMN_ASPECT, CompactPlanetColumn, PlanetColumn } from '../planet-columns/PlanetColumn.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { centerShortName, channelShortName } from '../../i18n/terms.js';
import { channelName } from '../../i18n/hd-names/index.js';
import { useTimeMode } from '../time-mode/TimeModeProvider.js';
import { deviceZone, momentLabel } from '../time-mode/format.js';
import { ChartCanvas, useZoom } from '../workspace/ChartCanvas.js';
import { gateFontUnits, rowPercents, type RowSpec } from '../workspace/layout.js';
import { TransitControls, useDayTransit } from './TransitPanel.js';
import { NextUp } from './NextUp.js';
import dynamic from 'next/dynamic';
import { Notice } from '../ui/Notice.js';
import { dateUTToJd } from '../../calc-core/time/julian.js';
import { PUBLIC_EDITION } from '../../lib/edition.js';

/* Nạp sau — chỉ chế độ transit đầy đủ cần (thẻ ở màn chào thì không). */
const ActivationWatch = dynamic(() => import('./ActivationWatch.js').then(m => m.ActivationWatch), { ssr: false });
const ChangesTable = dynamic(() => import('./ChangesTable.js').then(m => m.ChangesTable), { ssr: false });

/** Như `CORNER_H` của `ChartWorkspace` — cột gọn ở hai góc trên trên điện thoại. */
const CORNER_H: Record<ArtworkId, string> = { hdkit: '60%', alternate: '46%' };

/** Hàng [bodygraph | cột transit] — cùng hệ tỉ lệ, cùng CSS `chart-row` với tab Transit. */
function useNowRow(day: DayChart | null, bodygraphTestId?: string, card = false) {
  const { theme } = useChartTheme();
  const { t } = useLanguage();
  const art = ARTWORKS[THEMES[theme].artwork];
  const spec: RowSpec = { chart: art.viewBox.w / art.viewBox.h, right: COLUMN_ASPECT };
  const gate = { vbWidth: art.viewBox.w, fontUnits: gateFontUnits(Object.values(art.badges)[0]!.r) };
  const sources = useMemo(() => {
    const g = new Map<number, ActivationSource>();
    const c = new Map<string, ActivationSource>();
    if (day) {
      for (const x of day.definedGates) g.set(x, 'personality');
      for (const ch of day.definedChannels) c.set(`${ch.gates[0]}-${ch.gates[1]}`, 'personality');
    }
    return { g, c };
  }, [day]);
  const pct = rowPercents(spec);
  /* Bản công khai, Classic: cột gọn hai bên (STATUS §5 #68). Modern phủ kín khung ⇒ giữ kiểu cũ. */
  const sides = PUBLIC_EDITION && THEMES[theme].artwork === 'hdkit';
  const row = day && (
    /* Thẻ màn chào: cột gọn hai bên ở mọi khổ (`app/globals.css`). */
    <div className="chart-row" data-mobile={sides ? 'sides' : 'corners'} data-cols="r"
         data-compact={sides && card ? 'always' : undefined}
         style={{ ['--gl' as string]: '0%', ['--gc' as string]: `${pct.chart.toFixed(4)}%`,
                  ['--gr' as string]: `${pct.right.toFixed(4)}%`, ['--corner-h' as string]: CORNER_H[THEMES[theme].artwork] }}>
      <div className="cr-c">
        <Bodygraph definedCenters={day.definedCenters} definedChannels={day.definedChannels}
                   gateSources={sources.g} channelSources={sources.c} theme={theme}
                   className="block h-auto w-full" title={t('now.title')}
                   {...(bodygraphTestId ? { testId: bodygraphTestId } : {})} />
      </div>
      <PlanetColumn set={day.transit} chartSets={[day.transit]} side="transit" showDate zone={deviceZone()}
                    className="cr-r cr-std block h-auto w-full" />
      <CompactPlanetColumn set={day.transit} chartSets={[day.transit]} side="transit" showDate zone={deviceZone()}
                           className="cr-r cr-compact" sideLayout={sides} />
    </div>
  );
  return { spec, gate, row };
}

function LiveDot(): JSX.Element {
  return <span aria-hidden="true" className="inline-block size-2 rounded-full bg-live animate-[hd-blink_2s_infinite]" />;
}

/**
 * Bật SAU, không bật lúc mở trang (luật hiệu năng ở `ui.spec` "tải trang KHÔNG kéo theo
 * ephemeris": 2.4 MB, cache `immutable` sau lần đầu). Ba nấc:
 *   1. chờ service worker NHẬN QUẢN trang (≤ 4 s) — để tệp ephemeris đi qua SW và vào
 *      cache `hd-assets`; tải trước lúc đó thì cắt mạng là mất (`offline.spec` bắt được);
 *   2. thêm 1.5 s — form tương tác xong trước;
 *   3. đợi trình duyệt rảnh (`requestIdleCallback`, ≤ 2 s).
 */
async function swControlled(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  await Promise.race([
    (async () => {
      await sw.ready;
      if (!sw.controller) await new Promise(r => sw.addEventListener('controllerchange', r, { once: true }));
    })(),
    new Promise(r => setTimeout(r, 4000)),
  ]);
}
/*
 * ★ BẢN CÔNG KHAI (Hưng 2026-10-15, STATUS §5 #69): KHÔNG có service worker ⇒ nấc 1 luôn chờ đủ 4 s
 *   (`sw.ready` không bao giờ xong) rồi thêm 1.5 s — đo trên chart.humandesign.vn: bodygraph hiện sau ~7.6 s,
 *   trong đó ~6.4 s là chờ. Bản công khai bỏ nấc 1 + 2, chỉ chờ trình duyệt rảnh (≤ 300 ms) sau hydrate.
 */
const PUBLIC_IDLE_MS = 300;

function useIdleReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let off = false;
    let cancel: () => void = () => undefined;
    if (PUBLIC_EDITION) {
      if ('requestIdleCallback' in window) {
        const id = window.requestIdleCallback(() => setReady(true), { timeout: PUBLIC_IDLE_MS });
        cancel = () => window.cancelIdleCallback(id);
      } else {
        const t = setTimeout(() => setReady(true), 0);
        cancel = () => clearTimeout(t);
      }
      return () => { off = true; cancel(); };
    }
    void swControlled().catch(() => undefined).then(() => {
      if (off) return;
      const t = setTimeout(() => {
        if (off) return;
        if ('requestIdleCallback' in window) {
          const id = window.requestIdleCallback(() => setReady(true), { timeout: 2000 });
          cancel = () => window.cancelIdleCallback(id);
        } else setReady(true);
      }, 1500);
      cancel = () => clearTimeout(t);
    });
    return () => { off = true; cancel(); };
  }, []);
  return ready;
}

/** Thẻ màn chào (cột phải). */
export function NowTransitCard({ onOpen }: { onOpen: () => void }): JSX.Element {
  const ready = useIdleReady();
  return ready ? <NowCardBody onOpen={onOpen} /> : <NowCardFrame onOpen={onOpen} day={null} err={null} row={null} />;
}

function NowCardBody({ onOpen }: { onOpen: () => void }): JSX.Element {
  const s = useDayTransit(null, { live: true });
  const { row } = useNowRow(s.result, 'now-bodygraph', true);
  return <NowCardFrame onOpen={onOpen} day={s.result} err={s.err} row={row} />;
}

function NowCardFrame({ onOpen, day, err, row }: {
  onOpen: () => void; day: DayChart | null; err: string | null; row: ReactNode;
}): JSX.Element {
  const { lang, t } = useLanguage();
  const { mode } = useTimeMode();
  return (
    <section className="card px-5 pb-4 pt-5 sm:px-6" aria-labelledby="now-h" data-testid="now-card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="now-h" className="text-xl font-bold">{t('now.title')}</h2>
        <span className="inline-flex items-center gap-1.5 text-ui text-ink-2"><LiveDot />{t('transit.live')}</span>
      </div>
      <p className="mt-0.5 text-ui text-ink-3 tabular-nums" data-testid="now-when">
        {day ? `${momentLabel(day.jdUT, mode, deviceZone(), lang)} · ${t('now.auto')}` : ' '}
      </p>
      {/* Khung `data-full="false"`: CSS cột gọn hai góc (điện thoại) bám thuộc tính này như ở ChartCanvas. */}
      <div data-full="false" className="mt-3">
        {row ?? (err
          ? <Notice tone="danger">{err}</Notice>
          : <div aria-hidden="true" className="aspect-[1379/1334] w-full animate-pulse rounded-xl bg-sunken" />)}
      </div>
      {/* Bản công khai (Hưng 2026-10-13, STATUS §5 #64): KHÔNG dòng gợi ý và KHÔNG lối vào transit đầy đủ —
          thẻ chỉ là "bầu trời lúc này". Bản đầy đủ giữ nguyên. */}
      {!PUBLIC_EDITION && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3">
          <p className="text-ui text-ink-3" data-testid="now-hint">{t('now.hint')}</p>
          <button type="button" onClick={onOpen} data-testid="now-open" className="link-action text-sm">
            {t('now.open')} <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </section>
  );
}

/** Chế độ transit đầy đủ khi chưa có chart. */
export function NowTransitWorkspace(): JSX.Element {
  const { lang, t } = useLanguage();
  const s = useDayTransit(null, { live: true });
  const day = s.result;
  const zoom = useZoom();
  const exportRef = useRef<HTMLDivElement>(null);
  const { spec, gate, row } = useNowRow(day);
  const channels = day ? [...day.definedChannels]
    .map(ch => ({ ch, pair: [...ch.gates].sort((a, b) => a - b) }))
    .sort((x, y) => x.pair[0]! - y.pair[0]! || x.pair[1]! - y.pair[1]!) : [];
  return (
    <div className="space-y-3" data-testid="now-workspace">
      <div className="grid grid-cols-1 gap-3 wide:grid-cols-[minmax(0,1fr)_20rem] wide:items-start min-[100rem]:grid-cols-[minmax(0,1fr)_23.75rem]">
        <div className="contents wide:sticky wide:top-[calc(var(--topbar-h)+.625rem)] wide:col-start-2 wide:row-start-1 wide:flex wide:flex-col wide:gap-2.5">
          <section className="order-2 card px-5 py-4" data-testid="transit-panel" aria-labelledby="now-when-h">
            <h2 id="now-when-h" className="card-heading mb-2.5">{t('transit.when')}</h2>
            <TransitControls s={s} />
          </section>
          {day && (
            <section className="order-4 card px-5 py-4" aria-labelledby="now-ch-h" data-testid="now-channels">
              <h3 id="now-ch-h" className="card-heading mb-1 flex justify-between gap-2">
                <span>{t('now.channels')}</span>
                <span className="font-normal text-ink-3 tabular-nums">{channels.length}</span>
              </h3>
              {channels.length ? (
                <ul className="text-sm">
                  {channels.map(({ ch, pair }) => {
                    const name = channelName(ch.id, lang);
                    return (
                      <li key={ch.id} className="flex items-center gap-3 py-1.5" data-now-channel={pair.join('-')}>
                        <span className="min-w-[3.375rem] shrink-0 rounded-lg bg-sunken px-2 py-1 text-center font-semibold tabular-nums">{pair.join('–')}</span>
                        <span className="truncate" title={name}>{channelShortName(name)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-ui text-ink-2">{t('now.noChannels')}</p>}
              <p className="mt-2 text-ui text-ink-2">
                {t('now.centers', { list: day.definedCenters.size ? [...day.definedCenters].map(c => centerShortName(c, lang)).join(' · ') : '—' })}
              </p>
            </section>
          )}
          {s.ut && <NextUp jdRef={dateUTToJd(s.ut)} className="order-5" />}
        </div>
        <section aria-labelledby="now-chart-h" className="order-3 min-w-0 wide:col-start-1 wide:row-start-1">
          <h2 id="now-chart-h" className="sr-only">{t('now.title')}</h2>
          <ChartCanvas spec={spec} gate={gate} zoom={zoom} exportRef={exportRef}>
            {row ?? <div className="aspect-[1379/1334] w-full" />}
          </ChartCanvas>
        </section>
      </div>
      {s.ut && (
        <div className="grid gap-3 xl:grid-cols-2">
          <div className="card min-w-0 scroll-mt-[calc(var(--topbar-h)+.5rem)] p-4" id="watch"><ActivationWatch jdRef={dateUTToJd(s.ut)} /></div>
          <div className="card min-w-0 scroll-mt-[calc(var(--topbar-h)+.5rem)] p-4" id="changes"><ChangesTable jdRef={dateUTToJd(s.ut)} zone={deviceZone()} /></div>
        </div>
      )}
    </div>
  );
}
