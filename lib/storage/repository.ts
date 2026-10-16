/**
 * Giao diện kho chart — SPEC §10.4. Mọi UI chỉ được nói chuyện qua đây.
 *
 * Có hai hiện thực và CẢ HAI đều phải qua cùng một bộ test hợp đồng
 * (`__tests__/contract.spec.ts`):
 *   - `memory.ts`    — trong bộ nhớ, dùng cho test và cho SSR (không có IndexedDB)
 *   - `indexeddb.ts` — thật, chạy trên trình duyệt
 */
import type {
  ChartBundle, ChartPatch, Folder, IllustrationPatch, NewChart, NewIllustration, SavedChart, SavedIllustration,
} from './types.js';

export class StorageError extends Error {
  constructor(message: string, readonly code: 'not-found' | 'conflict' | 'bad-bundle' | 'unavailable') {
    super(message);
    this.name = 'StorageError';
  }
}

export interface ImportReport {
  chartsAdded: number;
  foldersAdded: number;
  /** Chart trùng `id` với thứ đã có ⇒ nhập thành bản MỚI, id mới. Ghi lại để UI nói rõ. */
  chartsDuplicated: number;
  illustrationsAdded: number;
  illustrationsDuplicated: number;
}

export interface ChartRepository {
  listCharts(folderId?: string | null): Promise<SavedChart[]>;
  getChart(id: string): Promise<SavedChart | null>;
  createChart(input: NewChart): Promise<SavedChart>;
  updateChart(id: string, patch: ChartPatch): Promise<SavedChart>;
  deleteChart(id: string): Promise<void>;

  /* Bản vẽ Illustrator — loại bản ghi thứ hai, cùng hệ thư mục (Phase 3). */
  listIllustrations(folderId?: string | null): Promise<SavedIllustration[]>;
  getIllustration(id: string): Promise<SavedIllustration | null>;
  createIllustration(input: NewIllustration): Promise<SavedIllustration>;
  updateIllustration(id: string, patch: IllustrationPatch): Promise<SavedIllustration>;
  deleteIllustration(id: string): Promise<void>;

  listFolders(): Promise<Folder[]>;
  createFolder(name: string): Promise<Folder>;
  renameFolder(id: string, name: string): Promise<Folder>;
  /** Xoá thư mục; chart và bản vẽ bên trong KHÔNG bị xoá, chúng về `folderId = null`. */
  deleteFolder(id: string): Promise<void>;

  /**
   * Không đối số ⇒ TẤT CẢ. Có đối số ⇒ ĐÚNG những id được nêu (thiếu danh sách
   * nào là không lấy loại đó): `exportBundle([id])` chỉ một chart, không bản vẽ.
   */
  exportBundle(chartIds?: readonly string[], illustrationIds?: readonly string[]): Promise<ChartBundle>;
  importBundle(bundle: ChartBundle): Promise<ImportReport>;

  /** Xoá sạch — nút "quên tôi đi" cho dữ liệu sinh của người khác. */
  clearAll(): Promise<void>;
}
