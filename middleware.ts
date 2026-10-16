/**
 * Cổng mật khẩu — chỉ BẬT khi đặt cả `HD_AUTH_USER` và `HD_AUTH_PASSWORD`
 * (STATUS §4 G3). Không đặt thì app chạy như cũ: máy nhà, CI, e2e không đổi.
 *
 * Chạy ở runtime Node (không phải Edge) để dùng `node:crypto` so thời gian hằng
 * và đọc biến môi trường LÚC CHẠY — đổi mật khẩu chỉ cần khởi động lại, không
 * phải dựng lại.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { checkBasicAuth, PUBLIC_PATHS } from './lib/auth/basic-auth';

export function middleware(req: NextRequest): NextResponse {
  const user = process.env.HD_AUTH_USER, pass = process.env.HD_AUTH_PASSWORD;
  if (!user || !pass) return NextResponse.next();
  if (PUBLIC_PATHS.some(re => re.test(req.nextUrl.pathname))) return NextResponse.next();
  if (checkBasicAuth(req.headers.get('authorization'), user, pass)) return NextResponse.next();
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="HD Web App", charset="UTF-8"' },
  });
}

export const config = { runtime: 'nodejs', matcher: '/:path*' };
