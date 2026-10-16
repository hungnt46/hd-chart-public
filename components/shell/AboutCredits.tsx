import type { JSX } from 'react';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';

/**
 * ★ Khối "Thông tin" — ghi công GeoNames (CC-BY 4.0) + liên kết mã nguồn (AGPL-3.0). CHỈ bản công khai.
 *
 *   Trước 2026-10-15 là một dòng ở CHÂN TRANG (STATUS §5 #61, #65). Hưng muốn bỏ khỏi chân trang ⇒ chuyển vào
 *   menu (STATUS §5 #69). Để vẫn đạt nghĩa vụ, khối này phải mở được từ MỌI màn hình:
 *     · menu ⚙ trên thanh trên (máy tính, và điện thoại ở màn chào);
 *     · bảng ⋯ và bảng "Thêm" của thanh đáy (điện thoại đã có chart).
 *   AGPL §13: "prominently offer" chỗ lấy mã nguồn tương ứng ⇒ nhãn GHI RÕ "Mã nguồn (AGPL-3.0)", không giấu
 *   sau một tên chung chung. CC-BY 4.0 §3(a): ghi nguồn "hợp lý theo phương tiện", được dùng liên kết.
 *   Đừng bỏ khối này khỏi chỗ nào mà không thay bằng chỗ khác cũng mở được từ màn đó — e2e-public kiểm từng khổ.
 *
 *   Ba chỗ cùng nằm sẵn trong DOM (bảng ẩn vẫn dựng) ⇒ `testId` riêng từng chỗ.
 */
export function AboutCredits({ testId }: { testId: string }): JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="text-xs text-ink-2" data-testid={testId}>
      <p className="hint mb-1">{t('about.group')}</p>
      <p>
        {t('credit.places')}: <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer"
                                 className="underline">GeoNames</a> (CC-BY 4.0)
      </p>
      <p className="mt-0.5">
        <a href="https://github.com/hungnt46/hd-chart-public" target="_blank" rel="noopener noreferrer"
           className="underline" data-testid={`${testId}-source`}>{t('credit.source')}</a> (AGPL-3.0)
      </p>
    </div>
  );
}
