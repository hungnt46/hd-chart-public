/**
 * Implementation chính cho browser — `@swisseph/browser`.
 * Đã chọn ở Phase 0 (spikes/ephemeris/REPORT.md §9).
 *
 * ★ HAI QUY TẮC BẮT BUỘC từ Phase 0:
 *   (a) kiểm `flags` trả về — chống silent-fallback sang Moshier (REPORT §4)
 *   (b) KHÔNG dùng `loadStandardEphemeris()` — nó tải .se1 từ cdn.jsdelivr.net
 *       lúc chạy, phá vỡ yêu cầu offline (REPORT §8). Luôn tự host.
 */
import { SEFLG_SWIEPH } from '../rave/constants.js';
import { assertNoFallback, type EphemerisCapabilities, type EphemerisProvider } from './provider.js';

/** Ba file phủ 1800-01-01 → 2400-01-08 (đo ở Phase 0, REPORT §5). */
export const REQUIRED_SE1_FILES = ['sepl_18.se1', 'semo_18.se1', 'seas_18.se1'] as const;

export interface BrowserEphemerisOptions {
  /** Thư mục tự host chứa .se1, ví dụ `/ephe`. KHÔNG trỏ ra CDN bên thứ ba. */
  ephemerisBaseUrl: string;
  /**
   * Đường dẫn tới `swisseph.wasm` tự host, ví dụ `/wasm/swisseph.wasm`.
   * Cần khi bundler (Next/webpack) đặt file wasm ở nơi thư viện không tự tìm ra.
   */
  wasmUrl?: string;
}

interface SwePosition { longitude: number; latitude: number; distance: number; flags: number }
interface SweInstance {
  initialize?(wasmPath?: string): Promise<void>;
  init?(wasmPath?: string): Promise<void>;
  loadEphemerisFiles(files: { name: string; url: string }[]): Promise<void>;
  calculatePosition(jd: number, ipl: number, flags: number): SwePosition;
  close?(): void;
}

export class BrowserEphemeris implements EphemerisProvider {
  readonly id = '@swisseph/browser';
  readonly capabilities: EphemerisCapabilities = {
    chiron: true,
    trueNode: true,
    maxErrorArcsec: 2.4e-7,     // Phase 0 đo, REPORT §2
    dataSource: 'swisseph-files',
  };
  #swe: SweInstance | null = null;

  constructor(private readonly options: BrowserEphemerisOptions) {
    if (/cdn\.|jsdelivr|unpkg/i.test(options.ephemerisBaseUrl)) {
      throw new Error(
        `ephemerisBaseUrl trỏ ra CDN bên thứ ba ("${options.ephemerisBaseUrl}"). ` +
        `SPEC §6.1(b) yêu cầu tự host file .se1.`,
      );
    }
  }

  async init(): Promise<void> {
    const m = await import('@swisseph/browser');
    const Ctor = (m as unknown as { SwissEphemeris?: new () => SweInstance; default?: new () => SweInstance });
    const SweClass = Ctor.SwissEphemeris ?? Ctor.default;
    if (!SweClass) throw new Error('@swisseph/browser: không tìm thấy lớp SwissEphemeris');
    const swe = new SweClass();
    const wasm = this.options.wasmUrl;
    if (swe.init) await swe.init(wasm);
    else if (swe.initialize) await swe.initialize(wasm);

    const base = this.options.ephemerisBaseUrl.replace(/\/$/, '');
    // ★ (b) tự host — KHÔNG gọi loadStandardEphemeris()
    await swe.loadEphemerisFiles(REQUIRED_SE1_FILES.map(name => ({ name, url: `${base}/${name}` })));
    this.#swe = swe;
  }

  longitude(jdUT: number, ipl: number): number {
    if (!this.#swe) throw new Error('BrowserEphemeris: chưa gọi init()');
    const r = this.#swe.calculatePosition(jdUT, ipl, SEFLG_SWIEPH);
    assertNoFallback(r.flags, jdUT, ipl);   // ★ (a)
    return r.longitude;
  }

  close(): void { this.#swe?.close?.(); }
}
