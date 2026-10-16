// @ts-check
/**
 * ESLint 9 — flat config.
 *
 * Phân vùng theo ĐẶC THÙ của repo, không dùng một bộ luật chung cho tất cả:
 *   calc-core/   thuần, nghiêm nhất (đây là chỗ sai một dấu là sai cả biểu đồ)
 *   components/  React + JSX
 *   e2e/         Playwright, chạy trong Node (e2e-public/: bản công khai trên `out/`)
 *   *.generated.ts, artworks/*.json  — sinh tự động, bỏ qua
 *
 * `tsc --noEmit` ở chế độ strict đã gánh phần kiểu. ESLint ở đây lo phần mà
 * trình biên dịch KHÔNG thấy: promise bị bỏ rơi, biến thừa, so sánh lỏng,
 * hook React dùng sai, và các bẫy runtime.
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';

export default tseslint.config(
  {
    ignores: [
      '.next/**', 'node_modules/**', 'test-results/**', 'playwright-report/**',
      // xuất tĩnh của bản công khai (`npm run build:public`)
      'out/**',
      // ★ cây tách của phiên phụ (`git worktree` dưới `.claude/worktrees/`) là
      //   MỘT BẢN SAO KHÁC của repo — lint nó từ đây là lint trùng mã của nhánh
      //   khác. Đã mắc 2026-09-23: `npm run lint` báo 73 lỗi, không cái nào ở cây này.
      '.claude/**',
      'public/**', 'ephe/**',
      // sinh tự động — sửa nguồn rồi chạy lại generator, đừng sửa ở đây
      '**/*.generated.ts',
      'lib/place/timezone-list.ts',
      'components/bodygraph/artworks/*.json',
      // script sinh code chạy bằng node thuần
      'components/bodygraph/generate/**',
      'calc-core/hd-data/generate/**',
      'i18n/hd-content/generate/**',
      // xuất mã nguồn công khai (AGPL, STATUS §5 #65) — node thuần
      'deploy/public-source/**',
      // script .js trong fixtures, chạy bằng node thuần, không nằm trong tsconfig
      'calc-core/__fixtures__/**/*.js',
      // spikes/ là code thăm dò Phase 0, không thuộc ứng dụng và không nằm trong tsconfig
      'spikes/**',
      // file cấu hình chạy ngoài chương trình TS
      '*.config.mjs', '*.config.js', 'next-env.d.ts',
    ],
  },

  // Đăng ký plugin Next ở CẤP CAO NHẤT — `next build` dò ở đây, không nhìn vào
  // block bị giới hạn bằng `files`. Luật vẫn chỉ áp cho app/ và components/ bên dưới.
  { plugins: { '@next/next': nextPlugin } },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Repo dùng `!` có chủ đích sau khi đã kiểm bằng bất biến/test.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Bắt promise bị bỏ rơi — lỗi thật, khó thấy bằng mắt.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // Biến thừa: cho phép tiền tố _ để cố ý bỏ qua.
      '@typescript-eslint/no-unused-vars': [
        'error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // ── Hai luật dưới đây được NỚI có chủ đích, kèm lý do ──────────────
      // `restrict-template-expressions` mặc định cấm số trong template. Ở repo
      // này `${gate}`, `${x.toFixed(1)}` có ở khắp nơi và hoàn toàn an toàn —
      // đây là chuyện văn phong, không phải lớp lỗi. Vẫn CẤM object/any/never.
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true, allowBoolean: false, allowAny: false,
        allowNullish: false, allowRegExp: false,
      }],
      // `no-confusing-void-expression` bắt `onClick={() => setX(v)}` — mẫu chuẩn
      // của React. `ignoreArrowShorthand` chừa đúng mẫu đó, phần còn lại giữ nguyên.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
    },
  },

  // ── calc-core: THUẦN. Không React, không Next, không DOM, không fetch. ────
  {
    files: ['calc-core/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error',
        { name: 'window', message: 'calc-core phải thuần — không DOM.' },
        { name: 'document', message: 'calc-core phải thuần — không DOM.' },
        { name: 'fetch', message: 'calc-core phải thuần — không gọi mạng.' },
        { name: 'localStorage', message: 'calc-core phải thuần — không lưu trữ trình duyệt.' },
      ],
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['react', 'react-dom', 'react/*', 'next', 'next/*'],
            message: 'calc-core phải thuần — xem CLAUDE.md và test:purity.' },
          { group: ['../../components/*', '../../app/*', '../../lib/*'],
            message: 'calc-core không được phụ thuộc lớp trên.' },
        ],
      }],
    },
  },

  // ── React ────────────────────────────────────────────────────────────────
  {
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // ── Test + script dev: nới vài luật không hợp ngữ cảnh ───────────────────
  {
    files: ['**/__tests__/**/*.{ts,tsx}', 'e2e/**/*.ts', 'e2e-public/**/*.ts', 'tools/**/*.{ts,tsx}', 'i18n/hd-names/generate/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
);
