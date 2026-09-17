/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/wongwian-shelves/',
  test: {
    environment: 'jsdom',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      // no custom runtimeCaching — Workbox's default precache only covers the
      // built JS/CSS/HTML/icons. It must NEVER intercept the Ably WebSocket
      // handshake (printBridge.ts) or the live CLOUD_DB_URL CSV fetch
      // (database.ts) — both have to hit the network fresh every time.
      manifest: {
        name: 'วงเวียน ลงทะเบียนชั้นวาง',
        short_name: 'วงเวียนชั้นวาง',
        description: 'ลงทะเบียนตำแหน่งสินค้าบนชั้นวาง แล้วพิมพ์ป้ายราคาที่ต้องเปลี่ยนไปยังเครื่องพิมพ์ที่ร้าน',
        lang: 'th',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/wongwian-shelves/',
        scope: '/wongwian-shelves/',
        theme_color: '#6d5ef8',
        background_color: '#f6f6fc',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
