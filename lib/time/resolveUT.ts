/**
 * Giờ địa phương → UT, có phát hiện giờ mơ hồ — SPEC.md §8.
 *
 * Đây là tầng mà ghi chép nội bộ về atlas/múi giờ (Finding A1/A2) chỉ ra là nguồn sai giờ sinh
 * chủ yếu. Phần mềm tham chiếu tính được cờ mơ hồ rồi **vứt đi** (A2); app này KHÔNG lặp lại:
 * mọi ca mơ hồ đều được trả về tường minh để lớp UI chặn lại (D8).
 *
 * calc-core KHÔNG bao giờ import file này — ranh giới ở SPEC §4.
 */
import { getZone, type TimeZoneLike } from './zones.js';
import { lmtOffsetMinutes } from './lmt.js';

export type Ambiguity = 'none' | 'repeated' | 'nonexistent';
/** `mmi` = nhập từ tệp `.mmi`, giữ nguyên offset đã ghi trong tệp (STATUS §4 E6). */
export type OffsetSource = 'iana' | 'lmt' | 'manual' | 'mmi';

export interface OffsetCandidate {
  /** Quy ước IANA: `UT = local − offset`, dương về phía đông. */
  offsetMinutes: number;
  utcDate: Date;
  /** Tên viết tắt của múi giờ tại thời điểm đó, ví dụ "CET" / "CEST". */
  abbreviation: string;
}

/**
 * ★ Ghi chú trả về dưới dạng MÃ, không phải câu chữ (đổi 2026-09-22, Phase 6).
 *
 * `lib/time` là thư viện thuần; nhét câu tiếng Việt vào đây thì (a) không dịch
 * được sang tiếng Anh, (b) test phải so khớp chuỗi hiển thị — hai thứ vốn không
 * liên quan. Nay lớp giao diện tự dựng câu từ mã + tham số.
 */
export type NoteCode =
  | 'manualOffsetRepeated'
  | 'manualOffsetNonexistent'
  | 'manualOffset'
  | 'lmt'
  | 'historicalTzdb'
  | 'nonexistentGap'
  | 'repeatedTwice'
  /** Do `lib/storage/reopen.ts` thêm khi tzdb hôm nay khác lúc lưu. */
  | 'savedUtKept';

export interface Note {
  code: NoteCode;
  vars?: Record<string, string | number>;
}

export interface UTResolution {
  utcDate: Date;
  offsetMinutes: number;
  zone: string;
  source: OffsetSource;
  ambiguity: Ambiguity;
  /** Chỉ có khi `ambiguity === 'repeated'`: đúng hai phương án để người dùng chọn. */
  candidates?: OffsetCandidate[];
  confidence: 'high' | 'low';
  /** Lý do hạ độ tin cậy, để UI hiển thị. */
  notes: Note[];
}

export interface BirthInput {
  /** Giờ địa phương dạng "trần", KHÔNG kèm offset. */
  localDateTime: {
    year: number; month: number; day: number;
    hour: number; minute: number; second?: number;
  };
  /** Định danh IANA, ví dụ "Europe/Berlin". */
  ianaZone: string;
  /** Kinh độ (độ thập phân, đông dương) — chỉ cần khi dùng LMT. */
  longitudeDeg?: number;
  /**
   * Ghi đè offset thủ công (phút, quy ước IANA). Dùng khi người dùng chọn một
   * phương án trong ca `repeated`, hoặc nhập thẳng offset từ giấy tờ.
   */
  overrideOffsetMinutes?: number;
  /** Ép dùng LMT theo kinh độ thay vì tzdb (chế độ đối chiếu, SPEC §8.4). */
  useLmt?: boolean;
}

/** Mốc dưới độ tin cậy: tzdb trước 1970 phần lớn là tái dựng. */
export const LOW_CONFIDENCE_BEFORE_YEAR = 1970;

const toNaiveUtcMs = (d: BirthInput['localDateTime']): number =>
  Date.UTC(d.year, d.month - 1, d.day, d.hour, d.minute, d.second ?? 0);

/** Luxon trả offset theo phút cho một mốc UTC. */
const offsetAt = (zone: TimeZoneLike, utcMs: number): number => zone.offset(utcMs);

const abbrevAt = (zone: TimeZoneLike, utcMs: number): string => zone.offsetName(utcMs);

/**
 * Các offset có thể áp dụng quanh một mốc — đủ để bao trọn một lần chuyển DST.
 * Lấy offset ở ±26 giờ quanh mốc (26 > biên độ chuyển lớn nhất từng gặp).
 */
function candidateOffsets(zone: TimeZoneLike, naiveUtcMs: number): number[] {
  const probes = [naiveUtcMs - 26 * 3600_000, naiveUtcMs, naiveUtcMs + 26 * 3600_000];
  return [...new Set(probes.map(t => offsetAt(zone, t)))];
}

/**
 * Giải giờ địa phương thành UT.
 *
 * Cách làm (chuẩn, không dựa vào cách luxon tự chọn khi mơ hồ): với mỗi offset
 * ứng viên `o`, đặt `utc = local − o` rồi kiểm `zone.offset(utc) === o`. Chỉ
 * những offset **tự nhất quán** mới hợp lệ.
 *   0 offset hợp lệ → giờ KHÔNG TỒN TẠI (nhảy qua khi tiến đồng hồ)
 *   1 offset        → bình thường
 *   2 offset        → giờ LẶP (khi lùi đồng hồ)
 */
export function resolveUT(input: BirthInput): UTResolution {
  const naiveUtcMs = toNaiveUtcMs(input.localDateTime);
  const notes: Note[] = [];
  const year = input.localDateTime.year;

  // --- nhánh ghi đè thủ công ---
  if (input.overrideOffsetMinutes !== undefined) {
    const off = input.overrideOffsetMinutes;
    // ★ Vẫn phát hiện mơ hồ và GIỮ LẠI thông tin đó. Nếu không, chart lưu hôm nay
    //   sẽ không còn dấu vết rằng giờ sinh vốn có hai nghĩa — đúng cái lỗi mà
    //   Finding A2 mô tả, chỉ là muộn hơn một bước.
    let detected: Ambiguity = 'none';
    try {
      const probe = resolveUT({ ...input, overrideOffsetMinutes: undefined });
      detected = probe.ambiguity;
    } catch { /* múi giờ hỏng — cứ dùng offset đã nhập */ }

    if (detected === 'repeated') {
      notes.push({ code: 'manualOffsetRepeated' });
    } else if (detected === 'nonexistent') {
      notes.push({ code: 'manualOffsetNonexistent' });
    } else {
      notes.push({ code: 'manualOffset' });
    }

    return {
      utcDate: new Date(naiveUtcMs - off * 60_000),
      offsetMinutes: off,
      zone: input.ianaZone,
      source: 'manual',
      ambiguity: detected,
      confidence: detected === 'none' && year >= LOW_CONFIDENCE_BEFORE_YEAR ? 'high' : 'low',
      notes,
    };
  }

  // --- nhánh LMT (SPEC §8.4) ---
  if (input.useLmt) {
    if (input.longitudeDeg === undefined) {
      throw new Error('resolveUT: useLmt cần longitudeDeg');
    }
    const off = lmtOffsetMinutes(input.longitudeDeg);
    return {
      utcDate: new Date(naiveUtcMs - off * 60_000),
      offsetMinutes: off,
      zone: input.ianaZone,
      source: 'lmt',
      ambiguity: 'none',
      confidence: 'low',
      notes: [{ code: 'lmt', vars: { lon: input.longitudeDeg, hours: (off / 60).toFixed(2) } }],
    };
  }

  // --- nhánh IANA ---
  // ICU cộng backzone của tzdb (Asia/Hanoi trước 1970) — xem `zones.ts`.
  const zone = getZone(input.ianaZone);
  if (!zone) throw new Error(`resolveUT: múi giờ không hợp lệ "${input.ianaZone}"`);

  const valid: OffsetCandidate[] = [];
  for (const off of candidateOffsets(zone, naiveUtcMs)) {
    const utcMs = naiveUtcMs - off * 60_000;
    if (offsetAt(zone, utcMs) === off) {
      valid.push({ offsetMinutes: off, utcDate: new Date(utcMs), abbreviation: abbrevAt(zone, utcMs) });
    }
  }
  valid.sort((a, b) => b.offsetMinutes - a.offsetMinutes);  // offset lớn (DST) trước

  if (year < LOW_CONFIDENCE_BEFORE_YEAR) {
    notes.push({ code: 'historicalTzdb', vars: { year: LOW_CONFIDENCE_BEFORE_YEAR } });
  }
  const confidence = year < LOW_CONFIDENCE_BEFORE_YEAR ? 'low' : 'high';

  if (valid.length === 0) {
    // Giờ không tồn tại: đồng hồ nhảy qua. Đề xuất dịch tới bằng biên độ nhảy.
    const offs = candidateOffsets(zone, naiveUtcMs).sort((a, b) => a - b);
    const gapMinutes = (offs[offs.length - 1] ?? 0) - (offs[0] ?? 0);
    const shifted = new Date(naiveUtcMs - (offs[offs.length - 1] ?? 0) * 60_000);
    notes.push({ code: 'nonexistentGap', vars: { minutes: gapMinutes } });
    return {
      utcDate: shifted,
      offsetMinutes: offs[offs.length - 1] ?? 0,
      zone: input.ianaZone,
      source: 'iana',
      ambiguity: 'nonexistent',
      confidence: 'low',
      notes,
    };
  }

  if (valid.length >= 2) {
    notes.push({ code: 'repeatedTwice' });
    return {
      utcDate: valid[0]!.utcDate,       // tạm thời; UI phải chặn và bắt chọn
      offsetMinutes: valid[0]!.offsetMinutes,
      zone: input.ianaZone,
      source: 'iana',
      ambiguity: 'repeated',
      candidates: valid,
      confidence: 'low',
      notes,
    };
  }

  const only = valid[0]!;
  return {
    utcDate: only.utcDate,
    offsetMinutes: only.offsetMinutes,
    zone: input.ianaZone,
    source: 'iana',
    ambiguity: 'none',
    confidence,
    notes,
  };
}

/** Định dạng offset thành "+05:30" / "−04:00" cho UI. */
export function formatOffset(minutes: number): string {
  // ★ SỬA 2026-09-21. Bản cũ giả định offset luôn là số phút NGUYÊN:
  //     `String(abs % 60).padStart(2,'0')`
  //   Với LMT (mọi ca sinh trước khi có giờ chuẩn) thì offset có phần lẻ, và nó
  //   in ra chuỗi méo: Hà Nội 1890 → "+07:6.5", Paris 1885 → "+00:9.35".
  //   Người dùng NHÌN THẤY chuỗi này trong bảng tóm tắt chart.
  //   Nay có giây thì in đủ giây, theo lối ISO 8601 mở rộng: "+07:06:30".
  const sign = minutes < 0 ? '−' : '+';
  const totalSeconds = Math.round(Math.abs(minutes) * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const sec = totalSeconds % 60;
  const p2 = (n: number) => String(n).padStart(2, '0');
  return sec === 0 ? `${sign}${p2(h)}:${p2(m)}` : `${sign}${p2(h)}:${p2(m)}:${p2(sec)}`;
}
