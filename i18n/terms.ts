/**
 * Tên THUẬT NGỮ Human Design để hiển thị.
 *
 * ★ SỬA 2026-09-22: trước đây bản tiếng Việt nằm trong `i18n/hd-content/` (sau
 * cờ `NEXT_PUBLIC_HD_CONTENT_BUNDLED`) vì tôi tưởng đó là bản dịch của Jovian
 * Archive. **Sai** — Hưng tự dịch từ thuật ngữ chung của bộ môn, nên nó là tài
 * sản của chính dự án này và không có lý do gì phải nằm sau cờ bản quyền.
 * Nay nó ở `i18n/hd-terms/{en,vi}.json`, luôn có mặt ở cả hai ngôn ngữ.
 *
 * Quy ước trình bày (Hưng chốt 2026-09-22):
 *   - **Type** và **Profile**: tiếng Việt trước, tiếng Anh trong ngoặc —
 *     "Người Kiến Tạo (Generator)". Hai thứ này người học tra cứu chéo nhiều nhất.
 *   - mọi thứ khác: **thuần tiếng Việt**, không chêm tiếng Anh.
 */
import vi from './hd-terms/vi.json' with { type: 'json' };
import type { Lang, UiKey } from './ui/index.js';
import { BODY_NAMES, type Body } from '../calc-core/ephemeris/bodies.js';
import type { CenterId } from '../calc-core/rave/derive/tables.js';
import { CENTER_NAMES } from '../calc-core/rave/derive/tables.js';
import {
  authorityLabel, formatProfile, strategyOf, type Authority, type HdType,
} from '../calc-core/rave/derive/type-authority.js';
import type { Definition } from '../calc-core/rave/derive/structure.js';
import { crossFullName, crossName } from '../calc-core/rave/derive/type-authority.js';
import type { CrossDef } from '../calc-core/rave/derive/tables.js';
import { crossContent } from './hd-content/index.js';

export type TermKind = 'types' | 'authorities' | 'strategies' | 'definitions' | 'centers' | 'profiles' | 'planets';

const VI = vi as unknown as Record<string, Record<string, string> | undefined>;

/**
 * Tra bảng tiếng Việt. **Không có bảng tiếng Anh** — tiếng Anh lấy thẳng từ
 * `calc-core`, vốn cũng là thứ 10 golden ghi lại. Giữ một nguồn duy nhất cho
 * tiếng Anh thì e2e so với golden không bao giờ đỏ vì lý do dịch thuật.
 */
const term = (kind: TermKind, key: string | number, lang: Lang): string | null =>
  lang === 'en' ? null : (VI[kind]?.[String(key)] ?? null);

type T = (key: UiKey, vars?: Record<string, string | number>) => string;

export const typeName = (type: HdType, lang: Lang): string =>
  term('types', type, lang) ?? type;

/**
 * ★ Hai ca KHÔNG có trong bảng, phải dùng chuỗi giao diện của ta:
 *   - **Reflector** → "Lunar Cycle". Bảng `Authorities` không có mục nào cho nó.
 *   - **Mental projector** (`None`) → "Sounding Board". Bảng gốc ghi "None" /
 *     "Không có" — vừa sai vừa gợi ý rằng người đó không có authority (U11, đo
 *     trực tiếp trên app Jovian 2026-09-22).
 * Vì vậy khoá `authorities.None` cố ý không tồn tại trong `hd-terms`.
 */
export function authorityName(authority: Authority, type: HdType, lang: Lang, t: T): string {
  if (type === 'Reflector') return t('authority.lunarCycle');
  if (authority === 'None') return t('authority.soundingBoard');
  return term('authorities', authority, lang) ?? authorityLabel(authority, type);
}

/** Chiến lược — suy từ Type (`strategyOf`). Thuần Việt như Authority, không chêm tiếng Anh. */
export const strategyName = (type: HdType, lang: Lang): string =>
  term('strategies', strategyOf(type), lang) ?? strategyOf(type);

export const definitionName = (definition: Definition, lang: Lang): string =>
  term('definitions', definition, lang) ?? definition;

export const centerName = (id: CenterId, lang: Lang): string =>
  term('centers', id, lang) ?? CENTER_NAMES[id] ?? String(id);

export const profileName = (profile: number, lang: Lang): string =>
  term('profiles', profile, lang) ?? formatProfile(profile);

/**
 * `BODY_NAMES` là tên dùng làm KHOÁ (`NorthNode`), không phải tên để đọc. Tách
 * chỗ ghép chữ hoa ra là khớp đúng bảng `Planets` của phần mềm tham chiếu — trừ Chiron, chỗ họ
 * ghi "Kiron" còn ta giữ tên thiên văn chuẩn. Có test ghim điều đó.
 */
const readable = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2');

export const planetName = (body: Body, lang: Lang): string =>
  term('planets', body, lang) ?? readable(BODY_NAMES[body]);

/**
 * Tên Thập tự Nhập Thế để HIỂN THỊ.
 *
 * ★ Hưng chốt 2026-09-25: tiếng Việt, CHÊM tiếng Anh — cross là thứ thứ ba (sau
 *   Type và Profile) được phép chêm, vì tên tiếng Anh của cross là thứ người học
 *   tra chéo trên mọi app Jovian:
 *     "Thập tự Góc Phải Vườn Địa Đàng 2 (Right Angle Cross of Eden 2) · 12/11 | 36/6"
 *
 *   Tên Việt lấy từ `i18n/hd-content` (bản dịch bảng chuỗi tham chiếu) nên đi SAU cờ nội
 *   dung; cờ tắt hoặc thiếu bản Việt ⇒ trả đúng tên tiếng Anh như trước. Số
 *   biến thể ("2") KHÔNG có trong bảng chuỗi — ghép từ `CrossDef.variant` như
 *   `crossName`. Bộ cổng giữ nguyên thứ tự vì chính nó phân biệt biến thể.
 *
 *   Tiếng Anh vẫn là `crossFullName` y nguyên: golden và e2e so chuỗi đó.
 */
export function crossDisplayName(cross: CrossDef, lang: Lang): string {
  const en = crossFullName(cross);
  if (lang === 'en') return en;
  const c = crossContent(cross.id, lang);
  if (!c.value?.name || c.resolved !== lang) return en;
  const base = c.value.name.replace(/\s*\(\d+\/\d+ \| \d+\/\d+\)\s*$/, '');
  const [a, b, cc, d] = cross.gates;
  return `${cross.variant === null ? base : `${base} ${cross.variant}`} (${crossName(cross)}) · ${a}/${b} | ${cc}/${d}`;
}

/**
 * Thập tự tách DÒNG cho thẻ Thập tự Nhập Thế (giao diện D, Hưng chốt 2026-10-04):
 * dòng 1 `name` đậm — tên Việt kèm số biến thể ("Góc Phải Vườn Địa Đàng 2"); dòng 2
 * nhỏ — tên Anh + bộ cổng ("Right Angle Cross of Eden 2 · 12/11 | 36/6").
 * Tiếng Anh, hoặc cờ nội dung tắt: `name` là tên Anh, `en` null — dòng 2 chỉ còn bộ cổng.
 * Cùng nguồn với `crossDisplayName`.
 */
export function crossParts(cross: CrossDef, lang: Lang): { name: string; en: string | null; gates: string } {
  const [a, b, cc, d] = cross.gates;
  const gates = `${a}/${b} | ${cc}/${d}`;
  const c = lang === 'en' ? null : crossContent(cross.id, lang);
  if (!c?.value?.name || c.resolved !== lang) return { name: crossName(cross), en: null, gates };
  /* Thẻ đã có nhãn "Thập tự Nhập Thế" ⇒ bỏ tiền tố "Thập tự " của bản dịch. */
  const base = c.value.name.replace(/\s*\(\d+\/\d+ \| \d+\/\d+\)\s*$/, '').replace(/^Thập tự\s+/, '');
  return { name: cross.variant === null ? base : `${base} ${cross.variant}`, en: crossName(cross), gates };
}

/**
 * Type tách hai dòng cho tiêu đề thẻ Type: "Người Kiến Tạo" / "Generator". Tiếng
 * Anh chỉ một dòng (tên calc-core, như golden).
 */
export function typeParts(type: HdType, lang: Lang): { main: string; sub: string | null } {
  const full = typeName(type, lang);
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(full);
  return m ? { main: m[1]!, sub: m[2]! } : { main: full, sub: null };
}

/**
 * Tên trung tâm NGẮN cho chip / chỗ chật: bỏ tiền tố "Trung tâm " — "Xương
 * Cùng", "G", "Ajna". Tiếng Anh vốn đã ngắn ("Sacral").
 */
export const centerShortName = (id: CenterId, lang: Lang): string =>
  centerName(id, lang).replace(/^Trung tâm\s+/, '');

/** Tên kênh ngắn: "Kênh Nhịp Điệu" → "Nhịp Điệu", "Channel of Rhythm" → "Rhythm". */
export const channelShortName = (name: string): string =>
  name.replace(/^(Kênh|Channel of)\s+/i, '');

/**
 * Dạng xác định NGẮN cho ô bảng hẹp (bảng Ảnh hưởng hành tinh): "Chia Tách",
 * "Đơn" thay vì "Dạng Chia Tách", "Dạng Xác Định Đơn". Tiếng Anh: "Triple Split".
 */
export const definitionShortName = (definition: Definition, lang: Lang): string =>
  lang === 'vi'
    ? definitionName(definition, lang).replace(/^Dạng\s+/, '').replace(/^Xác Định\s+/, '')
    : readable(definition);

/**
 * Type NGẮN cho cột hẹp (bảng Ảnh hưởng hành tinh, mockup Hưng duyệt 2026-09-28):
 * "Kiến Tạo Nhanh" — bỏ "Người" và phần chêm tiếng Anh. Tên đầy đủ đi kèm ở
 * `title` và ở đầu bảng. NGOẠI LỆ của luật "Type chêm tiếng Anh" — Hưng chốt
 * giữ ngắn 2026-09-28 (STATUS §5 #42). Chỉ dùng cho cột hẹp, không cho chỗ khác.
 */
export const typeShortName = (type: HdType, lang: Lang): string =>
  lang === 'vi'
    ? typeName(type, lang).replace(/\s*\(.*\)\s*$/, '').replace(/^Người\s+/, '')
    : readable(type);
