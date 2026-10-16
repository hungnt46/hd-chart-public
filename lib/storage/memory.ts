/**
 * Kho trong bộ nhớ. Hai công dụng:
 *   1. test hợp đồng chạy nhanh trong Node, không cần trình duyệt;
 *   2. dự phòng khi IndexedDB không dùng được (SSR, chế độ riêng tư của Safari).
 *
 * Dữ liệu mất khi tải lại trang — đó là chủ đích, và UI phải nói rõ điều đó chứ
 * không được im lặng giả vờ đã lưu.
 */
/* eslint-disable @typescript-eslint/require-await --
 * Lớp này hiện thực một giao diện BẤT ĐỒNG BỘ (vì bản IndexedDB buộc phải vậy)
 * nhưng bản thân nó chạy đồng bộ. Giữ `async` cho mỗi phương thức đọc dễ hơn hẳn
 * so với bọc `Promise.resolve()` mười hai lần, và không phương thức nào có thể
 * âm thầm quên `await` vì chẳng có gì để chờ.
 */
import { StorageError, type ChartRepository, type ImportReport } from './repository.js';
import { BUNDLE_KIND, BUNDLE_VERSION } from './codec.js';
import type {
  ChartBundle, ChartPatch, Folder, IllustrationPatch, NewChart, NewIllustration, SavedChart, SavedIllustration,
} from './types.js';

/**
 * `crypto.randomUUID` có ở mọi trình duyệt hiện đại và Node ≥ 19, nhưng KHÔNG có
 * trong ngữ cảnh không-an-toàn (http:// không phải localhost). Khai kiểu lỏng để
 * nhánh dự phòng không bị coi là code chết.
 */
export const newId = (): string => {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return c?.randomUUID?.() ??
    `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/** Bản sao sâu để người gọi sửa vật trả về cũng không đụng tới kho. */
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export class MemoryChartRepository implements ChartRepository {
  private charts = new Map<string, SavedChart>();
  private folders = new Map<string, Folder>();
  private illus = new Map<string, SavedIllustration>();
  /** Cho phép test ghim thời gian; mặc định là đồng hồ thật. */
  constructor(private now: () => number = () => Date.now()) {}

  async listCharts(folderId?: string | null): Promise<SavedChart[]> {
    const all = [...this.charts.values()]
      .filter(c => folderId === undefined || c.folderId === folderId);
    // mới nhất trước; cùng mốc thì theo tên để thứ tự luôn xác định
    all.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
    return clone(all);
  }

  async getChart(id: string): Promise<SavedChart | null> {
    const c = this.charts.get(id);
    return c ? clone(c) : null;
  }

  async createChart(input: NewChart): Promise<SavedChart> {
    const t = this.now();
    const c: SavedChart = {
      id: newId(),
      name: input.name,
      folderId: input.folderId ?? null,
      birth: clone(input.birth),
      note: input.note ?? '',
      createdAt: t,
      updatedAt: t,
    };
    this.charts.set(c.id, c);
    return clone(c);
  }

  async updateChart(id: string, patch: ChartPatch): Promise<SavedChart> {
    const c = this.charts.get(id);
    if (!c) throw new StorageError(`không có chart ${id}`, 'not-found');
    if (patch.folderId !== undefined && patch.folderId !== null && !this.folders.has(patch.folderId)) {
      throw new StorageError(`không có thư mục ${patch.folderId}`, 'not-found');
    }
    const next: SavedChart = { ...c, ...patch, updatedAt: this.now() };
    this.charts.set(id, next);
    return clone(next);
  }

  async deleteChart(id: string): Promise<void> {
    if (!this.charts.delete(id)) throw new StorageError(`không có chart ${id}`, 'not-found');
  }

  async listIllustrations(folderId?: string | null): Promise<SavedIllustration[]> {
    const all = [...this.illus.values()].filter(c => folderId === undefined || c.folderId === folderId);
    all.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
    return clone(all);
  }

  async getIllustration(id: string): Promise<SavedIllustration | null> {
    const c = this.illus.get(id);
    return c ? clone(c) : null;
  }

  async createIllustration(input: NewIllustration): Promise<SavedIllustration> {
    if (input.folderId && !this.folders.has(input.folderId)) {
      throw new StorageError(`không có thư mục ${input.folderId}`, 'not-found');
    }
    const t = this.now();
    const c: SavedIllustration = {
      id: newId(), name: input.name, folderId: input.folderId ?? null, note: input.note ?? '',
      state: clone(input.state),
      ...(input.sourceChartId === undefined ? {} : { sourceChartId: input.sourceChartId }),
      createdAt: t, updatedAt: t,
    };
    this.illus.set(c.id, c);
    return clone(c);
  }

  async updateIllustration(id: string, patch: IllustrationPatch): Promise<SavedIllustration> {
    const c = this.illus.get(id);
    if (!c) throw new StorageError(`không có bản vẽ ${id}`, 'not-found');
    if (patch.folderId !== undefined && patch.folderId !== null && !this.folders.has(patch.folderId)) {
      throw new StorageError(`không có thư mục ${patch.folderId}`, 'not-found');
    }
    const next: SavedIllustration = { ...c, ...clone(patch), updatedAt: this.now() };
    this.illus.set(id, next);
    return clone(next);
  }

  async deleteIllustration(id: string): Promise<void> {
    if (!this.illus.delete(id)) throw new StorageError(`không có bản vẽ ${id}`, 'not-found');
  }

  async listFolders(): Promise<Folder[]> {
    return clone([...this.folders.values()].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async createFolder(name: string): Promise<Folder> {
    const f: Folder = { id: newId(), name, createdAt: this.now() };
    this.folders.set(f.id, f);
    return clone(f);
  }

  async renameFolder(id: string, name: string): Promise<Folder> {
    const f = this.folders.get(id);
    if (!f) throw new StorageError(`không có thư mục ${id}`, 'not-found');
    const next = { ...f, name };
    this.folders.set(id, next);
    return clone(next);
  }

  async deleteFolder(id: string): Promise<void> {
    if (!this.folders.delete(id)) throw new StorageError(`không có thư mục ${id}`, 'not-found');
    // Chart KHÔNG chết theo thư mục — xoá nhầm thư mục mà mất luôn chart thì quá đắt.
    for (const [cid, c] of this.charts) {
      if (c.folderId === id) this.charts.set(cid, { ...c, folderId: null });
    }
    for (const [iid, c] of this.illus) {
      if (c.folderId === id) this.illus.set(iid, { ...c, folderId: null });
    }
  }

  async exportBundle(chartIds?: readonly string[], illustrationIds?: readonly string[]): Promise<ChartBundle> {
    const some = chartIds !== undefined || illustrationIds !== undefined;
    const pick = <T>(m: Map<string, T>, ids?: readonly string[]): T[] => !some ? [...m.values()]
      : (ids ?? []).map(id => m.get(id)).filter((c): c is T => c !== undefined);
    const picked = pick(this.charts, chartIds);
    const pickedIllus = pick(this.illus, illustrationIds);
    const used = new Set([...picked, ...pickedIllus].map(c => c.folderId).filter((x): x is string => x !== null));
    return clone({
      kind: BUNDLE_KIND,
      version: BUNDLE_VERSION,
      exportedAt: new Date(this.now()).toISOString(),
      folders: [...this.folders.values()].filter(f => !some || used.has(f.id)),
      charts: picked,
      illustrations: pickedIllus,
    } satisfies ChartBundle);
  }

  async importBundle(bundle: ChartBundle): Promise<ImportReport> {
    const report: ImportReport = {
      chartsAdded: 0, foldersAdded: 0, chartsDuplicated: 0, illustrationsAdded: 0, illustrationsDuplicated: 0,
    };
    /** id trong gói → id thật sau khi nhập (có thể phải cấp mới). */
    const folderMap = new Map<string, string>();
    for (const f of bundle.folders) {
      if (this.folders.has(f.id)) { folderMap.set(f.id, f.id); continue; }
      // Trùng TÊN thì gộp vào thư mục sẵn có, khỏi sinh "Khách hàng (2)".
      const same = [...this.folders.values()].find(x => x.name === f.name);
      if (same) { folderMap.set(f.id, same.id); continue; }
      this.folders.set(f.id, clone(f));
      folderMap.set(f.id, f.id);
      report.foldersAdded++;
    }
    for (const c of bundle.charts) {
      const dup = this.charts.has(c.id);
      const id = dup ? newId() : c.id;
      if (dup) report.chartsDuplicated++;
      const folderId = c.folderId === null ? null : folderMap.get(c.folderId) ?? null;
      this.charts.set(id, clone({ ...c, id, folderId }));
      report.chartsAdded++;
    }
    for (const c of bundle.illustrations) {
      const dup = this.illus.has(c.id);
      const id = dup ? newId() : c.id;
      if (dup) report.illustrationsDuplicated++;
      const folderId = c.folderId === null ? null : folderMap.get(c.folderId) ?? null;
      this.illus.set(id, clone({ ...c, id, folderId }));
      report.illustrationsAdded++;
    }
    return report;
  }

  async clearAll(): Promise<void> {
    this.charts.clear();
    this.folders.clear();
    this.illus.clear();
  }
}
