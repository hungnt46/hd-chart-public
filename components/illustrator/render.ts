/**
 * Bản vẽ → đúng các prop `BodygraphArtwork` nhận. MỘT chỗ, để khung vẽ, ảnh
 * xem trước và ảnh nhỏ ở màn chào không lệch nhau.
 */
import { ARTWORKS } from '../bodygraph/artworks/index.js';
import type { BodygraphArtworkProps } from '../bodygraph/BodygraphArtwork.js';
import { THEMES, type BodygraphTheme } from '../bodygraph/theme.js';
import { themeWithColors } from '../bodygraph/custom-colors.js';
import {
  emptyIllustration, setGateSide, toRenderSets, type GateSide, type IllustrationState,
} from '../../lib/illustrator/model.js';

export type ArtworkProps = Omit<BodygraphArtworkProps, 'className' | 'title'>;

/** Bảng màu thật đang dùng: chủ đề gốc + màu người dùng tự chọn. */
export function illustrationTheme(s: IllustrationState): BodygraphTheme {
  return themeWithColors(THEMES[s.appearance.theme], s.appearance.colors);
}

export function artworkProps(s: IllustrationState): ArtworkProps {
  const theme = s.appearance.theme;
  const colors = s.appearance.colors;
  return {
    art: ARTWORKS[THEMES[theme].artwork],
    theme,
    // Không có màu tự chọn ⇒ không truyền `themeOverride`: vẽ đúng chủ đề gốc đã qua kiểm.
    themeOverride: Object.keys(colors).length ? illustrationTheme(s) : undefined,
    layers: s.appearance.layers,
    gateTextAuto: true,
    ...toRenderSets(s),
  };
}

/** Khổ gốc của ảnh xuất ở 1× = khung viewBox của bản vẽ (Classic 1379 × 1334). */
export function artworkSize(s: IllustrationState): { w: number; h: number } {
  const vb = ARTWORKS[THEMES[s.appearance.theme].artwork].viewBox;
  return { w: Math.round(vb.w), h: Math.round(vb.h) };
}

/** Bản vẽ mẫu cho ảnh nhỏ ở màn chào — đúng bản trong mockup Hưng duyệt. */
export const SAMPLE: IllustrationState = (
  [[20, 'design'], [34, 'personality'], [1, 'both'], [8, 'design'], [41, 'personality'],
    [59, 'plain'], [10, 'plain'], [57, 'plain'], [25, 'plain']] as [number, GateSide][]
).reduce((s, [g, side]) => setGateSide(s, g, side), emptyIllustration('mechanics'));
