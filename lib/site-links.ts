/**
 * Menu WEBSITE humandesign.vn trong app — MỘT chỗ duy nhất (docs/PLAN-giao-dien-aura.md §4).
 * Header màn chào (máy tính) và bảng menu hai vạch (`shell/SiteMenu`) đều đọc từ đây.
 *
 * Đường dẫn theo menu chính của website (`NAV` ở `src/data/nav.ts`, repo website; đối chiếu trang đang chạy
 * 2026-10-27). Đổi menu website thì sửa ở đây. `chart` là trang hiện tại (trang /chart/ nhúng app) — website để
 * nó ở nút góc "Tạo Chart", app để cuối danh sách. Mục "Ghi Chú Ngắn" của website chỉ hiện khi đã có ghi chú.
 */
import type { UiKey } from '../i18n/ui/index.js';

export const SITE_ORIGIN = 'https://humandesign.vn';

export interface SiteLink { key: UiKey; href: string; current?: boolean }

export const SITE_LINKS: readonly SiteLink[] = [
  { key: 'site.home', href: `${SITE_ORIGIN}/` },
  /* 2026-10-26 (website): "Học" → lộ trình 3 chặng, thay "Cơ Bản"; thêm "Bài Viết" (trang tất cả bài). */
  { key: 'site.learn', href: `${SITE_ORIGIN}/hoc/` },
  { key: 'site.posts', href: `${SITE_ORIGIN}/luu-tru/` },
  { key: 'site.consult', href: `${SITE_ORIGIN}/tham-van/` },
  { key: 'site.courses', href: `${SITE_ORIGIN}/song-thuan-thiet-ke/` },
  { key: 'site.chart', href: `${SITE_ORIGIN}/chart/`, current: true },
];
