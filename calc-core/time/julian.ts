/** Đổi lịch ↔ Julian Day, và .NET Ticks ↔ Date. Thuần số học, không ephemeris. */
import { GREGFLAG_GREGORIAN } from '../rave/constants.js';

/**
 * Julian Day (UT) từ lịch Gregory — tương đương `swe_julday(y,m,d,h,gregflag=1)`.
 * CONFIRMED (ghi chép nội bộ): bản tham chiếu luôn dùng gregflag=1.
 */
export function julianDayUT(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): number {
  const h = hour + minute / 60 + second / 3600;
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4)
    - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  return jdn + (h - 12) / 24;
}

/** JD của 1970-01-01T00:00Z (mốc Unix) và số mili-giây một ngày. */
export const JD_UNIX_EPOCH = 2440587.5;
export const MS_PER_DAY = 86400000;

/**
 * Mili-giây Unix ↔ JD (UT). MỘT chỗ duy nhất cho phép đổi này — trước 2026-10-06 nó bị
 * chép ở ~12 nơi trong giao diện (`jdOf`, `jdToMs`, `msToJd`, `jdNowOf`…).
 */
export const jdOfMs = (ms: number): number => ms / MS_PER_DAY + JD_UNIX_EPOCH;
export const msOfJd = (jd: number): number => (jd - JD_UNIX_EPOCH) * MS_PER_DAY;

/** JD (UT) → Date theo UTC. */
export function jdToDateUT(jd: number): Date {
  return new Date(msOfJd(jd));
}

/** Date (UTC) → JD. */
export const dateUTToJd = (d: Date): number => jdOfMs(d.getTime());

/** Số tick .NET giữa 0001-01-01 và 1970-01-01. */
const DOTNET_EPOCH_OFFSET_MS = 62135596800000;

/**
 * .NET Ticks (100 ns kể từ 0001-01-01) → Date UTC.
 * Dùng khi đọc `BirthDateUT` trực tiếp từ cơ sở dữ liệu chart của phần mềm tham chiếu (SPEC §9.2).
 */
export const ticksToDateUT = (ticks: bigint | number): Date =>
  new Date(Number(BigInt(ticks) / 10000n) - DOTNET_EPOCH_OFFSET_MS);

export const dateUTToTicks = (d: Date): bigint =>
  BigInt(d.getTime() + DOTNET_EPOCH_OFFSET_MS) * 10000n;

export { GREGFLAG_GREGORIAN };
