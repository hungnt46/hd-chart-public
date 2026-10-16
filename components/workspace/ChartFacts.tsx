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
  authorityName, centerShortName, channelShortName, crossDisplayName, crossParts, definitionName, profileName,
  strategyName, typeName, typeParts,
} from '../../i18n/terms.js';
import { useChartTheme } from '../bodygraph/CompositePaletteProvider.js';
import { THEMES } from '../bodygraph/theme.js';
import { useMedia } from './ChartCanvas.js';
import { Icon } from '../ui/Icon.js';
import { PUBLIC_EDITION } from '../../lib/edition.js';
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
  const { theme } = useChartTheme();
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
  const centerFill = THEMES[theme].centerFill;
  /* Hồ sơ: phần chêm tiếng Anh trong ngoặc in chữ thường màu phụ, như mockup D. */
  const profile = profileName(chart.profile, lang).replace(/^(\d\/\d) - /, '$1 · ');
  const profileTail = /\s*(\([^()]*\))\s*$/.exec(profile);
  const props: [string, ReactNode][] = [
    [t('prop.strategy'), strategyName(chart.type, lang)],
    [t('prop.authority'), authorityName(chart.authority, chart.type, lang, t)],
    [t('prop.definition'), definitionName(chart.definition, lang)],
    [t('prop.profile'), profileTail
      ? <>{profile.slice(0, profileTail.index)} <span className="font-normal text-ink-3">{profileTail[1]}</span></>
      : profile],
  ];

  return (
    /*
     * ★ `@container`: thẻ Type đổi dáng theo bề ngang CỦA BẢNG, không theo màn —
     *   bảng 14rem (≥ 1400px, luật 8px) ⇒ tiêu đề 24px, nhãn TRÊN giá trị; ≥ 20rem
     *   (điện thoại, bảng nở ≥ 1600px, bảng rơi xuống dưới < 1400px) ⇒ hai cột
     *   nhãn | giá trị; ≥ 22rem ⇒ tiêu đề 36px. Plan giao diện D §0.
     *   BẢN CÔNG KHAI (STATUS §5 #72): bảng 20rem ở 1440 ⇒ hai cột chỉ từ 22rem — ở 20rem hai cột làm giá trị
     *   ("Thẩm Quyền Xương Cùng") xuống dòng; nhãn TRÊN giá trị thì vừa một dòng.
     */
    <div className={`@container space-y-3.5 ${className}`} data-testid="chart-summary">
    <section className="card px-5 pb-2 pt-5" aria-labelledby="facts-h">
      <h2 id="facts-h" className="sr-only">{t('facts.heading')}</h2>
      {/* Hưng chốt: tiêu đề lớn là Type, dòng dưới tên Anh — KHÔNG nhãn "Type". */}
      <p className="text-2xl font-bold leading-[1.08] tracking-tight @min-[20rem]:text-3xl @min-[22rem]:text-4xl"
         data-field={t('prop.type')}>{type.main}</p>
      {type.sub && <p className="mt-1 text-base text-ink-3" data-testid="type-sub">{type.sub}</p>}

      <dl className="mt-4 text-prop leading-snug">
        {props.map(([k, v]) => (
          <div key={k} className={`border-t border-line py-2.5 ${PUBLIC_EDITION
            ? '@min-[22rem]:grid @min-[22rem]:grid-cols-[6.75rem_minmax(0,1fr)] @min-[22rem]:gap-x-3.5'
            : '@min-[20rem]:grid @min-[20rem]:grid-cols-[6.75rem_minmax(0,1fr)] @min-[20rem]:gap-x-3.5'}`}>
            <dt className="text-ink-3">{k}</dt>
            <dd className="font-medium" data-field={k}>{v}</dd>
          </div>
        ))}
      </dl>
    </section>

    {cross && (
      <section className="card px-5 py-4" aria-labelledby="cross-h">
        <h3 id="cross-h" className="mb-1.5 text-ui text-ink-3">{t('prop.cross')}</h3>
        <div data-field={t('prop.cross')}>
          <p className="text-base font-bold leading-snug">{cross.name}</p>
          <p className="mt-0.5 text-ui text-ink-3">{[cross.en, cross.gates].filter(Boolean).join(' · ')}</p>
        </div>
      </section>
    )}

      <section className="card px-5 py-4" aria-labelledby="centers-h">
        <h3 id="centers-h" className="card-heading mb-2.5 flex justify-between gap-2">
          <span>{t('facts.centers')}</span>
          <span className="font-normal text-ink-3 tabular-nums">{chart.definedCenters.size} / 9</span>
        </h3>
        {chart.definedCenters.size ? (
          <ul className="flex flex-wrap gap-1.5">
            {[...chart.definedCenters].map(id => (
              <li key={id} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-ui">
                {/* Ô màu đọc từ bảng màu chủ đề đang dùng — vỏ không tự viết số màu HD. */}
                <span aria-hidden="true" className="size-2.5 rounded-[3px]"
                      style={{ background: centerFill[id], boxShadow: `inset 0 0 0 1px ${THEMES[theme].centerStroke}` }} />
                {centerShortName(id, lang)}
              </li>
            ))}
          </ul>
        ) : <p className="text-ui">{t('summary.noCenters')}</p>}
      </section>

      <section className="card px-5 py-4" aria-labelledby="channels-h">
        <h3 id="channels-h" className="card-heading mb-1 flex justify-between gap-2">
          <span>{t('facts.channelsTitle')}</span>
          <span className="font-normal text-ink-3 tabular-nums">{channels.length}</span>
        </h3>
        {channels.length > 0 && (
          <ul className="text-sm max-sm:mt-2 max-sm:text-[length:var(--text-input)]">
            {channels.map(({ ch, pair }) => {
              const name = channelName(ch.id, lang);
              const body = (
                <>
                  <span className="min-w-[3.375rem] shrink-0 rounded-lg bg-sunken px-2 py-1 text-center font-semibold tabular-nums max-sm:font-bold">{pair.join('–')}</span>
                  <span className="truncate" title={name}>{channelShortName(name)}</span>
                </>
              );
              return (
                /* Không có Tra cứu (bản công khai, `lookup` tắt) ⇒ dòng kênh là chữ thường, không bấm. */
                <li key={ch.id} className={!phone ? 'flex items-center gap-3 py-1.5' : lookup ? 'border-t border-line' : 'flex min-h-12 items-center gap-3 border-t border-line'}>
                  {phone && lookup ? (
                    <button type="button" onClick={openChannels} data-testid={`facts-channel-${pair.join('-')}`}
                            className="flex min-h-12 w-full items-center gap-3 text-left">
                      {body}
                      <Icon name="chevronRight" size={18} className="ml-auto shrink-0 text-ink-3" />
                    </button>
                  ) : body}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {lookup && phone && (
        <button type="button" onClick={openDetails} data-testid="open-details"
                className="card flex min-h-13 w-full items-center justify-between px-5 text-left text-[length:var(--text-input)] font-semibold">
          {t('facts.lookupGates', { n: chart.definedGates.size })}
          <Icon name="chevronRight" size={18} className="text-ink-3" />
        </button>
      )}

      {/* Dòng cuối: bản ghi quy đổi giờ — luôn UT, xem ghi chú đầu tệp — và lối xuống Tra cứu. */}
      <div className="px-1 text-ui leading-snug text-ink-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          {/* Hưng 2026-09-25: bỏ "offset"/"nguồn iana", ngày–giờ cách bằng khoảng trắng, offset ghi "UTC +7".
              2026-09-29: bỏ luôn chữ "UTC" ở ĐẦU dòng — "UTC +7" ở cuối đã nói rõ đây là giờ UTC. */}
          <p className="tabular-nums">
            <span data-testid="ut-value">{utcDate.toISOString().slice(0, 16).replace('T', ' ')}</span>
            {' · '}<span data-testid="ut-offset">{t('summary.ut')} {shortOffset(resolution.offsetMinutes)}</span>
          </p>
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
  );
}
