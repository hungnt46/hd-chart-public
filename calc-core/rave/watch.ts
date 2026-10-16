/**
 * Activation Watch — STATUS §4 B3. Học từ tab cùng tên của một ứng dụng tham chiếu: với một
 * thiên thể, đồng hồ bán nguyệt 6 hào của CỔNG đang đứng, hào hiện tại sáng lên,
 * kim chỉ vị trí trong cổng; cổng trước / cổng sau; bao lâu nữa đổi.
 *
 * ★ "Trước / sau" theo CHIỀU ĐI, không theo chiều bánh xe. Hành tinh nghịch hành
 *   đi lùi trên bánh xe, nên cổng "kế tiếp" của nó là cổng liền TRƯỚC trên
 *   `WHEEL` — cùng lý do với bảng Thay đổi (`changes.ts`, điểm 1).
 *   Kiểm đối chiếu 2026-09-23: Mặt Trăng 13.6, trước 19, sau 49 — đúng
 *   thứ tự `… 41, 19, 13, 49, 30 …` của `WHEEL`.
 *
 * Thời điểm đổi hào / đổi cổng lấy lại từ `nextChange` — MỘT phép tìm, không
 * viết thêm phép thứ hai có thể lệch nó.
 */
import type { EphemerisProvider } from '../ephemeris/provider.js';
import { DEFAULT_BODY_CONFIG, type Body, type BodyConfig } from '../ephemeris/bodies.js';
import { GATE_COUNT, LINES_PER_GATE, WHEEL } from './constants.js';
import { longitudeToPosition } from './position.js';
import { bodyLongitude, nextChange, type BodyChange } from './changes.js';

export interface ActivationWatch {
  body: Body;
  gate: number;
  line: number;
  /** Đã đi được bao nhiêu phần của HÀO hiện tại, theo chiều bánh xe, [0, 1). */
  lineFraction: number;
  /** Đã đi được bao nhiêu phần của CỔNG hiện tại, theo chiều bánh xe, [0, 1). */
  gateFraction: number;
  retrograde: boolean;
  /** Cổng vừa rời / sắp tới — theo CHIỀU ĐI (xem đầu tệp). */
  previousGate: number;
  nextGate: number;
  /** Lần đổi HÀO kế tiếp (có thể là đổi chiều trong cùng hào). */
  lineChange: BodyChange;
  /** Lần đổi CỔNG kế tiếp (có thể là đổi chiều trong cùng cổng). */
  gateChange: BodyChange;
}

export function activationWatch(
  eph: EphemerisProvider, jdRef: number, body: Body, cfg: BodyConfig = DEFAULT_BODY_CONFIG,
): ActivationWatch {
  const p = longitudeToPosition(bodyLongitude(eph, jdRef, body, cfg));
  const lineChange = nextChange(eph, jdRef, body, 'line', cfg);
  const gateChange = nextChange(eph, jdRef, body, 'gate', cfg);
  const i = p.gateSlot - 1;
  const forward = WHEEL[(i + 1) % GATE_COUNT]!;
  const backward = WHEEL[(i + GATE_COUNT - 1) % GATE_COUNT]!;
  const retrograde = lineChange.retrograde;
  return {
    body, gate: p.gate, line: p.line,
    lineFraction: p.linePercent,
    gateFraction: (p.line - 1 + p.linePercent) / LINES_PER_GATE,
    retrograde,
    previousGate: retrograde ? forward : backward,
    nextGate: retrograde ? backward : forward,
    lineChange, gateChange,
  };
}
