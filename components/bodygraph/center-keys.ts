/**
 * Mã trung tâm (enum của calc-core) → khoá dùng trong bản vẽ và trong markup.
 * MỘT nguồn duy nhất, để renderer, bản vẽ và test không lệch nhau.
 */
import { CenterId } from '../../calc-core/rave/derive/tables.js';

export const CENTER_KEY_OF: Readonly<Record<CenterId, string>> = Object.freeze({
  [CenterId.Head]: 'head',
  [CenterId.Ajna]: 'ajna',
  [CenterId.Throat]: 'throat',
  [CenterId.G]: 'g',
  [CenterId.Heart]: 'heart',
  [CenterId.Sacral]: 'sacral',
  [CenterId.SolarPlexus]: 'solarPlexus',
  [CenterId.Spleen]: 'spleen',
  [CenterId.Root]: 'root',
});

export const CENTER_ID_OF: Readonly<Record<string, CenterId>> = Object.freeze(
  Object.fromEntries(Object.entries(CENTER_KEY_OF).map(([id, k]) => [k, Number(id)])),
);

/**
 * Cặp (mã trung tâm, khoá) đã có kiểu đúng.
 *
 * `Object.entries` luôn trả khoá dạng `string`, nên nơi nào muốn lặp qua bảng
 * trên rồi ĐÁNH CHỈ SỐ một `Record<CenterId, …>` đều vướng: gán `number` vào
 * enum số thì được, nhưng dùng `number` làm chỉ số thì TS chặn (TS7053). Gom
 * chỗ chuyển kiểu về đúng một nơi ở đây thay vì rải `as CenterId` khắp nơi.
 */
export const CENTER_KEY_ENTRIES: readonly (readonly [CenterId, string])[] = Object.freeze(
  // Khai kiểu trả về cho callback thay vì `as const`: ESLint
  // (no-unnecessary-type-assertion) coi assertion là thừa, còn TS thì cần nó để
  // ra tuple. Khai kiểu làm hài lòng cả hai.
  Object.entries(CENTER_KEY_OF).map(
    ([id, key]): readonly [CenterId, string] => [Number(id), key],
  ),
);
