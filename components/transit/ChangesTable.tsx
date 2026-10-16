'use client';
/**
 * Bảng "Changes" — STATUS §4 B2. Cổng/hào hiện tại → kế tiếp của từng thiên
 * thể, lúc nào đổi, và nghịch hành. Engine: `calc-core/rave/changes.ts`.
 *
 * Học từ tab Changes của một ứng dụng tham chiếu: cột Planet · Current · Next · Shifting
 * Time (+ đếm ngược) · Retrograde, công tắc Gate/Lines. Khác một chỗ có chủ ý:
 * đếm ngược tính từ MỐC TRANSIT đang xem, không phải từ "bây giờ" — xem transit
 * một ngày trong quá khứ thì "sau 3 giờ" vẫn có nghĩa.
 *
 * Giờ hiển thị theo công tắc giờ: GIỜ MÁY (như ô thời gian của `TransitPanel`)
 * hoặc UT — xem `TimeModeProvider`.
 */
import { useEffect, useState, type JSX } from 'react';
import type { BodyChange, ChangeLevel } from '../../calc-core/rave/changes.js';
import { BODY_NAMES } from '../../calc-core/ephemeris/bodies.js';
import { PlanetGlyph } from '../glyphs/PlanetGlyph.js';
import { changesAt } from '../../lib/ephemeris/changes-cache.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { planetName } from '../../i18n/terms.js';
import { momentLabel } from '../time-mode/format.js';
import { useTimeMode } from '../time-mode/TimeModeProvider.js';
import { afterLabel } from './after.js';
import { SegmentedControl } from '../ui/SegmentedControl.js';
import { Notice } from '../ui/Notice.js';

export interface ChangesTableProps {
  /** Mốc tham chiếu (UT, Julian day) — thời điểm transit đang xem. */
  jdRef: number;
  /** Múi giờ IANA của máy, để hiện giờ đổi theo giờ máy. */
  zone: string;
}

export function ChangesTable({ jdRef, zone }: ChangesTableProps): JSX.Element {
  const { lang, t } = useLanguage();
  const { mode } = useTimeMode();
  const [level, setLevel] = useState<ChangeLevel>('line');
  const [rows, setRows] = useState<BodyChange[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const mounted = { on: true };
    void (async () => {
      try {
        const out = await changesAt(jdRef, level);   // dùng chung với thẻ Tiếp theo
        if (mounted.on) { setRows(out); setErr(null); }
      } catch (e) {
        if (mounted.on) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { mounted.on = false; };
  }, [jdRef, level]);

  const after = (jd: number) => afterLabel(t, jdRef, jd);
  /**
   * `R` = đang đi lùi. `D` chỉ ghi ở ô KẾ TIẾP của một lần đổi chiều sang thuận
   * hành (ví dụ: Pluto "41.2 R → 41.2 D") — ở chỗ khác "không R" đã là thuận.
   */
  const cellText = (c: BodyChange['current'], turnsDirect = false) =>
    (level === 'gate' ? `${c.gate}` : `${c.gate}.${c.line}`) + (c.retrograde ? ' R' : turnsDirect ? ' D' : '');
  const nextText = (r: BodyChange) => cellText(r.next, r.event === 'station' && !r.next.retrograde);

  return (
    <div data-testid="changes">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="section-title">{t('changes.heading')}</h3>
        <SegmentedControl label={t('changes.level')} value={level} onChange={setLevel}
          options={(['gate', 'line'] as const).map(l => ({
            value: l, testId: `changes-level-${l}`, label: t(l === 'gate' ? 'changes.level.gate' : 'changes.level.line'),
          }))} />
      </div>

      {err && <Notice tone="danger" className="mt-2" testId="changes-error">{err}</Notice>}

      {rows && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm" data-testid="changes-table" data-level={level}>
            <thead>
              <tr className="text-left text-xs text-ink-3">
                <th className="py-1 pr-2 font-medium">{t('changes.col.planet')}</th>
                <th className="py-1 pr-2 font-medium">{t('changes.col.current')}</th>
                <th className="py-1 pr-2 font-medium">{t('changes.col.next')}</th>
                <th className="py-1 pr-2 font-medium">{t('changes.col.when')}</th>
                <th className="py-1 font-medium">{t('changes.col.retro')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.body} className="border-t border-line align-top"
                    data-body={BODY_NAMES[r.body]} data-current={cellText(r.current)}
                    data-next={nextText(r)} data-event={r.event}>
                  <td className="py-1 pr-2 whitespace-nowrap">
                    <PlanetGlyph body={r.body} className="mr-1" />{planetName(r.body, lang)}
                  </td>
                  <td className="py-1 pr-2 font-mono text-xs">{cellText(r.current)}</td>
                  <td className="py-1 pr-2 font-mono text-xs">{nextText(r)}</td>
                  <td className="py-1 pr-2">
                    <span className="font-mono text-xs">{momentLabel(r.jdChange, mode, zone, lang)}</span>
                    <span className="block text-xs text-ink-3">{after(r.jdChange)}</span>
                  </td>
                  <td className="py-1 text-xs text-ink-2" data-station={r.station?.kind ?? 'none'}>
                    {r.station
                      ? `${t(r.station.kind === 'retrograde' ? 'changes.retro.starts' : 'changes.retro.ends')} ${after(r.station.jdUT)}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-xs text-ink-3">{t('changes.note')}</p>
        </div>
      )}
    </div>
  );
}
