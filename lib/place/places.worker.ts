/**
 * Web Worker tra địa danh (2026-10-06). Tải + tách tệp ~6.9 MB / 171 nghìn dòng
 * (`parsePlaces`, ~0.8 s) và quét mỗi lần gõ (16–43 ms/phím) đều ở ĐÂY, không chặn
 * luồng chính — ô nhập, form, thẻ "Bầu trời lúc này" vẫn mượt.
 *
 * Giao thức: { id, type: 'load' } ⇒ { id, ok } · { id, type: 'search', query } ⇒
 * { id, ok, results } · { id, type: 'resolve', query } ⇒ { id, ok, resolution }. Lỗi ⇒ { id, ok: false, error }, và lần sau tải lại từ đầu.
 * Tệp đi qua service worker như cũ (worker là client của trang) nên vẫn offline.
 */
import { PLACES_URL } from './places-manifest';
import { parsePlaces, resolvePlace, searchPlaces, type PlaceIndex, type PlaceResolution } from './places';

interface Ctx { onmessage: ((e: MessageEvent<Req>) => void) | null; postMessage: (m: Res) => void }
type Req = { id: number; type: 'load' } | { id: number; type: 'search' | 'resolve'; query: string };
type Res = { id: number; ok: true; results?: ReturnType<typeof searchPlaces>; resolution?: PlaceResolution } | { id: number; ok: false; error: string };

const ctx = self as unknown as Ctx;
let index: Promise<PlaceIndex> | null = null;

const load = () => {
  index ??= fetch(PLACES_URL)
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} khi tải ${PLACES_URL}`); return r.text(); })
    .then(parsePlaces)
    .catch((e: unknown) => { index = null; throw e; });
  return index;
};

ctx.onmessage = e => {
  const req = e.data;
  load().then(
    idx => ctx.postMessage(
      req.type === 'search' ? { id: req.id, ok: true, results: searchPlaces(idx, req.query) }
      : req.type === 'resolve' ? { id: req.id, ok: true, resolution: resolvePlace(idx, req.query) }
      : { id: req.id, ok: true }),
    (err: unknown) => ctx.postMessage({ id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) }),
  );
};
