'use client';
/**
 * Mẫu giao diện giữ TRONG TRÌNH DUYỆT (Hưng chốt câu C, 2026-09-29) —
 * localStorage `hd-illustrator-presets`, bọc try/catch như bản nháp: bị chặn
 * bộ nhớ thì vẫn dùng được trong phiên, chỉ không giữ qua lần tải lại.
 */
import { useCallback, useEffect, useState } from 'react';
import { newId } from '../../lib/storage/memory.js';
import type { Appearance } from '../../lib/illustrator/model.js';
import { readPresets, removePreset, serializePresets, upsertPreset, type AppearancePreset } from '../../lib/illustrator/presets.js';

export const PRESETS_STORAGE_KEY = 'hd-illustrator-presets';

export function usePresets(): {
  presets: readonly AppearancePreset[];
  save: (name: string, a: Appearance) => void;
  remove: (id: string) => void;
} {
  const [presets, setPresets] = useState<AppearancePreset[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PRESETS_STORAGE_KEY);
      const { presets: list, lossy } = readPresets(raw);
      // Đọc không trọn (hỏng / khác phiên bản / bỏ vài mục hỏng mà giữ mục khác) ⇒
      // chép dự phòng chuỗi gốc trước khi effect dưới ghi danh sách đã lọc đè lên.
      if (raw && lossy) window.localStorage.setItem(`${PRESETS_STORAGE_KEY}-corrupt`, raw);
      setPresets(list);
    } catch { /* bị chặn */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(PRESETS_STORAGE_KEY, serializePresets(presets)); } catch { /* không lưu được thì thôi */ }
  }, [ready, presets]);
  const save = useCallback((name: string, a: Appearance) => setPresets(l => upsertPreset(l, name, a, newId)), []);
  const remove = useCallback((id: string) => setPresets(l => removePreset(l, id)), []);
  return { presets, save, remove };
}
