import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages project page phục vụ tại /<tên-repo>/ nên asset phải trỏ theo base này.
// Nếu dùng custom domain hoặc user page (tên.github.io) thì đổi base + scope/start_url thành '/'.
const BASE = '/dai-chien-khoi-nguyen/';

export default defineConfig({
  base: BASE,
  build: {
    target: 'es2020',
  },
  plugins: [
    VitePWA({
      registerType: 'prompt', // tự kiểm soát: có bản mới → hiện nút Cập nhật
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Đại chiến Khôi Nguyên',
        short_name: 'Khôi Nguyên',
        description: 'Game thủ thành 2 bên: Quán Phở Anh Khôi vs Tạp hoá Thảo Nguyên',
        lang: 'vi',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'landscape', // ưu tiên nằm ngang (app đã cài — Android khoá được)
        scope: BASE,
        start_url: BASE,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // Phaser bundle ~1.5MB
      },
    }),
  ],
});
