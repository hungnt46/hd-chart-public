/**
 * Lối vào tra địa danh cho giao diện: chạy trong Web Worker (`places.worker.ts`) để
 * việc tách 171 nghìn dòng và quét mỗi phím không chặn luồng chính. Trình duyệt
 * không có Worker (hoặc tạo hỏng) thì rơi về luồng chính (`load-places.ts`) — kết
 * quả y hệt, chỉ chậm tay hơn.
 */
import { loadPlaces } from './load-places';
import { resolvePlace, searchPlaces, type PlaceCandidate, type PlaceResolution } from './places';

type Res = { id: number; ok: true; results?: PlaceCandidate[]; resolution?: PlaceResolution } | { id: number; ok: false; error: string };

let worker: Worker | null | undefined;
let seq = 0;
const waiting = new Map<number, { resolve: (r: Res) => void }>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = typeof Worker === 'undefined' ? null : new Worker(new URL('./places.worker.ts', import.meta.url));
    worker?.addEventListener('message', (e: MessageEvent<Res>) => {
      waiting.get(e.data.id)?.resolve(e.data);
      waiting.delete(e.data.id);
    });
  } catch { worker = null; }
  return worker;
}

function ask(msg: { type: 'load' } | { type: 'search' | 'resolve'; query: string }): Promise<Res> {
  const w = getWorker()!;
  const id = ++seq;
  return new Promise(resolve => { waiting.set(id, { resolve }); w.postMessage({ id, ...msg }); });
}

/** Tải chỉ mục (một lần). Ném lỗi nếu tải hỏng — gọi lại là thử lại. */
export async function loadPlaceIndex(): Promise<void> {
  if (!getWorker()) { await loadPlaces(); return; }
  const r = await ask({ type: 'load' });
  if (!r.ok) throw new Error(r.error);
}

/** Tìm tối đa 8 nơi khớp `query` (xem `searchPlaces`). */
export async function findPlaces(query: string): Promise<PlaceCandidate[]> {
  if (!getWorker()) return searchPlaces(await loadPlaces(), query);
  const r = await ask({ type: 'search', query });
  if (!r.ok) throw new Error(r.error);
  return r.results ?? [];
}

/** Nơi sinh gõ tự do từ link: chọn hộ chỉ khi chắc (xem `resolvePlace`). */
export async function resolvePlaceQuery(query: string): Promise<PlaceResolution> {
  if (!getWorker()) return resolvePlace(await loadPlaces(), query);
  const r = await ask({ type: 'resolve', query });
  if (!r.ok) throw new Error(r.error);
  return r.resolution ?? { pick: null, candidates: [] };
}
