'use client';
/**
 * Kho chart — SPEC §10.4. Lưu, xếp thư mục (MỘT CẤP), đổi tên, xoá, xuất/nhập.
 *
 * Kho chỉ giữ THAM SỐ SINH; mở một chart nghĩa là TÍNH LẠI (xem lib/storage/types.ts).
 * Vì vậy component này không bao giờ chạm vào `RaveChart`. Ngoại lệ duy nhất là
 * xuất CSV (E5): Type/Profile… tính lại TẠI CHỖ trong `csv-export.ts` để ghi
 * ra tệp, không lưu ngược vào kho.
 *
 * ★ Illustrator Phase 3 (mockup Hưng duyệt 2026-09-29, khung 3): loại bản ghi
 *   thứ hai — BẢN VẼ. Chung danh sách và thư mục với chart, khác biểu tượng
 *   (bút / tam giác), lọc Tất cả · Chart · Bản vẽ. Đang ở Illustrator thì ô lưu
 *   ở đầu lưu BẢN VẼ ("Lưu thay đổi" ghi đè bản đang mở · "Lưu thành bản mới").
 *   CSV vẫn chỉ có chart (bản vẽ không có Type/Profile để ghi).
 */
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { openChartRepository } from '../../lib/storage/indexeddb.js';
import { download as downloadBlob } from '../export/download.js';
import { bundleFileName, parseBundle, stringifyBundle } from '../../lib/storage/codec.js';
import { StorageError, type ChartRepository } from '../../lib/storage/repository.js';
import type { BirthRecord, Folder, SavedChart, SavedIllustration } from '../../lib/storage/types.js';
import { fromJson, toRenderSets, type IllustrationJson } from '../../lib/illustrator/model.js';
import { SegmentedControl } from '../ui/SegmentedControl.js';
import { Icon } from '../ui/Icon.js';
import { notifyLibraryChanged } from '../../lib/storage/events.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { getBrowserEphemeris } from '../../lib/ephemeris/browser-client.js';
import { csvFileName, toCsv } from '../../lib/storage/csv.js';
import { libraryCsvRows } from './csv-export.js';
import { importMmi } from '../../lib/storage/mmi-import.js';
import { PUBLIC_EDITION } from '../../lib/edition.js';
import { loadPlaces } from '../../lib/place/load-places.js';
import { searchPlaces } from '../../lib/place/places.js';
import { Notice } from '../ui/Notice.js';
import { Select } from '../ui/Select.js';

export interface ChartLibraryProps {
  /** Chart đang hiện trên màn hình, để nút "Lưu" có gì mà lưu. */
  current: { birth: BirthRecord; suggestedName: string } | null;
  /** `name`: tên đã lưu — form mang lại làm họ tên (xem `app/page.tsx`). */
  onOpen: (birth: BirthRecord, name?: string) => void;
  /** Báo ra ngoài khi chart đang xem vừa được lưu — thanh trên đổi "chưa lưu" → "đã lưu". */
  onSaved?: (birth: BirthRecord) => void;
  /** Tiêu đề dùng cấp nào — trong ngăn kéo là h3 dưới tiêu đề của ngăn kéo. */
  headingLevel?: 2 | 3;
  /** Đang ở Illustrator: ô lưu ở đầu lưu BẢN VẼ này thay cho chart. */
  illustration?: {
    json: IllustrationJson;
    defaultName: string;
    /** Bản ghi đang ứng với bản vẽ (null = chưa lưu). */
    savedId: string | null;
    onSaved: (id: string, name: string) => void;
    /** Bản ghi `savedId` không còn trong Kho (đã bị xoá). */
    onMissing: () => void;
  };
  onOpenIllustration?: (saved: SavedIllustration) => void;
  /** Bản đang vẽ có thay đổi chưa lưu ⇒ mở bản vẽ khác phải hỏi lại. */
  confirmOpenIllustration?: boolean;
}

type Kind = 'all' | 'chart' | 'illu';
type Item = { kind: 'chart'; c: SavedChart } | { kind: 'illu'; c: SavedIllustration };

/** "9 cổng · 3 kênh · 6 hành tinh" — đếm lại từ bản vẽ, không lưu sẵn. */
function illuCounts(j: IllustrationJson): { gates: number; channels: number; planets: number } {
  try {
    const s = fromJson(j);
    return {
      gates: s.gates.size, channels: toRenderSets(s).definedChannels.length,
      planets: [...s.gates.values()].reduce((n, m) => n + (m.acts?.filter(a => a.body !== null).length ?? 0), 0),
    };
  } catch { return { gates: 0, channels: 0, planets: 0 }; }
}

const shortDate = (ms: number) => { const d = new Date(ms); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };

/* Kiểu chung ở `app/globals.css` (@layer components) — hướng A "Bàn đo". Ô chọn: `ui/Select`. */
const BTN_MAIN = 'btn btn-primary';
const BTN_SUB = 'btn';

const ALL = '__all__';

export function ChartLibrary({
  current, onOpen, onSaved, headingLevel = 2, illustration, onOpenIllustration, confirmOpenIllustration = false,
}: ChartLibraryProps): JSX.Element {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  const { lang, t } = useLanguage();
  const [repo, setRepo] = useState<ChartRepository | null>(null);
  const [persistent, setPersistent] = useState(true);
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [illus, setIllus] = useState<SavedIllustration[]>([]);
  const [kind, setKind] = useState<Kind>('all');
  /** Đã đọc danh sách ít nhất một lần — trước đó chưa thể nói bản ghi nào "đã mất". */
  const [listed, setListed] = useState(false);
  /** Bản vẽ đang chờ xác nhận mở (thay bản đang vẽ chưa lưu). */
  const [askOpen, setAskOpen] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [filter, setFilter] = useState<string>(ALL);
  // Khởi tạo TỪ PROPS chứ không phải chuỗi rỗng rồi để effect điền: bản trước
  // làm vậy nên lần vẽ đầu ô tên trống rồi mới nhảy chữ vào.
  const [name, setName] = useState(illustration?.defaultName ?? current?.suggestedName ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async (r: ChartRepository) => {
    setCharts(await r.listCharts());
    setIllus(await r.listIllustrations());
    setFolders(await r.listFolders());
    setListed(true);
  }, []);

  useEffect(() => {
    // Cờ phải nằm trong OBJECT: với biến `let` thuần, TS thu hẹp về `true` và
    // ESLint báo phép kiểm là thừa — trong khi nó chính là thứ chặn setState
    // sau khi component đã rời màn hình.
    const mounted = { on: true };
    void (async () => {
      try {
        const opened = await openChartRepository();
        if (!mounted.on) return;
        setRepo(opened.repo);
        setPersistent(opened.persistent);
        if (!opened.persistent) {
          setErr(t('library.notPersistent', { reason: opened.reason ?? '?' }));
        }
        await refresh(opened.repo);
      } catch (e) {
        // Không bắt thì đọc kho lỗi thành unhandled rejection, danh sách treo im lặng.
        if (mounted.on) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { mounted.on = false; };
    // `t` cố tình KHÔNG nằm trong deps: mở kho là việc chạy đúng MỘT lần lúc gắn
    // component. Thêm `t` vào thì mỗi lần đổi ngôn ngữ lại mở lại kho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const suggested = illustration?.defaultName ?? current?.suggestedName ?? '';
  useEffect(() => { setName(suggested); }, [suggested]);
  /** Bản vẽ đang ứng với bản ghi đã bị xoá ⇒ báo ra ngoài để về "chưa lưu". */
  const savedMissing = !!illustration?.savedId && listed && !illus.some(i => i.id === illustration.savedId);
  const onMissing = illustration?.onMissing;
  useEffect(() => { if (savedMissing) onMissing?.(); }, [savedMissing, onMissing]);

  /** Mọi thao tác đi qua đây để lỗi luôn được hiện ra chứ không nuốt im. */
  const run = useCallback(async (fn: (r: ChartRepository) => Promise<string | undefined>) => {
    if (!repo) return;
    setErr(null); setMsg(null);
    try {
      const note = await fn(repo);
      await refresh(repo);
      // Báo cho những khung khác cũng đọc kho (ví dụ ConnectionPanel).
      notifyLibraryChanged();
      if (typeof note === 'string') setMsg(note);
    } catch (e) {
      setErr(e instanceof StorageError ? e.message : e instanceof Error ? e.message : String(e));
    }
  }, [repo, refresh]);

  const save = () => run(async r => {
    if (!current) return undefined;
    const folderId = filter === ALL ? null : filter;
    await r.createChart({ name: name.trim() || current.suggestedName, birth: current.birth, folderId });
    onSaved?.(current.birth);
    return t('library.saved');
  });

  /** `asNew`: luôn tạo bản ghi mới; còn lại ghi đè bản đang ứng với bản vẽ (nếu có). */
  const saveIllu = (asNew: boolean) => run(async r => {
    if (!illustration) return undefined;
    const n = name.trim() || illustration.defaultName;
    const folderId = filter === ALL || filter === '' ? null : filter;
    const hit = !asNew && illustration.savedId ? await r.getIllustration(illustration.savedId) : null;
    const rec = hit
      ? await r.updateIllustration(hit.id, { name: n, state: illustration.json })
      : await r.createIllustration({ name: n, state: illustration.json, folderId });
    // Đọc lại danh sách TRƯỚC khi báo ra ngoài: báo trước thì có một lượt vẽ
    // `savedId` mới mà danh sách cũ chưa có nó ⇒ bị coi là "đã mất" và quên đi.
    await refresh(r);
    illustration.onSaved(rec.id, rec.name);
    return t('library.illuSaved');
  });

  const download = () => run(async r => {
    const text = stringifyBundle(await r.exportBundle());
    // Helper chung: gắn thẻ vào DOM và thu hồi URL sau — thu hồi ngay sau `click()`
    // là Safari/Firefox cũ có thể huỷ tải.
    downloadBlob(new Blob([text], { type: 'application/json' }), bundleFileName(new Date()));
    return t('library.exported', { n: charts.length + illus.length });
  });

  const downloadCsv = () => run(async r => {
    const all = await r.listCharts();
    const text = toCsv(libraryCsvRows(await getBrowserEphemeris(), all, await r.listFolders(), lang, t));
    // Helper chung: gắn thẻ vào DOM và thu hồi URL sau — thu hồi ngay sau `click()`
    // là Safari/Firefox cũ có thể huỷ tải.
    downloadBlob(new Blob([text], { type: 'text/csv;charset=utf-8' }), csvFileName(new Date()));
    return t('library.exportedCsv', { n: all.length });
  });
  /*
   * Tệp `.mmi` của phần mềm desktop tham chiếu (STATUS §4 E6) — nhận theo đuôi HOẶC nội dung
   * XML. Múi giờ tra từ nơi sinh bằng chính ô tra địa danh offline (GeoNames);
   * không tải được dữ liệu địa danh thì vẫn nhập, dùng múi giờ dự phòng theo
   * offset. Giờ tính lại theo tzdb (Hưng chốt, STATUS §5 #21) — xem `lib/storage/mmi-import.ts`.
   */
  const importMmiFile = (text: string) => run(async r => {
    const idx = await loadPlaces().catch(() => null);
    const resolveZone = (city: string, country: string) =>
      idx ? searchPlaces(idx, `${city}, ${country}`, 1)[0]?.ianaZone ?? null : null;
    const folder = `.mmi ${new Date().toISOString().slice(0, 10)}`;
    const rep = await importMmi(r, text, resolveZone, folder);
    return t('library.importedMmi', { n: rep.added, folder: rep.folderName }) +
      (rep.duplicates ? t('library.importedMmiDup', { n: rep.duplicates }) : '') +
      (rep.skipped.length ? t('library.importedMmiSkipped', { n: rep.skipped.length }) : '') +
      (rep.changed.length ? t('library.importedMmiChanged', { n: rep.changed.length, names: rep.changed.map(c => c.name).join(', ') }) : '') +
      (rep.unresolved.length ? t('library.importedMmiUnresolved', { n: rep.unresolved.length, names: rep.unresolved.join(', ') }) : '');
  });
  const importFile = async (file: File) => {
    const text = await file.text();
    if (/\.(mmi|xml)$/i.test(file.name) || text.trimStart().startsWith('<')) return importMmiFile(text);
    return importBundleText(text);
  };
  const importBundleText = (text: string) => run(async r => {
    const report = await r.importBundle(parseBundle(text));
    return t('library.imported', { charts: report.chartsAdded, folders: report.foldersAdded }) +
      (report.illustrationsAdded ? t('library.importedIllus', { n: report.illustrationsAdded }) : '') +
      (report.chartsDuplicated + report.illustrationsDuplicated
        ? t('library.importedDup', { n: report.chartsDuplicated + report.illustrationsDuplicated }) : '');
  });

  const inFolder = (f: string | null) => filter === ALL || f === (filter || null);
  const all: Item[] = [
    ...charts.map(c => ({ kind: 'chart' as const, c })),
    ...illus.map(c => ({ kind: 'illu' as const, c })),
  ].sort((a, b) => b.c.updatedAt - a.c.updatedAt || a.c.name.localeCompare(b.c.name));
  const shown = all.filter(x => inFolder(x.c.folderId) && (kind === 'all' || x.kind === kind));
  const count = (f: (x: Item) => boolean) => all.filter(f).length;
  const total = all.length;
  const savedHere = illustration?.savedId && !savedMissing ? illustration.savedId : null;

  /** Đổi tên · thư mục · xoá — chung cho hai loại, gọi đúng phương thức của loại đó. */
  const rowActions = (x: Item) => {
    const id = x.c.id;
    const isChart = x.kind === 'chart';
    return (
      <>
        <button type="button" className={BTN_SUB} data-testid={`library-rename-${id}`}
                onClick={() => {
                  const n = window.prompt(t('library.renamePrompt'), x.c.name);
                  if (n?.trim()) {
                    void run(async r => {
                      if (isChart) await r.updateChart(id, { name: n.trim() }); else await r.updateIllustration(id, { name: n.trim() });
                      return undefined;
                    });
                  }
                }}>{t('library.rename')}</button>
        <Select className="w-44" value={x.c.folderId ?? ''} aria-label={t('library.folderOf', { name: x.c.name })}
                data-testid={`library-move-${id}`}
                onChange={e => void run(async r => {
                  const folderId = e.target.value || null;
                  if (isChart) await r.updateChart(id, { folderId }); else await r.updateIllustration(id, { folderId });
                  return undefined;
                })}>
          <option value="">{t('library.unfiledShort')}</option>
          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </Select>
        <button type="button" className="btn btn-danger" data-testid={`library-delete-${id}`}
                onClick={() => {
                  if (window.confirm(t('library.deleteConfirm', { name: x.c.name }))) {
                    void run(async r => {
                      if (isChart) await r.deleteChart(id); else await r.deleteIllustration(id);
                      return t('library.deleted');
                    });
                  }
                }}>{t('library.delete')}</button>
      </>
    );
  };

  const fileInput = (
    <input ref={fileRef} type="file" accept="application/json,.json,.mmi,.xml" className="hidden"
           data-testid="library-file"
           onChange={e => {
             const f = e.target.files?.[0];
             e.target.value = '';           // chọn lại cùng file vẫn phải kích hoạt
             if (f) void importFile(f);
           }} />
  );

  /*
   * ★ Kho RỖNG ở màn chào (giao diện D, Hưng duyệt 2026-10-04): chưa có chart đang
   *   xem, chưa có gì trong kho ⇒ ô tên, Lưu, Xuất, thư mục đều vô nghĩa. Chỉ còn hộp
   *   viền đứt hướng dẫn + MỘT nút "Nhập tệp (.json, .mmi)". Có thư mục (dù trống)
   *   thì vẫn hiện bản đầy đủ để còn quản lý được.
   */
  if (!current && !illustration && total === 0 && folders.length === 0) {
    return (
      <section data-testid="chart-library" data-compact="">
        <div className="flex items-baseline justify-between gap-3">
          <H id="library-h" tabIndex={-1} className="scroll-mt-20 text-xl font-bold">{t('library.heading')}</H>
          <span className="text-ui text-ink-3 tabular-nums">{t('library.count', { n: 0 })}</span>
        </div>
        {!persistent && (
          <Notice tone="warn" role="alert" className="mt-2" testId="library-ephemeral">{t('library.ephemeral')}</Notice>
        )}
        <div className="empty mt-4 flex flex-col items-center gap-2.5 rounded-[.875rem] px-4 py-7 text-center" data-testid="library-empty">
          <span className="text-ink-3"><Icon name="library" size={28} /></span>
          <p className="text-[length:var(--text-card)] font-semibold text-ink">{t('library.emptyTitle')}</p>
          <p className="max-w-[17.5rem] text-ui text-ink-2">{t('library.emptyText')}</p>
        </div>
        {/* Bản công khai: không nhập/xuất tệp (STATUS §5 #57 — admin dùng bản đầy đủ). */}
        {!PUBLIC_EDITION && (
          <>
            <button type="button" className={`${BTN_SUB} mt-4 w-full`} disabled={!repo}
                    onClick={() => fileRef.current?.click()} data-testid="library-import">
              <Icon name="upload" size={16} />{t('library.importFile')}
            </button>
            {fileInput}
          </>
        )}
        {msg && <Notice tone="ok" className="mt-3" testId="library-msg">{msg}</Notice>}
        {err && <Notice tone="danger" className="mt-3" testId="library-error">{err}</Notice>}
      </section>
    );
  }

  return (
    <section data-testid="chart-library">
      <H id="library-h" tabIndex={-1} className="section-title scroll-mt-20">{t('library.heading')}</H>
      {!persistent && (
        <Notice tone="warn" role="alert" className="mt-2" testId="library-ephemeral">{t('library.ephemeral')}</Notice>
      )}

      <div className="mt-3 space-y-2">
        <label className="label" htmlFor="lib-name">{t(illustration ? 'library.illuNameLabel' : 'library.nameLabel')}</label>
        <input id="lib-name" className="field" value={name} placeholder={t('library.namePlaceholder')}
               onChange={e => setName(e.target.value)} data-testid="library-name" />
        <div className="flex flex-wrap gap-2">
          {illustration ? (
            <>
              <button type="button" className={BTN_MAIN} disabled={!repo}
                      onClick={() => void saveIllu(false)} data-testid="library-save-illu">
                <Icon name="save" size={16} />{t(savedHere ? 'library.illuUpdate' : 'library.illuSave')}
              </button>
              {savedHere && (
                <button type="button" className={BTN_SUB} disabled={!repo}
                        onClick={() => void saveIllu(true)} data-testid="library-save-illu-new">
                  {t('library.illuSaveNew')}
                </button>
              )}
            </>
          ) : (
            <button type="button" className={BTN_MAIN} disabled={!current || !repo}
                    onClick={() => void save()} data-testid="library-save">
              {t('library.save')}
            </button>
          )}
          {!PUBLIC_EDITION && (
            <>
              <button type="button" className={BTN_SUB} disabled={!repo || total === 0}
                      onClick={() => void download()} data-testid="library-export">
                {t('library.export')}
              </button>
              <button type="button" className={BTN_SUB} disabled={!repo || charts.length === 0}
                      onClick={() => void downloadCsv()} data-testid="library-export-csv">
                {t('library.exportCsv')}
              </button>
              <button type="button" className={BTN_SUB} disabled={!repo}
                      onClick={() => fileRef.current?.click()} data-testid="library-import">
                {t('library.import')}
              </button>
              {fileInput}
            </>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <label className="label" htmlFor="lib-folder">{t('library.folderLabel')}</label>
        <Select id="lib-folder" className="w-full" value={filter}
                onChange={e => setFilter(e.target.value)} data-testid="library-folder-filter">
          <option value={ALL}>{t('library.allFolders', { n: total })}</option>
          <option value="">
            {t('library.unfiled', { n: count(x => x.c.folderId === null) })}
          </option>
          {folders.map(f => (
            <option key={f.id} value={f.id}>
              {t('library.folderOption', {
                name: f.name, n: count(x => x.c.folderId === f.id),
              })}
            </option>
          ))}
        </Select>
        {illus.length > 0 && (
          <SegmentedControl label={t('library.kind')} value={kind} onChange={setKind} className="flex [&>button]:flex-1"
            testId="library-kind"
            options={[
              { value: 'all', label: t('library.kind.all'), testId: 'library-kind-all' },
              { value: 'chart', label: t('library.kind.chart'), testId: 'library-kind-chart' },
              { value: 'illu', label: t('library.kind.illu'), testId: 'library-kind-illu' },
            ]} />
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BTN_SUB} disabled={!repo} data-testid="library-new-folder"
                  onClick={() => {
                    const n = window.prompt(t('library.newFolderPrompt'));
                    if (n?.trim()) {
                      void run(async r => { await r.createFolder(n.trim()); return t('library.folderCreated'); });
                    }
                  }}>
            {t('library.newFolder')}
          </button>
          {filter !== ALL && filter !== '' && (
            <button type="button" className={BTN_SUB} data-testid="library-delete-folder"
                    onClick={() => {
                      if (!window.confirm(t('library.deleteFolderConfirm'))) return;
                      const id = filter;
                      setFilter(ALL);
                      void run(async r => { await r.deleteFolder(id); return t('library.folderDeleted'); });
                    }}>
              {t('library.deleteFolder')}
            </button>
          )}
        </div>
      </div>

      {msg && <Notice tone="ok" className="mt-3" testId="library-msg">{msg}</Notice>}
      {err && <Notice tone="danger" className="mt-3" testId="library-error">{err}</Notice>}

      <ul className="mt-4 space-y-2" data-testid="library-list">
        {shown.length === 0 && (
          <li className="empty" data-testid="library-empty">
            {t('library.empty')}
          </li>
        )}
        {shown.map(x => x.kind === 'chart' ? (
          <li key={x.c.id} className="flex gap-2.5 rounded-xl border border-line bg-surface p-3" data-chart-item={x.c.id}>
            {illus.length > 0 && <KindIcon kind="chart" label={t('library.kind.chart')} />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{x.c.name}</p>
              <p className="mt-0.5 text-xs tabular-nums text-ink-2">
                {x.c.birth.localDate} {x.c.birth.localTime} · {x.c.birth.ianaZone}
                {x.c.birth.confidence === 'low' && ` · ${t('library.lowConfidence')}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={BTN_MAIN} data-testid={`library-open-${x.c.id}`}
                        onClick={() => { onOpen(x.c.birth, x.c.name); }}>{t('library.open')}</button>
                {rowActions(x)}
              </div>
            </div>
          </li>
        ) : (
          <li key={x.c.id} className="flex gap-2.5 rounded-xl border border-line bg-surface p-3" data-illu-item={x.c.id}>
            <KindIcon kind="illu" label={t('library.kind.illu')} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{x.c.name}</p>
              <p className="mt-0.5 text-xs tabular-nums text-ink-2">
                {t('library.illuMeta', { ...illuCounts(x.c.state), date: shortDate(x.c.updatedAt) })}
              </p>
              {askOpen === x.c.id ? (
                <div className="mt-2 flex flex-wrap items-center gap-2" data-testid={`library-open-illu-ask-${x.c.id}`}>
                  <span className="text-ui">{t('illu.loadConfirm')}</span>
                  <button type="button" className={BTN_MAIN} data-testid={`library-open-illu-confirm-${x.c.id}`}
                          onClick={() => { setAskOpen(null); onOpenIllustration?.(x.c); }}>{t('illu.replace')}</button>
                  <button type="button" className={BTN_SUB} onClick={() => setAskOpen(null)}>{t('illu.cancel')}</button>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className={BTN_MAIN} data-testid={`library-open-illu-${x.c.id}`}
                          disabled={x.c.id === savedHere && !confirmOpenIllustration}
                          onClick={() => (confirmOpenIllustration && x.c.id !== savedHere ? setAskOpen(x.c.id) : onOpenIllustration?.(x.c))}>
                    {t('library.openIllu')}
                  </button>
                  {rowActions(x)}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {total > 0 && (
        <button type="button" className="btn btn-danger mt-4"
                data-testid="library-clear"
                onClick={() => {
                  if (window.confirm(t('library.clearConfirm'))) {
                    void run(async r => { await r.clearAll(); return t('library.cleared'); });
                  }
                }}>
          {t('library.clear')}
        </button>
      )}

      <p className="hint mt-3">
        {t('library.privacy')}
      </p>
    </section>
  );
}

/** Biểu tượng loại bản ghi: tam giác = chart sinh, bút = bản vẽ. */
function KindIcon({ kind, label }: { kind: 'chart' | 'illu'; label: string }): JSX.Element {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sunken text-ink-2" title={label}
          data-kind={kind}>
      <Icon name={kind === 'illu' ? 'pen' : 'triangle'} size={16} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
