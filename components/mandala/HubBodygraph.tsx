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
 *   Đĩa đã BỎ 2026-09-29 (nền trắng như bản tham chiếu). Từ 2026-10-26 kênh mở tự đứng được nhờ ruột XÁM của
 *   theme chính (`OPEN_CHANNEL`, `theme.ts`) — không viền riêng, không bóng người.
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

/*
 * ★ Bodygraph ở tâm dùng ĐÚNG theme chính, cả Classic lẫn Modern (Hưng chốt 2026-10-26,
 *   `docs/PLAN-bodygraph-aura.md` §2 · §6.1): ruột kênh xám, không viền lưới, không bóng người — một luật duy nhất.
 *   Trước đó (2026-09-29 → 10-26) ở tâm có luật riêng: Classic viền mảnh `HUB_OUTLINE`, Modern giữ bóng người.
 */

export function HubBodygraph({ theme, zodiac, ...rest }: HubBodygraphProps): JSX.Element {
  const art = ARTWORKS[THEMES[theme].artwork];
  const fit = useMemo(() => hubFit(Object.values(art.centers)), [art]);
  /* Không nền ở tâm, kể cả khi Illustrator tự chọn màu nền — chỉ chín trung tâm phải vừa `HUB_R`. */
  const bare = useMemo(() => ({ ...art, triangle: undefined, figure: undefined }), [art]);
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
      <g clipPath={`url(#${clipId})`} data-hub-style="plain">
        <g transform={`translate(${CENTER.x} ${CENTER.y}) scale(${k.toFixed(5)}) translate(${(-px).toFixed(3)} ${(-py).toFixed(3)})`}
           data-hub-bodygraph={art.id}>
          <BodygraphArtwork art={bare} theme={theme} {...rest} />
        </g>
      </g>
    </>
  );
}
