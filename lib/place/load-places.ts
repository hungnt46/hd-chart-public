/**
 * Tải chỉ mục địa danh MỘT lần, lúc người dùng bắt đầu gõ vào ô nơi sinh.
 *
 * Tệp ~6.9 MB (≈3 MB khi nén) nên KHÔNG tải cùng trang: phần lớn lượt dùng chọn
 * lại chart đã lưu hoặc chọn thẳng múi giờ. Tệp mang ngày trong tên và được
 * cache `immutable` (next.config) nên chỉ tải một lần cho mỗi phiên bản dữ liệu.
 */
import { PLACES_URL } from './places-manifest.js';
import { parsePlaces, type PlaceIndex } from './places.js';

let pending: Promise<PlaceIndex> | null = null;

export function loadPlaces(): Promise<PlaceIndex> {
  pending ??= fetch(PLACES_URL)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status} khi tải ${PLACES_URL}`);
      return r.text();
    })
    .then(parsePlaces)
    .catch((e: unknown) => {
      pending = null; // cho phép thử lại lần gõ sau
      throw e;
    });
  return pending;
}
