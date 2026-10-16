/**
 * Đăng ký các bản vẽ bodygraph. Dữ liệu SINH TỰ ĐỘNG từ ../hd-corpus bằng
 * `node components/bodygraph/generate/extract-artworks.mjs` — đừng sửa JSON tay.
 */
import type { ArtworkGeometry } from '../BodygraphArtwork.js';
import type { ArtworkId } from '../theme.js';
import hdkit from './hdkit.json' with { type: 'json' };
import alternate from './alternate.json' with { type: 'json' };

export const ARTWORKS: Readonly<Record<ArtworkId, ArtworkGeometry>> = Object.freeze({
  hdkit: hdkit as unknown as ArtworkGeometry,
  alternate: alternate as unknown as ArtworkGeometry,
});
