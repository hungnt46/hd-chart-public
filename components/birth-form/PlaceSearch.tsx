'use client';
/**
 * Ô tra nơi sinh — STATUS §4 B1. Chọn một nơi ⇒ điền MÚI GIỜ cho form; bộ chọn
 * múi giờ bên dưới vẫn còn để sửa tay (ca biên giới, hay khi không tìm thấy).
 *
 * Dữ liệu offline (GeoNames, `lib/place/`), chỉ tải khi người dùng bắt đầu gõ. Tải,
 * tách và tìm đều chạy trong Web Worker (`place-client.ts`, 2026-10-06) — trước đó
 * tách 171 nghìn dòng chặn luồng chính ~0.8 s ngay lúc người dùng đang gõ.
 * Mẫu ARIA combobox 1.2: focus ở lại ô nhập, mũi tên đi qua danh sách bằng
 * `aria-activedescendant`, Enter chọn, Esc đóng.
 */
import { Icon } from '../ui/Icon.js';
import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { findPlaces, loadPlaceIndex } from '../../lib/place/place-client';
import { MIN_QUERY_LENGTH, type PlaceCandidate } from '../../lib/place/places';
import { useLanguage } from '../../i18n/ui/LanguageProvider';

export interface PlaceSearchProps {
  onPick: (place: PlaceCandidate, label: string) => void;
  className: string;
  /** Gợi ý ngắn (màn chào điện thoại, mockup M1). */
  short?: boolean;
}

type Status = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Tên nước theo ngôn ngữ giao diện. Chỉ gọi SAU khi người dùng gõ (không có ở
 * lượt render phía server) nên `Intl` ở đây không gây lệch hydration.
 */
function useCountryName(lang: string): (c: PlaceCandidate) => string {
  return useMemo(() => {
    let dn: Intl.DisplayNames | null = null;
    try { dn = new Intl.DisplayNames([lang], { type: 'region' }); } catch { /* trình duyệt cũ */ }
    return (c: PlaceCandidate) => {
      try { return dn?.of(c.countryCode) ?? c.country; } catch { return c.country; }
    };
  }, [lang]);
}

export function placeLabel(c: PlaceCandidate, country: string): string {
  return [c.name, c.admin && c.admin !== c.name ? c.admin : '', country].filter(Boolean).join(', ');
}

export function PlaceSearch({ onPick, className, short = false }: PlaceSearchProps): JSX.Element {
  const { lang, t } = useLanguage();
  const countryName = useCountryName(lang);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const mounted = useRef(true);
  // Đặt lại `true` trong thân effect — Strict Mode gắn lại thì ref không kẹt `false`.
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const ensureLoaded = () => {
    if (status === 'ready' || status === 'loading') return;
    setStatus('loading');
    loadPlaceIndex().then(
      () => { if (mounted.current) setStatus('ready'); },
      () => { if (mounted.current) setStatus('error'); },
    );
  };

  /* Tìm trong worker; chỉ nhận kết quả của lần gõ MỚI NHẤT (gõ nhanh thì câu trả lời cũ về sau). */
  const latest = useRef(0);
  useEffect(() => {
    if (status !== 'ready') return;
    const n = ++latest.current;
    findPlaces(query).then(
      r => { if (mounted.current && n === latest.current) setResults(r); },
      () => { if (mounted.current && n === latest.current) setResults([]); },
    );
  }, [query, status]);
  const showList = open && results.length > 0;

  const pick = (c: PlaceCandidate) => {
    const label = placeLabel(c, countryName(c));
    setQuery(label);
    setOpen(false);
    onPick(c, label);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault(); setOpen(true); setActive(a => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault(); setOpen(true); setActive(a => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && showList) {
      // Enter trong danh sách là CHỌN, không phải gửi form.
      e.preventDefault();
      const c = results[active];
      if (c) pick(c);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault(); setOpen(false);
    }
  };

  const typed = query.trim().length >= MIN_QUERY_LENGTH;
  const statusText =
    status === 'loading' ? t('form.placeLoading')
    : status === 'error' ? t('form.placeError')
    : status === 'ready' && typed && open && results.length === 0 ? t('form.placeNone')
    : '';

  return (
    <div className="relative" data-testid="place-search" data-status={status}>
      {/* Kính lúp trong ô (giao diện D) — `top` theo nửa chiều cao ô, ô cao 44 hay 36px đều đúng. */}
      <span className="pointer-events-none absolute left-3 top-[1.375rem] -translate-y-1/2 text-ink-3 mouse:top-[1.125rem]">
        <Icon name="search" size={18} />
      </span>
      <input type="text" role="combobox" autoComplete="off" spellCheck={false}
             value={query} placeholder={t(short ? 'form.placePlaceholderShort' : 'form.placePlaceholder')}
             aria-label={t('form.place')} aria-autocomplete="list" aria-expanded={showList}
             aria-controls="place-listbox"
             aria-activedescendant={showList ? `place-opt-${active}` : undefined}
             aria-describedby="place-status"
             onFocus={ensureLoaded}
             onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0); ensureLoaded(); }}
             onBlur={() => setOpen(false)}
             onKeyDown={onKeyDown}
             className={`${className} pl-10`} data-testid="place-input" />
      {showList && (
        <ul id="place-listbox" role="listbox" aria-label={t('form.place')}
            className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-field bg-surface shadow-lg">
          {results.map((c, i) => (
            <li key={`${c.name}|${c.admin}|${c.countryCode}|${c.ianaZone}|${i}`} id={`place-opt-${i}`}
                role="option" aria-selected={i === active}
                data-testid="place-option" data-zone={c.ianaZone} data-country={c.countryCode}
                // mousedown chứ không click: click đến SAU blur, lúc đó danh sách đã đóng.
                onMouseDown={e => { e.preventDefault(); pick(c); }}
                onMouseEnter={() => setActive(i)}
                className={`min-h-11 cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-sunken' : ''}`}>
              <span className="font-medium">{c.name}</span>
              <span className="block text-xs text-ink-2">
                {[c.admin && c.admin !== c.name ? c.admin : '', countryName(c)].filter(Boolean).join(', ')}
                {' · '}{c.ianaZone}
              </span>
            </li>
          ))}
        </ul>
      )}
      <span id="place-status" role="status" aria-live="polite" className="hint mt-1 block empty:hidden"
            data-testid="place-status">
        {statusText}
      </span>
    </div>
  );
}
