# lib/storage — kho chart

SPEC §10.4. Mọi UI chỉ nói chuyện qua `ChartRepository`.

## Nguyên tắc: lưu ĐẦU VÀO, không lưu KẾT QUẢ

Chart là hàm thuần của `jdUT`. Kho giữ **tham số sinh**; mở một chart nghĩa là
**tính lại**. Lưu kết quả đã tính nghĩa là tạo một bản sao có thể lệch khỏi
engine — sửa một lỗi trong `calc-core` thì mọi chart đã lưu vẫn mang kết quả cũ
cho tới khi ai đó nghĩ ra việc tính lại.

Phần mềm tham chiếu rút ra đúng kết luận này (ghi chép nội bộ):
*"charts are recomputed from birth data, not stored as objects"*. Khác biệt duy
nhất: DB của họ còn cache thêm `TypeId/ProfileId/AuthorityId…` để liệt kê khỏi
phải tính lại. Ta chưa cần — vài trăm chart tính lại hết cũng chỉ vài giây, và
một cache sai đồng bộ còn tệ hơn không có.

## File

| file | vai trò |
|---|---|
| `types.ts` | `BirthRecord`, `SavedChart`, `SavedIllustration`, `Folder`, `ChartBundle` |
| `repository.ts` | giao diện + `StorageError` |
| `memory.ts` | hiện thực trong bộ nhớ (test, và dự phòng khi không có IndexedDB) |
| `indexeddb.ts` | hiện thực thật + `openChartRepository()` tự lùi về bộ nhớ |
| `codec.ts` | đọc/ghi gói xuất-nhập, kiểm dữ liệu ngoài |
| `reopen.ts` | dựng lại `(utcDate, form, UTResolution)` từ một `BirthRecord` |

## Bản vẽ Illustrator — loại bản ghi thứ hai

`SavedIllustration` (store `illustrations`, IndexedDB version 2; gói xuất/nhập
version 2, vẫn đọc gói 1). Không phá luật trên: bản vẽ là dữ liệu người dùng TỰ
NHẬP, không phải kết quả tính, nên không có gì để lệch khỏi engine. `state` là
dạng JSON của `lib/illustrator/model.ts`; `codec.ts` kiểm nó bằng chính
`fromJson` của mô hình, không viết bộ kiểm thứ hai.

## `utIso` — trường duy nhất ảnh hưởng kết quả

Mọi trường khác chỉ để hiển thị. Vì vậy `codec.ts` kiểm nó gắt tay: bắt buộc ISO
8601 UTC kết thúc bằng `Z`. Chuỗi `1985-06-15T12:00:00` (không `Z`) bị **từ chối**
chứ không đoán là giờ địa phương — đoán sai ở đây thì chart nhập về sai trong im
lặng, không ai biết.

`reopen.ts` còn có một luật nữa: **giờ UT đã lưu là nguồn sự thật**. tzdb được vá
vài lần mỗi năm; một bản vá đổi quy tắc DST của quá khứ sẽ làm chart đã lưu "tự
đổi" dưới chân người dùng. Ta vẫn tra lại tzdb, nhưng chỉ để ĐỐI CHIẾU, và nếu
lệch thì giữ giờ cũ rồi nói ra bằng một ghi chú.

## Test

`__tests__/contract.spec.ts` chạy **cùng một bộ** cho **cả hai** hiện thực —
bản bộ nhớ dễ đúng, bản IndexedDB mới là chỗ sai (giao dịch, thứ tự bất đồng bộ).
Hai bộ test riêng thì bản khó sẽ được kiểm nhẹ tay hơn.

`__tests__/roundtrip.spec.ts` là tiêu chí đóng Phase 4: xuất → xoá sạch → nhập →
tính lại → so **toàn bộ** `RaveChart` trên cả 10 golden.

`fake-indexeddb` chỉ là **devDependency**, không lọt vào gói gửi xuống trình duyệt.
