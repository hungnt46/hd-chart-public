/**
 * Planetary Influence Chart — bảng transit theo tháng đọc chồng lên một chart
 * cá nhân (`docs/PLAN-planetary-influence.md` Phase 1). Mỗi dòng: MỘT thiên thể
 * VÀO MỘT cổng, và việc đó làm gì với chart.
 *
 * Oracle: bảng Planetary Influence của một ứng dụng tham chiếu
 * (fixture đối chiếu 2026-09-28 trong `__fixtures__/reference/`, G01 tháng
 * 09/2026, 109 dòng). Bốn định nghĩa không hiển nhiên, đều ĐO từ mẫu đó:
 *
 * 1. Mọi cột "khi tính cả transit" (dạng xác định, cầu nối, Type) tính NGAY SAU
 *    mốc VÀO cổng của dòng, với cả 13 thiên thể transit lúc đó — kể cả dòng
 *    "Đang diễn ra" bắt đầu trước tháng (Pluto vào 41 từ 12/2025 ghi cầu nối 8,
 *    thứ chỉ có vào ngày 12/2025). "Ngay sau" vì Mặt Trời và Trái Đất (hai Node
 *    cũng vậy) đổi cổng CÙNG một lúc: tính đúng mốc thì cặp kia còn ở cổng cũ
 *    (tham chiếu: Sun 40 lúc 29/8 08:23 ghi "Split", không phải "Split → Single").
 * 2. Thời lượng trung tâm = CHUỖI các dòng CÓ TRONG BẢNG (đang diễn ra + trong
 *    tháng) cùng định hình trung tâm đó, nối nhau không hở, đo từ đầu chuỗi tới
 *    cuối chuỗi ("counting activations that follow on from each other"). Tham chiếu:
 *    Mercury vào 57 lúc 09:23 ghi "Spleen 3d 20 hrs" — tính từ Moon 38 lúc 07:07;
 *    North Node 30 ghi "4 months" dù sau đó Node sang 49 (chart có 19) vẫn giữ
 *    Root — dòng Node 49 nằm ngoài tháng nên không vào chuỗi.
 * 3. Cầu nối = kênh của bản ghép, chart không có, nối THẲNG hai trung tâm thuộc
 *    hai vùng KHÁC NHAU của chart. Đường vòng qua trung tâm chỉ transit định hình
 *    không tính (tham chiếu: Neptune 25 lúc 23/8 ghi 33 và 20, không ghi 57 dù
 *    Throat–20-57–Spleen–57-10–G cũng nối hai vùng). Bản tham chiếu còn chỉ giữ các kênh
 *    "gánh một mình" nếu có — xem `bridgeChannels`.
 * 4. Tháng là khoảng `[jdFrom, jdTo)` do bên gọi chọn; bản tham chiếu cắt theo UTC (dòng
 *    Moon 20 lúc 30/9 17:38 UTC nằm trong tháng 9 dù giờ VN đã là 1/10).
 *
 * ⚠️ Type ở đây là "Type khi tính cả transit" — Hưng chốt 2026-09-28 cho RIÊNG
 *    bảng này (PLAN, quyết định số 2). Luật ở `transit.ts` (bodygraph ghép KHÔNG
 *    tính lại Type) giữ nguyên: thiết kế của một người không đổi theo transit.
 */
import type { EphemerisProvider } from '../ephemeris/provider.js';
import { Body, DEFAULT_BODY_CONFIG, DEFINING_BODIES_STANDARD, type BodyConfig } from '../ephemeris/bodies.js';
import circuitsJson from '../hd-data/channel-circuits.json' with { type: 'json' };
import type { RaveChart } from './chart.js';
import { bodySpeed, gateLineAt, HORIZON_DAYS, NEVER_RETRO } from './changes.js';
import { deriveStructure, type Definition } from './derive/structure.js';
import { GATE_TO_CENTER, channelsContaining, type CenterId, type ChannelDef } from './derive/tables.js';
import { deriveType, type HdType } from './derive/type-authority.js';
import { bodySegments, mergeSegments, type EphemerisSegment } from './ephemeris-segments.js';

export type CircuitGroup = 'Individual' | 'Collective' | 'Tribal' | 'Integration';
export type Circuit = 'Knowing' | 'Centering' | 'Understanding' | 'Sensing' | 'Ego' | 'Defense' | 'Integration';
export type ChannelType = 'Generating' | 'Projecting' | 'Manifesting' | 'ManifestingGenerating';

export interface ChannelCircuit { group: CircuitGroup; circuit: Circuit; channelType: ChannelType }

/** Mạch + loại kênh theo `id` kênh — `hd-data/channel-circuits.json` (STRONG INFERENCE). */
export const CHANNEL_CIRCUITS: Readonly<Record<number, ChannelCircuit>> = Object.freeze(
  Object.fromEntries(circuitsJson.channels.map(c => [c.id, {
    group: c.group as CircuitGroup, circuit: c.circuit as Circuit, channelType: c.channelType as ChannelType,
  }])),
);
/** Nhãn tiếng Anh đúng chữ bản tham chiếu — tiếng Việt thuộc `i18n/` (Phase 2). */
export const CIRCUIT_LABEL_EN: Readonly<Record<Circuit, string>> = Object.freeze(circuitsJson._labelsEn.circuit);
export const CHANNEL_TYPE_LABEL_EN: Readonly<Record<ChannelType, string>> = Object.freeze(circuitsJson._labelsEn.channelType);

export interface InfluenceChannel extends ChannelCircuit {
  channel: ChannelDef;
  /** Cổng ở đầu kia kênh. */
  harmonic: number;
  /** Chart có sẵn cổng hài hoà (bản tham chiếu tô xanh dương). */
  harmonicNatal: boolean;
  /**
   * Transit này nối thành kênh MỚI: chart có cổng hài hoà nhưng KHÔNG có cổng
   * của dòng. Moon vào 2 khi chart có sẵn 2-14 không tính (bản tham chiếu cũng không).
   */
  forms: boolean;
}

/** Một trung tâm dòng này định hình, và chuỗi dòng liên tiếp giữ nó defined. */
export interface CenterSpan {
  center: CenterId;
  jdStart: number;
  jdEnd: number;
  /** Còn defined lúc hết khoảng xem — bản tham chiếu in "+". */
  pastPeriodEnd: boolean;
}

export interface Bridges {
  /** Cổng transit (chart không có) nằm trên kênh cầu nối, theo thứ tự kênh. */
  gates: number[];
  /** Kênh cầu nối mà CẢ HAI cổng đều là transit (bản tham chiếu in dạng "31-7"). */
  transitChannels: ChannelDef[];
  /** Mọi kênh cầu nối được liệt kê. */
  channels: ChannelDef[];
}

export interface InfluenceRow {
  body: Body;
  gate: number;
  /** Lúc VÀO cổng (UT, JD) — dòng "Đang diễn ra" có mốc trước khoảng xem. */
  jdStart: number;
  /** Lúc RỜI cổng. */
  jdEnd: number;
  /** Đi lùi lúc vào cổng. Luôn `false` với Mặt Trời, Trái Đất, Mặt Trăng. */
  retrograde: boolean;
  /** Chart có sẵn cổng này. */
  natal: boolean;
  /** Mọi kênh chứa cổng, theo thứ tự `id` (đúng thứ tự bản tham chiếu liệt kê). */
  channels: InfluenceChannel[];
  /** Ít nhất một kênh nối thành. */
  connects: boolean;
  /** Trung tâm do RIÊNG transit này (ghép với chart) định hình. */
  definesCenters: CenterSpan[];
  /** Dạng xác định của chart → khi tính cả 13 transit, ngay sau mốc vào. */
  definition: { natal: Definition; withTransits: Definition; natalComponents: number; withTransitsComponents: number };
  /** Cầu nối ngay sau mốc vào — rỗng khi chart không Split. */
  bridges: Bridges;
  /** ⚠️ Type khi tính cả transit, ngay sau mốc vào — KHÔNG phải Type của người (xem đầu tệp). */
  typeWithTransits: HdType;
}

export interface InfluenceHeader {
  /** Type khi tính cả transit tại `jdNow`. */
  typeWithTransitsNow: HdType;
  /** Dòng gần nhất SAU `jdNow` nối kênh mới — có thể ngoài khoảng xem. */
  nextConnection: InfluenceRow | null;
}

export interface PlanetaryInfluence {
  /** Dòng vào cổng TRONG `[jdFrom, jdTo)`, theo thời gian (hoà thì theo thứ tự cột hành tinh). */
  rows: InfluenceRow[];
  /** Vào cổng trước `jdFrom`, còn ở đó lúc `jdFrom`. */
  ongoing: InfluenceRow[];
  header: InfluenceHeader;
}

export type InfluenceFilter = 'connections' | 'definesCenter' | 'bridgesSplit' | 'typeChanges';
export const INFLUENCE_FILTERS: readonly InfluenceFilter[] = ['connections', 'definesCenter', 'bridgesSplit', 'typeChanges'];

/**
 * Bộ lọc "Show only" của bản tham chiếu. `bridgesSplit`: chart Split trở lên và bản ghép
 * ÍT vùng hơn — G01 09/2026 đếm 50 = đúng số dòng "Split → Single"; dòng
 * "Split → Triple Split" và dòng có cầu nối mà vẫn Split đều không tính.
 * ⚠️ Chart Triple Split → Split (bớt vùng nhưng chưa về Single) chưa có mẫu.
 */
export function matchesFilter(row: InfluenceRow, f: InfluenceFilter, natal: RaveChart): boolean {
  switch (f) {
    case 'connections': return row.connects;
    case 'definesCenter': return row.definesCenters.length > 0;
    case 'bridgesSplit':
      return row.definition.natalComponents >= 2
        && row.definition.withTransitsComponents < row.definition.natalComponents;
    case 'typeChanges': return row.typeWithTransits !== natal.type;
  }
}

export function filterCounts(rows: readonly InfluenceRow[], natal: RaveChart): Record<InfluenceFilter, number> {
  const out = { connections: 0, definesCenter: 0, bridgesSplit: 0, typeChanges: 0 };
  for (const r of rows) for (const f of INFLUENCE_FILTERS) if (matchesFilter(r, f, natal)) out[f]++;
  return out;
}

/**
 * Mã vùng (thành phần liên thông) của từng trung tâm defined — như
 * `countComponents` ở `derive/structure.ts` nhưng trả vùng của TỪNG trung tâm.
 */
export function componentOf(
  centers: ReadonlySet<CenterId>, channels: readonly ChannelDef[],
): Map<CenterId, number> {
  const adj = new Map<CenterId, Set<CenterId>>();
  for (const c of centers) adj.set(c, new Set());
  for (const ch of channels) {
    const a = GATE_TO_CENTER[ch.gates[0]]!, b = GATE_TO_CENTER[ch.gates[1]]!;
    adj.get(a)?.add(b);
    adj.get(b)?.add(a);
  }
  const out = new Map<CenterId, number>();
  let n = 0;
  for (const start of centers) {
    if (out.has(start)) continue;
    const stack = [start];
    out.set(start, n);
    while (stack.length) {
      const cur = stack.pop()!;
      for (const nb of adj.get(cur) ?? []) if (!out.has(nb)) { out.set(nb, n); stack.push(nb); }
    }
    n++;
  }
  return out;
}

/**
 * Cầu nối (định nghĩa 3). Ứng viên = kênh của `composite` mà chart không có, nối
 * THẲNG hai vùng khác nhau của chart. Trong đó, kênh "gánh một mình" là kênh mà
 * bỏ riêng nó đi thì các vùng của chart rơi vào NHIỀU nhóm hơn. Bản tham chiếu liệt kê:
 *  - các kênh gánh một mình, nếu có;
 *  - nếu không có kênh nào như vậy (mọi mối nối đều có đường dự phòng): mọi ứng viên.
 * Đo đối chiếu, chart Triple Split G13 (bên tham chiếu đánh số "G14"): Mars rời 53 lúc 13/9 ⇒ vùng
 * Throat nối vùng G bằng HAI kênh song song 10-20 và 20-34 (không kênh nào gánh
 * một mình), còn 30-41 thành kênh duy nhất nối vùng Spleen ⇒ cột chỉ còn 30-41.
 * Moon vào 51 (25-51 thêm một đường cho vùng Spleen) ⇒ hết kênh gánh một mình ⇒
 * 20 hiện lại. Khớp mọi dòng của G01 (2 vùng) và G13 (3 vùng).
 */
export function bridgeChannels(natal: RaveChart, composite: readonly ChannelDef[]): ChannelDef[] {
  const region = componentOf(natal.definedCenters, natal.definedChannels);
  if (new Set(region.values()).size < 2) return [];
  const natalIds = new Set(natal.definedChannels.map(c => c.id));
  const crosses = (ch: ChannelDef) => {
    const a = region.get(GATE_TO_CENTER[ch.gates[0]]!), b = region.get(GATE_TO_CENTER[ch.gates[1]]!);
    return a !== undefined && b !== undefined && a !== b;
  };
  /** Số nhóm mà các vùng của chart rơi vào, với tập kênh `chs`. */
  const groups = (chs: readonly ChannelDef[]) => {
    const centers = new Set(natal.definedCenters);
    for (const ch of chs) for (const g of ch.gates) centers.add(GATE_TO_CENTER[g]!);
    const comp = componentOf(centers, chs);
    return new Set([...natal.definedCenters].map(c => comp.get(c))).size;
  };
  const candidates = composite.filter(ch => !natalIds.has(ch.id) && crosses(ch));
  const whole = groups(composite);
  const critical = candidates.filter(ch => groups(composite.filter(c => c.id !== ch.id)) > whole);
  return critical.length > 0 ? critical : candidates;
}

/**
 * Hai lần dò cùng một mép lệch nhau tới độ phân giải chia đôi, nên chỗ nối của
 * `mergeSegments` có thể hở hoặc chồng dưới một giây. Tra đoạn theo thời điểm
 * cần dãy LIỀN tuyệt đối.
 */
function stitch(segs: EphemerisSegment[]): EphemerisSegment[] {
  return segs.map((s, i) => (i > 0 && s.jdStart !== segs[i - 1]!.jdEnd ? { ...s, jdStart: segs[i - 1]!.jdEnd } : s));
}

/** Dãy đoạn cổng của mọi thiên thể, nới rộng theo nhu cầu (dò thêm phần mới rồi `mergeSegments`). */
class Timeline {
  private segs = new Map<Body, EphemerisSegment[]>();
  private lo: number;
  private hi: number;
  constructor(
    private eph: EphemerisProvider, private bodies: readonly Body[], private cfg: BodyConfig,
    lo: number, hi: number,
  ) {
    this.lo = lo; this.hi = hi;
    for (const b of bodies) this.segs.set(b, bodySegments(eph, lo, hi, b, cfg, 'gate'));
  }
  /**
   * Nới dãy đoạn để phủ `jd`. ★ Sửa 2026-09-28 (đo bằng số lần gọi ephemeris):
   *   · điều kiện `jd > hi`, không `>=` — `segmentsIn(…, jdTo)` hỏi đúng mép phải
   *     nên bản cũ LUÔN nới thêm 60 ngày cho cả 13 thiên thể (≈ 20k lần gọi thừa
   *     trên 38k của một tháng);
   *   · chỉ dò tiếp thiên thể mà đoạn cuối CHƯA phủ tới `to`, và dò từ mép đoạn
   *     đó: Sao Diêm Vương đã biết mốc rời cổng năm 2028 thì không phải lùi lại
   *     tìm mốc vào 12/2025 lần nữa.
   */
  private ensure(jd: number): void {
    if (jd > this.hi) {
      const to = Math.max(jd, this.hi + 2);
      for (const b of this.bodies) {
        const arr = this.segs.get(b)!;
        const end = arr[arr.length - 1]!.jdEnd;
        if (end >= to) continue;
        this.segs.set(b, stitch(mergeSegments(arr, bodySegments(this.eph, end, to, b, this.cfg, 'gate'))));
      }
      this.hi = to;
    }
    if (jd < this.lo) {
      const from = Math.min(jd, this.lo - 2);
      for (const b of this.bodies) {
        const arr = this.segs.get(b)!;
        const start = arr[0]!.jdStart;
        if (start <= from) continue;
        this.segs.set(b, stitch(mergeSegments(bodySegments(this.eph, from, start, b, this.cfg, 'gate'), arr)));
      }
      this.lo = from;
    }
  }
  /**
   * Cổng của mọi thiên thể lúc `jd` — tính THẲNG vị trí, không tra dãy đoạn.
   * ★ Trước 2026-09-28 hàm này tra đoạn nên phải `ensure(jd)`: một dòng "Đang
   *   diễn ra" vào cổng từ 12/2025 (Pluto) kéo cả 13 thiên thể — Mặt Trăng bước
   *   0.01 ngày — dò ngược 9 tháng chỉ để biết cổng tại MỘT thời điểm: 1.2 s trên
   *   2.4 s của một tháng (đo bằng --cpu-prof). Mép đoạn chính xác tới ¼ giây còn
   *   các mốc hỏi ở đây nằm ≥ 1 giây sau mép (`AFTER_ENTRY_DAYS`), nên hai cách
   *   cho cùng cổng.
   */
  gatesAt(jd: number): number[] {
    return this.bodies.map(b => gateLineAt(this.eph, jd, b, this.cfg).gate);
  }
  segmentsIn(b: Body, from: number, to: number): EphemerisSegment[] {
    this.ensure(to);
    return this.segs.get(b)!.filter(s => s.jdEnd > from && s.jdStart < to);
  }
}

/** "Ngay sau" mốc vào (định nghĩa 1): quá độ phân giải chia đôi (¼ giây) của máy dò. */
const AFTER_ENTRY_DAYS = 1 / 86400;

/**
 * Bảng của một khoảng (thường là một tháng) cho một chart.
 * `jdNow` chỉ dùng cho đầu bảng ("Type hiện tại", "Kết nối kế tiếp").
 */
export function planetaryInfluence(
  eph: EphemerisProvider, natal: RaveChart, jdFrom: number, jdTo: number,
  opts: { jdNow?: number; bodies?: readonly Body[]; cfg?: BodyConfig } = {},
): PlanetaryInfluence {
  if (!(jdTo > jdFrom)) throw new RangeError('planetaryInfluence: jdTo phải sau jdFrom');
  const bodies = opts.bodies ?? DEFINING_BODIES_STANDARD;
  const cfg = opts.cfg ?? DEFAULT_BODY_CONFIG;
  const jdNow = opts.jdNow ?? jdFrom;
  const tl = new Timeline(eph, bodies, cfg, jdFrom, jdTo);

  const natalGates = natal.definedGates;
  const natalCenters = natal.definedCenters;
  const natalComponents = deriveStructure(natalGates).componentCount;
  /** Trung tâm mới khi ghép RIÊNG một cổng với chart. */
  const newCenters = (g: number): CenterId[] =>
    [...deriveStructure(new Set([...natalGates, g])).definedCenters].filter(c => !natalCenters.has(c));
  const formsChannel = (g: number) =>
    !natalGates.has(g) && channelsContaining(g).some(ch => natalGates.has(ch.gates[0] === g ? ch.gates[1] : ch.gates[0]));

  /** Mọi cột trừ đoạn trung tâm (cần cả bảng mới nối chuỗi được). */
  const rowOf = (body: Body, seg: EphemerisSegment): InfluenceRow => {
    const gate = seg.gate;
    const channels: InfluenceChannel[] = channelsContaining(gate).map(ch => {
      const harmonic = ch.gates[0] === gate ? ch.gates[1] : ch.gates[0];
      const harmonicNatal = natalGates.has(harmonic);
      return { channel: ch, harmonic, harmonicNatal, forms: harmonicNatal && !natalGates.has(gate), ...CHANNEL_CIRCUITS[ch.id]! };
    });
    const at = seg.jdStart + AFTER_ENTRY_DAYS;
    const composite = deriveStructure(new Set([...natalGates, ...tl.gatesAt(at)]));
    const bridgeChs = bridgeChannels(natal, composite.definedChannels);
    const bridgeGates: number[] = [];
    for (const ch of bridgeChs) for (const g of ch.gates) if (!natalGates.has(g) && !bridgeGates.includes(g)) bridgeGates.push(g);
    return {
      body, gate, jdStart: seg.jdStart, jdEnd: seg.jdEnd,
      retrograde: !NEVER_RETRO.has(body) && bodySpeed(eph, at, body, cfg) < 0,
      natal: natalGates.has(gate),
      channels,
      connects: channels.some(c => c.forms),
      definesCenters: newCenters(gate).map(center => ({ center, jdStart: seg.jdStart, jdEnd: seg.jdEnd, pastPeriodEnd: false })),
      definition: {
        natal: natal.definition, withTransits: composite.definition,
        natalComponents, withTransitsComponents: composite.componentCount,
      },
      bridges: {
        gates: bridgeGates,
        transitChannels: bridgeChs.filter(ch => !natalGates.has(ch.gates[0]) && !natalGates.has(ch.gates[1])),
        channels: bridgeChs,
      },
      typeWithTransits: deriveType(composite.definedCenters, composite.definedChannels),
    };
  };

  const order = (a: InfluenceRow, b: InfluenceRow) =>
    a.jdStart - b.jdStart || bodies.indexOf(a.body) - bodies.indexOf(b.body);
  const rows: InfluenceRow[] = [];
  const ongoing: InfluenceRow[] = [];
  for (const b of bodies) for (const s of tl.segmentsIn(b, jdFrom, jdTo)) {
    (s.jdStart < jdFrom ? ongoing : rows).push(rowOf(b, s));
  }
  rows.sort(order);
  ongoing.sort(order);
  chainCenterSpans([...ongoing, ...rows], jdTo);

  const nowComposite = deriveStructure(new Set([...natalGates, ...tl.gatesAt(jdNow)]));
  let nextConnection: InfluenceRow | null = null;
  /*
   * Cửa sổ ngắn nở dần (2 → 4 → … → 32 ngày): Mặt Trăng đi hết 64 cổng mỗi ~27
   * ngày nên gần như luôn gặp trong vài ngày đầu. "Bây giờ" nằm trong khoảng xem
   * thì dùng luôn `tl`; không thì một dãy riêng bắt đầu từ `jdNow` — ★ bản trước
   * 2026-09-28 nới `tl` từ `jdNow` tới khoảng xem: xem tháng 11 lúc đang tháng 9
   * là dò thêm hai tháng cho cả 13 thiên thể.
   */
  const tn = jdNow >= jdFrom && jdNow < jdTo ? tl : new Timeline(eph, bodies, cfg, jdNow, jdNow + 2);
  for (let w = jdNow, len = 2; !nextConnection && w < jdNow + HORIZON_DAYS; w += len, len = Math.min(len * 2, 32)) {
    let best: [Body, EphemerisSegment] | null = null;
    for (const b of bodies) for (const s of tn.segmentsIn(b, w, w + len)) {
      if (s.jdStart <= jdNow || s.jdStart < w || s.jdStart >= w + len || !formsChannel(s.gate)) continue;
      if (!best || s.jdStart < best[1].jdStart) best = [b, s];
    }
    if (best) nextConnection = rowOf(best[0], best[1]);
  }

  return {
    rows, ongoing,
    header: {
      typeWithTransitsNow: deriveType(nowComposite.definedCenters, nowComposite.definedChannels),
      nextConnection,
    },
  };
}

/**
 * Định nghĩa 2: với mỗi trung tâm, gộp các dòng định hình nó thành chuỗi (dòng
 * sau bắt đầu trước khi chuỗi hết), rồi gán cả chuỗi cho mọi dòng trong chuỗi.
 */
function chainCenterSpans(table: readonly InfluenceRow[], jdTo: number): void {
  const byCenter = new Map<CenterId, CenterSpan[]>();
  for (const r of table) for (const s of r.definesCenters) {
    const arr = byCenter.get(s.center) ?? [];
    arr.push(s);
    byCenter.set(s.center, arr);
  }
  for (const spans of byCenter.values()) {
    const sorted = [...spans].sort((a, b) => a.jdStart - b.jdStart);
    let chain: CenterSpan[] = [];
    let start = 0, end = -Infinity;
    const flush = () => {
      for (const s of chain) { s.jdStart = start; s.jdEnd = end; s.pastPeriodEnd = end > jdTo; }
    };
    for (const s of sorted) {
      if (s.jdStart > end) { flush(); chain = []; start = s.jdStart; end = s.jdEnd; }
      else end = Math.max(end, s.jdEnd);
      chain.push(s);
    }
    flush();
  }
}
