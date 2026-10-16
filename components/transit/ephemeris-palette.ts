/**
 * Màu của Lịch Thiên văn Rave (Gantt) — đo từ tab EPHEMERIS của một ứng dụng tham chiếu
 * (bản số đo 2026-09-23).
 *
 * Hai chỗ lệch khỏi bản đo, CÓ CHỦ Ý, cùng lối với `DESIGN` ở `bodygraph/theme.ts`:
 *
 * 1. CHỮ trên ô xanh dương / xanh lục: bản tham chiếu dùng chữ TRẮNG, chỉ đạt 3.59:1 và
 *    2.27:1 — dưới 4.5:1. Giữ NGUYÊN màu ô, đổi chữ sang tối `#1a1a1a` (4.85 và
 *    7.67:1). Đổi màu ô thì mất nhận diện với bảng màu tham chiếu; đổi chữ thì không mất gì.
 * 2. Hai VẠCH mốc: `#ff7f6e` / `#6e94ff` chỉ 2.47 và 2.86:1 trên nền trắng —
 *    dưới 3:1 của ranh giới đồ hoạ. Hạ độ sáng HLS, giữ sắc và bão hoà, tới vừa
 *    đủ 3:1 (−7% và −2%). Vạch còn có VIỀN TRẮNG hai bên, nên trên ô màu nào nó
 *    cũng tách khỏi viền trắng ấy với đúng tỉ lệ đã kiểm.
 *
 * Kiểm ở `__tests__/ephemeris-palette.spec.ts`.
 */
import type { SegmentRelation } from '../../calc-core/rave/ephemeris-segments.js';

export const EPHEMERIS_FILL: Readonly<Record<SegmentRelation, string>> = {
  transit: '#f1efef',
  same: '#7689a0',
  harmonic: '#95b2ad',
  both: '#7689a0', // nửa trên; nửa dưới là `harmonic` — xem `EphemerisGantt`
};
export const EPHEMERIS_TEXT = '#1a1a1a';
/** Vạch ngăn giữa hai ô — ô xám chỉ 1.15:1 với nền trắng, ranh giới phải do vạch này gánh. */
export const EPHEMERIS_DIVIDER = '#737373';

export const NOW_MARKER_MEASURED = '#ff7f6e';
export const NOW_MARKER = '#ff5f4a';
export const CHART_MARKER_MEASURED = '#6e94ff';
export const CHART_MARKER = '#648cff';
/** Viền hai bên vạch mốc — trắng, để vạch đạt 3:1 trên mọi màu ô (xem điểm 2 ở trên). */
export const MARKER_HALO = '#ffffff';

/*
 * Lưới thời gian + nhãn (gom về đây 2026-10-06, trước viết thẳng trong `EphemerisGantt`).
 * Nhãn ngày / giờ là CHỮ trên nền trắng ⇒ ≥ 4.5:1. Vạch lưới là TRANG TRÍ (ô mới mang
 * nghĩa; ranh giới ô do `EPHEMERIS_DIVIDER` gánh) nên không chịu 3:1 — test ghi rõ.
 */
export const EPHEMERIS_TICK = '#e5e5e5';
export const EPHEMERIS_TICK_MIDNIGHT = '#a3a3a3';
export const EPHEMERIS_LABEL_DAY = '#404040';
export const EPHEMERIS_LABEL_HOUR = '#525252';
