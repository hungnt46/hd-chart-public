'use client';
/**
 * Activation Watch — STATUS §4 B3. Engine: `calc-core/rave/watch.ts`.
 *
 * Học từ tab cùng tên của một ứng dụng tham chiếu: chọn một thiên thể → đồng hồ bán nguyệt
 * 6 hào của cổng đang đứng, hào hiện tại sáng, kim chỉ vị trí trong cổng; cổng
 * trước / cổng sau; bao lâu nữa đổi hào, đổi cổng. Mốc = thời điểm transit đang
 * xem (như bảng Thay đổi sắp tới), nên xem quá khứ vẫn có nghĩa.
 *
 * Màu: ô hào đang sáng tô màu BÊN TRANSIT (bảng màu chart ghép đang chọn) — cùng màu cột
 * transit. Ô tắt để trắng, viền xám vành huy hiệu cổng (`centerStroke`, 4.12:1 trên nền
 * trắng), để 6 ô vẫn đọc được là 6 ô. Màu ĐỌC từ `bodygraph/theme.ts` — không chép số.
 */
import { useEffect, useState, type JSX } from 'react';
import { activationWatch, type ActivationWatch as Watch } from '../../calc-core/rave/watch.js';
import { Body, BODY_NAMES, DEFINING_BODIES_STANDARD } from '../../calc-core/ephemeris/bodies.js';
import { PlanetGlyph, PlanetGlyphG } from '../glyphs/PlanetGlyph.js';
import { getBrowserEphemeris } from '../../lib/ephemeris/browser-client.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { planetName } from '../../i18n/terms.js';
import { useCompositePalette } from '../bodygraph/CompositePaletteProvider.js';
import { THEMES } from '../bodygraph/theme.js';
import { afterLabel } from './after.js';
import { gateContent, isContentBundled, lineContent } from '../../i18n/hd-content/index.js';
import { gateName } from '../../i18n/hd-names/index.js';
import { FixingNotes } from '../chart-details/FixingNotes.js';
import { SegmentedControl } from '../ui/SegmentedControl.js';
import { Notice } from '../ui/Notice.js';

const OUTLINE = THEMES.classic.centerStroke;
const TEXT = THEMES.classic.personality;
const OFF_FILL = THEMES.classic.centerOpenFill;
/** Hình học đồng hồ (đơn vị viewBox). Cung trên, tâm (CX, CY). */
const CX = 160, CY = 150, R_OUT = 130, R_IN = 82;

const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [CX - r * Math.cos(a), CY - r * Math.sin(a)] as const;   // 0° = trái, 180° = phải
};
/** Hình quạt vành khuyên từ góc a0 tới a1 (độ, 0..180). */
const sector = (a0: number, a1: number) => {
  const [x0, y0] = polar(R_OUT, a0), [x1, y1] = polar(R_OUT, a1);
  const [x2, y2] = polar(R_IN, a1), [x3, y3] = polar(R_IN, a0);
  return `M${x0},${y0} A${R_OUT},${R_OUT} 0 0 1 ${x1},${y1} L${x2},${y2} A${R_IN},${R_IN} 0 0 0 ${x3},${y3} Z`;
};

export function ActivationWatch({ jdRef }: { jdRef: number }): JSX.Element {
  /** Ô hào sáng tô màu BÊN TRANSIT của bảng màu chart ghép đang chọn (G2). */
  const { palette } = useCompositePalette();
  const { lang, t } = useLanguage();
  const [body, setBody] = useState<Body>(Body.Moon);
  const [w, setW] = useState<Watch | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const mounted = { on: true };
    void (async () => {
      try {
        const eph = await getBrowserEphemeris();
        const out = activationWatch(eph, jdRef, body);
        if (mounted.on) { setW(out); setErr(null); }
      } catch (e) {
        if (mounted.on) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { mounted.on = false; };
  }, [jdRef, body]);

  return (
    <div data-testid="watch">
      <h3 className="section-title">{t('watch.heading')}</h3>
      <SegmentedControl label={t('watch.pick')} value={body} onChange={setBody} wrap className="mt-2"
        options={DEFINING_BODIES_STANDARD.map(b => ({
          value: b, label: <PlanetGlyph body={b} className="text-base" />, testId: `watch-body-${BODY_NAMES[b]}`,
          ariaLabel: planetName(b, lang), title: planetName(b, lang),
        }))} />

      {err && <Notice tone="danger" className="mt-2" testId="watch-error">{err}</Notice>}

      {w?.body === body && (
        <div className="mt-3 flex flex-wrap items-center gap-4" data-testid="watch-result"
             data-body={BODY_NAMES[w.body]} data-gate={w.gate} data-line={w.line}
             data-prev={w.previousGate} data-next={w.nextGate} data-retrograde={w.retrograde}>
          <svg viewBox="0 0 320 190" className="w-full max-w-[20rem]" role="img"
               aria-label={t('watch.aria', { planet: planetName(w.body, lang), gate: w.gate, line: w.line })}>
            {Array.from({ length: 6 }, (_, i) => {
              const on = i + 1 === w.line;
              const [lx, ly] = polar((R_OUT + R_IN) / 2, i * 30 + 15);
              return (
                <g key={i} data-watch-line={i + 1} data-on={on}>
                  <path d={sector(i * 30 + 1, (i + 1) * 30 - 1)} fill={on ? palette.other : OFF_FILL}
                        stroke={on ? 'none' : OUTLINE} strokeWidth={1.5} />
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={20}
                        fontWeight={on ? 700 : 400} fill={on ? palette.gateText : TEXT}>{i + 1}</text>
                </g>
              );
            })}
            {/* kim: vị trí trong cổng, theo chiều bánh xe */}
            {(() => {
              const [nx, ny] = polar(R_OUT + 8, w.gateFraction * 180);
              return <line x1={CX} y1={CY} x2={nx} y2={ny} stroke={TEXT} strokeWidth={3} strokeLinecap="round" />;
            })()}
            <circle cx={CX} cy={CY} r={6} fill={TEXT} />
            <text x={CX} y={CY - 32} textAnchor="middle" fontSize={34} fontWeight={700} fill={TEXT}>
              {w.gate}.{w.line}{w.retrograde ? ' R' : ''}
            </text>
            {(() => {
              // Ký hiệu SVG + tên, căn giữa CẢ CỤM. SVG không đo được chữ lúc
              // dựng nên ước bề ngang tên (≈0.55 cỡ chữ mỗi ký tự) — lệch vài
              // đơn vị cũng không thấy được ở cỡ này.
              const name = planetName(w.body, lang);
              const G = 16, GAP = 6, left = CX - (G + GAP + name.length * 16 * 0.55) / 2;
              return (
                <>
                  <PlanetGlyphG body={w.body} cx={left + G / 2} cy={CY + 25} size={G} color={TEXT} />
                  <text x={left + G + GAP} y={CY + 30} fontSize={16} fill={TEXT}>{name}</text>
                </>
              );
            })()}
          </svg>

          <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-sm">
            <dt className="text-ink-3">{t('watch.prevGate')}</dt>
            <dd className="font-mono" data-testid="watch-prev">{w.previousGate}</dd>
            <dt className="text-ink-3">{t('watch.nextGate')}</dt>
            <dd className="font-mono" data-testid="watch-next">{w.nextGate}</dd>
            <dt className="text-ink-3">{t('watch.lineChange')}</dt>
            <dd data-testid="watch-line-change">{afterLabel(t, jdRef, w.lineChange.jdChange)}</dd>
            <dt className="text-ink-3">{t('watch.gateChange')}</dt>
            <dd data-testid="watch-gate-change">{afterLabel(t, jdRef, w.gateChange.jdChange)}</dd>
          </dl>

          {/*
            ★ E3 — học từ một ứng dụng tham chiếu: cổng trước / hiện tại / sau
            kèm TÊN và CÂU KHOÁ. TÊN cổng là dữ kiện chuẩn (`i18n/hd-names`, luôn
            hiện — Hưng chốt 2026-09-28); câu khoá và tên hào là nội dung Jovian ⇒
            đi qua `i18n/hd-content` (sau cờ bản quyền); cờ tắt thì hiện
            placeholder. "Trước/sau" theo CHIỀU ĐI như `watch.ts` (nghịch hành đảo).
          */}
          <div className="w-full space-y-2" data-testid="watch-gates">
            {!isContentBundled() && (
              <p className="empty" data-testid="watch-content-placeholder">
                {t('details.placeholder', { what: t('details.what.gates'), flag: 'NEXT_PUBLIC_HD_CONTENT_BUNDLED=false' })}
              </p>
            )}
            {([['prev', w.previousGate], ['current', w.gate], ['next', w.nextGate]] as const).map(([role, gate]) => {
              const g = gateContent(gate, lang);
              const l = role === 'current' ? lineContent(gate, w.line, lang) : null;
              return (
                <article key={role} data-watch-gate-role={role} data-gate={gate}
                         className={`rounded-lg border p-2.5 text-sm ${role === 'current' ? 'border-field' : 'border-line'}`}>
                  <h4 className="text-xs text-ink-3">
                    {t(role === 'prev' ? 'watch.prevGate' : role === 'next' ? 'watch.nextGate' : 'watch.currentGate')}
                  </h4>
                  <p className="font-medium">
                    {role === 'current' ? `${gate}.${w.line}` : gate}
                    <span className="ml-2 font-normal text-ink-2" data-watch-name>{gateName(gate, lang)}</span>
                  </p>
                  {/* Nhãn "bản EN" đi theo CÂU KHOÁ (thứ có thể dự phòng) — tên luôn đúng ngôn ngữ. */}
                  {g.value?.keynote && (
                    <p className="mt-1 text-xs text-ink-2" data-watch-keynote>
                      {g.value.keynote}
                      {g.resolved && g.resolved !== lang && (
                        <span className="tag ml-2">
                          {t('details.fallbackTag', { lang: g.resolved.toUpperCase() })}
                        </span>
                      )}
                    </p>
                  )}
                  {l?.value?.name && (
                    <p className="mt-1 text-xs text-ink-2" data-watch-line-name>
                      {t('details.line', { n: w.line })} — {l.value.name}
                    </p>
                  )}
                  {role === 'current' && l?.value?.blue && (
                    <p className="keynote mt-1 text-xs" data-blue-keynote>{l.value.blue}</p>
                  )}
                  {/* Ký hiệu fixing của hào hiện tại: DỮ KIỆN, hiện cả khi cờ nội dung tắt. */}
                  {role === 'current' && (
                    <div data-watch-fixing={`${gate}.${w.line}`}>
                      <FixingNotes gate={gate} line={w.line} lang={lang} text={l?.value ?? null} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
