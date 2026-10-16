/**
 * Rave Mandala SVG — bánh xe 64 cổng + vị trí hành tinh.
 * Component thuần hiển thị: nhận activation đã tính, không tự tính gì.
 *
 * Quy ước màu HD: **Personality = ĐEN** (dải trong), **Design = ĐỎ** (dải ngoài).
 *
 * ★ Hưng chốt 2026-09-25 (M3, rồi góp ý lần hai cùng ngày):
 *   · mandala CHIA RẼ QUẠT — 64 nhánh từ vành cổng vào tới tâm; hành tinh ở cổng
 *     nào nằm GỌN trong nhánh của cổng đó, KHÔNG có vạch nối nào (`bandSlots`).
 *     Hai cách trước đều có vạch — Hưng: "nhìn rất lặt vặt chướng mắt";
 *   · ô cổng được kích hoạt tô ĐÚNG MÀU TRUNG TÂM chứa cổng đó (màu defined của
 *     bodygraph, `THEMES[theme].centerFill`), nhánh quạt của nó nhuốm nhạt màu đó.
 *     Phía nào kích hoạt thì đọc ở ký hiệu đỏ/đen trong nhánh — bản M3 đầu tô ô
 *     theo phía (hồng/xám/sọc) đã bỏ;
 *   · chữ số trên ô màu chọn TRẮNG hoặc `#111` theo tương phản (≥ 4.5:1, có test);
 *   · đỏ / đen đúng màu xuất xưởng của app (#ce4140 / #2f2f2f);
 *   · vành 12 cung hoàng đạo ngoài cùng (tuỳ chọn `zodiac`);
 *   · bodygraph ở tâm (con `children`, xem `HubBodygraph`) — thu vừa vòng trong.
 *   Hình học bánh xe (`geometry.ts`: `MANDALA_ZERO_SCREEN_DEG`, vành cổng
 *   262–300) KHÔNG đổi — đó là số đo từ app của Jovian.
 */
import type { JSX } from 'react';
import { CENTER, RADII, SECTORS, VIEWBOX, longitudeToScreenDeg, pointAt, sectorPath } from './geometry.js';
import { DEFINING_BODIES_STANDARD, BODY_NAMES, type Body }
  from '../../calc-core/ephemeris/bodies.js';
import type { DisplaySource } from '../bodygraph/display-source.js';
import { GATE_TO_CENTER, type CenterId } from '../../calc-core/rave/derive/tables.js';
import { PlanetGlyphG } from '../glyphs/PlanetGlyph.js';
import type { ActivationSet } from '../../calc-core/rave/activations.js';
import { THEMES, type ThemeName } from '../bodygraph/theme.js';
import { textOnFill } from '../bodygraph/contrast.js';
import { BANDS, bandSlots, type Side } from './layout.js';

export interface MandalaProps {
  personality: ActivationSet;
  design: ActivationSet;
  /** Cổng được kích hoạt — tô ô tương ứng. */
  activatedGates?: ReadonlySet<number>;
  /** Nguồn kích hoạt từng cổng — chỉ ghi vào `data-source` (màu ô theo TRUNG TÂM). */
  gateSources?: ReadonlyMap<number, DisplaySource>;
  /** Chủ đề bodygraph đang chọn — lấy màu trung tâm cho ô cổng. */
  theme?: ThemeName;
  /** Vẽ vành 12 cung hoàng đạo ngoài cùng (khung nở thêm `ZODIAC_PAD` mỗi phía). */
  zodiac?: boolean;
  className?: string;
  title?: string;
  children?: React.ReactNode;   // bodygraph đặt ở tâm — xem `HubBodygraph`
  /**
   * Thiên thể được vẽ lên vành. Mặc định 13 thiên thể xác định. Chế độ Thập tự
   * (STATUS §4 E4) chỉ vẽ Mặt Trời + Trái Đất — như ứng dụng tham chiếu.
   */
  bodies?: readonly Body[];
  /**
   * Màu tự chọn (Illustrator Phase 3): ký hiệu hai phía và màu trung tâm cho ô
   * cổng. Bỏ trống ⇒ đúng màu xuất xưởng như trước.
   */
  colors?: { design?: string; personality?: string; centerFill?: Readonly<Record<CenterId, string>> };
}

const COLOR = {
  personality: '#2f2f2f',
  design: '#ce4140',
  stroke: '#d4d4d8',
  gateText: '#3f3f46',
  zodiac: '#5f6873',
} as const;
/** Độ đậm màu trung tâm nhuốm lên nhánh quạt của cổng được kích hoạt. */
const WEDGE_TINT = 0.16;

/** Chữ trên ô màu: trắng hay gần đen — cái nào tương phản hơn. */
export const TEXT_ON_FILL = textOnFill;

/** Bán kính trong cùng của nhánh quạt — mép ngoài bodygraph ở tâm. */
export const WEDGE_INNER = BANDS.personality.inner;
/** Bán kính dành cho bodygraph ở tâm — trong dải Personality (192), chừa khe. */
export const HUB_R = 186;
/** Vành hoàng đạo 302–330 ⇒ khung nở 26 đơn vị mỗi phía. */
export const ZODIAC_PAD = 26;
const ZODIAC = { inner: RADII.gateOuter + 2, outer: RADII.gateOuter + 30 };
/* U+FE0E: ép vẽ dạng CHỮ — không có nó trình duyệt vẽ cung hoàng đạo thành emoji. */
const ZODIAC_SIGNS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'].map(z => `${z}︎`);

/** Cạnh khung vuông (đơn vị người dùng) — `HubBodygraph` cần để tính phép thu. */
export const mandalaSide = (zodiac: boolean): number => VIEWBOX.size + (zodiac ? 2 * ZODIAC_PAD : 0);

const SECTOR_OF = new Map(SECTORS.map(s => [s.gate, s]));

/**
 * Ký hiệu một phía, xếp trong nhánh quạt. Vẽ theo THỨ TỰ THIÊN THỂ (không theo
 * nhóm) để `data-marker` đi đúng thứ tự cột hành tinh.
 */
function Planets({ side, set, bodies, colour }: { side: Side; set: ActivationSet; bodies: readonly Body[]; colour: string }): JSX.Element {
  const items = bodies.flatMap(b => {
    const a = set.byBody[b];
    return a ? [{ body: b, lon: a.longitude, gate: a.position.gate }] : [];
  });
  const byGate = new Map<number, Body[]>();
  for (const it of items) byGate.set(it.gate, [...(byGate.get(it.gate) ?? []), it.body]);
  return (
    <g data-layer={side}>
      {items.map(it => {
        const group = byGate.get(it.gate)!;
        const slot = bandSlots(group.length, side)[group.indexOf(it.body)]!;
        const deg = SECTOR_OF.get(it.gate)!.midDeg;
        const [x, y] = pointAt(deg, slot.r);
        return (
          <g key={it.body} data-marker={side} data-body={BODY_NAMES[it.body]} data-longitude={it.lon.toFixed(4)}
             data-in-gate={it.gate} data-shown-deg={deg.toFixed(3)} data-r={slot.r.toFixed(2)} data-size={slot.size.toFixed(2)}>
            <PlanetGlyphG body={it.body} cx={x} cy={y} size={slot.size} color={colour} />
          </g>
        );
      })}
    </g>
  );
}

export function Mandala(props: MandalaProps): JSX.Element {
  const { personality, design, activatedGates, gateSources, zodiac = false, className, title, children } = props;
  const bodies = props.bodies ?? DEFINING_BODIES_STANDARD;
  const centerFill = props.colors?.centerFill ?? THEMES[props.theme ?? 'classic'].centerFill;
  const pad = zodiac ? ZODIAC_PAD : 0;
  const s = VIEWBOX.size + 2 * pad;

  const isOn = (gate: number) => activatedGates?.has(gate) ?? gateSources?.has(gate) ?? false;
  const fillOfCenter = (gate: number) => centerFill[GATE_TO_CENTER[gate]!];

  return (
    <svg viewBox={`${-pad} ${-pad} ${s} ${s}`} className={className}
         role="img" aria-label={title ?? 'Rave Mandala'} data-testid="mandala" data-zodiac={zodiac}>
      <title>{title ?? 'Rave Mandala'}</title>

      {zodiac && (
        <g data-layer="zodiac">
          <circle cx={CENTER.x} cy={CENTER.y} r={ZODIAC.outer} fill="none" stroke={COLOR.stroke} strokeWidth={0.6} />
          {ZODIAC_SIGNS.map((z, i) => {
            const [x0, y0] = pointAt(longitudeToScreenDeg(i * 30), ZODIAC.inner);
            const [x1, y1] = pointAt(longitudeToScreenDeg(i * 30), ZODIAC.outer);
            const [tx, ty] = pointAt(longitudeToScreenDeg(i * 30 + 15), (ZODIAC.inner + ZODIAC.outer) / 2);
            return (
              <g key={i} data-zodiac-sign={i}>
                <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={COLOR.stroke} strokeWidth={0.8} />
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" fontSize={13} fill={COLOR.zodiac}>{z}</text>
              </g>
            );
          })}
        </g>
      )}

      {/*
        ★ Đổi 2026-09-29 (Hưng chọn sau khi so với các ứng dụng tham chiếu): quá nhiều
          vòng tròn. Trước: viền từng ô cổng + viền 64 nhánh quạt + vòng tách hai
          dải + mép đĩa xám ⇒ ~6 vòng và 64 tia. Nay như bản tham chiếu: nền TRẮNG, CHỈ ba vòng
          mảnh (vành ngoài, hai mép vành số cổng); ô / nhánh chưa kích hoạt để trống,
          không viền. Nhánh của cổng được kích hoạt vẫn nhuốm màu trung tâm (quạt
          Hưng duyệt 2026-09-25, §5 #30). Phần tử vẫn đủ 64 (`data-wedge`,
          `data-sector`) — test đếm và đọc `data-activated` trên chúng.
      */}
      <g data-layer="wedges">
        {SECTORS.map(sec => (
          <path key={sec.gate} d={sectorPath(sec.startLon, sec.endLon, WEDGE_INNER, RADII.gateInner)}
                fill={isOn(sec.gate) ? fillOfCenter(sec.gate) : 'none'}
                fillOpacity={isOn(sec.gate) ? WEDGE_TINT : undefined}
                stroke="none" data-wedge={sec.gate} />
        ))}
      </g>

      <g data-layer="sectors">
        {[RADII.gateInner, RADII.gateOuter].map(r => (
          <circle key={r} cx={CENTER.x} cy={CENTER.y} r={r} fill="none" stroke={COLOR.stroke} strokeWidth={0.6} data-ring={r} />
        ))}
        {SECTORS.map(sec => {
          const on = isOn(sec.gate);
          const src = gateSources?.get(sec.gate);
          return (
            <path key={sec.gate}
                  d={sectorPath(sec.startLon, sec.endLon, RADII.gateInner, RADII.gateOuter)}
                  fill={on ? fillOfCenter(sec.gate) : 'none'}
                  stroke={on ? '#ffffff' : 'none'} strokeWidth={on ? 0.8 : undefined}
                  /* Ô trống không nền vẫn phải BẤM được (Illustrator bấm ô để bật cổng):
                     mặc định SVG chỉ nhận chuột trên phần có sơn, `fill="none"` là mất. */
                  pointerEvents="all"
                  data-sector={sec.gate} data-slot={sec.slot}
                  data-activated={on ? 'true' : 'false'}
                  data-source={src} data-center={on ? GATE_TO_CENTER[sec.gate] : undefined} />
          );
        })}
      </g>

      <g data-layer="gate-numbers">
        {SECTORS.map(sec => {
          const [x, y] = pointAt(sec.midDeg, (RADII.gateInner + RADII.gateOuter) / 2);
          const on = isOn(sec.gate);
          return (
            <text key={sec.gate} x={x} y={y} textAnchor="middle" dominantBaseline="central"
                  fontSize={12} fill={on ? TEXT_ON_FILL(fillOfCenter(sec.gate)) : COLOR.gateText}
                  fontWeight={on ? 700 : 400}
                  transform={`rotate(${sec.midDeg} ${x} ${y})`}
                  data-gate-label={sec.gate}>
              {sec.gate}
            </text>
          );
        })}
      </g>

      {/*
        ★ Đổi 2026-09-22: 13 thiên thể xác định, KHÔNG Chiron.
        Trước đây dùng `ALL_BODIES` nên mandala vẽ cả Chiron trong khi bodygraph
        thì không — hai hình cạnh nhau, đếm ra hai con số khác nhau. Chiron không
        xuất hiện trên chart, xem ghi chú CHIRON ở `calc-core/ephemeris/bodies.ts`.
      */}
      <Planets side="design" set={design} bodies={bodies} colour={props.colors?.design ?? COLOR.design} />
      <Planets side="personality" set={personality} bodies={bodies} colour={props.colors?.personality ?? COLOR.personality} />

      {children && <g data-layer="hub">{children}</g>}
    </svg>
  );
}
