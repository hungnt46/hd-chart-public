# NOTICE — giấy phép và nguồn của bên thứ ba

Mã nguồn tương ứng của bản công khai chart.humandesign.vn, phát hành theo **GNU Affero General Public License
v3.0 hoặc mới hơn** (`LICENSE`).

## Swiss Ephemeris — AGPL-3.0

Vị trí hành tinh tính bằng **Swiss Ephemeris** (© Astrodienst AG) qua thư viện `@swisseph/browser`
(nhóm `swisseph-js`), cả hai phát hành theo AGPL-3.0. Tệp dữ liệu `.se1` chính thức tự host ở `public/ephe/`,
`swisseph.wasm` ở `public/wasm/`; ghi chú bản quyền trong các tệp đó giữ nguyên.

## Dữ liệu địa danh GeoNames — CC-BY 4.0

Ô tra nơi sinh dùng dữ liệu **GeoNames** (https://www.geonames.org/) — `cities1000`, `admin1CodesASCII`,
`countryInfo` — theo **Creative Commons Attribution 4.0**. Bản rút gọn: `public/data/places-<ngày>.tsv`, sinh bằng
`npm run gen:places` (`lib/place/generate-places.ts`). **Đã sửa:** múi giờ của địa danh Việt Nam gán lại theo
vĩ tuyến 17 (`lib/place/zone-fixes.ts`). Ghi công hiện trong mục "Thông tin" của app.

## hdkit — MIT

| Dùng ở đâu | Nguồn |
|---|---|
| Hình học bodygraph chủ đề Classic (`components/bodygraph/artworks/hdkit.json`, bản không nền) | hdkit — `bodygraph-blank.svg` |
| Hình học bodygraph chủ đề Modern (`components/bodygraph/artworks/alternate.json`) | tệp mẫu `bodygraph-alternate.svg` đi kèm hdkit |
| Bảng exalted/detriment (`calc-core/hd-data/fixings.json`) | hdkit — `constants.js` |

MIT License — Copyright (c) 2023 Jonah Dempcy.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Không có trong repo này

- Văn bản diễn giải Human Design (keynote cổng, kênh, hào) — tác phẩm có bản quyền của Jovian Archive. Bản công
  khai dựng với cờ `NEXT_PUBLIC_HD_CONTENT_BUNDLED=false`; `i18n/hd-content/bank.ts` là kho rỗng.
- Tên cổng, kênh, trung tâm, Incarnation Cross là dữ kiện của hệ Human Design; thuật ngữ tiếng Việt
  (`i18n/hd-terms/`, `i18n/hd-names/vi.json`) là bản dịch của chủ dự án.

Các gói npm khác: theo giấy phép ghi trong `package-lock.json` / `node_modules/<gói>/LICENSE`.
