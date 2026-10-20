'use client';
/**
 * Form nhập ngày/giờ/múi giờ — SPEC §10.2.
 *
 * Ghi chú phạm vi: biểu đồ Rave **không phụ thuộc kinh độ/vĩ độ** (calc-core chỉ
 * nhận UT; HD dùng kinh độ hoàng đạo địa tâm). Nơi sinh chỉ có tác dụng suy ra
 * MÚI GIỜ. Vì vậy chọn thẳng múi giờ là đủ để tính đúng, và app chạy được hoàn
 * toàn offline, không cần API key. Ô tra nơi sinh (`PlaceSearch`, STATUS §4 B1)
 * chỉ là đường tắt để ĐIỀN múi giờ — cũng offline, dữ liệu GeoNames tự host.
 *
 * ★ Đổi 2026-09-25 (audit F9, F10):
 *   - Nơi sinh là lối CHÍNH; bộ chọn 419 múi giờ thu vào "Chỉnh múi giờ" — nó
 *     vẫn nguyên đó (lọc, chọn tay, offset theo ngày sinh), chỉ không còn chiếm
 *     nửa form khi người dùng không cần. Múi giờ đang dùng LUÔN hiện một dòng.
 *   - `noValidate`: lỗi hiện dưới ĐÚNG ô, bằng ngôn ngữ của app, nối bằng
 *     `aria-describedby`. Trước đây `required` để trình duyệt chặn bằng bong
 *     bóng gốc — ngôn ngữ theo TRÌNH DUYỆT, không theo công tắc của app — và
 *     thông báo lỗi của app gần như không bao giờ hiện.
 */
import { useEffect, useId, useMemo, useRef, useState, type JSX } from 'react';
import { canonicalZone, isValidZone, listTimeZones, zoneLabel } from '../../lib/place/timezones';
import { resolveUT, type UTResolution } from '../../lib/time/resolveUT';
import { useT } from '../../i18n/ui/LanguageProvider';
import { deviceZone } from '../time-mode/format';
import { PlaceSearch } from './PlaceSearch';
import { DateField } from './DateField';
import { parseTimeInput } from '../../lib/birth-input';
import { Icon } from '../ui/Icon';
import { Notice } from '../ui/Notice';
import { useMedia } from '../workspace/ChartCanvas';
import { PUBLIC_EDITION } from '../../lib/edition';

/**
 * Múi giờ đang dùng lấy từ đâu.
 *
 * ★ Hưng chốt 2026-09-28 (phương án c): trước đây chưa chọn nơi sinh thì múi giờ
 *   mặc định là `Atlantic/Reykjavik` (UTC+0, của chart thử G01) — người ở Việt Nam
 *   chỉ nhập ngày giờ rồi bấm là ra chart LỆCH 7 GIỜ mà không ai báo. Nay mặc định
 *   là múi giờ của MÁY, và khi còn đang dùng nó thì form nói rõ ra (không chặn).
 *   Chọn nơi sinh hoặc chọn tay trong "Chỉnh múi giờ" thì thôi nhắc.
 */
type ZoneSource = 'device' | 'place' | 'manual';

/** Chỉ đặt trước khi mount: HTML dựng lúc build không được biết múi giờ của máy người dùng. */
const SSR_ZONE = 'UTC';

export interface BirthFormValue {
  date: string;   // yyyy-mm-dd
  time: string;   // HH:mm
  zone: string;
  /** Nơi sinh đã chọn trong ô tra — chỉ để hiển thị, KHÔNG tham gia tính toán. */
  place?: string;
  /** Họ tên (không bắt buộc) — tên gợi ý khi lưu vào Kho và dòng danh tính; KHÔNG tham gia tính toán. */
  name?: string;
}

export interface BirthFormProps {
  initial?: Partial<BirthFormValue>;
  /** Gọi khi đã có UT chắc chắn (không còn mơ hồ). */
  onResolved: (utcDate: Date, value: BirthFormValue, resolution: UTResolution) => void;
  /** Gọi khi phát hiện mơ hồ — trang cha mở AmbiguityDialog. */
  onAmbiguous: (resolution: UTResolution, value: BirthFormValue) => void;
  busy?: boolean;
  /** Đưa focus vào ô ngày ngay khi hiện (form mở từ nút "Chart mới"). */
  autoFocus?: boolean;
  /**
   * Form ở MÀN CHÀO (chưa có chart). Điện thoại (giao diện D, mockup M1): các ô trong
   * MỘT thẻ trắng, "Nơi sinh tự điền múi giờ · Chỉnh múi giờ" là dòng gợi ý, nút
   * "Lập biểu đồ" 54px GHIM đáy màn. Form trong ngăn kéo (đã có chart) giữ kiểu thường.
   */
  welcome?: boolean;
  /**
   * Điền sẵn từ LINK (`lib/birth-link.ts`, `app/page.tsx`) khi chưa đủ để lập ngay: ô nào sai thì báo
   * dưới ô đó; nơi sinh gõ tự do hiện trong ô tra. `submit` = ngày giờ đã đúng ⇒
   * chọn nơi xong là lập luôn (người dùng đã bấm lập ở website rồi).
   */
  link?: {
    placeQuery?: string;
    /** Mở sẵn danh sách nơi khớp `placeQuery` (chưa chọn được một nơi chắc chắn). */
    placeOpen: boolean;
    errors: { date?: true; time?: true; place?: 'missing' | 'pick' };
    submit: boolean;
  };
}

const parse = (v: BirthFormValue) => {
  const [y, mo, d] = v.date.split('-').map(Number);
  const [h, mi] = v.time.split(':').map(Number);
  return { year: y!, month: mo!, day: d!, hour: h!, minute: mi! };
};

interface FieldErr { date?: string; time?: string; zone?: string; place?: string }

export function BirthForm({ initial, onResolved, onAmbiguous, busy, autoFocus, welcome = false, link }: BirthFormProps): JSX.Element {
  const t = useT();
  const compact = useMedia('(max-width: 639.98px)') && welcome;
  const uid = useId();
  const [value, setValue] = useState<BirthFormValue>({
    date: initial?.date ?? '1985-06-15',
    time: initial?.time ?? '12:00',
    zone: initial?.zone ?? SSR_ZONE,
    ...(initial?.place ? { place: initial.place } : {}),
    ...(initial?.name ? { name: initial.name } : {}),
  });
  const [zoneSource, setZoneSource] = useState<ZoneSource>(
    initial?.place ? 'place' : initial?.zone ? 'manual' : 'device');
  /*
   * Múi giờ máy đọc SAU khi mount (cùng lý do `icuReady` bên dưới). Đi qua
   * `canonicalZone` — Chromium báo `Asia/Saigon`, danh sách dùng `Asia/Ho_Chi_Minh` —
   * và `isValidZone` (ICU + backzone tzdb của `lib/time/zones.ts`).
   */
  useEffect(() => {
    if (zoneSource !== 'device') return;
    const z = canonicalZone(deviceZone());
    setValue(prev => ({ ...prev, zone: isValidZone(z) ? z : SSR_ZONE }));
    // Chỉ lúc mount: chọn nơi sinh / chọn tay sau đó thì không được ghi đè.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /** Nước của nơi vừa chọn — để hiện ghi chú riêng cho Việt Nam. */
  const [placeCountry, setPlaceCountry] = useState<string | null>(null);
  const [zoneQuery, setZoneQuery] = useState('');
  const [zoneOpen, setZoneOpen] = useState(false);
  const [err, setErr] = useState<FieldErr>(() => ({
    ...(link?.errors.date ? { date: t('form.errDate') } : {}),
    ...(link?.errors.time ? { time: t('form.errTime') } : {}),
    ...(link?.errors.place ? { place: t(link.errors.place === 'pick' ? 'form.errPlacePick' : 'form.errPlaceMissing') } : {}),
  }));
  const dateRef = useRef<HTMLInputElement>(null);
  /** Chữ trong ô giờ — `value.time` chỉ nhận khi đã thành `HH:MM`. */
  const [timeText, setTimeText] = useState(value.time);

  useEffect(() => { if (autoFocus) dateRef.current?.focus(); }, [autoFocus]);

  const zones = useMemo(() => listTimeZones(), []);

  /**
   * ★ Offset chỉ được vẽ SAU KHI mount — sửa lỗi hydration 2026-09-22.
   *
   * `zoneLabel()` lấy offset qua luxon, mà luxon lấy qua `Intl`, tức qua **bản
   * tz database của NỀN TẢNG**. Trang này prerender tĩnh lúc build bằng ICU của
   * Node, rồi hydrate bằng ICU của trình duyệt. Hai bản tz database lệch nhau ở
   * dù chỉ MỘT trong 300 vùng đang vẽ là React ném lỗi #418 (text server ≠ text
   * client) và toàn bộ cây bị dựng lại.
   *
   * Lỗi này KHÔNG lộ trên Chromium/Firefox lẫn WebKit-macOS; nó chỉ đỏ ở
   * WebKit-Linux trên CI (run 35634142507). Tức nó là lỗi thật với người dùng
   * Safari, không phải chuyện riêng của CI.
   *
   * Vì sao vẽ sau mount mới đúng chứ không chỉ là né: chính client mới là nơi
   * thực hiện phép tính UT thật (`lib/time/resolveUT.ts` cũng chạy trên luxon
   * của client). Offset hiển thị phải khớp với bản tz database SẼ được dùng để
   * tính, nên giá trị của client mới là giá trị đúng — giá trị của máy build
   * chỉ là phỏng đoán.
   */
  const [icuReady, setIcuReady] = useState(false);
  useEffect(() => { setIcuReady(true); }, []);

  /** Mốc để hiện offset: chính ngày sinh đang nhập. */
  const refMs = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.date);
    return m ? Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, 12) : Date.UTC(2000, 0, 1, 12);
  }, [value.date]);
  const filtered = useMemo(() => {
    const q = zoneQuery.trim().toLowerCase();
    const base = (q ? zones.filter(z => z.toLowerCase().includes(q)) : zones).slice(0, 300);
    // Vùng đang chọn phải LUÔN có trong danh sách: chọn nơi sinh ở châu Âu/Thái
    // Bình Dương đặt vùng nằm ngoài 300 dòng đầu, `<select>` sẽ hiện sai.
    return base.includes(value.zone) ? base : [value.zone, ...base];
  }, [zones, zoneQuery, value.zone]);

  const set = <K extends keyof BirthFormValue>(k: K, v: BirthFormValue[K]) => {
    setValue(prev => ({ ...prev, [k]: v }));
    setErr(e => ({ ...e, [k]: undefined }));
  };

  function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    trySubmit(value);
  }

  function trySubmit(value: BirthFormValue) {
    const next: FieldErr = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date)) next.date = t('form.errDate');
    if (!/^\d{2}:\d{2}$/.test(value.time)) next.time = t('form.errTime');
    setErr(next);
    if (next.date) { dateRef.current?.focus(); return; }
    if (next.time) { document.getElementById(`${uid}-time`)?.focus(); return; }
    let r: UTResolution;
    try {
      r = resolveUT({ localDateTime: parse(value), ianaZone: value.zone });
    } catch (ex) {
      setErr({ zone: ex instanceof Error ? ex.message : String(ex) });
      setZoneOpen(true);
      return;
    }
    if (r.ambiguity !== 'none') { onAmbiguous(r, value); return; }
    onResolved(r.utcDate, value, r);
  }

  const errText = (id: string, m?: string) => m && (
    <p id={id} className="field-error" data-testid="form-error">{m}</p>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-4" data-testid="birth-form" data-ready={icuReady}>
      <div className={compact ? 'space-y-3.5 rounded-[1.125rem] bg-surface p-[1.125rem] shadow-card' : 'space-y-4'}>
      {/* Họ tên (Hưng 2026-09-30): không bắt buộc, không vào phép tính — chỉ đặt tên gợi ý khi lưu và dòng danh tính. */}
      <div>
        <label className="label" htmlFor={`${uid}-name`}>{t('form.name')}</label>
        <input id={`${uid}-name`} type="text" value={value.name ?? ''} autoComplete="name"
               placeholder={t(compact ? 'form.namePlaceholderShort' : 'form.namePlaceholder')} className="field" data-testid="input-name"
               onChange={e => setValue(prev => ({ ...prev, name: e.target.value }))} />
      </div>
      {/*
        ★ iPhone (Hưng báo 2026-09-30, ảnh Safari iOS): ô ngày và ô giờ từng ĐÈ lên nhau, tràn mép phải
          (ô date/time GỐC của iOS tự đòi bề ngang tối thiểu) ⇒ `min-w-0` cho ô lưới.
        ★ Từ 2026-10-20 (Hưng chốt, giống form trang chủ humandesign.vn) hai ô là ô CHỮ: ngày gõ `dd/mm/yyyy`
          + lịch theo ngôn ngữ của APP (`DateField`), giờ MỘT ô `hh:mm` 24 giờ (nhận 5:30 / 5h30 / 0530).
          Ô gốc của trình duyệt theo ngôn ngữ TRÌNH DUYỆT (máy tiếng Anh ⇒ "October", AM/PM).
          `value.date` / `value.time` vẫn là `YYYY-MM-DD` / `HH:MM` (`''` khi chữ đang gõ chưa hợp lệ).
      */}
      <div className={`grid gap-3 ${compact ? 'grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]' : 'grid-cols-2'}`}>
        <div className="min-w-0">
          <label className="label" htmlFor={`${uid}-date`}>{t('form.birthDate')}</label>
          <DateField id={`${uid}-date`} inputRef={dateRef} value={value.date} onChange={iso => set('date', iso)}
                     invalid={!!err.date} describedBy={err.date ? `${uid}-date-err` : undefined} />
          {errText(`${uid}-date-err`, err.date)}
        </div>
        <div className="min-w-0">
          <label className="label" htmlFor={`${uid}-time`}>{t(compact ? 'form.birthTimeShort' : 'form.birthTime')}</label>
          <input id={`${uid}-time`} type="text" inputMode="numeric" maxLength={5} value={timeText}
                 placeholder={t('form.timePlaceholder')} title={t('form.timeHint')}
                 onChange={e => { setTimeText(e.target.value); set('time', parseTimeInput(e.target.value) ?? ''); }}
                 onBlur={() => { const v = parseTimeInput(timeText); if (v) setTimeText(v); }}
                 className="field tabular-nums" data-testid="input-time"
                 aria-invalid={!!err.time} aria-describedby={err.time ? `${uid}-time-err` : `${uid}-time-hint`} />
          <span id={`${uid}-time-hint`} hidden>{t('form.timeHint')}</span>
          {errText(`${uid}-time-err`, err.time)}
        </div>
      </div>

      <div>
        <span className="label">{t('form.place')}</span>
        <PlaceSearch className="field" short={compact}
          initialQuery={link?.placeQuery} initialOpen={!!link?.placeOpen}
          onPick={(p, label) => {
            const next = { ...value, zone: p.ianaZone, place: label };
            setValue(next);
            setZoneSource('place');
            setPlaceCountry(p.countryCode);
            setZoneQuery('');
            setErr({});
            if (link?.submit) trySubmit(next);
          }} />
        {errText(`${uid}-place-err`, err.place)}
        {/* Bản công khai bỏ đoạn giải thích múi giờ VN (Hưng 2026-10-15, STATUS §5 #68) — chỉ CHỮ;
            luật gán vùng `lib/place/zone-fixes.ts` giữ nguyên. */}
        {!PUBLIC_EDITION && placeCountry === 'VN' && (
          <p className="hint mt-1" data-testid="place-vn-note">{t('form.placeVn')}</p>
        )}
      </div>

      {/*
        ★ Múi giờ THU GỌN (Hưng 2026-09-30: "tạm ẩn múi giờ nơi sinh cho gọn form"):
          chỉ còn nút "Chỉnh múi giờ"; dòng múi giờ đang dùng và lời nhắc "chưa chọn nơi
          sinh" nằm TRONG phần mở ra. Mặc định vẫn là múi giờ MÁY (§5 #43), chọn nơi sinh
          thì theo nơi sinh — chỉ là không còn hiện sẵn.
      */}
      <div className={compact ? '!mt-1' : ''}>
        {compact ? (
          /* Mockup M1: một dòng gợi ý, "Chỉnh múi giờ" là liên kết đậm (vùng bấm vẫn 44px). */
          <p className="hint flex flex-wrap items-center gap-x-1 text-ui">
            {t('form.zoneAuto')} ·
            <button type="button" className="inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-2"
                    aria-expanded={zoneOpen} aria-controls={`${uid}-zone`} onClick={() => setZoneOpen(o => !o)} data-testid="zone-toggle">
              {t('form.zoneEdit')}
            </button>
          </p>
        ) : (
          <button type="button" className="btn btn-ghost -ml-2" aria-expanded={zoneOpen}
                  aria-controls={`${uid}-zone`} onClick={() => setZoneOpen(o => !o)} data-testid="zone-toggle">
            {t('form.zoneEdit')}<Icon name="chevronDown" size={16} className={zoneOpen ? 'rotate-180' : ''} />
          </button>
        )}
        <div id={`${uid}-zone`} hidden={!zoneOpen} className="mt-2 space-y-2 rounded-lg border border-line bg-subtle p-3">
          <p className="min-w-0 text-sm">
            <span className="text-ink-2">{t('form.zone')}: </span>
            <strong className="break-words font-medium" data-testid="zone-current">
              {icuReady ? zoneLabel(value.zone, refMs) : value.zone}
            </strong>
          </p>
          {zoneSource === 'device' && icuReady && (
            <Notice tone="warn" testId="zone-device-note">{t('form.zoneFromDevice')}</Notice>
          )}
          <p className="hint">{t('form.zoneHint')}</p>
          <input type="search" value={zoneQuery} onChange={e => setZoneQuery(e.target.value)}
                 placeholder={t('form.zoneFilter')} aria-label={t('form.zoneFilter')}
                 className="field" data-testid="zone-filter" />
          <select value={value.zone} onChange={e => { set('zone', e.target.value); setZoneSource('manual'); }}
                  className="field h-auto" size={6} data-testid="zone-select" aria-label={t('form.zone')}
                  aria-describedby="zone-status" aria-invalid={!!err.zone}>
            {filtered.map(z => (
              <option key={z} value={z}>{icuReady ? zoneLabel(z, refMs) : z}</option>
            ))}
          </select>
          {/* aria-live: lọc xong thì trình đọc báo còn bao nhiêu kết quả */}
          <span id="zone-status" role="status" aria-live="polite" className="hint block">
            {t('form.zoneSelected')} <strong className="text-ink-2">{value.zone}</strong>
            {' · '}{zoneQuery.trim()
              ? t('form.zoneMatches', { n: filtered.length, q: zoneQuery.trim() })
              : t('form.zoneCount', { n: zones.length })}
          </span>
        </div>
        {errText(`${uid}-zone-err`, err.zone)}
      </div>
      </div>

      {/* Điện thoại (giao diện D, mockup M1): nút 54px GHIM đáy — `sticky` trong khung cuộn của
          form (trang chào hay ngăn kéo), trên vùng an toàn của thanh home. */}
      {/* Nhúng (mockup D Hưng duyệt 2026-10-13): KHÔNG ghim — trong iframe cao bằng nội dung, đáy khung nhìn
          là đáy iframe. Nút nằm ngay cuối form. */}
      <div className={`${compact
        ? 'fixed inset-x-0 bottom-0 z-20 bg-linear-to-t from-page from-70% px-4 pt-3 pb-[max(.75rem,env(safe-area-inset-bottom))]'
        : `max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-5 max-sm:bg-linear-to-t max-sm:from-surface max-sm:from-70%
           max-sm:px-5 max-sm:pt-3 max-sm:pb-[max(.75rem,env(safe-area-inset-bottom))]`} embed:static! embed:mx-0! embed:bg-none! embed:p-0! embed:pt-1!`}>
        <button type="submit" disabled={busy} aria-busy={busy} data-testid="submit"
                className="btn btn-primary min-h-12 w-full rounded-xl text-base font-semibold max-sm:min-h-[3.375rem] max-sm:rounded-2xl max-sm:text-[length:var(--text-input-touch)]">
          {busy && <span aria-hidden="true" className="spinner" />}
          {busy ? t('form.submitBusy') : t('form.submit')}
        </button>
      </div>

      {/* Dòng ghi công GeoNames dưới nút đã BỎ khỏi form (Hưng 2026-10-05). Ghi công CC-BY
          vẫn ở NOTICE.md — app dùng nội bộ, sau mật khẩu (quyết định D1). */}
    </form>
  );
}
