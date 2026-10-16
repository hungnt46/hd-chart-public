/**
 * Mở lại một chart đã lưu: dựng lại đúng bộ (utcDate, giá trị form, UTResolution)
 * mà trang cần, từ tham số sinh đã lưu.
 *
 * ★ `utIso` đã lưu là NGUỒN SỰ THẬT, không phải kết quả tra lại tzdb.
 * tzdb được vá vài lần mỗi năm; một bản vá đổi quy tắc DST của quá khứ sẽ làm
 * chart đã lưu "tự đổi" dưới chân người dùng. Ở đây ta vẫn tra lại — nhưng chỉ
 * để ĐỐI CHIẾU, và nếu lệch thì giữ giờ cũ rồi nói ra bằng một ghi chú.
 */
import { resolveUT, type UTResolution } from '../time/resolveUT.js';
import type { BirthRecord } from './types.js';

export interface ReopenResult {
  utcDate: Date;
  value: { date: string; time: string; zone: string; place?: string };
  resolution: UTResolution;
  /** `true` khi tzdb bây giờ cho ra giờ khác lúc lưu. */
  drifted: boolean;
}

export function reopen(birth: BirthRecord): ReopenResult {
  const [y, mo, d] = birth.localDate.split('-').map(Number);
  const [h, mi] = birth.localTime.split(':').map(Number);
  const saved = new Date(birth.utIso);

  const fresh = resolveUT({
    localDateTime: { year: y ?? 1970, month: mo ?? 1, day: d ?? 1, hour: h ?? 0, minute: mi ?? 0 },
    ianaZone: birth.ianaZone,
  });
  const drifted = fresh.utcDate.getTime() !== saved.getTime();

  const resolution: UTResolution = {
    ...fresh,
    utcDate: saved,
    offsetMinutes: birth.offsetMinutes,
    source: birth.offsetSource,
    ambiguity: birth.ambiguity,
    confidence: birth.confidence,
    notes: drifted
      ? [...fresh.notes,
         { code: 'savedUtKept' as const,
           vars: { saved: birth.utIso, fresh: fresh.utcDate.toISOString() } }]
      : fresh.notes,
  };

  return {
    utcDate: saved,
    value: {
      date: birth.localDate, time: birth.localTime, zone: birth.ianaZone,
      ...(birth.place ? { place: birth.place } : {}),
    },
    resolution,
    drifted,
  };
}
