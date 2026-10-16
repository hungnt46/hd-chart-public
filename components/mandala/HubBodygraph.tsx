/**
 * Bodygraph đặt ở TÂM Mandala (M3, Hưng chốt 2026-09-25).
 *
 * ★ Hai điều Hưng dặn khi xem bản thử:
 *   · thu cho VỪA vòng trong — không đè lên đường ray hay ký hiệu hành tinh nào
 *     (bản thử để nó phủ lên cả vòng tròn lẫn hành tinh);
 *   · BỎ NỀN (tam giác + hình người) "cho gọn" — ở tâm mandala chỉ cần mạng lưới
 *     để đọc hành tinh chụm ở cổng nào thuộc trung tâm nào.
 *   Nhờ bỏ nền, phần phải vừa vòng tròn chỉ còn CHÍN TRUNG TÂM: `hubFit` đo tâm
 *   và bán kính bao từ chính path trung tâm của bản vẽ, rồi thu để bán kính đó
 *   bằng `HUB_R`.
 * ★ Góp ý lần hai (cùng ngày): bỏ nền rồi thì trung tâm TRỐNG và kênh MỞ — đều
 *   trắng — biến mất vào nền trắng của mandala. Lúc đó đặt một ĐĨA XÁM sau lưng.
 *   Đĩa đã BỎ 2026-09-29 (nền trắng như bản tham chiếu) — cách giữ kênh khỏi chìm nay là
 *   viền mảnh (Classic) / bóng người (Modern), xem `HUB_OUTLINE` bên dưới.
 *
 * Cách đặt: `<svg>` con không kích thước phủ trọn khung vuông của mandala
 * (`mandalaSide`) và "meet" viewBox của bản vẽ vào đó; phép biến đổi dưới đây
 * đưa TÂM mạng lưới về tâm mandala và thu bán kính bao về `HUB_R`.
 */
import { useId, useMemo, type JSX } from 'react';
import type { CenterId, ChannelDef } from '../../calc-core/rave/derive/tables.js';
import type { DisplaySource, LayerKey, LayerSetting } from '../bodygraph/display-source.js';
import { BodygraphArtwork } from '../bodygraph/BodygraphArtwork.js';
import type { BodygraphTheme } from '../bodygraph/theme.js';
import { ARTWORKS } from '../bodygraph/artworks/index.js';
import { THEMES, type ThemeName } from '../bodygraph/theme.js';
import { CENTER } from './geometry.js';
import { HUB_R, WEDGE_INNER, mandalaSide } from './Mandala.js';
import { hubFit } from './layout.js';

export interface HubBodygraphProps {
  definedCenters: ReadonlySet<CenterId>;
  definedChannels: readonly ChannelDef[];
  gateSources: ReadonlyMap<number, DisplaySource>;
  channelSources: ReadonlyMap<string, DisplaySource>;
  /** Illustrator (Phase 3): màu tự chọn, lớp, màu riêng từng cổng — chuyển thẳng xuống renderer. */
  themeOverride?: BodygraphTheme;
  layers?: Partial<Record<LayerKey, LayerSetting>>;
  gateColors?: ReadonlyMap<number, string>;
  gateTextAuto?: boolean;
  theme: ThemeName;
  /** Mandala có vành hoàng đạo không — khung vuông nở ra, phép thu đổi theo. */
  zodiac: boolean;
  title?: string;
}

/**
 * ★ Đổi 2026-09-29 (Hưng chọn phương án b sau khi so với các ứng dụng tham chiếu):
 *   mandala nền TRẮNG, bỏ ĐĨA XÁM. Mỗi chủ đề giữ trung tâm trống / kênh mở khỏi
 *   chìm vào nền trắng bằng cách hợp với nó nhất:
 *   · Classic — VIỀN MẢNH quanh lưới kênh (`channelOpenStroke`, cùng màu viền
 *     trung tâm `#807c7c`); không nền.
 *   · Modern — giữ BÓNG NGƯỜI xám của bản vẽ `alternate` như bản tham chiếu, không viền:
 *     kênh Modern là đường cong, viền hai bên từng kênh thành một mớ đường mảnh
 *     (đã thử trên mockup, Hưng thấy). Bóng người cắt gọn trong vòng trong.
 *   Viền chỉ bật cho bodygraph Ở TÂM mandala — bodygraph chính vẫn KHÔNG viền lưới
 *   (STATUS §5 #3).
 */
const HUB_OUTLINE = '#807c7c';

export function HubBodygraph({ theme, zodiac, ...rest }: HubBodygraphProps): JSX.Element {
  const art = ARTWORKS[THEMES[theme].artwork];
  const fit = useMemo(() => hubFit(Object.values(art.centers)), [art]);
  const withFigure = theme === 'modern';
  /* Không tam giác; bóng người chỉ giữ ở Modern (xem trên). */
  const bare = useMemo(() => ({ ...art, triangle: undefined, figure: withFigure ? art.figure : undefined }), [art, withFigure]);
  /* Nền = màu Illustrator tự chọn (nếu có) rồi mới thêm viền — thống nhất với Phase 3. */
  const base = rest.themeOverride;
  const themeOverride = useMemo(
    () => (withFigure ? base : { ...(base ?? THEMES[theme]), channelOpenStroke: HUB_OUTLINE }), [base, theme, withFigure]);
  const clipId = `hub-clip-${useId().replace(/:/g, '')}`;

  const side = mandalaSide(zodiac);
  const vb = art.viewBox;
  const f = side / Math.max(vb.w, vb.h);                 // "meet" viewBox vào khung vuông
  const px = (side - vb.w * f) / 2 + (fit.cx - vb.minX) * f;
  const py = (side - vb.h * f) / 2 + (fit.cy - vb.minY) * f;
  const k = HUB_R / (fit.rMax * f);

  return (
    <>
      <clipPath id={clipId}>
        <circle cx={CENTER.x} cy={CENTER.y} r={WEDGE_INNER - 1} />
      </clipPath>
      <g clipPath={`url(#${clipId})`} data-hub-style={withFigure ? 'figure' : 'outline'}>
        <g transform={`translate(${CENTER.x} ${CENTER.y}) scale(${k.toFixed(5)}) translate(${(-px).toFixed(3)} ${(-py).toFixed(3)})`}
           data-hub-bodygraph={art.id}>
          <BodygraphArtwork art={bare} theme={theme} {...rest} {...(themeOverride ? { themeOverride } : {})} />
        </g>
      </g>
    </>
  );
}
