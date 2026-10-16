/**
 * Màu người dùng tự chọn (Illustrator — docs/PLAN-illustrator.md Phase 1b).
 *
 * Đi qua `themeOverride` sẵn có của renderer, không thêm nhánh vẽ. Cổng kiểm
 * tương phản (`contrast.spec.ts`) chỉ áp cho hai chủ đề dựng sẵn — màu tự chọn
 * là việc của người chọn; không truyền gì thì ra đúng chủ đề gốc đã qua kiểm.
 */
import type { CenterId } from '../../calc-core/rave/derive/tables.js';
import type { BodygraphTheme } from './theme.js';

export interface ColorOverrides {
  design?: string;
  personality?: string;
  /** Cổng bật nhưng chưa gán phía. Mặc định trắng như bản tham chiếu. */
  plain?: string;
  /** Trung tâm định hình: một màu cho mọi trung tâm, hoặc từng trung tâm. */
  centerDefined?: string | Partial<Record<CenterId, string>>;
  centerOpen?: string;
  /** Màu mạch = lưới kênh mở. */
  circuitry?: string;
}

export function themeWithColors(base: BodygraphTheme, c: ColorOverrides): BodygraphTheme {
  const cd = c.centerDefined;
  const centerFill = cd === undefined ? base.centerFill
    : typeof cd === 'string'
      ? Object.fromEntries(Object.keys(base.centerFill).map(k => [k, cd])) as Record<CenterId, string>
      : { ...base.centerFill, ...cd };
  return {
    ...base,
    design: c.design ?? base.design,
    personality: c.personality ?? base.personality,
    plainFill: c.plain ?? base.plainFill,
    centerFill,
    centerOpenFill: c.centerOpen ?? base.centerOpenFill,
    channelOpenFill: c.circuitry ?? base.channelOpenFill,
  };
}
