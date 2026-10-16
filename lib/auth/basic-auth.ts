/**
 * Cổng mật khẩu HTTP Basic cho host riêng — STATUS §4 G3 (Hưng: VPS Linux).
 * Thuần: nhận header + cặp tên/mật khẩu mong đợi, trả đúng/sai. `middleware.ts`
 * gọi hàm này; test gọi thẳng, không cần server.
 *
 * So sánh THỜI GIAN HẰNG trên băm SHA-256 của hai phía: so chuỗi thường dừng
 * ở ký tự sai đầu tiên, đo thời gian trả lời là dò được mật khẩu từng ký tự.
 * Băm trước để hai đầu vào luôn cùng độ dài (`timingSafeEqual` đòi vậy).
 */
import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (s: string) => createHash('sha256').update(s, 'utf8').digest();

export function checkBasicAuth(header: string | null, user: string, pass: string): boolean {
  if (!header?.startsWith('Basic ')) return false;
  let decoded: string;
  try { decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8'); } catch { return false; }
  const i = decoded.indexOf(':');
  if (i < 0) return false;
  // Cả hai phép so đều chạy, không dừng sớm khi tên sai — không để lộ tên nào đúng.
  const okUser = timingSafeEqual(digest(decoded.slice(0, i)), digest(user));
  const okPass = timingSafeEqual(digest(decoded.slice(i + 1)), digest(pass));
  return okUser && okPass;
}

/**
 * Đường không cần mật khẩu: manifest + biểu tượng. Chrome tải manifest KHÔNG kèm
 * thông tin đăng nhập, bị 401 là mất nút "Cài ứng dụng" (G1). Hai thứ này
 * không chứa gì riêng tư.
 */
export const PUBLIC_PATHS: readonly RegExp[] = [/^\/manifest\.webmanifest$/, /^\/icons\//];
