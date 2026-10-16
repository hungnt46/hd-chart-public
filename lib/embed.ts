/**
 * Chế độ NHÚNG của bản công khai — STATUS §4 Đợt 9 · P7c, kế hoạch §5.2.
 *
 * `https://chart.humandesign.vn/?embed=1` được website nhúng bằng iframe. Trang con nói
 * chuyện với trang cha qua `postMessage`; tài liệu giao thức ở `docs/CHART-INTEGRATION.md`.
 * Tệp này THUẦN (không DOM) để unit test; phần chạm DOM ở `components/embed/EmbedBridge.tsx`.
 *
 * ★ Chỉ có hiệu lực khi `PUBLIC_EDITION`: bản đầy đủ bỏ qua `?embed=1` hoàn toàn.
 * ★ Chỉ gửi tới / nhận từ origin nằm trong `EMBED_PARENTS`. KHÔNG BAO GIỜ `targetOrigin: '*'`.
 */

/** Khoá chung của mọi thông điệp — trang cha lọc theo `source` rồi mới xét `type`. */
export const EMBED_CHILD = 'hd-chart';
export const EMBED_HOST = 'hd-chart-host';
export const EMBED_VERSION = 1;

/**
 * Origin được phép làm trang cha. `https://*.x` khớp mọi tên con của x (một hoặc nhiều
 * cấp), KHÔNG khớp chính `x`. PHẢI trùng `frame-ancestors` trong `deploy/public/_headers`
 * (test `lib/__tests__/embed.spec.ts` kiểm). Đặt lúc build bằng `NEXT_PUBLIC_HD_EMBED_PARENTS`
 * (cách nhau bằng khoảng trắng hoặc dấu phẩy).
 * Staging (chốt 2026-10-13): subdomain workers.dev của TÀI KHOẢN Cloudflare của Hưng là `hungnguyen-iu10` ⇒
 * website chạy ở `humandesign-site.hungnguyen-iu10.workers.dev`, URL xem trước `<id>-humandesign-site.…`.
 * CSP chỉ cho `*.` ở nhãn trái cùng nên mở cả `*.hungnguyen-iu10.workers.dev` — chỉ tài khoản của Hưng
 * tạo được worker dưới tên đó. Mẫu tạm cũ `*.humandesign-site.workers.dev` SAI dạng tên workers.dev.
 */
export const DEFAULT_EMBED_PARENTS = ['https://humandesign.vn', 'https://*.hungnguyen-iu10.workers.dev'] as const;

export function embedParents(raw: string | undefined = process.env.NEXT_PUBLIC_HD_EMBED_PARENTS): string[] {
  const list = (raw ?? '').split(/[\s,]+/).filter(Boolean);
  return list.length > 0 ? list : [...DEFAULT_EMBED_PARENTS];
}

/** `origin` (dạng `scheme://host[:port]`) có khớp một mẫu trong `allowed` không. */
export function originAllowed(origin: string | null | undefined, allowed: readonly string[]): boolean {
  if (!origin) return false;
  let o: URL;
  try { o = new URL(origin); } catch { return false; }
  // Chỉ nhận origin "sạch": không đường dẫn, không userinfo — chống `https://humandesign.vn@evil`.
  if (o.origin !== origin || o.username || o.password) return false;
  return allowed.some(pat => {
    const star = pat.indexOf('*.');
    if (star < 0) return pat === origin;
    const scheme = pat.slice(0, star);                // "https://"
    const suffix = pat.slice(star + 1);               // ".hungnguyen-iu10.workers.dev"
    return origin.startsWith(scheme) && origin.endsWith(suffix) && origin.length > scheme.length + suffix.length
      && !origin.slice(scheme.length, origin.length - suffix.length).includes('/');
  });
}

/** `?embed=1` (hoặc `embed=true`). Chỉ bản công khai mới nhúng được. */
export function wantsEmbed(search: string, publicEdition: boolean): boolean {
  if (!publicEdition) return false;
  const v = new URLSearchParams(search).get('embed');
  return v === '1' || v === 'true';
}

/**
 * Origin của trang cha: `location.ancestorOrigins[0]` (Chromium, Safari) rồi đến origin của
 * `document.referrer` (Firefox; cần trang cha không đặt `Referrer-Policy: no-referrer`).
 * Trả `null` nếu không xác định hoặc không nằm trong danh sách ⇒ KHÔNG gửi gì.
 */
export function resolveParentOrigin(
  ancestors: readonly string[] | undefined, referrer: string, allowed: readonly string[],
): string | null {
  const cands: string[] = [];
  if (ancestors && ancestors.length > 0) cands.push(ancestors[0]!);
  if (referrer) { try { cands.push(new URL(referrer).origin); } catch { /* bỏ */ } }
  return cands.find(c => originAllowed(c, allowed)) ?? null;
}

/* ── Thông điệp ─────────────────────────────────────────────────────────── */

export type ChildMessage =
  | { source: typeof EMBED_CHILD; v: 1; type: 'ready' }
  | { source: typeof EMBED_CHILD; v: 1; type: 'height'; height: number }
  /** Ô nhập vừa nhận focus: `top`/`bottom` tính bằng px từ ĐỈNH iframe — để trang cha cuộn khỏi bàn phím. */
  | { source: typeof EMBED_CHILD; v: 1; type: 'focus'; top: number; bottom: number };

/**
 * `height`: chiều cao vùng nhìn thấy của trang cha (`innerHeight`).
 * `top` (tuỳ chọn): bao nhiêu px của iframe đã cuộn KHUẤT phía trên vùng nhìn thấy
 * (`max(0, -iframe.getBoundingClientRect().top)`). Có nó thì hộp thoại / bảng trượt hiện đúng chỗ người
 * dùng đang nhìn; thiếu thì chúng bám đỉnh iframe.
 */
export interface ViewportMessage { source: typeof EMBED_HOST; v: 1; type: 'viewport'; height: number; top: number }

export const childMessage = {
  ready: (): ChildMessage => ({ source: EMBED_CHILD, v: EMBED_VERSION, type: 'ready' }),
  height: (height: number): ChildMessage => ({ source: EMBED_CHILD, v: EMBED_VERSION, type: 'height', height: Math.ceil(height) }),
  focus: (top: number, bottom: number): ChildMessage =>
    ({ source: EMBED_CHILD, v: EMBED_VERSION, type: 'focus', top: Math.round(top), bottom: Math.round(bottom) }),
};

/** Đọc thông điệp từ trang cha; sai hình dạng ⇒ `null`. Cận để chiều cao vớ vẩn không phá bố cục. */
export const VIEWPORT_MIN = 480;
export const VIEWPORT_MAX = 4000;
export function parseViewport(data: unknown): ViewportMessage | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.source !== EMBED_HOST || d.v !== EMBED_VERSION || d.type !== 'viewport') return null;
  if (typeof d.height !== 'number' || !Number.isFinite(d.height)) return null;
  if (d.top !== undefined && (typeof d.top !== 'number' || !Number.isFinite(d.top))) return null;
  const top = typeof d.top === 'number' ? Math.max(0, Math.round(d.top)) : 0;
  return { source: EMBED_HOST, v: 1, type: 'viewport', height: Math.min(VIEWPORT_MAX, Math.max(VIEWPORT_MIN, Math.round(d.height))), top };
}

/** Chiều cao "màn hình" khi chưa nghe được trang cha — khung biểu đồ cao theo đây thay vì `100dvh`. */
export const DEFAULT_EMBED_VIEWPORT_PX = 900;
