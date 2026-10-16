/**
 * Gates → channels → centers → definition — SPEC.md §7.4.
 *
 * ⚠️ STRONG INFERENCE: tài liệu tham chiếu chỉ cho biết KIỂU dữ liệu, không phải
 *    logic từng method. Toàn bộ luật ở file này dựng theo HD công khai và
 *    CHỈ được coi là đúng khi golden charts xanh (SPEC §11 U4).
 */
import { CenterId, CHANNELS, GATE_TO_CENTER, MOTOR_CENTERS, channelsContaining, type ChannelDef } from './tables.js';

export type Definition = 'None' | 'Single' | 'Split' | 'TripleSplit' | 'QuadrupleSplit';

export interface StructureResult {
  definedGates: ReadonlySet<number>;
  definedChannels: readonly ChannelDef[];
  definedCenters: ReadonlySet<CenterId>;
  definition: Definition;
  /** Số thành phần liên thông của đồ thị trung tâm-defined. */
  componentCount: number;
}

/** Kênh "defined" khi CẢ HAI cổng của nó được kích hoạt. CONFIRMED (ghi chép nội bộ). */
export function deriveDefinedChannels(definedGates: ReadonlySet<number>): ChannelDef[] {
  return CHANNELS.filter(ch => definedGates.has(ch.gates[0]) && definedGates.has(ch.gates[1]));
}

/** Trung tâm "defined" khi chạm ít nhất một kênh defined. CONFIRMED (ghi chép nội bộ). */
export function deriveDefinedCenters(definedChannels: readonly ChannelDef[]): Set<CenterId> {
  const out = new Set<CenterId>();
  for (const ch of definedChannels) for (const g of ch.gates) {
    const c = GATE_TO_CENTER[g];
    if (c === undefined) throw new Error(`Cổng ${g} không có trung tâm trong gate-center.json`);
    out.add(c);
  }
  return out;
}

const DEFINITION_BY_COMPONENTS: readonly Definition[] =
  ['None', 'Single', 'Split', 'TripleSplit', 'QuadrupleSplit'];

/** Số thành phần liên thông của đồ thị (đỉnh = trung tâm defined, cạnh = kênh defined). */
export function countComponents(
  definedCenters: ReadonlySet<CenterId>,
  definedChannels: readonly ChannelDef[],
): number {
  if (definedCenters.size === 0) return 0;
  const adj = new Map<CenterId, Set<CenterId>>();
  for (const c of definedCenters) adj.set(c, new Set());
  for (const ch of definedChannels) {
    const a = GATE_TO_CENTER[ch.gates[0]]!, b = GATE_TO_CENTER[ch.gates[1]]!;
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  }
  const seen = new Set<CenterId>();
  let components = 0;
  for (const start of definedCenters) {
    if (seen.has(start)) continue;
    components++;
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const nb of adj.get(cur) ?? []) if (!seen.has(nb)) stack.push(nb);
    }
  }
  return components;
}

export function deriveStructure(definedGates: ReadonlySet<number>): StructureResult {
  const definedChannels = deriveDefinedChannels(definedGates);
  const definedCenters = deriveDefinedCenters(definedChannels);
  const componentCount = countComponents(definedCenters, definedChannels);
  const definition = DEFINITION_BY_COMPONENTS[Math.min(componentCount, 4)] ?? 'QuadrupleSplit';
  return { definedGates, definedChannels, definedCenters, definition, componentCount };
}

/** Có đường đi qua kênh defined từ một motor tới Throat không? */
export function motorConnectedToThroat(
  definedCenters: ReadonlySet<CenterId>,
  definedChannels: readonly ChannelDef[],
): boolean {
  if (!definedCenters.has(CenterId.Throat)) return false;
  const adj = new Map<CenterId, Set<CenterId>>();
  for (const c of definedCenters) adj.set(c, new Set());
  for (const ch of definedChannels) {
    const a = GATE_TO_CENTER[ch.gates[0]]!, b = GATE_TO_CENTER[ch.gates[1]]!;
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  }
  const seen = new Set<CenterId>([CenterId.Throat]);
  const stack: CenterId[] = [CenterId.Throat];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur !== CenterId.Throat && MOTOR_CENTERS.includes(cur)) return true;
    for (const nb of adj.get(cur) ?? []) if (!seen.has(nb)) { seen.add(nb); stack.push(nb); }
  }
  return false;
}

export { channelsContaining };
