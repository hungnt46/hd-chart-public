'use client';
/**
 * CHỦ ĐỀ bodygraph (Classic / Modern) — kiêm bảng màu chart ghép.
 *
 * ★ Hưng chốt 2026-09-28:
 *   · bảng màu chart ghép ĐI THEO CHỦ ĐỀ — Classic với Classic, Modern với
 *     Modern (STATUS §4 G2 từng cho chọn riêng; hai nhóm "Classic · Modern" cạnh
 *     nhau là "chọn nhóm quá phức tạp");
 *   · công tắc chủ đề RỜI khỏi khung biểu đồ, vào bảng cài đặt trên thanh trên
 *     cùng ngôn ngữ và giờ (phương án D) — nên chủ đề là trạng thái TOÀN APP như
 *     `TimeModeProvider`, không còn là state của `ChartWorkspace`.
 *
 * Nhớ lựa chọn trong localStorage. Lần đầu đọc cả khoá CŨ của bảng màu ghép để
 * người đã chọn Modern trước đây không bị đổi ngược. SSR dựng Classic rồi mới
 * đọc (cùng lý do hydration với `TimeModeProvider`).
 *
 * Mọi chỗ tô màu BÊN của chart ghép đọc `useCompositePalette()`: bodygraph ghép,
 * cột hành tinh, dấu fixing, ô hào sáng của "Theo dõi kích hoạt".
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type JSX, type ReactNode,
} from 'react';
import { COMPOSITE_PALETTES, type CompositePalette, type CompositePaletteName } from './theme.js';

export type ChartTheme = CompositePaletteName;
export const CHART_THEME_STORAGE_KEY = 'hd-webapp:chart-theme';
/** Khoá CŨ (trước 2026-09-28) — chỉ còn đọc, để giữ lựa chọn Modern đã có. */
export const COMPOSITE_PALETTE_STORAGE_KEY = 'hd-webapp:composite-palette';

interface ChartThemeValue { theme: ChartTheme; setTheme: (t: ChartTheme) => void }

const Ctx = createContext<ChartThemeValue>({ theme: 'classic', setTheme: () => undefined });

export function ChartThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setThemeState] = useState<ChartTheme>('classic');
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CHART_THEME_STORAGE_KEY)
        ?? window.localStorage.getItem(COMPOSITE_PALETTE_STORAGE_KEY);
      if (saved === 'classic' || saved === 'modern') setThemeState(saved);
    } catch { /* localStorage bị chặn — giữ mặc định */ }
  }, []);
  const setTheme = useCallback((t: ChartTheme) => {
    setThemeState(t);
    try { window.localStorage.setItem(CHART_THEME_STORAGE_KEY, t); } catch { /* không lưu được thì thôi */ }
  }, []);
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useChartTheme = (): ChartThemeValue => useContext(Ctx);

export const useCompositePalette = (): { name: CompositePaletteName; palette: CompositePalette } => {
  const { theme } = useContext(Ctx);
  return { name: theme, palette: COMPOSITE_PALETTES[theme] };
};
