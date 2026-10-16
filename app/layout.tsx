import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LanguageProvider, DEFAULT_LANG } from '../i18n/ui/LanguageProvider';
import { TimeModeProvider } from '../components/time-mode/TimeModeProvider';
import { ChartThemeProvider } from '../components/bodygraph/CompositePaletteProvider';
import { RegisterServiceWorker } from '../components/pwa/RegisterServiceWorker';
import { EmbedBridge } from '../components/embed/EmbedBridge';
import { PUBLIC_EDITION } from '../lib/edition';

/*
 * Metadata được nướng vào bản dựng TĨNH nên không đổi theo ngôn ngữ lúc chạy.
 * Vì vậy viết song ngữ trong một dòng — thà hơi dài còn hơn để nửa số người
 * dùng đọc không hiểu. Đây là lý do file này nằm trong danh sách miễn trừ của
 * `i18n/ui/__tests__/no-hardcoded-text.spec.ts`.
 */
export const metadata: Metadata = {
  title: 'HD Web App',
  description: 'Human Design chart from birth date, time and place · '
    + 'Biểu đồ Human Design — tính từ ngày/giờ/nơi sinh',
  /*
   * Manifest TĨNH ở `public/`, không phải `app/manifest.ts` (STATUS §4 G1).
   * Đã thử `app/manifest.ts`: Next sinh mã bọc ĐƯỜNG DẪN dự án trong nháy đơn,
   * mà thư mục dự án có "Hung's" ⇒ vỡ cú pháp, build đỏ. Biểu tượng:
   * `npm run gen:icons`.
   */
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon-192.png' },
};

/*
 * `viewport-fit=cover` (giao diện D, điện thoại): trang vẽ tràn dưới tai thỏ và thanh
 * home của iPhone; thanh trên và thanh đáy tự đệm `env(safe-area-inset-*)`.
 */
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * `lang` dựng bằng DEFAULT_LANG rồi được LanguageProvider sửa lại trong
     * useEffect. Trang là bản dựng TĨNH nên máy chủ không biết người xem là ai —
     * đọc `navigator.language` lúc vẽ lần đầu sẽ gây hydration mismatch.
     */
    <html lang={DEFAULT_LANG} suppressHydrationWarning>
      {/*
        ★ Chế độ nhúng (P7c, CHỈ bản công khai): đặt `data-embed` TRƯỚC khi vẽ để CSS đỡ nháy bố cục.
        Next thay `PUBLIC_EDITION` bằng hằng lúc dựng ⇒ bản đầy đủ không có thẻ này.
        `EmbedBridge` làm lại việc đó và lo phần còn lại.
      */}
      {PUBLIC_EDITION && (
        <head>
          <script dangerouslySetInnerHTML={{ __html: "try{if(/[?&]embed=(1|true)(&|$)/.test(location.search))document.documentElement.dataset.embed='1'}catch(e){}" }} />
        </head>
      )}
      <body className="min-h-screen bg-page text-ink antialiased">
        <LanguageProvider><TimeModeProvider><ChartThemeProvider>
          {children}
        </ChartThemeProvider></TimeModeProvider></LanguageProvider>
        <RegisterServiceWorker />
        <EmbedBridge />
      </body>
    </html>
  );
}
