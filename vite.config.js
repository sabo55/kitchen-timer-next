import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/kitchen-timer-next/", // ★重要（repo名）
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "pwa-192.png",
        "pwa-512.png",
        "apple-touch-icon.png",
      ],
      manifest: {
        name: "Kitchen Timer Next",
        short_name: "Timer2",
        start_url: "/kitchen-timer-next/",
        scope: "/kitchen-timer-next/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          { src: "/kitchen-timer-next/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/kitchen-timer-next/pwa-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wav,mp3,json}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
