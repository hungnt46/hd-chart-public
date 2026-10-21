import { DEFINING_BODIES_STANDARD, BODY_NAMES, type Body }
  from '../../calc-core/ephemeris/bodies.js';
import { PlanetGlyphG } from '../glyphs/PlanetGlyph.js';
import {
  fixingKind, fixingState, type FixingState, type FixingTrigger,
} from '../../calc-core/rave/derive/fixing-state.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider';
import { momentLabel } from '../time-mode/format';
import { useTimeMode } from '../time-mode/TimeModeProvider';
import { planetName } from '../../i18n/terms';
import type { ActivationSet } from '../../calc-core/rave/activations.js';
import { COMPOSITE_OTHER, THEMES } from '../bodygraph/theme';
import { contrastRatio } from '../bodygraph/contrast';
import { useCompositePalette } from '../bodygraph/CompositePaletteProvider';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { PUBLIC_EDITION } from '../../lib/edition.js';

/** Bản công khai: chữ số nét mảnh 400 + số đều cột (`.pc-font`, `app/globals.css`, STATUS §5 #71). */
const FONT = PUBLIC_EDITION ? 'pc-font' : '';
const withFont = (c?: string): string | undefined => [c, FONT].filter(Boolean).join(' ') || undefined;

/**
 * Cột hành tinh đặt CẠNH bodygraph — glyph + `cổng.hào` + dấu fixing.
 *
 * ★ Dựng lại 2026-09-22 (lần hai) sau khi ĐO bản vẽ tham chiếu trên
 *   humandesignamerica.com. Bản đầu của tôi là khối chữ HTML gọn ở đầu cột,
 *   cao khoảng một phần ba biểu đồ — Hưng bác, và đo ra thì đúng là sai hẳn.
 *
 * Số đo tham chiếu (Classic, cửa sổ 1440px):
 *   bodygraph  461 × 540   viewBox 0 0 2000 2000
 *   cột        100 × 479   viewBox 0 -70 432 2070      ⇒ CÙNG tỉ lệ thu nhỏ
 *   khe cột↔chart  −1px    ⇒ áp sát, không có khoảng cách
 *   13 dòng, bước 33.6px, ô 64 × 28px, ô TRONG SUỐT (chỉ là vùng bấm)
 *   tiêu đề "Design" #d04948 + vạch gạch chân 64 × 2px
 *   glyph 13 × 13px, chữ trị số 50 đơn vị (~11.6px), tiêu đề 38 đơn vị
 *
 * Quy đổi sang đơn vị khung của cột (chia tỉ lệ 479/2070 = 0.2314):
 *   bước dòng 145 · ô 277 × 121 · glyph 56 · lề trái ô 73 · glyph tại 104
 *   chữ trị số tại 186 · tiêu đề y ≈ 40 · gạch chân y ≈ 81 cao 8.6
 *
 * Hưng chốt KIỂU TRƠN như bản tham chiếu (không viền ô, không nền ô). humandesign.vn thì
 * tô đặc từng ô (#cc0000 / #444444, chữ trắng, cách nhau 1px) — đã cân, không
 * chọn. Đừng tự đổi sang kiểu đó.
 *
 * Thứ tự: `DEFINING_BODIES_STANDARD`, tức Moon TRƯỚC hai Node. Hai nguồn tham
 * chiếu đá nhau thật — xem ghi chú ở `calc-core/ephemeris/bodies.ts`.
 *
 * `preserveAspectRatio` DÁN MÉP về phía biểu đồ (`xMax` cho cột trái, `xMin`
 * cho cột phải) chứ không căn giữa: khi biểu đồ chạm trần `max-h-[78vh]` thì ô
 * chứa cột rộng hơn hình vẽ của nó, căn giữa sẽ hở một khe mà bản gốc không có
 * (đo được khe ở bản tham chiếu là −1px, tức áp sát).
 */
export type ColumnSide = 'design' | 'personality' | 'transit';

export interface PlanetColumnProps {
  set: ActivationSet;
  /**
   * MỌI bộ kích hoạt của chart chứa cột này — `[personality, design]` cho chart
   * người, `[transit]` cho transit đứng một mình. BẮT BUỘC, không suy từ `set`:
   * fixing được kích CHÉO phía (cycle Design Mercury 28.1 ▼ nhờ Venus
   * Personality ở 38.5), đưa mỗi `set` là âm thầm mất dấu. Xem
   * `calc-core/rave/derive/fixing-state.ts`.
   */
  chartSets: readonly ActivationSet[];
  /**
   * Bộ kích hoạt của chart KIA khi cột này nằm trong chart ghép (cột transit của
   * transit ghép). Chart kia cũng gây fixing — ứng dụng tham chiếu đánh dấu cả những dòng đó.
   * Chart đơn thì bỏ trống.
   */
  otherSets?: readonly ActivationSet[];
  /** Màu BÊN của chart kia — tô dấu do chart kia gây ra (phương án B, STATUS §5 #16). */
  otherColour?: string;
  side: ColumnSide;
  className?: string;
  /** Hiện dòng ngày giờ dưới tiêu đề, như bản tham chiếu. Bỏ trống thì không hiện. */
  showDate?: boolean;
  /**
   * Múi giờ "địa phương" của cột: NƠI SINH cho Design/Personality, MÁY cho
   * Transit. Công tắc giờ (`TimeModeProvider`) chọn hiện theo múi này hay UT.
   */
  zone?: string;
}

/* `localLabel` đã chuyển sang `components/time-mode/format.ts` (cùng mọi luật
 * định dạng giờ); re-export để chỗ cũ và `local-label.spec.ts` không phải đổi. */
export { localLabel } from '../time-mode/format';

/* Giữ nguyên hệ đơn vị của bản tham chiếu để số đo ở trên đọc thẳng được. */
const VB = { x: 0, y: -70, w: 432, h: 2070 };
const ROW = { first: 107, pitch: 145, h: 121, x: 73, w: 277 };
const GLYPH_SIZE = 56, VALUE_SIZE = 50;
const HEAD = { y: 40, size: 34, ruleY: 81, ruleH: 8.6 };

/*
 * ★ Cột bên PHẢI ĐẢO thứ tự trong dòng. Đo 2026-09-22 trên bản vẽ tham chiếu, đơn vị
 *   cột (rộng 432), lấy từ px chia tỉ lệ 100/432:
 *
 *     trái  [glyph 104] [trị số 190, căn trái ] [dấu 307]
 *     phải  [dấu 91   ] [trị số 237, căn PHẢI] [glyph 263]
 *
 *   Bản đầu của tôi đặt glyph bên trái cho CẢ HAI cột — sai ở cột Personality,
 *   và sẽ sai luôn ở cột Transit vì nó cũng nằm bên phải.
 *   Trị số cột phải căn PHẢI chứ không căn trái: đo được "7. 6" bắt đầu ở x lớn
 *   hơn "46. 2", tức mép phải mới là mép thẳng hàng.
 */
const LAYOUT = {
  left:  { glyph: 132, value: 190, valueAnchor: 'start' as const,
           mark: ROW.x + ROW.w, markAnchor: 'end' as const },
  right: { glyph: 291, value: 237, valueAnchor: 'end' as const,
           mark: ROW.x,          markAnchor: 'start' as const },
};

/*
 * Màu theo CỘT.
 *
 * design / personality là bảng màu quen của ta. `transit` là màu BÊN KIA của
 * chart ghép (`COMPOSITE_OTHER`, STATUS §5 #13–#14): số trong cột transit tô màu
 * transit như một ứng dụng tham chiếu (ứng dụng kia tô đen), để cột và thanh tím trên bodygraph
 * đọc ra là một.
 *
 * ★ Đổi 2026-09-23 từ xanh ngọc #41816d sang xanh dương của bộ Classic tham chiếu #3535c4
 *   (Hưng chốt bộ màu chart ghép, xem `compositeTheme`). Màu cũ mượn sắc của
 *   một ứng dụng tham chiếu và hỏng khi đem lên bodygraph ghép: sọc đỏ–ngọc hoà thành nâu.
 * ★ Aura A (2026-10-21): đỏ / ink đọc THẲNG từ bảng màu bodygraph (#c63a2b / #172033) để
 *   cột và thanh không bao giờ lệch nhau; transit theo `COMPOSITE_OTHER` mới #28309e.
 */
/*
 * ★ Aura (Hưng chốt 2026-10-21): chữ số cột ĐỌC màu của bodygraph (`THEMES.classic`) — đỏ Design `#c63a2b`,
 *   Personality mực `#172033` — để cột và thanh cùng MỘT đỏ (canvas vẽ #b3302f khi đỏ bodygraph còn cũ; Hưng chọn
 *   dùng chung sau khi so cạnh thanh đỏ mới). Không ghim mã màu ở đây.
 */
const COLOUR: Record<ColumnSide, string> = {
  design: THEMES.classic.design, personality: THEMES.classic.personality, transit: COMPOSITE_OTHER,
};
const HEADING: Record<ColumnSide, string> = {
  design: 'DESIGN', personality: 'PERSONALITY', transit: 'TRANSIT',
};
/*
 * ★ Giao diện D (Hưng duyệt 2026-10-04): nhãn đầu cột là VIÊN nhỏ thay cho chữ hoa
 *   + vạch gạch chân của bản tham chiếu — "Design" / "Personality" / "Transit". Viên nằm
 *   đúng chỗ của dòng tiêu đề cũ (y −2…64 ≈ đỉnh tiêu đề tới vạch), nên 13 dòng
 *   số và hệ tỉ lệ tham chiếu không xê dịch. Ba kiểu nền:
 *     · Design: nền TRẮNG viền nhạt cùng sắc, chữ đỏ — luật "chữ đỏ chỉ trên
 *       trắng". Mockup D vẽ chữ đỏ trên hồng #fbeceb = 4.11:1 — SAI luật, không theo;
 *     · Personality: nền `sunken`, chữ mực (Aura A: ink #172033 trên mist #eef2ef = 14.40:1);
 *     · màu BÊN của chart ghép (Transit, "Chart của tôi", chu kỳ): nền NHẠT 10% của
 *       màu bên, chữ màu bên SẪM dần tới ≥ 5.5:1 (`pillInk`) — Aura A: lục #1f7a3a ra
 *       #1a6731 trên #e9f2eb (6.06:1), lam #28309e giữ nguyên trên #eaeaf5 (8.76:1).
 */
/* Aura (artboard `Chart-HeaderC`): chữ HOA 600 giãn .08em. Cột gọn hẹp ⇒ "PERS." như artboard `Chart-Mobile`. */
const PILL_TEXT: Record<ColumnSide, string> = {
  design: 'DESIGN', personality: 'PERSONALITY', transit: 'TRANSIT',
};
const PILL_SHORT: Record<ColumnSide, string> = { ...PILL_TEXT, personality: 'PERS.' };
/* Viền viên Design và nền viên Personality — số của artboard (`#E8C4C4`, Aura `mist`). */
const PILL_DESIGN_LINE = '#e8c4c4';
/** Aura A (2026-10-21): `mist` #eef2ef — trước là `sunken` ấm #eeedea. */
const PILL_SUNKEN = '#eef2ef';
interface PillGeom { y: number; h: number; padX: number; size: number }
/** Viên của cột CHUẨN (đơn vị khung tham chiếu) và của cột GỌN điện thoại (đơn vị = px). */
const PILL: PillGeom = { y: -2, h: 62, padX: 31, size: 31 };
const PILL_COMPACT: PillGeom = { y: 0.5, h: 14, padX: 5, size: 7.5 };
/** Bề ngang viên ƯỚC theo số ký tự (SVG không tự co hộp theo chữ; dựng trên máy chủ nên không đo được). */
const pillWidth = (text: string, g: PillGeom) => Math.round(text.length * g.size * 0.76) + 2 * g.padX;

const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
const toHex = (c: readonly number[]) => `#${c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
/** Nền viên của màu BÊN: trộn 10% màu với trắng. */
export const pillTint = (accent: string): string => toHex(rgb(accent).map(v => 255 + (v - 255) * 0.1));
/** Chữ trên nền nhạt: chính màu bên, sẫm dần (×0.92) tới khi đạt 5.5:1. */
export function pillInk(accent: string, bg: string): string {
  let c = rgb(accent), x = toHex(c);
  for (let i = 0; i < 30 && contrastRatio(x, bg) < 5.5; i++) { c = c.map(v => v * 0.92) as typeof c; x = toHex(c); }
  return x;
}

type PillStyle = 'white' | 'sunken' | 'tint';
function HeadPill({ x, anchor, text, colour, style, g = PILL }: {
  x: number; anchor: 'start' | 'end' | 'middle'; text: string; colour: string; style: PillStyle; g?: PillGeom;
}) {
  /*
   * Bản công khai từng chỉ in CHỮ, không viên (STATUS §5 #73). Aura (Hưng 2026-10-21, mục B3): VIÊN trở lại ở
   * cả hai bản, đúng artboard.
   */
  text = text.toLocaleUpperCase();
  const w = pillWidth(text, g);
  const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  const fill = style === 'white' ? '#ffffff' : style === 'sunken' ? PILL_SUNKEN : pillTint(colour);
  const ink = style === 'tint' ? pillInk(colour, fill) : colour;
  return (
    <g data-head-pill={style}>
      <rect x={x0} y={g.y} width={w} height={g.h} rx={g.h / 2}
            fill={fill} stroke={style === 'white' ? PILL_DESIGN_LINE : 'none'} strokeWidth={g.size / 12} />
      <text x={x0 + w / 2} y={g.y + g.h / 2} dominantBaseline="central" textAnchor="middle"
            fontSize={g.size} fontWeight={600} letterSpacing="0.08em" fill={ink}>{text}</text>
    </g>
  );
}

/**
 * Xám dòng ngày giờ dưới nhãn. Trước 2026-09-25 là #7a7a7a — chỉ 4.29:1 trên
 * trắng, hụt 4.5:1 cho chữ nhỏ (WCAG AA). #767676 là xám nhạt nhất đạt (4.54:1),
 * mắt thường không phân biệt được với màu cũ.
 * Aura A (2026-10-21): `ink-2` #4a5266 — 7.81:1 trên trắng, 7.53:1 trên `paper`.
 */
const DATE_GREY = '#4a5266';

export function PlanetColumn({
  set, chartSets, otherSets = [], otherColour, side, className, showDate, zone,
}: PlanetColumnProps) {
  const { lang } = useLanguage();
  const { mode } = useTimeMode();
  const onLeft = side === 'design';
  const L = onLeft ? LAYOUT.left : LAYOUT.right;
  // Cột transit theo bảng màu chart ghép đang chọn (G2); `COLOUR.transit` là bản Classic.
  const { palette } = useCompositePalette();
  const colour = side === 'transit' ? palette.other : COLOUR[side];
  return (
    <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} className={withFont(className)}
         preserveAspectRatio={onLeft ? 'xMaxYMid meet' : 'xMinYMid meet'} role="list"
         data-testid={`planet-column-${side}`} data-side={side}
         aria-label={HEADING[side]}>
      <HeadPill x={onLeft ? ROW.x : ROW.x + ROW.w} anchor={onLeft ? 'start' : 'end'} text={PILL_TEXT[side]}
                colour={colour} style={side === 'design' ? 'white' : side === 'personality' ? 'sunken' : 'tint'} />
      {showDate && (
        <text x={onLeft ? ROW.x : ROW.x + ROW.w} y={HEAD.ruleY + 46} fontSize={30} fill={DATE_GREY}
              textAnchor={onLeft ? 'start' : 'end'}
              data-testid={`planet-column-date-${side}`} data-time-mode={mode}>{momentLabel(set.jdUT, mode, zone, lang)}</text>
      )}
      {DEFINING_BODIES_STANDARD.map((b, i) => (
        <PlanetRow key={b} body={b} set={set} chartSets={chartSets} otherSets={otherSets}
                   otherColour={otherColour ?? colour} colour={colour} lang={lang} L={L}
                   y={ROW.first + i * ROW.pitch} />
      ))}
    </svg>
  );
}

function PlanetRow({ body, set, chartSets, otherSets, otherColour, colour, lang, y, L }: {
  body: Body; set: ActivationSet; chartSets: readonly ActivationSet[];
  otherSets: readonly ActivationSet[]; otherColour: string; colour: string;
  lang: Parameters<typeof planetName>[1]; y: number;
  L: typeof LAYOUT.left | typeof LAYOUT.right;
}) {
  const p = set.byBody[body]?.position;
  const st = p ? fixingState(p.gate, p.line, chartSets, otherSets) : null;
  const fix = st ? fixingKind(st) : null;
  const mid = y + ROW.h / 2;
  return (
    <g role="listitem" data-body={BODY_NAMES[body]}
       data-gate-line={p ? `${p.gate}.${p.line}` : undefined}
       data-fixing={fix ?? undefined}>
      <title>{planetName(body, lang)}</title>
      <PlanetGlyphG body={body} cx={L.glyph} cy={mid} size={GLYPH_SIZE} color={colour} />
      <text x={L.value} y={mid} fontSize={VALUE_SIZE} fontWeight={500} fill={colour}
            textAnchor={L.valueAnchor} dominantBaseline="central">
        {p ? `${p.gate}.${p.line}` : '—'}</text>
      {/*
        Dấu fixing — ▲ exalted, ▼ detriment, ▲ chồng lên ▼ khi juxtaposed. Bản tham chiếu
        đặt ngay sau trị số. Luật ở `calc-core/rave/derive/fixing-state.ts`, dữ
        liệu ở `calc-core/hd-data/fixings.ts` — DỮ KIỆN nên vẫn hiện khi TẮT cờ
        nội dung. Màu theo NGUỒN — xem `FixingMark`.
      */}
      {st && fix && <FixingMark state={st} x={L.mark} mid={mid} anchor={L.markAnchor}
                                own={colour} other={otherColour} />}
    </g>
  );
}

/*
 * ★ Juxtaposed = HAI dấu chồng nhau, ▲ trên ▼, trong cùng chỗ của một dấu.
 *   Ứng dụng tham chiếu vẽ hai <use> #exalted (y −88) và #detriment (y +38) trong một
 *   g.fixing; ứng dụng tham chiếu thứ hai cũng ra ▲▼ chồng. Nhỏ lại để cặp vừa chiều cao một
 *   dấu đơn — dòng cao 121 đơn vị, cặp này chiếm khoảng 60.
 */
const MARK_SIZE = VALUE_SIZE * 0.85, PAIR_SIZE = VALUE_SIZE * 0.6, PAIR_GAP = PAIR_SIZE * 0.55;

/*
 * ★ Màu dấu theo NGUỒN — phương án B, Hưng chốt 2026-09-23 (STATUS §5 #16),
 *   chọn trên bảng so `tools/fixing-colour-preview.tsx` (A chép bản tham chiếu · B · C
 *   hình dạng · D không phân biệt). Nghĩa y như bản tham chiếu, màu là của ta:
 *     own   ⇒ màu của chính con số (đỏ design / đen personality / màu transit)
 *     other ⇒ màu BÊN của chart kia (`COMPOSITE_BASE` / `COMPOSITE_OTHER`)
 *     both  ⇒ `COMPOSITE_BOTH` (bảng màu đang chọn — `CompositePaletteProvider`)
 *   Chart đơn không bao giờ có `other`/`both`, nên ở đó mọi dấu mang màu số.
 *   Juxtaposed thì MỖI chiều tô theo nguồn của chiều đó.
 */
function FixingMark({ state, x, mid, anchor, own, other, scale = 1 }: {
  state: FixingState; x: number; mid: number; anchor: 'start' | 'end'; own: string; other: string;
  /** Cột gọn (điện thoại) vẽ ở hệ đơn vị khác — nhân mọi cỡ dấu theo hệ số này. */
  scale?: number;
}) {
  const both = useCompositePalette().palette.both;
  const colourOf = (t: FixingTrigger) => (t === 'own' ? own : t === 'other' ? other : both);
  const at = (y: number, size: number, ch: string, t: FixingTrigger) => (
    <text x={x} y={y} fontSize={size * scale} fill={colourOf(t)} textAnchor={anchor} data-fixing-by={t}
          dominantBaseline="central" aria-hidden="true">{ch}</text>
  );
  const { exalted: e, detriment: d } = state;
  const gap = PAIR_GAP * scale;
  if (e && d) return <>{at(mid - gap, PAIR_SIZE, '▲', e)}{at(mid + gap, PAIR_SIZE, '▼', d)}</>;
  if (e) return at(mid, MARK_SIZE, '▲', e);
  return d ? at(mid, MARK_SIZE, '▼', d) : null;
}

/** Tỉ lệ khung của cột (rộng/cao). Dùng để tính bề ngang cột ở bố cục. */
export const COLUMN_ASPECT = VB.w / VB.h;

/**
 * Bề ngang MỖI cột, tính theo phần trăm của cả cụm [cột | biểu đồ | cột], sao
 * cho cột cao ĐÚNG BẰNG biểu đồ.
 *
 * Giải tích, không phải số mò. Gọi A là tỉ lệ rộng/cao của biểu đồ, B của cột:
 *   cao_cột = rộng_cột / B  và  cao_chart = rộng_chart / A
 *   muốn hai cái bằng nhau ⇒ rộng_cột = rộng_chart · B/A
 *   tổng W = n·rộng_cột + rộng_chart ⇒ k = (B/A) / (1 + n·B/A)
 *
 * `columns` là SỐ CỘT, 2 khi chỉ có design+personality, 3 khi thêm transit.
 *
 * Vì sao phải tính thay vì ép bằng CSS: SVG không có chiều cao nội tại, đặt
 * `h-full` trong grid thì chính nó kéo chiều cao hàng lên (đo được cột 780
 * trong khi biểu đồ chỉ 673), còn `h-0 min-h-full` thì dưới `lg` cột sập về 0.
 * Cho bề ngang rồi để chiều cao tự suy từ viewBox là ổn định ở mọi khổ màn.
 *
 * A khác nhau giữa hai chủ đề (Classic 1.034, Modern 0.732) nên k cũng khác:
 * 14.4% và 18.2%. Đừng ghim một con số.
 */
export function columnWidthPercent(chartAspect: number, columns = 2): number {
  const r = COLUMN_ASPECT / chartAspect;
  return (r / (1 + columns * r)) * 100;
}

/* ══════════════════════════════════════════════════════════════════════════
 * CỘT HAI SỐ — chart ghép
 * ═══════════════════════════════════════════════════════════════════════════ */

/*
 * ★ Chart ghép (transit / chu kỳ chồng lên chart cá nhân) dùng CỘT HAI SỐ.
 *   Đo trên hai ứng dụng tham chiếu 2026-09-23 (tệp đo chart ghép trong `calc-core/__fixtures__/reference/`,
 *   khoá `howColouringWorks_transitVsCycle.columns`):
 *
 *     người   ─ MỘT cột, mỗi dòng: [▲▼] design ĐỎ · glyph · personality ĐEN [▲▼]
 *     cycle   ─ y hệt cột người, cho design/personality CỦA MỐC chu kỳ
 *     transit ─ một số/dòng — dùng lại `PlanetColumn side="transit"`
 *
 *   Số trong cột KHÔNG đổi theo chế độ tô bodygraph — đỏ/đen luôn ở đây, kể cả
 *   khi bodygraph tô theo bên. Bên nào là bên nào chỉ đọc ở VẠCH MÀU dưới tiêu
 *   đề (`accent`), cùng màu với bên đó trên bodygraph.
 *
 *   Thứ tự trong dòng KHÔNG đảo ở cột phải (khác cột đơn): bản tham chiếu xếp cột chu kỳ
 *   bên phải vẫn "▲ 50.6 ☉ 60.4 ▼", design trước.
 *
 *   Bề ngang: hai trị số + glyph + hai dấu cần khung rộng hơn cột đơn. Giữ
 *   nguyên chiều cao, bước dòng và cỡ chữ của cột đơn để hai loại cột đặt cạnh
 *   nhau thẳng hàng từng dòng.
 */
const PAIR_VB = { x: 0, y: -70, w: 560, h: 2070 };
const PAIR = { x: 20, w: 520, markD: 34, dVal: 222, glyph: 280, pVal: 338, markP: 526 };
const TEXT_DARK = THEMES.classic.personality;   // ink #172033 (Aura A)

export interface PairPlanetColumnProps {
  design: ActivationSet;
  personality: ActivationSet;
  /**
   * Bộ kích hoạt của chart KIA trong chart ghép. BẮT BUỘC: cột hai số chỉ có
   * trong chart ghép, và chart kia cũng gây fixing (G01 ☊ 2.5 ▼ là do Earth của
   * mốc Saturn return ở 2.4). Xem `calc-core/rave/derive/fixing-state.ts`.
   */
  otherSets: readonly ActivationSet[];
  /** Màu BÊN của chart kia — tô dấu do chart kia gây ra (phương án B, STATUS §5 #16). */
  otherAccent: string;
  /** Tiêu đề in hoa, như các cột khác (tiếng Anh cố định — xem HEADING). */
  heading: string;
  /** Màu BÊN trên bodygraph — chỉ tô vạch dưới tiêu đề. */
  accent: string;
  /** `data-testid="planet-column-<testId>"`. */
  testId: string;
  side: 'left' | 'right';
  className?: string;
}

export function PairPlanetColumn({
  design, personality, otherSets, otherAccent, heading, accent, testId, side, className,
}: PairPlanetColumnProps) {
  const { lang } = useLanguage();
  const onLeft = side === 'left';
  return (
    <svg viewBox={`${PAIR_VB.x} ${PAIR_VB.y} ${PAIR_VB.w} ${PAIR_VB.h}`} className={withFont(className)}
         preserveAspectRatio={onLeft ? 'xMaxYMid meet' : 'xMinYMid meet'} role="list"
         data-testid={`planet-column-${testId}`} data-side={testId} data-accent={accent}
         aria-label={heading}>
      <HeadPill x={PAIR.x + PAIR.w / 2} anchor="middle" text={heading} colour={accent} style="tint" />
      {DEFINING_BODIES_STANDARD.map((b, i) => {
        const mid = ROW.first + i * ROW.pitch + ROW.h / 2;
        const d = design.byBody[b]?.position, p = personality.byBody[b]?.position;
        const own = [personality, design];
        const sd = d ? fixingState(d.gate, d.line, own, otherSets) : null;
        const sp = p ? fixingState(p.gate, p.line, own, otherSets) : null;
        const fd = sd ? fixingKind(sd) : null, fp = sp ? fixingKind(sp) : null;
        return (
          <g key={b} role="listitem" data-body={BODY_NAMES[b]}
             data-design={d ? `${d.gate}.${d.line}` : undefined}
             data-personality={p ? `${p.gate}.${p.line}` : undefined}
             data-fixing-design={fd ?? undefined} data-fixing-personality={fp ?? undefined}>
            <title>{planetName(b, lang)}</title>
            {sd && fd && <FixingMark state={sd} x={PAIR.markD} mid={mid} anchor="start"
                                     own={COLOUR.design} other={otherAccent} />}
            <text x={PAIR.dVal} y={mid} fontSize={VALUE_SIZE} fontWeight={500} fill={COLOUR.design}
                  textAnchor="end" dominantBaseline="central">{d ? `${d.gate}.${d.line}` : '—'}</text>
            <PlanetGlyphG body={b} cx={PAIR.glyph} cy={mid} size={GLYPH_SIZE} color={TEXT_DARK} />
            <text x={PAIR.pVal} y={mid} fontSize={VALUE_SIZE} fontWeight={500} fill={COLOUR.personality}
                  textAnchor="start" dominantBaseline="central">{p ? `${p.gate}.${p.line}` : '—'}</text>
            {sp && fp && <FixingMark state={sp} x={PAIR.markP} mid={mid} anchor="end"
                                     own={COLOUR.personality} other={otherAccent} />}
          </g>
        );
      })}
    </svg>
  );
}

/** Tỉ lệ khung của cột hai số (rộng/cao). */
export const PAIR_COLUMN_ASPECT = PAIR_VB.w / PAIR_VB.h;

/**
 * Bề ngang TỪNG cột (phần trăm của cả cụm) khi các cột KHÁC tỉ lệ — tổng quát
 * của `columnWidthPercent`. Cùng giải tích: cột i rộng = rộng_chart · Bᵢ/A, tổng
 * W = rộng_chart · (1 + ΣBᵢ/A).
 */
export function columnWidthsPercent(chartAspect: number, columnAspects: readonly number[]): number[] {
  const rs = columnAspects.map(b => b / chartAspect);
  const total = 1 + rs.reduce((a, r) => a + r, 0);
  return rs.map(r => (r / total) * 100);
}

/* ══════════════════════════════════════════════════════════════════════════
 * CỘT GỌN — điện thoại, đứng HAI BÊN biểu đồ
 * ═══════════════════════════════════════════════════════════════════════════ */

/*
 * ★ Cột cho ĐIỆN THOẠI (Hưng, 2026-09-25). Cột chuẩn ở trên CÙNG HỆ TỈ LỆ với
 *   biểu đồ (số đo tham chiếu) nên ở bề ngang 375px chữ chỉ còn ~5.8px. Cột gọn này
 *   KHÔNG cùng hệ tỉ lệ: rộng cố định 60px, chữ 12.5px. Nó nằm ở GÓC TRÊN của
 *   biểu đồ (`data-mobile="corners"`, `app/globals.css`), cao bằng một phần
 *   biểu đồ theo bản vẽ; 13 dòng chia đều chiều cao THẬT đó (đo bằng
 *   ResizeObserver). Nội dung, thứ tự, gương trái/phải, dấu ▲▼ và màu theo
 *   nguồn GIỐNG HỆT cột chuẩn — cùng `fixingState`, cùng `FixingMark`.
 *
 *   viewBox = đúng kích thước điểm ảnh ⇒ 1 đơn vị = 1px. Tiêu đề và dòng ngày
 *   giờ GIỮ cỡ; chỉ chữ số + ký hiệu co lại khi bước dòng hụt `minPitch` (máy
 *   320px, Classic: cột cao ~175px ⇒ số ~10px) để các dòng không đè nhau.
 *
 *   Dòng ngày giờ dưới nhãn (như cột chuẩn — Hưng hỏi lại 2026-09-25 khi bản
 *   đầu bỏ nó đi): một dòng, được phép TRÀN khỏi bề ngang 60px về phía giữa
 *   (`overflow="visible"` là THUỘC TÍNH, không phải CSS, để ảnh xuất giữ nguyên
 *   — SVG lồng mặc định cắt phần tràn). Ở độ cao đó cả hai bản vẽ còn trống:
 *   đỉnh tam giác Classic / đầu bóng người Modern chỉ chiếm ~⅓ giữa.
 *   Là SVG (không phải HTML) để nút xuất ảnh nhặt được — ảnh xuất = đúng cái
 *   đang thấy (`compose-svg.ts` chỉ ghép SVG).
 *
 *   `data-testid="planet-compact-…"`, KHÔNG dùng lại `planet-column-…`: hai cột
 *   cùng có mặt trong DOM (một cái bị CSS ẩn) — trùng testid là locator của
 *   Playwright báo "strict mode violation".
 */
/* Tiêu đề 7.5px, không giãn chữ: "PERSONALITY" in đậm vừa khít 60px (9.5px thì bị cắt mất chữ P). */
const COMPACT = { w: 60, head: 20, headWithDate: 31, date: 8.5, value: 12.5, glyph: 12, headSize: 7.5, minPitch: 13.5 };
/*
 * ★ Cột gọn ĐỨNG HAI BÊN, cao TRỌN biểu đồ — chỉ BẢN CÔNG KHAI (Hưng 2026-10-15, STATUS §5 #68):
 *   điện thoại và thẻ "Bầu trời lúc này". Bản công khai đã bỏ nền tham chiếu (§5 #66) nên không còn
 *   nền phải né ⇒ bỏ kiểu "dồn ở góc trên", 13 dòng dàn đều dọc khung, chữ to hơn (15px).
 *   Bố cục ở `data-mobile="sides"` (`app/globals.css`), CHỈ Classic. Bản đầy đủ + Modern giữ `COMPACT` ở góc.
 */
/* #73 (Hưng 2026-10-15): chữ nhỏ lại 15 → 13.5px, cột hẹp 66 → 60px để bodygraph to hơn. */
/* Aura (Hưng 2026-10-21): bước dòng tối thiểu 15 → 14 — lề trang điện thoại 20px + đệm khung 12px làm tab Transit
   "Ghép" chỉ còn bước 13.5px ⇒ chữ co về 12.2px (< 13, luật #73); với 14 chữ ~13.1px, dòng sát hơn một chút. */
const COMPACT_SIDE = { w: 60, head: 22, headWithDate: 36, date: 9, value: 13.5, glyph: 13, minPitch: 14 };
const PILL_SIDE: PillGeom = { y: 0.5, h: 16, padX: 5, size: 8.5 };

export function CompactPlanetColumn({
  set, chartSets, otherSets = [], otherColour, side, className, showDate, zone, sideLayout = false,
}: PlanetColumnProps & {
  /** Cột đứng hai bên, cao trọn biểu đồ, chữ to (`COMPACT_SIDE`) — bản công khai. */
  sideLayout?: boolean;
}) {
  const G = sideLayout ? COMPACT_SIDE : COMPACT;
  const { lang } = useLanguage();
  const { mode } = useTimeMode();
  const { palette } = useCompositePalette();
  const colour = side === 'transit' ? palette.other : COLOUR[side];
  const box = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.clientHeight));
    ro.observe(el);
    setH(el.clientHeight);
    return () => ro.disconnect();
  }, []);
  const haloId = `compact-halo-${useId().replace(/:/g, '')}`;
  const onLeft = side === 'design';
  const head = showDate ? G.headWithDate : G.head;
  const W = G.w, H = Math.max(h, head + 13 * 8);
  const pitch = (H - head) / 13;
  const k = Math.min(1, pitch / G.minPitch);
  const valueSize = G.value * k, glyphSize = G.glyph * k;
  const gx = sideLayout ? 9.5 : 9, vx = sideLayout ? 20 : 18;
  const x = onLeft
    ? { glyph: gx, value: vx, valueAnchor: 'start' as const, mark: W - 1, markAnchor: 'end' as const, head: 2 }
    : { glyph: W - gx, value: W - vx, valueAnchor: 'end' as const, mark: 1, markAnchor: 'start' as const, head: W - 2 };
  return (
    <div ref={box} className={`relative ${className ?? ''}`}>
      {h > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} className={withFont('absolute inset-0 h-full w-full')} role="list" overflow="visible"
             data-testid={`planet-compact-${side}`} data-side={side} data-layout={sideLayout ? 'side' : 'corner'}
             aria-label={HEADING[side]}>
          {/*
            Viền trắng quanh MỌI nét (chữ, ký hiệu, dấu fixing): cột nằm đè lên
            góc biểu đồ, phần dưới có thể lấn lên nền (bóng người Modern — đỏ
            trên #e4e4e4 chỉ 3.77:1). Có viền thì chữ luôn đứng trên trắng.
          */}
          <defs>
            <filter id={haloId} x="-10%" y="-10%" width="120%" height="120%">
              <feMorphology in="SourceAlpha" operator="dilate" radius="1.4" result="grow" />
              <feFlood floodColor="#fff" />
              <feComposite in2="grow" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Viên đầu cột như cột chuẩn (giao diện D) — có nền riêng nên đứng NGOÀI lớp viền trắng. */}
          <HeadPill x={x.head} anchor={onLeft ? 'start' : 'end'} text={PILL_SHORT[side]} colour={colour}
                    style={side === 'design' ? 'white' : side === 'personality' ? 'sunken' : 'tint'}
                    g={sideLayout ? PILL_SIDE : PILL_COMPACT} />
          <g filter={`url(#${haloId})`}>
          {showDate && (
            <text x={x.head} y={sideLayout ? 29 : 26} fontSize={G.date} fill={DATE_GREY} textAnchor={onLeft ? 'start' : 'end'}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                  data-testid={`planet-compact-date-${side}`} data-time-mode={mode}>{momentLabel(set.jdUT, mode, zone, lang)}</text>
          )}
          {DEFINING_BODIES_STANDARD.map((b, i) => {
            const p = set.byBody[b]?.position;
            const st = p ? fixingState(p.gate, p.line, chartSets, otherSets) : null;
            const fix = st ? fixingKind(st) : null;
            const mid = head + pitch * (i + 0.5);
            return (
              <g key={b} role="listitem" data-compact-body={BODY_NAMES[b]}
                 data-gate-line={p ? `${p.gate}.${p.line}` : undefined} data-fixing={fix ?? undefined}>
                <title>{planetName(b, lang)}</title>
                <PlanetGlyphG body={b} cx={x.glyph} cy={mid} size={glyphSize} color={colour} />
                <text x={x.value} y={mid} fontSize={valueSize} fontWeight={500} fill={colour}
                      textAnchor={x.valueAnchor} dominantBaseline="central"
                      style={{ fontVariantNumeric: 'tabular-nums' }}>{p ? `${p.gate}.${p.line}` : '—'}</text>
                {st && fix && <FixingMark state={st} x={x.mark} mid={mid} anchor={x.markAnchor}
                                          own={colour} other={otherColour ?? colour}
                                          scale={valueSize / VALUE_SIZE} />}
              </g>
            );
          })}
          </g>
        </svg>
      )}
    </div>
  );
}

/*
 * ★ CỘT HAI SỐ GỌN — điện thoại, chart ghép (Hưng chốt 2026-09-28: tab Transit /
 *   Chu kỳ trên điện thoại để cột Personal + Transit/Chu kỳ vào HAI GÓC khung
 *   như chart đơn, không rơi xuống dưới biểu đồ). Bản gọn của `PairPlanetColumn`:
 *   cùng nội dung từng dòng ([▲▼] design ĐỎ · glyph · personality ĐEN [▲▼]),
 *   cùng `fixingState` + `FixingMark`, cùng vạch màu BÊN dưới tiêu đề — chỉ đổi
 *   hệ đo sang điểm ảnh như `CompactPlanetColumn` (rộng 104px, chữ 12.5px, co
 *   theo chiều cao thật). Cũng có viền trắng quanh nét vì nằm đè lên góc biểu đồ.
 *
 *   `data-testid="planet-compact-<testId>"` — không trùng `planet-column-…` của
 *   cột chuẩn (cả hai cùng trong DOM, một cái bị CSS ẩn).
 */
const COMPACT_PAIR = { w: 104, markD: 1, dVal: 44, glyph: 52, pVal: 60, markP: 103 };
/* Cột hai số ĐỨNG HAI BÊN, cao trọn biểu đồ (bản công khai, STATUS §5 #70): chữ 14px nên rộng thêm 8px. */
const COMPACT_PAIR_SIDE = { w: 112, markD: 1, dVal: 48, glyph: 56, pVal: 64, markP: 111 };
const PAIR_SIDE_VALUE = 14, PAIR_SIDE_GLYPH = 13.5;

export function CompactPairPlanetColumn({
  design, personality, otherSets, otherAccent, heading, accent, testId, side, className, sideLayout = false,
}: PairPlanetColumnProps & { sideLayout?: boolean }) {
  const CP = sideLayout ? COMPACT_PAIR_SIDE : COMPACT_PAIR;
  const { lang } = useLanguage();
  const box = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.clientHeight));
    ro.observe(el);
    setH(el.clientHeight);
    return () => ro.disconnect();
  }, []);
  const haloId = `compact-pair-halo-${useId().replace(/:/g, '')}`;
  const onLeft = side === 'left';
  const W = CP.w, head = sideLayout ? COMPACT_SIDE.head : COMPACT.head, H = Math.max(h, head + 13 * 8);
  const pitch = (H - head) / 13;
  const k = Math.min(1, pitch / (sideLayout ? COMPACT_SIDE.minPitch : COMPACT.minPitch));
  const valueSize = (sideLayout ? PAIR_SIDE_VALUE : COMPACT.value) * k;
  const glyphSize = (sideLayout ? PAIR_SIDE_GLYPH : COMPACT.glyph) * k;
  const own = [personality, design];
  return (
    <div ref={box} className={`relative ${className ?? ''}`}>
      {h > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} className={withFont('absolute inset-0 h-full w-full')} role="list" overflow="visible"
             data-testid={`planet-compact-${testId}`} data-side={testId} data-accent={accent} aria-label={heading}
             data-layout={sideLayout ? 'side' : 'corner'}>
          <defs>
            <filter id={haloId} x="-10%" y="-10%" width="120%" height="120%">
              <feMorphology in="SourceAlpha" operator="dilate" radius="1.4" result="grow" />
              <feFlood floodColor="#fff" />
              <feComposite in2="grow" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <HeadPill x={onLeft ? 2 : W - 2} anchor={onLeft ? 'start' : 'end'} text={heading} colour={accent}
                    style="tint" g={sideLayout ? PILL_SIDE : PILL_COMPACT} />
          <g filter={`url(#${haloId})`}>
            {DEFINING_BODIES_STANDARD.map((b, i) => {
              const mid = head + pitch * (i + 0.5);
              const d = design.byBody[b]?.position, p = personality.byBody[b]?.position;
              const sd = d ? fixingState(d.gate, d.line, own, otherSets) : null;
              const sp = p ? fixingState(p.gate, p.line, own, otherSets) : null;
              const fd = sd ? fixingKind(sd) : null, fp = sp ? fixingKind(sp) : null;
              return (
                <g key={b} role="listitem" data-compact-body={BODY_NAMES[b]}
                   data-design={d ? `${d.gate}.${d.line}` : undefined}
                   data-personality={p ? `${p.gate}.${p.line}` : undefined}
                   data-fixing-design={fd ?? undefined} data-fixing-personality={fp ?? undefined}>
                  <title>{planetName(b, lang)}</title>
                  {sd && fd && <FixingMark state={sd} x={CP.markD} mid={mid} anchor="start"
                                           own={COLOUR.design} other={otherAccent} scale={valueSize / VALUE_SIZE} />}
                  <text x={CP.dVal} y={mid} fontSize={valueSize} fontWeight={500} fill={COLOUR.design}
                        textAnchor="end" dominantBaseline="central"
                        style={{ fontVariantNumeric: 'tabular-nums' }}>{d ? `${d.gate}.${d.line}` : '—'}</text>
                  <PlanetGlyphG body={b} cx={CP.glyph} cy={mid} size={glyphSize} color={TEXT_DARK} />
                  <text x={CP.pVal} y={mid} fontSize={valueSize} fontWeight={500} fill={COLOUR.personality}
                        textAnchor="start" dominantBaseline="central"
                        style={{ fontVariantNumeric: 'tabular-nums' }}>{p ? `${p.gate}.${p.line}` : '—'}</text>
                  {sp && fp && <FixingMark state={sp} x={CP.markP} mid={mid} anchor="end"
                                           own={COLOUR.personality} other={otherAccent} scale={valueSize / VALUE_SIZE} />}
                </g>
              );
            })}
          </g>
        </svg>
      )}
    </div>
  );
}
