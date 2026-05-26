import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8099",
    },
  },
});
