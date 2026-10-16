/**
 * Local Mean Time kiểu phần mềm tham chiếu — SPEC.md §8.4.
 *
 * Phần mềm tham chiếu (ghi chép nội bộ về atlas/múi giờ, CONFIRMED):
 *     offsetHours = longitudeArcsec / 54000        (54000 = 15° × 3600)
 * và dùng theo chiều `UT = local + offsetHours`, tức **dương về phía TÂY**.
 *
 * Dự án này dùng quy ước IANA (`UT = local − offset`, **dương về phía ĐÔNG**),
 * nên phải ĐỔI DẤU. Xem bảng đối chiếu ở SPEC §8.2.
 */

/** Offset LMT theo quy ước IANA (phút, dương về phía đông). */
export const lmtOffsetMinutes = (longitudeDeg: number): number => longitudeDeg * 4;

/** Offset LMT theo quy ước của phần mềm tham chiếu (giờ, dương về phía tây) — để đối chiếu số liệu của phần mềm đó. */
export const lmtOffsetHoursMmi = (longitudeDeg: number): number => -(longitudeDeg * 4) / 60;

/** Công thức nguyên bản của phần mềm tham chiếu, nhận kinh độ dạng giây cung. */
export const lmtOffsetHoursMmiFromArcsec = (longitudeArcsec: number): number =>
  longitudeArcsec / 54000;
