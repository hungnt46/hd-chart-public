'use client';
/**
 * Thẻ "Tiếp theo" ở bảng phải của tab Transit — đúng mockup hướng A Hưng duyệt
 * 2026-09-25: lần ĐỔI HÀO gần nhất và lần ĐỔI CỔNG gần nhất (thiên thể nào cũng
 * được), đếm ngược từ mốc transit đang xem, kèm lối xuống Theo dõi kích hoạt và
 * bảng Thay đổi sắp tới ở dưới.
 *
 * ★ Dùng CHUNG máy dò VÀ kết quả với bảng Thay đổi (`lib/ephemeris/changes-cache.ts`
 *   → `nextChanges`) — CLAUDE.md: đừng viết máy dò thứ hai, hai chỗ trên cùng
 *   trang sẽ lệch nhau. Chỉ lấy sự kiện `cell` (sang ô khác), bỏ `station`.
 */
import { useEffect, useState, type JSX } from 'react';
import type { BodyChange } from '../../calc-core/rave/changes.js';
import { BODY_NAMES } from '../../calc-core/ephemeris/bodies.js';
import { changesAt } from '../../lib/ephemeris/changes-cache.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { planetName } from '../../i18n/terms.js';
import { PlanetGlyph } from '../glyphs/PlanetGlyph.js';
import { afterLabel } from './after.js';
import { PUBLIC_EDITION } from '../../lib/edition.js';

const soonest = (rows: BodyChange[]): BodyChange | null =>
  rows.filter(r => r.event === 'cell').reduce<BodyChange | null>((a, r) => (!a || r.jdChange < a.jdChange ? r : a), null);

export function NextUp({ jdRef, className = '' }: { jdRef: number; className?: string }): JSX.Element | null {
  const { lang, t } = useLanguage();
  const [next, setNext] = useState<{ line: BodyChange | null; gate: BodyChange | null } | null>(null);

  useEffect(() => {
    const mounted = { on: true };
    void (async () => {
      try {
        const line = soonest(await changesAt(jdRef, 'line'));
        /* Dòng "đổi cổng" lấy thiên thể KHÁC dòng "đổi hào" — lần đổi hào gần nhất thường
           cũng là lần Mặt Trăng sang cổng, ghi hai lần một sự kiện thì thừa (proposal:
           Mặt Trăng đổi hào · Sao Thuỷ đổi cổng). */
        const gate = soonest((await changesAt(jdRef, 'gate')).filter(r => r.body !== line?.body));
        if (mounted.on) setNext({ line, gate });
      } catch {
        if (mounted.on) setNext(null);   // bảng Thay đổi bên dưới đã báo lỗi chi tiết
      }
    })();
    return () => { mounted.on = false; };
  }, [jdRef]);

  if (!next || (!next.line && !next.gate)) return null;
  const row = (c: BodyChange, key: 'next.line' | 'next.gate', kind: string) => (
    <li className="flex items-baseline justify-between gap-3 border-t border-line py-2 first:border-t-0" data-next={kind} data-body={BODY_NAMES[c.body]}>
      <span><PlanetGlyph body={c.body} className="mr-1.5" />{t(key, { body: planetName(c.body, lang) })}</span>
      <span className="shrink-0 font-semibold tabular-nums">{afterLabel(t, jdRef, c.jdChange)}</span>
    </li>
  );
  return (
    <section className={`card px-5 py-4 ${className}`} data-testid="next-up" aria-labelledby="next-h">
      <h2 id="next-h" className="card-heading mb-1.5">{t('next.heading')}</h2>
      <ul className="text-sm">
        {next.line && row(next.line, 'next.line', 'line')}
        {next.gate && row(next.gate, 'next.gate', 'gate')}
      </ul>
      {/* Bản công khai không có hai khối đích (STATUS §5 #74) ⇒ không liên kết. */}
      {!PUBLIC_EDITION && (
        <a href="#watch" className="link-action" data-testid="next-more">
          {t('next.more')} ↓
        </a>
      )}
    </section>
  );
}
