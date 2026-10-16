/** Lắp ráp RaveChart — SPEC.md §6.3. */
import { Body, DEFAULT_BODY_CONFIG, DEFINING_BODIES_STANDARD, type BodyConfig } from '../ephemeris/bodies.js';
import type { EphemerisProvider } from '../ephemeris/provider.js';
import { DESIGN_ARC } from './constants.js';
import { computeActivations, type ActivationSet } from './activations.js';
import { findMomentOfSolarArc } from './search.js';
import { deriveStructure, type Definition } from './derive/structure.js';
import { deriveAuthority, deriveCross, deriveProfile, deriveType, type Authority, type HdType } from './derive/type-authority.js';
import type { CenterId, ChannelDef, CrossDef } from './derive/tables.js';

export const CALC_CORE_VERSION = '0.1.0';

export interface RaveChart {
  personality: ActivationSet;
  design: ActivationSet;
  definedGates: ReadonlySet<number>;
  definedChannels: readonly ChannelDef[];
  definedCenters: ReadonlySet<CenterId>;
  type: HdType;
  authority: Authority;
  /** Mã 2 chữ số, ví dụ 13 = profile 1/3. */
  profile: number;
  definition: Definition;
  cross: CrossDef | null;
  /** ★ Bắt buộc — khi golden đỏ, đây là thứ trả lời "chạy bằng gì". */
  provenance: {
    providerId: string;
    bodyConfig: BodyConfig;
    calcCoreVersion: string;
    designSearchIterations: number;
    designResidualDeg: number;
  };
}

/** Gộp cổng của cả hai bộ activation thành tập cổng được kích hoạt. */
function collectGates(sets: readonly ActivationSet[], bodies: readonly Body[]): Set<number> {
  const out = new Set<number>();
  for (const s of sets) for (const b of bodies) {
    const a = s.byBody[b];
    if (a) out.add(a.position.gate);
  }
  return out;
}

export function calculateRaveChart(
  eph: EphemerisProvider,
  jdBirthUT: number,
  cfg: BodyConfig = DEFAULT_BODY_CONFIG,
): RaveChart {
  const personality = computeActivations(eph, jdBirthUT, cfg);

  // Design = Mặt Trời lùi đúng 88° cung (SPEC §5.5)
  const search = findMomentOfSolarArc(eph, jdBirthUT, DESIGN_ARC);
  const design = computeActivations(eph, search.jdUT, cfg);

  // Định nghĩa luôn do ĐÚNG 13 thiên thể quyết; Chiron không bao giờ tham gia.
  // Không còn cờ cấu hình cho việc này — xem ghi chú CHIRON trong bodies.ts.
  const definedGates = collectGates([personality, design], DEFINING_BODIES_STANDARD);

  const struct = deriveStructure(definedGates);
  const type = deriveType(struct.definedCenters, struct.definedChannels);
  const authority = deriveAuthority(struct.definedCenters, struct.definedChannels, type);

  const sunP = personality.byBody[Body.Sun]!;
  const earthP = personality.byBody[Body.Earth]!;
  const sunD = design.byBody[Body.Sun]!;
  const earthD = design.byBody[Body.Earth]!;

  const profile = deriveProfile(sunP.position.line, sunD.position.line);

  return {
    personality,
    design,
    definedGates: struct.definedGates,
    definedChannels: struct.definedChannels,
    definedCenters: struct.definedCenters,
    type,
    authority,
    profile,
    definition: struct.definition,
    cross: deriveCross(sunP.position.gate, earthP.position.gate, sunD.position.gate, earthD.position.gate, profile),
    provenance: {
      providerId: eph.id,
      bodyConfig: cfg,
      calcCoreVersion: CALC_CORE_VERSION,
      designSearchIterations: search.iterations,
      designResidualDeg: search.residualDeg,
    },
  };
}
