'use client';
/**
 * Đang ở chế độ NHÚNG không (`html[data-embed]`, do tập lệnh đầu trang / `EmbedBridge` gắn — chỉ bản công khai).
 * Chỉ dùng cho chỗ phải ĐỔI CẤU TRÚC (thanh đáy điện thoại thành hàng tab trong luồng); đổi kiểu thì dùng
 * biến thể CSS `embed:` — nó áp ngay từ HTML dựng sẵn, không chờ React.
 */
import { useEffect, useState } from 'react';
import { PUBLIC_EDITION } from '../../lib/edition';

export function useEmbed(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => { if (PUBLIC_EDITION) setOn(document.documentElement.dataset.embed === '1'); }, []);
  return on;
}
