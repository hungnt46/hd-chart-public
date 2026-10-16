/**
 * Đọc toạ độ từ thuộc tính `d` của SVG path. THUẦN, không DOM.
 * Chỉ cần đủ chính xác cho các bất biến hình học (đỉnh + điểm điều khiển).
 */
const NUM = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;

export type Pt = readonly [number, number];

/** Mọi điểm neo (và điểm điều khiển của đường cong) theo toạ độ tuyệt đối. */
export function pathPoints(d: string): Pt[] {
  const out: Pt[] = [];
  let cx = 0, cy = 0, sx = 0, sy = 0;
  const push = (x: number, y: number) => { cx = x; cy = y; out.push([x, y]); };
  for (const m of d.matchAll(/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g)) {
    const cmd = m[1]!;
    const c = cmd.toUpperCase(), rel = cmd === cmd.toLowerCase();
    const n = (m[2]!.match(NUM) ?? []).map(Number);
    let i = 0;
    if (c === 'M' || c === 'L' || c === 'T') {
      while (i + 2 <= n.length) {
        let x = n[i]!, y = n[i + 1]!;
        if (rel) { x += cx; y += cy; }
        if (c === 'M' && i === 0) { sx = x; sy = y; }
        push(x, y); i += 2;
      }
    } else if (c === 'H') { while (i < n.length) { push(rel ? cx + n[i]! : n[i]!, cy); i++; } }
    else if (c === 'V') { while (i < n.length) { push(cx, rel ? cy + n[i]! : n[i]!); i++; } }
    else if (c === 'C' || c === 'S' || c === 'Q') {
      const k = c === 'C' ? 6 : 4;
      while (i + k <= n.length) {
        for (let j = 0; j < k / 2; j++) {
          let x = n[i + 2 * j]!, y = n[i + 2 * j + 1]!;
          if (rel) { x += cx; y += cy; }
          out.push([x, y]);
        }
        const l = out[out.length - 1]!; cx = l[0]; cy = l[1]; i += k;
      }
    } else if (c === 'A') {
      while (i + 7 <= n.length) {
        let x = n[i + 5]!, y = n[i + 6]!;
        if (rel) { x += cx; y += cy; }
        push(x, y); i += 7;
      }
    } else if (c === 'Z') { cx = sx; cy = sy; }
  }
  return out;
}

/** Chỉ các ĐỈNH (bỏ điểm trùng và điểm khép vòng) — dùng cho đa giác. */
export function polygonVertices(d: string): Pt[] {
  const p = pathPoints(d);
  const u: Pt[] = [];
  for (const q of p) {
    const last = u[u.length - 1];
    if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) > 1e-6) u.push(q);
  }
  if (u.length > 1) {
    const a = u[0]!, b = u[u.length - 1]!;
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6) u.pop();
  }
  return u;
}

export function bbox(pts: readonly Pt[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
}

/** Khoảng cách CÓ DẤU tới đa giác: âm = trong, dương = ngoài. */
export function signedDistance(poly: readonly Pt[], [px, py]: Pt): number {
  let inside = false, d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!, [xj, yj] = poly[j]!;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    const dx = xj - xi, dy = yj - yi, L = dx * dx + dy * dy;
    if (L === 0) continue;
    const t = Math.max(0, Math.min(1, ((px - xi) * dx + (py - yi) * dy) / L));
    d = Math.min(d, Math.hypot(px - (xi + t * dx), py - (yi + t * dy)));
  }
  return inside ? -d : d;
}

/**
 * Hướng đỉnh của một hình tam giác.
 *
 * ★ Dùng TRỌNG TÂM DIỆN TÍCH so với tâm hộp bao, không dùng ba đỉnh.
 * Cách cũ (gom đỉnh rồi lấy cạnh phẳng nhất) chỉ chạy được với đa giác 3 đỉnh
 * sắc cạnh; bản vẽ `alternate` bo góc và dùng đường cong nên gom ra ≠3 cụm và
 * trả về null. Trọng tâm tam giác luôn nằm ở 1/3 tính từ cạnh đáy, nên nó lệch
 * khỏi tâm hộp bao về PHÍA ĐÁY — dấu của độ lệch cho ra hướng đỉnh, bất kể
 * hình có bo góc hay không.
 */
export function apexDirection(poly: readonly Pt[]): 'up' | 'down' | 'left' | 'right' | null {
  if (poly.length < 3) return null;
  let a2 = 0, cx = 0, cy = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!, [xj, yj] = poly[j]!;
    const f = xj * yi - xi * yj;
    a2 += f; cx += (xj + xi) * f; cy += (yj + yi) * f;
  }
  if (Math.abs(a2) < 1e-9) return null;
  cx /= 3 * a2; cy /= 3 * a2;
  const b = bbox(poly);
  const mx = (b.x0 + b.x1) / 2, my = (b.y0 + b.y1) / 2;
  const w = b.x1 - b.x0, h = b.y1 - b.y0;
  // chuẩn hoá theo kích thước để so được hai trục với nhau
  const dx = (cx - mx) / w, dy = (cy - my) / h;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 0.02) return null;   // gần như cân đối ⇒ không phải tam giác
  // trọng tâm lệch về đáy ⇒ đỉnh ở phía ĐỐI DIỆN
  return Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'up' : 'down') : (dx > 0 ? 'left' : 'right');
}

/**
 * Đa giác xấp xỉ một path bằng cách CHIA NHỎ đường cong Bézier.
 *
 * ⚠️ Khác `polygonVertices`, vốn lấy thẳng ĐIỂM ĐIỀU KHIỂN. Điểm điều khiển của
 * một góc bo nằm NGOÀI hình thật, nên đa giác đó phình to hơn hình — dùng nó để
 * đo khoảng cách tới viền sẽ tính DƯ chỗ trống. Đã mắc bẫy này ngày 2026-09-22:
 * đo bằng điểm điều khiển thì báo "0/64 huy hiệu cắt viền" trong khi thực tế có
 * 29/64. Chỗ nào cần ĐO thì dùng hàm này; chỗ nào chỉ cần bao hình thì
 * `polygonVertices` vẫn đủ và rẻ hơn.
 */
export function flattenPath(d: string, steps = 16): Pt[] {
  const out: Pt[] = [];
  let cx = 0, cy = 0, sx = 0, sy = 0;
  const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt) => {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, u = 1 - t;
      out.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ]);
    }
  };
  for (const m of d.matchAll(/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g)) {
    const c = m[1]!.toUpperCase(), rel = m[1] !== c;
    const n = (m[2]!.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    let i = 0;
    const abs = (x: number, y: number): Pt => (rel ? [x + cx, y + cy] : [x, y]);
    if (c === 'M' || c === 'L' || c === 'T') {
      while (i + 2 <= n.length) {
        const p = abs(n[i]!, n[i + 1]!);
        if (c === 'M' && i === 0) { sx = p[0]; sy = p[1]; }
        out.push(p); [cx, cy] = p; i += 2;
      }
    } else if (c === 'H') {
      while (i < n.length) { const x = rel ? cx + n[i]! : n[i]!; out.push([x, cy]); cx = x; i++; }
    } else if (c === 'V') {
      while (i < n.length) { const y = rel ? cy + n[i]! : n[i]!; out.push([cx, y]); cy = y; i++; }
    } else if (c === 'C') {
      while (i + 6 <= n.length) {
        const p1 = abs(n[i]!, n[i + 1]!), p2 = abs(n[i + 2]!, n[i + 3]!), p3 = abs(n[i + 4]!, n[i + 5]!);
        bez([cx, cy], p1, p2, p3); [cx, cy] = p3; i += 6;
      }
    } else if (c === 'S' || c === 'Q') {
      while (i + 4 <= n.length) {
        const p1 = abs(n[i]!, n[i + 1]!), p2 = abs(n[i + 2]!, n[i + 3]!);
        bez([cx, cy], p1, p1, p2); [cx, cy] = p2; i += 4;
      }
    } else if (c === 'A') {
      while (i + 7 <= n.length) { const p = abs(n[i + 5]!, n[i + 6]!); out.push(p); [cx, cy] = p; i += 7; }
    } else if (c === 'Z') { out.push([sx, sy]); cx = sx; cy = sy; }
  }
  return out;
}
