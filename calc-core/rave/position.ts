/**
 * Kinh độ hoàng đạo → Gate.Line.Color.Tone.Base — SPEC.md §5.3–5.4.
 * Thuần số học, không phụ thuộc ephemeris.
 */
import {
  ARCSEC_PER_DEG, BASES_PER_TONE, COLORS_PER_LINE, DEG_PER_BASE, DEG_PER_COLOR,
  DEG_PER_GATE, DEG_PER_LINE, DEG_PER_TONE, LINES_PER_GATE, TONES_PER_COLOR,
  WHEEL, WHEEL_OFFSET, mod360,
} from './constants.js';

export type SubdivisionLevel = 'gate' | 'line' | 'color' | 'tone' | 'base';

/** Khoảng cách tới biên gần nhất của một mức — SPEC §5.4 (yêu cầu D4). */
export interface BoundaryMargin {
  /** Mức có biên gần nhất tính theo arcsec. */
  level: SubdivisionLevel;
  /** Khoảng cách tới biên đó, arcsec. */
  distanceArcsec: number;
  /** Khoảng cách tới biên Base gần nhất, arcsec — dùng cho ngưỡng ở SPEC §9.4. */
  baseDistanceArcsec: number;
}

export interface WheelPosition {
  /** Kinh độ hoàng đạo tropical đưa vào, đã chuẩn hoá [0,360). */
  longitude: number;
  /** Ô trên bánh xe, 1..64 (trước khi tra WHEEL). */
  gateSlot: number;
  gate: number;   // 1..64
  line: number;   // 1..6
  color: number;  // 1..6
  tone: number;   // 1..6
  base: number;   // 1..5  ← chỉ 5
  linePercent: number;
  colorPercent: number;
  tonePercent: number;
  basePercent: number;
  margin: BoundaryMargin;
}

/** Khoảng cách tới biên gần nhất của một lưới đều bước `step`, tính bằng arcsec. */
const marginArcsec = (posInGate: number, step: number): number => {
  const r = posInGate % step;
  return Math.min(r, step - r) * ARCSEC_PER_DEG;
};

/**
 * Chia kinh độ thành Gate.Line.Color.Tone.Base.
 *
 * ★ Chiều dấu `pos = longitude - WHEEL_OFFSET` là VERIFIED-OFFLINE (SPEC §5.3):
 *   nó cho Gate 41 bắt đầu tại đúng 302.0000° = 2°00′ Aquarius.
 */
export function longitudeToPosition(longitude: number): WheelPosition {
  const lon = mod360(longitude);
  const pos = mod360(lon - WHEEL_OFFSET);

  const gateSlot = Math.floor(pos / DEG_PER_GATE) + 1;          // 1..64
  const gate = WHEEL[gateSlot - 1];
  if (gate === undefined) throw new RangeError(`Ô bánh xe ngoài phạm vi: ${gateSlot}`);

  const inGate  = pos - (gateSlot - 1) * DEG_PER_GATE;          // [0, 5.625)
  const line    = Math.floor(inGate / DEG_PER_LINE) + 1;
  const inLine  = inGate - (line - 1) * DEG_PER_LINE;
  const color   = Math.floor(inLine / DEG_PER_COLOR) + 1;
  const inColor = inLine - (color - 1) * DEG_PER_COLOR;
  const tone    = Math.floor(inColor / DEG_PER_TONE) + 1;
  const inTone  = inColor - (tone - 1) * DEG_PER_TONE;
  const base    = Math.floor(inTone / DEG_PER_BASE) + 1;
  const inBase  = inTone - (base - 1) * DEG_PER_BASE;

  const baseDist = marginArcsec(inGate, DEG_PER_BASE);
  const candidates: readonly (readonly [SubdivisionLevel, number])[] = [
    ['gate',  marginArcsec(pos, DEG_PER_GATE)],
    ['line',  marginArcsec(inGate, DEG_PER_LINE)],
    ['color', marginArcsec(inGate, DEG_PER_COLOR)],
    ['tone',  marginArcsec(inGate, DEG_PER_TONE)],
    ['base',  baseDist],
  ];
  let nearest = candidates[0]!;
  for (const c of candidates) if (c[1] < nearest[1]) nearest = c;

  return {
    longitude: lon,
    gateSlot,
    gate,
    // clamp chống lỗi làm tròn dấu phẩy động ở sát biên trên
    line:  Math.min(line,  LINES_PER_GATE),
    color: Math.min(color, COLORS_PER_LINE),
    tone:  Math.min(tone,  TONES_PER_COLOR),
    base:  Math.min(base,  BASES_PER_TONE),
    linePercent:  inLine  / DEG_PER_LINE,
    colorPercent: inColor / DEG_PER_COLOR,
    tonePercent:  inTone  / DEG_PER_TONE,
    basePercent:  inBase  / DEG_PER_BASE,
    margin: { level: nearest[0], distanceArcsec: nearest[1], baseDistanceArcsec: baseDist },
  };
}
