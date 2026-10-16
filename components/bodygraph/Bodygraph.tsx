/**
 * Bodygraph — chọn BẢN VẼ theo chủ đề, rồi giao cho renderer chung.
 *
 * ★ Đổi 2026-09-21. Trước đây file này tự vẽ từ toạ độ đọc lại từ Jovian
 * (`geometry.ts` + `gate-bars.ts`). Bản đó vẽ SAI — đã bỏ. Nay hình học lấy từ
 * các bản vẽ vector gốc trong ../hd-corpus, trích ra `artworks/*.json`:
 *
 *   chủ đề `classic` → bản vẽ `hdkit`     (dải thẳng, gần chế độ Classic)
 *   chủ đề `modern`  → bản vẽ `alternate` (kênh cong, gần chế độ Modern)
 *
 * Toàn bộ logic vẽ nằm ở `BodygraphArtwork.tsx`; file này chỉ nối chủ đề ↔ bản vẽ,
 * và giữ nguyên API cũ để trang và test không phải đổi.
 */
import type { JSX } from 'react';
import { BodygraphArtwork } from './BodygraphArtwork.js';
import { ARTWORKS } from './artworks/index.js';
import { THEMES, compositeTheme, type ThemeName } from './theme.js';
import { useCompositePalette } from './CompositePaletteProvider.js';
import type { CenterId, ChannelDef } from '../../calc-core/rave/derive/tables.js';
import type { ActivationSource } from '../../calc-core/rave/derive/activation-source.js';

export interface BodygraphProps {
  definedCenters: ReadonlySet<CenterId>;
  definedChannels: readonly ChannelDef[];
  gateSources: ReadonlyMap<number, ActivationSource>;
  channelSources: ReadonlyMap<string, ActivationSource>;
  theme?: ThemeName;
  /** Chart ghép (transit / chu kỳ chồng lên chart cá nhân) — tô theo BÊN. */
  composite?: boolean;
  className?: string;
  title?: string;
  /** `data-testid` khác `bodygraph` — bodygraph PHỤ (thẻ "Bầu trời lúc này"); e2e chờ `bodygraph` để biết chart đã tính. */
  testId?: string;
}

export function Bodygraph(props: BodygraphProps): JSX.Element {
  const themeName = props.theme ?? 'classic';
  const art = ARTWORKS[THEMES[themeName].artwork];
  // Chart ghép đọc bảng màu đang chọn — Classic (mặc định) hay Modern (STATUS §4 G2).
  const { palette } = useCompositePalette();
  return <BodygraphArtwork art={art} {...props} theme={themeName}
                           themeOverride={props.composite ? compositeTheme(THEMES[themeName], palette) : undefined} />;
}
