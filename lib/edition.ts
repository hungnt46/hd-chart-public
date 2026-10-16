/**
 * Phiên bản dựng — STATUS §4 Đợt 9 · P7b, §5 #55–61.
 *
 * `NEXT_PUBLIC_HD_EDITION=public` (lệnh `npm run build:public`) dựng BẢN CÔNG KHAI
 * cho chart.humandesign.vn: xuất tĩnh, không service worker, ẨN xuất/nhập (ảnh,
 * `.mmi`, gói kho), chu kỳ, bảng "Tra cứu chi tiết", Illustrator; diễn giải tắt
 * bằng cờ nội dung riêng. Không đặt biến ⇒ bản đầy đủ, hành vi y cũ.
 *
 * Next THAY biến `NEXT_PUBLIC_*` bằng hằng lúc dựng ⇒ nhánh bị ẩn rơi khỏi bundle.
 * Tên/mã giữ nguyên ở bản công khai — chỉ KHÔNG dựng phần bị ẩn; e2e
 * `e2e-public/` khoá điều đó.
 */
export const PUBLIC_EDITION = process.env.NEXT_PUBLIC_HD_EDITION === 'public';
