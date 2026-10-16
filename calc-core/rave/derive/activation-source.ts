/**
 * Cổng/kênh được kích hoạt từ phía nào — phục vụ quy ước màu của bodygraph.
 * HD chuẩn: Personality = ĐEN, Design = ĐỎ, cả hai = nửa đen nửa đỏ.
 */
import { Body } from '../../ephemeris/bodies.js';
import type { RaveChart } from '../chart.js';
import type { ChannelDef } from './tables.js';

export type ActivationSource = 'personality' | 'design' | 'both';

/** Cổng nào được kích hoạt, và bởi phía nào. */
export function gateActivationSources(
  chart: RaveChart,
  definingBodies: readonly Body[],
): Map<number, ActivationSource> {
  const p = new Set<number>(), d = new Set<number>();
  for (const b of definingBodies) {
    const ap = chart.personality.byBody[b];
    if (ap) p.add(ap.position.gate);
    const ad = chart.design.byBody[b];
    if (ad) d.add(ad.position.gate);
  }
  const out = new Map<number, ActivationSource>();
  for (const g of p) out.set(g, d.has(g) ? 'both' : 'personality');
  for (const g of d) if (!out.has(g)) out.set(g, 'design');
  return out;
}

/**
 * Nguồn kích hoạt của một kênh defined: gộp nguồn của hai cổng.
 * Hai cổng khác phía ⇒ kênh là 'both' (nửa đen nửa đỏ).
 */
export function channelActivationSource(
  channel: ChannelDef,
  gateSources: ReadonlyMap<number, ActivationSource>,
): ActivationSource {
  const a = gateSources.get(channel.gates[0]);
  const b = gateSources.get(channel.gates[1]);
  if (!a || !b) throw new Error(`Kênh ${channel.gates.join('-')} chưa defined`);
  if (a === b) return a;
  return 'both';
}
