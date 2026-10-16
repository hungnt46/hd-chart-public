/**
 * Kiểu dữ liệu của kho chart — SPEC §10.4.
 *
 * ★ QUYẾT ĐỊNH NỀN: kho KHÔNG lưu chart, chỉ lưu THAM SỐ SINH.
 *
 * Không phải để tiết kiệm chỗ, mà vì đúng đắn: chart là **hàm thuần** của `jdUT`.
 * Lưu kết quả đã tính nghĩa là tạo ra một bản sao có thể lệch khỏi engine — sửa
 * một lỗi trong calc-core thì mọi chart đã lưu vẫn mang kết quả sai cho tới khi
 * ai đó nghĩ ra việc tính lại. Lưu đầu vào thì không có chuyện đó.
 *
 * Phần mềm tham chiếu cũng làm y hệt (ghi chép nội bộ):
 * "charts are recomputed from birth data, not stored as objects"; DB của họ chỉ
 * là kho metadata mỏng cộng vài ID thuộc tính để liệt kê khỏi phải tính lại.
 * Ta chưa cần lớp cache ID đó: 300 chart tính lại hết cũng chỉ vài giây, và một
 * cache sai đồng bộ còn tệ hơn không có.
 */
import type { IllustrationJson } from '../illustrator/model.js';

/** Đủ để TÍNH LẠI chart, cộng metadata để hiện lại form. */
export interface BirthRecord {
  /**
   * ★ Trường DUY NHẤT mà calc-core cần. ISO 8601 UTC, luôn có 'Z'.
   * Mọi thứ còn lại chỉ để hiển thị và để mở lại form — xem SPEC §4
   * ("calc-core chỉ nhận UT").
   */
  utIso: string;
  /** Giờ địa phương như người dùng gõ. */
  localDate: string;   // yyyy-mm-dd
  localTime: string;   // HH:mm
  ianaZone: string;
  /** Quy ước IANA: `UT = local − offset`. Lưu lại để không phải tra tzdb khi liệt kê. */
  offsetMinutes: number;
  /**
   * Offset lấy từ đâu: `iana` (tzdb), `lmt` (giờ mặt trời địa phương), `manual`
   * (người dùng tự chọn khi giờ mơ hồ). Không lưu thì lúc mở lại chart nào cũng
   * hiện "manual" — vừa sai vừa làm mất dấu những chart THẬT SỰ do người chọn.
   */
  offsetSource: 'iana' | 'lmt' | 'manual' | 'mmi';
  /** Ghi lại tình trạng lúc giải giờ, để sau này còn biết chart nào đáng ngờ. */
  ambiguity: 'none' | 'repeated' | 'nonexistent';
  confidence: 'high' | 'low';
  /** Địa danh do người dùng gõ — KHÔNG tham gia tính toán. */
  place?: string;
}

export interface SavedChart {
  id: string;
  name: string;
  /** `null` = chưa xếp vào thư mục nào. Thư mục MỘT CẤP, không lồng nhau. */
  folderId: string | null;
  birth: BirthRecord;
  note: string;
  createdAt: number;  // epoch ms
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

/** Trường người dùng sửa được. */
export type ChartPatch = Partial<Pick<SavedChart, 'name' | 'folderId' | 'note'>>;

export interface NewChart {
  name: string;
  birth: BirthRecord;
  folderId?: string | null;
  note?: string;
}

/**
 * Bản vẽ BodyGraph Illustrator (docs/PLAN-illustrator.md Phase 3).
 *
 * ★ KHÔNG phá luật "kho chỉ lưu tham số sinh": bản vẽ là dữ liệu người dùng TỰ
 *   NHẬP (cổng nào bật, phía nào, hành tinh nào), không phải kết quả tính — không
 *   có gì để tính lại, và không có engine nào để lệch khỏi. Vì thế nó là MỘT LOẠI
 *   BẢN GHI RIÊNG (store riêng), không nhét vào `SavedChart`.
 */
export interface SavedIllustration {
  id: string;
  name: string;
  /** Cùng hệ thư mục với chart. */
  folderId: string | null;
  note: string;
  /** Dạng JSON của `lib/illustrator/model.ts` (`toJson`) — đã kiểm khi ghi. */
  state: IllustrationJson;
  /** Chart làm điểm xuất phát ("Nạp từ chart"), nếu có. Chỉ để tham khảo — xoá chart không đụng bản vẽ. */
  sourceChartId?: string;
  createdAt: number;
  updatedAt: number;
}

export type IllustrationPatch = Partial<Pick<SavedIllustration, 'name' | 'folderId' | 'note' | 'state'>>;

export interface NewIllustration {
  name: string;
  state: IllustrationJson;
  folderId?: string | null;
  note?: string;
  sourceChartId?: string;
}

/** Gói xuất/nhập — định dạng RIÊNG của ta, không phải XML của phần mềm tham chiếu. */
export interface ChartBundle {
  /** Luôn `"hd-webapp-charts"`. Chốt chặn khi ai đó thả nhầm file. */
  kind: 'hd-webapp-charts';
  /**
   * Tăng khi phá vỡ tương thích. Bộ đọc từ chối bản cao hơn nó biết.
   * 2 (Illustrator Phase 3): thêm `illustrations`. Gói 1 vẫn đọc được (không có bản vẽ).
   */
  version: 2;
  exportedAt: string;
  folders: Folder[];
  charts: SavedChart[];
  illustrations: SavedIllustration[];
}
