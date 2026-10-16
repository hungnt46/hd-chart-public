'use client';
/**
 * THANH ĐÁY 5 ô cho điện thoại (< 640px) — giao diện D, Hưng duyệt 2026-10-04
 * (artboard M2–M4), NGƯỢC luật cũ "sáu chế độ là tab trên thanh trên". Từ 640px
 * trở lên sáu tab vẫn ở thanh trên (`ViewTabs`); khổ nào chỉ dựng MỘT bản nên
 * `data-testid="view-…"` giữ nguyên tên.
 *
 *   Bodygraph · Mandala · Transit · Chu kỳ · Thêm
 *
 * "Thêm" mở bảng trượt nhỏ chứa hai chế độ còn lại (Thập tự Nhập Thế, Kết nối);
 * đang ở một trong hai thì ô Thêm sáng như ô đang chọn.
 *
 * Số đo mockup: cao 49px + `safe-area-inset-bottom`, nền trắng 94%, ô đang chọn
 * là viên `sunken` 52×28 + chữ 700. Vùng bấm ≥ 48px (Android 48dp).
 */
import { useCallback, useRef, useState, type JSX } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { Icon, type IconName } from '../ui/Icon.js';
import { BottomSheet } from '../ui/BottomSheet.js';
import type { View } from './ViewTabs.js';
import { PUBLIC_EDITION } from '../../lib/edition.js';
import { AboutCredits } from './AboutCredits.js';

const ALL_MAIN: readonly { v: View; icon: IconName }[] = [
  { v: 'bodygraph', icon: 'triangle' }, { v: 'mandala', icon: 'mandala' },
  { v: 'transit', icon: 'transit' }, { v: 'cycle', icon: 'reset' },
];
/* Bản công khai: bỏ ô Chu kỳ, còn 4 ô — Thêm vẫn giữ Thập tự + Kết nối (Hưng duyệt mockup, STATUS §5 #61). */
const MAIN = ALL_MAIN.filter(({ v }) => !PUBLIC_EDITION || v !== 'cycle');
const MORE: readonly View[] = ['cross', 'connection'];

/**
 * `inline` (chế độ nhúng, mockup C Hưng duyệt 2026-10-13): cùng bốn ô + Thêm nhưng là HÀNG TAB nằm trong
 * luồng ngay trên biểu đồ — iframe cao bằng nội dung nên "cố định đáy" là đáy iframe, ngoài tầm mắt.
 */
export function BottomNav({ view, setView, inline = false }: { view: View; setView: (v: View) => void; inline?: boolean }): JSX.Element {
  const { t } = useLanguage();
  const [more, setMore] = useState(false);
  const moreBtn = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setMore(false), []);
  const moreFocus = useCallback(() => moreBtn.current, []);
  const inMore = MORE.includes(view);
  return (
    <nav aria-label={t('view.group')} data-testid="bottom-nav" data-inline={inline || undefined}
         className={inline ? 'mb-2 flex gap-0.5 rounded-xl bg-sunken p-[3px]'
           : 'fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 px-1 pt-1.5 backdrop-blur'}
         style={inline ? undefined : { paddingBottom: 'max(.375rem, env(safe-area-inset-bottom))' }}>
      {MAIN.map(({ v, icon }) => (
        <NavItem key={v} icon={icon} label={t(`view.${v}` as const)} active={view === v} inline={inline}
                 onClick={() => setView(v)} testId={`view-${v}`} pressed={view === v} />
      ))}
      <NavItem icon="more" label={t('view.more')} active={inMore} onClick={() => setMore(true)} testId="view-more"
               btnRef={moreBtn} expanded={more} inline={inline} />
      <BottomSheet open={more} onClose={close} label={t('view.moreTitle')} testId="more-views" returnFocus={moreFocus}>
        <div className="flex flex-col pb-1" role="group" aria-label={t('view.moreTitle')}>
          {MORE.map(v => (
            <button key={v} type="button" data-testid={`view-${v}`} aria-pressed={view === v}
                    onClick={() => { setView(v); close(); }}
                    className="flex min-h-12 items-center justify-between rounded-xl px-2 text-left text-base hover:bg-subtle aria-pressed:font-semibold">
              {t(`view.${v}` as const)}
              {view === v && <Icon name="chevronRight" size={18} className="text-ink-3" />}
            </button>
          ))}
        </div>
        {PUBLIC_EDITION && <div className="mt-2 border-t border-line px-2 pb-1 pt-3"><AboutCredits testId="credit-more" /></div>}
      </BottomSheet>
    </nav>
  );
}

function NavItem({ icon, label, active, onClick, testId, pressed, expanded, btnRef, inline = false }: {
  icon: IconName; label: string; active: boolean; onClick: () => void; testId: string;
  pressed?: boolean; expanded?: boolean; btnRef?: React.Ref<HTMLButtonElement>; inline?: boolean;
}): JSX.Element {
  if (inline) {
    return (
      <button ref={btnRef} type="button" onClick={onClick} data-testid={testId} data-active={active}
              aria-pressed={pressed} aria-expanded={expanded}
              className={`min-h-11 min-w-0 flex-1 truncate rounded-[.625rem] px-1 text-ui ${
                active ? 'bg-ink font-semibold text-white' : 'font-medium text-ink-2 hover:text-ink'}`}>
        {label}
      </button>
    );
  }
  return (
    <button ref={btnRef} type="button" onClick={onClick} data-testid={testId} data-active={active}
            aria-pressed={pressed} aria-expanded={expanded}
            className={`flex min-h-[3.0625rem] flex-1 flex-col items-center justify-center gap-[3px] text-overline ${
              active ? 'font-bold text-ink' : 'font-medium text-ink-3'}`}>
      <span aria-hidden="true" className={`grid h-7 w-[3.25rem] place-items-center rounded-full ${active ? 'bg-sunken' : ''}`}>
        <Icon name={icon} size={22} />
      </span>
      {label}
    </button>
  );
}
