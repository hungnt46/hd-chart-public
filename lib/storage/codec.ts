/**
 * Đọc/ghi gói xuất-nhập. THUẦN: không DOM, không IndexedDB, không thời gian hệ
 * thống trừ chỗ đóng dấu `exportedAt`.
 *
 * Vì sao có file riêng thay vì `JSON.parse` tại chỗ: file nhập là **dữ liệu từ
 * bên ngoài**. Nó có thể cũ, có thể là file khác thả nhầm, có thể bị sửa tay.
 * Nhốt mọi phép kiểm vào một chỗ thì UI chỉ còn việc hiện lỗi.
 */
import { StorageError } from './repository.js';
import type { BirthRecord, ChartBundle, Folder, SavedChart, SavedIllustration } from './types.js';
import { fromJson, toJson, type IllustrationJson } from '../illustrator/model.js';

export const BUNDLE_KIND = 'hd-webapp-charts';
/** 2 = có `illustrations` (Illustrator Phase 3). Gói 1 vẫn đọc, coi như không có bản vẽ. */
export const BUNDLE_VERSION = 2;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (o: Record<string, unknown>, k: string): string => {
  const v = o[k];
  if (typeof v !== 'string') throw new StorageError(`thiếu hoặc sai kiểu: ${k}`, 'bad-bundle');
  return v;
};

const num = (o: Record<string, unknown>, k: string): number => {
  const v = o[k];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new StorageError(`thiếu hoặc sai kiểu: ${k}`, 'bad-bundle');
  }
  return v;
};

const oneOf = <T extends string>(o: Record<string, unknown>, k: string, allowed: readonly T[]): T => {
  const v = str(o, k);
  if (!(allowed as readonly string[]).includes(v)) {
    throw new StorageError(`${k} không hợp lệ: ${v}`, 'bad-bundle');
  }
  return v as T;
};

/**
 * ★ Kiểm `utIso` gắt tay. Đây là trường DUY NHẤT ảnh hưởng tới kết quả tính;
 * một chuỗi lệch định dạng mà lọt qua thì chart nhập về sẽ SAI trong im lặng.
 */
function parseUtIso(v: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(v)) {
    throw new StorageError(`utIso phải là ISO 8601 UTC kết thúc bằng Z: ${v}`, 'bad-bundle');
  }
  const t = Date.parse(v);
  if (Number.isNaN(t)) throw new StorageError(`utIso không đọc được: ${v}`, 'bad-bundle');
  // Chuẩn hoá về đúng một dạng ⇒ round-trip xuất→nhập→xuất cho chuỗi y hệt.
  return new Date(t).toISOString();
}

/**
 * ★ Bảo mật (quét vbsec 2026-09-30): tệp nhập là dữ liệu NGƯỜI KHÁC gửi. Ngày/giờ
 *   đi vào tên tệp xuất và tiêu đề khung in; trước đây chỉ kiểm "là chuỗi" nên
 *   `localTime = "08:30:</title><img onerror=…>"` lọt qua (vẫn mở được vì
 *   `reopen.ts` chỉ đọc hai phần đầu). Nay kiểm ĐÚNG dạng mà app tự ghi ra.
 */
const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME = /^\d{2}:\d{2}(:\d{2})?$/;
const ZONE_NAME = /^[A-Za-z0-9_+-]+(\/[A-Za-z0-9_+-]+)*$/;
const MAX_PLACE = 200;

function matching(v: Record<string, unknown>, key: string, re: RegExp): string {
  const s = str(v, key);
  if (!re.test(s)) throw new StorageError(`${key} sai định dạng: ${s.slice(0, 40)}`, 'bad-bundle');
  return s;
}

function parseBirth(v: unknown): BirthRecord {
  if (!isObj(v)) throw new StorageError('birth không phải object', 'bad-bundle');
  const out: BirthRecord = {
    utIso: parseUtIso(str(v, 'utIso')),
    localDate: matching(v, 'localDate', LOCAL_DATE),
    localTime: matching(v, 'localTime', LOCAL_TIME),
    ianaZone: matching(v, 'ianaZone', ZONE_NAME),
    offsetMinutes: num(v, 'offsetMinutes'),
    offsetSource: oneOf(v, 'offsetSource', ['iana', 'lmt', 'manual', 'mmi'] as const),
    ambiguity: oneOf(v, 'ambiguity', ['none', 'repeated', 'nonexistent'] as const),
    confidence: oneOf(v, 'confidence', ['high', 'low'] as const),
  };
  if (typeof v.place === 'string') {
    if (v.place.length > MAX_PLACE) throw new StorageError('place quá dài', 'bad-bundle');
    out.place = v.place;
  }
  return out;
}

function parseFolder(v: unknown): Folder {
  if (!isObj(v)) throw new StorageError('folder không phải object', 'bad-bundle');
  return { id: str(v, 'id'), name: str(v, 'name'), createdAt: num(v, 'createdAt') };
}

function parseChart(v: unknown): SavedChart {
  if (!isObj(v)) throw new StorageError('chart không phải object', 'bad-bundle');
  const folderId = v.folderId;
  if (folderId !== null && typeof folderId !== 'string') {
    throw new StorageError('folderId phải là chuỗi hoặc null', 'bad-bundle');
  }
  return {
    id: str(v, 'id'),
    name: str(v, 'name'),
    folderId,
    birth: parseBirth(v.birth),
    note: typeof v.note === 'string' ? v.note : '',
    createdAt: num(v, 'createdAt'),
    updatedAt: num(v, 'updatedAt'),
  };
}

/**
 * Bản vẽ trong gói: kiểm bằng CHÍNH bộ đọc của mô hình (`fromJson`) rồi ghi lại
 * bằng `toJson` — một chỗ giữ luật, và gói nhập về luôn ở dạng chuẩn.
 */
function parseIllustrationState(v: unknown): IllustrationJson {
  try {
    return toJson(fromJson(v));
  } catch (e) {
    throw new StorageError(`bản vẽ hỏng: ${e instanceof Error ? e.message : String(e)}`, 'bad-bundle');
  }
}

function parseIllustration(v: unknown): SavedIllustration {
  if (!isObj(v)) throw new StorageError('illustration không phải object', 'bad-bundle');
  const folderId = v.folderId;
  if (folderId !== null && typeof folderId !== 'string') {
    throw new StorageError('folderId phải là chuỗi hoặc null', 'bad-bundle');
  }
  return {
    id: str(v, 'id'),
    name: str(v, 'name'),
    folderId,
    note: typeof v.note === 'string' ? v.note : '',
    state: parseIllustrationState(v.state),
    ...(typeof v.sourceChartId === 'string' ? { sourceChartId: v.sourceChartId } : {}),
    createdAt: num(v, 'createdAt'),
    updatedAt: num(v, 'updatedAt'),
  };
}

/** Đọc văn bản JSON thành gói đã kiểm. Ném `StorageError('bad-bundle')` nếu hỏng. */
/**
 * Trần kích thước tệp nhập (quét vbsec 2026-09-30, gợi ý tăng cường). Tệp cố ý
 * dựng quá lớn chỉ làm treo máy chính người nhập, nhưng báo lỗi rõ vẫn hơn treo.
 * 50 triệu ký tự ≫ mọi kho thật (8 chart mẫu ≈ 20 nghìn ký tự).
 */
export const MAX_IMPORT_CHARS = 50_000_000;
export function assertImportSize(text: string): void {
  if (text.length > MAX_IMPORT_CHARS) throw new StorageError('tệp quá lớn để nhập', 'bad-bundle');
}

export function parseBundle(text: string): ChartBundle {
  assertImportSize(text);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new StorageError('không phải JSON hợp lệ', 'bad-bundle');
  }
  if (!isObj(raw)) throw new StorageError('gói phải là một object', 'bad-bundle');
  if (raw.kind !== BUNDLE_KIND) {
    throw new StorageError(
      `không phải gói chart của HD Web App (kind = ${JSON.stringify(raw.kind)})`, 'bad-bundle');
  }
  const version = num(raw, 'version');
  if (version > BUNDLE_VERSION) {
    throw new StorageError(
      `gói phiên bản ${version}, bản này chỉ đọc tới ${BUNDLE_VERSION} — hãy cập nhật ứng dụng`,
      'bad-bundle');
  }
  const folders = raw.folders, charts = raw.charts;
  if (!Array.isArray(folders) || !Array.isArray(charts)) {
    throw new StorageError('thiếu mảng folders hoặc charts', 'bad-bundle');
  }
  // Gói 1 không có trường này. Gói 2 thì BẮT BUỘC — thiếu là tệp bị cắt/sửa hỏng.
  const illustrations = version < 2 ? [] : raw.illustrations;
  if (!Array.isArray(illustrations)) throw new StorageError('thiếu mảng illustrations', 'bad-bundle');
  return {
    kind: BUNDLE_KIND,
    version: BUNDLE_VERSION,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    folders: folders.map(parseFolder),
    charts: charts.map(parseChart),
    illustrations: illustrations.map(parseIllustration),
  };
}

/**
 * ★ Thứ tự trường CỐ ĐỊNH khi ghi.
 *
 * `JSON.stringify` giữ nguyên thứ tự chèn khoá của object, nên cùng một nội dung
 * mà dựng từ hai chỗ khác nhau sẽ ra hai chuỗi khác nhau. Hệ quả: file xuất ra
 * không diff được, và lời hứa "xuất → nhập → xuất cho file y hệt" thành nói suông.
 * Đã mắc thật: `parseChart` trả `birth` trước `note`, còn chỗ tạo chart thì ngược lại.
 */
const canonical = (b: ChartBundle): ChartBundle => ({
  kind: b.kind,
  version: b.version,
  exportedAt: b.exportedAt,
  folders: b.folders.map(f => ({ id: f.id, name: f.name, createdAt: f.createdAt })),
  charts: b.charts.map(c => ({
    id: c.id,
    name: c.name,
    folderId: c.folderId,
    birth: {
      utIso: c.birth.utIso,
      localDate: c.birth.localDate,
      localTime: c.birth.localTime,
      ianaZone: c.birth.ianaZone,
      offsetMinutes: c.birth.offsetMinutes,
      offsetSource: c.birth.offsetSource,
      ambiguity: c.birth.ambiguity,
      confidence: c.birth.confidence,
      ...(c.birth.place === undefined ? {} : { place: c.birth.place }),
    },
    note: c.note,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  })),
  illustrations: b.illustrations.map(i => ({
    id: i.id,
    name: i.name,
    folderId: i.folderId,
    note: i.note,
    state: parseIllustrationState(i.state),
    ...(i.sourceChartId === undefined ? {} : { sourceChartId: i.sourceChartId }),
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  })),
});

/** JSON có xuống dòng — file này người ta có thể mở ra đọc và sửa tay. */
export const stringifyBundle = (b: ChartBundle): string =>
  JSON.stringify(canonical(b), null, 2) + '\n';

/** Tên file gợi ý khi tải về. */
export const bundleFileName = (at: Date): string =>
  `hd-charts-${at.toISOString().slice(0, 10)}.json`;
