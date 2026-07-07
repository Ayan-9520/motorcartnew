import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    commonjsOptions: {
      include: [/node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
            if (id.includes("axios") || id.includes("socket.io")) return "vendor-api";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("xlsx")) return "vendor-xlsx";
            if (id.includes("@tanstack")) return "vendor-table";
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_PROXY_TARGET || "http://127.0.0.1:3001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: process.env.VITE_DEV_PROXY_TARGET || "http://127.0.0.1:3001",
        changeOrigin: true,
        ws: true,
      },
      "/uploads": {
        target: process.env.VITE_DEV_PROXY_TARGET || "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
});
