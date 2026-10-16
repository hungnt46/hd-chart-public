'use client';
/**
 * Hai dòng thế vượng / thế hãm của một hào, mỗi dòng mở đầu bằng KÝ HIỆU hành
 * tinh fix hào đó: "♂ ▲ …thế vượng…" / "♅ ▼ …thế hãm…" — như sách IHDS *The
 * Complete Rave I'Ching* in ký hiệu trước mỗi chú giải.
 *
 * ★ Ký hiệu lấy từ DỮ KIỆN (`calc-core/hd-data/fixings.json` + `PlanetGlyph`),
 *   KHÔNG nhúng vào `lines.json`: văn bản ở đó phải giữ nguyên chuỗi của nguồn.
 *   Vì là dữ kiện nên vẫn hiện khi TẮT cờ nội dung — lúc đó chỗ chú giải hiện tên
 *   hành tinh thay cho câu văn.
 *
 * Mũi tên ▲/▼ đặc, cùng ký hiệu với dấu fixing ở cột hành tinh (sách in ▽ rỗng).
 *
 * ★ Hưng chốt 2026-09-28: câu thế vượng và thế hãm CÙNG MÀU ĐEN (trước: lục /
 *   hồng — hai màu mới đứng cạnh đỏ/đen HD, đọc thành một nghĩa riêng). Phần
 *   (các) câu CUỐI in NGHIÊNG đúng như sách IHDS *The Complete Rave I'Ching* —
 *   dữ liệu `exaltedItalic` / `detrimentItalic` của `i18n/hd-content`.
 */
import type { JSX } from 'react';
import { BODY_NAMES } from '../../calc-core/ephemeris/bodies.js';
import { PlanetGlyph } from '../glyphs/PlanetGlyph.js';
import { fixingPlanets } from '../../calc-core/hd-data/fixings.js';
import type { Lang } from '../../i18n/ui/index.js';
import { useLanguage } from '../../i18n/ui/LanguageProvider.js';
import { planetName } from '../../i18n/terms.js';

const KINDS = [
  { kind: 'exalted', arrow: '▲', label: 'details.exalted' },
  { kind: 'detriment', arrow: '▼', label: 'details.detriment' },
] as const;

/** Tách phần thường / phần nghiêng; không có dữ liệu nghiêng thì cả câu là chữ thường. */
function BookText({ text, italic }: { text: string; italic: string | null | undefined }): JSX.Element {
  if (!italic || !text.endsWith(italic)) return <>{text}</>;
  return <>{text.slice(0, text.length - italic.length)}<em data-book-italic>{italic}</em></>;
}

export interface FixingNotesProps {
  gate: number;
  line: number;
  lang: Lang;
  /** Chú giải từ `i18n/hd-content` — `null` khi cờ nội dung tắt. */
  text: {
    exalted?: string | null; detriment?: string | null;
    exaltedItalic?: string | null; detrimentItalic?: string | null;
  } | null;
}

/** Hào có gì để hiện không — dùng để quyết định có vẽ khối hào hay không. */
export function hasFixingNotes(gate: number, line: number,
                               text: FixingNotesProps['text']): boolean {
  const p = fixingPlanets(gate, line);
  return p.exalted !== null || p.detriment !== null || !!text?.exalted || !!text?.detriment;
}

export function FixingNotes({ gate, line, lang, text }: FixingNotesProps): JSX.Element {
  const { t } = useLanguage();
  const planets = fixingPlanets(gate, line);
  return (
    <>
      {KINDS.map(({ kind, arrow, label }) => {
        const body = planets[kind];
        const words = text?.[kind];
        if (body === null && !words) return null;
        const who = body === null ? null : planetName(body, lang);
        return (
          <p key={kind} className="mt-1 text-xs text-ink" data-fixing={kind}
             data-planet={body === null ? undefined : BODY_NAMES[body]}>
            {body !== null && (
              <PlanetGlyph body={body} className="mr-1 text-sm" />
            )}
            <span aria-hidden="true">{arrow}</span>{' '}
            {words
              ? <><span className="sr-only">{t(label)}{who ? ` — ${who}` : ''}: </span>
                  <BookText text={words} italic={text[`${kind}Italic`]} /></>
              // cờ nội dung tắt: không có câu văn, hiện dữ kiện thành chữ
              : <span className="text-ink-2">{t(label)} — {who}</span>}
          </p>
        );
      })}
    </>
  );
}
