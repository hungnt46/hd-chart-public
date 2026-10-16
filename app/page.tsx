'use client';
/**
 * Trang chính: nhập ngày/giờ/múi giờ → tính client-side (WASM) → bodygraph.
 * Không gọi mạng ngoài origin: .se1 và .wasm đều tự host (Phase 0 §8).
 *
 * ★ Bố cục hướng A "Bàn đo" (Hưng chốt 2026-09-25):
 *   · CHƯA có chart: màn chào — form nhập (trái) + kho chart (phải).
 *   · ĐÃ có chart: biểu đồ đứng đầu (`ChartWorkspace`); form + kho gom vào
 *     ngăn kéo "Chọn chart" mở từ thanh trên. Đây vẫn là quyết định "form dùng
 *     một lần rồi ẩn" (STATUS §5 #9) — chỉ đổi chỗ ẩn: nút `new-chart` giờ mở
 *     ngăn kéo thay vì hiện form lại trên đầu trang.
 *   · Trước đây form + kho đứng TRƯỚC biểu đồ khi màn chỉ còn một cột (điện
 *     thoại, tablet): tính xong vẫn chỉ thấy kho (audit F1).
 *
 * ★ Illustrator (docs/PLAN-illustrator.md Phase 2, Hưng duyệt mockup 2026-09-28)
 *   là CHẾ ĐỘ riêng, song song với `result`: không cần chart, render NGOÀI
 *   nhánh `result &&`. Vào từ menu "Chart mới ▾" hoặc màn chào; "Thoát" về
 *   chart đang mở, không có thì về màn chào. Mở một chart (form / kho) khi đang
 *   ở Illustrator là rời Illustrator — TRỪ khi mở qua "Nạp từ chart › Chọn
 *   trong Kho chart…" (`pickForIllu`): khi đó chart được nạp vào bản vẽ.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BirthForm, type BirthFormValue } from '../components/birth-form/BirthForm';
import { AmbiguityDialog } from '../components/birth-form/AmbiguityDialog';
import { ChartLibrary } from '../components/chart-library/ChartLibrary';
import { reopen } from '../lib/storage/reopen';
import type { BirthRecord } from '../lib/storage/types';
import { getBrowserEphemeris } from '../lib/ephemeris/browser-client';
import { calculateRaveChart, type RaveChart } from '../calc-core/rave/chart';
import { formatProfile } from '../calc-core/rave/derive/type-authority';
import { resolveUT, type UTResolution } from '../lib/time/resolveUT';
import { useLanguage } from '../i18n/ui/LanguageProvider';
import { zoneCityName } from '../lib/place/timezones';
import { typeName } from '../i18n/terms';
import { momentLabel } from '../components/time-mode/format';
import { useTimeMode } from '../components/time-mode/TimeModeProvider';
import { TopBar } from '../components/shell/TopBar';
import { ChartDrawer } from '../components/shell/ChartDrawer';
import { ChartWorkspace } from '../components/workspace/ChartWorkspace';
import { ViewTabs, type View } from '../components/shell/ViewTabs';
import { BottomNav } from '../components/shell/BottomNav';
import { NowTransitCard } from '../components/transit/NowTransit';
import { useMedia } from '../components/workspace/ChartCanvas';
import { Notice } from '../components/ui/Notice';
import { useIllustration } from '../components/illustrator/useIllustration';
import type { LoadProps } from '../components/illustrator/LoadFromChart';
import dynamic from 'next/dynamic';
import { fromChart, fromJson, hasPlanets, isEmpty, toJson, toRenderSets } from '../lib/illustrator/model';
import type { SavedIllustration } from '../lib/storage/types';
import { dateUTToJd } from '../calc-core/time/julian';
import { PUBLIC_EDITION } from '../lib/edition';
import { useEmbed } from '../components/embed/useEmbed';

/*
 * ★ NẠP SAU (2026-10-06, STATUS Đợt 8): những khối chỉ cần khi người dùng mở tới — Illustrator, chế độ Transit-lúc-này đầy đủ —
 *   tách thành chunk riêng bằng `next/dynamic`, không vào First Load của trang.
 *   `ssr: false`: chúng chỉ hiện sau tương tác, không có gì để dựng sẵn.
 */
const IllustratorWorkspace = dynamic(() => import('../components/illustrator/IllustratorWorkspace').then(m => m.IllustratorWorkspace), { ssr: false });
const LoadFromChart = dynamic(() => import('../components/illustrator/LoadFromChart').then(m => m.LoadFromChart), { ssr: false });
const NowTransitWorkspace = dynamic(() => import('../components/transit/NowTransit').then(m => m.NowTransitWorkspace), { ssr: false });

interface Result { chart: RaveChart; utcDate: Date; value: BirthFormValue; resolution: UTResolution }

const placeShort = (v: BirthFormValue) => v.place?.split(',')[0] ?? v.zone.split('/').pop() ?? '';
/** Nơi sinh trên thanh trên: tên nơi sinh, chưa có thì tên thành phố của múi giờ ("Hồ Chí Minh", không "Ho_Chi_Minh"). */
const placeLabel = (v: BirthFormValue, lang: string) => v.place?.split(',')[0] ?? zoneCityName(v.zone, lang);

export default function Page() {
  const { lang, t } = useLanguage();
  const { mode } = useTimeMode();
  const desktop = useMedia('(min-width: 1024px)');
  /* Điện thoại (giao diện D): sáu chế độ xuống thanh đáy 5 ô thay cho dải tab. */
  const phone = useMedia('(max-width: 639.98px)');
  /* Chế độ nhúng (bản công khai `?embed=1`, STATUS §5 #62): thanh đáy thành hàng tab trong luồng. */
  const embed = useEmbed();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ resolution: UTResolution; value: BirthFormValue } | null>(null);
  /** Ngăn kéo "Chọn chart" và mục "Chart mới" bên trong nó. */
  const [drawer, setDrawer] = useState<{ open: boolean; newOpen: boolean }>({ open: false, newOpen: false });
  /** Mỗi lần bấm "Lưu" trên thanh trên: ngăn kéo đưa focus vào ô tên chart. */
  const [saveReq, setSaveReq] = useState(0);
  /**
   * `utIso` của chart đã lưu gần nhất / vừa mở từ kho — thanh trên ghi "đã lưu"
   * khi chart đang xem trùng nó (proposal: "Người Kiến Tạo · 2/4 · chưa lưu").
   * `utIso` là trường DUY NHẤT định kết quả (luật kho), nên so nó là đủ.
   */
  const [savedUt, setSavedUt] = useState<string | null>(null);
  /** Đổi `key` để form mở từ nút "Chart mới" tự focus vào ô ngày mỗi lần. */
  const [formKey, setFormKey] = useState(0);
  const [announce, setAnnounce] = useState('');
  /** Chế độ xem — ở cấp TRANG vì sáu tab nằm trên thanh trên cùng (phương án (a)). */
  const [view, setView] = useState<View>('bodygraph');
  /** Chế độ Illustrator — song song với `result`, không cần chart. */
  const [illuOn, setIlluOn] = useState(false);
  /** Chế độ transit đầy đủ KHI CHƯA có chart — mở từ thẻ "Bầu trời lúc này" (giao diện D, 2026-10-05). */
  const [nowOn, setNowOn] = useState(false);
  const illu = useIllustration();
  /** Chart sắp mở từ kho là để NẠP vào bản vẽ ("Nạp từ chart › Chọn trong Kho chart…"). */
  const pickForIllu = useRef(false);
  const updateIllu = illu.update;

  const compute = useCallback(async (utcDate: Date, value: BirthFormValue, resolution: UTResolution, from: 'form' | 'library') => {
    setBusy(true); setError(null);
    try {
      const eph = await getBrowserEphemeris();
      const chart = calculateRaveChart(eph, dateUTToJd(utcDate));
      setResult({ chart, utcDate, value, resolution });
      setNowOn(false);
      if (pickForIllu.current && from === 'library') {
        pickForIllu.current = false;
        updateIllu(s => fromChart(chart, s));
        setDrawer({ open: false, newOpen: false });
        return;
      }
      setIlluOn(false);
      // Tạo chart mới xong thì đóng ngăn kéo để thấy biểu đồ. Mở từ kho trên máy
      // tính thì GIỮ ngăn kéo — tiện mở lần lượt nhiều chart để so.
      setDrawer(d => (from === 'form' || !desktop ? { open: false, newOpen: false } : { ...d, newOpen: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }, [desktop, updateIllu]);

  /*
   * ★ Tính xong: đưa focus về tiêu đề biểu đồ và báo qua vùng aria-live (audit
   *   F13). Trước đây form bị gỡ khỏi DOM đúng lúc đang giữ focus ⇒ focus rơi về
   *   <body>, người dùng bàn phím mất chỗ, trình đọc màn hình không được báo gì.
   *   Kéo trang về đầu để biểu đồ luôn trong tầm mắt (trên điện thoại, lúc bấm
   *   "Lập biểu đồ" trang thường đang cuộn xuống giữa form).
   */
  const lastChart = useRef<RaveChart | null>(null);
  useEffect(() => {
    if (!result || result.chart === lastChart.current) return;
    lastChart.current = result.chart;
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => document.getElementById('chart-h')?.focus({ preventScroll: true }));
    setAnnounce(t('app.chartReady', {
      type: typeName(result.chart.type, lang), profile: formatProfile(result.chart.profile),
    }));
    // Chỉ khi có chart MỚI — đổi ngôn ngữ không được đọc lại thông báo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  /**
   * Tham số sinh để đem đi lưu. Chỉ có `utIso` ảnh hưởng kết quả tính; phần còn
   * lại là để hiện lại form và để sau này còn biết chart nào giải giờ đáng ngờ.
   */
  const birthOfResult = (r: Result): BirthRecord => ({
    utIso: r.utcDate.toISOString(),
    localDate: r.value.date,
    localTime: r.value.time,
    ianaZone: r.value.zone,
    offsetMinutes: r.resolution.offsetMinutes,
    offsetSource: r.resolution.source,
    ambiguity: r.resolution.ambiguity,
    confidence: r.resolution.confidence,
    ...(r.value.place ? { place: r.value.place } : {}),
  });

  const openSaved = useCallback((birth: BirthRecord, name?: string) => {
    setSavedUt(birth.utIso);
    const r = reopen(birth);
    /* Tên đã lưu thành họ tên — trừ khi nó chỉ là tên gợi ý tự động "ngày giờ · nơi". */
    const auto = `${r.value.date} ${r.value.time} · ${placeShort(r.value)}`;
    const nm = name?.trim();
    const value = nm && nm !== auto ? { ...r.value, name: nm } : r.value;
    void compute(r.utcDate, value, r.resolution, 'library');
  }, [compute]);

  const chooseOffset = (offsetMinutes: number) => {
    if (!pending) return;
    const [y, mo, d] = pending.value.date.split('-').map(Number);
    const [h, mi] = pending.value.time.split(':').map(Number);
    const r = resolveUT({
      localDateTime: { year: y!, month: mo!, day: d!, hour: h!, minute: mi! },
      ianaZone: pending.value.zone,
      overrideOffsetMinutes: offsetMinutes,
    });
    const v = pending.value;
    setPending(null);
    void compute(r.utcDate, v, r, 'form');
  };

  const form = (
    <>
      <BirthForm key={formKey} busy={busy} autoFocus={formKey > 0}
                 initial={result?.value} welcome={!result && !illuOn}
                 onResolved={(utc, v, r) => void compute(utc, v, r, 'form')}
                 onAmbiguous={(r, v) => setPending({ resolution: r, value: v })} />
      {error && <Notice tone="danger" className="mt-4" testId="calc-error">{error}</Notice>}
    </>
  );
  /** Mở bản vẽ từ Kho (Phase 3): vào Illustrator, thay bản đang vẽ (Hoàn tác lấy lại được). */
  const openIllustration = (rec: SavedIllustration) => {
    try {
      illu.open(fromJson(rec.state), { id: rec.id, name: rec.name });
      setIlluOn(true); pickForIllu.current = false;
      setDrawer(d => (desktop ? { ...d, newOpen: false } : { open: false, newOpen: false }));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  // Tuần tự hoá / suy kênh bản vẽ chỉ khi bản vẽ đổi, không phải mỗi lượt vẽ trang.
  const illuJson = useMemo(() => toJson(illu.state), [illu.state]);
  const illuSets = useMemo(() => toRenderSets(illu.state), [illu.state]);
  const illuName = illu.state.meta.name.trim() || (illu.saved?.name ?? t('illu.untitled'));
  const library = (
    <ChartLibrary headingLevel={result || illuOn ? 3 : 2}
      current={!illuOn && result ? { birth: birthOfResult(result), suggestedName: result.value.name?.trim() ? result.value.name.trim() : `${result.value.date} ${result.value.time} · ${placeShort(result.value)}` } : null}
      onOpen={openSaved} onSaved={b => setSavedUt(b.utIso)}
      illustration={illuOn ? {
        json: illuJson, defaultName: illu.saved?.name ?? (illu.state.meta.name.trim() || t('illu.untitled')),
        savedId: illu.saved?.id ?? null, onSaved: illu.markSaved, onMissing: illu.forgetSaved,
      } : undefined}
      onOpenIllustration={openIllustration}
      confirmOpenIllustration={illu.dirty && !isEmpty(illu.state)} />
  );

  const bottomNav = phone && result !== null && !illuOn && !embed;
  const inlineNav = phone && result !== null && !illuOn && embed;

  /* Dòng danh tính gọn: Type KHÔNG chêm tiếng Anh ở đây (proposal: "Người Kiến Tạo · 2/4") — bảng thuộc tính có đủ. */
  const identity = result ? {
    when: momentLabel(dateUTToJd(result.utcDate), mode, result.resolution.zone, lang),
    place: placeLabel(result.value, lang),
    kind: `${typeName(result.chart.type, lang).replace(/\s*\([^)]*\)\s*$/, '')} · ${formatProfile(result.chart.profile).replace(/\s+/g, '')}`,
    saved: savedUt === result.utcDate.toISOString(),
    ...(result.value.name?.trim() ? { name: result.value.name.trim() } : {}),
  } : null;

  const illuPlanets = [...illu.state.gates.values()].reduce((n, m) => n + (m.acts?.filter(a => a.body !== null).length ?? 0), 0);
  const illuLoad: LoadProps = {
    current: identity ? `${identity.when} · ${identity.place}` : null,
    onCurrent: () => { if (result) updateIllu(s => fromChart(result.chart, s)); },
    onLibrary: () => { pickForIllu.current = true; setDrawer({ open: true, newOpen: false }); },
    confirm: !isEmpty(illu.state),
  };
  const openIllustrator = () => { setIlluOn(true); setDrawer({ open: false, newOpen: false }); window.scrollTo({ top: 0 }); };
  const closeDrawer = () => { pickForIllu.current = false; setDrawer({ open: false, newOpen: false }); };

  return (
    <>
      <TopBar identity={illuOn ? null : identity} drawerOpen={drawer.open}
              onIllustrator={openIllustrator}
              illustrator={illuOn ? {
                name: illuName,
                summary: [
                  t(illu.state.mode === 'free' ? 'illu.mode.free' : 'illu.mode.mechanics'),
                  t('illu.count.gates', { n: illu.state.gates.size }),
                  t('illu.count.channels', { n: illuSets.definedChannels.length }),
                  ...(hasPlanets(illu.state) ? [t('illu.count.planets', { n: illuPlanets })] : []),
                  t(illu.saved && !illu.dirty ? 'illu.savedState' : 'illu.unsavedState'),
                ].join(' · '),
                onSave: () => { pickForIllu.current = false; setDrawer({ open: true, newOpen: false }); setSaveReq(n => n + 1); },
                onRename: illu.requestRename,
                onExit: () => { setIlluOn(false); closeDrawer(); },
                load: <LoadFromChart {...illuLoad} testId="illu-load" />,
              } : undefined}
              nav={result ? <ViewTabs view={view} setView={setView} /> : undefined}
              now={!result && !illuOn && nowOn ? { onExit: () => setNowOn(false) } : undefined}
              onLibrary={() => {
                // Chưa có chart thì kho nằm ngay trên màn chào — cuộn tới đó thay vì mở ngăn kéo.
                pickForIllu.current = false;
                if (!result && !illuOn) {
                  // Đang ở transit-lúc-này (chưa có chart): về màn chào trước — Kho nằm ở đó.
                  setNowOn(false);
                  requestAnimationFrame(() => { document.getElementById('library-h')?.scrollIntoView({ block: 'start' }); document.getElementById('library-h')?.focus(); });
                  return;
                }
                setDrawer(d => ({ open: !d.open || d.newOpen, newOpen: false }));
              }}
              onNewChart={() => { setFormKey(k => k + 1); setDrawer({ open: true, newOpen: true }); }}
              onSave={() => { setDrawer({ open: true, newOpen: false }); setSaveReq(n => n + 1); }} />

      <p role="status" aria-live="polite" className="sr-only">{busy ? t('app.computing') : announce}</p>

      {(result !== null || illuOn) && (
        <ChartDrawer open={drawer.open} newOpen={drawer.newOpen} focusSave={saveReq}
                     onClose={closeDrawer}
                     onToggleNew={() => setDrawer(d => ({ ...d, newOpen: !d.newOpen }))}
                     form={form} library={library} />
      )}

      {/* Có thanh đáy thì chừa đáy trang: 49px + vùng an toàn + một khoảng thở. */}
      <main className={`mx-auto max-w-[120rem] px-2 pt-2.5 sm:px-3 ${bottomNav ? 'pb-[calc(3.0625rem+env(safe-area-inset-bottom)+1.5rem)]'
        : phone && !result && !illuOn && !embed ? 'pb-[calc(5.25rem+env(safe-area-inset-bottom))]' : embed ? 'pb-2' : 'pb-10'}`}>
        {/* Đang tính lại khi đã có chart (mở từ kho, chart mới): vạch chạy ở đỉnh — audit F11. */}
        {busy && result && (
          <div className="fixed inset-x-0 top-[calc(var(--topbar-h)+env(safe-area-inset-top))] z-40 h-1 overflow-hidden bg-sunken"
               data-testid="chart-loading" aria-hidden="true">
            <div className="h-full w-1/3 animate-[hd-progress_1s_ease-in-out_infinite] bg-ink" />
          </div>
        )}

        {inlineNav && <BottomNav view={view} setView={setView} inline />}
        {illuOn ? (
          <IllustratorWorkspace api={illu} load={illuLoad} />
        ) : result ? (
          <ChartWorkspace {...result} view={view} setView={setView} />
        ) : nowOn ? (
          <NowTransitWorkspace />
        ) : (
          /*
           * Giao diện D (Hưng duyệt 2026-10-04) + "Bầu trời lúc này" (phương án D, 2026-10-05,
           * theo human-design-system.com): máy tính — cột trái form rồi Kho chart, cột phải
           * transit hiện tại; điện thoại — form, transit, Kho (thứ tự DOM).
           */
          <div className="mx-auto grid max-w-5xl items-start justify-center gap-4 py-2 lg:grid-cols-[30rem_31.25rem] lg:grid-rows-[auto_1fr] lg:gap-6 lg:py-10">
            {/* Điện thoại (mockup M1): tiêu đề nằm trên NỀN trang, các ô trong thẻ trắng riêng (BirthForm `welcome`). */}
            <section className={`lg:col-start-1 lg:row-start-1 ${phone ? 'px-2 pt-2' : 'card p-5 sm:p-8'}`} aria-labelledby="welcome-h">
              <h2 id="welcome-h" className="text-3xl font-bold leading-tight tracking-tight max-sm:text-[length:var(--text-title-phone)]">{t('welcome.heading')}</h2>
              {/* Bản công khai bỏ dòng "Tính ngay trên máy bạn…" (Hưng 2026-10-15, STATUS §5 #68). */}
              {!PUBLIC_EDITION && <p className="mt-1.5 text-base text-ink-3" data-testid="welcome-tagline">{t('app.tagline')}</p>}
              <div className="mt-5 max-sm:mt-4">{form}</div>
              {/* Lối vào Illustrator ở màn chào đã BỎ (Hưng 2026-10-05): Illustrator là công cụ vẽ
                  minh hoạ cho người dạy, không phải lối cho người "không có ngày sinh". Vào từ
                  menu "Chart mới ▾" khi đã có chart, hoặc mở bản vẽ đã lưu từ Kho chart. */}
            </section>
            <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <NowTransitCard onOpen={() => { setNowOn(true); window.scrollTo({ top: 0 }); }} />
            </div>
            <section className="card p-5 sm:p-7 lg:col-start-1 lg:row-start-2">
              {busy ? (
                /* Trạng thái chờ lần đầu: nạp ephemeris + tính — có khung xương. */
                <div data-testid="chart-loading" aria-hidden="true" className="space-y-4">
                  <div className="h-5 w-40 animate-pulse rounded bg-sunken" />
                  <div className="aspect-[1379/1334] w-full animate-pulse rounded-xl bg-sunken" />
                </div>
              ) : library}
            </section>
          </div>
        )}
        {/* Ghi công GeoNames + "Mã nguồn (AGPL-3.0)" đã chuyển từ chân trang vào menu (Hưng 2026-10-15, STATUS §5 #69)
            — `components/shell/AboutCredits.tsx`. */}
      </main>

      {bottomNav && <BottomNav view={view} setView={setView} />}

      {pending && (
        <AmbiguityDialog
          resolution={pending.resolution}
          localLabel={`${pending.value.date} ${pending.value.time} · ${pending.value.zone}`}
          onChoose={chooseOffset}
          onCancel={() => setPending(null)} />
      )}
    </>
  );
}
