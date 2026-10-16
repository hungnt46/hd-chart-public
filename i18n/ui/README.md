# i18n/ui — chuỗi giao diện

SPEC §10.6. **Chữ của ta**: nhãn nút, thông báo, hướng dẫn. Tự viết, không lấy
từ đâu, nên không có ràng buộc bản quyền và **không** đi sau cờ nội dung.

## Ba lớp chữ trong app, đừng trộn

| lớp | ở đâu | của ai | tắt cờ nội dung thì sao |
|---|---|---|---|
| chữ giao diện | `i18n/ui/{en,vi}.json` | của ta | vẫn đủ |
| thuật ngữ HD tiếng Việt | `i18n/hd-terms/vi.json` | **bản dịch của Hưng** | vẫn đủ |
| thuật ngữ HD tiếng Anh | `calc-core` | từ vựng bộ môn | vẫn đủ |
| diễn giải (keynote, tên cross) | `i18n/hd-content/` | **Jovian Archive** | mất, hiện placeholder |

> ⚠️ Bản đầu tôi nhốt cả bản dịch thuật ngữ vào `hd-content` với lý lẽ "bản dịch
> là tác phẩm phái sinh của Jovian". Sai ở tiền đề: thư viện dịch thuật ngữ là bản
> dịch **của Hưng**. Chỉ phần diễn giải — dịch từ văn xuôi của Jovian — mới chịu cờ.

`i18n/terms.ts` gộp lại: tiếng Việt từ `hd-terms`, tiếng Anh từ `calc-core`.

**Không có `hd-terms/en.json`.** Tiếng Anh lấy thẳng từ `calc-core`, vốn cũng là
thứ 10 golden ghi lại — một nguồn duy nhất thì e2e so với golden không bao giờ đỏ
vì lý do dịch thuật. (Bảng chuỗi của phần mềm tham chiếu ghi "Emotional - Solar Plexus"; app Jovian và
golden ghi "Solar Plexus".)

## Quy ước trình bày tiếng Việt (Hưng chốt 2026-09-22)

- **Type** và **Profile**: tiếng Việt trước, tiếng Anh trong ngoặc —
  "Người Kiến Tạo (Generator)". Hai thứ này người học tra cứu chéo nhiều nhất.
- Mọi thứ khác **thuần tiếng Việt**: "Thẩm Quyền Xương Cùng", "Trung tâm Cổ Họng",
  "Mặt Trời". Có test quét ngược tìm chỗ còn chêm tiếng Anh.
- Nhãn "Type" giữ nguyên tiếng Anh (chính file dịch của Hưng cũng để nguyên).

## Khoá được kiểm ở mức KIỂU

`UiKey` suy thẳng từ `en.json`, nên gõ sai khoá là **lỗi biên dịch**, không phải
chuỗi lạ hiện ra lúc chạy.

## Chọn ngôn ngữ

Lần đầu: `localStorage` → `navigator.language` (`vi-*` ⇒ tiếng Việt, còn lại ⇒
tiếng Anh). Sau đó nhớ lựa chọn.

⚠️ Máy chủ **luôn** dựng bằng `DEFAULT_LANG` (tiếng Việt). Trang là bản dựng
TĨNH nên máy chủ không biết người xem là ai — không cookie, không
`Accept-Language`. Đọc `navigator.language` ngay ở lần vẽ đầu sẽ gây hydration
mismatch, đúng thứ đã làm hỏng trang hai lần (xem
`components/birth-form/__tests__/ssr-hydration.spec.tsx`). Vì vậy đổi trong
`useEffect`. Người dùng tiếng Anh thấy một nhịp tiếng Việt rồi mới chuyển — đánh
đổi có chủ đích.

## Ghi chú giải giờ

`lib/time` trả **mã** (`NoteCode`) kèm tham số, không trả câu chữ. Lớp giao diện
dựng câu từ `note.<code>`. Trước Phase 6 chỗ đó nhét câu tiếng Việt thẳng vào
thư viện thuần — không dịch được, mà test thì phải so khớp chuỗi hiển thị.

## Test

| file | bắt lỗi gì |
|---|---|
| `__tests__/coverage.spec.ts` | thiếu khoá · chép nguyên văn quên dịch · lệch tham số `{…}` |
| `__tests__/no-hardcoded-text.spec.ts` | chữ tiếng Việt viết cứng trong `components/` và `app/` |
| `e2e/i18n.spec.ts` | đoán theo trình duyệt · nhớ lựa chọn · đổi cả thuật ngữ |

Phép "chép nguyên văn quên dịch" có danh sách miễn trừ `INTENTIONALLY_SAME` cho
thuật ngữ cố ý giữ nguyên (Bodygraph, Classic, Type…). Danh sách đó phải NGẮN và
có lý do — không phải chỗ nhét khoá chưa kịp dịch.

⚠️ `playwright.config.ts` **ghim `locale: 'vi-VN'`**. Không ghim thì bộ test đọc
ngôn ngữ của máy đang chạy: xanh ở máy này, đỏ ở CI Linux. Test nào so với
golden thì tự khai `test.use({ locale: 'en-US' })` — golden ghi thuật ngữ tiếng
Anh của Jovian.
