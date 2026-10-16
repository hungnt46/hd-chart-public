/**
 * TÊN cổng, tên kênh, nhãn mạch / loại kênh — docs/PLAN-planetary-influence.md Phase 2.
 *
 * ★ Hưng chốt 2026-09-28: đây là DỮ KIỆN CHUẨN của bộ môn, không phải nội dung
 *   bản quyền của Jovian ⇒ KHÔNG đọc cờ `NEXT_PUBLIC_HD_CONTENT_BUNDLED`, luôn
 *   có ở cả hai ngôn ngữ. Keynote và mọi diễn giải vẫn ở `i18n/hd-content/`,
 *   sau cờ. Thư mục này KHÔNG import gì từ `hd-content` (có test khoá).
 *
 * `gates` / `channels` SINH bằng `npm run gen:hd-names` — đừng sửa tay.
 * Nhãn mạch / loại kênh tiếng Việt sửa tay trong `vi.json`; tiếng Anh lấy từ
 * `calc-core` (đúng chữ của app tham chiếu), như luật "không có bảng tiếng Anh" của `hd-terms`.
 */
import en from './en.json' with { type: 'json' };
import vi from './vi.json' with { type: 'json' };
import type { Lang } from '../ui/index.js';
import {
  CHANNEL_TYPE_LABEL_EN, CIRCUIT_LABEL_EN,
  type ChannelType, type Circuit, type CircuitGroup,
} from '../../calc-core/rave/planetary-influence.js';

interface Names { gates: Record<string, string>; channels: Record<string, string> }
const NAMES: Record<Lang, Names> = { en, vi };

function need(v: string | undefined, what: string): string {
  if (v === undefined) throw new RangeError(`hd-names: không có ${what}`);
  return v;
}

/** Tên cổng 1–64: "Sáng Tạo (Thuần Càn)" / "The creative" — bản Việt giữ tên quẻ trong ngoặc. */
export const gateName = (gate: number, lang: Lang): string =>
  need(NAMES[lang].gates[gate], `cổng ${gate}`);

/** Tên kênh theo `id` của `calc-core/hd-data/channels.json` (0–35): "Kênh Thức Tỉnh" / "Channel of Awakening". */
export const channelName = (channelId: number, lang: Lang): string =>
  need(NAMES[lang].channels[channelId], `kênh ${channelId}`);

export const circuitGroupName = (group: CircuitGroup, lang: Lang): string =>
  lang === 'en' ? group : vi.circuitGroups[group];

/** "Sensing (Abstract)" / "Cảm Nhận (Trừu Tượng)". */
export const circuitName = (circuit: Circuit, lang: Lang): string =>
  lang === 'en' ? CIRCUIT_LABEL_EN[circuit] : vi.circuits[circuit];

/** "Manifesting Generating" / "Kiến Tạo Nhanh". */
export const channelTypeName = (type: ChannelType, lang: Lang): string =>
  lang === 'en' ? CHANNEL_TYPE_LABEL_EN[type] : vi.channelTypes[type];
