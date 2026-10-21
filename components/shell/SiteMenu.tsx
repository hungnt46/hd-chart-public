'use client';
/**
 * Nút HAI VẠCH + bảng menu WEBSITE (artboard `SiteMenu`, Aura phương án C — Hưng duyệt
 * 2026-10-21). App tự vẽ header kiểu website (trang /chart/ ẩn header của nó), nên lối về
 * các trang khác của humandesign.vn nằm ở đây. Danh sách link: `lib/site-links.ts`.
 *
 * Bảng là `<dialog>` gốc mở bằng `showModal()` (trơ phần còn lại, bẫy focus, Esc đóng —
 * như `BottomSheet`), trượt từ phải, rộng tối đa 420px. Link mở ở cửa sổ CHA
 * (`target="_top"`): trong iframe /chart/ bấm "Trang Chủ" phải rời cả iframe.
 */
import { useEffect, useRef, useState, type JSX } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { SITE_LINKS } from '../../lib/site-links.js';
import { Icon } from '../ui/Icon.js';
import { Brand } from './Brand.js';

export function SiteMenu(): JSX.Element {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) { d.close(); btn.current?.focus(); }
  }, [open]);
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const onCancel = (e: Event) => { e.preventDefault(); setOpen(false); };
    d.addEventListener('cancel', onCancel);
    return () => d.removeEventListener('cancel', onCancel);
  }, []);

  return (
    <>
      <button ref={btn} type="button" onClick={() => setOpen(true)} aria-label={t('site.open')} aria-haspopup="dialog"
              aria-expanded={open} data-testid="site-menu" className="btn btn-ghost btn-icon size-11 shrink-0">
        <Icon name="twoLines" size={22} />
      </button>
      <dialog ref={dlg} aria-label={t('site.nav')} data-testid="site-menu-panel"
              className="side m-0 ml-auto h-full max-h-none w-full max-w-[26.25rem] bg-transparent p-0 backdrop:bg-ink/40"
              onClick={e => { if (e.target === dlg.current) setOpen(false); }}>
        <nav aria-label={t('site.nav')}
             className="flex min-h-full flex-col rounded-l-[1.75rem] bg-page px-6 pb-8 pt-3 sm:px-8"
             style={{ paddingTop: 'max(.75rem, env(safe-area-inset-top))' }}>
          <div className="flex min-h-14 items-center justify-between gap-3">
            <Brand />
            <button type="button" onClick={() => setOpen(false)} aria-label={t('site.close')}
                    data-testid="site-menu-close" className="btn btn-ghost btn-icon"><Icon name="close" size={22} /></button>
          </div>
          <ul className="mt-6">
            {SITE_LINKS.map(l => (
              <li key={l.key}>
                <a href={l.href} target="_top" aria-current={l.current ? 'page' : undefined}
                   className="display flex min-h-15 items-center justify-between gap-3 border-t border-line text-[length:var(--text-site-menu)] text-ink no-underline hover:text-dawn">
                  {t(l.key)}
                  {l.current
                    ? <span className="font-sans text-xs font-semibold uppercase tracking-[.12em] text-dawn">{t('site.here')}</span>
                    : <Icon name="arrowRight" size={20} className="text-ink-2" />}
                </a>
              </li>
            ))}
          </ul>
          <p className="display mt-auto pt-8 text-lg leading-snug text-ink-2">{t('site.motto')}</p>
        </nav>
      </dialog>
    </>
  );
}
