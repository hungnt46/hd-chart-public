/**
 * Bản công khai KHÔNG nhập tệp `.mmi` (nút nhập tệp bị ẩn — STATUS §5 #57). `build:public` trỏ
 * `mmi-import.js` sang tệp này (`next.config.mjs`), nên bộ đọc thật không vào gói phát hành lẫn repo mã nguồn
 * công khai (STATUS §5 #77). Cùng chữ ký với `importMmi` của bản đầy đủ để `ChartLibrary` dựng được.
 */
import { StorageError, type ChartRepository } from './repository.js';

export interface MmiImportReport {
  folderName: string;
  added: number;
  duplicates: number;
  skipped: { name: string; type: string }[];
  changed: { name: string; mmiUt: string; tzdbUt: string }[];
  unresolved: string[];
}

export function importMmi(
  _repo: ChartRepository, _text: string,
  _resolveZone: (city: string, country: string) => string | null,
  _folderName: string,
): Promise<MmiImportReport> {
  return Promise.reject(new StorageError('Bản công khai không nhập tệp .mmi', 'bad-bundle'));
}
