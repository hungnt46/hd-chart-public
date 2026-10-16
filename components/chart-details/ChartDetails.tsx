'use client';
/**
 * Tra cứu chi tiết — SPEC §10.3.
 *
 * Diễn giải lấy qua `i18n/hd-content/index.ts` (SPEC §3.2). Khi cờ
 * `NEXT_PUBLIC_HD_CONTENT_BUNDLED=false`, mọi hàm trả `null` và component này
 * hiện placeholder — **không** được vỡ, không được để trống lặng lẽ.
 *
 * ★ Đổi 2026-09-25 (Hưng chốt, audit F4 + F14): cổng là DANH MỤC THU GỌN — mỗi
 *   dòng chỉ số cổng · tên · thiên thể nào kích hoạt; bấm mở mới hiện câu khoá
 *   và các hào. Trước đây 22 thẻ mở sẵn toàn văn, trang dài 7 900px. Có nút
 *   "Mở tất cả" cho ai muốn đọc liền (và để in).
 *   Kèm: tiêu đề không còn lặp "Cổng 1  Cổng 1: …", tên thiên thể theo ngôn ngữ
 *   (trước ghi "SouthNode" ở giao diện Việt), và ký hiệu ● / ◑ có chú giải.
 *
 * ★ Đổi 2026-09-28 (docs/PLAN-planetary-influence.md Phase 3 bước 4): TÊN cổng /
 *   kênh là dữ kiện chuẩn, lấy từ `i18n/hd-names/` ⇒ hiện cả khi TẮT cờ nội
 *   dung. Chỉ keynote và các hào còn sau cờ. Nhãn "bản EN" (dự phòng ngôn ngữ)
 *   vì thế đi theo KEYNOTE — tên luôn đúng ngôn ngữ nên gắn nhãn cạnh tên là
 *   nói sai về tên.
 */
import { useId, useMemo, useState, type JSX } from 'react';
import type { RaveChart } from '../../calc-core/rave/chart.js';
import { DEFINING_BODIES_STANDARD, type Body } from '../../calc-core/ephemeris/bodies.js';
import {
  centerContent, channelContent, gateContent, isContentBundled, lineContent,
} from '../../i18n/hd-content/index.js';
import { channelName, gateName } from '../../i18n/hd-names/index.js';
import type { Lang } from '../../i18n/ui/index.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { centerName, planetName } from '../../i18n/terms.js';
import { FixingNotes, hasFixingNotes } from './FixingNotes.js';
import { Icon } from '../ui/Icon.js';
import { CLASSIC } from '../bodygraph/theme.js';
import { TabList, panelId as tabPanelId, tabId } from '../ui/Tabs.js';

export interface ChartDetailsProps {
  chart: RaveChart;
  lang?: Lang;
}

type Tab = 'gates' | 'channels' | 'centers';

const TABS: readonly Tab[] = ['gates', 'channels', 'centers'];
const TAB_KEY = {
  gates: 'details.tab.gates', channels: 'details.tab.channels', centers: 'details.tab.centers',
} as const;
const WHAT_KEY = {
  gates: 'details.what.gates', channels: 'details.what.channels', centers: 'details.what.centers',
} as const;

/** Màu Design dùng chung với cột hành tinh — đạt 4.71:1 trên nền trắng. Lấy từ theme, không chép số. */
const DESIGN_TEXT = CLASSIC.design;

/** Nhãn "đang dùng bản tiếng Anh" khi bản dịch KEYNOTE khuyết (tên cổng / kênh thì luôn đủ). */
function FallbackTag(
  { resolved, lang, label }: { resolved: Lang | null; lang: Lang; label: (l: string) => string },
): JSX.Element | null {
  if (!resolved || resolved === lang) return null;
  return (
    <span className="tag ml-2" data-testid="lang-fallback">{label(resolved.toUpperCase())}</span>
  );
}

interface Activation { side: 'personality' | 'design'; body: Body; line: number }

export function ChartDetails({ chart, lang: langProp }: ChartDetailsProps): JSX.Element {
  const ctx = useLanguage();
  const lang = langProp ?? ctx.lang;
  const t = ctx.t;
  const uid = useId();
  const [tab, setTab] = useState<Tab>('gates');
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const bundled = isContentBundled();
  const fallbackLabel = (l: string) => t('details.fallbackTag', { lang: l });
  /* `.empty` ngắt được tên cờ NEXT_PUBLIC_HD_CONTENT_BUNDLED — không ngắt thì tràn ngang 3px ở 375px (bắt được bằng `verify:no-content`). */
  const placeholder = (what: Tab) => (
    <p className="empty" data-testid="content-placeholder">
      {t('details.placeholder', {
        what: t(WHAT_KEY[what]),
        flag: 'NEXT_PUBLIC_HD_CONTENT_BUNDLED=false',
      })}
    </p>
  );

  /**
   * Mỗi cổng đã kích hoạt, kèm những dòng (line) thực sự xuất hiện.
   *
   * Dùng ĐÚNG 13 thiên thể xác định (không Chiron) — cùng bộ mà bodygraph dùng.
   * Nếu liệt kê cả Chiron thì danh sách có cổng KHÔNG xuất hiện trên bodygraph,
   * người đọc sẽ tưởng hình vẽ thiếu. Xem ghi chú CHIRON trong
   * calc-core/ephemeris/bodies.ts.
   */
  const gateRows = useMemo(() => {
    const byGate = new Map<number, { acts: Activation[]; lines: Set<number> }>();
    for (const side of ['personality', 'design'] as const) {
      for (const b of DEFINING_BODIES_STANDARD) {
        const a = chart[side].byBody[b];
        if (!a) continue;
        const e = byGate.get(a.position.gate) ?? { acts: [], lines: new Set<number>() };
        e.acts.push({ side, body: b, line: a.position.line });
        e.lines.add(a.position.line);
        byGate.set(a.position.gate, e);
      }
    }
    return [...byGate.entries()].sort((x, y) => x[0] - y[0]);
  }, [chart]);

  const allOpen = gateRows.length > 0 && gateRows.every(([g]) => open.has(g));
  const toggle = (g: number) => setOpen(prev => {
    const n = new Set(prev);
    if (n.has(g)) n.delete(g); else n.add(g);
    return n;
  });

  const counts: Record<Tab, string> = {
    gates: String(gateRows.length),
    channels: String(chart.definedChannels.length),
    centers: `${chart.definedCenters.size}/9`,
  };

  return (
    <section className="card p-4 sm:p-5" data-testid="chart-details" aria-labelledby={`${uid}-h`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${uid}-h`} className="section-title">{t('details.heading')}</h2>
        {tab === 'gates' && gateRows.length > 0 && (
          <button type="button" className="btn btn-ghost" aria-pressed={allOpen} data-testid="details-expand-all"
                  onClick={() => setOpen(allOpen ? new Set() : new Set(gateRows.map(([g]) => g)))}>
            {allOpen ? t('details.collapseAll') : t('details.expandAll')}
          </button>
        )}
      </div>

      {/* Số đếm vẽ bằng CSS (`::after`) để chữ của tab vẫn đúng là tên nhóm. */}
      <TabList label={t('details.tablist')} tabs={TABS} value={tab} onChange={setTab} idBase={uid}
               className="mt-3 flex flex-wrap gap-1" renderLabel={k => t(TAB_KEY[k])}
               tabProps={k => ({ 'data-testid': `detail-tab-${k}`, 'data-count': counts[k] })} />

      {/* Render CẢ BA panel, ẩn cái không hoạt động: giữ cấu trúc trong DOM để
          kiểm chứng được và để lần vẽ đầu không phụ thuộc JS. */}
      <div hidden={tab !== 'gates'} role="tabpanel" id={tabPanelId(uid, 'gates')} aria-labelledby={tabId(uid, 'gates')}>
        <div className="mt-3" data-testid="detail-gates">
          <p className="hint flex flex-wrap gap-x-4 gap-y-1">
            <span>{t('details.gateCount', { n: gateRows.length })}</span>
            <span><span aria-hidden="true">● </span>{t('summary.personality')}</span>
            <span style={{ color: DESIGN_TEXT }}><span aria-hidden="true">◑ </span>{t('summary.design')}</span>
          </p>
          {!bundled && <div className="mt-2">{placeholder('gates')}</div>}
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {gateRows.map(([gate, info]) => {
              const g = gateContent(gate, lang);
              const isOpen = open.has(gate);
              const panelId = `${uid}-gate-${gate}`;
              return (
                <li key={gate} data-gate-detail={gate} data-open={isOpen}>
                  <h3>
                    <button type="button" aria-expanded={isOpen} aria-controls={panelId}
                            onClick={() => toggle(gate)} data-testid={`gate-toggle-${gate}`}
                            className="flex min-h-12 w-full items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-subtle">
                      <span aria-hidden="true"
                            className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken text-sm font-semibold tabular-nums">
                        {gate}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="sr-only">{t('details.gate', { n: gate })} </span>
                        <span className="block text-sm font-medium leading-snug" data-gate-name>
                          {gateName(gate, lang)}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug">
                          {info.acts.map((a, i) => (
                            <span key={`${a.side}${a.body}`} style={a.side === 'design' ? { color: DESIGN_TEXT } : undefined}
                                  className={a.side === 'design' ? '' : 'text-ink-2'}>
                              {i > 0 && <span className="text-ink-3"> · </span>}
                              <span aria-hidden="true">{a.side === 'design' ? '◑' : '●'} </span>
                              <span className="sr-only">{t(a.side === 'design' ? 'summary.design' : 'summary.personality')}: </span>
                              {planetName(a.body, lang)} {a.line}
                            </span>
                          ))}
                        </span>
                      </span>
                      <Icon name="chevronDown" className={`shrink-0 text-ink-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </h3>
                  <div id={panelId} hidden={!isOpen} className="pb-3 pl-12 pr-2">
                    {g.value?.keynote && (
                      <p className="text-sm leading-relaxed text-ink">
                        {g.value.keynote}
                        <FallbackTag resolved={g.resolved} lang={lang} label={fallbackLabel} />
                      </p>
                    )}
                    {[...info.lines].sort((a, b) => a - b).map(line => {
                      const l = lineContent(gate, line, lang);
                      // Ký hiệu fixing là DỮ KIỆN ⇒ khối hào vẫn hiện khi cờ nội dung tắt.
                      if (!l.value && !hasFixingNotes(gate, line, null)) return null;
                      return (
                        <div key={line} className="mt-3 border-l-2 border-line pl-3" data-line-detail={`${gate}.${line}`}>
                          <p className="text-xs font-semibold">
                            {t('details.line', { n: line })}{l.value?.name && <span className="ml-1 font-normal text-ink-2">— {l.value.name}</span>}
                          </p>
                          {/* "Blue keynote" của sách Rave I'Ching — dưới tên hào, trên câu thế vượng; nhiều hào không có. */}
                          {l.value?.blue && <p className="keynote mt-1 text-xs" data-blue-keynote>{l.value.blue}</p>}
                          <FixingNotes gate={gate} line={line} lang={lang} text={l.value} />
                          {l.value && !l.value.exalted && !l.value.detriment && (
                            <p className="mt-1 text-xs text-ink-3" data-testid="source-gap">
                              {t('details.sourceGap')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div hidden={tab !== 'channels'} role="tabpanel" id={tabPanelId(uid, 'channels')} aria-labelledby={tabId(uid, 'channels')}>
        <div className="mt-3 space-y-2" data-testid="detail-channels">
          <p className="hint">{t('details.channelCount', { n: chart.definedChannels.length })}</p>
          {!bundled && placeholder('channels')}
          {chart.definedChannels.length === 0 && (
            <p className="empty" data-testid="details-no-channels">{t('details.noChannels')}</p>
          )}
          <ul className="divide-y divide-line border-y border-line">
            {chart.definedChannels.map(ch => {
              const c = channelContent(ch.id, lang);
              const label = t('details.channel', { pair: ch.gates.join('–') });
              return (
                <li key={ch.gates.join('-')} className="flex gap-3 py-3" data-channel-detail={ch.gates.join('-')}>
                  <span aria-hidden="true" className="w-14 shrink-0 text-sm font-semibold tabular-nums">{ch.gates.join('–')}</span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium">
                      <span className="sr-only">{label} </span><span data-channel-name>{channelName(ch.id, lang)}</span>
                    </h3>
                    {c.value?.keynote && (
                      <p className="mt-0.5 text-sm text-ink-2">
                        {c.value.keynote}
                        <FallbackTag resolved={c.resolved} lang={lang} label={fallbackLabel} />
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div hidden={tab !== 'centers'} role="tabpanel" id={tabPanelId(uid, 'centers')} aria-labelledby={tabId(uid, 'centers')}>
        <div className="mt-3 space-y-2" data-testid="detail-centers">
          {!bundled && placeholder('centers')}
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(id => {
              const defined = chart.definedCenters.has(id);
              /*
               * ★ Tên trung tâm lấy từ `hd-terms` (bản dịch của Hưng), KHÔNG từ
               *   kho nội dung: kho ghi "Trung tâm Gốc (Root Center)" — chêm tiếng
               *   Anh, trái luật trình bày (Hưng chốt 2026-09-25: trung tâm thuần
               *   Việt). Tiếng Anh vẫn dùng tên của kho ("Root Center").
               */
              const c = centerContent(id, lang);
              const name = lang === 'vi' ? centerName(id, lang) : (c.value?.name ?? centerName(id, lang));
              return (
                <li key={id} className="flex min-h-11 items-center gap-2.5 rounded-lg border border-line px-3 py-2"
                    data-center-detail={id} data-defined={defined}>
                  <span aria-hidden="true"
                        className={`inline-block size-2.5 shrink-0 rounded-full ${defined ? 'bg-ink' : 'border border-field bg-surface'}`} />
                  <span className="text-sm font-medium">{name}</span>
                  <span className={`ml-auto text-xs ${defined ? 'font-medium text-ink' : 'text-ink-3'}`}>
                    {defined ? t('details.defined') : t('details.open')}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
