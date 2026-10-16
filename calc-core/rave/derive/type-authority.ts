/**
 * Type · Authority · Profile · Cross — SPEC.md §7.4.
 *
 * ⚠️ Type và Authority là STRONG INFERENCE (luật dựng theo HD công khai).
 *    Profile là CONFIRMED (mã = lineP*10 + lineD, từ khoá bảng profile chuẩn).
 *    Cross là CONFIRMED (tra bảng 192 mục rút từ bảng cross tham chiếu).
 */
import { CenterId, PROFILE_TO_CROSS_ANGLE, VALID_PROFILE_CODES, lookupCross, type ChannelDef, type CrossAngle, type CrossDef } from './tables.js';
import { motorConnectedToThroat } from './structure.js';

export type HdType = 'Manifestor' | 'Generator' | 'ManifestingGenerator' | 'Projector' | 'Reflector';
export type Authority =
  | 'SolarPlexus' | 'Sacral' | 'Splenic' | 'Ego' | 'EgoProjected' | 'G' | 'None';

/**
 * Luật Type (HD công khai):
 *   không trung tâm nào defined            → Reflector
 *   Sacral defined  + motor→Throat         → Manifesting Generator
 *   Sacral defined  (không motor→Throat)   → Generator
 *   Sacral undefined + motor→Throat        → Manifestor
 *   còn lại                                → Projector
 */
export function deriveType(
  definedCenters: ReadonlySet<CenterId>,
  definedChannels: readonly ChannelDef[],
): HdType {
  if (definedCenters.size === 0) return 'Reflector';
  const sacral = definedCenters.has(CenterId.Sacral);
  const toThroat = motorConnectedToThroat(definedCenters, definedChannels);
  if (sacral) return toThroat ? 'ManifestingGenerator' : 'Generator';
  return toThroat ? 'Manifestor' : 'Projector';
}

/**
 * Luật Authority theo thứ tự ưu tiên (HD công khai):
 *   Solar Plexus → Sacral → Spleen → Heart → G → None
 *
 * Phân biệt Ego/EgoProjected và G: bảng authority chuẩn có cả `Ego` (Ego Manifested),
 * `EgoProjected` và `G` (Self Projected).
 * Quy ước dùng ở đây: Heart defined → `Ego` nếu có motor→Throat (manifestor-ish),
 * ngược lại `EgoProjected`. G defined mà không motor/spleen → `G`.
 * ⚠️ Ranh giới Ego vs EgoProjected là điểm dễ sai nhất — golden phải xác nhận.
 */
export function deriveAuthority(
  definedCenters: ReadonlySet<CenterId>,
  definedChannels: readonly ChannelDef[],
  type: HdType,
): Authority {
  if (type === 'Reflector') return 'None';
  if (definedCenters.has(CenterId.SolarPlexus)) return 'SolarPlexus';
  if (definedCenters.has(CenterId.Sacral)) return 'Sacral';
  if (definedCenters.has(CenterId.Spleen)) return 'Splenic';
  if (definedCenters.has(CenterId.Heart)) {
    return motorConnectedToThroat(definedCenters, definedChannels) ? 'Ego' : 'EgoProjected';
  }
  if (definedCenters.has(CenterId.G)) return 'G';
  return 'None';   // mental projector — quyết định bằng môi trường
}

/**
 * Mã profile = lineP * 10 + lineD. CONFIRMED — khoá bảng profile chuẩn là
 * đúng 12 giá trị 13,14,24,25,35,36,41,46,51,52,62,63 (SPEC §7.4).
 * Giá trị ngoài tập ⇒ ném lỗi: bắt được ngay lỗi đảo Personality/Design.
 */
export function deriveProfile(sunLinePersonality: number, sunLineDesign: number): number {
  const code = sunLinePersonality * 10 + sunLineDesign;
  if (!VALID_PROFILE_CODES.includes(code)) {
    throw new Error(
      `Mã profile không hợp lệ: ${code} (P=${sunLinePersonality}, D=${sunLineDesign}). ` +
      `Hợp lệ: ${VALID_PROFILE_CODES.join(', ')}. Nghi đảo Personality/Design.`,
    );
  }
  return code;
}

export const formatProfile = (code: number): string => `${Math.floor(code / 10)} / ${code % 10}`;

/** Góc của cross suy từ mã profile. */
export function crossAngleForProfile(profileCode: number): CrossAngle {
  const a = PROFILE_TO_CROSS_ANGLE[profileCode];
  if (!a) throw new Error(`Không có góc cross cho profile ${profileCode}`);
  return a;
}

/**
 * Tra incarnation cross theo bộ 4 cổng (giữ nguyên thứ tự) + góc suy từ profile.
 * Góc là bắt buộc: bộ 4 cổng một mình KHÔNG phân biệt được Left với
 * Juxtaposition (xem PROFILE_TO_CROSS_ANGLE ở tables.ts).
 */
export function deriveCross(
  sunP: number, earthP: number, sunD: number, earthD: number, profileCode: number,
): CrossDef | null {
  return lookupCross(sunP, earthP, sunD, earthD, crossAngleForProfile(profileCode));
}

/**
 * Tên cross như app của Jovian Archive hiển thị: tên gốc + số biến thể.
 *
 * Ví dụ: `Right Angle Cross of Eden` + biến thể 2 → `Right Angle Cross of Eden 2`.
 * Họ chỉ có một thành viên (toàn bộ Juxtaposition) thì không có số.
 */
export function crossName(cross: CrossDef): string {
  return cross.variant === null ? cross.name : `${cross.name} ${cross.variant}`;
}

/**
 * Dạng đầy đủ, khớp đúng chuỗi mà Jovian Archive in ra:
 * `Right Angle Cross of Eden 2 (12/11 | 36/6)`
 *
 * Thứ tự cổng là (Sun/Earth cá tính | Sun/Earth thiết kế) — GIỮ NGUYÊN, vì chính
 * thứ tự đó phân biệt các biến thể cùng tên.
 */
export function crossFullName(cross: CrossDef): string {
  const [a, b, c, d] = cross.gates;
  return `${crossName(cross)} (${a}/${b} | ${c}/${d})`;
}

/**
 * Chiến lược (Strategy) — suy THẲNG từ Type, không phải phép tính mới.
 * Chuỗi tiếng Anh đúng bảng chiến lược chuẩn; Generator và
 * Manifesting Generator chung một chiến lược.
 */
export type Strategy = 'To Respond' | 'To Inform' | 'Wait for the Invitation' | 'Wait a Lunar Cycle';

export function strategyOf(type: HdType): Strategy {
  switch (type) {
    case 'Generator':
    case 'ManifestingGenerator': return 'To Respond';
    case 'Manifestor': return 'To Inform';
    case 'Projector': return 'Wait for the Invitation';
    case 'Reflector': return 'Wait a Lunar Cycle';
  }
}

/**
 * Nhãn hiển thị của Authority — KHÁC với giá trị enum.
 *
 * ★ Phát hiện 2026-09-21 từ golden g03: với **Reflector**, app của Jovian Archive
 *   hiển thị **"Lunar Cycle"**, trong khi bảng authority chuẩn chỉ có 7
 *   giá trị và KHÔNG hề có "Lunar" — nó dùng `None`. Nghĩa là nhãn được đổi theo
 *   ngữ cảnh ở lớp hiển thị, không phải giá trị dẫn xuất khác.
 *
 * Giữ hai thứ tách nhau: `Authority` (enum, so với bảng tham chiếu) và nhãn (cho UI).
 */
export function authorityLabel(authority: Authority, type: HdType): string {
  if (type === 'Reflector') return 'Lunar Cycle';
  switch (authority) {
    case 'SolarPlexus': return 'Solar Plexus';
    case 'Sacral': return 'Sacral';
    case 'Splenic': return 'Splenic';
    case 'Ego': return 'Ego Manifested';
    case 'EgoProjected': return 'Ego Projected';
    case 'G': return 'Self Projected';
    /*
     * Projector không motor / không spleen / không sacral / không SP — HD gọi là
     * **mental projector**, quyết định bằng cách nói ra với người ngoài.
     *
     * ✅ XÁC NHẬN 2026-09-22 (U11): app Jovian hiển thị **"Sounding Board"**.
     * Đo trực tiếp: lá số Accra 1962-02-06 06:00 (chỉ defined Throat + Ajna,
     * kênh 43-23) cho `Authority: Sounding Board`. Golden:
     * `g09-accra-1962-mental-projector`.
     *
     * Trước đó chỗ này trả về đúng chữ "None" — tức bê nguyên tên enum nội bộ ra
     * giao diện. Người dùng mental projector sẽ đọc được chữ "None", vừa vô
     * nghĩa vừa gợi ý sai rằng họ không có authority.
     */
    case 'None': return 'Sounding Board';
  }
}
