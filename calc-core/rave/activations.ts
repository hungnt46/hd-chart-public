/** Tính vị trí 14 thiên thể tại một thời điểm UT — SPEC.md §5.6, §6.3. */
import { Body, ALL_BODIES, iplFor, type BodyConfig } from '../ephemeris/bodies.js';
import type { EphemerisProvider } from '../ephemeris/provider.js';
import { mod360 } from './constants.js';
import { longitudeToPosition, type WheelPosition } from './position.js';

export interface Activation {
  body: Body;
  longitude: number;
  position: WheelPosition;
}

export interface ActivationSet {
  jdUT: number;
  /**
   * ★ PARTIAL, có chủ đích (sửa 2026-09-21 — ESLint `no-unnecessary-condition`
   * chỉ ra kiểu cũ nói dối).
   *
   * Kiểu cũ khai `Record<Body, Activation>` — tức "mọi thiên thể đều có". SAI:
   * dòng dưới BỎ QUA Chiron khi ephemeris không hỗ trợ (`capabilities.chiron`),
   * nên `byBody[Body.Chiron]` thật sự là `undefined` lúc chạy. Cái `{} as Record`
   * che mất sự thật đó, khiến mọi phép kiểm `if (a)` trông như thừa — ai dọn
   * "code thừa" là sập ngay trên ephemeris không có Chiron.
   */
  byBody: Readonly<Partial<Record<Body, Activation>>>;
}

/**
 * Tính toàn bộ activation tại `jdUT`.
 * Earth và SouthNode KHÔNG hỏi ephemeris — chúng là đối xứng 180° (SPEC §5.6).
 */
export function computeActivations(
  eph: EphemerisProvider,
  jdUT: number,
  cfg: BodyConfig,
): ActivationSet {
  const lons = new Map<Body, number>();

  for (const body of ALL_BODIES) {
    if (body === Body.Earth || body === Body.SouthNode) continue;
    if (body === Body.Chiron && !eph.capabilities.chiron) continue;
    const ipl = iplFor(body, cfg);
    if (ipl === null) throw new Error(`Thiếu ipl cho thiên thể ${Body[body]}`);
    lons.set(body, mod360(eph.longitude(jdUT, ipl)));
  }

  // Dẫn xuất bằng đối xứng — CONFIRMED (ghi chép nội bộ)
  const sun = lons.get(Body.Sun);
  const nn = lons.get(Body.NorthNode);
  if (sun === undefined || nn === undefined) throw new Error('Thiếu Sun hoặc NorthNode');
  lons.set(Body.Earth, mod360(sun + 180));
  lons.set(Body.SouthNode, mod360(nn + 180));

  const byBody: Partial<Record<Body, Activation>> = {};
  for (const [body, longitude] of lons) {
    byBody[body] = { body, longitude, position: longitudeToPosition(longitude) };
  }
  return { jdUT, byBody };
}
