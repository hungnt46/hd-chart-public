'use client';
/**
 * Chế độ GIỜ hiển thị: địa phương hay UT — Hưng chốt 2026-09-23 (STATUS §5 #18).
 *
 * Áp cho TOÀN APP. "Địa phương" nghĩa là:
 *   · mốc thuộc CHART (cột Design/Personality, chu kỳ)  → múi giờ NƠI SINH
 *   · transit và bảng Thay đổi sắp tới                   → múi giờ của MÁY
 * giống cách ứng dụng tham chiếu tách "Date and Time (Local)" với "(UTC)". Ô nhập transit đổi
 * theo chế độ: chọn UT thì gõ UT.
 *
 * Hai chỗ CỐ Ý không theo công tắc, luôn là UT:
 *   · hộp thoại giờ mơ hồ — hai lựa chọn CÙNG giờ địa phương, đó chính là chỗ
 *     mơ hồ; chỉ UT mới tách được chúng;
 *   · dòng tóm tắt `ut-value` — là BẢN GHI quy đổi (UT + offset + nguồn), cũng
 *     là trường `utIso` duy nhất ảnh hưởng kết quả (CLAUDE.md, kho chart).
 *
 * SSR: dựng bằng `DEFAULT_TIME_MODE` rồi mới đọc lựa chọn đã lưu trong
 * `useEffect` — cùng lý do với `LanguageProvider` (trang dựng tĩnh, đọc
 * localStorage ở lần vẽ đầu là hydration mismatch).
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type JSX, type ReactNode,
} from 'react';

export type TimeMode = 'local' | 'ut';
export const DEFAULT_TIME_MODE: TimeMode = 'local';
export const TIME_MODE_STORAGE_KEY = 'hd-webapp:time-mode';

export interface TimeModeValue { mode: TimeMode; setMode: (m: TimeMode) => void }

const Ctx = createContext<TimeModeValue>({ mode: DEFAULT_TIME_MODE, setMode: () => undefined });

export function TimeModeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [mode, setModeState] = useState<TimeMode>(DEFAULT_TIME_MODE);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TIME_MODE_STORAGE_KEY);
      if (saved === 'local' || saved === 'ut') setModeState(saved);
    } catch { /* localStorage bị chặn — giữ mặc định */ }
  }, []);
  const setMode = useCallback((m: TimeMode) => {
    setModeState(m);
    try { window.localStorage.setItem(TIME_MODE_STORAGE_KEY, m); } catch { /* không lưu được thì thôi */ }
  }, []);
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTimeMode = (): TimeModeValue => useContext(Ctx);
