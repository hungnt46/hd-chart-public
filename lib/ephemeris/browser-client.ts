/**
 * Khởi tạo ephemeris phía trình duyệt — dùng chung một thể hiện cho cả trang.
 *
 * Tuân thủ hai quy tắc Phase 0 (spikes/ephemeris/REPORT.md §4, §8):
 *  - file `.se1` TỰ HOST ở `/ephe` (không gọi `loadStandardEphemeris`, không CDN)
 *  - `swisseph.wasm` tự host ở `/wasm` (Next đặt asset ở nơi thư viện không tự tìm ra)
 */
import { BrowserEphemeris, REQUIRED_SE1_FILES } from '../../calc-core/ephemeris/swisseph-browser';
import type { EphemerisProvider } from '../../calc-core/ephemeris/provider';

let instance: Promise<EphemerisProvider> | null = null;

const WASM_URL = '/wasm/swisseph.wasm';
const EPHE_BASE = '/ephe';

/*
 * ★ Tải TRƯỚC, SONG SONG (Hưng 2026-10-15, STATUS §5 #69): `@swisseph/browser` tải wasm rồi từng tệp
 *   `.se1` LẦN LƯỢT — đo trên chart.humandesign.vn ~1.1–1.5 s cho 4 tệp (2 MB). Kéo cả bốn cùng lúc
 *   (cùng mã JS của thư viện) vào bộ nhớ đệm HTTP trước; thư viện đọc lại từ đệm (`_headers`: immutable).
 *   Lỗi tải trước thì bỏ qua — `init()` tự tải lại và báo lỗi thật.
 */
function prefetch(): Promise<unknown> {
  const urls = [WASM_URL, ...REQUIRED_SE1_FILES.map(n => `${EPHE_BASE}/${n}`)];
  return Promise.allSettled([
    import('@swisseph/browser'),
    ...urls.map(u => fetch(u).then(r => r.arrayBuffer())),
  ]);
}

export function getBrowserEphemeris(): Promise<EphemerisProvider> {
  if (!instance) {
    const eph = new BrowserEphemeris({
      ephemerisBaseUrl: EPHE_BASE,
      wasmUrl: WASM_URL,
    });
    instance = prefetch().then(() => eph.init()).then(() => eph);
  }
  return instance;
}
