/**
 * Bảng CSV của kho chart — STATUS §4 E5.
 *
 * Kho chỉ giữ THAM SỐ SINH (xem `lib/storage/types.ts`); Type/Profile/… ở đây
 * được TÍNH LẠI lúc xuất, đúng luật "mở chart = tính lại". Không lưu ngược kết
 * quả vào kho.
 *
 * Chữ theo ngôn ngữ đang chọn (tiêu đề cột + thuật ngữ) — tệp này để người đọc
 * trong bảng tính, không phải để nhập lại (nhập lại dùng gói JSON).
 */
import type { EphemerisProvider } from '../../calc-core/ephemeris/provider.js';
import { calculateRaveChart } from '../../calc-core/rave/chart.js';
import { crossFullName } from '../../calc-core/rave/derive/type-authority.js';
import type { Lang, UiKey } from '../../i18n/ui/index.js';
import { authorityName, definitionName, profileName, typeName } from '../../i18n/terms.js';
import type { Folder, SavedChart } from '../../lib/storage/types.js';
import { jdOfMs } from '../../calc-core/time/julian.js';

type T = (k: UiKey, vars?: Record<string, string | number>) => string;

const jdOf = (iso: string) => jdOfMs(Date.parse(iso));
const offsetLabel = (min: number) => {
  const s = min < 0 ? '-' : '+', a = Math.abs(min);
  return `UTC${s}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
};

export function libraryCsvRows(
  eph: EphemerisProvider, charts: readonly SavedChart[], folders: readonly Folder[], lang: Lang, t: T,
): string[][] {
  const folderName = new Map(folders.map(f => [f.id, f.name]));
  const head: UiKey[] = [
    'csv.name', 'csv.folder', 'csv.date', 'csv.time', 'csv.zone', 'csv.offset', 'csv.place', 'time.ut',
    'prop.type', 'prop.profile', 'prop.authority', 'prop.definition', 'prop.cross', 'csv.note',
  ];
  const rows = charts.map(c => {
    const b = c.birth;
    const ch = calculateRaveChart(eph, jdOf(b.utIso));
    return [
      c.name,
      c.folderId ? folderName.get(c.folderId) ?? '' : '',
      b.localDate, b.localTime, b.ianaZone, offsetLabel(b.offsetMinutes), b.place ?? '',
      b.utIso,
      typeName(ch.type, lang),
      profileName(ch.profile, lang),
      authorityName(ch.authority, ch.type, lang, t),
      definitionName(ch.definition, lang),
      ch.cross ? crossFullName(ch.cross) : '',
      c.note,
    ];
  });
  return [head.map(k => t(k)), ...rows];
}
