import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
server: {
  proxy: {
    "/api": "http://localhost:3001",
  },
},
plugins: [
react(),

VitePWA({
  registerType: "autoUpdate",

  devOptions: {
    enabled: true,
    type: "module",
  },

  includeAssets: [
    "favicon.svg",
  ],

  manifest: {
    name: "Mi Todo App",
    short_name: "Todo App",
    description:
      "Aplicación de tareas PWA",
    theme_color: "#4f46e5",
    background_color: "#f8fafc",
    display: "standalone",
    start_url: "/",
    scope: "/",

    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  },

  workbox: {
    globPatterns: [
      "**/*.{js,css,html,ico,png,svg}",
    ],
    navigateFallback: "/index.html",
  },
}),

],
});