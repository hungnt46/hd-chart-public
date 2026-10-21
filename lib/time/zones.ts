/**
 * Tra múi giờ theo tên — ICU (qua luxon) CỘNG vài vùng "backzone" của tzdb mà
 * ICU không mang. STATUS §5 #21 (Hưng chốt 2026-09-24: "dùng tzdb").
 *
 * ★ Vì sao cần: tzdb (tệp `asia`, chú thích Vietnam) nói rõ `Asia/Bangkok` chỉ
 *   ĐÚNG cho miền Bắc Việt Nam TỪ 1970; trước 1970 phải dùng `Asia/Hanoi` trong
 *   tệp `backzone`. Bản tzdb gói trong trình duyệt/Node (ICU) KHÔNG có backzone
 *   ⇒ gán miền Bắc vào `Asia/Bangkok` là lệch 1–2 giờ cho 1943–45 và 1947–54,
 *   và lệch giờ mặt trời địa phương trước 1911 (Hà Nội 1890: 7:03:24, không phải
 *   6:42:04 của Bangkok — phần mềm tham chiếu cho đúng 7:03:24).
 *
 * Bảng dưới CHÉP NGUYÊN từ tzdb `backzone` (github.com/eggert/tz, lấy
 * 2026-09-24). Cột UNTIL của tzdb tính theo giờ tường của DÒNG ĐANG ÁP DỤNG;
 * ở đây đã quy ra UTC:
 *
 *   Zone Asia/Hanoi  7:03:24 -  LMT   1906 Jul  1
 *                    7:06:30 -  PLMT  1911 May  1
 *                    7:00    -  +07   1942 Dec 31 23:00
 *                    8:00    -  +08   1945 Mar 14 23:00
 *                    9:00    -  +09   1945 Sep  2
 *                    7:00    -  +07   1947 Apr  1
 *                    8:00    -  +08   1954 Oct
 *                    7:00    -  +07
 *
 * Không có DST ⇒ mỗi đoạn một offset cố định.
 */
import { IANAZone } from 'luxon';

/** Một múi giờ: offset (phút, có thể lẻ) và tên viết tắt tại một mốc UTC. */
export interface TimeZoneLike {
  readonly name: string;
  offset(utcMs: number): number;
  offsetName(utcMs: number): string;
}

interface Span { untilUtcMs: number; offsetMinutes: number; abbr: string }

class TableZone implements TimeZoneLike {
  constructor(readonly name: string, private readonly spans: readonly Span[]) {}
  private span(ms: number): Span {
    return this.spans.find(s => ms < s.untilUtcMs) ?? this.spans[this.spans.length - 1]!;
  }
  offset(ms: number): number { return this.span(ms).offsetMinutes; }
  offsetName(ms: number): string { return this.span(ms).abbr; }
}

/** Giờ tường `y-m-d h:m` tại offset `off` (phút) ⇒ mốc UTC. */
const until = (y: number, mo: number, d: number, h: number, mi: number, off: number) =>
  Date.UTC(y, mo - 1, d, h, mi) - off * 60_000;

const LMT_HANOI = 7 * 60 + 3 + 24 / 60;     // 7:03:24
const PLMT = 7 * 60 + 6 + 30 / 60;          // 7:06:30 — giờ Đài thiên văn Phù Liễn

export const BACKZONES: Readonly<Record<string, TimeZoneLike>> = {
  'Asia/Hanoi': new TableZone('Asia/Hanoi', [
    { untilUtcMs: until(1906, 7, 1, 0, 0, LMT_HANOI), offsetMinutes: LMT_HANOI, abbr: 'LMT' },
    { untilUtcMs: until(1911, 5, 1, 0, 0, PLMT), offsetMinutes: PLMT, abbr: 'PLMT' },
    { untilUtcMs: until(1942, 12, 31, 23, 0, 420), offsetMinutes: 420, abbr: '+07' },
    { untilUtcMs: until(1945, 3, 14, 23, 0, 480), offsetMinutes: 480, abbr: '+08' },
    { untilUtcMs: until(1945, 9, 2, 0, 0, 540), offsetMinutes: 540, abbr: '+09' },
    { untilUtcMs: until(1947, 4, 1, 0, 0, 420), offsetMinutes: 420, abbr: '+07' },
    { untilUtcMs: until(1954, 10, 1, 0, 0, 480), offsetMinutes: 480, abbr: '+08' },
    { untilUtcMs: Number.POSITIVE_INFINITY, offsetMinutes: 420, abbr: '+07' },
  ]),
};

/**
 * Formatter tên viết tắt theo vùng, dựng MỘT lần. `IANAZone.offsetName` của luxon tạo `Intl.DateTimeFormat` mới mỗi lần gọi
 * (~3 ms) — nhập tệp nghìn chart mất vài giây chỉ vì nó. Cùng đúng tham số luxon 3.7 (`parseZoneInfo`) ⇒ cùng kết quả.
 */
const SHORT_NAME = new Map<string, Intl.DateTimeFormat>();
function shortNameFormat(zone: string): Intl.DateTimeFormat {
  let f = SHORT_NAME.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, {
      timeZoneName: 'short', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      timeZone: zone,
    });
    SHORT_NAME.set(zone, f);
  }
  return f;
}

class IcuZone implements TimeZoneLike {
  constructor(private readonly z: IANAZone) {}
  get name() { return this.z.name; }
  offset(ms: number) { return this.z.offset(ms); }
  offsetName(ms: number) {
    try {
      return shortNameFormat(this.z.name).formatToParts(new Date(ms)).find(p => p.type.toLowerCase() === 'timezonename')?.value ?? '';
    } catch { return ''; }
  }
}

/** Múi giờ theo tên; `null` nếu không biết. Backzone được ưu tiên trước ICU. */
export function getZone(name: string): TimeZoneLike | null {
  const bz = BACKZONES[name];
  if (bz) return bz;
  // `IANAZone.isValidZone` dựng một `Intl.DateTimeFormat` mỗi lần gọi ⇒ nhớ kết quả theo tên (vùng không đổi trong phiên).
  let z = ICU_ZONES.get(name);
  if (z === undefined) {
    z = IANAZone.isValidZone(name) ? new IcuZone(IANAZone.create(name)) : null;
    ICU_ZONES.set(name, z);
  }
  return z;
}
const ICU_ZONES = new Map<string, TimeZoneLike | null>();

export const isKnownZone = (name: string): boolean => getZone(name) !== null;
