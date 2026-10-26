'use client';
/**
 * Transit — SPEC §10.5 (D11). Chồng bầu trời của một thời điểm lên chart nền.
 *
 * ★ Tách làm BA mảnh (2026-09-25, hướng A "Bàn đo"): trước đây cả khung transit
 *   — ô thời gian, nút Tính, kết quả, Theo dõi kích hoạt, Thay đổi sắp tới —
 *   nằm MỘT khối ở cuối trang, cách nút "Transit" ~5 400px (audit F2). Nay:
 *     · `useTransit`       trạng thái + mọi hiệu ứng (tính lần đầu, Trực tiếp,
 *                          đổi công tắc giờ, mốc do Lịch gửi tới) — MỘT nơi;
 *     · `TransitControls`  ô thời gian + nút, đặt NGAY CẠNH biểu đồ;
 *     · `TransitResults`   kênh / trung tâm transit thêm vào, ở bảng bên phải.
 *   Theo dõi kích hoạt, Thay đổi sắp tới và Lịch vẽ dưới khung biểu đồ.
 *   Trạng thái nằm ở `ChartWorkspace` nên đổi tab qua lại không mất mốc đã chọn.
 *
 * ⚠️ KHÔNG hiện Type/Authority/Profile mới. Transit không đổi thiết kế của một
 *   người — xem ghi chú trong `calc-core/rave/transit.ts`.
 */
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import type { RaveChart } from '../../calc-core/rave/chart.js';
import { calculateDayChart, calculateTransitChart, type DayChart, type TransitChart } from '../../calc-core/rave/transit.js';
import type { EphemerisProvider } from '../../calc-core/ephemeris/provider.js';
import { getBrowserEphemeris } from '../../lib/ephemeris/browser-client.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { centerShortName, planetName } from '../../i18n/terms.js';
import { DEFINING_BODIES_STANDARD, type Body } from '../../calc-core/ephemeris/bodies.js';
import { PlanetGlyph } from '../glyphs/PlanetGlyph.js';
import { CYCLE_COMPOSITION_STATES } from '../../calc-core/rave/cycle.js';
import type { UiKey } from '../../i18n/ui/index.js';
import { useTimeMode, type TimeMode } from '../time-mode/TimeModeProvider.js';
import { deviceZone } from '../time-mode/format.js';
import { Icon } from '../ui/Icon.js';
import { Notice } from '../ui/Notice.js';
import { dateUTToJd, msOfJd } from '../../calc-core/time/julian.js';


/**
 * ★ Không có nút "Tính" (Hưng chốt 2026-09-26, Đợt 4 điểm 5b — như proposal hướng A):
 *   gõ vào ô thời gian thì app TỰ tính khi người dùng ngừng gõ chừng này; Enter tính
 *   ngay. Phải chờ vì `datetime-local` đổi giá trị theo TỪNG phần gõ — gõ năm 2026 đi
 *   qua 0002, 0020, 0202 — tính theo từng phím là tính cả những mốc dở dang đó.
 */
export const TYPE_PAUSE_MS = 700;
/**
 * Bộ ephemeris tự host phủ 1800-01-01 → 2400-01-08 (`calc-core/ephemeris/provider.ts`).
 * Tự tính KHÔNG chạy ngoài khoảng này: đó gần như luôn là năm đang gõ dở ("0202"),
 * báo lỗi giữa lúc người ta còn đang gõ chỉ gây rối. Enter vẫn tính và báo lỗi như cũ.
 */
const AUTO_MIN = Date.UTC(1800, 0, 2), AUTO_MAX = Date.UTC(2400, 0, 7);

/**
 * `Date` → chuỗi cho `<input type="datetime-local">`, theo **giờ máy người dùng**.
 *
 * ★ Đổi 2026-09-22 (Hưng chốt): trước đây ô này hiểu là giờ UT, theo đúng app
 * Jovian. Nhưng người ta định vị thời gian bằng giờ của mình — "3 giờ chiều nay"
 * chứ không phải "08:00 UT". Nay ô nhận giờ địa phương và app hiện kèm mốc UT
 * tương ứng để không có chỗ nào mơ hồ.
 *
 * Không dùng `toISOString()` được: hàm đó luôn trả giờ UTC.
 */
const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
  `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toUtInput = (d: Date) => d.toISOString().slice(0, 16);
/**
 * ★ Ô nhập đổi theo CÔNG TẮC GIỜ (Hưng chốt 2026-09-23, STATUS §5 #18): chọn UT
 * thì gõ UT. `new Date("YYYY-MM-DDTHH:mm")` KHÔNG hậu tố đọc theo giờ máy;
 * thêm `:00Z` là đọc theo UTC.
 */
const toInput = (d: Date, mode: TimeMode) => (mode === 'ut' ? toUtInput(d) : toLocalInput(d));
const fromInput = (s: string, mode: TimeMode) => new Date(mode === 'ut' ? `${s}:00Z` : s);

/** Nhãn múi giờ của máy, ví dụ "Asia/Ho_Chi_Minh". */
const localZone = deviceZone;

export interface TransitState<R extends DayChart = TransitChart> {
  when: string;
  setWhen: (w: string) => void;
  result: R | null;
  /** Mốc UT tương ứng với ô nhập — hiện ra để không ai phải đoán. */
  ut: Date | null;
  busy: boolean;
  err: string | null;
  live: boolean;
  setLive: (f: (v: boolean) => boolean) => void;
  toasts: readonly { id: number; body: Body; text: string }[];
  dismissToast: (id: number) => void;
  /** Người dùng gõ vào ô thời gian: ghi giá trị, tự tính khi ngừng gõ `TYPE_PAUSE_MS`. */
  edit: (w: string) => void;
  /**
   * Tính NGAY (Enter). Truyền giá trị ĐANG nằm trong ô thì tính đúng nó, không phụ
   * thuộc lần vẽ lại sau phím cuối đã kịp đổi `when` hay chưa.
   */
  run: (w?: string) => void;
  runNow: () => void;
  /** Lùi / tiến một số ngày so với mốc đang xem. */
  step: (days: number) => void;
}

/**
 * Yêu cầu tính transit tại một mốc từ NGOÀI khung điều khiển — Lịch Thiên văn
 * Rave bấm vào một thời điểm. `n` tăng mỗi lần để bấm lại đúng mốc cũ vẫn chạy.
 */
export type TransitRequest = { jd: number; n: number } | null;

export function useTransit(chart: RaveChart, request: TransitRequest): TransitState {
  const compute = useCallback((eph: EphemerisProvider, jd: number) => calculateTransitChart(eph, chart, jd), [chart]);
  return useTimeline(compute, request);
}

/**
 * Transit ĐỨNG MỘT MÌNH — bầu trời của một thời điểm, KHÔNG cần chart của ai (giao
 * diện D, Hưng chọn 2026-10-05: thẻ "Bầu trời lúc này" ở màn chào + chế độ transit
 * đầy đủ khi chưa có ngày sinh). Cùng máy trạng thái với `useTransit`; `live` bật
 * sẵn nếu muốn theo dõi "bây giờ".
 */
export function useDayTransit(request: TransitRequest, opts: { live?: boolean } = {}): TransitState<DayChart> {
  return useTimeline(calculateDayChart, request, opts.live ?? false);
}

/**
 * Lõi chung: ô thời gian, tính khi ngừng gõ, ±ngày, Bây giờ, Trực tiếp, mốc từ
 * Lịch. `compute` đổi (chart nền khác) ⇒ tính lại ngay.
 */
function useTimeline<R extends DayChart>(
  compute: (eph: EphemerisProvider, jd: number) => R, request: TransitRequest, liveAtStart = false,
): TransitState<R> {
  const { lang, t } = useLanguage();
  const { mode } = useTimeMode();
  const [when, setWhen] = useState<string>(() => toLocalInput(new Date()));
  const [result, setResult] = useState<R | null>(null);
  const [ut, setUt] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** Lõi: tính transit tại ĐÚNG một khoảnh khắc (Trực tiếp dùng giờ chính xác, không cắt phút). */
  const runAt = useCallback(async (at: Date): Promise<R | null> => {
    setBusy(true); setErr(null);
    try {
      if (Number.isNaN(at.getTime())) throw new Error(`Thời điểm không hợp lệ: ${String(at)}`);
      const eph = await getBrowserEphemeris();
      setUt(at);
      const tc = compute(eph, dateUTToJd(at));
      setResult(tc);
      return tc;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setResult(null);
      return null;
    } finally { setBusy(false); }
  }, [compute]);

  /*
   * ★ TRỰC TIẾP (STATUS §4 B6) — học Live Mode của một ứng dụng tham chiếu: mốc = BÂY GIỜ, tự tính
   *   lại, và báo mỗi khi một thiên thể đổi HÀO. Báo bằng thông báo TRONG TRANG
   *   (`aria-live`), không dùng Notification API: cái đó bắt trình duyệt hỏi quyền,
   *   và ứng dụng tham chiếu cũng chỉ hiện popup trong trang.
   *
   *   Nhịp 30 s: Mặt Trăng — nhanh nhất — đổi hào mỗi ~1.7 giờ, nên trễ tối đa
   *   30 s là đủ; mỗi lần tính chỉ vài mili-giây. So bằng cổng.hào của 13 thiên thể
   *   xác định (cùng bộ với cột), không so ở mức màu/tông.
   */
  const [live, setLiveState] = useState(liveAtStart);
  const [toasts, setToasts] = useState<{ id: number; body: Body; text: string }[]>([]);
  const toastId = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  /*
   * Hẹn giờ "ngừng gõ". MỌI lối tính khác (Enter, ◀ ▶, Bây giờ, Trực tiếp, mốc từ
   * Lịch) phải HUỶ nó trước: không thì gõ xong bấm ▶ ngay, 0.7 s sau hẹn giờ cũ nổ
   * và kéo transit về mốc vừa gõ — kết quả không khớp ô nhập.
   */
  const typing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelTyping = useCallback(() => {
    if (typing.current !== null) { clearTimeout(typing.current); typing.current = null; }
  }, []);
  useEffect(() => cancelTyping, [cancelTyping]);

  /*
   * Mốc do Lịch Thiên văn Rave gửi tới: làm tròn về PHÚT — ô nhập chỉ hiện tới
   * phút, giữ giây thì ô và kết quả lệch nhau mà người dùng không thấy vì sao.
   * Chọn một mốc cụ thể nghĩa là thôi theo dõi "bây giờ" ⇒ tắt Trực tiếp.
   */
  useEffect(() => {
    if (!request) return;
    const at = new Date(Math.round(msOfJd(request.jd) / 60000) * 60000);
    cancelTyping();
    setLiveState(false);
    setWhen(toInput(at, modeRef.current));
    void runAt(at);
  }, [request, runAt, cancelTyping]);

  useEffect(() => {
    if (!live) return;
    cancelTyping();
    let prev: Map<Body, string> | null = null;
    const cells = (tc: R) => new Map(DEFINING_BODIES_STANDARD.map(b => {
      const p = tc.transit.byBody[b]?.position;
      return [b, p ? `${p.gate}.${p.line}` : '—'] as const;
    }));
    const tick = async () => {
      const now = new Date();
      setWhen(toInput(now, modeRef.current));
      const tc = await runAt(now);
      if (!tc) return;
      const cur = cells(tc);
      if (prev) {
        for (const b of DEFINING_BODIES_STANDARD) {
          const from = prev.get(b), to = cur.get(b);
          if (from === to) continue;
          const id = ++toastId.current;
          setToasts(ts => [...ts, { id, body: b, text: t('live.changed', { planet: planetName(b, lang), from: from ?? '—', to: to ?? '—' }) }]);
          setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 15_000);
        }
      }
      prev = cur;
    };
    void tick();
    const timer = setInterval(() => void tick(), 30_000);
    return () => clearInterval(timer);
  }, [live, runAt, t, lang, cancelTyping]);

  /*
   * Đổi công tắc giờ ⇒ viết lại ô nhập theo hệ mới, GIỮ NGUYÊN khoảnh khắc: đang
   * xem 20:49 giờ máy (UTC+7) mà bấm UT thì ô thành 13:49, không phải tính lại
   * transit cho 20:49 UT. Chưa tính lần nào (`ut` null) thì đổi luôn "bây giờ".
   */
  const lastMode = useRef<TimeMode>(mode);
  useEffect(() => {
    if (lastMode.current === mode) return;
    const prev = lastMode.current;
    lastMode.current = mode;
    setWhen(w => {
      const at = fromInput(w, prev);
      return Number.isNaN(at.getTime()) ? w : toInput(at, mode);
    });
  }, [mode]);

  /*
   * Tính ngay lần đầu để người dùng thấy "bây giờ" mà không phải bấm gì.
   * `when` CỐ Ý không nằm trong deps: thêm vào thì mỗi lần gõ vào ô thời gian
   * lại chạy tính một lần. Gõ thì đi qua `edit` (chờ ngừng gõ), không qua đây.
   */
  useEffect(() => {
    /* Chart nền đổi ⇒ transit cũ không còn đúng; tính lại ngay. Trực tiếp bật sẵn thì nó tự tính. */
    if (!liveAtStart) void runAt(fromInput(when, modeRef.current));
    // Chỉ thị phải nằm sát dòng MẢNG DEPS: luật báo lỗi ở đó, không phải ở dòng
    // mở `useEffect(`. Để trên đầu thì nó vô tác dụng và ESLint báo "unused".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compute]);

  const edit = useCallback((w: string) => {
    setWhen(w);
    cancelTyping();
    typing.current = setTimeout(() => {
      typing.current = null;
      const at = fromInput(w, modeRef.current);
      const ms = at.getTime();
      if (Number.isNaN(ms) || ms < AUTO_MIN || ms > AUTO_MAX) return;   // còn gõ dở — chờ tiếp
      void runAt(at);
    }, TYPE_PAUSE_MS);
  }, [runAt, cancelTyping]);
  const run = useCallback((w?: string) => {
    cancelTyping();
    if (w !== undefined) setWhen(w);
    void runAt(fromInput(w ?? when, mode));
  }, [runAt, when, mode, cancelTyping]);
  const runNow = useCallback(() => {
    cancelTyping();
    const n = toInput(new Date(), mode);
    setWhen(n);
    void runAt(fromInput(n, mode));
  }, [runAt, mode, cancelTyping]);
  const step = useCallback((days: number) => {
    cancelTyping();
    const base = fromInput(when, mode);
    if (Number.isNaN(base.getTime())) return;
    const at = new Date(base.getTime() + days * 86400000);
    setWhen(toInput(at, mode));
    void runAt(at);
  }, [runAt, when, mode, cancelTyping]);
  const dismissToast = useCallback((id: number) => setToasts(ts => ts.filter(y => y.id !== id)), []);

  return {
    when, setWhen, result, ut, busy, err, live, setLive: setLiveState, toasts, dismissToast, edit, run, runNow, step,
  };
}

/** Ô thời gian + nút Bây giờ / ±1 ngày / Trực tiếp — đặt NGAY CẠNH biểu đồ. Không có nút Tính: xem `TYPE_PAUSE_MS`. */
export function TransitControls({ s }: { s: TransitState<DayChart> }): JSX.Element {
  const { t } = useLanguage();
  const { mode } = useTimeMode();
  return (
    <div className="space-y-2" data-testid="transit-controls" aria-busy={s.busy}>
      {/*
        Bố cục proposal hướng A, một chỗ lệch: proposal gom "◀ 1 ngày ▶" vào hàng nút
        dưới, nhưng với vùng bấm 44px thì hàng đó cần ~322px trong thẻ 300px (còn
        270px) ⇒ rớt ba hàng. Nên ◀ ▶ đứng HAI BÊN ô ngày giờ — lùi/tiến một ngày
        ngay cạnh chính cái ngày đang xem — còn Bây giờ / Trực tiếp ở hàng dưới.
      */}
      <form className="space-y-1.5" onSubmit={e => { e.preventDefault(); s.run(); }}>
        <div role="group" aria-label={t('transit.stepGroup')} className="flex items-center gap-1.5 max-[359.98px]:flex-wrap">
          <button type="button" className="btn btn-icon" aria-label={t('transit.stepBack')} disabled={s.live}
                  onClick={() => s.step(-1)} data-testid="transit-prev-day"><span aria-hidden="true">◀</span></button>
          {/* Enter bắt ở phím, không trông vào "gửi ngầm" của form: form KHÔNG còn nút
              submit, và trình duyệt xử lý Enter trong `datetime-local` mỗi nơi một kiểu. */}
          <input type="datetime-local" value={s.when} onChange={e => s.edit(e.target.value)}
                 onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); s.run(e.currentTarget.value); } }}
                 aria-label={t('transit.moment')} data-testid="transit-when" disabled={s.live}
                 className="field transit-when min-w-0 flex-1 tabular-nums max-[359.98px]:order-first max-[359.98px]:basis-full" />
          <button type="button" className="btn btn-icon" aria-label={t('transit.stepForward')} disabled={s.live}
                  onClick={() => s.step(1)} data-testid="transit-next-day"><span aria-hidden="true">▶</span></button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className="btn" disabled={s.live} onClick={s.runNow} data-testid="transit-now">
            {t('transit.now')}
          </button>
          <button type="button" onClick={() => s.setLive(v => !v)} aria-pressed={s.live} data-testid="transit-live"
                  className="btn btn-live">
            {t('transit.live')}
          </button>
        </div>
      </form>
      <p className="hint" data-time-mode={mode}>
        {mode === 'ut' ? t('transit.utNote') : t('transit.localNote', { zone: localZone() })}
        {s.ut && (
          <span data-testid="transit-ut">
            {' · '}
            {mode === 'ut'
              ? t('transit.equalsLocal', { local: toLocalInput(s.ut).replace('T', ' '), zone: localZone() })
              : t('transit.equalsUt', { ut: s.ut.toISOString().slice(0, 16).replace('T', ' ') })}
          </span>
        )}
      </p>
      {/* Dòng "Đang theo giờ thật — tự tính lại mỗi 30 giây…" bỏ (Hưng 2026-10-25): nút Trực tiếp đã sáng là đủ. */}
      {s.err && <Notice tone="danger" testId="transit-error">{s.err}</Notice>}

      {/* Thông báo đổi hào khi Trực tiếp — góc dưới phải, đọc được bằng trình đọc màn hình. */}
      <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {s.toasts.map(x => (
          <div key={x.id} data-testid="live-toast" data-body={x.body}
               className="flex items-center gap-2 rounded-xl bg-ink py-1 pl-4 pr-1 text-sm text-white shadow-lg">
            <span><PlanetGlyph body={x.body} className="mr-1.5" />{x.text}</span>
            <button type="button" aria-label={t('live.dismiss')}
                    className="btn btn-icon btn-ghost text-white hover:bg-white/10 focus-visible:outline-white!"
                    onClick={() => s.dismissToast(x.id)}><Icon name="close" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Kênh / trung tâm transit thêm vào chart người, nhóm theo từ vựng chu kỳ. */
export function TransitResults({ result }: { result: TransitChart | null }): JSX.Element | null {
  const { lang, t } = useLanguage();
  if (!result) return null;
  const pairs = (list: readonly { id: number; gates: readonly number[] }[]) => list
    .map(c => ({ id: c.id, pair: [...c.gates].sort((a, b) => a - b) }))
    .sort((x, y) => x.pair[0]! - y.pair[0]! || x.pair[1]! - y.pair[1]!);
  /* Hai THẺ như mockup hướng A: "transit nối thêm" và "mọi kênh của chart ghép". */
  return (
    <>
    <section className="card px-5 py-4">
      <div data-testid="transit-new-channels">
        <h3 className="card-heading mb-2.5">{t('transit.newChannels', { n: result.newChannels.length })}</h3>
        {result.newChannels.length === 0 ? (
          <p className="text-ui text-ink-2">{t('transit.nothingNew')}</p>
        ) : (
          /* Sắp cổng tăng dần: bảng CHANNELS ghi lẫn `20-10` và `10-57`, hiện
             thô thì người đọc tưởng hai quy ước khác nhau. */
          <ul className="flex flex-wrap gap-1.5">
            {pairs(result.newChannels).map(c => (
              <li key={c.id} className="rounded-lg bg-sunken px-2.5 py-1 text-sm font-semibold tabular-nums" data-transit-channel={c.pair.join('-')}>{c.pair.join('–')}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Proposal: một dòng "Trung tâm mới: …" ngay dưới các kênh, tên gọn (không "Trung tâm "). */}
      <p className="mt-2.5 text-ui text-ink-2" data-testid="transit-new-centers">
        {result.newCenters.size
          ? t('transit.newCenters', { list: [...result.newCenters].map(c => centerShortName(c, lang)).join(' · ') })
          : t('transit.newCenters', { list: '—' })}
      </p>
    </section>
    <section className="card px-5 py-4">
      {/*
        ★ MỌI kênh của bản chồng, NHÓM theo từ vựng chu kỳ như ứng dụng tham chiếu (STATUS §4
        E2): Thoả hiệp · Kết nối cá nhân · Học hỏi · Bẩm sinh. Nhóm rỗng thì
        ẩn. Luật phân nhóm ở `calc-core/rave/transit.ts` (`channels`).
      */}
      <div data-testid="transit-channels">
        <h3 className="card-heading mb-1">{t('transit.channels', { n: result.channels.length })}</h3>
        {/* Proposal: nhãn nhóm bên trái, các cặp kênh ĐẬM bên phải nối bằng " · ". */}
        <dl className="text-sm">
          {CYCLE_COMPOSITION_STATES.filter(st => result.counts[st] > 0).map(st => (
            <div key={st} className="flex flex-wrap items-baseline justify-between gap-x-3 border-t border-line py-2 first:border-t-0" data-transit-group={st}>
              <dt>{t(`cycleState.${st}` as UiKey)}</dt>
              <dd>
                <ul className="flex flex-wrap justify-end font-semibold tabular-nums">
                  {pairs(result.channels.filter(c => c.state === st).map(c => c.channel)).map((c, i) => (
                    <li key={c.id} data-transit-all-channel={c.pair.join('-')} data-transit-state={st}>
                      {i > 0 && <span aria-hidden="true" className="font-normal text-ink-3">&nbsp;·&nbsp;</span>}
                      {c.pair.join('–')}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
        <p className="hint mt-2">{t('transit.channelsNote')}</p>
      </div>
    </section>
    </>
  );
}
