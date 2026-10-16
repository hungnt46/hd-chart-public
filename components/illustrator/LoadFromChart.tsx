'use client';
/**
 * "Nạp từ chart" — mockup Phase 2, câu C (Hưng duyệt 2026-09-28): mục đầu là
 * CHART ĐANG MỞ (nếu có), dưới là "Chọn trong Kho chart…". Nạp là THAY bản vẽ
 * nên hỏi lại ngay trong bảng khi bản vẽ không trống; Hoàn tác lấy lại được.
 */
import { useState, type JSX } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { Popover } from '../ui/Popover.js';
import { Icon } from '../ui/Icon.js';

const ITEM = 'btn btn-ghost w-full flex-col items-start justify-center gap-0.5 py-1.5 text-left';

export interface LoadProps {
  /** Nhãn chart đang mở, `null` khi chưa có. */
  current: string | null;
  onCurrent: () => void;
  onLibrary: () => void;
  /** Bản vẽ không trống ⇒ hỏi lại trước khi thay. */
  confirm: boolean;
}

export function LoadFromChart({ current, onCurrent, onLibrary, confirm, testId, showLabel = false, above = false }: LoadProps & {
  above?: boolean;
  testId: string;
  /** Luôn hiện chữ (chân bảng Kích hoạt); mặc định như nút thanh trên: < 1024px chỉ biểu tượng. */
  showLabel?: boolean;
}): JSX.Element {
  const { t } = useLanguage();
  const [ask, setAsk] = useState<null | 'current' | 'library'>(null);
  const run = (k: 'current' | 'library') => { setAsk(null); if (k === 'current') onCurrent(); else onLibrary(); };

  return (
    <Popover testId={testId} buttonClassName="btn" closeOnPick panelClassName="w-72" above={above}
             label={<><Icon name="upload" size={18} /><span className={showLabel ? '' : 'max-lg:sr-only'}>{t('illu.load')}</span></>}
             ariaLabel={t('illu.load')}>
      {ask ? (
        <div className="space-y-2 p-1.5" data-testid={`${testId}-ask`}>
          <p className="text-ui">{t('illu.loadConfirm')}</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary" onClick={() => run(ask)} data-testid={`${testId}-confirm`}>
              {t('illu.replace')}
            </button>
            <button type="button" className="btn" data-keep-open onClick={() => setAsk(null)}>{t('illu.cancel')}</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {current && (
            <button type="button" className={ITEM} data-testid={`${testId}-current`} {...(confirm ? { 'data-keep-open': '' } : {})}
                    onClick={() => (confirm ? setAsk('current') : run('current'))}>
              <b className="font-semibold">{t('illu.loadCurrent')}</b>
              <span className="text-xs text-ink-2">{current}</span>
            </button>
          )}
          <button type="button" className={ITEM} data-testid={`${testId}-library`} {...(confirm ? { 'data-keep-open': '' } : {})}
                  onClick={() => (confirm ? setAsk('library') : run('library'))}>
            {t('illu.loadLibrary')}
          </button>
        </div>
      )}
    </Popover>
  );
}
