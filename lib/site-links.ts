/**
 * Menu WEBSITE humandesign.vn trong app — MỘT chỗ duy nhất (docs/PLAN-giao-dien-aura.md §4).
 * Header màn chào (máy tính) và bảng menu hai vạch (`shell/SiteMenu`) đều đọc từ đây.
 *
 * Đường dẫn theo `src/components/Header.astro` của repo website (2026-10-21). Đổi menu
 * website thì sửa ở đây. `chart` là trang hiện tại (trang /chart/ nhúng app).
 */
import type { UiKey } from '../i18n/ui/index.js';

export const SITE_ORIGIN = 'https://humandesign.vn';

export interface SiteLink { key: UiKey; href: string; current?: boolean }

export const SITE_LINKS: readonly SiteLink[] = [
  { key: 'site.home', href: `${SITE_ORIGIN}/` },
  { key: 'site.basics', href: `${SITE_ORIGIN}/category/co-ban/` },
  { key: 'site.consult', href: `${SITE_ORIGIN}/tham-van/` },
  { key: 'site.courses', href: `${SITE_ORIGIN}/song-thuan-thiet-ke/` },
  { key: 'site.chart', href: `${SITE_ORIGIN}/chart/`, current: true },
];
