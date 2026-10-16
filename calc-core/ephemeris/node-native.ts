/**
 * Implementation dùng `@swisseph/node` — chạy trong Node, phục vụ test và
 * kiểm chéo hai backend (SPEC §9.5). Đã chọn ở Phase 0: lệch 0″ so với `sweph`.
 */
import { SEFLG_SWIEPH } from '../rave/constants.js';
import { assertNoFallback, type EphemerisCapabilities, type EphemerisProvider } from './provider.js';

export class NodeNativeEphemeris implements EphemerisProvider {
  readonly id = '@swisseph/node';
  readonly capabilities: EphemerisCapabilities = {
    chiron: true,
    trueNode: true,
    maxErrorArcsec: 0,          // Phase 0: trùng khít bit-level với sweph native
    dataSource: 'swisseph-files',
  };
  #swe: typeof import('@swisseph/node') | null = null;

  constructor(private readonly ephePath: string) {}

  async init(): Promise<void> {
    const m = await import('@swisseph/node');
    m.setEphemerisPath(this.ephePath);
    this.#swe = m;
  }

  longitude(jdUT: number, ipl: number): number {
    if (!this.#swe) throw new Error('NodeNativeEphemeris: chưa gọi init()');
    const r = this.#swe.calculatePosition(jdUT, ipl, SEFLG_SWIEPH) as {
      longitude: number; flags: number;
    };
    assertNoFallback(r.flags, jdUT, ipl);   // ★ SPEC §6.1(a)
    return r.longitude;
  }
}
