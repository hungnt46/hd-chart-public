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
import { textOnFill } from './contrast.js';

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
  /**
   * Đĩa của cổng CHƯA kích hoạt. `'disc'` (mặc định, kiểu cũ) = đĩa đục
   * `centerOpenFill` có vành · `'bare'` (Aura A, 2026-10-21) = chỉ còn con số:
   * `<circle>` vẫn vẽ nhưng `fill="transparent"`, không viền — giữ vùng bấm cho
   * Illustrator và `data-gate` cho e2e. KHÔNG `fill="none"`: nó làm mất sự kiện chuột.
   */
  gateBadge?: 'disc' | 'bare';
  /**
   * Đĩa của cổng CẢ HAI phía. `'split'` (mặc định, kiểu cũ) = gradient chia
   * đôi trên/dưới · `'stripes'` (Aura A) = sọc chéo −45°, tỉ lệ `mixedBandDuty`.
   */
  mixedBadge?: 'split' | 'stripes';
  /** Số cổng chưa kích hoạt trên trung tâm TRỐNG. */
  gateText: string;
  /**
   * Số cổng chưa kích hoạt trong trung tâm ĐÃ TÔ. Bỏ trống ⇒ chọn theo màu thật
   * của trung tâm (`openGateText`). Bắt buộc khi `gateBadge` là `'disc'`, vì khi
   * đó số nằm trên ĐĨA TRẮNG chứ không trên màu trung tâm.
   */
  gateTextOnFill?: string;
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
/*
 * ★ Ánh Sáng Aura hướng A — Hưng chốt 2026-10-21 (`docs/PLAN-bodygraph-aura.md` §1).
 *   Tông hd-* của Aura, chỉnh cho số cổng TRẦN (không còn đĩa trắng, xem
 *   `gateTextOn`) đạt 4.5:1 ngay trên màu trung tâm: Ajna 4.83 · nâu 4.70 ·
 *   đỏ 5.04 với chữ trắng. Nâu vẫn cách đỏ ~28° sắc như P2+. Vàng 1.49:1 với
 *   trắng — vẫn là miễn trừ G/Head có sẵn.
 *   Bản P2+ trước đó: vàng #f0d98a · xanh #6f9c8a · nâu #9a7f63 · đỏ #bc4f4a.
 */
const CENTER_FILL: Record<CenterId, string> = {
  [CenterId.Head]: '#efd34e',
  [CenterId.Ajna]: '#37804a',
  [CenterId.Throat]: '#9a6a2c',
  [CenterId.G]: '#efd34e',
  [CenterId.Heart]: '#c4422f',
  [CenterId.Sacral]: '#c4422f',
  [CenterId.Spleen]: '#9a6a2c',
  [CenterId.SolarPlexus]: '#9a6a2c',
  [CenterId.Root]: '#9a6a2c',
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
 * ★ Aura hướng A (2026-10-21): đỏ `#c63a2b` (số trắng 5.20:1) và "đen" là
 *   xanh đêm ink `#172033` (16.27:1); hai sọc của cổng cả-hai-phía cách nhau
 *   3.13:1. Bản trước: `#ce4140` / `#2f2f2f`.
 * Cổng kiểm: `__tests__/contrast.spec.ts`.
 */
const DESIGN = '#c63a2b';
const PERSONALITY_LIGHT = '#172033';
/** Viền mọi nét (trung tâm, lưới, đĩa) — token `control` của Aura. */
const OUTLINE = '#7d8592';
/** Số cổng chưa kích hoạt trên trung tâm TRỐNG — `ink-2` của Aura, 7.81:1. */
const GATE_TEXT_OPEN = '#4a5266';

export const CLASSIC: BodygraphTheme = {
  name: 'classic',
  artwork: 'hdkit',
  centerFill: CENTER_FILL,
  centerOpenFill: '#ffffff',
  figureFill: '#e6ebe7',
  triangleFill: '#f1f3ef',
  mixedBandDuty: 0.7,
  // ★ Viền mảnh và ĐỒNG NHẤT cho cả trung tâm lẫn kênh — đo từ mẫu chuẩn:
  //   ở đó mọi nét đều là hairline cùng màu, nên hình đọc ra như MỘT mạng lưới
  //   liền mạch. Bản trước để trung tâm viền 5 còn kênh viền xám mảnh nên hai
  //   thứ rời nhau, nhìn "xiêu vẹo".
  // Bản tham chiếu để `.theme-light #centers .shape { stroke-width: 0 }` — trung tâm KHÔNG
  // có viền, hình đọc ra nhờ tương phản màu tô. Giữ một nét rất mảnh cho trung
  // tâm chưa defined để nó không biến mất trên nền trắng.
  centerStroke: OUTLINE,
  centerStrokeWidth: 1.5,
  centerRadius: 0,
  // ★ Ruột kênh KHÔNG để trắng: sơ đồ chuẩn có nền thân người màu xám phía sau
  //   nên dải trắng nổi lên thành khối đặc. Bỏ nền đó mà vẫn tô trắng thì chỉ
  //   còn thấy viền — hình biến thành mớ khung dây mảnh, rối hơn hẳn.
  // ★ Bản công khai KHÔNG có nền (STATUS §5 #66; chỉ Classic). Trước Aura nó tô kênh trống xám
  //   nhạt `#e4e4e4` cho khỏi chìm vào nền trắng; từ khi lưới Classic có VIỀN (Aura A,
  //   2026-10-21) thì trắng + viền là đủ, nên hai bản như nhau.
  channelOpenFill: '#ffffff',
  /*
   * ★ Viền LƯỚI bật lại — Aura hướng A, Hưng chốt 2026-10-21, CHỈ Classic (Modern
   *   giữ không viền: viền trên kênh cong thành một mớ đường). `#7d8592` đạt 3.72:1
   *   với ruột kênh trắng, 3.08:1 với bóng người, 3.33:1 với tam giác ⇒ lệch đã biết
   *   "ruột kênh 1.14:1" của Classic không còn. Trước đó (2026-09-22) Hưng chọn không viền.
   */
  channelOpenStroke: OUTLINE,
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
   * Aura A (2026-10-21): `#7d8592` (control) — 3.72:1 với trắng, 3.08:1 với
   * bóng người. Đĩa cổng chưa kích hoạt nay TRONG SUỐT (xem `gateBadge`), vành
   * này chỉ còn cho đĩa `plain` của Illustrator.
   */
  badgeOpenStroke: OUTLINE,
  // Dải kênh chuẩn rộng 9–10px trên ảnh 1352px; hệ số quy đổi ×2.0 → 20 đơn vị.
  channelWidth: 20,
  personality: PERSONALITY_LIGHT,
  design: DESIGN,
  mixedStyle: 'bands',
  gateBadge: 'bare',
  mixedBadge: 'stripes',
  gateText: GATE_TEXT_OPEN,
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
  /*
   * ★ Aura A (2026-10-21): đĩa chưa kích hoạt TRONG SUỐT (`gateBadge: 'bare'`) ⇒ số nằm
   *   thẳng trên màu trung tâm như ở bản tham chiếu, nên `gateTextOnFill` bỏ trống và
   *   `openGateText` chọn trắng / ink theo màu trung tâm. Giá trị `#333b42` ở trên chỉ
   *   còn đúng cho kiểu `'disc'`.
   */
  gateTextActive: '#ffffff',
  gateFontSize: 26,
};

/** Cùng bảng màu Jovian, khác BẢN VẼ: kênh cong, trung tâm bo góc. */
export const MODERN: BodygraphTheme = {
  name: 'modern',
  artwork: 'alternate',
  centerFill: CENTER_FILL,
  centerOpenFill: '#ffffff',
  figureFill: '#e6ebe7',
  triangleFill: '#f1f3ef',
  mixedBandDuty: 0.7,
  centerStroke: OUTLINE,
  centerStrokeWidth: 1.5,
  centerRadius: 16,
  channelOpenFill: '#ffffff',
  // KHÔNG viền lưới — Hưng chốt 2026-10-21: Aura A chỉ bật viền cho Classic. Lệch đã biết
  // (ruột kênh vs bóng người 1.21:1) khoá trong `contrast.spec.ts`.
  badgeOpenStroke: OUTLINE,     // xem ghi chú ở CLASSIC — ngưỡng tương phản
  channelWidth: 20,
  personality: PERSONALITY_LIGHT,
  design: DESIGN,
  mixedStyle: 'bands',
  gateBadge: 'bare',
  mixedBadge: 'stripes',
  gateText: GATE_TEXT_OPEN,
  gateTextActive: '#ffffff',
  gateFontSize: 24,
};

export const THEMES: Readonly<Record<ThemeName, BodygraphTheme>> =
  Object.freeze({ classic: CLASSIC, modern: MODERN });

/**
 * Màu số của cổng CHƯA kích hoạt — chọn theo NỀN THẬT dưới con số.
 *  - trung tâm trống ⇒ `gateText`;
 *  - trung tâm đã tô, kiểu `'disc'` ⇒ `gateTextOnFill` (số nằm trên đĩa trắng);
 *  - trung tâm đã tô, kiểu `'bare'` ⇒ `gateTextOnFill` nếu khai, không thì trắng
 *    hay ink `#172033`, cái nào tương phản hơn với màu trung tâm (Aura A §3a:
 *    vàng ⇒ ink 10.92:1 · xanh / nâu / đỏ ⇒ trắng ≥ 4.70:1).
 * Dùng chung cho renderer và `contrast.spec.ts` — một luật, một chỗ.
 */
export function openGateText(t: BodygraphTheme, definedCenterFill: string | null): string {
  if (definedCenterFill === null) return t.gateText;
  if (t.gateTextOnFill) return t.gateTextOnFill;
  if (t.gateBadge !== 'bare') return t.gateText;
  return textOnFill(definedCenterFill, PERSONALITY_LIGHT);
}

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
/*
 * ★ Aura hướng A (Hưng chốt 2026-10-21, `docs/PLAN-bodygraph-aura.md` §1): giữ
 *   xanh lá / xanh dương nhưng sẫm và dịu hơn — `#1f7a3a` (số trắng 5.38:1) ·
 *   `#28309e` (10.46:1). Hai bên cách nhau 1.95:1 về độ sáng, không chỉ sắc.
 *   Bản đo trên: `#008000` / `#3535c4`.
 */
export const COMPOSITE_BASE = '#1f7a3a';
export const COMPOSITE_OTHER = '#28309e';
/**
 * Dấu fixing do CẢ HAI chart gây ra (cột chart ghép) — Hưng chốt phương án B
 * 2026-09-23 (STATUS §5 #16). Bản tham chiếu dùng hồng `#ff48fc` cho đúng nghĩa này (lớp
 * `double-*`), nhưng nó chỉ 2.77:1 trên nền trắng. Hạ độ sáng HLS, giữ sắc và
 * bão hoà, tới vừa 3:1 ⇒ `#ff29fb`. Dấu do MỘT bên kia gây ra thì dùng thẳng
 * màu BÊN ở trên — không cần màu mới.
 */
/* Aura A (2026-10-21): `#c4269f` — 4.91:1 trên nền `paper`. Bản trước `#ff29fb`. */
export const COMPOSITE_BOTH = '#c4269f';

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
 *   chỉ 1.88:1, chữ tối thì 9.4:1 — màu nền giữ đúng như Hưng chọn. *
 * ★ Aura A (2026-10-21): Hưng chọn dùng CHUNG bảng A cho cả hai chủ đề ⇒ hai khoá
 *   nay cùng giá trị, lệch ngọc ở trên là lịch sử.
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
  // ★ Aura A (Hưng chốt 2026-10-21): Modern dùng CHUNG bảng A với Classic — lệch "ngọc hụt
  //   3:1" của bảng Modern tham chiếu (#6a8bb5 / #83cbb4, chữ tối #1a1a1a) không còn.
  //   Vẫn giữ hai khoá để bảng đi theo chủ đề như cũ (`useCompositePalette`).
  modern: { base: COMPOSITE_BASE, other: COMPOSITE_OTHER, both: COMPOSITE_BOTH, gateText: '#ffffff' },
};
