'use client';
import type { JSX } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { Popover } from '../ui/Popover.js';

const SOURCE = 'https://github.com/hungnt46/hd-chart-public';
const GEONAMES = 'https://www.geonames.org/';

/**
 * ★ Khối "Giới thiệu và bản quyền" — liên kết mã nguồn (AGPL-3.0) + ghi công GeoNames (CC-BY 4.0).
 *   CHỈ bản công khai.
 *
 *   Lịch sử: dòng chân trang (STATUS §5 #61, #65) → menu ⚙ / ⋯ (#69) → Aura "cách 2" (Hưng 2026-10-21,
 *   artboard `Credits`): nút "i" RẤT NHỎ ngay sau dòng giờ UTC cuối bảng phải (`CreditInfo`), bấm ⇒ hộp nhỏ ba
 *   dòng. Dòng "Địa danh: GeoNames" còn nằm ở cuối danh sách gợi ý nơi sinh (`PlaceSearch`). Màn chào KHÔNG có
 *   khối này (Hưng 2026-10-21, mục B11 — theo artboard).
 *   AGPL §13: "prominently offer" chỗ lấy mã nguồn ⇒ nhãn GHI RÕ "AGPL-3.0" và trỏ thẳng tới repo.
 *   Đừng bỏ khối này khỏi chỗ nào mà không thay bằng chỗ khác cũng mở được từ màn đó — e2e-public kiểm.
 */
export function AboutCredits({ testId }: { testId: string }): JSX.Element {
  const { t } = useLanguage();
  return (
    /* Artboard `Credits` (cách 2): dòng đầu 13px/600 mực, hai dòng sau 12px chữ phụ, cách nhau 8px. */
    <div className="space-y-2 text-xs leading-normal text-ink-2" data-testid={testId}>
      <p className="text-ui font-semibold text-ink">{t('credit.free')}</p>
      <p>
        {t('credit.license')} <a href={SOURCE} target="_blank" rel="noopener noreferrer"
                                 className="text-ink underline" data-testid={`${testId}-source`}>AGPL-3.0</a>
      </p>
      <p>
        {t('credit.places')}: <a href={GEONAMES} target="_blank" rel="noopener noreferrer"
                                 className="text-ink underline">GeoNames</a> (CC-BY 4.0)
      </p>
    </div>
  );
}

/**
 * Nút "i" 11px (artboard `Credits`, cách 2): viền 0.75px `line-strong`, chữ i nghiêng Newsreader 8px màu
 * `faint`. Hưng chốt: cố ý khó thấy, KHÔNG nới vùng bấm, không theo WCAG cho nút này — `ui.spec` có ngoại lệ
 * cho ĐÚNG `data-testid="credit-info"`. Nghiêng TỔNG HỢP (không tải tệp Newsreader nghiêng).
 * Hộp neo vào khối cha gần nhất có `relative` (dòng UTC ở `ChartFacts`), không vào nút — `wrapClassName="contents"`.
 */
export function CreditInfo(): JSX.Element {
  const { t } = useLanguage();
  return (
    <Popover testId="credit-info" ariaLabel={t('credit.info')} align="start" above hasPopup="dialog" wrapClassName="contents"
             buttonClassName="credit-i" panelClassName="w-[15.625rem] max-w-full" label="i"
             panelSkin="rounded-2xl px-4 py-3.5 shadow-[0_20px_40px_-24px_color-mix(in_srgb,var(--color-ink)_45%,transparent)]">
      <AboutCredits testId="credit" />
    </Popover>
  );
}
