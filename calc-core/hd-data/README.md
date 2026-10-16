# calc-core/hd-data — bảng cấu trúc Human Design

Hai loại file, **nguồn gốc khác nhau, độ tin cậy khác nhau**:

## A. Rút tự động từ bảng chuỗi tham chiếu — CONFIRMED (dữ kiện)

Sinh bởi `npm run gen:hd-data`, đọc bảng chuỗi tham chiếu (ghi chép nội bộ, chỉ đọc).

| File | Nội dung | Bảng nguồn |
|---|---|---|
| `channels.json` | 36 kênh + cặp cổng | bảng Channels |
| `crosses.json` | 192 incarnation cross + bộ 4 cổng + góc | bảng Crosses |
| `planets.json` | 14 thiên thể theo đúng thứ tự chuẩn | bảng Planets |
| `centers.json` | 9 trung tâm theo đúng thứ tự chuẩn | bảng Centers |
| `profiles.json` | 12 mã profile hợp lệ (`lineP*10+lineD`) | bảng Profiles |

Chỉ chứa **dữ kiện cấu trúc**. Văn bản diễn giải (keynote) **không** nằm ở đây —
xem SPEC.md §3.2, nó thuộc `i18n/hd-content/`.

## B. Viết tay từ kiến thức HD công khai — STRONG INFERENCE

| File | Vì sao không rút được |
|---|---|
| `gate-center.json` | Map cổng→trung tâm **không có** trong bảng chuỗi tham chiếu |
| `channel-circuits.json` | Mạch / nhóm mạch / loại kênh của 36 kênh. Bảng tham chiếu chỉ có enum `CircuitGroup`, không có chuỗi. Nguồn: sách Ra *Channels by Type 1–4*, đối chiếu bảng Planetary Influence của một ứng dụng tham chiếu (mạch 36/36; loại 35/36 — lệch 42-53 ghi trong tệp) |

`gate-center.json` là bảng cấu trúc **duy nhất** trong calc-core chưa có bằng chứng từ bảng tham chiếu.
Nó được ràng buộc bởi bốn bất biến kiểm tự động (`__tests__/hd-data.spec.ts`), trong đó
mạnh nhất là: **hai cổng của mỗi kênh trong 36 kênh phải thuộc hai trung tâm khác nhau**.
Ràng buộc này một mình đã loại gần hết mọi cách gán sai. Dù vậy nó vẫn là
STRONG INFERENCE cho tới khi golden charts xác nhận — SPEC.md §11 U3.

## Tái sinh

```bash
npm run gen:hd-data    # chỉ ảnh hưởng nhóm A; gate-center.json viết tay, không bị ghi đè
npm run test           # bất biến phải xanh
```
