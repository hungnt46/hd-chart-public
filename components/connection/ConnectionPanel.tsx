'use client';
/**
 * Kết nối (Connection chart) — SPEC §10.5 (D11).
 *
 * Người thứ hai chọn TỪ KHO chart đã lưu (D19: composite tham chiếu chart có
 * sẵn, không sao chép tham số sinh). Vì kho chỉ giữ tham số sinh nên mở ra là
 * TÍNH LẠI — cùng một đường với nút "Mở" của kho.
 *
 * ⚠️ Không hiện Type/Authority "của cặp đôi". Đo trên app Jovian: khung
 * Properties của chart kết nối hiện thuộc tính của NGƯỜI THỨ NHẤT. Một cặp đôi
 * không có Type — xem ghi chú trong `calc-core/rave/connection.ts`.
 */
import { useCallback, useEffect, useState, type JSX } from 'react';
import type { RaveChart } from '../../calc-core/rave/chart.js';
import { calculateRaveChart } from '../../calc-core/rave/chart.js';
import {
  COMPOSITION_STATES, calculateConnectionChart,
  type ConnectionChart,
} from '../../calc-core/rave/connection.js';
import { openChartRepository } from '../../lib/storage/indexeddb.js';
import { onLibraryChanged } from '../../lib/storage/events.js';
import { reopen } from '../../lib/storage/reopen.js';
import type { SavedChart } from '../../lib/storage/types.js';
import { getBrowserEphemeris } from '../../lib/ephemeris/browser-client.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import type { UiKey } from '../../i18n/ui/index.js';
import { Notice } from '../ui/Notice.js';
import { Select } from '../ui/Select.js';
import { dateUTToJd } from '../../calc-core/time/julian.js';

export interface ConnectionPanelProps { chart: RaveChart }

const norm = (g: readonly number[]) => [...g].sort((a, b) => a - b).join('–');

export function ConnectionPanel({ chart }: ConnectionPanelProps): JSX.Element {
  const { t } = useLanguage();
  /** `null` = đang đọc kho — chưa được báo "kho trống" (trước đây câu đó nháy lên rồi mới hiện ô chọn). */
  const [saved, setSaved] = useState<SavedChart[] | null>(null);
  const [pick, setPick] = useState('');
  const [conn, setConn] = useState<ConnectionChart | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Cờ trong OBJECT: với `let` thuần, TS thu hẹp về `true` và ESLint coi phép
    // kiểm là thừa — trong khi nó chính là thứ chặn setState sau khi rời màn hình.
    const mounted = { on: true };
    // Mở kho MỘT lần cho cả vòng đời panel — mở lại mỗi lần kho đổi là chồng
    // thêm kết nối IndexedDB không bao giờ đóng.
    const opening = openChartRepository();
    const load = () => void (async () => {
      try {
        const { repo } = await opening;
        const list = await repo.listCharts();
        if (mounted.on) setSaved(list);
      } catch (e) {
        if (mounted.on) { setSaved([]); setErr(e instanceof Error ? e.message : String(e)); }
      }
    })();
    load();
    // Đọc lại mỗi khi kho đổi — nếu không, lưu chart xong ô chọn vẫn rỗng.
    const off = onLibraryChanged(load);
    return () => { mounted.on = false; off(); };
  }, []);

  // Chart gốc đổi (mở chart khác khi đang ở tab này) thì kết quả cũ là của người khác.
  useEffect(() => { setPick(''); setConn(null); setErr(null); }, [chart]);

  const choose = useCallback(async (id: string) => {
    setPick(id); setErr(null); setConn(null);
    if (!id) return;
    try {
      const other = saved?.find(c => c.id === id);
      if (!other) return;
      const eph = await getBrowserEphemeris();
      const b = calculateRaveChart(eph, dateUTToJd(reopen(other.birth).utcDate));
      setConn(calculateConnectionChart(chart, b));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [chart, saved]);

  return (
    <section className="card p-4" data-testid="connection-panel">
      <h2 className="card-heading mb-2">{t('conn.heading')}</h2>

      {saved === null ? (
        <div className="mt-3 h-[4.25rem] animate-pulse rounded-lg bg-sunken" data-testid="connection-loading" aria-hidden="true" />
      ) : saved.length === 0 ? (
        <p className="empty mt-3" data-testid="connection-empty">{t('conn.empty')}</p>
      ) : (
        <>
          {/* Nhãn chỉ khi có ô chọn — trước đây `<label for>` trỏ vào ô không tồn tại lúc kho trống. */}
          <label className="label mt-3" htmlFor="conn-pick">{t('conn.pick')}</label>
          <Select id="conn-pick" className="w-full" value={pick}
                  onChange={e => void choose(e.target.value)} data-testid="connection-pick">
            <option value="">{t('conn.pickNone')}</option>
            {saved.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </>
      )}

      {err && <Notice tone="danger" className="mt-3" testId="connection-error">{err}</Notice>}

      {conn && (
        <div className="mt-4 space-y-3" data-testid="connection-result">
          <p className="text-sm">
            <span className="text-ink-2">{t('conn.theme')}: </span>
            <strong data-testid="connection-theme">{t(`connTheme.${conn.themeIndex}` as UiKey)}</strong>
          </p>

          <ul className="flex flex-wrap gap-2 text-xs">
            {COMPOSITION_STATES.map(s => (
              <li key={s} data-conn-count={s}
                  className="chip">
                {t(`connState.${s}` as UiKey)}: <strong>{conn.counts[s]}</strong>
              </li>
            ))}
          </ul>

          <div>
            <h3 className="hint">
              {t('conn.channels', { n: conn.definedChannels.length })}
            </h3>
            <ul className="mt-1 space-y-1">
              {conn.channels
                .map(c => ({ ...c, pair: [...c.channel.gates].sort((x, y) => x - y) }))
                .sort((x, y) => x.pair[0]! - y.pair[0]! || x.pair[1]! - y.pair[1]!)
                .map(c => (
                  <li key={c.channel.id} className="text-sm tabular-nums"
                      data-conn-channel={norm(c.channel.gates)} data-conn-state={c.state}>
                    {c.pair.join('–')}
                    <span className="ml-2 text-ink-2">{t(`connState.${c.state}` as UiKey)}</span>
                    {c.fullSide && (
                      <span className="ml-2 text-xs text-ink-3">
                        {t('conn.holds', { side: t(`conn.side.${c.fullSide}` as UiKey) })}
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          </div>

          <p className="hint">{t('conn.noteNoType')}</p>
        </div>
      )}
    </section>
  );
}
