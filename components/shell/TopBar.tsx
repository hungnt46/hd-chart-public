'use client';
/**
 * Thanh trên cùng — hướng A "Bàn đo", phương án (a) Hưng chốt 2026-09-25:
 *
 * Số đo theo proposal hướng A Hưng duyệt (phục hồi 2026-09-25): thanh 52px (điện
 * thoại 56px), dấu HD 28px, nút 13.5px. Giao diện D (Hưng duyệt 2026-10-04): danh
 * tính là nút nền `page` bo 10px "ngày giờ · nơi sinh ▾ / Chưa lưu vào kho" (Type ·
 * hồ sơ đã có ở thẻ Type), tab là viên bo 10px nền mực khi chọn (`.viewtab`).
 * Thanh GIỮ 52px dù mockup D vẽ 64px: cao thêm 12px là khung biểu đồ 1440×900 thấp
 * đi đúng chừng ấy và số cổng tụt dưới 8px (luật `ui.spec`).
 *
 *   ≥1400px  [HD] [danh tính ▾]  Bodygraph · Mandala · … · Kết nối   [≡ Kho chart] [Lưu] [Xuất ▾] [＋ Chart mới] [VI · Địa phương ▾]
 *   <1400px  hàng 1: [HD] [danh tính ▾] ……… [Kho] [Lưu] [Xuất] [＋] [VI · Địa phương ▾]
 *            hàng 2: Bodygraph · Mandala · … · Kết nối                (cuộn ngang nếu chật)
 *   < 640px  (giao diện D, Hưng duyệt 2026-10-04 — ngược luật cũ) có chart thì CHỈ còn
 *            [danh tính] [Lưu] [⋯]. ⋯ mở bảng trượt từ dưới (`BottomSheet`): Lưu vào
 *            kho · Xuất · Kho chart · Chart mới + ba nhóm Ngôn ngữ · Giờ · Kiểu biểu
 *            đồ. Sáu chế độ xuống THANH ĐÁY (`shell/BottomNav`), không còn dải tab.
 *            `data-testid` của các nút giữ NGUYÊN (library-toggle, new-chart…) — khổ
 *            nào chỉ dựng MỘT bản, nên helper e2e chỉ cần mở bảng trước.
 *
 * Lưu + Xuất lên đây theo mockup hướng A (Hưng xem lại 2026-09-25) — trước đó
 * chúng nằm ở bảng phải và đẩy bảng thuộc tính xuống. Nút Xuất do khung làm việc
 * gắn vào `#topbar-export` bằng portal (nó cần khung xuất ảnh của biểu đồ).
 *
 * Dính ở đỉnh (`sticky`). Chiều cao THẬT (1 hay 2 hàng) được đo và ghi vào biến
 * `--topbar-h` — khung biểu đồ và ngăn kéo tính theo biến đó.
 *
 * Nút "VI · Địa phương" mở bảng nhỏ chứa hai công tắc `VI | EN` và
 * `Địa phương | UTC` (nhãn ngắn — Hưng chốt 2026-09-25).
 *
 * ★ Illustrator (mockup Phase 2, Hưng duyệt 2026-09-28):
 *   · "Chart mới" thành MENU hai mục — Chart sinh (`new-chart-birth`, mở form
 *     như trước) · Illustrator (`new-chart-illustrator`). `new-chart` giờ là nút
 *     mở menu; helper e2e `fillBirth` bấm cả hai.
 *   · Ở chế độ Illustrator: chỗ danh tính thành "ILLUSTRATOR · tên bản vẽ / chế
 *     độ · số đếm" (bấm để đổi tên); KHÔNG có sáu tab, Lưu, Xuất (bảng Xuất ảnh
 *     nằm trong vùng làm việc); thêm "Nạp từ chart" và "Thoát" ở cuối.
 *
 * ★ Bản công khai (`PUBLIC_EDITION`, STATUS §5 #57/#60): KHÔNG Xuất, KHÔNG Illustrator ⇒
 *   "Chart mới" là NÚT mở form (vẫn `new-chart`, không còn `new-chart-birth`).
 * ★ Nhúng (`embed:`, phương án A Hưng duyệt 2026-10-13, STATUS §5 #62): GIỮ thanh, bỏ dấu HD + tên app
 *   (tên vẫn cho trình đọc màn hình), KHÔNG dính đỉnh — website đã có đầu trang của nó.
 */
import { useCallback, useLayoutEffect, useRef, useState, type JSX, type ReactNode } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { LANG_SHORT } from '../../i18n/ui/index.js';
import { LanguageSwitch } from '../language-switch/LanguageSwitch.js';
import { TimeModeSwitch } from '../time-mode/TimeModeSwitch.js';
import { useTimeMode } from '../time-mode/TimeModeProvider.js';
import { ThemeSwitch } from '../bodygraph/ThemeSwitch.js';
import { useChartTheme } from '../bodygraph/CompositePaletteProvider.js';
import { Icon } from '../ui/Icon.js';
import { Popover } from '../ui/Popover.js';
import { BottomSheet } from '../ui/BottomSheet.js';
import { useMedia } from '../workspace/ChartCanvas.js';
import { PUBLIC_EDITION } from '../../lib/edition.js';
import { AboutCredits } from './AboutCredits.js';

export interface TopBarProps {
  /**
   * Danh tính chart đang xem; `null` khi chưa có chart. Máy tính: "ngày giờ · nơi ▾"
   * / "Type · hồ sơ · chưa lưu"; điện thoại: "ngày giờ" / "nơi · Type · hồ sơ".
   */
  identity: { when: string; place: string; kind: string; saved: boolean; name?: string } | null;
  /** Sáu tab chế độ xem — chỉ có khi đã có chart. */
  nav?: ReactNode;
  drawerOpen: boolean;
  onLibrary: () => void;
  onNewChart: () => void;
  /** Mở kho ở ô tên chart để lưu chart đang xem. */
  onSave?: () => void;
  /** Mục "Illustrator" của menu Chart mới. */
  onIllustrator: () => void;
  /** Đang ở chế độ Illustrator — thay danh tính chart và các nút của chart. */
  illustrator?: {
    name: string;
    summary: string;
    onRename: () => void;
    onExit: () => void;
    /** Nút "Nạp từ chart" (bảng nhỏ do vùng Illustrator dựng). */
    load: ReactNode;
    /** "Lưu" vào Kho chart (Phase 3) — mở ngăn kéo ở ô tên bản vẽ. */
    onSave: () => void;
  };
  /**
   * Đang ở chế độ "Transit lúc này" khi CHƯA có chart (giao diện D, 2026-10-05): chỗ danh
   * tính thành nhãn chế độ, cuối thanh có nút "Thoát" về màn chào.
   */
  now?: { onExit: () => void };
}

export function TopBar({ identity, nav, drawerOpen, onLibrary, onNewChart, onSave, onIllustrator, illustrator, now }: TopBarProps): JSX.Element {
  const { lang, t } = useLanguage();
  const { mode } = useTimeMode();
  const { theme } = useChartTheme();
  const timeLabel = mode === 'local' ? t('time.localShort') : t('time.ut');
  const stateLabel = `${LANG_SHORT[lang]} · ${timeLabel} · ${theme === 'classic' ? t('theme.classic') : t('theme.modern')}`;
  const bar = useRef<HTMLDivElement>(null);
  /* Điện thoại có chart: thanh gọn + bảng trượt. Illustrator và màn chào giữ thanh cũ. */
  const phone = useMedia('(max-width: 639.98px)') && identity !== null && !illustrator;
  const [sheet, setSheet] = useState(false);
  const [sheetNew, setSheetNew] = useState(false);
  const [sheetExport, setSheetExport] = useState(false);
  const moreBtn = useRef<HTMLButtonElement>(null);
  const closeSheet = useCallback(() => { setSheet(false); setSheetNew(false); setSheetExport(false); }, []);
  const moreFocus = useCallback(() => moreBtn.current, []);

  /* Ghi chiều cao thật của thanh (1 hay 2 hàng) vào `--topbar-h`. */
  useLayoutEffect(() => {
    const el = bar.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--topbar-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b embed:static border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div ref={bar} className="mx-auto flex max-w-[120rem] flex-wrap items-center gap-x-2 px-2 sm:gap-x-3 sm:px-3">
        {/*
          `flex-1 basis-0` dưới 1400px: khối tên chart CO LẠI (tên cắt "…") để
          các nút ở cùng hàng. Thiếu nó thì ở 375px khối này giữ bề ngang tự nhiên,
          hàng nút rớt xuống dòng riêng và thanh dính cao ba hàng (~170px).
        */}
        <div className="order-1 flex h-14 min-w-0 flex-1 basis-0 items-center gap-2 wide:h-[3.25rem] wide:flex-none wide:basis-auto">
          <span aria-hidden="true"
                className="grid size-7 shrink-0 place-items-center rounded-[7px] bg-ink text-xs font-bold tracking-wide text-white embed:hidden">HD</span>
          <h1 className={`text-[15px] font-semibold embed:sr-only ${identity || illustrator || now ? 'sr-only' : ''}`}>{t('app.title')}</h1>
          {now && !illustrator && !identity && (
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold" data-testid="now-identity">
              <span className="inline-flex shrink-0 items-center rounded-full bg-ink px-2 py-0.5 text-overline font-semibold uppercase tracking-wide text-white">{t('view.transit')}</span>
              <span className="truncate">{t('now.mode')}</span>
            </span>
          )}
          {illustrator && (
            <button type="button" onClick={illustrator.onRename} data-testid="illu-identity" title={t('illu.rename')}
                    className="flex min-h-11 min-w-0 max-w-[26rem] flex-col justify-center rounded-lg px-2.5 text-left leading-tight hover:bg-sunken">
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-overline font-semibold uppercase tracking-wide text-white">
                  <Icon name="pen" size={12} />{t('illu.title')}
                </span>
                <span className="truncate max-sm:hidden" data-testid="illu-identity-name">{illustrator.name}</span>
              </span>
              <span className="truncate text-xs text-ink-2" data-testid="illu-identity-summary">{illustrator.summary}</span>
            </button>
          )}
          {!illustrator && identity && (
            <button type="button" onClick={onLibrary} aria-expanded={drawerOpen} aria-controls="chart-drawer"
                    data-testid="identity"
                    className="flex min-h-11 min-w-0 max-w-[16rem] items-center gap-2 rounded-lg px-2.5 text-left leading-tight hover:bg-sunken
                               sm:max-w-[22rem] sm:rounded-[.625rem] sm:bg-page sm:py-1.5 sm:hover:bg-sunken">
              {/* Giao diện D (2026-10-04): nút nền `page` bo 10px — dòng 1 ngày giờ · nơi sinh, dòng 2 trạng thái lưu. */}
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold tabular-nums">
                  {identity.name && <span data-testid="identity-name">{identity.name} · </span>}{identity.when}<span className="max-sm:hidden" data-testid="identity-place"> · {identity.place}</span>
                </span>
                <span className="truncate text-xs text-ink-2 sm:text-ink-3" data-testid="identity-kind" data-saved={identity.saved}>
                  {/* Điện thoại (mockup M3, Hưng chốt 2026-10-04): Type · hồ sơ · nơi sinh. Trạng thái lưu
                      vẫn ở `data-saved` và nút Lưu (dấu trang) cạnh bên. */}
                  <span className="sm:hidden">{identity.kind} · {identity.place}</span>
                  <span className="max-sm:hidden">{identity.saved ? t('shell.savedLong') : t('shell.unsavedLong')}</span>
                </span>
              </span>
              <Icon name="chevronDown" size={16} className="shrink-0 text-ink-2 max-sm:hidden" />
            </button>
          )}
        </div>

        {/*
          `min-w-0` ở MỌI khổ, không chỉ `wide:`: thiếu nó thì hàng tab (mục
          flex) không co dưới bề ngang nội dung — sáu tab ~556px đẩy cả trang
          tràn ngang ở 375px, và ở chế độ di động trình duyệt nới luôn vùng hiển
          thị theo, ngăn kéo `w-full` rộng theo (nút "Chỉnh múi giờ" lọt ra
          ngoài màn). Có nó thì dải tab tự cuộn ngang bên trong.
        */}
        {nav && !illustrator && !phone && (
          <nav aria-label={t('view.group')}
               className="order-3 -mx-2 h-12 min-w-0 basis-[calc(100%+1rem)] border-t border-line px-1 sm:-mx-3 sm:basis-[calc(100%+1.5rem)] sm:px-2
                          wide:order-2 wide:ml-1.5 wide:mr-0 wide:h-[3.25rem] wide:flex-1 wide:basis-auto wide:border-0 wide:px-0">
            {nav}
          </nav>
        )}

        {phone ? (
          <div className="order-2 ml-auto flex h-14 items-center gap-0.5">
            {onSave && (
              <button type="button" onClick={onSave} data-testid="save-chart" aria-label={t('sheet.save')}
                      className="btn btn-ghost btn-icon"><Icon name="save" size={22} /></button>
            )}
            <button ref={moreBtn} type="button" onClick={() => setSheet(true)} data-testid="more-menu"
                    aria-label={t('shell.more')} aria-haspopup="dialog" aria-expanded={sheet}
                    className="btn btn-ghost btn-icon"><Icon name="more" size={24} /></button>
            <BottomSheet open={sheet} onClose={closeSheet} label={t('sheet.title')} testId="more-sheet" returnFocus={moreFocus}>
              <div className="flex flex-col">
                {onSave && (
                  <SheetItem icon="save" title={t('sheet.save')} hint={t('sheet.saveHint')} testId="sheet-save"
                             onClick={() => { closeSheet(); onSave(); }} />
                )}
                {!PUBLIC_EDITION && (
                  <>
                    <SheetItem icon="download" title={t('export.menu')} hint={t('sheet.exportHint')} testId="sheet-export"
                               expanded={sheetExport} onClick={() => setSheetExport(o => !o)} />
                    {/* Ba nút xuất do khung làm việc gắn vào đây bằng portal (cần khung xuất ảnh của biểu đồ). */}
                    <div id="sheet-export" hidden={!sheetExport} className="ml-12" data-sheet-close="" />
                  </>
                )}
                <SheetItem icon="library" title={t('shell.library')} hint={t('sheet.libraryHint')} testId="library-toggle"
                           onClick={() => { closeSheet(); onLibrary(); }} />
                {PUBLIC_EDITION ? (
                  <SheetItem icon="plus" title={t('shell.newChart')} hint={t('illu.menuBirthHint')} testId="new-chart"
                             onClick={() => { closeSheet(); onNewChart(); }} />
                ) : (
                  <SheetItem icon="plus" title={t('shell.newChart')} hint={t('sheet.newHint')} testId="new-chart"
                             expanded={sheetNew} onClick={() => setSheetNew(o => !o)} />
                )}
                {sheetNew && !PUBLIC_EDITION && (
                  <div className="ml-12 flex flex-col" role="group" aria-label={t('illu.newMenu')}>
                    <MenuItem icon="plus" title={t('illu.menuBirth')} hint={t('illu.menuBirthHint')}
                              onClick={() => { closeSheet(); onNewChart(); }} testId="new-chart-birth" />
                    <MenuItem icon="pen" title={t('illu.title')} hint={t('illu.menuIlluHint')}
                              onClick={() => { closeSheet(); onIllustrator(); }} testId="new-chart-illustrator" />
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-3 border-t border-line pt-4">
                <SheetSetting label={t('app.language')}><LanguageSwitch /></SheetSetting>
                <SheetSetting label={t('time.group')}><TimeModeSwitch /></SheetSetting>
                <SheetSetting label={t('theme.group')}><ThemeSwitch /></SheetSetting>
              </div>
              {PUBLIC_EDITION && <div className="mt-4 border-t border-line pt-4"><AboutCredits testId="credit-sheet" /></div>}
            </BottomSheet>
          </div>
        ) : (
        <div className="topbar-actions order-2 ml-auto flex h-14 items-center gap-1.5 sm:gap-2 wide:order-3 wide:h-[3.25rem]">
          <button type="button" onClick={onLibrary} aria-expanded={drawerOpen} aria-controls="chart-drawer"
                  data-testid="library-toggle" className="btn max-lg:w-11 max-lg:px-0">
            <Icon name="menu" size={18} /><span className="max-lg:sr-only">{t('shell.library')}</span>
          </button>
          {illustrator?.load}
          {illustrator && (
            <button type="button" onClick={illustrator.onSave} data-testid="illu-save" className="btn max-sm:hidden max-lg:w-11 max-lg:px-0">
              <Icon name="save" className="lg:hidden" /><span className="max-lg:sr-only">{t('shell.save')}</span>
            </button>
          )}
          {!illustrator && identity && onSave && (
            <button type="button" onClick={onSave} data-testid="save-chart" className="btn max-sm:hidden max-lg:w-11 max-lg:px-0">
              <Icon name="save" className="lg:hidden" /><span className="max-lg:sr-only">{t('shell.save')}</span>
            </button>
          )}
          {!illustrator && identity && !PUBLIC_EDITION && <div id="topbar-export" className="contents" />}
          {identity !== null && PUBLIC_EDITION && (
            <button type="button" onClick={onNewChart} data-testid="new-chart" aria-label={t('shell.newChart')}
                    className="btn btn-primary gap-1 max-lg:w-11 max-lg:px-0">
              <Icon name="plus" size={18} /><span className="max-lg:sr-only">{t('shell.newChart')}</span>
            </button>
          )}
          {(identity !== null || illustrator !== undefined) && !PUBLIC_EDITION && (
            <Popover testId="new-chart" panelId="new-chart-menu" closeOnPick panelClassName="w-72"
                     buttonClassName="btn btn-primary gap-1 max-lg:w-11 max-lg:px-0" ariaLabel={t('shell.newChart')}
                     label={open => (
                       <>
                         <Icon name="plus" size={18} /><span className="max-lg:sr-only">{t('shell.newChart')}</span>
                         <Icon name="chevronDown" size={14} className={`transition-transform max-lg:hidden ${open ? 'rotate-180' : ''}`} />
                       </>
                     )}>
              <div className="flex flex-col" role="group" aria-label={t('illu.newMenu')}>
                <MenuItem icon="plus" title={t('illu.menuBirth')} hint={t('illu.menuBirthHint')} onClick={onNewChart} testId="new-chart-birth" />
                <MenuItem icon="pen" title={t('illu.title')} hint={t('illu.menuIlluHint')} onClick={onIllustrator} testId="new-chart-illustrator" />
              </div>
            </Popover>
          )}

          {/*
            ★ Ngôn ngữ + giờ gom vào MỘT nút gọn ở mọi khổ màn (Hưng chốt
              2026-09-25): hai thứ này ít khi đổi — ngôn ngữ tự đoán lần đầu
              (`guessLang`), giờ mặc định địa phương — nên không chiếm chỗ của
              sáu tab. Nút ghi sẵn trạng thái để không phải mở ra mới biết.
          */}
          {/*
            ★ Nút GỌN "⚙ VI ▾" (Hưng chốt 2026-09-28): bảng nay có BA công tắc —
              ngôn ngữ, giờ, chủ đề bodygraph (chủ đề rời khỏi khung biểu đồ, phương
              án D). Ghi cả ba lên nút thì quá dài ("VI · Địa phương · Classic").
              Giữ mã NGÔN NGỮ trên nút: người không đọc được thứ tiếng đang hiện vẫn
              tìm ra chỗ đổi (xem `LanguageSwitch`). Trạng thái đủ cả ba nằm trong
              nhãn truy cập và tooltip.
          */}
          <Popover testId="settings-menu" panelId="app-settings" buttonClassName="btn gap-1 px-2"
                   ariaLabel={`${t('shell.settings')}: ${stateLabel}`} panelClassName="w-max" title={stateLabel}
                   label={open => (
                     <>
                       <Icon name="sliders" size={18} />
                       <span className="tabular-nums">{LANG_SHORT[lang]}</span>
                       <Icon name="chevronDown" size={14} className={`text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
                     </>
                   )}>
            <div className="space-y-3 p-1">
              <div>
                <p className="hint mb-1">{t('app.language')}</p>
                <LanguageSwitch />
              </div>
              <div>
                <p className="hint mb-1">{t('time.group')}</p>
                <TimeModeSwitch />
              </div>
              <div>
                <p className="hint mb-1">{t('theme.group')}</p>
                <ThemeSwitch />
              </div>
              {PUBLIC_EDITION && <div className="border-t border-line pt-3"><AboutCredits testId="credit" /></div>}
            </div>
          </Popover>
          {now && !illustrator && !identity && (
            <button type="button" onClick={now.onExit} data-testid="now-exit" title={t('now.exitTitle')}
                    className="btn btn-ghost max-lg:w-11 max-lg:px-0">
              <Icon name="close" size={18} /><span className="max-lg:sr-only">{t('illu.exit')}</span>
            </button>
          )}
          {illustrator && (
            <button type="button" onClick={illustrator.onExit} data-testid="illu-exit" title={t('illu.exitTitle')}
                    className="btn btn-ghost max-lg:w-11 max-lg:px-0">
              <Icon name="close" size={18} /><span className="max-lg:sr-only">{t('illu.exit')}</span>
            </button>
          )}
        </div>
        )}
      </div>
    </header>
  );
}

/** Một dòng hành động của bảng trượt (mockup M5): ô biểu tượng 40px + tên + gợi ý; cao ≥ 48px (Android). */
function SheetItem({ icon, title, hint, onClick, testId, expanded }: {
  icon: 'save' | 'download' | 'library' | 'plus'; title: string; hint: string; onClick: () => void; testId: string;
  expanded?: boolean;
}): JSX.Element {
  return (
    <button type="button" onClick={onClick} data-testid={testId} aria-expanded={expanded}
            className="flex min-h-14 w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left hover:bg-subtle">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken"><Icon name={icon} size={20} /></span>
      <span className="min-w-0">
        <span className="block text-base font-semibold text-ink">{title}</span>
        <span className="block text-ui text-ink-3">{hint}</span>
      </span>
    </button>
  );
}

/** Một nhóm cài đặt trong bảng trượt: nhãn bên trái, nhóm nút bên phải. */
function SheetSetting({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-ink-2">{label}</span>
      {children}
    </div>
  );
}

function MenuItem({ icon, title, hint, onClick, testId }: {
  icon: 'plus' | 'pen'; title: string; hint: string; onClick: () => void; testId: string;
}): JSX.Element {
  return (
    <button type="button" onClick={onClick} data-testid={testId}
            className="flex min-h-11 w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-subtle">
      <span aria-hidden="true" className="grid size-7.5 shrink-0 place-items-center rounded-lg bg-sunken"><Icon name={icon} size={18} /></span>
      <span className="min-w-0">
        {/* `text-control` là MÀU viền nút (token trùng tên cỡ chữ) — ghi cỡ bằng biến. */}
        <span className="block text-[length:var(--text-control)] font-semibold text-ink">{title}</span>
        <span className="block text-xs leading-snug text-ink-2">{hint}</span>
      </span>
    </button>
  );
}
