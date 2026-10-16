/**
 * Renderer CHUNG cho mọi bản vẽ bodygraph trích từ corpus — dùng để SO THIẾT KẾ.
 *
 * ★ Bài học 2026-09-21 (người dùng chỉ ra): bản hdkit đầu tiên của tôi có "đường
 * ghép" chạy ngang giữa mọi kênh. Nguyên nhân KHÔNG phải bản vẽ mà là cách tôi
 * vẽ: tôi stroke viền cho TỪNG nửa dải, nên chỗ hai nửa gặp nhau hiện thành vạch.
 * Thêm nữa 58/64 dải của hdkit là path MỞ (không có Z) và hai nửa lệch ngang
 * 0.35–0.72 đơn vị — stroke làm lộ hết. Bản vẽ gốc `bodygraph-blank.svg` để
 * `stroke="transparent"`; chỉ bản `-with-gate-outlines` mới cố ý stroke đen.
 *
 * Quy tắc ở đây: **nền lưới và phần tô KHÔNG stroke**. Viền chỉ vẽ cho trung tâm.
 */
import type { JSX } from 'react';
import { CenterId, GATE_TO_CENTER, CHANNELS, type ChannelDef } from '../../calc-core/rave/derive/tables.js';
import { combineSources, type DisplaySource, type LayerKey, type LayerSetting } from './display-source.js';
import { THEMES, type BodygraphTheme, type ThemeName } from './theme.js';
import { pathPoints, type Pt } from './svg-path.js';
import { SIDE_OF_SLOT } from './composite.js';
import { readableOn, textOnFill as textOn } from './contrast.js';

export interface ArtworkGeometry {
  id: string;
  label: string;
  source: string;
  /** 'fill' = dải được tô (hdkit, alternate) · 'stroke' = line-art (pdf-maker). */
  mode?: 'fill' | 'stroke';
  viewBox: { minX: number; minY: number; w: number; h: number };
  centers: Record<string, string>;
  halves: Record<string, string>;
  /** Bản vẽ chỉ có kênh NGUYÊN (không tách nửa) — không vẽ được hanging gate. */
  channels?: Record<string, string>;
  /**
   * Bóng thân người phía sau mạng lưới. Chỉ bản `alternate` có.
   * ⚠️ Trong file gốc path này nằm trong khối chú thích, tức bản vẽ đó TẮT nó;
   * bật lên là quyết định của ta. Chỉ vẽ khi `theme.figureFill` có giá trị.
   */
  figure?: string;
  /**
   * Ma trận đặt `figure` vào hệ toạ độ của bản vẽ này. Chỉ có khi hình được
   * MƯỢN từ bản vẽ khác (hdkit mượn của alternate) — xem `figureFrom`.
   */
  figureTransform?: string;
  /** Tên bản vẽ đã cho mượn `figure`, nếu là hình mượn. */
  figureFrom?: string;
  /** Tam giác nền, nằm DƯỚI bóng người. Chỉ bản Classic có. */
  triangle?: string;
  badges: Record<string, { cx: number; cy: number; r: number }>;
  extras: { id: string; d: string }[];
}

import { CENTER_ID_OF } from './center-keys.js';
const CENTER_BY_KEY = CENTER_ID_OF;
const ALL_GATES = Array.from({ length: 64 }, (_, i) => i + 1);

/**
 * Sáu kênh của nhóm integration, khoá CHUẨN HOÁ (cổng nhỏ trước).
 *
 * ⚠️ Phải chuẩn hoá thật: `CHANNELS` ghi `20-10` và `57-20`, còn bản vẽ
 * `alternate` ghi `10-20` và `20-57`. Bản test đầu dùng thẳng khoá tăng dần nên
 * hai kênh đó không khớp gì cả và trục im lặng không sáng.
 */
const INTEGRATION_KEYS = ['10-20', '10-34', '10-57', '20-34', '20-57', '34-57'] as const;
const normKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/**
 * ★ NHÓM INTEGRATION — sửa 2026-09-22 sau khi đối chiếu hai nguồn.
 *
 * Bốn cổng 10/20/34/57 KHÔNG có sáu thanh riêng như 30 kênh kia; chúng dùng
 * chung một trục rẽ nhánh. Bản trước tôi thắp **toàn bộ** trục hễ có MỘT kênh
 * integration nào defined ⇒ biểu đồ vẽ ra những kênh KHÔNG TỒN TẠI.
 *
 * Bằng chứng (2026-09-22, cùng một bản vẽ tham chiếu chạy trên hai site chính thức):
 *   · jovianarchive.com — 1990-01-04 00:00 Reykjavík, đúng một kênh 10-57:
 *     chỉ `#c1057` mang class `defined`, fill `rgb(208,73,72)`; `c2057`,
 *     `c1034`, `c1020`, `c2034`, `c3457` đều KHÔNG.
 *   · humandesignamerica.com — 1986-06-17 08:00 Reykjavík, kênh 34-57:
 *     chỉ `#c3457` defined. Bản vẽ đó còn có sẵn nhóm hình riêng `gint-1034-conp`,
 *     `gint-10-conp` cho từng tổ hợp.
 * ⇒ Mỗi kênh integration chỉ thắp ĐÚNG phần trục nó đi qua.
 *
 * Với bản `alternate` việc này dễ: bản vẽ có sẵn 36 path kênh, dùng thẳng
 * `art.channels['10-57']`. Với bản `hdkit` thì trục được ghép từ ba mảnh phụ,
 * nên phải suy ra từ hình học (toạ độ đọc trong artworks/hdkit.json):
 *
 *   nút A (≈228,701) — nơi gặp của thanh cổng 10 (ngang, từ G) và thanh cổng 20
 *                      (chéo lên Throat); `GateConnect10` là miếng chèn góc.
 *   nút B (≈140,825) — nơi gặp của thanh cổng 57 (xuống Spleen) và thanh cổng 34
 *                      (xuống Sacral); `GateConnect34` là miếng chèn góc.
 *   `GateSpan`       — đoạn nối A↔B.
 *
 * Suy ra: 10-20 chỉ dùng nút A · 34-57 chỉ dùng nút B · bốn kênh còn lại bắc
 * qua cả hai nên cần `GateSpan`. Miếng chèn ở một nút sáng khi có ≥2 nhánh tại
 * nút đó sáng.
 */
export const EXTRA_NEEDS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  GateSpan: ['10-34', '10-57', '20-34', '20-57'],
  GateConnect10: ['10-20', '10-34', '10-57', '20-34', '20-57'],
  GateConnect34: ['10-34', '10-57', '20-34', '20-57', '34-57'],
});

/**
 * Góc trục của một dải, tính từ hai điểm xa nhau nhất trên đường biên.
 * Dùng để xoay hoạ tiết sọc cho đúng thân thanh (xem `mixedStyle: 'bands'`).
 */
function barAngleDeg(d: string): number {
  const ax = barAxis(d);
  if (!ax) return 0;
  const deg = (Math.atan2(ax.by - ax.ay, ax.bx - ax.ax) * 180) / Math.PI;
  // Sọc phải CẮT NGANG thanh: thanh dọc ⇒ không xoay, thanh ngang ⇒ xoay 90°.
  return Math.round(((deg - 90) % 180 + 180) % 180);
}

/** Diện tích đa giác (công thức dây giày), dùng để xếp thứ tự vẽ nửa dải. */
function polyArea(d: string): number {
  const P = pathPoints(d);
  let a = 0;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++)
    a += (P[j]![0] + P[i]![0]) * (P[j]![1] - P[i]![1]);
  return Math.abs(a / 2);
}

/**
 * Hai điểm XA NHAU NHẤT trên biên một dải — dùng làm trục dài của thanh.
 * Dùng chung cho hoạ tiết sọc (Classic) và gradient chia dọc (Modern).
 */
function barAxis(d: string): { ax: number; ay: number; bx: number; by: number } | null {
  const pts = pathPoints(d);
  let best = -1, A: Pt | undefined, B: Pt | undefined;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[j]![0] - pts[i]![0], dy = pts[j]![1] - pts[i]![1];
      const l = dx * dx + dy * dy;
      if (l > best) { best = l; A = pts[i]; B = pts[j]; }
    }
  }
  return A && B ? { ax: A[0], ay: A[1], bx: B[0], by: B[1] } : null;
}

/**
 * ★ Cổng "cả hai phía" ở MODERN — chia dải DỌC THEO CHIỀU DÀI, không cắt ngang.
 *
 * Đọc từ bản vẽ `alternate` GỐC (`../hd-corpus/**\/bodygraph-alternate.svg`,
 * kiểm 2026-09-22). Ở đó một cổng mixed là:
 *
 *     <g id="g9" class="defined mixed">
 *       <use id="s" href="#sg9"/>      ← nửa dải ĐẦY ĐỦ, màu design
 *       <path id="m" d="…"/>           ← path RIÊNG, màu personality
 *
 * Đo `#m` so với nửa dải: g9 là `13.5 × 54.9` trên `27.0 × 54.9`, g11 là
 * `13.5 × 80.3` trên `27.0 × 101.3` — tức ĐÚNG MỘT NỬA BỀ RỘNG, giữ nguyên
 * chiều dài. Hai cổng cong g45/g50 cũng giữ 90–94% chiều dài. Vậy quy tắc là
 * **hai sợi song song chạy suốt thanh**, KHÔNG phải cắt ngang ở giữa.
 *
 * Bản trước dùng `objectBoundingBox` với hướng cố định `0%,0%→0%,100%`, tức chia
 * theo trục DỌC CỦA BAO HÌNH. Với thanh dọc thì tình cờ đúng hướng; với thanh
 * chéo như kênh 28-38 thì ranh giới rơi lung tung, nhìn ra như đen kéo 2/3 kênh
 * còn đỏ chỉ còn một mẩu — Hưng phát hiện 2026-09-22.
 *
 * Nay tính theo hình học từng thanh: gradient chạy VUÔNG GÓC với trục thanh,
 * `userSpaceOnUse`, chặn cứng ở 50%. Đúng với mọi hướng.
 */
function splitGradientCoords(d: string): { x1: number; y1: number; x2: number; y2: number } | null {
  const ax = barAxis(d);
  if (!ax) return null;
  const ux = ax.bx - ax.ax, uy = ax.by - ax.ay;
  const len = Math.hypot(ux, uy);
  if (len === 0) return null;
  const nx = -uy / len, ny = ux / len;          // pháp tuyến của trục
  const pts = pathPoints(d);
  let lo = Infinity, hi = -Infinity, cx = 0, cy = 0;
  for (const [x, y] of pts) {
    const t = x * nx + y * ny;
    if (t < lo) lo = t;
    if (t > hi) hi = t;
    cx += x; cy += y;
  }
  cx /= pts.length; cy /= pts.length;
  const c = cx * nx + cy * ny;
  return { x1: cx + nx * (lo - c), y1: cy + ny * (lo - c),
           x2: cx + nx * (hi - c), y2: cy + ny * (hi - c) };
}

export interface BodygraphArtworkProps {
  art: ArtworkGeometry;
  definedCenters: ReadonlySet<CenterId>;
  definedChannels: readonly ChannelDef[];
  /** `plain` chỉ Illustrator dùng — xem `display-source.ts`. */
  gateSources: ReadonlyMap<number, DisplaySource>;
  channelSources: ReadonlyMap<string, DisplaySource>;
  theme?: ThemeName;
  /**
   * Bảng màu thay thế, dùng để XEM TRƯỚC một biến thể mà không phải sửa
   * `theme.ts` rồi khôi phục. Chỉ tiện ích — `theme` vẫn là đường chính.
   */
  themeOverride?: BodygraphTheme;
  /**
   * Chart GHÉP: `data-source` / `data-activated` ghi `base|other|both` thay vì
   * tên khe `design|personality|both` — xem `composite.ts`. Chỉ đổi NHÃN, màu
   * do `themeOverride` quyết.
   */
  composite?: boolean;
  /**
   * Bật/tắt và độ mờ từng lớp (Illustrator). Khoá nào không có ⇒ lớp vẽ như
   * cũ, KHÔNG thêm thuộc tính nào: không truyền prop là markup y hệt trước
   * (ảnh tham chiếu e2e là cổng kiểm). `gates` là đĩa huy hiệu, `gateNumbers`
   * là số trên đĩa — độc lập nhau, nên áp lên TỪNG phần tử chứ không lên nhóm.
   */
  layers?: Partial<Record<LayerKey, LayerSetting>>;
  /**
   * Màu RIÊNG từng cổng (Illustrator Phase 3, menu "…"): đè màu phía lên nửa
   * dải và đĩa của cổng đó; số trên đĩa trắng/đen theo tương phản. Trục
   * integration vẫn tô theo phía. Không truyền ⇒ markup y hệt.
   */
  gateColors?: ReadonlyMap<number, string>;
  /**
   * Illustrator: số trên đĩa cổng đã bật GIỮ màu của chủ đề nếu đạt 4.5:1 với màu
   * đĩa thật (kể cả `plain` và hai màu của đĩa sọc), không thì trắng/đen theo
   * tương phản — người dùng tự chọn màu phía nên đĩa có thể rất sáng. Bộ màu mặc
   * định đều đạt ⇒ không đổi pixel. Chart thật KHÔNG bật (bảng màu của nó đã
   * qua `contrast.spec.ts`). Không truyền ⇒ markup y hệt.
   */
  gateTextAuto?: boolean;
  className?: string;
  title?: string;
  /**
   * Mặc định `bodygraph`. Ảnh nhỏ ở màn chào và khung xem trước của Illustrator
   * đặt tên KHÁC: e2e chờ `bodygraph` hiện ra để biết chart đã tính xong.
   */
  testId?: string;
}

export function BodygraphArtwork(props: BodygraphArtworkProps): JSX.Element {
  const { art, definedCenters, definedChannels, gateSources, channelSources, className, title } = props;
  const t = props.themeOverride ?? THEMES[props.theme ?? 'classic'];
  const label = (s: DisplaySource): string => (props.composite && s !== 'plain' ? SIDE_OF_SLOT[s] : s);
  const shown = (k: LayerKey) => props.layers?.[k]?.visible ?? true;
  /** `{opacity}` chỉ khi lớp có đặt độ mờ khác 1 — còn lại rỗng để markup giữ nguyên. */
  const dim = (k: LayerKey): { opacity?: number } => {
    const o = props.layers?.[k]?.opacity;
    return o === undefined || o === 1 ? {} : { opacity: o };
  };
  const vb = art.viewBox;
  const pid = `mix-${art.id}-${t.name}`;
  const definedKeys = new Set(definedChannels.map(c => `${c.gates[0]}-${c.gates[1]}`));
  /**
   * Hoạ tiết sọc cho cổng "mixed" ở chủ đề Classic. Mỗi góc thanh cần một
   * `<pattern>` riêng (bản tham chiếu cũng làm vậy: `mixed_gate_90`, `mixed_gate_-54`…),
   * nên gom các góc thực sự dùng rồi phát ra trong `<defs>`.
   */
  const bandAngles = new Set<number>();
  const bandId = (deg: number) => `${pid}-b${deg}`;
  /** Gradient chia dọc, MỖI THANH một cái vì hình học khác nhau. */
  const splitGrads = new Map<string, { x1: number; y1: number; x2: number; y2: number }>();
  const paintOf = (s: DisplaySource, d?: string, key?: string) => {
    if (s === 'plain') return t.plainFill ?? '#ffffff';
    if (s !== 'both') return s === 'design' ? t.design : t.personality;
    if (!d) return `url(#${pid})`;
    if (t.mixedStyle === 'split') {
      const g = splitGradientCoords(d);
      if (!g || key === undefined) return `url(#${pid})`;
      splitGrads.set(key, g);
      return `url(#${pid}-${key})`;
    }
    const deg = barAngleDeg(d);
    bandAngles.add(deg);
    return `url(#${bandId(deg)})`;
  };
  /** Giữ tên cũ cho những chỗ không có hình (huy hiệu số cổng). */
  const colorOf = (s: DisplaySource) => paintOf(s);

  const hasHalves = Object.keys(art.halves).length === 64;
  const stroked = art.mode === 'stroke';
  // bề rộng kênh cho bản line-art: ~0.8% chiều rộng khung, cùng tỉ lệ với hai bản kia
  const lw = vb.w * 0.008;
  /** Mọi hình của lưới mở nối thành MỘT `d` — các `d` đều mở đầu bằng `M` nên
   *  ghép lại thành các subpath của cùng một path. */
  const mergedLattice = [
    ...Object.values(art.channels ?? {}),
    ...(hasHalves ? ALL_GATES.map(g => art.halves[g]!) : []),
    ...art.extras.map(e => e.d),
  ].join(' ');
  const shape = (d: string, colour: string, extra: Record<string, unknown>) =>
    stroked
      ? <path d={d} fill="none" stroke={colour} strokeWidth={lw} strokeLinecap="butt" {...extra} />
      : <path d={d} fill={colour} stroke="none" {...extra} />;
  /*
   * VIỀN lưới mở: mỗi nửa dải tự mang viền của nó, rồi một path GỘP phủ lên
   * trên (xem `mergedLattice` dưới). Viền nằm trong hợp bị phủ mất, chỉ còn
   * viền bao quanh NGOÀI — không có vạch cắt ngang giữa kênh.
   *
   * ★ Cách cũ đã BỎ (2026-09-22): vẽ lớp viền phình ra rồi phủ từng nửa lên,
   *   có "hàn" mỗi nửa nở thêm `ow*0.34`. Không ăn. Đo ra 30/36 kênh có khe hở
   *   đúng 0.00 — hai nửa khít tuyệt đối — nên vạch anh thấy KHÔNG phải khe hở
   *   mà là vệt KHỬ RĂNG CƯA: hai mảng tô cạnh nhau mỗi bên phủ ~nửa pixel ở
   *   đường ranh, để lọt màu viền bên dưới. Vệt này tính theo PIXEL THIẾT BỊ
   *   còn nét thì tính theo đơn vị khung, nên nới hàn không bao giờ đủ ở cỡ
   *   nhỏ: ở khổ ảnh tham chiếu (581px cho 1379 đơn vị) cần hàn ≥4.7 đơn vị,
   *   trong khi cả bề dày viền mới có 3.03.
   */
  const ow = vb.w * 0.0022;
  const latticeFill = (d: string, extra: Record<string, unknown>) =>
    stroked
      ? shape(d, t.channelOpenFill, extra)
      : <path d={d} fill={t.channelOpenFill} stroke={t.channelOpenStroke ?? 'none'}
              strokeWidth={t.channelOpenStroke ? ow : 0} strokeLinejoin="round" {...extra} />;
  /** Kênh integration đang defined, tra bằng khoá chuẩn hoá. */
  const intDefined = new Map<string, DisplaySource>();
  for (const c of definedChannels) {
    const k = normKey(c.gates[0], c.gates[1]);
    if ((INTEGRATION_KEYS as readonly string[]).includes(k)) {
      intDefined.set(k, channelSources.get(`${c.gates[0]}-${c.gates[1]}`) ?? 'personality');
    }
  }
  /** Path kênh của bản vẽ, cũng tra bằng khoá chuẩn hoá. */
  const artChannelByNorm = new Map(Object.entries(art.channels ?? {}).map(
    ([k, d]) => { const [a, b] = k.split('-').map(Number); return [normKey(a!, b!), d] as const; }));

  /** Nguồn kích hoạt gộp của những kênh (trong `keys`) đang defined. */
  const sourceOfKeys = (keys: readonly string[]): DisplaySource | null => {
    const srcs = keys.map(k => intDefined.get(k))
      .filter((x): x is DisplaySource => x !== undefined);
    if (srcs.length === 0) return null;
    // Không có `plain` thì trùng luật cũ: một nguồn ⇒ nguồn đó, khác nhau ⇒ 'both'.
    return srcs.reduce(combineSources);
  };

  /**
   * ★ TÍNH TRƯỚC toàn bộ phần tô, KHÔNG tô trong lúc dựng JSX.
   * Lý do: `<defs>` được dựng trước lớp kích hoạt, nên nếu `paintOf` mới thêm
   * góc sọc vào `bandAngles` khi lớp đó chạy thì `<pattern>` đã bị bỏ sót và
   * thanh mixed sẽ tô bằng một `url(#…)` không tồn tại ⇒ mất màu.
   */
  const litHalves = hasHalves
    ? ALL_GATES.flatMap(g => {
        const src = gateSources.get(g);
        const d = art.halves[g]!;
        return src ? [{ g, src, d, paint: props.gateColors?.get(g) ?? paintOf(src, d, `g${g}`) }] : [];
      })
    : [];

  // Trục integration: mảnh phụ (hdkit) và path kênh sẵn có (alternate).
  const litExtras = art.extras.flatMap(e => {
    const needs = EXTRA_NEEDS[e.id];
    const src = needs ? sourceOfKeys(needs) : null;
    return src ? [{ id: e.id, src, d: e.d, paint: paintOf(src, e.d, `x${e.id}`) }] : [];
  });
  /*
   * ★ Vẽ nửa LỚN trước, nửa NHỎ sau — sửa 2026-09-22 (Hưng phát hiện).
   *
   * Hai nửa của một kênh CHỒNG MÉP nhau (bản `alternate` chồng 8–34% tuỳ kênh;
   * đó là chủ đích của bản gốc để mối nối không hở). Nửa nào vẽ sau thì ăn hết
   * phần chồng. Trước đây ta vẽ theo số cổng tăng dần, nên với kênh 28-38 thì 38
   * luôn vẽ sau và nuốt của 28 → ranh giới màu rơi về ~1/3 thay vì giữa kênh,
   * nhìn như lỗi: "đen kéo 2/3, đỏ còn một mẩu".
   *
   * Xếp theo diện tích giảm dần thì nửa nhỏ luôn được vẽ trọn vẹn, nên sai số
   * chỉ còn đúng bằng chênh lệch diện tích THẬT của bản vẽ (đo trên `alternate`:
   * 28-38 là 45/55, 9-52 là 51/49, 12-22 là 50/50) — không cộng thêm phần chồng.
   */
  litHalves.sort((a, b) => polyArea(b.d) - polyArea(a.d));
  /*
   * ★ Kênh integration của bản `alternate` còn có MỘT path liền cho cả kênh, vẽ đè
   *   lên hai nửa dải. Hai cổng CÙNG nguồn ⇒ tô path đó màu nguồn ấy. KHÁC nguồn ⇒
   *   KHÔNG vẽ path liền: hai nửa dải của chính bản vẽ đã phủ kín kênh (đo 99.5–100%
   *   diện tích cả 6 kênh, phần hụt là mép khử răng cưa) và chia đúng chỗ nối như
   *   bản hdkit ⇒ mỗi nửa mang màu cổng mình, đúng luật "kênh 41-30 nửa đỏ nửa đen".
   *   Lỗi đã mắc (Hưng phát hiện 2026-09-25, chart ghép: 10 của tôi + 20 transit):
   *   path liền tô bằng nguồn GỘP của kênh ⇒ "both" ⇒ nguyên kênh 10-20 thành sọc,
   *   đè mất màu từng cổng. Vẫn giữ một `<g data-int-channel>` rỗng làm dấu "kênh
   *   này defined" cho test.
   */
  const litIntChannels = INTEGRATION_KEYS.flatMap(k => {
    const d = artChannelByNorm.get(k);
    const src = intDefined.get(k);
    if (!d || !src) return [];
    const [ga, gb] = k.split('-').map(Number) as [number, number];
    const sa = gateSources.get(ga), sb = gateSources.get(gb);
    const split = sa !== undefined && sb !== undefined && sa !== sb;
    return [{ k, src, d, split, paint: split ? '' : paintOf(src, d, `c${k}`) }];
  });

  return (
    <svg viewBox={`${vb.minX} ${vb.minY} ${vb.w} ${vb.h}`} className={className}
         role="img" aria-label={title ?? art.label}
         data-testid={props.testId ?? 'bodygraph'} data-artwork={art.id} data-theme={t.name}>
      <title>{title ?? art.label}</title>
      <defs>
        {/*
          ★ Cổng "kích hoạt kép" (cả design lẫn personality) — CHIA ĐÔI DỨT KHOÁT
          theo chiều dọc, nửa trên design, nửa dưới personality.

          Đây là cách bản tham chiếu làm, đọc trực tiếp từ `<defs>` của họ (2026-09-21):
            <linearGradient id="triple-activation-l" x1="0%" y1="0%" x2="0%" y2="100%">
              0% #d04948 · 50% #d04948 · 50% #2f2f2f · 100% #2f2f2f
          Hai stop trùng offset 50% = ranh giới sắc, không phải chuyển màu mượt.

          Bản trước tôi tự chế hoạ tiết SỌC CHÉO 45°. Không repo nào và cả ứng
          dụng gốc đều không dùng kiểu đó — thuần tuý là tôi bịa.
        */}
        {/*
          Gradient chia DỌC theo trục từng thanh — xem `splitGradientCoords`.
          `userSpaceOnUse` là bắt buộc: với `objectBoundingBox` thì hướng bị bao
          hình (không vuông) kéo méo, nên thanh chéo sẽ chia sai.
        */}
        {[...splitGrads].map(([k, g]) => (
          <linearGradient key={k} id={`${pid}-${k}`} gradientUnits="userSpaceOnUse"
                          x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
            <stop offset="0%" stopColor={t.design} />
            <stop offset="50%" stopColor={t.design} />
            <stop offset="50%" stopColor={t.personality} />
            <stop offset="100%" stopColor={t.personality} />
          </linearGradient>
        ))}
        <linearGradient id={pid} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={t.design} />
          <stop offset="50%" stopColor={t.design} />
          <stop offset="50%" stopColor={t.personality} />
          <stop offset="100%" stopColor={t.personality} />
        </linearGradient>
        {/*
          ★ Hoạ tiết sọc cho chủ đề Classic — đọc từ `<defs>` của bản vẽ tham chiếu
          ngày 2026-09-22 (humandesignamerica.com, cùng widget với Jovian):
            <pattern id="mixed_gate" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="10" fill="#FF0000"/>
              <rect y="10" width="20" height="10" fill="#0B0B0B"/>
          kèm một bản xoay cho mỗi góc thanh: mixed_gate_90, _-54, _70, …
          Ô 20 trên khung rộng 2000 ⇒ mỗi vạch = 0.5% bề rộng; giữ đúng tỉ lệ đó.
        */}
        {[...bandAngles].sort((a, b) => a - b).map(deg => {
          const band = vb.w * (t.mixedBandScale ?? 0.005);
          const duty = t.mixedBandDuty ?? 0.5;
          return (
            <pattern key={deg} id={bandId(deg)} width={band * 2} height={band * 2}
                     patternUnits="userSpaceOnUse" patternTransform={`rotate(${deg})`}>
              <rect x="0" y="0" width={band * 2} height={band * 2 * duty} fill={t.design} />
              <rect x="0" y={band * 2 * duty} width={band * 2} height={band * 2 * (1 - duty)}
                    fill={t.personality} />
            </pattern>
          );
        })}
      </defs>

      {/*
        0. Bóng thân người — vẽ TRƯỚC mọi thứ, chỉ khi chủ đề khai `figureFill`.
        Các cung cong của bản `alternate` vốn được thiết kế để nằm TRÊN hình
        người; bỏ nền đi thì chúng trôi lơ lửng thành một vòng tròn.
      */}
      {t.figureFill && (art.triangle ?? art.figure) && shown('backdrop') && (
        <g data-layer="backdrop" transform={art.figureTransform} {...dim('backdrop')}
           data-figure-from={art.figureFrom}>
          {art.triangle && t.triangleFill && (
            <path d={art.triangle} fill={t.triangleFill} stroke="none" data-layer="triangle" />
          )}
          {art.figure && (
            <path d={art.figure} fill={t.figureFill} stroke="none" data-layer="figure" />
          )}
        </g>
      )}

      {/*
        1. Lưới kênh ở trạng thái mở. `channelOpenStroke` bỏ trống ⇒ KHÔNG viền,
        Hưng chốt 2026-09-22 sau khi so bốn hướng (không viền / viền nhạt / viền
        đậm / không viền + nền đậm). Đánh đổi đã biết: ruột kênh chỉ tách nền
        1.14:1, dưới ngưỡng 3:1. Ghi rõ ở `__tests__/contrast.spec.ts`.
        Đặt lại `channelOpenStroke` là có viền ngay, renderer không cần sửa.
      */}
      {shown('lattice') && <g data-layer="lattice" {...dim('lattice')}>
        {/* ray kênh đầy đủ (bản nào có) — vẽ trước để nửa dải nằm đè lên */}
        {Object.entries(art.channels ?? {}).map(([k, d]) => (
          <g key={`r${k}`}>{latticeFill(d, { 'data-channel-shape': k })}</g>))}
        {hasHalves && ALL_GATES.map(g => (
          <g key={g}>{latticeFill(art.halves[g]!, { 'data-bar': g })}</g>))}
        {art.extras.map(e => (
          <g key={e.id}>{latticeFill(e.d, { 'data-extra': e.id })}</g>))}
        {/*
          Path GỘP phủ lên trên: MỘT lần tô cho cả hợp của 64 nửa dải, nên bộ
          dựng hình tính độ phủ trên toàn vùng và KHÔNG còn ranh giới nội bộ để
          khử răng cưa. Nó cũng phủ mất phần viền nằm bên trong hợp, chỉ chừa
          viền bao quanh ngoài. Giữ 64 path riêng ở trên vì `data-bar` là danh
          tính từng cổng, có luật kiểm đếm đủ 64 (`render.spec.tsx`).
        */}
        {!stroked && mergedLattice && (
          <path d={mergedLattice} fill={t.channelOpenFill} stroke="none"
                data-lattice="merged" aria-hidden="true" />
        )}
      </g>}

      {/* 2. phần đã kích hoạt */}
      {shown('activation') && <g data-layer="activation" {...dim('activation')}>
        {/*
          ★ KHÔNG tô ray kênh. Ứng dụng tham chiếu để ray `cN` màu trắng KỂ CẢ khi kênh mang
          class `defined` — kiểm ngày 2026-09-21: `#c1858` và `#c952` đều
          `class="defined"` mà `getComputedStyle().fill` vẫn là `rgb(255,255,255)`.
          Toàn bộ màu đến từ lớp nửa dải `sgN`.

          Điều này ĐÚNG về mặt ý nghĩa: kênh 41-30 với cổng 41 design và cổng 30
          personality phải hiện NỬA ĐỎ NỬA ĐEN. Một ray liền không tô nửa được,
          nên tô ray sẽ đè mất thông tin nguồn kích hoạt.

          Đo trên bản vẽ: hai nửa phủ kín ray và còn chồng mép ở giữa (kênh 9-52:
          ray cao 79.6, sg9 cao 54.9 + sg52 cao 51.7, chồng ~15 đơn vị) — chồng
          mép chính là cách bản gốc tránh sinh đường ghép ở mối nối.
          Có luật kiểm điều này trong `artwork-invariants.spec.ts`.
        */}
        {/* cổng đã kích hoạt: tô nửa dải — đây là thứ sinh ra "cổng treo" */}
        {litHalves.map(h => (
          <g key={h.g}>{shape(h.d, h.paint, { 'data-gate-half': h.g, 'data-source': label(h.src) })}</g>))}
        {/* trục integration: chỉ những mảnh mà kênh defined thật sự đi qua */}
        {litExtras.map(e => (
          <g key={e.id}>{shape(e.d, e.paint, { 'data-extra-lit': e.id, 'data-source': label(e.src) })}</g>))}
        {litIntChannels.map(c => c.split
          ? <g key={`ic${c.k}`} data-int-channel={c.k} data-source={label(c.src)} data-int-split="true" />
          : <g key={`ic${c.k}`}>{shape(c.d, c.paint, { 'data-int-channel': c.k, 'data-source': label(c.src) })}</g>)}
      </g>}

      <g data-layer="channel-meta" aria-hidden="true">
        {CHANNELS.map(ch => {
          const k = `${ch.gates[0]}-${ch.gates[1]}`;
          return <g key={k} data-channel={k} data-defined={definedKeys.has(k)} />;
        })}
      </g>

      {/* 3. trung tâm vẽ đè */}
      {shown('centers') && <g data-layer="centers" {...dim('centers')}>
        {Object.entries(art.centers).map(([key, d]) => {
          const id = CENTER_BY_KEY[key]!;
          const defined = definedCenters.has(id);
          return <path key={key} d={d} fillRule="evenodd"
                       fill={defined ? t.centerFill[id] : t.centerOpenFill}
                       stroke={t.centerStroke} strokeWidth={vb.w / 400}
                       strokeLinejoin="round" data-center={key} data-defined={defined} />;
        })}
      </g>}

      {/* 4. huy hiệu số cổng */}
      {Object.keys(art.badges).length === 64 && (shown('gates') || shown('gateNumbers')) && (
        <g data-layer="gates">
          {ALL_GATES.map(g => {
            const b = art.badges[g]!;
            const src = gateSources.get(g);
            const inDefined = definedCenters.has(GATE_TO_CENTER[g]!);
            // `plain` là đĩa sáng (mặc định trắng) ⇒ giữ vành và chữ tối như cổng chưa bật.
            const custom = src ? props.gateColors?.get(g) : undefined;
            const coloured = custom !== undefined || (src !== undefined && src !== 'plain');
            const text = custom ? textOn(custom) : coloured ? t.gateTextActive : (inDefined ? t.gateTextOnFill : t.gateText);
            return (
              <g key={g} data-gate={g} data-activated={src ? label(src) : 'none'}
                 {...(custom ? { 'data-color': custom } : {})}>
                {shown('gates') && <circle cx={b.cx} cy={b.cy} r={b.r}
                        fill={custom ?? (src ? colorOf(src) : t.centerOpenFill)}
                        stroke={coloured ? 'none' : t.badgeOpenStroke} strokeWidth={vb.w / 800}
                        {...dim('gates')} />}
                {shown('gateNumbers') && <text x={b.cx} y={b.cy + b.r * 0.36} textAnchor="middle" fontSize={b.r * 1.08}
                      fontWeight={src ? 700 : 400} {...dim('gateNumbers')}
                      // ★ `t.gateTextActive`, KHÔNG ghim '#ffffff' (sửa 2026-09-24, G2): cổng
                      //   kiểm tương phản đo trường này, màn hình phải vẽ đúng nó. Bảng
                      //   Modern cần số TỐI trên đĩa ngọc; Classic vẫn trắng như cũ.
                      fill={props.gateTextAuto && src && !custom
                        ? readableOn(text, src === 'both' ? [t.design, t.personality] : [paintOf(src)]) : text}>
                  {g}
                </text>}
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}
