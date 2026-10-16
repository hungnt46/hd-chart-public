/**
 * Hiện thực IndexedDB. Viết tay, KHÔNG thêm thư viện:
 * phần cần dùng chỉ là hai object store và vài giao dịch, gói lại hết ~40 dòng —
 * rẻ hơn là thêm một phụ thuộc vào thứ sẽ nằm trong gói gửi xuống trình duyệt.
 *
 * ⚠️ IndexedDB KHÔNG phải lúc nào cũng có: SSR không có, Safari chế độ riêng tư
 * có thể ném ngay ở `indexedDB.open`. Vì vậy `openChartRepository()` trả về kho
 * bộ nhớ thay vì để trang vỡ — nhưng nói rõ qua `persistent: false` để UI báo
 * người dùng biết dữ liệu sẽ không còn sau khi đóng tab.
 */
import { StorageError, type ChartRepository, type ImportReport } from './repository.js';
import { BUNDLE_KIND, BUNDLE_VERSION } from './codec.js';
import { MemoryChartRepository, newId } from './memory.js';
import type {
  ChartBundle, ChartPatch, Folder, IllustrationPatch, NewChart, NewIllustration, SavedChart, SavedIllustration,
} from './types.js';

export const DB_NAME = 'hd-webapp';
/**
 * 2 (Illustrator Phase 3): thêm store `illustrations`. Nâng cấp CHỈ thêm store,
 * không đụng hai store cũ ⇒ kho v1 mở lên v2 giữ nguyên chart + thư mục (có test).
 */
export const DB_VERSION = 2;
const CHARTS = 'charts';
const FOLDERS = 'folders';
const ILLUS = 'illustrations';

const wrap = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => { resolve(req.result); };
    req.onerror = () => { reject(req.error ?? new Error('IndexedDB lỗi không rõ')); };
  });

const done = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => { resolve(); };
    tx.onerror = () => { reject(tx.error ?? new Error('giao dịch IndexedDB lỗi')); };
    tx.onabort = () => { reject(tx.error ?? new Error('giao dịch IndexedDB bị huỷ')); };
  });

/** Kết nối đã nhả cho tab khác nâng cấp — dùng tiếp là `InvalidStateError` khó hiểu. */
const superseded = new WeakSet<IDBDatabase>();

export function openDatabase(factory: IDBFactory, version: number = DB_VERSION): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(DB_NAME, version);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CHARTS)) {
        db.createObjectStore(CHARTS, { keyPath: 'id' }).createIndex('folderId', 'folderId');
      }
      if (!db.objectStoreNames.contains(FOLDERS)) {
        db.createObjectStore(FOLDERS, { keyPath: 'id' });
      }
      if (version >= 2 && !db.objectStoreNames.contains(ILLUS)) {
        db.createObjectStore(ILLUS, { keyPath: 'id' }).createIndex('folderId', 'folderId');
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Tab khác nâng DB_VERSION thì nhả kết nối ra, đừng để tab đó kẹt `onblocked`.
      db.onversionchange = () => { superseded.add(db); db.close(); };
      resolve(db);
    };
    req.onerror = () => { reject(req.error ?? new Error('không mở được IndexedDB')); };
    req.onblocked = () => { reject(new Error('IndexedDB bị chặn bởi một tab khác')); };
  });
}

export class IndexedDbChartRepository implements ChartRepository {
  constructor(private db: IDBDatabase, private now: () => number = () => Date.now()) {}

  /** Kết nối đã nhả cho tab khác ⇒ báo rõ cần tải lại, thay vì lỗi trình duyệt. */
  private tx(stores: string | string[], mode: IDBTransactionMode): IDBTransaction {
    if (superseded.has(this.db)) {
      throw new StorageError('Kho đã được nâng cấp ở một tab khác — hãy tải lại trang', 'unavailable');
    }
    return this.db.transaction(stores, mode);
  }

  private async read<T>(store: string, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return wrap(fn(this.tx(store, 'readonly').objectStore(store)));
  }

  private async write(stores: string[], fn: (tx: IDBTransaction) => void): Promise<void> {
    const tx = this.tx(stores, 'readwrite');
    fn(tx);
    await done(tx);
  }

  async listCharts(folderId?: string | null): Promise<SavedChart[]> {
    const all = await this.read<SavedChart[]>(CHARTS, s => s.getAll() as IDBRequest<SavedChart[]>);
    const rows = folderId === undefined ? all : all.filter(c => c.folderId === folderId);
    rows.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
    return rows;
  }

  async getChart(id: string): Promise<SavedChart | null> {
    const c = await this.read<SavedChart | undefined>(
      CHARTS, s => s.get(id) as IDBRequest<SavedChart | undefined>);
    return c ?? null;
  }

  async createChart(input: NewChart): Promise<SavedChart> {
    const t = this.now();
    const c: SavedChart = {
      id: newId(), name: input.name, folderId: input.folderId ?? null,
      birth: { ...input.birth }, note: input.note ?? '', createdAt: t, updatedAt: t,
    };
    await this.write([CHARTS], tx => { tx.objectStore(CHARTS).add(c); });
    return c;
  }

  async updateChart(id: string, patch: ChartPatch): Promise<SavedChart> {
    const c = await this.getChart(id);
    if (!c) throw new StorageError(`không có chart ${id}`, 'not-found');
    if (patch.folderId !== undefined && patch.folderId !== null) {
      const f = await this.read<Folder | undefined>(
        FOLDERS, s => s.get(patch.folderId!) as IDBRequest<Folder | undefined>);
      if (!f) throw new StorageError(`không có thư mục ${patch.folderId}`, 'not-found');
    }
    const next: SavedChart = { ...c, ...patch, updatedAt: this.now() };
    await this.write([CHARTS], tx => { tx.objectStore(CHARTS).put(next); });
    return next;
  }

  async deleteChart(id: string): Promise<void> {
    if (!await this.getChart(id)) throw new StorageError(`không có chart ${id}`, 'not-found');
    await this.write([CHARTS], tx => { tx.objectStore(CHARTS).delete(id); });
  }

  async listIllustrations(folderId?: string | null): Promise<SavedIllustration[]> {
    const all = await this.read<SavedIllustration[]>(ILLUS, s => s.getAll() as IDBRequest<SavedIllustration[]>);
    const rows = folderId === undefined ? all : all.filter(c => c.folderId === folderId);
    rows.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
    return rows;
  }

  async getIllustration(id: string): Promise<SavedIllustration | null> {
    const c = await this.read<SavedIllustration | undefined>(
      ILLUS, s => s.get(id) as IDBRequest<SavedIllustration | undefined>);
    return c ?? null;
  }

  private async assertFolder(id: string | null | undefined): Promise<void> {
    if (id === undefined || id === null) return;
    const f = await this.read<Folder | undefined>(FOLDERS, s => s.get(id) as IDBRequest<Folder | undefined>);
    if (!f) throw new StorageError(`không có thư mục ${id}`, 'not-found');
  }

  async createIllustration(input: NewIllustration): Promise<SavedIllustration> {
    await this.assertFolder(input.folderId);
    const t = this.now();
    const c: SavedIllustration = {
      id: newId(), name: input.name, folderId: input.folderId ?? null, note: input.note ?? '',
      // structuredClone của IndexedDB tự chép sâu; bản trả về cũng phải tách khỏi đầu vào.
      state: structuredClone(input.state),
      ...(input.sourceChartId === undefined ? {} : { sourceChartId: input.sourceChartId }),
      createdAt: t, updatedAt: t,
    };
    await this.write([ILLUS], tx => { tx.objectStore(ILLUS).add(c); });
    return c;
  }

  async updateIllustration(id: string, patch: IllustrationPatch): Promise<SavedIllustration> {
    const c = await this.getIllustration(id);
    if (!c) throw new StorageError(`không có bản vẽ ${id}`, 'not-found');
    await this.assertFolder(patch.folderId);
    const next: SavedIllustration = { ...c, ...structuredClone(patch), updatedAt: this.now() };
    await this.write([ILLUS], tx => { tx.objectStore(ILLUS).put(next); });
    return next;
  }

  async deleteIllustration(id: string): Promise<void> {
    if (!await this.getIllustration(id)) throw new StorageError(`không có bản vẽ ${id}`, 'not-found');
    await this.write([ILLUS], tx => { tx.objectStore(ILLUS).delete(id); });
  }

  async listFolders(): Promise<Folder[]> {
    const all = await this.read<Folder[]>(FOLDERS, s => s.getAll() as IDBRequest<Folder[]>);
    return all.sort((a, b) => a.name.localeCompare(b.name));
  }

  async createFolder(name: string): Promise<Folder> {
    const f: Folder = { id: newId(), name, createdAt: this.now() };
    await this.write([FOLDERS], tx => { tx.objectStore(FOLDERS).add(f); });
    return f;
  }

  async renameFolder(id: string, name: string): Promise<Folder> {
    const f = await this.read<Folder | undefined>(
      FOLDERS, s => s.get(id) as IDBRequest<Folder | undefined>);
    if (!f) throw new StorageError(`không có thư mục ${id}`, 'not-found');
    const next = { ...f, name };
    await this.write([FOLDERS], tx => { tx.objectStore(FOLDERS).put(next); });
    return next;
  }

  async deleteFolder(id: string): Promise<void> {
    const f = await this.read<Folder | undefined>(
      FOLDERS, s => s.get(id) as IDBRequest<Folder | undefined>);
    if (!f) throw new StorageError(`không có thư mục ${id}`, 'not-found');
    const inside = await this.listCharts(id);
    const insideIllus = await this.listIllustrations(id);
    // Một giao dịch cho cả ba store: hoặc thư mục biến mất VÀ chart/bản vẽ được
    // thả ra, hoặc không gì cả. Tách ra nhiều giao dịch là mời gọi bản ghi mồ côi.
    await this.write([FOLDERS, CHARTS, ILLUS], tx => {
      tx.objectStore(FOLDERS).delete(id);
      const cs = tx.objectStore(CHARTS);
      for (const c of inside) cs.put({ ...c, folderId: null });
      const is = tx.objectStore(ILLUS);
      for (const c of insideIllus) is.put({ ...c, folderId: null });
    });
  }

  async exportBundle(chartIds?: readonly string[], illustrationIds?: readonly string[]): Promise<ChartBundle> {
    const some = chartIds !== undefined || illustrationIds !== undefined;
    const all = await this.listCharts();
    const allIllus = await this.listIllustrations();
    const picked = some ? all.filter(c => chartIds?.includes(c.id)) : all;
    const pickedIllus = some ? allIllus.filter(c => illustrationIds?.includes(c.id)) : allIllus;
    const used = new Set([...picked, ...pickedIllus].map(c => c.folderId).filter((x): x is string => x !== null));
    const folders = await this.listFolders();
    return {
      kind: BUNDLE_KIND,
      version: BUNDLE_VERSION,
      exportedAt: new Date(this.now()).toISOString(),
      folders: some ? folders.filter(f => used.has(f.id)) : folders,
      charts: picked,
      illustrations: pickedIllus,
    };
  }

  async importBundle(bundle: ChartBundle): Promise<ImportReport> {
    const report: ImportReport = {
      chartsAdded: 0, foldersAdded: 0, chartsDuplicated: 0, illustrationsAdded: 0, illustrationsDuplicated: 0,
    };
    const existingFolders = await this.listFolders();
    const byId = new Map(existingFolders.map(f => [f.id, f]));
    const byName = new Map(existingFolders.map(f => [f.name, f]));
    const folderMap = new Map<string, string>();
    const newFolders: Folder[] = [];
    for (const f of bundle.folders) {
      const hit = byId.get(f.id) ?? byName.get(f.name);
      if (hit) { folderMap.set(f.id, hit.id); continue; }
      newFolders.push({ ...f });
      byId.set(f.id, f); byName.set(f.name, f);
      folderMap.set(f.id, f.id);
      report.foldersAdded++;
    }
    const existingCharts = new Set((await this.listCharts()).map(c => c.id));
    const rows: SavedChart[] = bundle.charts.map(c => {
      const dup = existingCharts.has(c.id);
      if (dup) report.chartsDuplicated++;
      report.chartsAdded++;
      return {
        ...c,
        id: dup ? newId() : c.id,
        folderId: c.folderId === null ? null : folderMap.get(c.folderId) ?? null,
      };
    });
    const existingIllus = new Set((await this.listIllustrations()).map(c => c.id));
    const illusRows: SavedIllustration[] = bundle.illustrations.map(c => {
      const dup = existingIllus.has(c.id);
      if (dup) report.illustrationsDuplicated++;
      report.illustrationsAdded++;
      return {
        ...c,
        id: dup ? newId() : c.id,
        folderId: c.folderId === null ? null : folderMap.get(c.folderId) ?? null,
      };
    });
    // Cả gói vào bằng MỘT giao dịch: nhập nửa chừng rồi hỏng là trạng thái
    // không ai gỡ được.
    await this.write([FOLDERS, CHARTS, ILLUS], tx => {
      const fs = tx.objectStore(FOLDERS), cs = tx.objectStore(CHARTS), is = tx.objectStore(ILLUS);
      for (const f of newFolders) fs.put(f);
      for (const r of rows) cs.put(r);
      for (const r of illusRows) is.put(r);
    });
    return report;
  }

  async clearAll(): Promise<void> {
    await this.write([CHARTS, FOLDERS, ILLUS], tx => {
      tx.objectStore(CHARTS).clear();
      tx.objectStore(FOLDERS).clear();
      tx.objectStore(ILLUS).clear();
    });
  }
}

export interface OpenResult {
  repo: ChartRepository;
  /** `false` ⇒ đang chạy bằng kho bộ nhớ, đóng tab là mất. UI PHẢI nói ra. */
  persistent: boolean;
  reason?: string;
}

/** Mở kho thật; hỏng thì lùi về bộ nhớ chứ không để trang chết. */
export async function openChartRepository(
  // Khai kiểu lỏng: trên SSR `globalThis.indexedDB` KHÔNG tồn tại, nhưng khai
  // báo DOM lại bảo nó luôn có ⇒ nhánh dự phòng sẽ bị coi là code chết.
  factory: IDBFactory | undefined = (globalThis as { indexedDB?: IDBFactory }).indexedDB,
): Promise<OpenResult> {
  if (!factory) {
    return { repo: new MemoryChartRepository(), persistent: false,
             reason: 'Trình duyệt không có IndexedDB' };
  }
  try {
    return { repo: new IndexedDbChartRepository(await openDatabase(factory)), persistent: true };
  } catch (e) {
    return { repo: new MemoryChartRepository(), persistent: false,
             reason: e instanceof Error ? e.message : String(e) };
  }
}
