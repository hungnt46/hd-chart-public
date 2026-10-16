'use client';
/**
 * Trạng thái của Illustrator ở cấp TRANG (docs/PLAN-illustrator.md Phase 2):
 * thanh trên (danh tính, số đếm) và vùng làm việc đọc cùng một bản vẽ.
 *
 * ★ Bản đang vẽ tự GIỮ trong localStorage (tuần tự hoá bằng `serialize` của
 *   model). Phase 3: lưu vào Kho chart là việc RIÊNG, người dùng bấm "Lưu"; ở
 *   đây chỉ nhớ bản đang vẽ ứng với bản ghi nào trong Kho (`saved`) và nội dung
 *   lúc lưu, để thanh trên ghi "đã lưu / chưa lưu" (`hd-illustrator-saved`). Đọc/ghi bọc
 *   try/catch như `CompositePaletteProvider`: trình duyệt chặn bộ nhớ thì vẫn
 *   vẽ được, chỉ không giữ qua lần tải lại. Bản lưu hỏng ⇒ bỏ, bắt đầu trống.
 *
 * Hoàn tác: mỗi thay đổi đẩy bản cũ vào ngăn xếp (tối đa `UNDO_MAX`). Gõ tên /
 * dòng bản quyền cũng là một thay đổi — gom theo ô bằng `merge` để một lần gõ
 * chữ không thành hàng chục bước hoàn tác.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyIllustration, isEmpty, parse, serialize, type IllustrationState } from '../../lib/illustrator/model.js';

export const DRAFT_STORAGE_KEY = 'hd-illustrator-draft';
export const SAVED_STORAGE_KEY = 'hd-illustrator-saved';
const UNDO_MAX = 100;

export type IllustratorTab = 'act' | 'look' | 'export';

function readDraft(): IllustrationState {
  let t: string | null = null;
  try {
    t = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (t) return parse(t);
  } catch {
    // Bộ nhớ bị chặn hoặc bản lưu hỏng / khác phiên bản — bắt đầu trống. Bản hỏng
    // CHÉP sang khoá dự phòng trước: effect ghi ngay sau sẽ đè bản trống lên nó.
    if (t) try { window.localStorage.setItem(`${DRAFT_STORAGE_KEY}-corrupt`, t); } catch { /* bị chặn */ }
  }
  return emptyIllustration();
}

/** Bản ghi Kho mà bản đang vẽ ứng với — `snap` là `serialize` lúc lưu/mở. */
export interface SavedRef { id: string; name: string; snap: string }

function readSaved(): SavedRef | null {
  try {
    const j = JSON.parse(window.localStorage.getItem(SAVED_STORAGE_KEY) ?? 'null') as Partial<SavedRef> | null;
    if (j && typeof j.id === 'string' && typeof j.name === 'string' && typeof j.snap === 'string') return { id: j.id, name: j.name, snap: j.snap };
  } catch { /* bị chặn / hỏng */ }
  return null;
}

export interface IllustrationApi {
  state: IllustrationState;
  /** `merge`: cùng khoá với lần trước thì không thêm bước hoàn tác (gõ chữ). */
  update: (f: (s: IllustrationState) => IllustrationState, merge?: string) => void;
  undo: () => void;
  canUndo: boolean;
  tab: IllustratorTab;
  setTab: (t: IllustratorTab) => void;
  /** Tăng mỗi lần bấm tên bản vẽ trên thanh trên ⇒ thẻ Xuất ảnh focus ô tên. */
  renameReq: number;
  requestRename: () => void;
  /** Bản ghi Kho đang ứng với bản vẽ (null = chưa lưu lần nào). */
  saved: SavedRef | null;
  /** Có thay đổi so với lúc lưu / mở (chưa lưu lần nào thì = không trống). */
  dirty: boolean;
  /** Vừa lưu vào Kho bản ghi `id` tên `name` với nội dung hiện tại. */
  markSaved: (id: string, name: string) => void;
  /** Mở một bản vẽ từ Kho: thay bản đang vẽ (Hoàn tác lấy lại được). */
  open: (next: IllustrationState, ref: { id: string; name: string }) => void;
  /** Bản ghi đã mất khỏi Kho (bị xoá) — quên nó đi. */
  forgetSaved: () => void;
}

interface History { cur: IllustrationState; past: readonly IllustrationState[]; merge?: string }

export function useIllustration(): IllustrationApi {
  // Một state DUY NHẤT cho bản vẽ + ngăn xếp hoàn tác: updater phải thuần (React
  // StrictMode gọi nó hai lần) — gọi setState lồng trong updater là đẩy trùng.
  const [h, setH] = useState<History>(() => ({ cur: emptyIllustration(), past: [] }));
  const [tab, setTab] = useState<IllustratorTab>('act');
  const [renameReq, setRenameReq] = useState(0);
  // STATE, không ref: StrictMode chạy effect hai lần trong cùng một lượt vẽ —
  // cờ ref đã bật thì lượt hai GHI bản trống đè lên bản nháp trước khi kịp đọc.
  const [ready, setReady] = useState(false);

  // Đọc sau khi gắn — máy chủ không có localStorage, đọc lúc render là lệch hydrate.
  const [saved, setSaved] = useState<SavedRef | null>(null);
  useEffect(() => { setH({ cur: readDraft(), past: [] }); setSaved(readSaved()); setReady(true); }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      if (saved) window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(saved));
      else window.localStorage.removeItem(SAVED_STORAGE_KEY);
    } catch { /* không lưu được thì thôi */ }
  }, [ready, saved]);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(DRAFT_STORAGE_KEY, serialize(h.cur)); } catch { /* không lưu được thì thôi */ }
  }, [ready, h.cur]);

  const update = useCallback((f: (s: IllustrationState) => IllustrationState, merge?: string) => {
    setH(prev => {
      const next = f(prev.cur);
      if (next === prev.cur) return prev;
      const same = merge !== undefined && merge === prev.merge;
      return { cur: next, past: same ? prev.past : [...prev.past.slice(-(UNDO_MAX - 1)), prev.cur], merge };
    });
  }, []);

  const undo = useCallback(() => {
    setH(prev => prev.past.length
      ? { cur: prev.past[prev.past.length - 1]!, past: prev.past.slice(0, -1) }
      : prev);
  }, []);

  const requestRename = useCallback(() => { setTab('export'); setRenameReq(n => n + 1); }, []);

  const cur = serialize(h.cur);
  const dirty = saved ? saved.snap !== cur : !isEmpty(h.cur);
  // Ref, không đọc trong updater của setH: updater phải thuần (StrictMode gọi hai lần).
  const curRef = useRef(h.cur);
  curRef.current = h.cur;
  const markSaved = useCallback((id: string, name: string) => {
    setSaved({ id, name, snap: serialize(curRef.current) });
  }, []);
  const open = useCallback((next: IllustrationState, ref: { id: string; name: string }) => {
    setH(prev => ({ cur: next, past: [...prev.past.slice(-(UNDO_MAX - 1)), prev.cur] }));
    setSaved({ ...ref, snap: serialize(next) });
  }, []);
  const forgetSaved = useCallback(() => setSaved(null), []);

  return {
    state: h.cur, update, undo, canUndo: h.past.length > 0, tab, setTab, renameReq, requestRename,
    saved, dirty, markSaved, open, forgetSaved,
  };
}
