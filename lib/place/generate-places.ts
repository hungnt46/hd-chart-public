/**
 * Sinh `public/data/places-<ngày>.tsv` từ GeoNames — STATUS §4 B1, quyết định §5 #19.
 *
 *   npm run gen:places
 *
 * Nguồn: https://download.geonames.org/export/dump/ — `cities1000.zip` (mọi nơi
 * ≥ 1000 dân), `admin1CodesASCII.txt`, `countryInfo.txt`. Giấy phép CC-BY 4.0
 * ⇒ PHẢI ghi công (NOTICE.md + dòng chú thích dưới ô tìm).
 *
 * Tệp tải về để ở `.cache/geonames/` (không commit). Tệp sinh ra THÌ commit: dựng
 * app không được phụ thuộc mạng tới geonames.org.
 *
 * Định dạng (UTF-8, mỗi dòng một bản ghi, tách bằng TAB):
 *   dòng 1: `#places\t<JSON meta>` — nguồn, ngày sinh, bảng `zones`, `admins`, `countries`
 *   dòng sau: tên \t khoá-phụ (fold, nối `|`) \t mã nước \t chỉ-số-admin \t vĩ \t kinh \t chỉ-số-zone
 * Chỉ số trỏ vào các bảng trong meta — tên vùng/tỉnh lặp hàng chục nghìn lần,
 * viết thẳng vào từng dòng thì tệp phình gấp đôi.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { foldName } from './fold.js';
import { fixZone } from './zone-fixes.js';
import { canonicalZone, isValidZone } from './timezones.js';

const BASE = 'https://download.geonames.org/export/dump/';
const CACHE = '.cache/geonames';
const OUT_DIR = 'public/data';
const MANIFEST = 'lib/place/places-manifest.ts';

/** Tên phụ dài hơn thế này gần như chắc là mô tả, không phải tên gọi. */
const MAX_ALT_LEN = 40;
/** Chỉ giữ tên phụ viết bằng chữ Latin (sau khi bỏ dấu) — người dùng gõ bàn phím Latin. */
const LATIN = /^[a-z0-9][a-z0-9 '.\-()]*$/;
/**
 * Tên phụ chỉ giữ cho nơi ≥ 100 nghìn dân, và cho MỌI địa danh Việt Nam. Giữ hết
 * thì tệp nặng 6 MB gzip — phần lớn là phiên âm từ chữ Ả Rập, Hán, Cyrillic…
 * của thị trấn nhỏ, chẳng ai gõ. Nơi lớn mới có tên cũ đáng tìm (Saigon, Bombay,
 * Peking); người dùng chính là người Việt nên giữ đủ tên Việt (Sài Gòn, Kẻ Chợ).
 */
const ALT_MIN_POPULATION = 100_000;

function fetchCached(file: string): string {
  const p = join(CACHE, file);
  if (!existsSync(p)) {
    mkdirSync(CACHE, { recursive: true });
    execFileSync('curl', ['-sSfL', '-o', p, BASE + file], { stdio: 'inherit' });
  }
  return p;
}

function main(): void {
  const zip = fetchCached('cities1000.zip');
  const cities = execFileSync('unzip', ['-p', zip, 'cities1000.txt'], { maxBuffer: 1 << 28 }).toString('utf8');
  const admin1 = readFileSync(fetchCached('admin1CodesASCII.txt'), 'utf8');
  const countryInfo = readFileSync(fetchCached('countryInfo.txt'), 'utf8');

  const countries: Record<string, string> = {};
  for (const line of countryInfo.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const c = line.split('\t');
    countries[c[0]!] = c[4]!;
  }
  const adminName = new Map<string, string>();
  for (const line of admin1.split('\n')) {
    if (!line) continue;
    const [code, name] = line.split('\t');
    adminName.set(code!, name!);
  }

  const zones: string[] = [];
  const zoneIdx = new Map<string, number>();
  const admins: string[] = [];
  const adminIdx = new Map<string, number>();
  const intern = (tbl: string[], idx: Map<string, number>, v: string) => {
    let i = idx.get(v);
    if (i === undefined) { i = tbl.length; tbl.push(v); idx.set(v, i); }
    return i;
  };

  const rows: { pop: number; line: string }[] = [];
  const badZones = new Set<string>();
  let fixed = 0;
  for (const line of cities.split('\n')) {
    if (!line) continue;
    const c = line.split('\t');
    const name = c[1]!, ascii = c[2]!, alts = c[3]!, cc = c[8]!, a1 = c[10]!;
    const lat = Number(c[4]), lon = Number(c[5]), pop = Number(c[14]) || 0;
    const geoZone = canonicalZone(c[17]!);
    const zone = fixZone(cc, lat, geoZone);
    if (zone !== geoZone) fixed++;
    if (!isValidZone(zone)) { badZones.add(zone); continue; }

    const own = foldName(name);
    const keys = new Set<string>();
    const altSource = pop >= ALT_MIN_POPULATION || cc === 'VN' ? alts.split(',') : [];
    for (const n of [ascii, ...altSource]) {
      const k = foldName(n);
      if (k && k !== own && k.length <= MAX_ALT_LEN && LATIN.test(k)) keys.add(k);
    }
    const an = adminName.get(`${cc}.${a1}`);
    const ai = an ? intern(admins, adminIdx, an) : -1;
    // Toạ độ 2 chữ số thập phân ≈ 1 km: đủ để phân biệt hai nơi trùng tên, và
    // calc-core KHÔNG dùng toạ độ (chỉ múi giờ) — xem đầu `BirthForm.tsx`.
    rows.push({
      pop,
      line: [name, [...keys].join('|'), cc, ai < 0 ? '' : String(ai),
             lat.toFixed(2), lon.toFixed(2), String(intern(zones, zoneIdx, zone))].join('\t'),
    });
  }
  // Đông dân trước — THỨ TỰ DÒNG chính là thứ hạng, nên không cần lưu dân số.
  // Sắp ổn định (Array.prototype.sort ổn định từ ES2019): chạy lại cho cùng tệp.
  rows.sort((a, b) => b.pop - a.pop);

  const meta = {
    source: 'GeoNames cities1000 (https://www.geonames.org/), CC-BY 4.0',
    generated: new Date().toISOString().slice(0, 10),
    count: rows.length,
    zones, admins, countries,
  };
  // Tên tệp mang NGÀY SINH: tệp được cache `immutable` một năm (next.config),
  // nên dữ liệu mới phải là tệp MỚI chứ không ghi đè.
  mkdirSync(OUT_DIR, { recursive: true });
  for (const f of readdirSync(OUT_DIR)) if (/^places-.*\.tsv$/.test(f)) rmSync(join(OUT_DIR, f));
  const file = `places-${meta.generated}.tsv`;
  const out = join(OUT_DIR, file);
  writeFileSync(out, `#places\t${JSON.stringify(meta)}\n${rows.map(r => r.line).join('\n')}\n`);
  writeFileSync(MANIFEST,
    `// Sinh bởi \`npm run gen:places\` — đừng sửa tay.\n` +
    `export const PLACES_URL = '/data/${file}';\nexport const PLACES_COUNT = ${rows.length};\n`);
  // Tệp CHỈ ĐƯỜNG cố định cho ô nơi sinh của website humandesign.vn (docs/CHART-INTEGRATION.md, "Tệp địa danh"):
  // tên tệp dữ liệu đổi theo ngày và tệp cũ bị xoá ở trên ⇒ website đọc `/places.json` (không cache lâu) để biết tệp mới.
  writeFileSync('public/places.json',
    JSON.stringify({ format: 'places-tsv-1', url: `/data/${file}`, count: rows.length, generated: meta.generated }) + '\n');
  process.stdout.write(`${out}: ${rows.length} địa danh · ${zones.length} múi giờ · ${admins.length} vùng · sửa múi giờ ${fixed}\n`);
  if (badZones.size) console.warn(`Bỏ qua vì múi giờ không hợp lệ: ${[...badZones].join(', ')}`);
}

main();
