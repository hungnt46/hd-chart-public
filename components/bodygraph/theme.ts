/**
 * Bảng màu bodygraph.
 *
 * ★ 2026-09-21 — mọi giá trị dưới đây ĐỌC TỪ CSS/`<defs>` của ứng dụng tham
 *   chiếu đang chạy,
 *   không phải ướm mắt từ ảnh chụp màn hình. Bản trước tôi ướm từ ảnh nên sai
 *   nặng: ghi Head là `#bc9f67` nâu tan, trong khi Head thực tế là VÀNG.
 *
 *   Cách đọc: `#head.defined .shape { fill: url(#centerDefinedYellow) }` rồi
 *   tra `<linearGradient id="centerDefinedYellow">`. Mọi gradient này đều PHẲNG
 *   (stop ở offset 0 và 1 cùng màu) — chúng chỉ là màu đặc khoác áo gradient,
 *   nên ở đây dùng thẳng mã màu.
 *
 *   Ứng dụng tham chiếu dùng CÙNG bảng màu trung tâm cho cả theme-light lẫn theme-dark; chỉ
 *   nền và màu personality đổi. Vì vậy `classic` và `modern` ở đây chia chung
 *   bảng màu, khác nhau ở BẢN VẼ chứ không ở màu.
 */
import { CenterId } from '../../calc-core/rave/derive/tables.js';
import { PUBLIC_EDITION } from '../../lib/edition.js';

export type ThemeName = 'classic' | 'modern';

export type ArtworkId = 'hdkit' | 'alternate';

export interface BodygraphTheme {
  name: ThemeName;
  /**
   * Bản vẽ hình học dùng cho chủ đề này.
   *  - `hdkit`     — dải thẳng, huy hiệu tròn: gần với chế độ **Classic**
   *  - `alternate` — kênh cong, trung tâm bo góc: gần với chế độ **Modern**
   * Hình học nằm trong `artworks/<id>.json`, sinh bởi
   * `node components/bodygraph/generate/extract-artworks.mjs`.
   */
  artwork: ArtworkId;
  /** Màu tô trung tâm khi defined. */
  centerFill: Readonly<Record<CenterId, string>>;
  centerOpenFill: string;
  /**
   * Màu bóng thân người phía sau (chỉ bản `alternate` có hình này).
   * Bỏ trống ⇒ không vẽ. Đây là màu do TA chọn: gradient nền sáng của bản gốc
   * toàn màu trắng nên bóng người vốn vô hình ở chế độ sáng.
   */
  figureFill?: string;
  /** Màu tam giác nền, nằm DƯỚI bóng người. Bỏ trống ⇒ không vẽ. */
  triangleFill?: string;
  centerStroke: string;
  centerStrokeWidth: number;
  centerRadius: number;
  /** Kênh chưa defined. */
  channelOpenFill: string;
  /**
   * Viền của LƯỚI kênh mở. Bỏ trống = không viền.
   *
   * ★ Tách khỏi `badgeOpenStroke` ngày 2026-09-22: trước đây MỘT trường làm hai
   *   việc, nên bỏ viền lưới là vành huy hiệu cũng mất theo — mà huy hiệu trắng
   *   nằm trong trung tâm trống cũng trắng, mất vành là mất luôn cái đĩa.
   */
  channelOpenStroke?: string;
  /** Vành đĩa huy hiệu của cổng chưa kích hoạt. Bắt buộc, xem ghi chú trên. */
  badgeOpenStroke: string;
  channelWidth: number;
  personality: string;
  design: string;
  /**
   * Cổng bật nhưng chưa gán phía (`plain`) — chỉ Illustrator dùng, chart thật
   * không bao giờ có. Bỏ trống ⇒ trắng như bản tham chiếu.
   */
  plainFill?: string;
  /**
   * Cách tô cổng được kích hoạt bởi **cả design lẫn personality** ("mixed").
   *
   * ★ Đo trực tiếp trên bản vẽ tham chiếu ngày 2026-09-22 — HAI chế độ làm KHÁC NHAU,
   *   trước đây tôi tưởng chỉ có một:
   *   - `'split'` (Modern): `<linearGradient id="triple-activation-l">` chia đôi
   *     dứt khoát theo chiều dọc, nửa trên design, nửa dưới personality.
   *   - `'bands'` (Classic): `<pattern id="mixed_gate" width=20 height=20>` gồm
   *     hai dải cao 10 — `#FF0000` và `#0B0B0B` — và **xoay theo góc của thanh**
   *     (`mixed_gate_90`, `mixed_gate_-54`, `mixed_gate_70`, …) để các vạch cắt
   *     ngang thân thanh. Nhìn ra là thanh kẻ sọc đỏ-đen.
   */
  mixedStyle: 'split' | 'bands';
  /**
   * Bề dày một vạch sọc, tính theo TỈ LỆ chiều rộng khung. Mặc định 0.005.
   * Số nhỏ ⇒ sọc mau và dày đặc; số lớn ⇒ sọc thưa và to bản.
   */
  mixedBandScale?: number;
  /**
   * Tỉ lệ bề rộng dành cho màu DESIGN trong một chu kỳ sọc. Mặc định 0.5 (chia
   * đều). Đẩy lên 0.7 ⇒ nền đỏ với vạch đen mảnh, nhẹ mắt hơn nhiều vì giảm
   * diện tích màu tối.
   */
  mixedBandDuty?: number;
  gateText: string;
  /** Màu số cổng khi trung tâm đã tô màu (cần tương phản với nền tô). */
  gateTextOnFill: string;
  gateTextActive: string;
  gateFontSize: number;
}

/**
 * Màu trung tâm khi defined — đọc từ `<defs>` của bản vẽ tham chiếu (xem đầu tệp).
 * Ánh xạ trung tâm → gradient lấy nguyên từ CSS của họ:
 *   head, g                              → centerDefinedYellow #FBF7AD
 *   ajna                                 → centerDefinedGreen  #669A8D
 *   throat, spleen, solar_plexus, root   → centerDefinedBrown  #57423E
 *   heart, sacral                        → centerDefinedRed    #D04A49
 */
/**
 * Bảng màu trung tâm — **P2+**, quyết định thẩm mỹ của Hưng 2026-09-22.
 *
 * KHÔNG phải số đo tham chiếu. Bảng đo được của Jovian là
 *   nâu #57423e · đỏ #d04a49 · vàng #fbf7ad · xanh #669a8d
 * và nó có hai vấn đề khi đặt lên nền bóng người sáng:
 *
 *  1. Nâu và đỏ của Jovian chỉ cách nhau **9° sắc** — nâu thực chất là "đỏ tối",
 *     nên hễ làm sáng là nó trượt thành hồng-xám, đụng vào đỏ. P2+ cho nâu ngả
 *     caramel, đưa khoảng cách lên **28°**.
 *  2. Vàng #fbf7ad quá nhạt: đặt cạnh kênh trống TRẮNG và nền #e4e4e4 thì hình
 *     thoi G đọc ra gần như CHƯA defined — đó là thông tin sai, không phải
 *     chuyện đẹp xấu.
 *
 * Lệch so với bản đo được: nâu +21° sắc / +20% sáng · đỏ +2° / −4% ·
 * vàng +10° / −6% · xanh +9° / +2%. Chỉ nâu đổi thật.
 */
const CENTER_FILL: Record<CenterId, string> = {
  [CenterId.Head]: '#f0d98a',
  [CenterId.Ajna]: '#6f9c8a',
  [CenterId.Throat]: '#9a7f63',
  [CenterId.G]: '#f0d98a',
  [CenterId.Heart]: '#bc4f4a',
  [CenterId.Sacral]: '#bc4f4a',
  [CenterId.Spleen]: '#9a7f63',
  [CenterId.SolarPlexus]: '#9a7f63',
  [CenterId.Root]: '#9a7f63',
};
/**
 * Màu nguồn kích hoạt — `#gates g.defined.c1/.c2` trong CSS của bản tham chiếu.
 * c1 = design (đỏ), c2 = personality (gần đen ở nền sáng, gần trắng ở nền tối).
 */
/** Số ĐO nguyên bản của bản tham chiếu. Giữ lại để không mất nguồn, đừng xoá. */
export const DESIGN_MEASURED = '#d04948';
/*
 * ★ Lệch CÓ CHỦ Ý khỏi bản đo, 2026-09-22.
 *
 * Số cổng đã kích hoạt là chữ TRẮNG nằm trên đĩa màu này. Với `#d04948` tỉ lệ
 * tương phản là 4.441:1 — hụt ngưỡng 4.5:1 của WCAG §1.4.3 cho chữ nhỏ đúng
 * 1.3%. Số cổng render ra 8–11px nên là chữ nhỏ, không được dùng ngưỡng 3:1.
 *
 * Hạ độ sáng HLS đi 2%, giữ NGUYÊN sắc (0.4°) và bão hoà (59.1%) ⇒ `#ce4140`,
 * đạt 4.714:1. Mắt không phân biệt được, nhưng qua ngưỡng có dư.
 *
 * Đổi màu personality thì không cần: `#2f2f2f` đã đạt 13.39:1.
 * Cổng kiểm: `__tests__/contrast.spec.ts`.
 */
const DESIGN = '#ce4140';
const PERSONALITY_LIGHT = '#2f2f2f';

export const CLASSIC: BodygraphTheme = {
  name: 'classic',
  artwork: 'hdkit',
  centerFill: CENTER_FILL,
  centerOpenFill: '#ffffff',
  figureFill: '#e4e4e4',
  triangleFill: '#f0f0f0',
  mixedBandDuty: 0.7,
  // ★ Viền mảnh và ĐỒNG NHẤT cho cả trung tâm lẫn kênh — đo từ mẫu chuẩn:
  //   ở đó mọi nét đều là hairline cùng màu, nên hình đọc ra như MỘT mạng lưới
  //   liền mạch. Bản trước để trung tâm viền 5 còn kênh viền xám mảnh nên hai
  //   thứ rời nhau, nhìn "xiêu vẹo".
  // Bản tham chiếu để `.theme-light #centers .shape { stroke-width: 0 }` — trung tâm KHÔNG
  // có viền, hình đọc ra nhờ tương phản màu tô. Giữ một nét rất mảnh cho trung
  // tâm chưa defined để nó không biến mất trên nền trắng.
  centerStroke: '#807c7c',
  centerStrokeWidth: 1.5,
  centerRadius: 0,
  // ★ Ruột kênh KHÔNG để trắng: sơ đồ chuẩn có nền thân người màu xám phía sau
  //   nên dải trắng nổi lên thành khối đặc. Bỏ nền đó mà vẫn tô trắng thì chỉ
  //   còn thấy viền — hình biến thành mớ khung dây mảnh, rối hơn hẳn.
  // ★ Bản công khai KHÔNG có nền (STATUS §5 #66, Hưng chọn C) ⇒ kênh trống trắng sẽ chìm vào nền trắng:
  //   tô xám nhạt như mockup C. Bản đầy đủ giữ trắng-trên-nền-xám.
  channelOpenFill: PUBLIC_EDITION ? '#e4e4e4' : '#ffffff',
  /*
   * ★ Vành huy hiệu đổi #d4d4d4 → #807c7c ngày 2026-09-22 vì TƯƠNG PHẢN.
   *
   * #d4d4d4 chỉ đạt 1.48:1 với ruột trắng và 1.17:1 với bóng người — dưới xa
   * ngưỡng 3:1 của WCAG §1.4.11 cho ranh giới đồ hoạ. Kênh trống là THÔNG TIN
   * (phải phân biệt được với kênh đã kích hoạt), không phải trang trí.
   *
   * Đã dò cả dải xám: #8d8d8d đạt 3.32 với trắng nhưng chỉ 2.61 với bóng người,
   * vẫn hụt. #807c7c — đúng màu `centerStroke` đã dùng sẵn — đạt cả ba:
   * 4.12 với trắng · 3.24 với bóng người · 3.62 với tam giác. Dùng MỘT màu viền
   * cho toàn bộ nét thay vì hai, đỡ phải cân hai lần.
   *
   * Đây là lệch CÓ CHỦ Ý so với bản đo tham chiếu (họ để vành nhạt hơn). Cổng kiểm:
   * `__tests__/contrast.spec.ts`. Muốn nhạt lại thì phải sửa ngưỡng trước, mà
   * ngưỡng thì không hạ.
   *
   * LƯỚI kênh thì KHÔNG viền — Hưng chốt 2026-09-22 sau khi so bốn hướng.
   * `channelOpenStroke` vì thế bỏ trống ở cả hai chủ đề. Xem ghi chú "lệch đã
   * biết" trong `contrast.spec.ts`: cặp ruột-kênh/nền chỉ đạt 1.14:1.
   */
  badgeOpenStroke: '#807c7c',
  // Dải kênh chuẩn rộng 9–10px trên ảnh 1352px; hệ số quy đổi ×2.0 → 20 đơn vị.
  channelWidth: 20,
  personality: PERSONALITY_LIGHT,
  design: DESIGN,
  mixedStyle: 'bands',
  // đủ đậm để đọc được TRÊN NỀN TÔ MÀU của trung tâm defined, không chỉ trên nền trắng
  gateText: '#000000',
  /**
   * ★ SỬA LỖI 2026-09-22: giá trị này từng là `#ffffff` và làm MỌI số cổng chưa
   * kích hoạt trong một trung tâm ĐÃ TÔ trở nên VÔ HÌNH.
   *
   * Vì sao sai: huy hiệu của cổng chưa kích hoạt được tô `centerOpenFill`, tức
   * TRẮNG ĐỤC. Chữ trắng trên đĩa trắng ⇒ tương phản 1.0:1. Trung tâm Throat
   * defined mất sạch 9 số, chỉ còn mấy đốm trắng trơn.
   *
   * Vì sao tôi đặt nhầm: đọc CSS của bản tham chiếu `.defined .nums text { fill:#fff }`
   * rồi bê nguyên. Nhưng ở bản tham chiếu huy hiệu cổng chưa kích hoạt là TRONG SUỐT, nên
   * chữ trắng của họ nằm thẳng trên nền trung tâm sẫm. Ta vẽ đĩa đục, nên phải
   * làm ngược lại. Giá trị dưới đây cũng đo từ bản tham chiếu: quy tắc
   * `#centers g.defined .nums g.defined text { fill: rgb(51,59,66) }` — màu họ
   * dùng cho chữ NẰM TRÊN ĐĨA TRẮNG.
   */
  gateTextOnFill: '#333b42',
  gateTextActive: '#ffffff',
  gateFontSize: 26,
};

/** Cùng bảng màu Jovian, khác BẢN VẼ: kênh cong, trung tâm bo góc. */
export const MODERN: BodygraphTheme = {
  name: 'modern',
  artwork: 'alternate',
  centerFill: CENTER_FILL,
  centerOpenFill: '#ffffff',
  figureFill: '#e4e4e4',
  triangleFill: '#f0f0f0',
  mixedBandDuty: 0.7,
  centerStroke: '#807c7c',
  centerStrokeWidth: 1.5,
  centerRadius: 16,
  channelOpenFill: '#ffffff',
  badgeOpenStroke: '#807c7c',   // xem ghi chú ở CLASSIC — ngưỡng tương phản
  channelWidth: 20,
  personality: PERSONALITY_LIGHT,
  design: DESIGN,
  mixedStyle: 'bands',
  gateText: '#000000',
  gateTextOnFill: '#333b42',   // xem ghi chú ở CLASSIC — chữ nằm trên ĐĨA TRẮNG
  gateTextActive: '#ffffff',
  gateFontSize: 24,
};

export const THEMES: Readonly<Record<ThemeName, BodygraphTheme>> =
  Object.freeze({ classic: CLASSIC, modern: MODERN });

/* ══════════════════════════════════════════════════════════════════════════
 * CHART GHÉP — transit hoặc chu kỳ chồng lên chart cá nhân
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * ★ Chế độ "Complete" — Hưng chốt 2026-09-23 (STATUS §5 #13): tô theo BÊN.
 *
 * Đo trên hai ứng dụng tham chiếu (tệp đo chart ghép 2026-09-23 trong
 * `calc-core/__fixtures__/reference/`): chart ghép dùng bộ máy chart kết nối —
 * mọi cổng của người MỘT màu, mọi cổng của bên kia MỘT màu, cổng chung kẻ sọc.
 * Đỏ/đen của người KHÔNG lên bodygraph; nó vẫn ở cột. Chế độ "Triple
 * Activation" (giữ đỏ/đen) Hưng đã xem và bỏ: "rối mắt quá".
 *
 * Transit và chu kỳ tô Y HỆT nhau — design/personality riêng của mốc chu kỳ
 * không bao giờ lên bodygraph ở cả hai app nguồn.
 *
 * ★ MÀU = NGUYÊN BỘ CLASSIC THAM CHIẾU — Hưng chốt 2026-09-23 (STATUS §5 #13), sau
 *   khi so bốn bộ trên cùng một chart ghép: bộ phiên tự chọn (lam #2775b9 + tím
 *   #8d32ae, quét ΔE2000), Classic tham chiếu, Modern tham chiếu, ứng dụng tham chiếu thứ hai. Đo từ DOM
 *   bản tham chiếu: `g.defined.c1` rgb(0,128,0) · `g.defined.c2` rgb(53,53,196), pattern
 *   `mixed_gate_composite` 10+10. Dùng cho CẢ HAI chủ đề (Modern tham chiếu có bộ
 *   riêng #6a8bb5/#83cbb4 nhưng chữ trắng trên đó chỉ 3.5 và 1.9:1).
 *
 *   Lệch đã biết, Hưng chọn khi đã thấy: xanh lá bên người khá gần màu trung
 *   tâm Ajna (ΔE2000 ≈ 8). Chữ trắng vẫn đạt: 5.14:1 và 8.54:1.
 *   Công cụ so: `tools/transit-overlay-preview.tsx … complete`.
 */
export const COMPOSITE_BASE = '#008000';
export const COMPOSITE_OTHER = '#3535c4';
/**
 * Dấu fixing do CẢ HAI chart gây ra (cột chart ghép) — Hưng chốt phương án B
 * 2026-09-23 (STATUS §5 #16). Bản tham chiếu dùng hồng `#ff48fc` cho đúng nghĩa này (lớp
 * `double-*`), nhưng nó chỉ 2.77:1 trên nền trắng. Hạ độ sáng HLS, giữ sắc và
 * bão hoà, tới vừa 3:1 ⇒ `#ff29fb`. Dấu do MỘT bên kia gây ra thì dùng thẳng
 * màu BÊN ở trên — không cần màu mới.
 */
export const COMPOSITE_BOTH = '#ff29fb';

/**
 * Bảng màu cho chart ghép. Renderer vẫn chỉ biết ba "khe" nguồn kích hoạt,
 * nên ghép chỉ là đổi màu từng khe — không cần nhánh vẽ thứ hai:
 *   khe `design`      ← bên NGƯỜI   (xem `compositeSources`)
 *   khe `personality` ← bên KIA     (transit / mốc chu kỳ)
 *   khe `both`        ← sọc 50/50   (hai bên ngang hàng, như `mixed_gate_composite`
 *                                    của bản tham chiếu — khác 70/30 của chart đơn, nơi đỏ là nền)
 */
export function compositeTheme(t: BodygraphTheme, p: CompositePalette = COMPOSITE_PALETTES.classic): BodygraphTheme {
  return {
    ...t, design: p.base, personality: p.other, gateTextActive: p.gateText,
    mixedStyle: 'bands', mixedBandDuty: 0.5,
  };
}

/**
 * ★ Bảng màu chart ghép có HAI lựa chọn (STATUS §4 G2, Hưng chốt 2026-09-24).
 *
 * `classic` — MẶC ĐỊNH, đạt đủ mọi ngưỡng tương phản.
 * `modern`  — ĐÚNG màu đo từ Modern tham chiếu (tệp đo chart ghép 2026-09-23
 *   trong `calc-core/__fixtures__/reference/`): lam `#6a8bb5` · ngọc `#83cbb4`. Hưng đã xem mẫu so
 *   (gốc vs đã chỉnh cho đạt 4.5:1 — `#5276a5` / `#37836b`) và CHỌN GỐC, biết
 *   rằng ngọc chỉ ~1.88:1 trên nền trắng. Các chỗ hụt được KHOÁ là lệch đã biết
 *   trong `contrast.spec.ts` — đừng hạ ngưỡng chung, đừng "sửa" màu mà không hỏi.
 *   Riêng SỐ CỔNG trên đĩa Modern để màu TỐI (`gateText`): chữ trắng trên ngọc
 *   chỉ 1.88:1, chữ tối thì 9.4:1 — màu nền giữ đúng như Hưng chọn.
 */
export interface CompositePalette {
  /** Bên người (chart nền). */
  base: string;
  /** Bên kia — transit / mốc chu kỳ. */
  other: string;
  /** Dấu fixing do CẢ HAI chart gây ra (cột chart ghép). */
  both: string;
  /** Màu số cổng trên đĩa đã kích hoạt. */
  gateText: string;
}
export type CompositePaletteName = 'classic' | 'modern';
export const COMPOSITE_PALETTES: Readonly<Record<CompositePaletteName, CompositePalette>> = {
  classic: { base: COMPOSITE_BASE, other: COMPOSITE_OTHER, both: COMPOSITE_BOTH, gateText: '#ffffff' },
  modern: { base: '#6a8bb5', other: '#83cbb4', both: COMPOSITE_BOTH, gateText: '#1a1a1a' },
};
