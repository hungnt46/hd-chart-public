/** Nạp bảng cấu trúc HD từ hd-data/ và dựng chỉ mục tra cứu. SPEC §7. */
import channelsJson from '../../hd-data/channels.json' with { type: 'json' };
import crossesJson from '../../hd-data/crosses.json' with { type: 'json' };
import gateCenterJson from '../../hd-data/gate-center.json' with { type: 'json' };
import centersJson from '../../hd-data/centers.json' with { type: 'json' };
import profilesJson from '../../hd-data/profiles.json' with { type: 'json' };

export interface ChannelDef { id: number; gates: [number, number] }
export interface CrossDef {
  id: number;
  angle: string;
  gates: [number, number, number, number];
  /** Tên gốc trong bảng chuỗi tham chiếu — KHÔNG có số biến thể. */
  name: string;
  /**
   * Số biến thể trong họ cùng (angle + name), 1-based; `null` khi họ chỉ có một.
   *
   * ★ Phát hiện 2026-09-21 từ cả 6 golden: app của Jovian Archive hiển thị
   *   "Right Angle Cross of Eden **2**", còn string table chỉ có "…of Eden".
   *   Bảng 192 cross chứa nhiều entry TRÙNG TÊN, khác nhau ở thứ tự bộ 4 cổng
   *   (ví dụ Penetration có id 156–159). Số hiển thị chính là vị trí trong họ đó.
   *
   *   Cấu trúc khớp chính xác với cách HD phân loại:
   *     Juxtaposition  64 họ × 1  → không số
   *     Left Angle     32 họ × 2  → 1–2
   *     Right Angle    16 họ × 4  → 1–4      tổng 192 ✓
   */
  variant: number | null;
}

export const CHANNELS: readonly ChannelDef[] =
  Object.freeze(channelsJson.channels.map(c => ({ id: c.id, gates: [c.gates[0]!, c.gates[1]!] as [number, number] })));

export const CROSSES: readonly CrossDef[] = Object.freeze((() => {
  // Đếm số entry mỗi họ (angle + name) để biết họ nào cần đánh số.
  const size = new Map<string, number>();
  for (const c of crossesJson.crosses) {
    const k = `${c.angle}|${c.name}`;
    size.set(k, (size.get(k) ?? 0) + 1);
  }
  // Duyệt theo THỨ TỰ ID — thứ tự này đến thẳng từ bảng tham chiếu, và chính nó
  // quyết định số biến thể (đã kiểm trên cả 6 golden của Jovian Archive).
  const seen = new Map<string, number>();
  return [...crossesJson.crosses]
    .sort((a, b) => a.id - b.id)
    .map(c => {
      const k = `${c.angle}|${c.name}`;
      const n = (seen.get(k) ?? 0) + 1;
      seen.set(k, n);
      return {
        id: c.id, angle: c.angle, name: c.name,
        gates: [c.gates[0]!, c.gates[1]!, c.gates[2]!, c.gates[3]!] as [number, number, number, number],
        variant: (size.get(k) ?? 1) > 1 ? n : null,
      };
    });
})());

/** Mã trung tâm theo thứ tự chuẩn: 0 Root … 8 Head. */
export enum CenterId {
  Root = 0, Sacral = 1, Spleen = 2, SolarPlexus = 3, Heart = 4,
  G = 5, Throat = 6, Ajna = 7, Head = 8,
}

export const CENTER_NAMES: Readonly<Record<number, string>> =
  Object.freeze(Object.fromEntries(centersJson.centers.map(c => [c.id, c.name])));

export const GATE_TO_CENTER: Readonly<Record<number, CenterId>> = Object.freeze(
  Object.fromEntries(
    Object.entries(gateCenterJson.centersByGate).map(([g, c]) => [Number(g), c]),
  ),
);

/** Bốn trung tâm động cơ (motor) — kiến thức HD công khai. */
export const MOTOR_CENTERS: readonly CenterId[] =
  Object.freeze([CenterId.Root, CenterId.Sacral, CenterId.SolarPlexus, CenterId.Heart]);

/** 12 mã profile hợp lệ, rút từ khoá bảng profile chuẩn. CONFIRMED. */
export const VALID_PROFILE_CODES: readonly number[] = Object.freeze([...profilesJson.profiles]);

export type CrossAngle = 'Right' | 'Left' | 'Juxtaposition';

/**
 * Góc của cross suy từ profile — kiến thức HD công khai, STRONG INFERENCE.
 *
 * ★ Cần thiết vì bộ 4 cổng KHÔNG phải khoá duy nhất: 192 cross chỉ có 128 bộ-4
 *   phân biệt. Cụ thể (đo từ chính bảng tham chiếu):
 *     64 Right  — bộ-4 riêng, không đụng ai
 *     64 Left   ┐ dùng CHUNG 64 bộ-4 với nhau
 *     64 Jux    ┘
 *   ⇒ khoá tra cứu phải là (bộ-4 + góc). Phát hiện ở Phase 1 nhờ test bất biến.
 */
export const PROFILE_TO_CROSS_ANGLE: Readonly<Record<number, CrossAngle>> = Object.freeze({
  13: 'Right', 14: 'Right', 24: 'Right', 25: 'Right', 35: 'Right', 36: 'Right', 46: 'Right',
  41: 'Juxtaposition',
  51: 'Left', 52: 'Left', 62: 'Left', 63: 'Left',
});

/** Tra cross theo bộ 4 cổng (GIỮ NGUYÊN thứ tự) + góc. SPEC §7.5. */
const crossIndex = new Map<string, CrossDef>();
for (const c of CROSSES) crossIndex.set(`${c.gates.join('/')}|${c.angle}`, c);
export const lookupCross = (
  sunP: number, earthP: number, sunD: number, earthD: number, angle: CrossAngle,
): CrossDef | null => crossIndex.get(`${sunP}/${earthP}/${sunD}/${earthD}|${angle}`) ?? null;

/** Kênh chứa một cổng. */
const channelsByGate = new Map<number, ChannelDef[]>();
for (const ch of CHANNELS) for (const g of ch.gates) {
  const arr = channelsByGate.get(g) ?? [];
  arr.push(ch);
  channelsByGate.set(g, arr);
}
export const channelsContaining = (gate: number): readonly ChannelDef[] => channelsByGate.get(gate) ?? [];
