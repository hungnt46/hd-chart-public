# hd-chart-public

Mã nguồn của **bản công khai** công cụ lập biểu đồ Human Design tại chart.humandesign.vn.

Phát hành theo **GNU Affero General Public License v3.0** (`LICENSE`) — vì app tính vị trí hành tinh bằng
**Swiss Ephemeris** (Astrodienst AG) qua `@swisseph/browser`, cả hai đều phát hành theo AGPL-3.0.

Repo này được XUẤT tự động từ repo phát triển; mỗi lần đồng bộ ứng với một commit ghi trong `SOURCE_COMMIT`.
Đây là mã nguồn tương ứng của bản đang chạy — không nhận pull request trực tiếp.

## Dựng

```sh
npm ci
npm run build:public   # xuất tĩnh ra out/
```

Node 22. `out/` là trang tĩnh, phục vụ được bằng mọi host tĩnh (bản chính thức chạy trên Cloudflare Workers,
`wrangler.jsonc`).

## Những gì KHÔNG có ở đây

- Văn bản diễn giải Human Design (keynote cổng, kênh, hào…) — tác phẩm có bản quyền của Jovian Archive. Bản
  công khai dựng với cờ `NEXT_PUBLIC_HD_CONTENT_BUNDLED=false`; `i18n/hd-content/bank.ts` ở đây là kho rỗng.
- Bộ kiểm thử và dữ liệu đối chiếu (chart thử, số đo từ phần mềm khác) của repo phát triển.

## Giấy phép và nguồn của bên thứ ba

Xem `NOTICE.md`: Swiss Ephemeris (AGPL-3.0), dữ liệu địa danh GeoNames (CC-BY 4.0)
