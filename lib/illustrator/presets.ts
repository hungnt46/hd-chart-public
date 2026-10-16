/**
 * Preset giao diện của Illustrator (docs/PLAN-illustrator.md Phase 3.2):
 * "Lưu giao diện hiện tại thành preset…" rồi áp lại cho bản vẽ khác.
 *
 * Preset chỉ giữ `Appearance` (chủ đề, lớp, màu, cột hành tinh, mandala) — KHÔNG
 * giữ cổng hay tên. Thuần: không DOM; chỗ lưu (localStorage) nằm ở tầng giao diện.
 */
import { parseAppearance, type Appearance, type IllustrationState } from './model.js';

export interface AppearancePreset { id: string; name: string; appearance: Appearance }

export const PRESETS_VERSION = 1;

/** Áp preset: thay trọn phần giao diện, giữ nguyên cổng / trung tâm / tên. */
export function applyPreset(s: IllustrationState, p: AppearancePreset): IllustrationState {
  return { ...s, appearance: parseAppearance(JSON.parse(JSON.stringify(p.appearance))) };
}

/** Thêm (hoặc thay preset CÙNG TÊN — lưu đè thay vì đẻ "Bài giảng (2)"). Mới nhất lên đầu. */
export function upsertPreset(list: readonly AppearancePreset[], name: string, appearance: Appearance,
  newId: () => string): AppearancePreset[] {
  const n = name.trim();
  if (!n) throw new Error('Preset cần tên');
  const old = list.find(p => p.name === n);
  const p: AppearancePreset = { id: old?.id ?? newId(), name: n, appearance: parseAppearance(JSON.parse(JSON.stringify(appearance))) };
  return [p, ...list.filter(x => x !== old)];
}

export const removePreset = (list: readonly AppearancePreset[], id: string): AppearancePreset[] =>
  list.filter(p => p.id !== id);

export const serializePresets = (list: readonly AppearancePreset[]): string =>
  JSON.stringify({ version: PRESETS_VERSION, presets: list });

/**
 * Đọc danh sách preset. `lossy` = có dữ liệu mà KHÔNG đọc trọn: JSON hỏng, khác
 * phiên bản, hoặc bỏ ít nhất một mục hỏng — tầng giao diện dựa vào đó để chép dự
 * phòng chuỗi gốc trước khi ghi đè (bỏ vài mục mà giữ mục khác cũng phải chép).
 */
export function readPresets(text: string | null): { presets: AppearancePreset[]; lossy: boolean } {
  if (!text) return { presets: [], lossy: false };
  try {
    const j = JSON.parse(text) as { version?: unknown; presets?: unknown };
    if (j.version !== PRESETS_VERSION || !Array.isArray(j.presets)) return { presets: [], lossy: true };
    const presets = j.presets.flatMap((p: unknown) => {
      const x = p as Partial<AppearancePreset> | null;
      return x && typeof x.id === 'string' && typeof x.name === 'string' && x.name.trim()
        ? [{ id: x.id, name: x.name, appearance: parseAppearance(x.appearance) }] : [];
    });
    return { presets, lossy: presets.length !== j.presets.length };
  } catch { return { presets: [], lossy: true }; }
}

/** Hỏng thì trả rỗng — preset là tiện ích, không đáng làm vỡ Illustrator. Bỏ từng mục hỏng. */
export const parsePresets = (text: string | null): AppearancePreset[] => readPresets(text).presets;
