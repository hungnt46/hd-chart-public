'use client';
/**
 * TRỌN hình của bản vẽ (Phase 3, mockup Hưng duyệt 2026-09-29): bodygraph trơn,
 * bodygraph + cột hành tinh hai bên, hoặc Rave Mandala có bodygraph ở tâm. MỘT
 * component cho khung vẽ và khung xem trước — ảnh xuất lấy đúng SVG này.
 *
 * ★ Bodygraph trơn vẽ THẲNG `BodygraphArtwork` như Phase 2 (ảnh tham chiếu
 *   `illustrator-sample` là cổng kiểm). Hai kiểu kia ghép bằng MỘT `<svg>` ngoài
 *   chứa các `<svg x y width height>` con — mỗi phần giữ nguyên viewBox và
 *   `preserveAspectRatio` của nó, không dựng lại bố cục lần hai; tệp xuất vì thế
 *   là một SVG tự chứa, `compose-svg` chỉ việc đặt nó.
 * ★ Cột hành tinh cùng hệ tỉ lệ với biểu đồ, cao BẰNG biểu đồ, áp sát — như tab
 *   Bodygraph (`PlanetColumn`, `COLUMN_ASPECT`). Chỉ hiện khi đã gán ít nhất
 *   một hành tinh; 13 dòng, dòng chưa gán in "—" (Hưng chốt câu D).
 * ★ Mandala: khổ xuất = cạnh vuông bằng chiều cao bản vẽ (≈1334 ở Classic) —
 *   để 1× không ra ảnh bé tí theo viewBox 620 của mandala.
 */
import type { JSX } from 'react';
import { BodygraphArtwork } from '../bodygraph/BodygraphArtwork.js';
import { PlanetColumn, COLUMN_ASPECT } from '../planet-columns/PlanetColumn.js';
import { Mandala, mandalaSide } from '../mandala/Mandala.js';
import { HubBodygraph } from '../mandala/HubBodygraph.js';
import { hasPlanets, toActivationSets, toRenderSets, type IllustrationState } from '../../lib/illustrator/model.js';
import { artworkProps, artworkSize, illustrationTheme } from './render.js';

export type FigureKind = 'bodygraph' | 'columns' | 'mandala';

export function figureKind(s: IllustrationState): FigureKind {
  if (s.appearance.mandala) return 'mandala';
  return s.appearance.planets && hasPlanets(s) ? 'columns' : 'bodygraph';
}

/** Khổ gốc (1×) của trọn hình. */
export function figureSize(s: IllustrationState): { w: number; h: number } {
  const { w, h } = artworkSize(s);
  switch (figureKind(s)) {
    case 'bodygraph': return { w, h };
    case 'columns': return { w: Math.round(w + 2 * h * COLUMN_ASPECT), h };
    case 'mandala': return { w: h, h };
  }
}

export function IllustrationFigure({ s, className, testId }: {
  s: IllustrationState; className?: string;
  /** testId của BODYGRAPH (mặc định `bodygraph`); ảnh xem trước đặt tên khác. */
  testId?: string;
}): JSX.Element {
  const kind = figureKind(s);
  const props = artworkProps(s);
  if (kind === 'bodygraph') return <BodygraphArtwork {...props} className={className} testId={testId} />;

  const { w, h } = figureSize(s);
  const sets = toActivationSets(s);
  if (kind === 'columns') {
    const cw = h * COLUMN_ASPECT, bw = artworkSize(s).w;
    const chartSets = [sets.personality, sets.design];
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className={className} data-figure="columns" role="group">
        <svg x={0} y={0} width={cw} height={h}>
          <PlanetColumn set={sets.design} chartSets={chartSets} side="design" />
        </svg>
        <svg x={cw} y={0} width={bw} height={h}>
          <BodygraphArtwork {...props} testId={testId} />
        </svg>
        <svg x={cw + bw} y={0} width={cw} height={h}>
          <PlanetColumn set={sets.personality} chartSets={chartSets} side="personality" />
        </svg>
      </svg>
    );
  }

  const rs = toRenderSets(s);
  const th = illustrationTheme(s);
  const zodiac = s.appearance.zodiac === true;
  const side = mandalaSide(zodiac);
  return (
    <svg viewBox={`0 0 ${side} ${side}`} className={className} data-figure="mandala" role="group">
      <Mandala personality={sets.personality} design={sets.design} activatedGates={new Set(rs.gateSources.keys())}
               gateSources={rs.gateSources} theme={s.appearance.theme} zodiac={zodiac}
               colors={{ design: th.design, personality: th.personality, centerFill: th.centerFill }}>
        <HubBodygraph theme={s.appearance.theme} zodiac={zodiac} definedCenters={rs.definedCenters}
                      definedChannels={rs.definedChannels} gateSources={rs.gateSources} channelSources={rs.channelSources}
                      themeOverride={props.themeOverride} layers={s.appearance.layers} gateColors={rs.gateColors}
                      gateTextAuto />
      </Mandala>
    </svg>
  );
}
