/**
 * Bảng thay đổi (`nextChanges`) dùng CHUNG giữa thẻ "Tiếp theo" (`NextUp`) và bảng
 * "Thay đổi sắp tới" (`ChangesTable`) — cùng mốc thì tính MỘT lần, và mốc tiến dần
 * (chế độ Trực tiếp, mỗi 30 s) thì chỉ tính lại dòng đã qua mốc (`advanceChanges`).
 *
 * Trước 2026-10-06 mỗi nhịp Trực tiếp quét lại BA lần cả 13 thiên thể (NextUp: hào +
 * cổng; bảng: mức đang chọn). Giữ một bảng gần nhất cho mỗi mức là đủ: mọi chỗ gọi
 * đều xem cùng MỘT mốc transit.
 */
import { advanceChanges, nextChanges, type BodyChange, type ChangeLevel } from '../../calc-core/rave/changes.js';
import { getBrowserEphemeris } from './browser-client.js';

const last = new Map<ChangeLevel, { jdRef: number; rows: BodyChange[] }>();

export async function changesAt(jdRef: number, level: ChangeLevel): Promise<BodyChange[]> {
  const eph = await getBrowserEphemeris();
  const prev = last.get(level);
  if (prev?.jdRef === jdRef) return prev.rows;
  const rows = prev ? advanceChanges(eph, prev, jdRef, level) : nextChanges(eph, jdRef, level);
  last.set(level, { jdRef, rows });
  return rows;
}
