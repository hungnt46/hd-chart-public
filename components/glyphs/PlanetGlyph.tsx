/**
 * Ký hiệu hành tinh VẼ BẰNG SVG — thay cho ký tự Unicode `BODY_GLYPHS`.
 *
 * ★ Vì sao không dùng ký tự: hình ký tự phụ thuộc font của MÁY. Đo 2026-09-25:
 *   ⊕ của font hệ thống để dấu cộng HỞ, không chạm vòng tròn; ⛢ và ☾ có máy
 *   không có glyph; ♀ ♂ trên iOS có lúc hiện thành emoji màu. Vẽ SVG thì mọi
 *   máy — và ảnh xuất PNG/SVG — ra cùng một hình.
 *
 * ★ Dáng theo ỨNG DỤNG THAM CHIẾU (Hưng chốt 2026-09-25), đo trên các ký
 *   hiệu hành tinh của ứng dụng đó — tự vẽ lại theo dáng, KHÔNG chép
 *   path của họ. Bốn chỗ khác bộ Unicode kiểu Anh–Mỹ trước đây:
 *     · Trái Đất: chữ thập CHẠM vành;
 *     · Mặt Trăng: ☾ (lưng bên trái, hai sừng quay phải);
 *     · Thiên Vương: ⛢ vòng tròn CÓ CHẤM giữa + mũi tên lên (không phải chữ H ♅);
 *     · Diêm Vương: ♇ chữ P lồng L — THEO BẢN THAM CHIẾU, không theo sách IHDS (font
 *       Neutrinos vẽ cái chén ôm quả cầu). Hưng chọn bản tham chiếu.
 *   Mặt Trăng và Thiên Vương khớp cả sách IHDS lẫn bản tham chiếu.
 *
 * Nét vẽ trong hộp 24×24, tâm (12,12). `BODY_GLYPHS` (ký tự) vẫn giữ cho chỗ
 * chỉ có CHỮ, ví dụ thông báo dạng chuỗi.
 */
import type { JSX } from 'react';
import { Body, BODY_NAMES } from '../../calc-core/ephemeris/bodies.js';

export const GLYPH_BOX = 24;
/** Độ dày nét trong hộp 24 — ngang nét chữ thường ở cỡ cột hành tinh. */
const STROKE = 1.7;

/** [cx, cy, r, tô đặc?] */
type Circle = readonly [number, number, number, boolean?];
interface Shape { d?: string; circles?: readonly Circle[] }

export const PLANET_GLYPH_SHAPES: Readonly<Record<Body, Shape>> = {
  [Body.Sun]: { circles: [[12, 12, 9], [12, 12, 2.2]] },
  [Body.Earth]: { d: 'M12 3V21M3 12H21', circles: [[12, 12, 9]] },
  [Body.Moon]: { d: 'M15.5 3.2A9 9 0 1 0 15.5 20.8A10 10 0 0 1 15.5 3.2Z' },
  [Body.NorthNode]: {
    d: 'M8.2 16.1A6.4 6.4 0 1 1 15.8 16.1',
    circles: [[6.8, 17.6, 1.9], [17.2, 17.6, 1.9]],
  },
  [Body.SouthNode]: {
    d: 'M8.2 7.9A6.4 6.4 0 1 0 15.8 7.9',
    circles: [[6.8, 6.4, 1.9], [17.2, 6.4, 1.9]],
  },
  [Body.Mercury]: {
    d: 'M8.4 2.8A3.6 3.6 0 0 0 15.6 2.8M12 13.6V21.5M8.8 18H15.2',
    circles: [[12, 10, 3.6]],
  },
  [Body.Venus]: { d: 'M12 13.7V21.8M8.5 18.2H15.5', circles: [[12, 8.5, 5.2]] },
  [Body.Mars]: { d: 'M13.56 10.44L20.5 3.5M14.8 3.5H20.5V9.2', circles: [[9.6, 14.4, 5.6]] },
  [Body.Jupiter]: { d: 'M4.5 7.2C4.5 3.8 10.2 3.2 10.2 7.4C10.2 10.6 7.5 13.6 4.8 16.4H19.5M15.8 3.2V21.2' },
  [Body.Saturn]: {
    d: 'M7.5 3.2H10.8M9.2 3.2V18.5M9.2 12C10.3 9.7 16 8.8 16 12.8C16 15 13.9 16.2 13.9 18.3C13.9 20 15.4 20.9 16.6 20.2',
  },
  [Body.Uranus]: {
    d: 'M12 11.4V3.2M8.9 6.3L12 3.2L15.1 6.3',
    circles: [[12, 16.2, 4.8], [12, 16.2, 1.3, true]],
  },
  [Body.Neptune]: { d: 'M5.2 4.5V8C5.2 12 8.2 14.2 12 14.2S18.8 12 18.8 8V4.5M12 3.2V21.5M8.6 18H15.4' },
  [Body.Pluto]: { d: 'M7.5 3.2V20.8H17M7.5 3.2H12.2A4.4 4.4 0 0 1 12.2 12H7.5' },
  // Chiron không hiện trên giao diện (CLAUDE.md) — vẫn có hình để kiểu đủ 14 thiên thể.
  [Body.Chiron]: { d: 'M12 3V15.5M12 9.3L16.5 4.5M12 9.3L16.5 13.8', circles: [[12, 18.3, 2.8]] },
};

function Strokes({ body, color }: { body: Body; color: string }): JSX.Element {
  const s = PLANET_GLYPH_SHAPES[body];
  return (
    <>
      {s.d && <path d={s.d} fill="none" stroke={color} strokeWidth={STROKE}
                    strokeLinecap="round" strokeLinejoin="round" />}
      {s.circles?.map(([cx, cy, r, solid], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={solid ? color : 'none'}
                stroke={solid ? 'none' : color} strokeWidth={STROKE} />
      ))}
    </>
  );
}

/**
 * Ký hiệu đặt TRONG một SVG khác (cột hành tinh, mandala): tâm (cx, cy), cạnh
 * `size` theo đơn vị của SVG cha. Màu ghi thẳng vào thuộc tính (không
 * `currentColor`) để ảnh xuất SVG/PNG giữ đúng màu.
 */
export function PlanetGlyphG({ body, cx, cy, size, color }: {
  body: Body; cx: number; cy: number; size: number; color: string;
}): JSX.Element {
  const k = size / GLYPH_BOX;
  return (
    <g data-glyph={BODY_NAMES[body]} data-cx={cx}
       transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${k})`}>
      <Strokes body={body} color={color} />
    </g>
  );
}

/** Ký hiệu đứng giữa dòng chữ HTML — theo màu và cỡ chữ xung quanh. */
export function PlanetGlyph({ body, className, title }: {
  body: Body; className?: string; title?: string;
}): JSX.Element {
  return (
    <svg viewBox={`0 0 ${GLYPH_BOX} ${GLYPH_BOX}`} width="1em" height="1em"
         className={`inline-block align-[-0.125em] ${className ?? ''}`}
         data-glyph={BODY_NAMES[body]} role={title ? 'img' : undefined}
         aria-label={title} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <Strokes body={body} color="currentColor" />
    </svg>
  );
}
