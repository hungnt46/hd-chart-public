'use client';
/**
 * Ngôn ngữ giao diện: đoán theo trình duyệt + múi giờ máy lần đầu (`guessLang`),
 * sau đó NHỚ lựa chọn.
 *
 * ★ Vì sao máy chủ luôn dựng bằng tiếng Việt rồi mới đổi ở trình duyệt:
 * trang này được **dựng sẵn tĩnh** (`○ Static` trong `next build`), nên máy chủ
 * không biết gì về người đang xem — không cookie, không `Accept-Language`.
 * Nếu lần vẽ đầu ở trình duyệt đọc `navigator.language` thì HTML hai bên khác
 * nhau ⇒ hydration mismatch, đúng thứ đã làm hỏng trang hai lần trước (xem
 * `components/birth-form/__tests__/ssr-hydration.spec.tsx`).
 *
 * Vì vậy: dựng bằng `DEFAULT_LANG` ở cả máy chủ lẫn lần vẽ đầu, rồi đổi trong
 * `useEffect`. Người dùng tiếng Anh thấy một nhịp tiếng Việt rồi mới chuyển —
 * đánh đổi có chủ đích, và đúng chiều vì phần lớn người dùng là người Việt.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type JSX, type ReactNode,
} from 'react';
import { guessLang, isLang, translate, type Lang, type UiKey } from './index.js';

/** Múi giờ của máy — rỗng nếu trình duyệt không cho biết. */
const deviceZone = (): string | undefined => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; }
};

export const DEFAULT_LANG: Lang = 'vi';
export const LANG_STORAGE_KEY = 'hd-webapp:lang';

export interface LanguageValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: UiKey, vars?: Record<string, string | number>) => string;
  /** `false` cho tới khi đọc xong lựa chọn đã lưu — dùng để tránh ghi đè ngược. */
  ready: boolean;
}

/**
 * Mặc định KHÔNG null: component dựng riêng lẻ (test, storybook) vẫn chạy và
 * hiện tiếng Việt thay vì ném. Đánh đổi: quên bọc provider thì không có lỗi ầm ĩ
 * — bù lại bằng e2e kiểm nút chuyển ngôn ngữ đổi được chữ thật.
 */
const FALLBACK: LanguageValue = {
  lang: DEFAULT_LANG,
  setLang: () => undefined,
  ready: false,
  t: (key, vars) => translate(DEFAULT_LANG, key, vars),
};

const Ctx = createContext<LanguageValue>(FALLBACK);

export function LanguageProvider({ children }: { children: ReactNode }): JSX.Element {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let next = DEFAULT_LANG;
    try {
      const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
      next = isLang(saved) ? saved : guessLang(navigator.language, deviceZone());
    } catch {
      // localStorage bị chặn (Safari riêng tư) — vẫn đoán theo trình duyệt được
      next = guessLang(navigator.language, deviceZone());
    }
    setLangState(next);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) document.documentElement.lang = lang;
  }, [lang, ready]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { window.localStorage.setItem(LANG_STORAGE_KEY, l); } catch { /* không lưu được thì thôi */ }
  }, []);

  const value = useMemo<LanguageValue>(() => ({
    lang, setLang, ready,
    t: (key, vars) => translate(lang, key, vars),
  }), [lang, setLang, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLanguage(): LanguageValue {
  return useContext(Ctx);
}

/** Lối tắt cho component chỉ cần dịch chữ. */
export const useT = (): LanguageValue['t'] => useLanguage().t;
