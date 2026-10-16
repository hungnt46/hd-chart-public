/**
 * Trạng thái FIXING của một kích hoạt — exalted, detriment, cả hai (juxtaposed),
 * hay không gì cả. Thuần, không React.
 *
 * ★ Luật ĐO đối chiếu với một ứng dụng tham chiếu 2026-09-23, không suy từ văn xuôi (luật cấm ở
 *   CLAUDE.md). Bằng chứng: fixture đối chiếu 2026-09-23 trong `__fixtures__/reference/`,
 *   4 chart, khớp mọi dòng.
 *
 *   Hào G.L có exalted khi hành tinh EXALT hào đó (tra `fixingPlanets`) đang
 *   kích hoạt cổng G HOẶC một cổng hài hoà của G — đầu kia của BẤT KỲ kênh nào
 *   qua G. Detriment y hệt với hành tinh detriment. Tính cả Personality lẫn
 *   Design: cycle Design Mercury 28.1 bị ▼ vì Venus Personality ở 38.5.
 *
 *   Luật cũ ("thiên thể ĐANG kích hoạt chính là hành tinh fix") là trường hợp
 *   riêng — thiên thể đó hiển nhiên nằm ở cổng G — và trên 10 chart golden nó
 *   lệch 28 dòng: thiếu 24 dấu, 4 dòng juxtaposed chỉ ra ▼ (đếm 2026-09-23).
 *   "Chỉ cùng cổng" cũng sai: G01 Saturn 43.5 ▲ là nhờ Moon ở
 *   23.2, kênh 23-43. Test đột biến khoá cả hai.
 *
 *   Nhóm integration 10/20/34/57 có NHIỀU cổng hài hoà — lấy hết từ `CHANNELS`,
 *   đừng liệt kê tay. Bản tham chiếu xác nhận: g10 10.6 và 57.5 exalted nhờ Pluto ở 20.6.
 *
 * ★ "Trái tim ♥" thấy trên bản tham chiếu KHÔNG phải trạng thái thứ ba. Đó là ▼ bo góc tô
 *   đỏ design, ở ~6px trông như trái tim. Trạng thái thứ ba thật là Juxtaposed.
 */
import { Body } from '../../ephemeris/bodies.js';
import { fixingPlanets } from '../../hd-data/fixings.js';
import type { ActivationSet } from '../activations.js';
import { channelsContaining } from './tables.js';

/**
 * Ai gây ra một chiều fixing.
 * `own` — chính chart của dòng đó · `other` — chart kia trong chart ghép ·
 * `both` — cả hai (bản tham chiếu: lớp `double-*`, tô riêng một màu).
 */
export type FixingTrigger = 'own' | 'other' | 'both';

export interface FixingState {
  exalted: FixingTrigger | null;
  detriment: FixingTrigger | null;
}

/** Dạng gộp cho giao diện — tên theo bảng trạng thái fixing chuẩn. */
export type FixingKind = 'exalted' | 'detriment' | 'juxtaposed';

/** Cổng G cùng mọi cổng hài hoà của nó. */
export function fixingZone(gate: number): ReadonlySet<number> {
  const z = new Set([gate]);
  for (const ch of channelsContaining(gate)) for (const g of ch.gates) z.add(g);
  return z;
}

function occupies(sets: readonly ActivationSet[], body: Body, zone: ReadonlySet<number>): boolean {
  return sets.some(s => {
    const a = s.byBody[body];
    return a !== undefined && zone.has(a.position.gate);
  });
}

/**
 * Trạng thái fixing của hào `gate.line` trong ngữ cảnh chart.
 *
 * `own` là MỌI bộ kích hoạt của chart chứa dòng đó — chart người là
 * `[personality, design]`, chart transit đứng một mình là `[transit]`. Chính
 * dòng đó phải nằm trong `own`, nhờ vậy luật cũ tự rơi ra làm trường hợp riêng.
 * `other` chỉ dùng cho chart ghép (chu kỳ, transit ghép, kết nối).
 */
export function fixingState(
  gate: number, line: number,
  own: readonly ActivationSet[], other: readonly ActivationSet[] = [],
): FixingState {
  const zone = fixingZone(gate);
  const planets = fixingPlanets(gate, line);
  const trigger = (planet: Body | null): FixingTrigger | null => {
    if (planet === null) return null;
    const o = occupies(own, planet, zone), x = occupies(other, planet, zone);
    return o && x ? 'both' : o ? 'own' : x ? 'other' : null;
  };
  return { exalted: trigger(planets.exalted), detriment: trigger(planets.detriment) };
}

export function fixingKind(s: FixingState): FixingKind | null {
  if (s.exalted && s.detriment) return 'juxtaposed';
  return s.exalted ? 'exalted' : s.detriment ? 'detriment' : null;
}
