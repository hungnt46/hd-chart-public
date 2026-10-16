/*
 * Service worker — STATUS §4 G1: app mở được khi MẤT MẠNG từ đầu.
 *
 * Viết tay, không thư viện (next-pwa…): cần đúng ba luật dưới đây, và mỗi luật
 * có lý do riêng của dự án.
 *
 * 1. TRANG (điều hướng): mạng trước, mất mạng thì lấy bản đã lưu. Có mạng thì
 *    luôn nhận bản mới — không bao giờ kẹt ở bản cũ sau khi triển khai.
 * 2. `/_next/static/…` (mã đã băm tên), `/ephe/…`, `/wasm/…`, `/data/places-…`:
 *    CACHE TRƯỚC. Tên tệp đổi khi nội dung đổi (xem `next.config.mjs`,
 *    `gen:places`), nên bản đã lưu không bao giờ sai.
 * 3. ★ KHÔNG tải trước ephemeris lúc cài. Luật cũ khoá ở `e2e/ui.spec.ts`:
 *    "mở trang KHÔNG kéo theo ephemeris" (2.4 MB — vài giây trên 4G). Ephemeris
 *    chỉ vào cache khi app nạp nó thật, tức lúc tính chart đầu tiên. Hệ quả có ý
 *    thức: phải tính ÍT NHẤT một chart khi có mạng thì offline mới tính được.
 *
 * Bộ khung trang (HTML + các tệp mã nó dẫn tới) được lưu lúc cài và mỗi lần
 * có mạng mà nhận về một BẢN DỰNG MỚI (đổi `buildId`) thì lưu lại, bỏ bản cũ.
 */
const SHELL = 'hd-shell';          // trang + mã của bản dựng hiện hành
const ASSETS = 'hd-assets';        // ephemeris, wasm, dữ liệu địa danh — bất biến theo tên

const IMMUTABLE = /^\/(_next\/static\/|ephe\/|wasm\/|data\/places-)/;
const BUILD_ID = /\/_next\/static\/([^/"']+)\/_(?:buildManifest|ssgManifest)\.js/;
const SHELL_URLS = /\/_next\/static\/[^"'\s)]+/g;

/** Lưu trang + mọi tệp `/_next/static/…` nó dẫn tới; bỏ bản dựng cũ. */
async function storeShell(html) {
  const cache = await caches.open(SHELL);
  const urls = [...new Set(html.match(SHELL_URLS) ?? [])];
  await Promise.all(urls.map(u => cache.add(u).catch(() => undefined)));
  await cache.put('/', new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
  const id = BUILD_ID.exec(html)?.[1];
  if (id) await cache.put('/__build-id', new Response(id));
  // bỏ mã của bản dựng cũ: mọi `/_next/static/` không còn được trang mới dẫn tới
  const keep = new Set(urls.map(u => new URL(u, self.location.origin).href));
  for (const req of await cache.keys()) {
    const p = new URL(req.url).pathname;
    if (p.startsWith('/_next/static/') && !keep.has(req.url)) await cache.delete(req);
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const res = await fetch('/', { cache: 'no-store' });
    if (res.ok) await storeShell(await res.text());
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== SHELL && k !== ASSETS) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok && url.pathname === '/') {
          const html = await res.clone().text();
          const shell = await caches.open(SHELL);
          const cur = await shell.match('/__build-id');
          const id = BUILD_ID.exec(html)?.[1];
          if (!cur || (id && (await cur.text()) !== id)) event.waitUntil(storeShell(html));
        }
        return res;
      } catch {
        return (await caches.match('/', { cacheName: SHELL })) ?? Response.error();
      }
    })());
    return;
  }

  if (IMMUTABLE.test(url.pathname)) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) {
        const name = url.pathname.startsWith('/_next/') ? SHELL : ASSETS;
        // clone NGAY, trước khi trả cho trang: trang đọc xong thân thì clone ném lỗi
        const copy = res.clone();
        event.waitUntil(caches.open(name).then(c => c.put(req, copy)));
      }
      return res;
    })());
  }
});
