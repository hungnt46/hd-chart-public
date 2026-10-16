/**
 * BodyGraph Illustrator — mô hình bản vẽ (docs/PLAN-illustrator.md Phase 1a).
 *
 * Bản vẽ là dữ liệu NGƯỜI DÙNG TỰ NHẬP, không phải kết quả tính: không có ngày
 * sinh, không có hành tinh. Nó chỉ giữ cổng nào bật, phía nào, và (ở chế độ Free
 * draw) trung tâm nào tô. Mọi thứ khác — kênh, nguồn kênh — SUY RA lúc vẽ bằng
 * đúng bộ luật của chart thật (`deriveStructure`), nên hai nơi không lệch nhau.
 *
 * Thuần: không React, không DOM. Mọi thao tác trả state MỚI, không sửa tại chỗ.
 */
import { CenterId, type ChannelDef } from '../../calc-core/rave/derive/tables.js';
import { deriveStructure } from '../../calc-core/rave/derive/structure.js';
import { gateActivationSources } from '../../calc-core/rave/derive/activation-source.js';
import { Body, DEFINING_BODIES_STANDARD } from '../../calc-core/ephemeris/bodies.js';
import type { RaveChart } from '../../calc-core/rave/chart.js';
import type { ActivationSet } from '../../calc-core/rave/activations.js';
import { longitudeToPosition } from '../../calc-core/rave/position.js';
import { DEG_PER_GATE, DEG_PER_LINE, WHEEL, WHEEL_OFFSET, mod360 } from '../../calc-core/rave/constants.js';
import { combineSources, type DisplaySource, type LayerKey, type LayerSetting } from '../../components/bodygraph/display-source.js';
import type { ColorOverrides } from '../../components/bodygraph/custom-colors.js';
import type { ThemeName } from '../../components/bodygraph/theme.js';

/**
 * `free` — bật/tắt tự do, trung tâm tô theo tay.
 * `mechanics` — như chart thật: trung tâm chỉ định hình khi có kênh trọn.
 */
export type IllustrationMode = 'free' | 'mechanics';

/** `plain` = cổng bật nhưng chưa gán phía (app tham chiếu vẽ trắng). */
export type GateSide = DisplaySource;
const SIDES: readonly GateSide[] = ['plain', 'personality', 'design', 'both'];

/**
 * Một LẦN kích hoạt của cổng (Phase 3, menu "…" từng cổng — như app tham chiếu): phía,
 * hào, hành tinh. Một cổng có thể có nhiều lần (Mặt Trời Design + Mặt Trăng
 * Personality ở cùng cổng). `body`/`line` null = "không hành tinh" / chưa chọn
 * hào — cổng vẫn tô theo phía, chỉ không lên cột hành tinh / mandala.
 * Có hành tinh thì BẮT BUỘC có hào (`normAct` điền hào 1): cột in `cổng.hào`.
 */
export type ActSide = 'design' | 'personality';
export interface GateAct { side: ActSide; line: number | null; body: Body | null }

/**
 * Một cổng đã bật. Phase 3 thêm `acts` và `color` — trường TUỲ CHỌN, không đổi
 * hình dạng, nên bản đã lưu ở Phase 2 vẫn đọc được (vẫn `version` 1).
 *
 * ★ Bất biến: `acts` không mâu thuẫn `side`. `side` = phía gộp của `acts` khi
 *   `acts` không rỗng (design + personality ⇒ both). Bút đổi phía thì bỏ những
 *   lần kích hoạt KHÁC phía bút (`plain` bỏ hết) — Hoàn tác lấy lại được.
 */
export interface GateMark {
  side: GateSide;
  acts?: readonly GateAct[];
  /** Màu riêng của cổng (đĩa + nửa dải) — đè màu phía. */
  color?: string;
}

export interface Appearance {
  theme: ThemeName;
  layers: Partial<Record<LayerKey, LayerSetting>>;
  colors: ColorOverrides;
  /** Phase 3: cột hành tinh hai bên (chỉ khi có hành tinh được gán). Mặc định tắt. */
  planets?: boolean;
  /** Phase 3: vẽ trong Rave Mandala (bodygraph ở tâm). Mặc định tắt. */
  mandala?: boolean;
  /** Vành 12 cung hoàng đạo quanh mandala. */
  zodiac?: boolean;
}

export interface IllustrationMeta { name: string; copyright: string }

export interface IllustrationState {
  mode: IllustrationMode;
  gates: ReadonlyMap<number, GateMark>;
  /** Chỉ có nghĩa ở `free`. Ở `mechanics` trung tâm luôn suy từ cổng. */
  centers: ReadonlySet<CenterId>;
  appearance: Appearance;
  meta: IllustrationMeta;
}

export const ALL_GATES: readonly number[] = Array.from({ length: 64 }, (_, i) => i + 1);
export const ALL_CENTERS: readonly CenterId[] = [
  CenterId.Head, CenterId.Ajna, CenterId.Throat, CenterId.G, CenterId.Heart,
  CenterId.Sacral, CenterId.Spleen, CenterId.SolarPlexus, CenterId.Root,
];

export function emptyIllustration(mode: IllustrationMode = 'mechanics'): IllustrationState {
  return {
    mode, gates: new Map(), centers: new Set(),
    appearance: { theme: 'classic', layers: {}, colors: {} },
    meta: { name: '', copyright: '' },
  };
}

/** Trung tâm do cổng tạo ra — luật của chart thật. */
const derivedCenters = (gates: ReadonlyMap<number, GateMark>): Set<CenterId> =>
  new Set(deriveStructure(new Set(gates.keys())).definedCenters);

/* ─────────────────────────── thao tác ─────────────────────────── */

export function toggleGate(s: IllustrationState, gate: number, side: GateSide = 'plain'): IllustrationState {
  assertGate(gate);
  const gates = new Map(s.gates);
  if (gates.has(gate)) gates.delete(gate); else gates.set(gate, { side });
  return { ...s, gates };
}

/** Đổi phía của một cổng ĐÃ bật; cổng chưa bật thì bật luôn với phía đó. */
export function setGateSide(s: IllustrationState, gate: number, side: GateSide): IllustrationState {
  assertGate(gate);
  const gates = new Map(s.gates);
  const old = gates.get(gate);
  const acts = old?.acts?.filter(a => side === 'both' || a.side === side) ?? [];
  gates.set(gate, withActs({ ...old, side }, acts));
  return { ...s, gates };
}

/** Phía gộp của các lần kích hoạt; rỗng ⇒ `null`. */
export function sideOfActs(acts: readonly GateAct[]): GateSide | null {
  const d = acts.some(a => a.side === 'design'), p = acts.some(a => a.side === 'personality');
  return d && p ? 'both' : d ? 'design' : p ? 'personality' : null;
}

/** Gắn `acts` vào mark, giữ bất biến: có acts ⇒ `side` theo acts; rỗng ⇒ bỏ trường. */
function withActs(m: GateMark, acts: readonly GateAct[]): GateMark {
  const { acts: _drop, ...rest } = m;
  const side = sideOfActs(acts);
  // Bút `both` cho phép acts chỉ một phía (cổng vẫn sọc) — mọi phía khác theo acts.
  return acts.length ? { ...rest, side: m.side === 'both' ? 'both' : side!, acts } : rest;
}

const normAct = (a: GateAct): GateAct =>
  ({ side: a.side, body: a.body, line: a.body !== null && a.line === null ? 1 : a.line });

/**
 * Đặt DANH SÁCH lần kích hoạt của một cổng (menu "…"). Cổng chưa bật thì bật.
 * `side` theo acts; acts rỗng ⇒ giữ phía đang có. Một thiên thể chỉ ở MỘT chỗ
 * mỗi phía (như chart thật): gán Mặt Trời Design ở đây là gỡ nó khỏi cổng khác
 * — cổng kia giữ phía nếu còn acts, không thì giữ phía cũ.
 */
export function setGateActs(s: IllustrationState, gate: number, acts: readonly GateAct[]): IllustrationState {
  assertGate(gate);
  const next = acts.map(normAct);
  for (const a of next) assertAct(a, gate);
  const slot = (a: GateAct) => `${a.side}:${String(a.body)}`;
  const taken = new Set(next.filter(a => a.body !== null).map(slot));
  const gates = new Map<number, GateMark>();
  for (const [g, m] of s.gates) {
    if (g === gate || !m.acts?.some(a => taken.has(slot(a)))) { gates.set(g, m); continue; }
    const kept = m.acts.filter(a => !taken.has(slot(a)));
    gates.set(g, kept.length ? withActs({ ...m, side: sideOfActs(kept)! }, kept) : withActs(m, []));
  }
  const old = s.gates.get(gate) ?? { side: 'plain' as const };
  gates.set(gate, next.length ? withActs({ ...old, side: sideOfActs(next)! }, next) : withActs(old, []));
  return { ...s, gates };
}

/** Màu riêng của cổng; `null` ⇒ bỏ, về màu phía. Cổng chưa bật thì không làm gì. */
export function setGateColor(s: IllustrationState, gate: number, color: string | null): IllustrationState {
  assertGate(gate);
  const m = s.gates.get(gate);
  if (!m) return s;
  const { color: _old, ...rest } = m;
  const gates = new Map(s.gates);
  gates.set(gate, color === null ? rest : { ...rest, color: assertColor(color) });
  return { ...s, gates };
}

/**
 * "Bút" của Illustrator (Hưng duyệt mockup Phase 2, 2026-09-28): bấm một cổng
 * TẮT ⇒ bật bằng phía của bút; bấm cổng đang bật CÙNG phía ⇒ tắt; KHÁC phía ⇒
 * đổi sang phía của bút. Một cú bấm làm được cả ba việc, không cần menu.
 */
export function paintGate(s: IllustrationState, gate: number, brush: GateSide): IllustrationState {
  assertGate(gate);
  return s.gates.get(gate)?.side === brush ? toggleGate(s, gate) : setGateSide(s, gate, brush);
}

/**
 * Bật/tắt ĐỦ hai cổng của kênh: đang trọn thì tắt cả hai, còn lại thì bật cả hai
 * (cổng đã bật giữ nguyên phía, cổng mới lấy `side` — phía của bút).
 */
export function toggleChannel(s: IllustrationState, channel: ChannelDef, side: GateSide = 'plain'): IllustrationState {
  const [a, b] = channel.gates;
  const gates = new Map(s.gates);
  if (gates.has(a) && gates.has(b)) { gates.delete(a); gates.delete(b); }
  else for (const g of [a, b]) if (!gates.has(g)) gates.set(g, { side });
  return { ...s, gates };
}

/** Chỉ ở Free draw. Ở mechanics trung tâm là hệ quả, bấm vào không làm gì. */
export function toggleCenter(s: IllustrationState, center: CenterId): IllustrationState {
  if (s.mode !== 'free') return s;
  const centers = new Set(s.centers);
  if (centers.has(center)) centers.delete(center); else centers.add(center);
  return { ...s, centers };
}

/**
 * Đổi chế độ KHÔNG mất cổng. Trung tâm được suy lại từ cổng — sang `free` thì
 * hình giữ nguyên như vừa thấy rồi mới tự do sửa tiếp.
 */
export function setMode(s: IllustrationState, mode: IllustrationMode): IllustrationState {
  if (s.mode === mode) return s;
  return { ...s, mode, centers: derivedCenters(s.gates) };
}

export function clear(s: IllustrationState): IllustrationState {
  return { ...s, gates: new Map(), centers: new Set() };
}

export function isEmpty(s: IllustrationState): boolean {
  return s.gates.size === 0 && (s.mode === 'mechanics' || s.centers.size === 0);
}

/** Bật cả 64 cổng (`plain`), và ở Free draw thì cả 9 trung tâm. */
export function all(s: IllustrationState): IllustrationState {
  const gates = new Map(ALL_GATES.map(g => [g, s.gates.get(g) ?? { side: 'plain' as const }]));
  return { ...s, gates, centers: s.mode === 'free' ? new Set(ALL_CENTERS) : derivedCenters(gates) };
}

/* ─────────────────────────── suy ra tập để vẽ ─────────────────────────── */

export interface RenderSets {
  definedCenters: ReadonlySet<CenterId>;
  definedChannels: readonly ChannelDef[];
  gateSources: ReadonlyMap<number, DisplaySource>;
  channelSources: ReadonlyMap<string, DisplaySource>;
  /** Chỉ những cổng có màu riêng. */
  gateColors: ReadonlyMap<number, string>;
}

export function toRenderSets(s: IllustrationState): RenderSets {
  const st = deriveStructure(new Set(s.gates.keys()));
  const gateSources = new Map([...s.gates].map(([g, m]) => [g, m.side] as const));
  // `deriveStructure` chỉ trả kênh ĐỦ hai cổng nên `get` không bao giờ hụt.
  // Gộp nguồn bằng `combineSources` (tầng hiển thị, hiểu `plain`), KHÔNG bằng
  // `channelActivationSource` của calc-core.
  const channelSources = new Map(st.definedChannels.map(ch =>
    [`${ch.gates[0]}-${ch.gates[1]}`, combineSources(gateSources.get(ch.gates[0])!, gateSources.get(ch.gates[1])!)] as const));
  return {
    definedCenters: s.mode === 'mechanics' ? st.definedCenters : s.centers,
    definedChannels: st.definedChannels,
    gateSources, channelSources,
    gateColors: new Map([...s.gates].flatMap(([g, m]) => (m.color ? [[g, m.color] as const] : []))),
  };
}

/* ─────────────────────────── hành tinh giả cho cột + mandala ─────────────────────────── */

/**
 * Kinh độ GIỮA hào `line` của cổng `gate` — suy ngược bánh xe, rồi
 * `longitudeToPosition` ra lại đúng cổng.hào (có test khứ hồi cả 384 ô).
 * Giữa hào ⇒ color/tone/base là giá trị giữa, không mang nghĩa gì: cột chỉ in
 * `cổng.hào`, mandala chỉ cần cổng.
 */
export function lineMidLongitude(gate: number, line: number): number {
  const slot = WHEEL.indexOf(gate);
  if (slot < 0 || !Number.isInteger(line) || line < 1 || line > 6) throw new Error(`Cổng/hào ${gate}.${line} không hợp lệ`);
  return mod360(slot * DEG_PER_GATE + (line - 0.5) * DEG_PER_LINE + WHEEL_OFFSET);
}

/**
 * Bộ kích hoạt GIẢ từ những lần kích hoạt có hành tinh + hào — đưa thẳng vào
 * `PlanetColumn` / `Mandala` (plan Phase 3.4). `jdUT` = NaN: bản vẽ không có
 * thời điểm, nơi dùng phải tắt dòng ngày giờ (`showDate=false`).
 */
export function toActivationSets(s: IllustrationState): { design: ActivationSet; personality: ActivationSet } {
  const out = { design: { jdUT: NaN, byBody: {} }, personality: { jdUT: NaN, byBody: {} } } as
    Record<ActSide, { jdUT: number; byBody: Partial<Record<Body, ActivationSet['byBody'][Body]>> }>;
  for (const [g, m] of [...s.gates].sort((a, b) => a[0] - b[0])) {
    for (const a of m.acts ?? []) {
      if (a.body === null || a.line === null) continue;
      const longitude = lineMidLongitude(g, a.line);
      out[a.side].byBody[a.body] = { body: a.body, longitude, position: longitudeToPosition(longitude) };
    }
  }
  return out;
}

/** Có ít nhất một hành tinh được gán — giao diện mới có gì để hiện ở cột. */
export const hasPlanets = (s: IllustrationState): boolean =>
  [...s.gates.values()].some(m => m.acts?.some(a => a.body !== null));

/* ─────────────────────────── nạp từ chart ─────────────────────────── */

/**
 * Lấy chart đã tính làm điểm xuất phát: cổng + phía Design/Personality/both,
 * chế độ mechanics. Cùng bộ thiên thể với bodygraph (`DEFINING_BODIES_STANDARD`,
 * không Chiron) nên hình ra y hệt tab Chart.
 */
export function fromChart(chart: RaveChart, base: IllustrationState = emptyIllustration()): IllustrationState {
  const src = gateActivationSources(chart, DEFINING_BODIES_STANDARD);
  // Phase 3: mang theo hành tinh + hào — cột hành tinh / mandala ra đúng như chart.
  const acts = new Map<number, GateAct[]>();
  for (const side of ['design', 'personality'] as const) {
    for (const b of DEFINING_BODIES_STANDARD) {
      const p = chart[side].byBody[b]?.position;
      if (p) acts.set(p.gate, [...(acts.get(p.gate) ?? []), { side, line: p.line, body: b }]);
    }
  }
  const gates = new Map<number, GateMark>([...src].map(([g, side]) => [g, withActs({ side }, acts.get(g) ?? [])] as const));
  return { ...base, mode: 'mechanics', gates, centers: derivedCenters(gates) };
}

/* ─────────────────────────── tuần tự hoá ─────────────────────────── */

export const ILLUSTRATION_VERSION = 1;

/**
 * Dạng JSON của bản vẽ — cũng là dạng nằm trong Kho chart và gói xuất/nhập
 * (`lib/storage`, Phase 3): là object chứ không phải chuỗi, để tệp gói đọc/sửa
 * tay được như phần chart.
 */
export interface IllustrationJson {
  version: number;
  mode: IllustrationMode;
  gates: [number, GateMark][];
  centers: number[];
  appearance: Appearance;
  meta: IllustrationMeta;
}

export function toJson(s: IllustrationState): IllustrationJson {
  return {
    version: ILLUSTRATION_VERSION,
    mode: s.mode,
    // thứ tự khoá CỐ ĐỊNH ⇒ cùng nội dung ra cùng chuỗi (gói xuất diff được)
    gates: [...s.gates].sort((a, b) => a[0] - b[0]).map(([g, m]) => [g, {
      side: m.side,
      ...(m.acts ? { acts: m.acts.map(a => ({ side: a.side, line: a.line, body: a.body })) } : {}),
      ...(m.color ? { color: m.color } : {}),
    }]),
    // mechanics: ghi trung tâm SUY RA (thứ đang thấy), không phải `s.centers` có thể cũ
    centers: [...(s.mode === 'mechanics' ? derivedCenters(s.gates) : s.centers)].sort((a, b) => a - b),
    appearance: s.appearance,
    meta: s.meta,
  };
}

export const serialize = (s: IllustrationState): string => JSON.stringify(toJson(s));

/** Đọc lại; dữ liệu hỏng hoặc khác phiên bản thì NÉM, không đoán giúp. */
export const parse = (text: string): IllustrationState => fromJson(JSON.parse(text));

export function fromJson(raw: unknown): IllustrationState {
  if (typeof raw !== 'object' || raw === null) throw new Error('Bản vẽ: không phải object');
  const j = raw as Partial<IllustrationJson>;
  if (j.version !== ILLUSTRATION_VERSION) throw new Error(`Bản vẽ: phiên bản ${String(j.version)} không đọc được`);
  if (j.mode !== 'free' && j.mode !== 'mechanics') throw new Error('Bản vẽ: chế độ không hợp lệ');
  if (!Array.isArray(j.gates) || !Array.isArray(j.centers)) throw new Error('Bản vẽ: thiếu cổng/trung tâm');
  const gates = new Map<number, GateMark>();
  for (const e of j.gates) {
    const [g, m] = Array.isArray(e) ? e : [];
    assertGate(g);
    if (!m || !SIDES.includes(m.side)) throw new Error(`Bản vẽ: phía của cổng ${g} không hợp lệ`);
    if (m.acts !== undefined && !Array.isArray(m.acts)) throw new Error(`Bản vẽ: kích hoạt của cổng ${g} không hợp lệ`);
    const acts = (m.acts ?? []).map(a => { assertAct(a, g); return { side: a.side, line: a.line, body: a.body }; });
    // `withActs` giữ bất biến phía ↔ acts kể cả khi tệp bị sửa tay.
    gates.set(g, withActs({ side: m.side, ...(m.color === undefined ? {} : { color: assertColor(m.color) }) }, acts));
  }
  const centers = new Set<CenterId>();
  for (const c of j.centers) {
    if (!ALL_CENTERS.includes(c)) throw new Error(`Bản vẽ: trung tâm ${String(c)} không hợp lệ`);
    centers.add(c);
  }
  const base = emptyIllustration(j.mode);
  return {
    mode: j.mode, gates,
    // mechanics thì trung tâm luôn suy lại — không tin bản lưu
    centers: j.mode === 'mechanics' ? derivedCenters(gates) : centers,
    appearance: parseAppearance(j.appearance),
    meta: parseMeta(j.meta, base.meta),
  };
}

/*
 * ★ Bảo mật (quét vbsec 2026-09-30, gợi ý tăng cường): bản vẽ có thể đến từ tệp
 *   người khác gửi. Trước đây `meta`/`layers`/`colors` được spread thẳng — nhận
 *   mọi khoá, mọi kiểu. Nay chỉ nhận đúng trường, đúng kiểu; màu phải là hex
 *   (`assertColor`), không nhận chuỗi CSS tuỳ ý. Sai thì BỎ trường đó (lỏng tay
 *   như phần giao diện vốn thế), riêng màu sai thì ném như ở phần cổng.
 */
const MAX_META = 200;
const LAYER_KEYS: readonly LayerKey[] = ['backdrop', 'lattice', 'centers', 'gates', 'gateNumbers', 'activation'];
const COLOR_KEYS = ['design', 'personality', 'plain', 'centerOpen', 'circuitry'] as const;

function parseMeta(raw: unknown, base: IllustrationMeta): IllustrationMeta {
  const m = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const pick = (k: keyof IllustrationMeta): string => { const v = m[k]; return typeof v === 'string' ? v.slice(0, MAX_META) : base[k]; };
  return { name: pick('name'), copyright: pick('copyright') };
}

function parseLayers(raw: unknown): Partial<Record<LayerKey, LayerSetting>> {
  const l = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const out: Partial<Record<LayerKey, LayerSetting>> = {};
  for (const k of LAYER_KEYS) {
    const v = l[k] as Partial<LayerSetting> | undefined;
    if (!v || typeof v !== 'object' || typeof v.visible !== 'boolean'
        || typeof v.opacity !== 'number' || !Number.isFinite(v.opacity)) continue;
    out[k] = { visible: v.visible, opacity: Math.min(1, Math.max(0, v.opacity)) };
  }
  return out;
}

function parseColors(raw: unknown): ColorOverrides {
  const c = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const out: ColorOverrides = {};
  for (const k of COLOR_KEYS) if (c[k] !== undefined) out[k] = assertColor(c[k]);
  const cd = c.centerDefined;
  if (typeof cd === 'string') out.centerDefined = assertColor(cd);
  else if (typeof cd === 'object' && cd !== null) {
    const per: Partial<Record<CenterId, string>> = {};
    for (const id of ALL_CENTERS) {
      const v = (cd as Record<string, unknown>)[id];
      if (v !== undefined) per[id] = assertColor(v);
    }
    out.centerDefined = per;
  }
  return out;
}

/** Đọc phần giao diện — dùng chung cho bản vẽ và preset (`presets.ts`). Lỏng tay: thiếu thì mặc định. */
export function parseAppearance(raw: unknown): Appearance {
  const ap = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Appearance>;
  return {
    theme: ap.theme === 'modern' ? 'modern' : 'classic',
    layers: parseLayers(ap.layers),
    colors: parseColors(ap.colors),
    ...(ap.planets === true ? { planets: true } : {}),
    ...(ap.mandala === true ? { mandala: true } : {}),
    ...(ap.zodiac === true ? { zodiac: true } : {}),
  };
}

const PLANET_BODIES = new Set<unknown>(DEFINING_BODIES_STANDARD);

function assertAct(a: unknown, gate: number): asserts a is GateAct {
  const x = a as Partial<GateAct> | null;
  const ok = !!x && typeof x === 'object'
    && (x.side === 'design' || x.side === 'personality')
    && (x.line === null || (Number.isInteger(x.line) && x.line! >= 1 && x.line! <= 6))
    // Chiron không lên giao diện (CLAUDE.md) ⇒ không gán được.
    && (x.body === null || PLANET_BODIES.has(x.body))
    && !(x.body !== null && x.line === null);
  if (!ok) throw new Error(`Bản vẽ: một lần kích hoạt của cổng ${gate} không hợp lệ`);
}

function assertColor(c: unknown): string {
  if (typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c)) throw new Error(`Màu ${String(c)} không hợp lệ`);
  return c.toLowerCase();
}

function assertGate(g: unknown): asserts g is number {
  if (typeof g !== 'number' || !Number.isInteger(g) || g < 1 || g > 64) throw new Error(`Cổng ${String(g)} không hợp lệ`);
}
