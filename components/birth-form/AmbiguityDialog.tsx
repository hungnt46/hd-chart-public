'use client';
/**
 * Chặn khi giờ sinh mơ hồ — SPEC §8.3 (D8).
 *
 * Đây là điểm khác biệt có chủ đích so với phần mềm tham chiếu và cả bản web của Jovian Archive:
 * cả hai đều âm thầm chọn một phương án (ghi chép nội bộ — đã xác
 * minh lại trên app ngày 2026-09-21: nó chọn CEST và báo độ tin cậy "High").
 * App này KHÔNG tính chart cho tới khi người dùng chọn.
 *
 * ★ `<dialog>.showModal()` (2026-09-25, audit F12): bản trước là một `div`
 *   `role=dialog` — focus KHÔNG vào hộp thoại, Esc không đóng, Tab đi ra các nút
 *   phía sau lớp phủ. `showModal` cho sẵn cả ba (nền phía sau thành inert, Esc
 *   phát `cancel`); ta chỉ thêm: focus vào lựa chọn đầu, trả focus khi đóng.
 */
import { useEffect, useRef, type JSX } from 'react';
import type { UTResolution } from '../../lib/time/resolveUT';
import { formatOffset } from '../../lib/time/resolveUT';
import { useT } from '../../i18n/ui/LanguageProvider';

/* Luôn UTC (luật ngoại lệ của công tắc giờ): hai lựa chọn CÙNG giờ địa phương, chỉ UTC tách được. */
const fmtUT = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

export interface AmbiguityDialogProps {
  resolution: UTResolution;
  localLabel: string;
  onChoose: (offsetMinutes: number) => void;
  onCancel: () => void;
}

export function AmbiguityDialog({ resolution, localLabel, onChoose, onCancel }: AmbiguityDialogProps): JSX.Element {
  const t = useT();
  const repeated = resolution.ambiguity === 'repeated';
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    const back = document.activeElement as HTMLElement | null;
    if (d && !d.open) d.showModal();
    d?.querySelector<HTMLButtonElement>('[data-autofocus]')?.focus();
    return () => { back?.focus(); };
  }, []);

  return (
    <dialog ref={ref} aria-labelledby="amb-title" data-testid="ambiguity-dialog"
            onCancel={e => { e.preventDefault(); onCancel(); }}
            className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/45">
      <div className="p-5 sm:p-6">
        <h2 id="amb-title" className="text-lg font-semibold">
          {repeated ? t('amb.titleRepeated') : t('amb.titleNonexistent')}
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          <strong className="font-medium text-ink">{localLabel}</strong> — {repeated ? t('amb.bodyRepeated') : t('amb.bodyNonexistent')}
        </p>

        {repeated && (
          <ul className="mt-4 space-y-2" data-testid="ambiguity-choices">
            {resolution.candidates?.map((c, i) => (
              <li key={c.offsetMinutes}>
                <button type="button" onClick={() => onChoose(c.offsetMinutes)} data-offset={c.offsetMinutes}
                        {...(i === 0 ? { 'data-autofocus': '' } : {})}
                        className="w-full rounded-xl border border-field p-3 text-left transition-colors hover:border-ink hover:bg-subtle">
                  <span className="font-semibold">{c.abbreviation || formatOffset(c.offsetMinutes)}</span>
                  <span className="text-ink-2"> · UTC{formatOffset(c.offsetMinutes)}</span>
                  <span className="mt-0.5 block text-sm tabular-nums text-ink-2">{fmtUT(c.utcDate)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!repeated && (
          <div className="mt-4 rounded-xl border border-warn-line bg-warn-bg p-3 text-sm text-warn">
            {t('amb.suggestion', {
              ut: fmtUT(resolution.utcDate),
              offset: formatOffset(resolution.offsetMinutes),
            })}
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn" {...(!repeated ? { 'data-autofocus': '' } : {})}>
            {t('amb.fixTime')}
          </button>
          {!repeated && (
            <button type="button" onClick={() => onChoose(resolution.offsetMinutes)} className="btn btn-primary">
              {t('amb.useAnyway')}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
