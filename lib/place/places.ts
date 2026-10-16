/**
 * Tra địa danh OFFLINE — STATUS §4 B1, quyết định §5 #19 (thay D7 "Google API").
 *
 * Module THUẦN: nhận chữ của tệp `places-<ngày>.tsv` (định dạng ở đầu
 * `generate-places.ts`), trả chỉ mục; tìm trên chỉ mục đó. Việc TẢI tệp nằm ở
 * `load-places.ts` để phần này test được bằng vitest không cần mạng.
 *
 * Nơi sinh chỉ dùng để suy ra MÚI GIỜ — calc-core không nhận toạ độ.
 */
import { foldName } from './fold.js';

export interface PlaceCandidate {
  name: string;
  /** Tỉnh/bang (GeoNames admin1). `''` nếu không có. */
  admin: string;
  countryCode: string;
  /** Tên nước tiếng Anh từ GeoNames — giao diện có thể dịch lại theo `countryCode`. */
  country: string;
  latitude: number;
  longitude: number;
  ianaZone: string;
  source: 'geonames';
}

interface Meta {
  source: string; generated: string; count: number;
  zones: string[]; admins: string[]; countries: Record<string, string>;
}

export interface PlaceIndex {
  meta: Meta;
  /** Song song theo chỉ số dòng; dòng càng đầu càng đông dân. */
  names: string[];
  folded: string[];
  keys: string[][];
  cc: string[];
  admin: Int32Array;
  lat: Float64Array;
  lon: Float64Array;
  zone: Int32Array;
}

export function parsePlaces(text: string): PlaceIndex {
  const nl = text.indexOf('\n');
  const head = text.slice(0, nl);
  if (!head.startsWith('#places\t')) throw new Error('Tệp địa danh sai định dạng (thiếu dòng #places)');
  const meta = JSON.parse(head.slice('#places\t'.length)) as Meta;
  const lines = text.slice(nl + 1).split('\n').filter(Boolean);
  const n = lines.length;
  const idx: PlaceIndex = {
    meta, names: new Array<string>(n), folded: new Array<string>(n), keys: new Array<string[]>(n),
    cc: new Array<string>(n), admin: new Int32Array(n), lat: new Float64Array(n),
    lon: new Float64Array(n), zone: new Int32Array(n),
  };
  for (let i = 0; i < n; i++) {
    const c = lines[i]!.split('\t');
    idx.names[i] = c[0]!;
    idx.folded[i] = foldName(c[0]!);
    idx.keys[i] = c[1] ? c[1].split('|') : [];
    idx.cc[i] = c[2]!;
    idx.admin[i] = c[3] ? Number(c[3]) : -1;
    idx.lat[i] = Number(c[4]);
    idx.lon[i] = Number(c[5]);
    idx.zone[i] = Number(c[6]);
  }
  if (n !== meta.count) throw new Error(`Tệp địa danh hỏng: ${n} dòng, meta ghi ${meta.count}`);
  return idx;
}

export function candidateAt(idx: PlaceIndex, i: number): PlaceCandidate {
  const cc = idx.cc[i]!;
  const a = idx.admin[i]!;
  return {
    name: idx.names[i]!,
    admin: a >= 0 ? idx.meta.admins[a]! : '',
    countryCode: cc,
    country: idx.meta.countries[cc] ?? cc,
    latitude: idx.lat[i]!,
    longitude: idx.lon[i]!,
    ianaZone: idx.meta.zones[idx.zone[i]!]!,
    source: 'geonames',
  };
}

/**
 * Mức khớp — nhỏ hơn là tốt hơn. Cùng mức thì dòng đông dân hơn (đứng trước)
 * thắng. "Đầu từ" để "chi minh" vẫn ra "Ho Chi Minh City".
 */
const Rank = { Exact: 0, AltExact: 1, Prefix: 2, AltPrefix: 3, Word: 4, AltWord: 5, None: 6 } as const;
type Rank = (typeof Rank)[keyof typeof Rank];

function rankOf(q: string, name: string, keys: readonly string[]): Rank {
  if (name === q) return Rank.Exact;
  if (keys.includes(q)) return Rank.AltExact;
  if (name.startsWith(q)) return Rank.Prefix;
  if (keys.some(k => k.startsWith(q))) return Rank.AltPrefix;
  const w = ' ' + q;
  if (name.includes(w)) return Rank.Word;
  if (keys.some(k => k.includes(w))) return Rank.AltWord;
  return Rank.None;
}

/** Truy vấn ngắn hơn thế này trả quá nhiều kết quả vô nghĩa. */
export const MIN_QUERY_LENGTH = 2;

/**
 * Tìm. Phần sau dấu phẩy đầu tiên là BỘ LỌC theo tỉnh/bang hoặc nước:
 * "springfield, illinois", "hue, vn", "paris, texas".
 */
export function searchPlaces(idx: PlaceIndex, query: string, limit = 8): PlaceCandidate[] {
  const comma = query.indexOf(',');
  const q = foldName(comma < 0 ? query : query.slice(0, comma));
  const qual = comma < 0 ? '' : foldName(query.slice(comma + 1));
  if (q.length < MIN_QUERY_LENGTH) return [];

  const qualOk = (i: number): boolean => {
    if (!qual) return true;
    const cc = idx.cc[i]!;
    if (foldName(cc) === qual) return true;
    if (foldName(idx.meta.countries[cc] ?? '').startsWith(qual)) return true;
    const a = idx.admin[i]!;
    return a >= 0 && foldName(idx.meta.admins[a]!).startsWith(qual);
  };

  const buckets: number[][] = [[], [], [], [], [], []];
  for (let i = 0; i < idx.names.length; i++) {
    const r = rankOf(q, idx.folded[i]!, idx.keys[i]!);
    if (r === Rank.None) continue;
    const b = buckets[r]!;
    if (b.length < limit * 4 && qualOk(i)) b.push(i);
  }

  const out: PlaceCandidate[] = [];
  const seen = new Set<string>();
  for (const b of buckets) {
    for (const i of b) {
      const c = candidateAt(idx, i);
      // Cùng tên + tỉnh + nước + múi giờ thì người dùng không phân biệt được —
      // giữ dòng đông dân nhất (đứng trước).
      const k = `${c.name}|${c.admin}|${c.countryCode}|${c.ianaZone}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(c);
      if (out.length === limit) return out;
    }
  }
  return out;
}
