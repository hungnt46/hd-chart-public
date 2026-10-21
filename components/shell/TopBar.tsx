'use client';
/**
 * Header — Aura phương án C (Hưng duyệt 2026-10-21, docs/PLAN-giao-dien-aura.md §0.4).
 * KHÔNG còn thanh app riêng: app vẽ header KIỂU WEBSITE (trang /chart/ của website ẩn
 * header của nó). Thay cho thanh trên 52px của hướng A / giao diện D.
 *
 *   Màn chào (chưa có chart), ≥ 1024px:
 *     [Human Design Vietnam]      Trang Chủ · Cơ Bản · Tham Vấn · Khoá Học      [Tạo Chart]
 *   Có chart, ≥ 1024px (72px):
 *     [Human Design Vietnam (Đầy đủ)]   Bodygraph · Mandala · … · Kết nối   [⋯] [=]
 *   640–1023px: tab xuống HÀNG HAI của header, cuộn ngang (mép mờ dần — `ViewTabs`).
 *   < 640px: header website 56px [chữ hiệu] [Tạo Chart] [=]; có chart thì thêm THANH
 *     DANH TÍNH [ngày giờ · nơi ▾ / chưa lưu] [Lưu] [⋯]; chế độ xem xuống thanh đáy.
 *
 * ★ Ngày giờ · nơi sinh + Lưu KHÔNG ở header nữa (≥ 640px): thành THẺ ĐẦU bảng phải
 *   (`IdentityCard`, khung làm việc dựng). `data-testid` giữ nguyên (`identity`,
 *   `save-chart`) — khổ nào chỉ dựng MỘT bản.
 * ★ Menu ⋯ (`more-menu` → bảng `more-sheet`): Lưu (chỉ điện thoại) · Xuất (bản đầy đủ) ·
 *   Kho chart · Chart mới (bản đầy đủ: Chart sinh / Illustrator) · Ngôn ngữ · Giờ · Chủ đề.
 *   Máy tính là bảng thả (`Popover`), điện thoại là bảng trượt (`BottomSheet`) — CÙNG nội
 *   dung (`MoreMenu`), cùng `data-testid`, nên helper e2e `openSheet` dùng được ở mọi khổ.
 *   Nút Xuất do khung làm việc gắn vào `#sheet-export` bằng portal.
 * ★ Nút hai vạch mở menu website (`SiteMenu`).
 *
 * Dính ở đỉnh (`sticky`). Chiều cao THẬT (1 hay 2 hàng) đo và ghi vào `--topbar-h` —
 * khung biểu đồ và ngăn kéo tính theo biến đó. Luật 8px (ui.spec) đo lại với header 72px.
 *
 * ★ Illustrator (bản đầy đủ): chỗ tab thành "ILLUSTRATOR · tên bản vẽ / chế độ · số đếm"
 *   (bấm để đổi tên); thêm "Nạp từ chart" · Lưu · Thoát trước ⋯. Vỏ Illustrator đổi ở Đợt 3.
 * ★ "Transit lúc này" khi CHƯA có chart: nhãn chế độ + "Thoát" về màn chào.
 * ★ Bản công khai (`PUBLIC_EDITION`): không Xuất, không Illustrator ⇒ "Chart mới" là NÚT
 *   (vẫn `new-chart`). Bản đầy đủ thêm nhãn "Đầy đủ" cạnh chữ hiệu.
 * ★ Nhúng (`embed:`): KHÔNG dính đỉnh — iframe cao bằng nội dung, "đỉnh" là đỉnh iframe.
 */
import { useCallback, useLayoutEffect, useRef, useState, type JSX, type ReactNode } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { LANG_SHORT } from '../../i18n/ui/index.js';
import { LanguageSwitch } from '../language-switch/LanguageSwitch.js';
import { TimeModeSwitch } from '../time-mode/TimeModeSwitch.js';
import { useTimeMode } from '../time-mode/TimeModeProvider.js';
import { ThemeSwitch } from '../bodygraph/ThemeSwitch.js';
import { Icon } from '../ui/Icon.js';
import { Popover } from '../ui/Popover.js';
import { BottomSheet } from '../ui/BottomSheet.js';
import { useMedia } from '../workspace/ChartCanvas.js';
import { PUBLIC_EDITION } from '../../lib/edition.js';
import { SITE_LINKS } from '../../lib/site-links.js';
import { Brand } from './Brand.js';
import { SiteMenu } from './SiteMenu.js';

export interface Identity { when: string; place: string; kind: string; saved: boolean; name?: string }

export interface TopBarProps {
  /** Danh tính chart đang xem; `null` khi chưa có chart. Header chỉ dùng nó ở điện thoại (thanh danh tính). */
  identity: Identity | null;
  /** Các tab chế độ xem — chỉ có khi đã có chart. */
  nav?: ReactNode;
  drawerOpen: boolean;
  onLibrary: () => void;
  onNewChart: () => void;
  /** Mở kho ở ô tên chart để lưu chart đang xem. */
  onSave?: () => void;
  /** Mục "Illustrator" của menu Chart mới. */
  onIllustrator: () => void;
  /** Đang ở chế độ Illustrator — thay tab và các nút của chart. */
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
  /** Đang ở chế độ "Transit lúc này" khi CHƯA có chart: nhãn chế độ + nút "Thoát" về màn chào. */
  now?: { onExit: () => void };
}

export function TopBar({ identity, nav, drawerOpen, onLibrary, onNewChart, onSave, onIllustrator, illustrator, now }: TopBarProps): JSX.Element {
  const { t } = useLanguage();
  const bar = useRef<HTMLDivElement>(null);
  const phone = useMedia('(max-width: 639.98px)');
  /* ≥ 1024px tab nằm GIỮA hàng một; hẹp hơn xuống hàng hai. */
  const roomy = useMedia('(min-width: 1024px)');
  const [menu, setMenu] = useState(false);
  const moreBtn = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => setMenu(false), []);
  const moreFocus = useCallback(() => moreBtn.current, []);
  const welcome = !identity && !illustrator && !now;

  /* Ghi chiều cao thật của header (1 hay 2 hàng) vào `--topbar-h`. */
  useLayoutEffect(() => {
    const el = bar.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--topbar-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const menuBody = (
    <MoreMenu phone={phone} close={closeMenu} hasChart={identity !== null} illustrator={illustrator !== undefined}
              onSave={onSave} onLibrary={onLibrary} onNewChart={onNewChart} onIllustrator={onIllustrator} />
  );
  /* ⋯ máy tính: bảng thả. Điện thoại: bảng trượt — xem `MoreMenu`. */
  const more = !welcome && !now && (phone ? (
    <>
      <button ref={moreBtn} type="button" onClick={() => setMenu(true)} data-testid="more-menu"
              aria-label={t('shell.moreLabel')} aria-haspopup="dialog" aria-expanded={menu}
              className="btn btn-icon shrink-0"><Icon name="more" size={22} /></button>
      <BottomSheet open={menu} onClose={closeMenu} label={t('sheet.title')} testId="more-sheet" returnFocus={moreFocus}>
        {menuBody}
      </BottomSheet>
    </>
  ) : (
    <Popover testId="more-menu" panelTestId="more-sheet" panelId="more-menu-panel" open={menu} onOpenChange={setMenu}
             ariaLabel={t('shell.moreLabel')} hasPopup="dialog" buttonClassName="btn btn-icon size-11"
             panelClassName="w-80 p-3" label={<Icon name="more" size={22} />}>
      {menuBody}
    </Popover>
  ));

  /*
   * "Tạo Chart" — trang hiện tại của menu website (artboard: màn chào, và hàng một của header điện thoại).
   * LINK về trang /chart/ CHỈ ở màn chào bản công khai (= đúng trang này). Đã có chart thì là NÚT mở form chart mới:
   * link sẽ tải lại trang cha và mất chart chưa lưu. Bản đầy đủ (dùng riêng, offline) không dẫn ra website công khai:
   * ở màn chào nút đưa con trỏ vào ô ngày.
   */
  const pillCls = 'btn btn-primary min-h-11 shrink-0 px-3.5 no-underline sm:px-5';
  const chartPill = identity ? (
    <button type="button" onClick={onNewChart} className={pillCls} data-testid="chart-pill">{t('site.chart')}</button>
  ) : PUBLIC_EDITION ? (
    <a href={SITE_LINKS[4]!.href} target="_top" aria-current="page" className={pillCls} data-testid="chart-pill">{t('site.chart')}</a>
  ) : (
    <button type="button" className={pillCls} data-testid="chart-pill"
            onClick={() => document.querySelector<HTMLInputElement>('[data-testid=input-date]')?.focus()}>{t('site.chart')}</button>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-page/95 backdrop-blur supports-[backdrop-filter]:bg-page/85 embed:static"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Lề khớp `main`: màn chào 32px (artboard), trang chart 16px (luật 8px — xem `app/page.tsx`). */}
      {/* Tablet (artboard `Tablet`): lề 24 trái / 16 phải, khoảng 12px giữa các mục. */}
      <div ref={bar} className={`mx-auto ${welcome ? 'max-w-[86rem]' : 'max-w-[120rem]'}`}>
        <div className={`flex h-14 items-center gap-2 pl-4 pr-3 sm:h-18 sm:gap-3 sm:pl-6 sm:pr-4 lg:gap-6 ${welcome ? 'lg:pl-8 lg:pr-6' : 'lg:px-4'}`}>
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <Brand small={phone} testId="brand" />
            {!PUBLIC_EDITION && <span className="tag shrink-0 max-sm:hidden" data-testid="edition-full">{t('edition.full')}</span>}
            <h1 className="sr-only">{t('app.title')}</h1>
          </div>

          {/* Giữa hàng một: tab chế độ (≥ 1024) · menu website (màn chào ≥ 1024) · nhãn Illustrator / Transit lúc này. */}
          <div className="flex min-w-0 flex-1 items-center justify-center">
            {nav && !illustrator && roomy && <nav aria-label={t('view.group')} className="min-w-0">{nav}</nav>}
            {welcome && roomy && (
              <nav aria-label={t('site.nav')} className="flex gap-7 text-sm" data-testid="site-nav">
                {SITE_LINKS.filter(l => !l.current).map(l => (
                  <a key={l.key} href={l.href} target="_top" className="inline-flex min-h-11 items-center text-ink no-underline hover:text-dawn">{t(l.key)}</a>
                ))}
              </nav>
            )}
            {illustrator && (
              <button type="button" onClick={illustrator.onRename} data-testid="illu-identity" title={t('illu.rename')}
                      className="mr-auto flex min-h-11 min-w-0 max-w-[26rem] flex-col justify-center rounded-xl px-2.5 text-left leading-tight hover:bg-sunken">
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-overline font-semibold uppercase tracking-wide text-on-dark">
                    <Icon name="pen" size={12} />{t('illu.title')}
                  </span>
                  <span className="truncate max-sm:hidden" data-testid="illu-identity-name">{illustrator.name}</span>
                </span>
                <span className="truncate text-xs text-ink-2" data-testid="illu-identity-summary">{illustrator.summary}</span>
              </button>
            )}
            {now && !illustrator && !identity && (
              <span className="mr-auto flex min-w-0 items-center gap-2 text-sm font-semibold" data-testid="now-identity">
                <span className="inline-flex shrink-0 items-center rounded-full bg-ink px-2 py-0.5 text-overline font-semibold uppercase tracking-wide text-on-dark">{t('view.transit')}</span>
                <span className="truncate">{t('now.mode')}</span>
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {illustrator?.load}
            {illustrator && (
              <button type="button" onClick={illustrator.onSave} data-testid="illu-save" className="btn max-sm:hidden max-lg:w-11 max-lg:px-0">
                <Icon name="save" className="lg:hidden" /><span className="max-lg:sr-only">{t('shell.save')}</span>
              </button>
            )}
            {now && <SettingsButton />}
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
            {/* Điện thoại ở Illustrator / Transit lúc này: hàng một đã chật (nhãn chế độ, Thoát…) ⇒ không pill. */}
            {(welcome || (phone && identity && !illustrator)) && chartPill}
            {!phone && more}
            {(phone || !roomy || !welcome) && <SiteMenu />}
          </div>
        </div>

        {/* 640–1023px (artboard `Tablet`): tab xuống hàng hai CỦA header — không vạch ngăn, lề 0 24 12, viên cao 44. */}
        {nav && !illustrator && !phone && !roomy && (
          <nav aria-label={t('view.group')} className="tabrow min-w-0 px-6 pb-3">{nav}</nav>
        )}

        {/* Điện thoại có chart: THANH DANH TÍNH (artboard `Chart-Mobile`). */}
        {phone && (identity ?? illustrator) && (
          <div className="flex items-center gap-2 border-t border-line bg-surface py-1.5 pl-4 pr-3" data-testid="identity-bar">
            {identity && !illustrator ? (
              <IdentityButton identity={identity} drawerOpen={drawerOpen} onClick={onLibrary} compact />
            ) : <span className="flex-1" />}
            {identity && !illustrator && onSave && (
              <button type="button" onClick={onSave} data-testid="save-chart" className="btn btn-primary shrink-0 px-4">{t('shell.save')}</button>
            )}
            {more}
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * Nút danh tính: "ngày giờ · nơi sinh ▾" / "Chưa lưu vào kho · bấm để sửa". Bấm ⇒ ngăn kéo
 * (form + kho). Máy tính nằm trong THẺ ĐẦU bảng phải (`IdentityCard`); điện thoại trên thanh
 * danh tính (`compact`: viên nền `sunken`, chữ cắt "…").
 */
export function IdentityButton({ identity, drawerOpen, onClick, compact = false }: {
  identity: Identity; drawerOpen: boolean; onClick: () => void; compact?: boolean;
}): JSX.Element {
  const { t } = useLanguage();
  return (
    <button type="button" onClick={onClick} aria-expanded={drawerOpen} aria-controls="chart-drawer" data-testid="identity"
            className={`flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left leading-tight ${compact
              ? 'rounded-[.875rem] border border-line bg-sunken px-3 py-1' : 'rounded-lg'}`}>
      <span className="flex min-w-0 items-center gap-1 text-[length:var(--text-card)] font-semibold tabular-nums max-sm:text-sm">
        <span className={compact ? 'truncate' : ''}>
          {identity.name && <span data-testid="identity-name">{identity.name} · </span>}{identity.when}<span data-testid="identity-place"> · {identity.place}</span>
        </span>
        <Icon name="chevronDown" size={16} className="shrink-0 text-ink-2" />
      </span>
      <span className={`text-xs text-ink-2 ${compact ? 'truncate' : ''}`} data-testid="identity-kind" data-saved={identity.saved}>
        {identity.saved ? t('shell.savedLong') : t('shell.unsavedLong')}
        {!compact && <> · {t('shell.identityHint')}</>}
      </span>
    </button>
  );
}

/**
 * Nút cài đặt — màn chào ("VI · Địa phương ▾" trên form, artboard `Chart-Welcome`; `long`) và
 * Transit lúc này (gọn "⚙ VI ▾" trên header). Có chart thì ba nhóm cài đặt nằm trong ⋯.
 */
export function SettingsButton({ long = false, className = 'btn btn-ghost gap-1 px-2', align }: {
  long?: boolean; className?: string; align?: 'start' | 'end';
}): JSX.Element {
  const { lang, t } = useLanguage();
  const { mode } = useTimeMode();
  const stateLabel = `${LANG_SHORT[lang]} · ${mode === 'local' ? t('time.localShort') : t('time.ut')}`;
  return (
    <Popover testId="settings-menu" panelId="app-settings" buttonClassName={className} align={align}
             ariaLabel={`${t('shell.settings')}: ${stateLabel}`} panelClassName="w-max" title={stateLabel}
             label={open => (
               <>
                 {!long && <Icon name="sliders" size={18} />}
                 <span className="tabular-nums">{long ? stateLabel : LANG_SHORT[lang]}</span>
                 <Icon name="chevronDown" size={14} className={`text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
               </>
             )}>
      <div className="space-y-3 p-1">
        {/* Màn chào KHÔNG có khối ghi công (Aura, Hưng chốt 2026-10-21, mục B11): GeoNames ở cuối gợi ý nơi
            sinh; mã nguồn AGPL qua nút "i" sau dòng giờ UTC khi đã có chart. */}
        <Settings />
      </div>
    </Popover>
  );
}

function Settings({ row = false }: { row?: boolean }): JSX.Element {
  const { t } = useLanguage();
  const groups: [string, ReactNode][] = [
    [t('app.language'), <LanguageSwitch key="l" />],
    [t('time.group'), <TimeModeSwitch key="t" />],
    [t('theme.group'), <ThemeSwitch key="th" />],
  ];
  return (
    <>
      {groups.map(([label, ctl]) => row ? (
        <div key={label} className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-ink-2">{label}</span>{ctl}
        </div>
      ) : (
        <div key={label}><p className="hint mb-1">{label}</p>{ctl}</div>
      ))}
    </>
  );
}

/** Nội dung menu ⋯ — artboard `Menus`. CÙNG nội dung cho bảng thả (máy tính) và bảng trượt (điện thoại). */
function MoreMenu({ phone, close, hasChart, illustrator, onSave, onLibrary, onNewChart, onIllustrator }: {
  phone: boolean; close: () => void; hasChart: boolean; illustrator: boolean;
  onSave?: () => void; onLibrary: () => void; onNewChart: () => void; onIllustrator: () => void;
}): JSX.Element {
  const { t } = useLanguage();
  const [newOpen, setNewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  return (
    <>
      <div className="flex flex-col">
        {/* Máy tính: Lưu nằm ở thẻ danh tính; điện thoại: cạnh ⋯ VÀ ở đây (artboard M5). */}
        {phone && hasChart && onSave && (
          <MenuRow icon="save" title={t('sheet.save')} hint={t('sheet.saveHint')} testId="sheet-save"
                   onClick={() => { close(); onSave(); }} />
        )}
        {!PUBLIC_EDITION && hasChart && (
          <>
            <MenuRow icon="download" title={t('export.menu')} hint={t('sheet.exportHint')} testId="sheet-export"
                     expanded={exportOpen} onClick={() => setExportOpen(o => !o)} />
            {/* Ba nút xuất do khung làm việc gắn vào đây bằng portal (cần khung xuất ảnh của biểu đồ). */}
            <div id="sheet-export" hidden={!exportOpen} className="ml-12" data-sheet-close="" />
          </>
        )}
        <MenuRow icon="library" title={t('shell.library')} hint={t('sheet.libraryHint')} testId="library-toggle"
                 onClick={() => { close(); onLibrary(); }} />
        {PUBLIC_EDITION ? (
          <MenuRow icon="plus" title={t('shell.newChart')} hint={t('illu.menuBirthHint')} testId="new-chart"
                   onClick={() => { close(); onNewChart(); }} />
        ) : (
          <MenuRow icon="plus" title={t('shell.newChart')} hint={t('sheet.newHint')} testId="new-chart"
                   expanded={newOpen} onClick={() => setNewOpen(o => !o)} />
        )}
        {newOpen && !PUBLIC_EDITION && (
          <div className="ml-12 flex flex-col" role="group" aria-label={t('illu.newMenu')}>
            <SubItem icon="plus" title={t('illu.menuBirth')} hint={t('illu.menuBirthHint')}
                     onClick={() => { close(); onNewChart(); }} testId="new-chart-birth" />
            {!illustrator && (
              <SubItem icon="pen" title={t('illu.title')} hint={t('illu.menuIlluHint')}
                       onClick={() => { close(); onIllustrator(); }} testId="new-chart-illustrator" />
            )}
          </div>
        )}
      </div>
      <div className={`mt-2 space-y-3 border-t border-line pt-3 ${phone ? 'pb-1' : 'px-1'}`}>
        <Settings row={phone} />
      </div>
    </>
  );
}

/** Một dòng của menu ⋯: ô biểu tượng + tên + gợi ý; cao ≥ 52px (artboard `Menus`). */
function MenuRow({ icon, title, hint, onClick, testId, expanded }: {
  icon: 'save' | 'download' | 'library' | 'plus'; title: string; hint: string; onClick: () => void; testId: string;
  expanded?: boolean;
}): JSX.Element {
  return (
    <button type="button" onClick={onClick} data-testid={testId} aria-expanded={expanded}
            className="flex min-h-13 w-full items-center gap-3 rounded-[.875rem] px-2 py-1.5 text-left hover:bg-sunken">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong"><Icon name={icon} size={18} /></span>
      <span className="min-w-0">
        <span className="block text-[length:var(--text-card)] font-semibold text-ink">{title}</span>
        <span className="block text-ui text-ink-2">{hint}</span>
      </span>
    </button>
  );
}

function SubItem({ icon, title, hint, onClick, testId }: {
  icon: 'plus' | 'pen'; title: string; hint: string; onClick: () => void; testId: string;
}): JSX.Element {
  return (
    <button type="button" onClick={onClick} data-testid={testId}
            className="flex min-h-11 w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-sunken">
      <span aria-hidden="true" className="grid size-7.5 shrink-0 place-items-center rounded-full bg-sunken"><Icon name={icon} size={18} /></span>
      <span className="min-w-0">
        {/* `text-control` là MÀU viền nút (token trùng tên cỡ chữ) — ghi cỡ bằng biến. */}
        <span className="block text-[length:var(--text-control)] font-semibold text-ink">{title}</span>
        <span className="block text-xs leading-snug text-ink-2">{hint}</span>
      </span>
    </button>
  );
}

/** THẺ ĐẦU bảng phải (≥ 640px, artboard `Chart-HeaderC`): danh tính chart + nút Lưu. */
export function IdentityCard({ identity, drawerOpen, onOpen, onSave }: {
  identity: Identity; drawerOpen: boolean; onOpen: () => void; onSave: () => void;
}): JSX.Element {
  const { t } = useLanguage();
  return (
    /* `@container`: bảng 14rem (bản đầy đủ ở 1440, luật 8px) không đủ chỗ cho chữ + nút trên một hàng ⇒ nút Lưu xuống dưới. */
    /* Artboard `Chart-HeaderC`: đệm 14 16 14 20, nút Lưu đệm ngang 14 (tablet 44px, đệm 22 trái / 20 nút). */
    <section className="@container card py-3.5 pl-5 pr-4 max-lg:py-3 max-lg:pl-[1.375rem]" data-testid="identity-card" aria-label={t('shell.drawerTitle')}>
      <div className="flex flex-col items-stretch gap-2 @min-[16rem]:flex-row @min-[16rem]:items-center @min-[16rem]:gap-2.5">
        <IdentityButton identity={identity} drawerOpen={drawerOpen} onClick={onOpen} />
        <button type="button" onClick={onSave} data-testid="save-chart" className="btn btn-primary shrink-0 px-3.5 max-lg:min-h-11 max-lg:px-5">{t('shell.save')}</button>
      </div>
    </section>
  );
}
