/**
 * ★ Bản CÔNG KHAI (`NEXT_PUBLIC_HD_EDITION=public`, STATUS §4 Đợt 9 · P7a): xuất
 * TĨNH ra `out/` cho host tĩnh (Cloudflare). Không đặt biến ⇒ cấu hình y như cũ.
 * Xuất tĩnh bỏ qua middleware (bản công khai không cần mật khẩu) và `headers()`
 * (Next chỉ cảnh báo, không áp) — header cache của bản này phải đi bằng tệp
 * `_headers` của host, nên ở đây không khai `headers` để khỏi tưởng là có.
 */
const PUBLIC_EDITION = process.env.NEXT_PUBLIC_HD_EDITION === 'public';

/** @type {import('next').NextConfig} */
export default {
  ...(PUBLIC_EDITION ? { output: 'export' } : {}),

  // @swisseph/node là native addon — không bundle vào server build
  serverExternalPackages: ['@swisseph/node'],

  // Không quảng cáo `X-Powered-By: Next.js` — app riêng tư, khỏi lộ nền tảng.
  poweredByHeader: false,

  // ★ Lint KHÔNG chạy trong `next build`. Không phải để né, mà vì cổng lint thật
  //   là `npm run lint` và nó MẠNH HƠN: flat config có luật theo kiểu
  //   (typescript-eslint strictTypeChecked), luật Next, luật React Hooks, và
  //   luật riêng chặn calc-core mất tính thuần. Next 15 chưa dò được plugin của
  //   nó trong flat config nên bước lint lúc build vừa in cảnh báo sai vừa chạy
  //   lại phần đã kiểm. Cổng CI phải gọi `npm run lint` tường minh.
  eslint: { ignoreDuringBuilds: true },

  /**
   * ★ Cache dài hạn cho tài sản BẤT BIẾN (2026-09-21).
   *
   * Đo được: mỗi lần tính chart, trình duyệt kéo về **2.4 MB** —
   *   `semo_18.se1` 1.27 MB · `sepl_18.se1` 473 KB · `seas_18.se1` 218 KB · `swisseph.wasm` 402 KB
   * Next phục vụ `/public` với `Cache-Control: public, max-age=0`, nghĩa là LẦN
   * NÀO CŨNG phải hỏi lại máy chủ. Trên 4G đó là vài giây mỗi lượt truy cập.
   *
   * Các file này bất biến thật: `.se1` gắn với kỷ nguyên cố định (hậu tố `_18`
   * = 1800–2400) và `.wasm` là binary đã biên dịch. Chúng chỉ đổi khi ta CỐ Ý
   * thay.
   *
   * ⚠️ Vì đặt `immutable` một năm, nếu sau này thay file thì phải ĐỔI TÊN
   *    (ví dụ `semo_18.v2.se1`), không được ghi đè — nếu không trình duyệt cũ
   *    sẽ giữ bản cũ tới một năm.
   */
  headers: PUBLIC_EDITION ? undefined : async () => {
    const immutable = [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }];
    return [
      { source: '/ephe/:path*', headers: immutable },
      { source: '/wasm/:path*', headers: immutable },
      // Dữ liệu địa danh: tên tệp mang ngày sinh (`gen:places`), dữ liệu mới = tệp mới.
      { source: '/data/:path*', headers: immutable },
      // ★ Service worker thì NGƯỢC LẠI: tên cố định, nên KHÔNG được cache — trình
      //   duyệt phải thấy bản mới ngay, nếu không bản SW cũ giữ app mãi (G1).
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
    ];
  },

  // calc-core dùng đuôi `.js` trong import (chuẩn ESM cho Node + vitest).
  // Resolver của Next cần được dạy ánh xạ `.js` → `.ts`.
  webpack(config, { webpack }) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
    };

    /**
     * ★ GỠ HẲN nội dung có bản quyền khỏi gói phát hành (SPEC §3.2).
     *
     * ⚠️ BẪY ĐÃ MẮC THẬT — 2026-09-22. Ban đầu cờ chỉ được kiểm LÚC CHẠY trong
     * `isContentBundled()`. Dựng với cờ tắt thì màn hình hiện placeholder đúng
     * như mong đợi, nhưng `grep "Creation is independent" .next/static` VẪN RA:
     * import JSON là tĩnh nên bundler không cắt được nhánh chết. Nghĩa là bản
     * "đã tắt nội dung" vẫn PHÁT TÁN toàn bộ văn bản của Jovian Archive —
     * đúng thứ mà cờ này sinh ra để tránh.
     *
     * Cách chữa: dồn toàn bộ import JSON vào `i18n/hd-content/bank.ts` rồi thay
     * NGUYÊN module đó bằng `bank-empty.ts` lúc dựng. e2e `details.spec.ts` tải
     * lại mọi chunk và khẳng định không còn chuỗi nào lọt.
     */
    if (process.env.NEXT_PUBLIC_HD_CONTENT_BUNDLED === 'false') {
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(
        /^\.\/bank\.js$/,
        (r) => {
          if (r.context.replace(/\\/g, '/').endsWith('i18n/hd-content')) {
            r.request = './bank-empty.js';
          }
        },
      ));
    }
    /**
     * ★ Bản công khai: Classic KHÔNG nền (STATUS §5 #66). `hdkit.json` mang đường nét nền tam giác + bóng người
     *   mượn từ một widget tham chiếu (không có giấy phép phân phối) — thay NGUYÊN tệp bằng `hdkit.public.json` (cùng hình học, cùng `viewBox`, bỏ nền) để
     *   đường nét đó không vào gói phát hành. Ẩn bằng cờ lúc chạy là KHÔNG đủ — cùng bẫy với nội dung ở trên.
     *   e2e `e2e-public/public.spec.ts` quét `out/` tìm đường nét nền đó.
     *   Modern cũng thế từ STATUS §5 #89 (`alternate.public.json`, bỏ bóng người — vì bố cục cột điện thoại).
     */
    if (PUBLIC_EDITION) {
      /* Bộ đọc tệp `.mmi` — bản công khai không nhập tệp (nút ẩn) ⇒ thay bằng bản rỗng cùng chữ ký, để bộ đọc
         thật không vào gói phát hành lẫn repo mã nguồn công khai (STATUS §5 #77). */
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(
        /mmi-import\.js$/,
        (r) => { r.request = r.request.replace(/mmi-import\.js$/, 'mmi-import.public.ts'); },
      ));
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(
        /^\.\/(hdkit|alternate)\.json$/,
        (r) => {
          if (r.context.replace(/\\/g, '/').endsWith('components/bodygraph/artworks')) {
            r.request = r.request.replace(/\.json$/, '.public.json');
          }
        },
      ));
    }
    return config;
  },
  turbopack: {
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
  },
};
