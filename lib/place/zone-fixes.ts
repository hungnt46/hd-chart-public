/**
 * Sửa múi giờ GeoNames gán cho địa danh — chỉ những ca đã ĐO được là sai.
 *
 * ★ Việt Nam: tzdb tách hai vùng theo lịch sử chia cắt 1954–1975.
 *   `Asia/Ho_Chi_Minh` = "Vietnam (south)", tức Việt Nam Cộng hoà; miền Bắc là
 *   `Asia/Hanoi` (tệp `backzone` của tzdb — ICU không mang, app tự thêm ở
 *   `lib/time/zones.ts`). Trước 2026-09-24 miền Bắc gán `Asia/Bangkok`: tzdb nói
 *   rõ vùng đó chỉ đúng TỪ 1970, trước đó lệch 1–2 giờ (1943–45, 1947–54). Hai vùng CHO GIỜ KHÁC NHAU ở 1943–45, 1947–55
 *   và 1960-01 → 1975-06 — riêng giai đoạn sau: miền Nam UTC+8, miền Bắc UTC+7.
 *   Sinh ở Huế năm 1970 mà chọn nhầm vùng là lệch MỘT GIỜ.
 *
 *   GeoNames gán vùng theo TỈNH hiện nay, không theo vĩ tuyến 17: đo trên
 *   `cities1000` (2026-09-23) có 83 địa danh phía Bắc bị gán `Ho_Chi_Minh` (Hà
 *   Tĩnh…) và 15 địa danh phía Nam bị gán `Bangkok` (cả thành phố Huế, 16.46°B).
 *   Ở đây gán lại theo ranh giới thật: sông Bến Hải ≈ 17.0°B.
 *
 *   Giới hạn đã biết: sông không chạy đúng theo vĩ tuyến, vài làng Quảng Trị sát
 *   bờ sông có thể rơi nhầm phía. Người dùng vẫn luôn tự chọn lại múi giờ được.
 */
export const VN_DMZ_LATITUDE = 17.0;

export function fixZone(countryCode: string, latitude: number, zone: string): string {
  if (countryCode === 'VN') return latitude >= VN_DMZ_LATITUDE ? 'Asia/Hanoi' : 'Asia/Ho_Chi_Minh';
  return zone;
}
