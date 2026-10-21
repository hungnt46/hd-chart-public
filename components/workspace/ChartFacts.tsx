'use client';
/**
 * Bảng thuộc tính của chart — `data-testid="chart-summary"`.
 *
 * ★ Giao diện D (Hưng duyệt 2026-10-04, docs/PLAN-giao-dien-D.md): thẻ Type (tiêu
 *   đề lớn "Người Kiến Tạo", dòng dưới "Generator", rồi Chiến lược · Thẩm quyền ·
 *   Dạng xác định · Hồ sơ) · thẻ Thập tự (tên Việt đậm / tên Anh + bộ cổng) ·
 *   Trung tâm xác định (chip có ô màu) · Kênh · dòng UTC + "Tra cứu chi tiết →".
 *   Thẻ đầu đứng ĐẦU bảng phải — không nút nào chen lên trên nó (luật hướng A).
 *
 * ★ Thứ bậc đổi 2026-09-25 (audit F11): trước đây dòng ĐẦU là bản ghi kỹ thuật
 *   "UT … · offset … · nguồn iana", đứng trên cả Type. Nay Type đứng đầu, bản ghi
 *   quy đổi giờ xuống cuối, chữ nhỏ. Bản ghi đó VẪN luôn hiện và LUÔN là UT (luật ngoại lệ của
 *   công tắc giờ, STATUS §5 #18) — nó là trường `utIso` duy nhất ảnh hưởng kết
 *   quả, không được giấu sau một nút.
 *
 * `data-field` mang NHÃN đang hiện (theo ngôn ngữ) — e2e đọc ô bằng nhãn đó.
 */
import type { JSX, ReactNode } from 'react';
import type { RaveChart } from '../../calc-core/rave/chart.js';
import type { UTResolution } from '../../lib/time/resolveUT.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import type { UiKey } from '../../i18n/ui/index.js';
import {
  authorityName, centerShortName, crossDisplayName, crossParts, definitionName, profileName,
  strategyName, typeName, typeParts,
} from '../../i18n/terms.js';
import { useMedia } from './ChartCanvas.js';
import { Icon } from '../ui/Icon.js';
import { PUBLIC_EDITION } from '../../lib/edition.js';
import { CreditInfo } from '../shell/AboutCredits.js';
/* Tên kênh là DỮ KIỆN chuẩn (hd-names), không sau cờ nội dung — Hưng chốt 2026-09-28. */
import { channelName } from '../../i18n/hd-names/index.js';

/**
 * Offset GỌN cho dòng UTC (Hưng 2026-09-25: "+7:00 thành +7"): +7 · +5:30 · −3 ·
 * LMT có giây thì giữ giây (+7:06:30) — số lẻ đó chính là thông tin.
 */
export function shortOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+';
  const total = Math.round(Math.abs(minutes) * 60);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${sign}${h}${m || s ? `:${p2(m)}` : ''}${s ? `:${p2(s)}` : ''}`;
}

export function chartRows(chart: RaveChart, lang: 'en' | 'vi', t: ReturnType<typeof useLanguage>['t']): [string, string][] {
  return [
    [t('prop.type'), typeName(chart.type, lang)],
    [t('prop.authority'), authorityName(chart.authority, chart.type, lang, t)],
    [t('prop.profile'), profileName(chart.profile, lang)],
    [t('prop.definition'), definitionName(chart.definition, lang)],
    [t('prop.cross'), chart.cross ? crossDisplayName(chart.cross, lang) : '—'],
  ];
}

export function ChartFacts({ chart, utcDate, resolution, lookup = true, className = '' }: {
  chart: RaveChart; utcDate: Date; resolution: UTResolution;
  /** Thẻ "Tra cứu" dẫn xuống phần tra cứu chi tiết — tắt ở tab không có phần đó (Transit). */
  lookup?: boolean;
  className?: string;
}): JSX.Element {
  const { lang, t } = useLanguage();
  /* Điện thoại (mockup M3): dòng kênh BẤM được (› dẫn tới tab Kênh của Tra cứu) và thẻ "Tra cứu chi tiết · N cổng ›". */
  const phone = useMedia('(max-width: 639.98px)');
  const channels = [...chart.definedChannels]
    .map(ch => ({ ch, pair: [...ch.gates].sort((a, b) => a - b) }))
    .sort((x, y) => x.pair[0]! - y.pair[0]! || x.pair[1]! - y.pair[1]!);

  /* Xuống phần tra cứu chi tiết và đưa focus theo — người dùng bàn phím không bị bỏ lại trên bảng phải. */
  const openDetails = () => {
    const sec = document.querySelector<HTMLElement>('[data-testid=chart-details]');
    const h = sec?.querySelector<HTMLElement>('h2, h3');
    sec?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  };
  const openChannels = () => {
    document.querySelector<HTMLButtonElement>('[data-testid=detail-tab-channels]')?.click();
    openDetails();
  };

  const type = typeParts(chart.type, lang);
  const cross = chart.cross ? crossParts(chart.cross, lang) : null;
  /*
   * Hồ sơ: CHỈ cặp số ("2/4" — tiếng Anh "2 / 4"), bỏ tên hồ sơ (Aura, Hưng chốt 2026-10-21, mục B7: tên đầy đủ
   * làm thẻ Type cao thêm ba dòng). `profileName` (tên kèm tiếng Anh trong ngoặc) giữ nguyên cho chỗ khác dùng.
   */
  const profile = profileName(chart.profile, lang).split(' - ')[0]!;
  const props: [string, ReactNode][] = [
    [t('prop.strategy'), strategyName(chart.type, lang)],
    [t('prop.authority'), authorityName(chart.authority, chart.type, lang, t)],
    [t('prop.definition'), definitionName(chart.definition, lang)],
    [t('prop.profile'), profile],
  ];

  return (
    /*
     * ★ Aura (Hưng duyệt 2026-10-21, artboard `Chart-HeaderC`): thẻ Type nền `sun` — tiêu đề
     *   Newsreader "Người Kiến Tạo", dòng dưới "Generator", rồi Chiến lược · Thẩm quyền · Dạng xác
     *   định · Hồ sơ với NHÃN chữ hoa `dawn` TRÊN giá trị · thẻ Thập tự (tên Newsreader / tên Anh +
     *   bộ cổng) · Trung tâm xác định · N (viên) · Kênh · N (viên cặp cổng) · dòng UTC.
     * ★ `@container`: dáng theo bề ngang CỦA BẢNG, không theo màn — bảng 14rem (bản đầy đủ 1440,
     *   luật 8px) ⇒ tiêu đề 24px, thuộc tính một cột; ≥ 17rem ⇒ hai cột; ≥ 20rem ⇒ tiêu đề 34px, đệm 24.
     *   Điện thoại (artboard `Chart-Mobile`): đệm 20, tiêu đề 30px. ≥ 40rem (bảng rơi xuống dưới biểu đồ:
     *   tablet và 1024–1399px, artboard `Tablet`): LƯỚI 2 cột — Type chiếm hai hàng (tiêu đề 32px), Thập tự
     *   và Trung tâm bên phải, Kênh trải 2 cột; bản công khai in Trung tâm / Kênh thành MỘT dòng chữ.
     */
    <div className={`@container ${className}`} data-testid="chart-summary">
    <div className="space-y-3 @min-[40rem]:grid @min-[40rem]:grid-cols-2 @min-[40rem]:items-start @min-[40rem]:gap-3.5 @min-[40rem]:space-y-0">
    <section className="card card-sun p-5 sm:@min-[20rem]:px-6 sm:@min-[20rem]:py-[1.375rem] sm:@min-[40rem]:px-[1.375rem] @min-[40rem]:row-span-2" aria-labelledby="facts-h">
      <h2 id="facts-h" className="sr-only">{t('facts.heading')}</h2>
      {/* Hưng chốt: tiêu đề lớn là Type, dòng dưới tên Anh — KHÔNG nhãn "Type". */}
      <p className="display text-2xl leading-[1.05] max-sm:text-3xl sm:@min-[20rem]:text-[length:var(--text-type)] sm:@min-[40rem]:text-[length:var(--text-type-md)]"
         data-field={t('prop.type')}>{type.main}</p>
      {type.sub && <p className="mt-1 text-sm text-ink-2" data-testid="type-sub">{type.sub}</p>}

      <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 @min-[17rem]:grid-cols-2">
        {props.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="card-heading">{k}</dt>
            <dd className="mt-0.5 text-[length:var(--text-card)] leading-snug" data-field={k}>{v}</dd>
          </div>
        ))}
      </dl>
    </section>

    {cross && (
      <section className="card px-5 py-[1.125rem] sm:@min-[20rem]:px-6 sm:@min-[40rem]:px-[1.375rem]" aria-labelledby="cross-h">
        <h3 id="cross-h" className="card-heading mb-1.5">{t('prop.cross')}</h3>
        <div data-field={t('prop.cross')}>
          <p className="display text-xl leading-tight tracking-normal">{cross.name}</p>
          <p className="mt-1 text-sm text-ink-2">{[cross.en, cross.gates].filter(Boolean).join(' · ')}</p>
        </div>
      </section>
    )}

      <section className="card px-5 py-[1.125rem] sm:@min-[20rem]:px-6 sm:@min-[40rem]:px-[1.375rem]" aria-labelledby="centers-h">
        <h3 id="centers-h" className="card-heading mb-2.5">
          {t('facts.centers')} <span className="tabular-nums">· {chart.definedCenters.size}</span>
        </h3>
        {chart.definedCenters.size ? (
          <>
            <ul className={`flex flex-wrap gap-1.5 ${lookup ? '' : '@min-[40rem]:sr-only'}`}>
              {[...chart.definedCenters].map(id => (
                <li key={id} className="rounded-full border border-line-strong px-2.5 py-1 text-ui">{centerShortName(id, lang)}</li>
              ))}
            </ul>
            {!lookup && (
              <p className="hidden text-sm leading-relaxed @min-[40rem]:block" aria-hidden="true">
                {[...chart.definedCenters].map(id => centerShortName(id, lang)).join(' · ')}
              </p>
            )}
          </>
        ) : <p className="text-ui">{t('summary.noCenters')}</p>}
      </section>

      <section className="card px-5 py-[1.125rem] sm:@min-[20rem]:px-6 sm:@min-[40rem]:px-[1.375rem] @min-[40rem]:col-span-2" aria-labelledby="channels-h">
        <h3 id="channels-h" className="card-heading mb-2.5">
          {t('facts.channelsTitle')} <span className="tabular-nums">· {channels.length}</span>
        </h3>
        {channels.length > 0 && !lookup && (
          <p className="hidden text-sm @min-[40rem]:block" aria-hidden="true">{channels.map(({ pair }) => pair.join('–')).join(' · ')}</p>
        )}
        {channels.length > 0 && (
          <ul className={`flex flex-wrap gap-1.5 ${lookup ? '' : '@min-[40rem]:sr-only'}`}>
            {channels.map(({ ch, pair }) => {
              /* Tên kênh (dữ kiện) ở `title` + nhãn truy cập — viên chỉ in cặp cổng như artboard. */
              const name = channelName(ch.id, lang);
              const label = pair.join('–');
              const cls = 'inline-flex min-h-7 items-center rounded-full bg-sunken px-2.5 text-ui tabular-nums';
              return (
                /* Có Tra cứu (bản đầy đủ) ⇒ viên BẤM được, dẫn tới tab Kênh của Tra cứu. */
                <li key={ch.id}>
                  {lookup ? (
                    /* Vùng bấm 44px ở cảm ứng / < 640px, 28px với chuột — viên nhìn vẫn 28px (span bên trong). */
                    <button type="button" onClick={openChannels} data-testid={`facts-channel-${pair.join('-')}`}
                            title={name} aria-label={`${label} · ${name}`}
                            className="group inline-flex min-h-11 items-center mouse:min-h-7">
                      <span className={`${cls} group-hover:bg-line`}>{label}</span>
                    </button>
                  ) : <span className={cls} title={name}>{label}<span className="sr-only"> · {name}</span></span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {lookup && phone && (
        <button type="button" onClick={openDetails} data-testid="open-details"
                className="card flex min-h-13 @min-[40rem]:col-span-2 w-full items-center justify-between px-5 text-left text-[length:var(--text-input)] font-semibold">
          {t('facts.lookupGates', { n: chart.definedGates.size })}
          <Icon name="chevronRight" size={18} className="text-ink-3" />
        </button>
      )}

      {/* Dòng cuối: bản ghi quy đổi giờ — luôn UT, xem ghi chú đầu tệp — và lối xuống Tra cứu. */}
      {/* `relative`: hộp ghi công (nút "i") neo vào CẢ dòng này, không vào nút 11px — neo vào nút thì hộp 250px
          tràn ngang màn điện thoại và bị bảng phải cắt. */}
      <div className="relative px-2 text-ui leading-snug text-ink-2 sm:@min-[40rem]:text-xs @min-[40rem]:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          {/* Hưng 2026-09-25: bỏ "offset"/"nguồn iana", ngày–giờ cách bằng khoảng trắng, offset ghi "UTC +7".
              2026-09-29: bỏ luôn chữ "UTC" ở ĐẦU dòng — "UTC +7" ở cuối đã nói rõ đây là giờ UTC. */}
          <div className="flex items-center gap-3 tabular-nums">
            <span><span data-testid="ut-value">{utcDate.toISOString().slice(0, 16).replace('T', ' ')}</span>
            {' · '}<span data-testid="ut-offset">{t('summary.ut')} {shortOffset(resolution.offsetMinutes)}</span></span>
            {PUBLIC_EDITION && <CreditInfo />}
          </div>
          {lookup && !phone && (
            <button type="button" onClick={openDetails} data-testid="open-details" className="link-action text-sm"
                    title={t('facts.lookupCount', { g: chart.definedGates.size, c: chart.definedChannels.length })}>
              {t('facts.lookupLink')} <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
        {resolution.confidence === 'low' && (
          <p className="mt-1.5">
            <span className="tag" data-testid="low-confidence">
              {t('summary.lowConfidence')}
            </span>
          </p>
        )}
        {/* Ghi chú đến từ `lib/time` dưới dạng MÃ + tham số; câu chữ dựng ở đây. */}
        {resolution.notes.map(n => (
          <p key={n.code} className="mt-1.5 text-ink-2" data-note={n.code}>
            {t(`note.${n.code}` as UiKey, n.vars)}
          </p>
        ))}
      </div>
    </div>
    </div>
  );
}
