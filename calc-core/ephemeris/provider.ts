/** Ranh giới đổi backend ephemeris — SPEC.md §6.1. */
import { SEFLG_SWIEPH } from '../rave/constants.js';

export interface EphemerisCapabilities {
  /** `false` ⇒ UI phải ẩn Chiron, KHÔNG được crash (SPEC §3.1). */
  chiron: boolean;
  trueNode: boolean;
  /** Do Phase 0 đo, không lấy từ README. Xem spikes/ephemeris/REPORT.md §2. */
  maxErrorArcsec: number;
  dataSource: 'swisseph-files' | 'moshier';
}

export interface EphemerisProvider {
  readonly id: string;
  readonly capabilities: EphemerisCapabilities;
  init(): Promise<void>;
  /** Kinh độ hoàng đạo tropical, [0,360), tại `jdUT`. Đồng bộ sau `init()`. */
  longitude(jdUT: number, ipl: number): number;
  close?(): void;
}

/**
 * ★ Ném khi thư viện âm thầm đổi sang Moshier — SPEC §6.1(a).
 *
 * Swiss Ephemeris KHÔNG báo lỗi khi không đọc được file .se1: nó trả `flags=4`
 * (SEFLG_MOSEPH) thay vì `2` và vẫn cho một con số trông hợp lệ. Nếu không bắt,
 * app vẫn chạy, chart vẫn hiện, nhưng Base sai và mọi golden test mất ý nghĩa.
 * Phát hiện ở Phase 0 — xem spikes/ephemeris/REPORT.md §4.
 */
export class EphemerisFallbackError extends Error {
  constructor(readonly requested: number, readonly received: number, readonly jdUT: number, readonly ipl: number) {
    super(
      `Ephemeris rơi về backend khác: yêu cầu flags=${requested} (SWIEPH) nhưng nhận ${received} ` +
      `(jd=${jdUT}, ipl=${ipl}). Nguyên nhân thường gặp: thiếu file .se1, hoặc ngày nằm ngoài ` +
      `vùng phủ của bộ file (bộ _18 phủ 1800-01-01 → 2400-01-08).`,
    );
    this.name = 'EphemerisFallbackError';
  }
}

/** Kiểm flag trả về. MỌI implementation phải gọi hàm này. */
export function assertNoFallback(receivedFlags: number, jdUT: number, ipl: number): void {
  if (receivedFlags !== SEFLG_SWIEPH) {
    throw new EphemerisFallbackError(SEFLG_SWIEPH, receivedFlags, jdUT, ipl);
  }
}
