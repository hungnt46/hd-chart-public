/**
 * Tầng HIỂN THỊ của nguồn kích hoạt — rộng hơn `ActivationSource` của calc-core
 * đúng một giá trị: `plain`, cổng bật nhưng chưa gán phía. Chỉ Illustrator tạo
 * ra nó (docs/PLAN-illustrator.md Phase 1b); chart tính từ ngày sinh thì không
 * bao giờ, nên nó KHÔNG được vào calc-core.
 */
import type { ActivationSource } from '../../calc-core/rave/derive/activation-source.js';

export type DisplaySource = ActivationSource | 'plain';

/**
 * Nguồn gộp của hai cổng một kênh. Như `channelActivationSource` của calc-core,
 * cộng thêm `plain`: `plain` không phải một phía nên không góp vào 'both' —
 * `plain` + design đi theo phía có màu; chỉ khi cả hai `plain` mới ra `plain`.
 * Với dữ liệu không có `plain` kết quả trùng khít bản calc-core.
 */
export function combineSources(a: DisplaySource, b: DisplaySource): DisplaySource {
  if (a === b) return a;
  if (a === 'plain') return b;
  if (b === 'plain') return a;
  return 'both';
}

/** Các lớp bật/tắt được của bodygraph — mỗi khoá ứng với một `data-layer`. */
export type LayerKey = 'backdrop' | 'lattice' | 'centers' | 'gates' | 'gateNumbers' | 'activation';

/** `opacity` 0–1 (giao diện hiện 0–100%). */
export interface LayerSetting { visible: boolean; opacity: number }
