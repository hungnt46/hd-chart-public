'use client';
/**
 * Ô ngày sinh: GÕ `dd/mm/yyyy` + nút mở LỊCH tự vẽ theo ngôn ngữ của APP (Hưng chốt 2026-10-20, giống form
 * trang chủ humandesign.vn). Thay `<input type="date">` — lịch gốc theo ngôn ngữ TRÌNH DUYỆT (máy tiếng
 * Anh ⇒ "October", "Mon" dù app đang tiếng Việt), và chọn năm sinh xa thì phải lật từng tháng.
 *
 * Lịch: chọn nhanh Tháng/Năm, hàng T2…CN (tuần bắt đầu thứ Hai), ô trống thì mở sẵn tháng 1 năm 1990 (giữa
 * khoảng năm sinh hay gặp). Bàn phím theo mẫu "Date Picker Dialog" của WAI-ARIA APG: mũi tên ±1 ngày / ±1
 * tuần, PageUp/PageDown ±1 tháng (Shift: ±1 năm), Home/End đầu/cuối tuần, Enter/Space chọn, Esc đóng và
 * trả focus về nút lịch; Tab đi vòng trong hộp (hộp modal).
 *
 * Giá trị ra ngoài LUÔN là `YYYY-MM-DD` (hoặc `''` khi chữ đang gõ chưa thành ngày) — kho chart, link và
 * e2e không đổi. Chữ trong ô do component giữ; rời ô thì viết lại cho gọn (`5/6/1985` ⇒ `05/06/1985`).
 */
import { useEffect, useId, useRef, useState, type JSX, type KeyboardEvent, type Ref } from 'react';
import { useT } from '../../i18n/ui/LanguageProvider';
import { Icon } from '../ui/Icon';
import { Select } from '../ui/Select';
import { MIN_YEAR, daysInMonth, formatDateInput, parseDateInput, shiftDay, weekdayMon0 } from '../../lib/birth-input';

/** Tháng mở sẵn khi ô còn trống. */
const DEFAULT_VIEW = { y: 1990, m: 1, d: 1 };

interface Day { y: number; m: number; d: number }
const isoToDay = (iso: string): Day | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? { y: +m[1]!, m: +m[2]!, d: +m[3]! } : null;
};

export interface DateFieldProps {
  id: string;
  /** `YYYY-MM-DD` hoặc `''`. */
  value: string;
  onChange: (iso: string) => void;
  inputRef?: Ref<HTMLInputElement>;
  invalid?: boolean;
  describedBy?: string;
}

export function DateField({ id, value, onChange, inputRef, invalid, describedBy }: DateFieldProps): JSX.Element {
  const t = useT();
  const [text, setText] = useState(() => formatDateInput(value));
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<Day>(DEFAULT_VIEW);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  /** Lần vẽ tới có đưa focus vào ô ngày đang trỏ không (đổi Tháng/Năm bằng ô chọn thì KHÔNG — giữ focus ở ô chọn). */
  const moveFocus = useRef(false);
  const dialogId = useId();

  // Giá trị đổi từ NGOÀI (chọn trong lịch, form đặt lại) ⇒ viết lại chữ. Đang gõ dở (`value` rỗng) thì để yên.
  useEffect(() => {
    if (value && parseDateInput(text) !== value) setText(formatDateInput(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open || !moveFocus.current) return;
    moveFocus.current = false;
    dialog.current?.querySelector<HTMLButtonElement>('button[tabindex="0"][data-day]')?.focus();
  }, [open, focus]);

  const picked = isoToDay(value);
  /** Năm cuối của ô chọn Năm: năm nay, hoặc năm đã gõ nếu xa hơn (ô gõ nhận tới 2399). */
  const maxYear = Math.max(new Date().getFullYear(), picked?.y ?? 0);
  const months = t('form.calMonths').split(',');
  const monthsShort = t('form.calMonthsShort').split(',');
  const wdShort = t('form.calWeekdays').split(',');
  const wdNames = t('form.calWeekdayNames').split(',');

  const openCal = () => {
    setFocus(picked ?? DEFAULT_VIEW);
    moveFocus.current = true;
    setOpen(true);
  };
  const closeCal = (returnFocus: boolean) => { setOpen(false); if (returnFocus) btn.current?.focus(); };
  const choose = (d: Day) => {
    const iso = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    setText(formatDateInput(iso));
    onChange(iso);
    closeCal(true);
  };
  /** `toDay = false`: nút ‹ › — focus ở lại trên nút như APG, chỉ đổi tháng đang xem. */
  const move = (dd: number, dm: number, toDay = true) => {
    const n = shiftDay(focus, dd, dm, maxYear);
    if (n) { moveFocus.current = toDay; setFocus(n); }
  };
  const setView = (y: number, m: number) => setFocus(f => ({ y, m, d: Math.min(f.d, daysInMonth(y, m)) }));

  const onGridKey = (e: KeyboardEvent<HTMLTableElement>) => {
    if (!(e.target as HTMLElement).dataset.day) return;
    const dow = weekdayMon0(focus.y, focus.m, focus.d);
    const k: Record<string, () => void> = {
      ArrowLeft: () => move(-1, 0), ArrowRight: () => move(1, 0), ArrowUp: () => move(-7, 0), ArrowDown: () => move(7, 0),
      PageUp: () => move(0, e.shiftKey ? -12 : -1), PageDown: () => move(0, e.shiftKey ? 12 : 1),
      Home: () => move(-dow, 0), End: () => move(6 - dow, 0),
    };
    const f = k[e.key];
    if (f) { e.preventDefault(); f(); }
  };
  const onDialogKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeCal(true); return; }
    if (e.key !== 'Tab') return;
    // Hộp modal: Tab / Shift+Tab đi vòng trong hộp.
    const items = [...dialog.current!.querySelectorAll<HTMLElement>('select, button:not([tabindex="-1"])')];
    const first = items[0], last = items.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  };

  // Lưới tháng đang xem: ô trống đầu tháng, rồi các ngày, cắt theo hàng 7.
  const lead = weekdayMon0(focus.y, focus.m, 1);
  const n = daysInMonth(focus.y, focus.m);
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
  const years = Array.from({ length: maxYear - MIN_YEAR + 1 }, (_, i) => maxYear - i);
  const vars = { month: months[focus.m - 1]!, y: focus.y };

  const navBtn = 'grid size-9 shrink-0 place-items-center rounded-lg text-ink hover:bg-sunken max-sm:size-11';

  return (
    <div ref={wrap} className="relative">
      <input id={id} ref={inputRef} type="text" inputMode="numeric" autoComplete="bday" maxLength={10}
             placeholder={t('form.datePlaceholder')} value={text}
             onChange={e => { setText(e.target.value); onChange(parseDateInput(e.target.value) ?? ''); }}
             onBlur={() => { const iso = parseDateInput(text); if (iso) setText(formatDateInput(iso)); }}
             className="field pr-11 tabular-nums" data-testid="input-date"
             aria-invalid={invalid} aria-describedby={describedBy} />
      <button ref={btn} type="button" onClick={() => (open ? closeCal(false) : openCal())}
              aria-label={t('form.calOpen')} aria-haspopup="dialog" aria-expanded={open} aria-controls={dialogId}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-ink-2 hover:text-ink"
              data-testid="date-picker-toggle">
        <Icon name="calendar" />
      </button>
      {open && (
        <div ref={dialog} id={dialogId} role="dialog" aria-modal="true" aria-label={t('form.calDialog')}
             onKeyDown={onDialogKey} data-testid="date-picker"
             className="absolute left-0 top-[calc(100%+.25rem)] z-30 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-3 shadow-card">
          <div className="mb-2 flex items-center gap-1.5">
            <button type="button" className={navBtn} aria-label={t('form.calPrev')} onClick={() => move(0, -1, false)}
                    data-testid="date-picker-prev"><Icon name="chevronRight" size={18} className="rotate-180" /></button>
            <Select className="min-w-0 flex-[1.35]" selectClassName="pl-2 pr-7" aria-label={t('form.calMonth')} value={focus.m}
                    onChange={e => setView(focus.y, +e.target.value)} data-testid="date-picker-month">
              {monthsShort.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
            </Select>
            <Select className="min-w-0 flex-1" selectClassName="pl-2 pr-7" aria-label={t('form.calYear')} value={focus.y}
                    onChange={e => setView(+e.target.value, focus.m)} data-testid="date-picker-year">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
            <button type="button" className={navBtn} aria-label={t('form.calNext')} onClick={() => move(0, 1, false)}
                    data-testid="date-picker-next"><Icon name="chevronRight" size={18} /></button>
          </div>
          <table role="grid" aria-label={t('form.calGrid', vars)} onKeyDown={onGridKey}
                 className="w-full table-fixed border-collapse text-center">
            <thead>
              <tr>{wdShort.map((w, i) => (
                <th key={i} scope="col" abbr={wdNames[i]} className="pb-1 text-caption font-medium text-ink-3">{w}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>{row.map((d, c) => {
                  if (d === null) return <td key={c} />;
                  const on = !!picked && picked.y === focus.y && picked.m === focus.m && picked.d === d;
                  return (
                    <td key={c} aria-selected={on}>
                      <button type="button" data-day={d} tabIndex={d === focus.d ? 0 : -1}
                              aria-label={t('form.calDay', { ...vars, wd: wdNames[c]!, d })}
                              onClick={() => choose({ y: focus.y, m: focus.m, d })}
                              className={`h-10 w-full rounded-lg text-ui tabular-nums max-sm:h-11 ${on
                                ? 'bg-ink font-semibold text-surface' : 'text-ink hover:bg-sunken'}`}>
                        {d}
                      </button>
                    </td>
                  );
                })}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
